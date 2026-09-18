/*
  Que el tope de tiempo de verdad corte, y que no deje relojes sueltos.

  Es la garantia de que la pantalla de estado responde siempre. Adrian vio un
  504 de Vercel —la pagina de error de Vercel, no la del panel— porque esa
  garantia no existia.
*/

import assert from "node:assert/strict";

import { conTope, TiempoAgotado } from "../../tope";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void>) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  console.log("\nTope de tiempo");

  await comprueba("lo que llega a tiempo pasa sin tocarse", async () => {
    assert.equal(await conTope(Promise.resolve("valor"), 1000), "valor");
    assert.equal(await conTope(espera(10).then(() => 42), 1000), 42);
  });

  await comprueba("lo que tarda demasiado se corta", async () => {
    const empieza = Date.now();
    await assert.rejects(
      conTope(espera(5000), 100),
      (e: Error) => e instanceof TiempoAgotado && /no contesto en 0\.1 segundos/.test(e.message),
    );
    /* Y se corta CUANDO toca, no cuando termina lo de dentro. */
    assert.ok(Date.now() - empieza < 1000, "tardo mas de lo que decia el tope");
  });

  await comprueba("un fallo de dentro se propaga tal cual", async () => {
    await assert.rejects(
      conTope(Promise.reject(new Error("fallo de la base")), 1000),
      /fallo de la base/,
    );
  });

  await comprueba("no deja relojes sueltos que alarguen la funcion", async () => {
    /*
      Si el temporizador no se cancelara, el proceso seguiria vivo hasta que
      venciera. Se comprueba mirando los relojes pendientes de Node: tras
      resolverse rapido con un tope largo, no puede quedar ninguno.
    */
    const antes = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    await conTope(Promise.resolve("ya"), 60_000);
    const despues = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    assert.equal(despues, antes, "quedo un temporizador vivo tras responder");
  });

  console.log(`\n${hechas} comprobaciones del tope, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones del tope fallaron:\n", error);
  process.exit(1);
});
