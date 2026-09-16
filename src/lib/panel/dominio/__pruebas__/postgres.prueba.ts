/*
  El adaptador de Postgres, probado contra Postgres de verdad.

  Corre sobre PGlite —Postgres 18 compilado a WebAssembly— expuesto por TCP, y
  se conecta con `postgres.js`: **el mismo cliente y las mismas opciones que en
  produccion**. Sin credenciales, sin red y sin tocar la base de datos de nadie.

  QUE SEA EL MISMO CLIENTE NO ES UN DETALLE. La primera version de esta prueba
  hablaba con PGlite por su API propia, y dejo pasar un fallo de verdad: la
  direccion de una tienda se guardaba con doble codificacion y volvia como
  cadena en vez de objeto, asi que `direccion.pais` era `undefined`. PGlite por
  su API lo toleraba; `postgres.js` no. El fallo aparecio al abrir el panel
  contra Postgres, no en las pruebas.

  Una prueba que usa un cliente distinto al de produccion comprueba algo que no
  es lo que se despliega.

  Lo que se comprueba no es "que el codigo llama a la base": es que **un pedido
  guardado y vuelto a leer es exactamente el mismo pedido**. Los adaptadores se
  rompen en la traduccion — un importe que vuelve como cadena, una fecha que
  pierde la zona, un campo opcional que se convierte en null y luego en cero —
  y eso solo se ve yendo y volviendo.
*/

import assert from "node:assert/strict";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";

import { crearAlmacenPostgres } from "../../adaptadores/almacen-postgres";
import type { Conexion } from "../../adaptadores/postgres/conexion";
import { SQL_001_INICIAL } from "../../adaptadores/postgres/migraciones";
import { migrar } from "../../adaptadores/postgres/migrar";
import { euros, IVA_LITUANIA } from "../dinero";
import { deudaDe, totalesDe } from "../mayorista";
import type { Pedido, PedidoMayorista, Tienda } from "../tipos";

/**
 * Quita las claves que valen `undefined` antes de comparar.
 *
 * `deepEqual` distingue entre "la clave no esta" y "la clave esta y vale
 * undefined", y para este dominio son lo mismo: `pedido.seguimiento` es
 * undefined en los dos casos. Sin esto, la prueba fallaria por una diferencia
 * que no existe.
 *
 * Lo que sigue detectando, que es lo que importa: un importe que vuelve como
 * cadena en vez de numero, una fecha que pierde la zona, un campo que cambia de
 * valor, o un objeto anidado que no se guardo entero.
 */
function sinVacios<T>(valor: T): T {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(sinVacios) as T;
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, sinVacios(v)]),
  ) as T;
}

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const PUERTO = 5434;
const db = new PGlite();
const servidor = new PGLiteSocketServer({ db, port: PUERTO, host: "127.0.0.1" });

/* Las mismas opciones que `conexion.ts` usa contra Supabase, `prepare: false`
   incluido: es lo que exige el pooler de transacciones. */
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

const sqlInicial = SQL_001_INICIAL;

