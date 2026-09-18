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

  await comprueba("el ARRANQUE no lleva techo, que cortaria las migraciones", async () => {
    /*
      LA TRAMPA DE ESTE ARREGLO, y la razon de que exista esta prueba.

      Lo obvio seria techar todo. Pero la primera peticion tras un despliegue
      dispara las migraciones, que tienen `statement_timeout = '15s'` a
      proposito. Un techo por debajo las cortaria a mitad de transaccion — que
      es EXACTAMENTE como se dejaron los candados muertos de la vuelta 14.

      Aqui el arranque tarda mas que el techo y aun asi tiene que terminar.
    */
    let arranco = false;
    const a = envolverAlmacenPostgres(
      almacenQue(async () => "listo"),
      async () => {
        await new Promise((r) => setTimeout(r, TECHO_CONSULTA_MS + 800));
        arranco = true;
      },
      () => assert.fail("el arranque largo no puede soltar la conexion"),
    );
    assert.equal(await a.listarPedidos(), "listo");
    assert.ok(arranco, "la migracion tenia que poder terminar");
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
