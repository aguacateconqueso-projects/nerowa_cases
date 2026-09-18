/*
  La sonda que decide de quien es el problema, contra Postgres de verdad.

  Se prueba contra PGlite por TCP y no contra un doble, por lo mismo que
  `postgres.prueba.ts`: lo que hay que comprobar es el comportamiento del
  cliente real abriendo y CERRANDO sesiones, y un cliente de mentira cierra lo
  que le digan que cierre.
*/

import assert from "node:assert/strict";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";

import { probarSesion, sinCadena } from "../../sonda-sesion";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const PUERTO = 5438;
const db = new PGlite();
const servidor = new PGLiteSocketServer({ db, port: PUERTO, host: "127.0.0.1" });
const CADENA = `postgresql://postgres:x@127.0.0.1:${PUERTO}/postgres`;

/** Cuantas sesiones hay abiertas ahora mismo, sin contar la que pregunta. */
async function sesionesAbiertas(): Promise<number> {
  const sql = postgres(CADENA, { max: 1, prepare: false });
  try {
    const [{ n }] = await sql<{ n: string }[]>`
      select count(*)::text as n from pg_stat_activity
      where pid <> pg_backend_pid() and backend_type = 'client backend'`;
    return Number(n);
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

async function principal() {
  await db.waitReady;
  await servidor.start();
  console.log("\nLa sonda que dice de quien es el problema");

  await comprueba("una sesion desnuda contesta, y mide abrir y viajar aparte", async () => {
    const r = await probarSesion(CADENA, false, 4000);
    assert.equal(r.error, undefined, `no debia fallar: ${r.error}`);
    assert.ok(typeof r.saludoMs === "number");
    assert.ok(typeof r.viajeMs === "number");
    /*
      El segundo `select 1` va sobre una sesion ya abierta, asi que no puede
      costar mas que el primero, que ademas tuvo que autenticarse. Si esto se
      invirtiera, los dos numeros no estarian midiendo lo que dicen medir.
    */
    assert.ok(
      (r.viajeMs ?? 0) <= (r.saludoMs ?? 0),
      `el viaje (${r.viajeMs} ms) no puede costar mas que abrir (${r.saludoMs} ms)`,
    );
  });

  await comprueba("CIERRA lo que abre, gane o pierda", async () => {
    /*
      LA COMPROBACION QUE MAS IMPORTA DE ESTE ARCHIVO.

      Esta sonda existe, entre otras cosas, para averiguar si al pooler le
      quedan conexiones libres. Una sonda que deja las suyas colgando gastaria
      dos por visita justo del recurso que esta contando — el error de la
      vuelta 14, donde la pantalla de diagnostico alimentaba la averia que
      diagnosticaba. Se cuenta contra `pg_stat_activity` de verdad.
    */
    const antes = await sesionesAbiertas();
    await probarSesion(CADENA, false, 4000);
    await probarSesion(CADENA, true, 4000);
    /* Un respiro para que el servidor registre los cierres. */
    await new Promise((r) => setTimeout(r, 300));
    const despues = await sesionesAbiertas();
    assert.equal(despues, antes, `quedaron ${despues - antes} sesiones abiertas`);
  });

  await comprueba("si no hay nadie escuchando, lo dice y no se cuelga", async () => {
    const r = await probarSesion(
      "postgresql://postgres:x@127.0.0.1:5399/postgres",
      false,
      3000,
    );
    assert.ok(r.error, "tenia que fallar");
    assert.equal(r.saludoMs, undefined);
  });

  await comprueba("tambien cierra cuando el intento falla", async () => {
    const antes = await sesionesAbiertas();
    await probarSesion(CADENA, false, 1);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(await sesionesAbiertas(), antes);
  });

  await comprueba("la cadena NO sale nunca en el mensaje de error", () => {
    /*
      El error de `postgres` trae la cadena entera dentro, contrasena incluida,
      y esta pantalla se mira en capturas que se mandan por chat.
    */
    const sucio =
      "no se pudo conectar a postgresql://postgres.abc:SuperSecreta123@aws-1.pooler.supabase.com:6543/postgres";
    const limpio = sinCadena(sucio);
    assert.doesNotMatch(limpio, /SuperSecreta123/);
    assert.doesNotMatch(limpio, /pooler\.supabase\.com/);
    assert.match(limpio, /tapada/);
  });

  console.log(`\n${hechas} comprobaciones de la sonda de sesion, todas en verde.\n`);
}

principal()
  .then(async () => {
    await servidor.stop();
    await db.close();
  })
  .catch(async (error) => {
    console.error("\n❌ Las comprobaciones de la sonda de sesion fallaron:\n", error);
    await servidor.stop().catch(() => {});
    await db.close().catch(() => {});
    process.exit(1);
  });
