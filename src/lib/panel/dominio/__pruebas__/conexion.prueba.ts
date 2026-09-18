/*
  Que las pistas de conexion sean ciertas y no filtren la contrasena.

  Lo segundo importa tanto como lo primero: esta pantalla existe para enseñarse
  cuando algo falla, y lo que se enseña en una pantalla acaba en una captura.
*/

import assert from "node:assert/strict";

import { cadenaALaVista, revisarCadena, traducirError } from "../../diagnostico-conexion";

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
/* El fallo de verdad de Adrian: dejar los corchetes del hueco de Supabase. */
const CON_CORCHETES = `postgresql://postgres.abcdefghijklm:[${CLAVE}]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

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

comprueba("dejar los corchetes de [YOUR-PASSWORD] se detecta, y se nombra", () => {
  const pistas = revisarCadena(CON_CORCHETES);
  assert.equal(pistas.length, 1, "deberia salir UNA pista, la concreta");
  assert.equal(pistas[0]!.nivel, "error");
  assert.match(pistas[0]!.titulo, /entre corchetes/);
  assert.match(pistas[0]!.queHacer, /BORRARLOS/);
  /*
    Y NO la generica de "caracteres que rompen la direccion": es cierta, pero
    decirla en vez de la concreta manda a cambiar la contrasena cuando lo que
    hay que hacer es borrar dos caracteres.
  */
  assert.ok(!pistas.some((p) => /caracteres que rompen/.test(p.titulo)));
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

comprueba("NADA de lo que sale a pantalla contiene la contrasena", () => {
  const conArroba = "postgresql://postgres.abc:mi@clave@aws-0.pooler.supabase.com:6543/postgres";
  const conBarra = "postgresql://postgres.abc:mi/clave@aws-0.pooler.supabase.com:6543/postgres";
  const todo = JSON.stringify([
    ...revisarCadena(CON_CORCHETES),
    cadenaALaVista(CON_CORCHETES),
    ...revisarCadena(POOLER_BIEN),
    ...revisarCadena(POOLER_USUARIO_CORTO),
    ...revisarCadena(DIRECTA),
    ...revisarCadena(conArroba),
    cadenaALaVista(POOLER_BIEN),
    cadenaALaVista(POOLER_USUARIO_CORTO),
    cadenaALaVista(DIRECTA),
    cadenaALaVista(conArroba),
    cadenaALaVista(conBarra),
  ]);
  for (const secreto of [CLAVE, "mi@clave", "mi/clave"]) {
    assert.ok(!todo.includes(secreto), `se filtro la contrasena: ${secreto}`);
  }
});

comprueba("ninguna pista contiene la cadena de conexion entera", () => {
  const texto = JSON.stringify([
    ...revisarCadena(POOLER_BIEN),
    ...revisarCadena(POOLER_USUARIO_CORTO),
  ]);
  assert.ok(!texto.includes("postgresql://"));
  assert.ok(!texto.includes("pooler.supabase.com"));
});

console.log("\nLa cadena a la vista, con la contrasena tapada");

comprueba("enseña usuario, servidor y puerto, y tapa la contrasena", () => {
  const v = cadenaALaVista(POOLER_BIEN)!;
  assert.equal(v.usuario, "postgres.abcdefghijklm");
  assert.equal(v.anfitrion, "aws-0-eu-central-1.pooler.supabase.com");
  assert.equal(v.puerto, 6543);
  assert.equal(v.tieneContrasena, true);
  assert.ok(!v.texto.includes(CLAVE), "la contrasena aparece en el texto");
  assert.match(v.texto, /postgres\.abcdefghijklm:•+@/);
});

comprueba("con la contrasena rota, sigue enseñando el usuario DE VERDAD", () => {
  /*
    Este es el caso que importa. `new URL()` parte mal una cadena con una
    contrasena sin codificar y da un usuario que no es el que hay escrito;
    entonces la pantalla enseñaria algo que no se parece a lo que esta puesto,
    justo cuando hay que mirarlo.
  */
  const conBarra = "postgresql://postgres.abcdefghijklm:mi/clave@aws-0.pooler.supabase.com:6543/postgres";
  const v = cadenaALaVista(conBarra)!;
  assert.equal(v.usuario, "postgres.abcdefghijklm");
  assert.equal(v.puerto, 6543);
  assert.ok(!v.texto.includes("mi/clave"), "la contrasena aparece en el texto");
});

comprueba("una contrasena con @ tampoco se escapa", () => {
  const conArroba = "postgresql://postgres.abc:mi@clave@aws-0.pooler.supabase.com:6543/postgres";
  const v = cadenaALaVista(conArroba)!;
  assert.equal(v.usuario, "postgres.abc");
  assert.ok(!v.texto.includes("mi@clave"));
  assert.ok(!v.texto.includes("mi@"));
});

comprueba("los corchetes se ven en la cadena tapada, sin enseñar la clave", () => {
  const v = cadenaALaVista(CON_CORCHETES)!;
  assert.equal(v.contrasenaEntreCorchetes, true);
  /* Los corchetes se ven; lo de dentro no. */
  assert.match(v.texto, /:\[•+\]@/);
  assert.ok(!v.texto.includes(CLAVE));
  /* Y el usuario sigue siendo el de verdad. */
  assert.equal(v.usuario, "postgres.abcdefghijklm");
});

comprueba("sin corchetes, no se inventa que los hay", () => {
  assert.equal(cadenaALaVista(POOLER_BIEN)!.contrasenaEntreCorchetes, false);
  assert.match(cadenaALaVista(POOLER_BIEN)!.texto, /:•+@/);
});

comprueba("sin contrasena lo dice en vez de fingir que hay una", () => {
  const v = cadenaALaVista("postgresql://postgres.abc:@aws-0.pooler.supabase.com:6543/postgres")!;
  assert.equal(v.tieneContrasena, false);
  assert.match(v.texto, /\(vacia\)/);
});

comprueba("sin cadena puesta no devuelve nada", () => {
  assert.equal(cadenaALaVista(undefined), undefined);
});

console.log("\nTraduccion de lo que dice la base");

comprueba("el rechazo nombra las dos causas comunes, corchetes primero", () => {
  const p = traducirError('password authentication failed for user "postgres"');
  assert.equal(p?.nivel, "error");
  assert.match(p!.titulo, /rechazo el usuario o la contrasena/);
  /* Las dos, y la de los corchetes antes: es la mas comun con diferencia. */
  const donde = (t: string) => p!.queHacer.indexOf(t);
  assert.ok(donde("YOUR-PASSWORD") > -1, "no menciona los corchetes");
  assert.ok(donde("postgres.<referencia-del-proyecto>") > -1, "no menciona el usuario");
  assert.ok(donde("YOUR-PASSWORD") < donde("postgres.<referencia-del-proyecto>"));
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
