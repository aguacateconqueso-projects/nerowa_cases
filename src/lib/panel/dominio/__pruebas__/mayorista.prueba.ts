/*
  Comprobacion de las reglas de los pedidos a tiendas.

  Lo que mas importa aqui es el IVA: es lo unico del panel que cambia el total
  de un documento que sale de la empresa. Un pedido de 16 estuches son 1.600 EUR
  y el IVA lituano sobre eso son 336 EUR de diferencia. Ver
  `docs/economia-nerowa.md` §4.3.
*/

import assert from "node:assert/strict";

import { euros, IVA_LITUANIA } from "../dinero";
import {
  accionesDe,
  deudaDe,
  estaCerrado,
  precioParaTienda,
  regimenDe,
  tipoIvaDe,
  totalesDe,
} from "../mayorista";
import type { Direccion, PedidoMayorista, Tienda } from "../tipos";

let hechas = 0;
function comprueba(que: string, fn: () => void) {
  fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const direccion = (pais: string): Direccion => ({
  nombre: "Tienda",
  linea1: "Calle 1",
  ciudad: "Ciudad",
  codigoPostal: "00000",
  pais,
});

const tienda = (extra: Partial<Tienda> = {}): Tienda => ({
  id: "t1",
  nombre: "Tienda de ejemplo",
  ivaValidado: false,
  direccion: direccion("LT"),
  plazoPagoDias: 30,
  activa: true,
  creadaEn: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const pedido = (extra: Partial<PedidoMayorista> = {}): PedidoMayorista => ({
  id: "pm1",
  numero: 501,
  tiendaId: "t1",
  estado: "confirmado",
  cobro: "sin_facturar",
  envio: "sin_enviar",
  lineas: [{ colorId: "negro", cantidad: 16, precioUnitario: euros(100) }],
  envioCobrado: euros(40),
  regimenIva: "nacional",
  tipoIva: IVA_LITUANIA,
  creadoEn: "2026-09-01T00:00:00.000Z",
  ...extra,
});

console.log("\nIVA de las tiendas");

comprueba("una tienda lituana paga IVA", () => {
  const t = tienda({ direccion: direccion("LT") });
  assert.equal(regimenDe(t), "nacional");
  assert.equal(tipoIvaDe(regimenDe(t)), IVA_LITUANIA);
});

comprueba("otra de la UE con numero validado va sin IVA", () => {
  const t = tienda({ direccion: direccion("DE"), numeroIva: "DE123456789", ivaValidado: true });
  assert.equal(regimenDe(t), "intracomunitario");
  assert.equal(tipoIvaDe(regimenDe(t)), 0);
});

comprueba("un numero SIN comprobar no vale: se le cobra el IVA", () => {
  const t = tienda({ direccion: direccion("DE"), numeroIva: "DE123456789", ivaValidado: false });
  assert.equal(regimenDe(t), "sin_numero_valido");
  assert.equal(tipoIvaDe(regimenDe(t)), IVA_LITUANIA);
});

comprueba("fuera de la UE es exportacion, sin IVA", () => {
  for (const pais of ["US", "GB", "CH", "JP"]) {
    const t = tienda({ direccion: direccion(pais) });
    assert.equal(regimenDe(t), "exportacion", pais);
    assert.equal(tipoIvaDe(regimenDe(t)), 0, pais);
  }
});

comprueba("el pais se lee sin importar mayusculas", () => {
  assert.equal(regimenDe(tienda({ direccion: direccion("lt") })), "nacional");
  assert.equal(regimenDe(tienda({ direccion: direccion("de") })), "sin_numero_valido");
});

console.log("\nLos 336 EUR de diferencia");

comprueba("el mismo pedido cuesta 336 EUR mas a una tienda lituana", () => {
  const conIva = totalesDe(pedido({ envioCobrado: 0, tipoIva: IVA_LITUANIA }));
  const sinIva = totalesDe(pedido({ envioCobrado: 0, tipoIva: 0, regimenIva: "intracomunitario" }));
  assert.equal(conIva.base, euros(1600));
  assert.equal(sinIva.base, euros(1600));
  assert.equal(conIva.total, euros(1936));
  assert.equal(sinIva.total, euros(1600));
  assert.equal(conIva.total - sinIva.total, euros(336));
});

comprueba("el envio tambien lleva IVA, y va aparte del producto", () => {
  const t = totalesDe(pedido());
  assert.equal(t.unidades, 16);
  assert.equal(t.producto, euros(1600));
  assert.equal(t.envio, euros(40));
  assert.equal(t.base, euros(1640));
  assert.equal(t.total, euros(1984.4));
});

console.log("\nPrecio de cada tienda");

comprueba("sin precio acordado, manda el tramo por volumen", () => {
  const t = tienda();
  assert.equal(precioParaTienda(t, 3), euros(120));
  assert.equal(precioParaTienda(t, 10), euros(110));
  assert.equal(precioParaTienda(t, 16), euros(100));
});

comprueba("con precio acordado, manda el suyo en cualquier cantidad", () => {
  const t = tienda({ precioPersonalizado: euros(95) });
  assert.equal(precioParaTienda(t, 1), euros(95));
  assert.equal(precioParaTienda(t, 40), euros(95));
});

console.log("\nQue se puede hacer con un pedido");

comprueba("sin confirmar, solo se confirma o se cancela", () => {
  const p = pedido({ estado: "por_confirmar" });
  assert.deepEqual(accionesDe(p, "operacion").map((a) => a.hacia), ["confirmado"]);
  assert.deepEqual(
    accionesDe(p, "dueno").map((a) => a.hacia).sort(),
    ["cancelado", "confirmado"],
  );
});

comprueba("cobro y envio avanzan por separado, no en fila", () => {
  const p = pedido();
  const acciones = accionesDe(p, "dueno");
  assert.deepEqual(acciones.map((a) => a.hacia).sort(), ["enviado", "facturado"]);
  /* Se puede enviar sin haber facturado, y facturar sin haber enviado. */
  const soloEnviado = pedido({ envio: "enviado" });
  assert.ok(accionesDe(soloEnviado, "dueno").some((a) => a.hacia === "facturado"));
  const soloFacturado = pedido({ cobro: "facturado" });
  assert.ok(accionesDe(soloFacturado, "dueno").some((a) => a.hacia === "enviado"));
});

comprueba("dar por cobrado es cosa del dueno, como el reembolso", () => {
  const p = pedido({ cobro: "facturado" });
  assert.ok(!accionesDe(p, "operacion").some((a) => a.hacia === "pagado"));
  assert.ok(accionesDe(p, "dueno").some((a) => a.hacia === "pagado"));
});

comprueba("marcar facturado pide el numero de factura", () => {
  const a = accionesDe(pedido(), "dueno").find((x) => x.hacia === "facturado");
  assert.equal(a?.requiere, "factura");
});

comprueba("un pedido cancelado no admite nada", () => {
  assert.deepEqual(accionesDe(pedido({ estado: "cancelado" }), "dueno"), []);
});

comprueba("cerrado es cobrado Y entregado, no una de las dos", () => {
  assert.equal(estaCerrado(pedido({ cobro: "pagado", envio: "entregado" })), true);
  assert.equal(estaCerrado(pedido({ cobro: "pagado", envio: "enviado" })), false);
  assert.equal(estaCerrado(pedido({ cobro: "facturado", envio: "entregado" })), false);
  assert.equal(estaCerrado(pedido({ estado: "cancelado" })), true);
});

console.log("\nLo que deben");

const AHORA = new Date("2026-09-16T12:00:00.000Z").getTime();
const haceDias = (d: number) => new Date(AHORA - d * 86_400_000).toISOString();

comprueba("suma lo facturado y sin cobrar, y dice desde cuando", () => {
  const t = tienda({ plazoPagoDias: 30 });
  const d = deudaDe(
    [
      pedido({ id: "a", cobro: "facturado", facturadoEn: haceDias(50) }),
      pedido({ id: "b", cobro: "facturado", facturadoEn: haceDias(10) }),
      pedido({ id: "c", cobro: "pagado", facturadoEn: haceDias(80) }),
      pedido({ id: "d", cobro: "sin_facturar" }),
    ],
    t,
    AHORA,
  );
  /* Solo los dos facturados sin cobrar: 1.984,40 cada uno. */
  assert.equal(d.pedidos, 2);
  assert.equal(d.importe, euros(3968.8));
  assert.equal(d.diasDelMasViejo, 50);
  assert.equal(d.vencida, true);
});

comprueba("dentro del plazo acordado no esta vencida", () => {
  const d = deudaDe(
    [pedido({ cobro: "facturado", facturadoEn: haceDias(20) })],
    tienda({ plazoPagoDias: 30 }),
    AHORA,
  );
  assert.equal(d.vencida, false);
  assert.equal(d.diasDelMasViejo, 20);
});

comprueba("el plazo es de cada tienda, no uno global", () => {
  const p = [pedido({ cobro: "facturado", facturadoEn: haceDias(20) })];
  assert.equal(deudaDe(p, tienda({ plazoPagoDias: 15 }), AHORA).vencida, true);
  assert.equal(deudaDe(p, tienda({ plazoPagoDias: 60 }), AHORA).vencida, false);
});

comprueba("sin nada facturado, no debe nada", () => {
  const d = deudaDe([pedido({ cobro: "sin_facturar" })], tienda(), AHORA);
  assert.equal(d.importe, 0);
  assert.equal(d.pedidos, 0);
  assert.equal(d.vencida, false);
});

console.log(`\n${hechas} comprobaciones de mayorista, todas en verde.\n`);
