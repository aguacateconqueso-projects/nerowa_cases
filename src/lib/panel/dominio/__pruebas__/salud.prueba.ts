/*
  Las sondas de salud, contra Postgres de verdad.

  Lo que garantizan: que el SQL es valido y que las consultas **no tocan las
  tablas del panel**. Esto ultimo es la razon de ser del archivo — si `medirSalud`
  consultara `pedidos`, se bloquearia con el mismo candado que esta intentando
  diagnosticar, y la pantalla volveria a quedarse muda justo cuando hace falta.

  Corre sobre PGlite por TCP con el mismo cliente que produccion, igual que
  `postgres.prueba.ts`, y por la misma razon: una prueba con otro cliente
  comprueba algo que no es lo que se despliega.
*/

import assert from "node:assert/strict";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";

import type { Conexion } from "../../adaptadores/postgres/conexion";
import { SQL_001_INICIAL } from "../../adaptadores/postgres/migraciones";
import { migrar } from "../../adaptadores/postgres/migrar";
import { medirSalud, soltarAtascadas } from "../../adaptadores/postgres/salud";
import { traducirError } from "../../diagnostico-conexion";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const PUERTO = 5436;
const db = new PGlite();
const servidor = new PGLiteSocketServer({ db, port: PUERTO, host: "127.0.0.1" });

const sql = postgres(`postgresql://postgres:x@127.0.0.1:${PUERTO}/postgres`, {
  max: 1,
  prepare: false,
});

const cx: Conexion = {
  async consultar<T>(texto: string, params: readonly unknown[] = []) {
    return sql.unsafe(texto, params as never[]) as unknown as Promise<T[]>;
  },
  async ejecutar(texto: string) {
    await sql.unsafe(texto).simple();
  },
};

async function principal() {
  await db.waitReady;
  await servidor.start();
  console.log("\nSondas de salud de la base");

  await comprueba("el pulso responde ANTES de que exista ninguna tabla", async () => {
    /*
      Este es el caso que importa: base recien levantada, migracion sin correr.
      Si `medirSalud` necesitara las tablas del panel, aqui reventaria — y ese
      es exactamente el momento en el que hay que poder diagnosticar.
    */
    const s = await medirSalud(cx);
    assert.ok(s.pulsoMs >= 0, "no midio el pulso");
    assert.equal(s.tablasCreadas, false, "dijo que las tablas ya estaban");
  });

  await comprueba("no hay sesiones atascadas en una base limpia", async () => {
    const s = await medirSalud(cx);
    assert.deepEqual(s.atascadas, [], "invento sesiones atascadas");
  });

  await comprueba("tras migrar, dice que las tablas estan creadas", async () => {
    await migrar(cx, [{ nombre: "001-inicial", sql: SQL_001_INICIAL }]);
    const s = await medirSalud(cx);
    assert.equal(s.tablasCreadas, true, "no vio las tablas recien creadas");
  });

  await comprueba("soltar no falla cuando no hay nada que soltar", async () => {
    assert.equal(await soltarAtascadas(cx), 0);
  });

  await comprueba("la migracion se puede repetir sin romperse", async () => {
    /*
      La migracion ahora lleva `set local lock_timeout` dentro de su
      transaccion. Correrla dos veces comprueba que eso no cambio el
      comportamiento: la segunda vez no aplica nada.
    */
    const nuevas = await migrar(cx, [{ nombre: "001-inicial", sql: SQL_001_INICIAL }]);
    assert.deepEqual(nuevas, [], "volvio a aplicar una migracion ya aplicada");
  });

  console.log("\nQue pista sale segun si se llega o no al servidor");

  await comprueba("si NO se llega, la espera manda a mirar la direccion", () => {
    const pista = traducirError("La base no contesto en 8 segundos", false);
    assert.ok(pista);
    assert.match(pista.queHacer, /IPv6|conexion directa/i);
  });

  await comprueba("si SI se llega, la espera NO manda a mirar la direccion", () => {
    /*
      El fallo que esto evita: con el puerto aceptando en 77 ms, la pantalla
      seguia mandando a revisar la direccion y el pooler. Una pista correcta
      para otro caso, que cuesta una vuelta entera de trabajo inutil.
    */
    const pista = traducirError("La base no contesto en 8 segundos", true);
    assert.ok(pista);
    assert.doesNotMatch(pista.queHacer, /IPv6/i);
    assert.match(pista.titulo, /se llega al servidor/i);
    assert.match(pista.queHacer, /candado/i);
  });

  await comprueba("un candado se nombra como candado, no como red", () => {
    const pista = traducirError("canceling statement due to lock timeout");
    assert.ok(pista);
    assert.match(pista.titulo, /atascada/i);
    assert.doesNotMatch(pista.queHacer, /IPv6|pooler/i);
  });

  console.log(`\n${hechas} comprobaciones de salud, todas en verde.\n`);
}

principal()
  .then(async () => {
    await sql.end();
    await servidor.stop();
    await db.close();
  })
  .catch(async (error) => {
    console.error("\n❌ Las comprobaciones de salud fallaron:\n", error);
    await sql.end().catch(() => {});
    await servidor.stop().catch(() => {});
    process.exit(1);
  });
