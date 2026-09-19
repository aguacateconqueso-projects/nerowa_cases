/*
  Que el arranque de la base NO pueda dejar el panel sin cargar.

  EL FALLO, Y COSTO TRES DIAS

  El panel entero llevaba dias sin abrir ni una pantalla. La base estaba
  perfecta: `/panel/estado` la medía por conexion directa y contestaba en
  **29 ms**, con las tablas creadas y ninguna sesion atascada. Y las pantallas
  del panel agotaban los 7 segundos del techo.

  Lo unico que habia entre un camino y el otro era esto: el arranque
  —migraciones y semilla— que corre antes de CADA consulta en cada instancia
  nueva. Mientras el no volviera, el panel entero estaba caido.

  LAS DOS REGLAS QUE SE COMPRUEBAN AQUI, Y SON OPUESTAS EN APARIENCIA

  1. El arranque no puede bloquear al panel. Si tarda de mas, la consulta sigue.
  2. El arranque no puede abandonarse a medias. La promesa se queda viva y
     termina por su cuenta — cortar una migracion a mitad de transaccion es
     como se dejaron los candados muertos de la vuelta 14.

  Se cumplen las dos a la vez porque lo que se techa es la ESPERA, no el
  trabajo.
*/

import assert from "node:assert/strict";

import type { Almacen } from "../../puertos/almacen";
import {
  envolverAlmacenPostgres,
  TECHO_ARRANQUE_MS,
} from "../../adaptadores/postgres/no-quedarse-colgado";
import {
  falloDelArranque,
  olvidarFalloDelArranque,
} from "../../adaptadores/postgres/fallo-del-arranque";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

function almacenQue(hace: () => Promise<unknown>): Almacen {
  return { listarPedidos: hace } as unknown as Almacen;
}

async function principal() {
  console.log("\nQue el arranque no pueda dejar el panel sin cargar");

  await comprueba("si el arranque NO VUELVE NUNCA, la consulta sigue igual", async () => {
    /*
      EL CASO DE LOS TRES DIAS. Antes, esto dejaba la pantalla colgada hasta que
      saltaba el techo de la consulta, y asi cada peticion, para siempre.
    */
    let soltada = 0;
    const a = envolverAlmacenPostgres(
      almacenQue(async () => ["un pedido"]),
      () => new Promise<void>(() => {}),
      () => {
        soltada += 1;
      },
    );

    const desde = Date.now();
    assert.deepEqual(await a.listarPedidos(), ["un pedido"]);
    const tardo = Date.now() - desde;

    /*
      Y la conexion tiene que soltarse. Sin esto, la consulta que viene detras
      hereda la conexion que el arranque dejo ocupada y se cuelga igual: el
      panel tardaria once segundos en no cargar, en vez de siete.
    */
    assert.equal(soltada, 1, "habia que soltar la conexion que el arranque dejo ocupada");

    assert.ok(
      tardo >= TECHO_ARRANQUE_MS - 500 && tardo < TECHO_ARRANQUE_MS + 2000,
      `esperó ${tardo} ms, fuera del techo de arranque de ${TECHO_ARRANQUE_MS} ms`,
    );
    assert.match(String(falloDelArranque()), /arranque/i, "tenia que quedar anotado");
  });

  await comprueba("si el arranque REVIENTA, la consulta sigue igual", async () => {
    /*
      Las tablas ya existen: el panel puede trabajar. Y si de verdad faltara
      alguna, la consulta dira "relation ... does not exist", que es un error
      con nombre y con arreglo, no una pantalla en gris.
    */
    const a = envolverAlmacenPostgres(
      almacenQue(async () => "listo"),
      async () => {
        throw new Error("la migracion no pudo correr");
      },
      () => {},
    );
    assert.equal(await a.listarPedidos(), "listo");
    assert.match(String(falloDelArranque()), /migracion no pudo correr/);
  });

  await comprueba("un arranque normal NO se espera de mas ni deja fallo", async () => {
    olvidarFalloDelArranque();
    const a = envolverAlmacenPostgres(
      almacenQue(async () => "listo"),
      async () => {
        await new Promise((r) => setTimeout(r, 30));
      },
      () => {},
    );
    const desde = Date.now();
    assert.equal(await a.listarPedidos(), "listo");
    assert.ok(Date.now() - desde < 1000, "no puede esperar el techo entero");
    assert.equal(falloDelArranque(), undefined, "no habia nada que anotar");
  });

  await comprueba("el arranque lento NO se corta: termina por su cuenta", async () => {
    /*
      LA OTRA MITAD, y es la que evita repetir el desastre de la vuelta 14. Se
      techa la espera, no el trabajo: la migracion sigue viva y acaba sola.
    */
    let termino = false;
    const arranque = (async () => {
      await new Promise((r) => setTimeout(r, TECHO_ARRANQUE_MS + 1200));
      termino = true;
    })();

    const a = envolverAlmacenPostgres(
      almacenQue(async () => "listo"),
      () => arranque,
      () => {},
    );
    assert.equal(await a.listarPedidos(), "listo");
    assert.equal(termino, false, "todavia no habia terminado, y esta bien");

    await arranque;
    assert.equal(termino, true, "la migracion tenia que terminar por su cuenta");
  });

  console.log(`\n${hechas} comprobaciones del arranque que no bloquea, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Fallaron:\n", error);
  process.exit(1);
});
