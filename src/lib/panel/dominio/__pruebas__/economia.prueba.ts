/*
  Comprobacion de la aritmetica del dinero. Se corre con `npm run pruebas`.

  No usa marco de pruebas a proposito: son funciones puras y la comprobacion
  cabe en un archivo. El dia que haga falta uno de verdad, estas aserciones se
  mudan tal cual.

  Los numeros esperados salen de `docs/economia-nerowa.md`. Si un calculo deja
  de cuadrar con el documento, uno de los dos esta mal y hay que mirar cual.
*/

import assert from "node:assert/strict";

import {
  aplicarIva,
  conIva,
  euros,
  formatearEuros,
  IVA_LITUANIA,
  repartir,
  sinIva,
} from "../dinero";
import {
  costeDeLote,
  margenDePedido,
  precioEscaparate,
  precioMayorista,
  PRECIO_PUBLICO,
  unidadesParaRecuperar,
} from "../economia";
import { puedeTransitar, transicionesDesde } from "../estados";
import type { Lote, Pedido } from "../tipos";

let hechas = 0;
function comprueba(que: string, fn: () => void) {
  fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

console.log("\nDinero");

comprueba("euros() pasa a centimos enteros", () => {
  assert.equal(euros(180), 18_000);
  assert.equal(euros(217.8), 21_780);
});

comprueba("el IVA lituano sobre 180 EUR son 37,80 EUR", () => {
  assert.equal(aplicarIva(euros(180), IVA_LITUANIA), euros(37.8));
  assert.equal(conIva(euros(180), IVA_LITUANIA), euros(217.8));
});

comprueba("sinIva deshace conIva sin perder centimos", () => {
  for (const base of [euros(180), euros(120), euros(110), euros(100), 1, 333]) {
    assert.equal(sinIva(conIva(base, IVA_LITUANIA), IVA_LITUANIA), base);
  }
});

comprueba("repartir no inventa ni pierde centimos", () => {
  for (const [total, partes] of [[100, 3], [1, 7], [12_345, 11]] as const) {
    const trozos = repartir(total, partes);
    assert.equal(trozos.length, partes);
    assert.equal(trozos.reduce((a, b) => a + b, 0), total);
  }
});

comprueba("formatearEuros omite decimales solo si la cifra es redonda", () => {
  assert.match(formatearEuros(euros(180), { decimales: false }), /^180\s*€$/u);
  assert.match(formatearEuros(euros(217.8), { decimales: false }), /217,80/u);
});

console.log("\nPrecios");

comprueba("el escaparate ensena 217,80 EUR, no 180", () => {
  assert.equal(precioEscaparate(), euros(217.8));
});

comprueba("los tramos mayoristas son 120 / 110 / 100", () => {
  assert.equal(precioMayorista(1), euros(120));
  assert.equal(precioMayorista(5), euros(120));
  assert.equal(precioMayorista(6), euros(110));
  assert.equal(precioMayorista(15), euros(110));
  assert.equal(precioMayorista(16), euros(100));
  assert.equal(precioMayorista(200), euros(100));
});

console.log("\nCoste del lote");

const loteActual: Lote = {
  id: "lote-1",
  referencia: "2026-08",
  llegadaEn: "2026-08-20T00:00:00.000Z",
  unidades: 100,
  facturaFabrica: euros(2400),
  /* Los 1.000 EUR de traerlo, todavia sin desglosar: van juntos en flete. */
  flete: euros(1000),
  aranceles: 0,
  ivaImportacion: 0,
  despacho: 0,
  ivaRecuperable: false,
};

comprueba("el lote actual sale a 34 EUR la unidad, no a 24", () => {
  const coste = costeDeLote(loteActual);
  assert.equal(coste.desembolso, euros(3400));
  assert.equal(coste.costeUnitario, euros(34));
});

comprueba("desglosar el IVA de importacion baja el coste real", () => {
  const desglosado: Lote = {
    ...loteActual,
    flete: euros(400),
    aranceles: euros(12),
    ivaImportacion: euros(588),
    despacho: 0,
    ivaRecuperable: true,
  };
  const coste = costeDeLote(desglosado);
  assert.equal(coste.desembolso, euros(3400));
  /* 3.400 - 588 recuperados = 2.812, o sea 28,12 EUR por unidad. */
  assert.equal(coste.costeUnitario, euros(28.12));
});

console.log("\nMargen");

const costePorLote = new Map([["lote-1", euros(34)]]);

const pedidoWeb: Pedido = {
  id: "p1",
  numero: 1043,
  origen: "web",
  estado: "pagado",
  clienteNombre: "Marta K.",
  clienteCorreo: "marta@example.com",
  direccion: { nombre: "Marta K.", linea1: "Gedimino pr. 1", ciudad: "Vilnius", codigoPostal: "01103", pais: "LT" },
  lineas: [{ colorId: "navy", cantidad: 1, precioUnitario: PRECIO_PUBLICO, loteId: "lote-1" }],
  envioCobrado: 0,
  tipoIva: IVA_LITUANIA,
  pagadoEn: "2026-09-15T10:00:00.000Z",
};

comprueba("una venta web deja unos 142 EUR", () => {
  const m = margenDePedido(pedidoWeb, costePorLote, euros(34));
  assert.equal(m.cobrado, euros(217.8));
  assert.equal(m.ingresoNeto, euros(180));
  assert.equal(m.iva, euros(37.8));
  assert.equal(m.costeProducto, euros(34));
  /* 1,5% de 217,80 + 0,25 = 3,52 EUR */
  assert.equal(m.comision, euros(3.52));
  assert.equal(m.margen, euros(142.48));
  assert.equal(m.estimado, true);
});

comprueba("si Stripe dice lo que cobro, manda Stripe y no la estimacion", () => {
  const conDatosReales: Pedido = {
    ...pedidoWeb,
    stripeTotalCobrado: euros(217.8),
    stripeComision: euros(4.1),
    envioCoste: 0,
  };
  const m = margenDePedido(conDatosReales, costePorLote, euros(34));
  assert.equal(m.comision, euros(4.1));
  assert.equal(m.margen, euros(180) - euros(34) - euros(4.1));
  assert.equal(m.estimado, false);
});

comprueba("una venta mayorista de 16 no paga comision de tarjeta", () => {
  const mayorista: Pedido = {
    ...pedidoWeb,
    id: "p2",
    origen: "mayorista",
    lineas: [{ colorId: "navy", cantidad: 16, precioUnitario: precioMayorista(16), loteId: "lote-1" }],
    envioCoste: 0,
  };
  const m = margenDePedido(mayorista, costePorLote, euros(34));
  assert.equal(m.comision, 0);
  /* 16 x 100 = 1.600 de ingreso, 16 x 34 = 544 de coste, quedan 1.056. */
  assert.equal(m.ingresoNeto, euros(1600));
  assert.equal(m.margen, euros(1056));
});

comprueba("el lote se paga con 24 ventas web", () => {
  assert.equal(unidadesParaRecuperar(loteActual, euros(142.48)), 24);
  /* En el peor tramo mayorista, 100 - 34 = 66 de margen: 52 unidades. */
  assert.equal(unidadesParaRecuperar(loteActual, euros(66)), 52);
});

console.log("\nEstados");

comprueba("de pagado solo se puede ir a enviado o cancelado", () => {
  const desdeOperacion = transicionesDesde("pagado", "operacion").map((t) => t.hacia);
  assert.deepEqual(desdeOperacion, ["enviado"]);
  const desdeDueno = transicionesDesde("pagado", "dueno").map((t) => t.hacia);
  assert.deepEqual(desdeDueno.sort(), ["cancelado", "enviado"]);
});

comprueba("marcar enviado exige numero de seguimiento", () => {
  assert.equal(puedeTransitar("pagado", "enviado", "operacion")?.requiere, "seguimiento");
});

comprueba("no se puede saltar de pagado a entregado", () => {
  assert.equal(puedeTransitar("pagado", "entregado", "dueno"), undefined);
});

comprueba("volver atras existe, pero marcado como correctivo", () => {
  assert.equal(puedeTransitar("enviado", "pagado", "operacion")?.correctiva, true);
});

console.log(`\n${hechas} comprobaciones, todas en verde.\n`);
