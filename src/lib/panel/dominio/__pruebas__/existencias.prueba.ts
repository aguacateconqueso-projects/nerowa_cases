/*
  Comprobacion de las existencias.

  Lo que se defiende aqui es la regla que sostiene el calculo: las ventas NO se
  apuntan dos veces. Un pedido mueve cajas segun su estado, y cancelarlo las
  devuelve sin que nadie haga nada. Si alguna de estas falla, el estante miente.
*/

import assert from "node:assert/strict";

import { euros, IVA_LITUANIA } from "../dinero";
import {
  calcularExistencias,
  diferenciasDeConteo,
  faltantesPara,
  hayConteo,
  totalesDeExistencias,
} from "../existencias";
import type { Color, MovimientoExistencias, Pedido, PedidoMayorista } from "../tipos";

let hechas = 0;
function comprueba(que: string, fn: () => void) {
  fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const colores: Color[] = [
  { id: "black", nombre: "Black", hex: "#000", activo: true },
  { id: "gold", nombre: "Gold", hex: "#d8b870", activo: true },
  { id: "viejo", nombre: "Viejo", hex: "#111", activo: false },
];

let n = 0;
const mov = (colorId: string, cantidad: number, extra: Partial<MovimientoExistencias> = {}): MovimientoExistencias => ({
  id: `m-${++n}`,
  colorId,
  cantidad,
  tipo: cantidad > 0 ? "entrada" : "merma",
  usuarioId: "u",
  creadoEn: `2026-11-0${Math.min(9, n)}T10:00:00.000Z`,
  ...extra,
});

const pedido = (estado: Pedido["estado"], colorId: string, cantidad: number): Pedido => ({
  id: `p-${++n}`,
  numero: 1000 + n,
  origen: "manual",
  estado,
  clienteNombre: "Cliente",
  clienteCorreo: "",
  direccion: { nombre: "C", linea1: "Calle", ciudad: "Vilnius", codigoPostal: "", pais: "LT" },
  lineas: [{ colorId, cantidad, precioUnitario: euros(180) }],
  envioCobrado: 0,
  tipoIva: IVA_LITUANIA,
  pagadoEn: "2026-11-10T10:00:00.000Z",
});

const mayorista = (
  estado: PedidoMayorista["estado"],
  envio: PedidoMayorista["envio"],
  colorId: string,
  cantidad: number,
): PedidoMayorista => ({
  id: `pm-${++n}`,
  numero: 500 + n,
  tiendaId: "t",
  estado,
  cobro: "sin_facturar",
  envio,
  lineas: [{ colorId, cantidad, precioUnitario: euros(110) }],
  envioCobrado: 0,
  regimenIva: "nacional",
  tipoIva: IVA_LITUANIA,
  creadoEn: "2026-11-10T10:00:00.000Z",
});

const de = (lista: ReturnType<typeof calcularExistencias>, id: string) =>
  lista.find((e) => e.color.id === id)!;

console.log("\nLo que hay en el estante");

comprueba("una entrada suma y una merma resta", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 10), mov("black", -2)],
    pedidos: [],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(ex, "black").enEstante, 8);
  assert.equal(de(ex, "black").disponibles, 8);
});

comprueba("vendido y sin enviar: sigue en el estante, pero no esta disponible", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 10)],
    pedidos: [pedido("pagado", "black", 3)],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(ex, "black").enEstante, 10);
  assert.equal(de(ex, "black").comprometidas, 3);
  assert.equal(de(ex, "black").disponibles, 7);
});

comprueba("enviado, entregado, archivado o con incidencia: ya salio del estante", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 10)],
    pedidos: [
      pedido("enviado", "black", 1),
      pedido("entregado", "black", 1),
      pedido("archivado", "black", 1),
      pedido("incidencia", "black", 1),
    ],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(ex, "black").enEstante, 6);
  assert.equal(de(ex, "black").comprometidas, 0);
});

comprueba("cancelar un pedido devuelve sus cajas sin apuntar nada", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 10)],
    pedidos: [pedido("cancelado", "black", 4)],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(ex, "black").disponibles, 10);
});

console.log("\nTiendas");

