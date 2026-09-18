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
import { huecos } from "../../adaptadores/postgres/huecos";
import { SQL_001_INICIAL } from "../../adaptadores/postgres/migraciones";
import { migrar } from "../../adaptadores/postgres/migrar";
import { contarFilas, medirSalud, soltarAtascadas } from "../../adaptadores/postgres/salud";
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

  await comprueba("los conteos vienen en UNA consulta, no en seis", async () => {
    const conteos = await contarFilas(cx);
    assert.deepEqual(Object.keys(conteos).sort(), [
      "Colores",
      "Lotes de importacion",
      "Pedidos de la web",
      "Pedidos de tiendas",
      "Personas con acceso",
      "Tiendas",
    ]);
    /* `count(*)` vuelve como cadena de Postgres: si no se convierte, la
       pantalla enseñaria "0" como texto y las sumas fallarian en silencio. */
    for (const v of Object.values(conteos)) {
      assert.equal(typeof v, "number", "un conteo volvio sin convertir a numero");
    }
  });

  await comprueba("medirSalud NO consulta ni una tabla del panel", async () => {
    /*
      LA COMPROBACION QUE MAS IMPORTA DE ESTE ARCHIVO.

      Esta regla ya se rompio una vez: se metio aqui la consulta de conteos por
      ahorrar un viaje, se colgo esperando un candado, y se llevo por delante el
      pulso, la lista de sesiones y el boton de soltarlas. La pantalla que existe
      para explicar por que la base no va se quedo muda otra vez.

      Un espia registra cada consulta y falla si alguna nombra una tabla del
      panel. Asi la regla deja de ser un comentario en la cabecera y pasa a ser
      algo que no se puede romper sin que las pruebas se pongan rojas.
    */
    const vistas: string[] = [];
    const espia: Conexion = {
      async consultar<T>(texto: string, params: readonly unknown[] = []) {
        vistas.push(texto);
        return cx.consultar<T>(texto, params);
      },
      ejecutar: cx.ejecutar,
    };

    await medirSalud(espia);

    assert.ok(vistas.length > 0, "el espia no vio ninguna consulta");
    const DEL_PANEL = [
      "usuarios",
      "colores",
      "lotes",
      "pedidos",
      "tiendas",
      "pedidos_mayoristas",
      "apuntes",
    ];
    for (const sql of vistas) {
      /* `to_regclass('public.migraciones_aplicadas')` nombra una tabla pero no
         la toca: mira el catalogo. Se compara contra el SQL sin esa linea. */
      const cuerpo = sql.replace(/to_regclass\([^)]*\)/g, "");
      for (const tabla of DEL_PANEL) {
        assert.doesNotMatch(
          cuerpo,
          new RegExp(`\\b(from|join|into|update)\\s+${tabla}\\b`, "i"),
          `medirSalud toca la tabla "${tabla}": puede quedarse esperando un candado`,
        );
      }
    }
  });

  console.log("\nHuecos para insertar varias filas de una vez");

  await comprueba("numera los $n sin saltarse ni repetir ninguno", () => {
    assert.equal(huecos(1, 3), "($1, $2, $3)");
    assert.equal(huecos(3, 2), "($1, $2), ($3, $4), ($5, $6)");
  });

  await comprueba("ocho colores por cuatro columnas llegan hasta $32", () => {
    /*
      El caso real: si la numeracion se desfasara, el hex de un color acabaria
      en el nombre del siguiente. Eso no da error — guarda mal y ya.
    */
    const s = huecos(8, 4);
    assert.ok(s.startsWith("($1, $2, $3, $4)"));
    assert.ok(s.endsWith("($29, $30, $31, $32)"));
    assert.equal(s.split("(").length - 1, 8, "no salieron ocho filas");
  });

  await comprueba("pedir cero filas revienta en vez de generar SQL roto", () => {
    assert.throws(() => huecos(0, 4));
    assert.throws(() => huecos(4, 0));
  });

  await comprueba("las filas insertadas de golpe se leen igual que se metieron", async () => {
    /*
      La comprobacion que de verdad importa de este cambio: sembrar en una sola
      consulta tiene que dar EXACTAMENTE las mismas filas que sembrar en once.
    */
    const filas = [
      ["c-uno", "Uno", "#111111", true],
      ["c-dos", "Dos", "#222222", true],
      ["c-tres", "Tres", "#333333", false],
    ];
    await cx.consultar(
      `insert into colores (id, nombre, hex, activo)
       values ${huecos(3, 4)} on conflict (id) do nothing`,
      filas.flat(),
    );
    const leidas = await cx.consultar<{
      id: string;
      nombre: string;
      hex: string;
      activo: boolean;
    }>("select id, nombre, hex, activo from colores where id like 'c-%' order by id");
    assert.deepEqual(
      leidas.map((f) => [f.id, f.nombre, f.hex, f.activo]),
      [
        ["c-dos", "Dos", "#222222", true],
        ["c-tres", "Tres", "#333333", false],
        ["c-uno", "Uno", "#111111", true],
      ],
    );
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

  await comprueba("sin pulso NO se acusa a un candado, aunque se llegue", () => {
    /*
      EL CASO DE PRODUCCION, tal cual llego: puerto del pooler aceptando en
      6 ms, `select 1` sin contestar en 2 s, y la consulta agotando el tiempo.

      Antes esta combinacion decia "casi siempre es un candado, suelta las
      atascadas" — y mandaba a pulsar un boton que ni puede funcionar, porque
      necesita la misma base que no responde. `select 1` no pide candados: si no
      vuelve, un candado no es la causa. Ni puede serlo.
    */
    const pista = traducirError("La base no contesto en 4.983 segundos", {
      seLlega: true,
      pulso: false,
    });
    assert.ok(pista);
    assert.doesNotMatch(pista.queHacer, /suelta las atascadas/i);
    assert.match(pista.titulo, /pooler/i);
    /* Y que mande donde si esta el problema. */
    assert.match(pista.queHacer, /paused|pausa|restarting|conexiones/i);
  });

  await comprueba("con pulso, un candado SI es explicacion legitima", () => {
    const pista = traducirError("La base no contesto en 4 segundos", {
      seLlega: true,
      pulso: true,
    });
    assert.ok(pista);
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
