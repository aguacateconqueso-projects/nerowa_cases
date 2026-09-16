/*
  Que las pistas de conexion sean ciertas y no filtren la contrasena.

  Lo segundo importa tanto como lo primero: esta pantalla existe para enseñarse
  cuando algo falla, y lo que se enseña en una pantalla acaba en una captura.
*/

import assert from "node:assert/strict";

import { revisarCadena, traducirError } from "../../diagnostico-conexion";

let hechas = 0;
function comprueba(que: string, fn: () => void) {
  fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

/* Cadenas de mentira, con la forma de las de Supabase. */
const CLAVE = "MiClaveSuperSecreta123";
const POOLER_BIEN = `postgresql://postgres.abcdefghijklm:${CLAVE}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
const POOLER_USUARIO_CORTO = `postgresql://postgres:${CLAVE}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
const DIRECTA = `postgresql://postgres:${CLAVE}@db.abcdefghijklm.supabase.co:5432/postgres`;

console.log("\nRevision de la cadena antes de conectar");

comprueba("la del pooler bien puesta no da ninguna queja", () => {
  assert.deepEqual(revisarCadena(POOLER_BIEN), []);
});

comprueba('el usuario "postgres" a secas contra el pooler se detecta', () => {
  const pistas = revisarCadena(POOLER_USUARIO_CORTO);
  assert.equal(pistas.length, 1);
  assert.equal(pistas[0]!.nivel, "error");
  assert.match(pistas[0]!.titulo, /no se entra como "postgres" a secas/);
  assert.match(pistas[0]!.queHacer, /postgres\.<referencia-del-proyecto>/);
});

comprueba("la conexion directa avisa, pero solo avisa", () => {
  const pistas = revisarCadena(DIRECTA);
  assert.equal(pistas.length, 1);
  assert.equal(pistas[0]!.nivel, "aviso");
  assert.match(pistas[0]!.titulo, /conexion directa/);
});

comprueba("una contrasena con @ sin codificar se detecta", () => {
  const pistas = revisarCadena(
    "postgresql://postgres.abc:mi@clave@aws-0.pooler.supabase.com:6543/postgres",
  );
  assert.ok(pistas.some((p) => /caracteres que rompen/.test(p.titulo)));
});

comprueba("una cadena rota lo dice en vez de reventar", () => {
  const pistas = revisarCadena("esto no es una direccion");
  assert.equal(pistas.length, 1);
  assert.match(pistas[0]!.titulo, /no tiene forma de direccion valida/);
});

comprueba("sin cadena puesta no se inventa ninguna queja", () => {
  assert.deepEqual(revisarCadena(undefined), []);
  assert.deepEqual(revisarCadena(""), []);
});

console.log("\nLo que NUNCA puede salir de aqui");

comprueba("NINGUNA pista contiene la contrasena", () => {
  const todas = [
    ...revisarCadena(POOLER_BIEN),
    ...revisarCadena(POOLER_USUARIO_CORTO),
    ...revisarCadena(DIRECTA),
    ...revisarCadena("postgresql://postgres.abc:mi@clave@aws-0.pooler.supabase.com:6543/postgres"),
  ];
  const texto = JSON.stringify(todas);
  assert.ok(!texto.includes(CLAVE), "se filtro la contrasena en una pista");
  assert.ok(!texto.includes("mi@clave"), "se filtro la contrasena en una pista");
});

comprueba("ninguna pista contiene la cadena de conexion entera", () => {
  const texto = JSON.stringify([
    ...revisarCadena(POOLER_BIEN),
    ...revisarCadena(POOLER_USUARIO_CORTO),
  ]);
  assert.ok(!texto.includes("postgresql://"));
  assert.ok(!texto.includes("pooler.supabase.com"));
});

console.log("\nTraduccion de lo que dice la base");

comprueba("el fallo de Adrian apunta al usuario, que es lo que suele ser", () => {
  const p = traducirError('password authentication failed for user "postgres"');
  assert.equal(p?.nivel, "error");
  assert.match(p!.titulo, /rechazo el usuario o la contrasena/);
  assert.match(p!.queHacer, /postgres\.<referencia-del-proyecto>/);
});

comprueba("no poder llegar se distingue de que te rechacen", () => {
  const p = traducirError("connect ECONNREFUSED 10.0.0.1:6543");
  assert.match(p!.titulo, /No se pudo llegar/);
  assert.match(p!.queHacer, /dormir|duermen|encendido/i);
});

comprueba("quedarse sin conexiones apunta al pooler", () => {
  const p = traducirError("remaining connection slots: too many clients already");
  assert.match(p!.titulo, /agotaron las conexiones/);
  assert.match(p!.queHacer, /6543/);
});

comprueba("un error desconocido no se inventa una pista", () => {
  assert.equal(traducirError("algo raro paso en el servidor"), undefined);
});

console.log(`\n${hechas} comprobaciones de diagnostico, todas en verde.\n`);