comprueba("por confirmar no descuenta, confirmado si, enviado sale del estante", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("gold", 30)],
    pedidos: [],
    mayoristas: [
      mayorista("por_confirmar", "sin_enviar", "gold", 5),
      mayorista("confirmado", "sin_enviar", "gold", 4),
      mayorista("confirmado", "enviado", "gold", 10),
      mayorista("cancelado", "sin_enviar", "gold", 99),
    ],
    umbralBajo: 3,
  });
  const g = de(ex, "gold");
  assert.equal(g.porConfirmar, 5);
  assert.equal(g.comprometidas, 4);
  assert.equal(g.enEstante, 20);
  assert.equal(g.disponibles, 16);
});

console.log("\nNiveles");

comprueba("bien, bajo, agotado y vendido de mas", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 3), mov("gold", 1)],
    pedidos: [pedido("pagado", "gold", 3)],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(ex, "black").nivel, "bajo");
  assert.equal(de(ex, "gold").nivel, "agotado");
  assert.equal(de(ex, "gold").faltan, 2);
});

comprueba("un color retirado y vacio no sale; con cajas, si", () => {
  const vacio = calcularExistencias({ colores, movimientos: [], pedidos: [], mayoristas: [], umbralBajo: 3 });
  assert.equal(vacio.some((e) => e.color.id === "viejo"), false);
  const conCajas = calcularExistencias({
    colores,
    movimientos: [mov("viejo", 2)],
    pedidos: [],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(conCajas, "viejo").enEstante, 2);
  /* Y no cuenta como agotado en los totales: ya no se vende. */
  assert.equal(totalesDeExistencias(vacio).agotados, 2);
});

comprueba("la ultima reposicion es el ultimo movimiento que sumo", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [
      mov("black", 5, { id: "primera", creadoEn: "2026-10-01T00:00:00.000Z" }),
      mov("black", 5, { id: "segunda", creadoEn: "2026-10-05T00:00:00.000Z" }),
      mov("black", -1, { id: "merma", creadoEn: "2026-10-09T00:00:00.000Z" }),
    ],
    pedidos: [],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.equal(de(ex, "black").ultimaReposicionId, "segunda");
});

comprueba("sin ningun movimiento no hay conteo", () => {
  assert.equal(hayConteo([]), false);
  assert.equal(hayConteo([mov("black", 1)]), true);
});

console.log("\nContar el estante");

comprueba("el conteo se compara con el estante, contando lo vendido sin enviar", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 10)],
    pedidos: [pedido("pagado", "black", 2)],
    mayoristas: [],
    umbralBajo: 3,
  });
  /* Hay 10 cajas fisicas, 2 de ellas vendidas. Alfredo cuenta 10: cuadra. */
  assert.deepEqual(diferenciasDeConteo(ex, new Map([["black", 10]])), []);
  /* Cuenta 9: falta una, y solo esa se apunta. */
  assert.deepEqual(diferenciasDeConteo(ex, new Map([["black", 9]])), [
    { colorId: "black", esperado: 10, contado: 9, ajuste: -1 },
  ]);
});

comprueba("un color sin contar no se toca: no contar no es contar cero", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 10), mov("gold", 4)],
    pedidos: [],
    mayoristas: [],
    umbralBajo: 3,
  });
  assert.deepEqual(diferenciasDeConteo(ex, new Map([["black", 10]])), []);
});

console.log("\nAntes de vender");

comprueba("dice que colores no llegan, y no bloquea los que si", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("black", 2), mov("gold", 10)],
    pedidos: [],
    mayoristas: [],
    umbralBajo: 3,
  });
  const lineas = [
    { colorId: "black", cantidad: 3, precioUnitario: 0 },
    { colorId: "gold", cantidad: 3, precioUnitario: 0 },
  ];
  assert.deepEqual(faltantesPara(ex, lineas), [{ colorId: "black", piden: 3, hay: 2 }]);
});

comprueba("dos lineas del mismo color se suman antes de comparar", () => {
  const ex = calcularExistencias({
    colores,
    movimientos: [mov("gold", 3)],
    pedidos: [],
    mayoristas: [],
    umbralBajo: 3,
  });
  const lineas = [
    { colorId: "gold", cantidad: 2, precioUnitario: 0 },
    { colorId: "gold", cantidad: 2, precioUnitario: 0 },
  ];
  assert.deepEqual(faltantesPara(ex, lineas), [{ colorId: "gold", piden: 4, hay: 3 }]);
});

console.log(`\n${hechas} comprobaciones de existencias, todas en verde.\n`);