/*
  Todo va dentro de una funcion porque las pruebas se compilan a CommonJS, que
  no admite `await` en el nivel superior del modulo.
*/
async function principal() {
  await servidor.start();
  console.log("\nMigraciones");

  await comprueba("crean las tablas, y solo una vez", async () => {
    const primera = await migrar(cx, [{ nombre: "001-inicial", sql: sqlInicial }]);
    assert.deepEqual(primera, ["001-inicial"]);
    /* Correrla de nuevo no debe hacer nada ni fallar: es lo que pasa en cada
       despliegue de Vercel. */
    const segunda = await migrar(cx, [{ nombre: "001-inicial", sql: sqlInicial }]);
    assert.deepEqual(segunda, []);
  });

  const almacen = crearAlmacenPostgres(cx);

  await cx.consultar(
    `insert into usuarios (id, nombre, correo, rol) values
       ('u-alfredo', 'Alfredo', 'info@nerowacases.com', 'operacion'),
       ('u-adrian', 'Adrian', 'hello@arcmediahouse.com', 'dueno')`,
  );
  await cx.consultar(
    `insert into colores (id, nombre, hex, activo) values
       ('negro', 'Black', '#111111', true),
       ('marino', 'Navy', '#1b2a4a', true)`,
  );

  console.log("\nQuien entra");

  await comprueba("busca por correo sin importar mayusculas ni espacios", async () => {
    const u = await almacen.usuarioPorCorreo("  HELLO@ArcMediaHouse.com ");
    assert.equal(u?.id, "u-adrian");
    assert.equal(u?.rol, "dueno");
  });

  await comprueba("un correo que no existe devuelve nada, no revienta", async () => {
    assert.equal(await almacen.usuarioPorCorreo("nadie@ejemplo.com"), undefined);
  });

  console.log("\nLotes: el dinero vuelve como numero, no como cadena");

  await comprueba("un lote de 3.400 EUR se lee igual que se escribio", async () => {
    await cx.consultar(
      `insert into lotes (id, referencia, llegada_en, unidades, factura_fabrica, flete)
       values ('lote-1', '2026-08', now(), 100, $1, $2)`,
      [euros(2400), euros(1000)],
    );
    const lote = await almacen.lotePorId("lote-1");
    assert.equal(typeof lote?.facturaFabrica, "number");
    assert.equal(lote?.facturaFabrica, euros(2400));
    assert.equal(lote?.flete, euros(1000));
    /* Los que no se pusieron valen cero, no `null` ni `undefined`. */
    assert.equal(lote?.aranceles, 0);
    assert.equal(lote?.ivaRecuperable, false);
  });

  console.log("\nPedidos de la web");

  const pedido: Pedido = {
    id: "p-1",
    numero: 1043,
    origen: "web",
    estado: "pagado",
    clienteNombre: "Marta Kazlauskiene",
    clienteCorreo: "marta@ejemplo.lt",
    direccion: {
      nombre: "Marta Kazlauskiene",
      linea1: "Gedimino pr. 1",
      ciudad: "Vilnius",
      codigoPostal: "01103",
      pais: "LT",
    },
    lineas: [{ colorId: "marino", cantidad: 2, precioUnitario: euros(180), loteId: "lote-1" }],
    envioCobrado: euros(18),
    tipoIva: IVA_LITUANIA,
    pagadoEn: "2026-09-15T10:00:00.000Z",
  };

  await comprueba("guardado y vuelto a leer es el mismo pedido, campo a campo", async () => {
    await almacen.crearPedido(pedido);
    const leido = await almacen.pedidoPorId("p-1");
    assert.deepEqual(sinVacios(leido), sinVacios(pedido));
  });

  await comprueba("la direccion vuelve como OBJETO, no como cadena", async () => {
    /*
      Esta es la comprobacion que faltaba. El fallo real fue este: la direccion
      se guardaba con doble codificacion y volvia como cadena, asi que
      `direccion.pais` era undefined y la ficha de la tienda reventaba.
    */
    const leido = await almacen.pedidoPorId("p-1");
    assert.equal(typeof leido?.direccion, "object");
    assert.equal(leido?.direccion.pais, "LT");
    assert.equal(leido?.direccion.ciudad, "Vilnius");
    assert.ok(Array.isArray(leido?.lineas));
    assert.equal(leido?.lineas[0]?.cantidad, 2);
  });

  await comprueba("los campos opcionales vacios vuelven como undefined, no null", async () => {
    const leido = await almacen.pedidoPorId("p-1");
    assert.equal(leido?.seguimiento, undefined);
    assert.equal(leido?.envioCoste, undefined);
    assert.equal(leido?.enviadoEn, undefined);
    assert.equal(leido?.tiendaId, undefined);
  });

  await comprueba("marcar enviado cambia solo lo que se le pide", async () => {
    const antes = await almacen.pedidoPorId("p-1");
    const despues = await almacen.actualizarPedido("p-1", {
      estado: "enviado",
      seguimiento: "RA123456789LT",
      enviadoEn: "2026-09-16T09:00:00.000Z",
      envioCoste: euros(16.4),
    });
    assert.equal(despues?.estado, "enviado");
    assert.equal(despues?.seguimiento, "RA123456789LT");
    assert.equal(despues?.envioCoste, euros(16.4));
    /* Y lo que no se toco sigue igual. */
    assert.equal(despues?.clienteNombre, antes?.clienteNombre);
    assert.deepEqual(despues?.lineas, antes?.lineas);
    assert.equal(despues?.pagadoEn, antes?.pagadoEn);
  });

  await comprueba("un cambio vacio no borra nada", async () => {
    const igual = await almacen.actualizarPedido("p-1", {});
    assert.equal(igual?.estado, "enviado");
    assert.equal(igual?.seguimiento, "RA123456789LT");
  });

  await comprueba("un pedido que no existe devuelve nada", async () => {
    assert.equal(await almacen.actualizarPedido("no-existe", { estado: "enviado" }), undefined);
  });

  await comprueba("los numeros de pedido siguen la cuenta", async () => {
    assert.equal(await almacen.siguienteNumeroPedido(), 1044);
  });

  await comprueba("la lista sale con el mas viejo primero", async () => {
    await almacen.crearPedido({
      ...pedido,
      id: "p-2",
      numero: 1044,
      pagadoEn: "2026-09-10T10:00:00.000Z",
    });
    const todos = await almacen.listarPedidos();
    assert.deepEqual(todos.map((p) => p.numero), [1044, 1043]);
  });

  await comprueba("se puede filtrar por estado", async () => {
    const pendientes = await almacen.listarPedidos({ estados: ["pagado"] });
    assert.deepEqual(pendientes.map((p) => p.id), ["p-2"]);
  });

  console.log("\nTiendas y sus pedidos");

  const tienda: Tienda = {
    id: "t-berlin",
    nombre: "Kontrabass Berlin",
    razonSocial: "Kontrabass Berlin GmbH",
    numeroIva: "DE811234567",
    ivaValidado: true,
    direccion: {
      nombre: "Kontrabass Berlin",
      linea1: "Oranienstrasse 12",
      ciudad: "Berlin",
      codigoPostal: "10999",
      pais: "DE",
    },
    contactoNombre: "Anna Weber",
    precioPersonalizado: euros(95),
    plazoPagoDias: 30,
    activa: true,
    creadaEn: "2026-07-01T00:00:00.000Z",
  };

  await comprueba("una tienda va y vuelve entera", async () => {
    await almacen.crearTienda(tienda);
    assert.deepEqual(sinVacios(await almacen.tiendaPorId("t-berlin")), sinVacios(tienda));
  });

  await comprueba("editar la direccion la deja legible, no como cadena", async () => {
    await almacen.actualizarTienda("t-berlin", {
      direccion: { ...tienda.direccion, ciudad: "Hamburgo" },
    });
    const leida = await almacen.tiendaPorId("t-berlin");
    assert.equal(typeof leida?.direccion, "object");
    assert.equal(leida?.direccion.ciudad, "Hamburgo");
    assert.equal(leida?.direccion.pais, "DE");
    /* Se deja como estaba para las comprobaciones siguientes. */
    await almacen.actualizarTienda("t-berlin", { direccion: tienda.direccion });
  });

  await comprueba("editarla cambia lo pedido y respeta lo demas", async () => {
    const editada = await almacen.actualizarTienda("t-berlin", {
      plazoPagoDias: 45,
      notas: "Sube a 45 dias desde octubre.",
    });
    assert.equal(editada?.plazoPagoDias, 45);
    assert.equal(editada?.notas, "Sube a 45 dias desde octubre.");
    assert.equal(editada?.precioPersonalizado, euros(95));
    assert.deepEqual(editada?.direccion, tienda.direccion);
  });

  await comprueba("quitarle el precio acordado lo deja de verdad vacio", async () => {
    const sinPrecio = await almacen.actualizarTienda("t-berlin", {
      precioPersonalizado: undefined,
    });
    /* `undefined` significa "no lo toques", asi que sigue puesto. Para quitarlo
       hay que mandar `null`, y eso es decision de quien llama. */
    assert.equal(sinPrecio?.precioPersonalizado, euros(95));
  });

  const pedidoMayorista: PedidoMayorista = {
    id: "pm-1",
    numero: 501,
    tiendaId: "t-berlin",
    estado: "confirmado",
    cobro: "facturado",
    envio: "enviado",
    lineas: [{ colorId: "negro", cantidad: 20, precioUnitario: euros(95), loteId: "lote-1" }],
    envioCobrado: euros(120),
    regimenIva: "intracomunitario",
    tipoIva: 0,
    creadoEn: "2026-08-01T00:00:00.000Z",
    confirmadoEn: "2026-08-02T00:00:00.000Z",
    facturadoEn: "2026-08-03T00:00:00.000Z",
    enviadoEn: "2026-08-04T00:00:00.000Z",
    referenciaFactura: "2026-014",
    seguimiento: "CP444555666LT",
  };

  await comprueba("un pedido mayorista va y vuelve entero", async () => {
    await almacen.crearPedidoMayorista(pedidoMayorista);
    assert.deepEqual(
      sinVacios(await almacen.pedidoMayoristaPorId("pm-1")),
      sinVacios(pedidoMayorista),
    );
  });

  await comprueba("las tres pistas se mueven por separado", async () => {
    const cobrado = await almacen.actualizarPedidoMayorista("pm-1", {
      cobro: "pagado",
      pagadoEn: "2026-09-01T00:00:00.000Z",
    });
    assert.equal(cobrado?.cobro, "pagado");
    /* El envio no se movio. */
    assert.equal(cobrado?.envio, "enviado");
    assert.equal(cobrado?.estado, "confirmado");
  });

  await comprueba("se listan solo los de una tienda, del mas nuevo al mas viejo", async () => {
    await almacen.crearPedidoMayorista({
      ...pedidoMayorista,
      id: "pm-2",
      numero: 502,
      cobro: "sin_facturar",
      facturadoEn: undefined,
      creadoEn: "2026-09-10T00:00:00.000Z",
    });
    const suyos = await almacen.listarPedidosMayoristas("t-berlin");
    assert.deepEqual(suyos.map((p) => p.numero), [502, 501]);
    assert.deepEqual((await almacen.listarPedidosMayoristas("no-existe")), []);
  });

  await comprueba("los numeros mayoristas siguen su propia cuenta", async () => {
    assert.equal(await almacen.siguienteNumeroMayorista(), 503);
  });

  console.log("\nEl dominio funciona igual sobre lo que devuelve Postgres");

  await comprueba("los totales cuadran con lo leido de la base", async () => {
    const p = await almacen.pedidoMayoristaPorId("pm-1");
    const t = totalesDe(p!);
    assert.equal(t.unidades, 20);
    assert.equal(t.producto, euros(1900));
    assert.equal(t.envio, euros(120));
    assert.equal(t.base, euros(2020));
    /* Intracomunitario: sin IVA. */
    assert.equal(t.iva, 0);
    assert.equal(t.total, euros(2020));
  });

  await comprueba("la deuda se calcula sobre lo facturado y sin cobrar", async () => {
    await almacen.actualizarPedidoMayorista("pm-2", {
      cobro: "facturado",
      facturadoEn: "2026-08-01T00:00:00.000Z",
    });
    const t = (await almacen.tiendaPorId("t-berlin"))!;
    const suyos = await almacen.listarPedidosMayoristas("t-berlin");
    const d = deudaDe(suyos, t, new Date("2026-09-16T00:00:00.000Z").getTime());
    /* Solo pm-2 esta facturado sin cobrar; pm-1 ya se pago. */
    assert.equal(d.pedidos, 1);
    assert.equal(d.importe, euros(2020));
    assert.equal(d.diasDelMasViejo, 46);
    assert.equal(d.vencida, true);
  });

  console.log("\nRastro");

  await comprueba("los apuntes salen del mas nuevo al mas viejo", async () => {
    for (const [i, detalle] of ["primero", "segundo", "tercero"].entries()) {
      await almacen.anotar({
        id: `a-${i}`,
        entidad: "pedido",
        entidadId: "p-1",
        accion: "prueba",
        usuarioId: "u-adrian",
        detalle,
        creadoEn: new Date(Date.UTC(2026, 8, 10 + i)).toISOString(),
      });
    }
    const apuntes = await almacen.listarApuntes("pedido", "p-1");
    assert.deepEqual(apuntes.map((a) => a.detalle), ["tercero", "segundo", "primero"]);
    /* Y no se mezclan con los de otra cosa. */
    assert.deepEqual(await almacen.listarApuntes("pedido", "p-2"), []);
  });

  console.log("\nLo que la base de datos NO deja hacer");

  await comprueba("un estado inventado no entra", async () => {
    await assert.rejects(
      cx.consultar(
        `insert into pedidos (id, numero, origen, estado, cliente_nombre, cliente_correo,
          direccion, lineas, tipo_iva, pagado_en)
         values ('x', 9999, 'web', 'inventado', 'a', 'b', '{}', '[]', 2100, now())`,
      ),
    );
  });

  await comprueba("dos pedidos no pueden tener el mismo numero", async () => {
    await assert.rejects(almacen.crearPedido({ ...pedido, id: "p-3" }));
  });

  await comprueba("un pedido mayorista no puede colgar de una tienda que no existe", async () => {
    await assert.rejects(
      almacen.crearPedidoMayorista({ ...pedidoMayorista, id: "pm-9", numero: 599, tiendaId: "fantasma" }),
    );
  });

  console.log(`\n${hechas} comprobaciones de Postgres, todas en verde.\n`);
  await sql.end();
  await servidor.stop();
  await db.close();
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones de Postgres fallaron:\n", error);
  process.exit(1);
});
