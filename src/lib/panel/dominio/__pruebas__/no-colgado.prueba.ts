/*
  Que una consulta atascada no deje inservible la instancia entera.

  Esto es lo que le paso a Adrian durante dos dias: la base perfecta —dos
  conexiones nuevas abrian en 22 ms y 13 ms— y el panel sin cargar, porque la
  conexion reutilizada de esa instancia estaba ocupada y nada la renovaba.
*/

import assert from "node:assert/strict";

import type { Almacen } from "../../puertos/almacen";
import {
  envolverAlmacenPostgres,
  TECHO_ARRANQUE_MS,
  TECHO_CONSULTA_MS,
} from "../../adaptadores/postgres/no-quedarse-colgado";
import { TiempoAgotado } from "../../tope";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

/** Un almacen de mentira con un solo metodo, que hace lo que se le diga. */
function almacenQue(hace: () => Promise<unknown>): Almacen {
  return { listarPedidos: hace } as unknown as Almacen;
}

const nunca = () => new Promise<unknown>(() => {});

async function principal() {
  console.log("\nQue una consulta atascada no mate la instancia");

  await comprueba("una consulta normal pasa tal cual", async () => {
    const a = envolverAlmacenPostgres(
      almacenQue(async () => ["un pedido"]),
      async () => {},
      () => assert.fail("no habia que soltar nada"),
    );
    assert.deepEqual(await a.listarPedidos(), ["un pedido"]);
  });

  await comprueba("una consulta colgada se rinde y SUELTA la conexion", async () => {
    /*
      EL CASO DE LOS DOS DIAS. Sin el rescate, esa instancia se queda
      contestando con el esqueleto hasta que Vercel la recicle.
    */
    let soltada = 0;
    const a = envolverAlmacenPostgres(almacenQue(nunca), async () => {}, () => {
      soltada += 1;
    });

    const desde = Date.now();
    await assert.rejects(a.listarPedidos(), (e: unknown) => e instanceof TiempoAgotado);
    const tardo = Date.now() - desde;

    assert.equal(soltada, 1, "tenia que soltar la conexion atascada");
    assert.ok(
      tardo >= TECHO_CONSULTA_MS - 500 && tardo < TECHO_CONSULTA_MS + 2000,
      `se rindio a los ${tardo} ms, fuera del techo de ${TECHO_CONSULTA_MS} ms`,
    );
  });

  await comprueba("un error normal de Postgres NO tira la conexion", async () => {
    /*
      Una tabla que no existe o un permiso denegado no estropean la conexion:
      esa esta bien. Tirarla seria pagar una reconexion en cada error tonto.
    */
    let soltada = 0;
    const a = envolverAlmacenPostgres(
      almacenQue(async () => {
        throw new Error('relation "pedidos" does not exist');
      }),
      async () => {},
      () => {
        soltada += 1;
      },
    );
    await assert.rejects(a.listarPedidos(), /does not exist/);
    assert.equal(soltada, 0, "no habia nada que soltar");
  });

  await comprueba("el arranque NO se corta a medias, aunque no se le espere", async () => {
    /*
      LA TRAMPA DE ESTE ARREGLO, y la razon de que exista esta prueba.

      Lo obvio seria techar todo, arranque incluido. **No se puede**: la primera
      peticion tras un despliegue dispara las migraciones, que tienen
      `statement_timeout = '15s'` a proposito, y cortarlas a mitad de
      transaccion es EXACTAMENTE como se dejaron los candados muertos de la
      vuelta 14.

      Lo que se techa es la ESPERA, no el trabajo: la consulta deja de esperar
      al arranque, pero el arranque sigue vivo y termina solo. Las dos cosas a
      la vez, que parecian opuestas.

      Aqui el arranque tarda mas que el techo. La consulta tiene que volver
      igual, y la migracion tiene que terminar despues, entera.
    */
    let arranco = false;
    const migracion = (async () => {
      await new Promise((r) => setTimeout(r, TECHO_ARRANQUE_MS + 1000));
      arranco = true;
    })();

    /*
      Que se suelte la conexion aqui es CORRECTO y deliberado: el arranque
      lleva mas del techo, o sea que tiene la conexion ocupada, y la consulta
      que viene detras necesita una nueva. Lo que no puede pasar —y es lo que
      esta prueba vigila— es que la migracion se corte por eso.
    */
    let soltada = 0;
    const a = envolverAlmacenPostgres(
      almacenQue(async () => "listo"),
      () => migracion,
      () => {
        soltada += 1;
      },
    );

    assert.equal(await a.listarPedidos(), "listo", "la consulta no puede quedarse esperando");
    assert.equal(soltada, 1, "la conexion ocupada por el arranque tenia que soltarse");
    assert.equal(arranco, false, "todavia no habia terminado, y esta bien");

    await migracion;
    assert.ok(arranco, "la migracion tenia que terminar entera, por su cuenta");
  });

  await comprueba("el techo esta por encima del statement_timeout de 5 s", () => {
    /*
      Si bajara de 5 s, este techo se adelantaria al de Postgres y el error que
      saldria seria "no contesto a tiempo" —cierto e inutil— en vez del de
      Postgres, que DICE que paso. Es la leccion de la vuelta 13, escrita como
      numero para que no se pueda perder.
    */
    assert.ok(
      TECHO_CONSULTA_MS > 5000,
      `el techo (${TECHO_CONSULTA_MS} ms) taparia el error de Postgres`,
    );
  });

  console.log(`\n${hechas} comprobaciones del techo, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones del techo fallaron:\n", error);
  process.exit(1);
});
