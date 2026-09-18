/*
  Que un fallo de arranque NO se quede pegado al proceso.

  Esta es la prueba que faltaba, y su ausencia costo una sesion entera de
  diagnostico. El codigo original (`puesta ??= (async () => {...})()`) parece
  correcto leyendolo, compila, pasa el lint y funciona perfectamente mientras
  todo vaya bien. Solo se rompe cuando la base tropieza UNA vez, y entonces se
  rompe para siempre — que es exactamente el caso que nadie prueba.
*/

import assert from "node:assert/strict";

import { unaSolaVez } from "../../adaptadores/postgres/una-sola-vez";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void>) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

async function principal() {
  console.log("\nArranque que no se queda con el fallo puesto");

  await comprueba("con todo bien, corre UNA vez aunque se pida diez", async () => {
    let veces = 0;
    const arrancar = unaSolaVez(async () => {
      veces += 1;
      return veces;
    });
    for (let i = 0; i < 10; i++) await arrancar();
    assert.equal(veces, 1);
  });

  await comprueba("diez peticiones A LA VEZ esperan a la misma, no a diez", async () => {
    /*
      Esto es para lo que existia el guardado original y hay que conservarlo:
      sin ello, diez peticiones simultaneas lanzan diez migraciones a la vez
      contra la misma base, peleandose por el mismo candado.
    */
    let veces = 0;
    const arrancar = unaSolaVez(async () => {
      veces += 1;
      await new Promise((r) => setTimeout(r, 20));
      return veces;
    });
    await Promise.all(Array.from({ length: 10 }, () => arrancar()));
    assert.equal(veces, 1);
  });

  await comprueba("si falla, el SIGUIENTE lo vuelve a intentar", async () => {
    /*
      EL FALLO DE VERDAD. Con el codigo viejo, `veces` se quedaba en 1 y todas
      las llamadas posteriores recibian el error de la primera — para siempre,
      con la base ya sana.
    */
    let veces = 0;
    const arrancar = unaSolaVez(async () => {
      veces += 1;
      if (veces === 1) throw new Error("la base tropezo");
      return "listo";
    });

    await assert.rejects(arrancar(), /la base tropezo/);
    assert.equal(await arrancar(), "listo", "el segundo intento tenia que funcionar");
    assert.equal(veces, 2);
  });

  await comprueba("una vez que sale bien, deja de reintentar", async () => {
    let veces = 0;
    const arrancar = unaSolaVez(async () => {
      veces += 1;
      if (veces === 1) throw new Error("tropiezo");
      return veces;
    });
    await arrancar().catch(() => {});
    await arrancar();
    await arrancar();
    await arrancar();
    assert.equal(veces, 2, "despues del exito no se puede volver a correr");
  });

  await comprueba("un fallo no puede tumbar el proceso por rechazo sin dueno", async () => {
    /*
      El olvido se engancha con un `.catch()` propio. Si ese catch no existiera
      —o si se enganchara mal— Node veria una promesa rechazada sin nadie que
      la mire y en produccion eso tumba el proceso entero.
    */
    const sueltos: unknown[] = [];
    const antes = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", (r) => sueltos.push(r));

    const arrancar = unaSolaVez(async () => {
      throw new Error("tropiezo");
    });
    await assert.rejects(arrancar(), /tropiezo/);
    /* Dos vueltas del bucle de eventos: es cuando Node los anuncia. */
    await new Promise((r) => setTimeout(r, 30));

    process.removeAllListeners("unhandledRejection");
    for (const l of antes) process.on("unhandledRejection", l as never);
    assert.deepEqual(sueltos, [], "quedo una promesa rechazada sin dueno");
  });

  console.log(`\n${hechas} comprobaciones del arranque, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones del arranque fallaron:\n", error);
  process.exit(1);
});
