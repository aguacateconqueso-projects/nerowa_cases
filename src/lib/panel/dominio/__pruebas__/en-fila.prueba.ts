/*
  Que por la conexion vaya una consulta a la vez, y que una colgada no deje
  la fila atascada. El porque, con los numeros de produccion, en
  `adaptadores/postgres/en-fila.ts`.
*/

import assert from "node:assert/strict";

import { crearFila } from "../../adaptadores/postgres/en-fila";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void>) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  console.log("\nUna consulta a la vez por la conexion");

  await comprueba("seis a la vez salen de una en una y en orden", async () => {
    const fila = crearFila({ esperaMaxMs: 1000, alAtascarse: () => fila.vaciar() });
    let enElAire = 0;
    let maximo = 0;
    const orden: number[] = [];
    const resultados = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((n) =>
        fila.poner(async () => {
          enElAire += 1;
          maximo = Math.max(maximo, enElAire);
          await dormir(5);
          orden.push(n);
          enElAire -= 1;
          return n * 10;
        }),
      ),
    );
    assert.equal(maximo, 1);
    assert.deepEqual(orden, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(resultados, [10, 20, 30, 40, 50, 60]);
  });

  await comprueba("una que falla no traba a las de detras", async () => {
    const fila = crearFila({ esperaMaxMs: 1000, alAtascarse: () => fila.vaciar() });
    const mala = fila.poner(async () => {
      throw new Error("relation no existe");
    });
    const buena = fila.poner(async () => "contesta");
    await assert.rejects(mala, /relation no existe/);
    assert.equal(await buena, "contesta");
  });

  await comprueba("una colgada para siempre: se tira la conexion y las demas salen", async () => {
    let atascos = 0;
    const fila = crearFila({
      esperaMaxMs: 50,
      alAtascarse: () => {
        atascos += 1;
        fila.vaciar();
      },
    });
    void fila.poner(() => new Promise(() => {}));
    const desde = Date.now();
    assert.equal(await fila.poner(async () => "sale"), "sale");
    assert.equal(atascos, 1);
    assert.ok(Date.now() - desde < 500);
  });

  await comprueba("despues de vaciar, siguen saliendo de una en una", async () => {
    const fila = crearFila({ esperaMaxMs: 1000, alAtascarse: () => fila.vaciar() });
    let terminarColgada: () => void = () => {};
    void fila.poner(() => new Promise<void>((r) => (terminarColgada = r)));
    let enElAire = 0;
    let maximo = 0;
    const tanda = [1, 2, 3].map(() =>
      fila.poner(async () => {
        enElAire += 1;
        maximo = Math.max(maximo, enElAire);
        await dormir(10);
        enElAire -= 1;
      }),
    );
    /* Se tira la conexion con la colgada en el aire... */
    fila.vaciar();
    /* ...y la colgada termina tarde, en mitad de la tanda: no puede dejar
       salir a otra encima de la que esta en el aire. */
    await dormir(5);
    terminarColgada();
    await Promise.all(tanda);
    assert.equal(maximo, 1);
  });

  await comprueba("vaciar con la fila parada no hace nada raro", async () => {
    const fila = crearFila({ esperaMaxMs: 1000, alAtascarse: () => fila.vaciar() });
    fila.vaciar();
    assert.equal(await fila.poner(async () => 1), 1);
    fila.vaciar();
    assert.equal(await fila.poner(async () => 2), 2);
  });

  console.log(`\n${hechas} comprobaciones de la fila, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones de la fila fallaron:\n", error);
  process.exit(1);
});
