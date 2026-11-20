/*
  Comprobacion de las alertas: a quien, cuando, y que no se repitan.

  Es el corazon del panel ("que ningun pedido se quede parado sin que alguien
  se entere"), y se prueba con relojes inventados para no tener que esperar 48
  horas de verdad.
*/

import assert from "node:assert/strict";

import { AJUSTES_POR_DEFECTO, completarAjustes, validarAjuste } from "../ajustes";
import { alertasPara, calcularAlertas, resumenDiario, type EntradaAlertas } from "../alertas";
import { euros, IVA_LITUANIA } from "../dinero";
import { calcularExistencias } from "../existencias";
import { fechaEnVilnius, horaEnVilnius } from "../tiempo";
import type { Color, MovimientoExistencias, Pedido, PedidoMayorista, Tienda } from "../tipos";

let hechas = 0;
function comprueba(que: string, fn: () => void) {
  fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const HORA = 3_600_000;
const AHORA = Date.UTC(2026, 10, 16, 12, 0, 0);
const hace = (horas: number) => new Date(AHORA - horas * HORA).toISOString();

const colores: Color[] = [
  { id: "black", nombre: "Black", hex: "#000", activo: true },
  { id: "gold", nombre: "Gold", hex: "#d8b870", activo: true },
];

const pedido = (id: string, estado: Pedido["estado"], horas: number, extra: Partial<Pedido> = {}): Pedido => ({
  id,
  numero: 1040,
  origen: "web",
  estado,
  clienteNombre: "Marta",
  clienteCorreo: "",
  direccion: { nombre: "Marta", linea1: "Calle", ciudad: "Vilnius", codigoPostal: "", pais: "LT" },
  lineas: [{ colorId: "black", cantidad: 1, precioUnitario: euros(180) }],
  envioCobrado: 0,
  tipoIva: IVA_LITUANIA,
  pagadoEn: hace(horas),
  ...extra,
});

const lleno: MovimientoExistencias[] = [
  { id: "m1", colorId: "black", cantidad: 50, tipo: "entrada", usuarioId: "u", creadoEn: hace(500) },
  { id: "m2", colorId: "gold", cantidad: 50, tipo: "entrada", usuarioId: "u", creadoEn: hace(500) },
];

function entrada(e: {
  pedidos?: Pedido[];
  mayoristas?: PedidoMayorista[];
  tiendas?: Tienda[];
  movimientos?: MovimientoExistencias[];
  ahora?: number;
  recibos?: string[];
}): EntradaAlertas {
  const movimientos = e.movimientos ?? lleno;
  const pedidos = e.pedidos ?? [];
  const mayoristas = e.mayoristas ?? [];
  return {
    pedidos,
    mayoristas,
    tiendas: e.tiendas ?? [],
    colores,
    existencias: calcularExistencias({ colores, movimientos, pedidos, mayoristas, umbralBajo: 3 }),
    conConteo: movimientos.length > 0,
    conRecibo: new Set(e.recibos ?? []),
    ajustes: AJUSTES_POR_DEFECTO,
    ahora: e.ahora ?? AHORA,
  };
}

const tipos = (e: EntradaAlertas) => calcularAlertas(e).map((a) => a.tipo);

console.log("\nEl escalado de un pedido sin enviar");

comprueba("recien entrado: nada que avisar (la venta nueva avisa por su lado)", () => {
  assert.deepEqual(tipos(entrada({ pedidos: [pedido("p", "pagado", 2)] })), []);
});

comprueba("a las 24 h, recordatorio solo a Alfredo", () => {
  const [a] = calcularAlertas(entrada({ pedidos: [pedido("p", "pagado", 25)] }));
  assert.equal(a!.tipo, "pedido_recordatorio");
  assert.deepEqual(a!.para, ["operacion"]);
  assert.equal(a!.clave, "pedido:p:recordatorio");
  assert.equal(a!.enlace, "/panel/pedido/p");
});

comprueba("a las 48 h, a los dos, y el recordatorio ya no sale", () => {
  const alertas = calcularAlertas(entrada({ pedidos: [pedido("p", "pagado", 49)] }));
  assert.deepEqual(alertas.map((a) => a.tipo), ["pedido_escalado"]);
  assert.deepEqual(alertas[0]!.para, ["operacion", "dueno"]);
  assert.match(alertas[0]!.titulo, /#1040 lleva 2 dias sin enviar/);
});

comprueba("la clave no depende de la hora: dos revisiones dan la misma", () => {
  const a = calcularAlertas(entrada({ pedidos: [pedido("p", "pagado", 49)] }))[0]!;
  const b = calcularAlertas(entrada({ pedidos: [pedido("p", "pagado", 49)], ahora: AHORA + 5 * HORA }))[0]!;
  assert.equal(a.clave, b.clave);
});

comprueba("los plazos salen de Ajustes, no del codigo", () => {
  const e = entrada({ pedidos: [pedido("p", "pagado", 13)] });
  assert.deepEqual(tipos(e), []);
  e.ajustes = { ...AJUSTES_POR_DEFECTO, horasRecordatorio: 12 };
  assert.deepEqual(tipos(e), ["pedido_recordatorio"]);
});

comprueba("un enviado de hace 8 dias pide revisar el seguimiento", () => {
  const [a] = calcularAlertas(
    entrada({ pedidos: [pedido("p", "enviado", 200, { enviadoEn: hace(8 * 24), seguimiento: "RA1LT" })] }),
  );
  assert.equal(a!.tipo, "pedido_sin_entregar");
  assert.match(a!.cuerpo, /RA1LT/);
});

comprueba("enviado hace 7 h sin foto del recibo: se le recuerda a Alfredo", () => {
  const enviado = pedido("p", "enviado", 30, { enviadoEn: hace(7), seguimiento: "RA1LT" });
  const [a] = calcularAlertas(entrada({ pedidos: [enviado] }));
  assert.equal(a!.tipo, "pedido_sin_recibo");
  assert.deepEqual(a!.para, ["operacion"]);
  assert.equal(a!.gravedad, "normal");
});

comprueba("con recibo, o recien enviado, no se recuerda nada", () => {
  const enviado = pedido("p", "enviado", 30, { enviadoEn: hace(7) });
  assert.deepEqual(tipos(entrada({ pedidos: [enviado], recibos: ["p"] })), []);
  const recien = pedido("q", "enviado", 30, { enviadoEn: hace(2) });
  assert.deepEqual(tipos(entrada({ pedidos: [recien] })), []);
});

comprueba("una incidencia avisa a los dos", () => {
  const [a] = calcularAlertas(entrada({ pedidos: [pedido("p", "incidencia", 5)] }));
  assert.equal(a!.tipo, "pedido_incidencia");
  assert.deepEqual(a!.para, ["operacion", "dueno"]);
});

console.log("\nExistencias");

comprueba("sin conteo: UN aviso de contar, no catorce de agotado", () => {
  assert.deepEqual(tipos(entrada({ movimientos: [] })), ["existencias_sin_conteo"]);
});

comprueba("pocas cajas: aviso normal; agotado: urgente; vendido de mas: lo primero", () => {
  const movimientos: MovimientoExistencias[] = [
    { id: "b", colorId: "black", cantidad: 2, tipo: "entrada", usuarioId: "u", creadoEn: hace(100) },
    { id: "g", colorId: "gold", cantidad: 1, tipo: "entrada", usuarioId: "u", creadoEn: hace(100) },
  ];
  const alertas = calcularAlertas(
    entrada({
      movimientos,
      pedidos: [pedido("p", "pagado", 1, { lineas: [{ colorId: "gold", cantidad: 3, precioUnitario: 0 }] })],
    }),
  );
  assert.deepEqual(alertas.map((a) => a.tipo), ["existencias_faltan", "existencias_bajas"]);
  assert.equal(alertas[0]!.gravedad, "urgente");
  assert.equal(alertas[1]!.gravedad, "normal");
  assert.equal(alertas[1]!.titulo, "Black: quedan 2");
});

comprueba("despues de reponer, el aviso de pocas cajas es otro (vuelve a salir)", () => {
  const antes = calcularAlertas(
    entrada({
      movimientos: [
        { id: "r1", colorId: "black", cantidad: 2, tipo: "entrada", usuarioId: "u", creadoEn: hace(100) },
        lleno[1]!,
      ],
    }),
  )[0]!;
  const despues = calcularAlertas(
    entrada({
      movimientos: [
        { id: "r1", colorId: "black", cantidad: 2, tipo: "entrada", usuarioId: "u", creadoEn: hace(100) },
        { id: "r2", colorId: "black", cantidad: 1, tipo: "entrada", usuarioId: "u", creadoEn: hace(10) },
        lleno[1]!,
      ],
    }),
  )[0]!;
  assert.equal(antes.tipo, "existencias_bajas");
  assert.equal(despues.tipo, "existencias_bajas");
  assert.notEqual(antes.clave, despues.clave);
});

console.log("\nTiendas");

const tienda: Tienda = {
  id: "t",
  nombre: "Kontrabass Berlin",
  ivaValidado: true,
  direccion: { nombre: "K", linea1: "C", ciudad: "Berlin", codigoPostal: "", pais: "DE" },
  plazoPagoDias: 30,
  activa: true,
  creadaEn: hace(1000),
};

const pm = (extra: Partial<PedidoMayorista>): PedidoMayorista => ({
  id: "pm",
  numero: 501,
  tiendaId: "t",
  estado: "por_confirmar",
  cobro: "sin_facturar",
  envio: "sin_enviar",
  lineas: [{ colorId: "gold", cantidad: 4, precioUnitario: euros(120) }],
  envioCobrado: 0,
  regimenIva: "intracomunitario",
  tipoIva: 0,
  creadoEn: hace(30),
  ...extra,
});

comprueba("una tienda sin respuesta en 24 h avisa a los dos", () => {
  const [a] = calcularAlertas(entrada({ tiendas: [tienda], mayoristas: [pm({})] }));
  assert.equal(a!.tipo, "mayorista_sin_confirmar");
  assert.match(a!.titulo, /Kontrabass Berlin espera respuesta/);
});

comprueba("una factura pasada de plazo avisa, nombrando la mas vieja", () => {
  const [a] = calcularAlertas(
    entrada({
      tiendas: [tienda],
      mayoristas: [pm({ estado: "confirmado", cobro: "facturado", facturadoEn: hace(40 * 24), creadoEn: hace(45 * 24) })],
    }),
  );
  assert.equal(a!.tipo, "factura_vencida");
  assert.equal(a!.clave, "tienda:t:vencida:pm");
  assert.match(a!.titulo, /debe 480/);
});

console.log("\nA quien");

comprueba("Alfredo ve lo suyo y lo de los dos; Adrian no ve los recordatorios", () => {
  const alertas = calcularAlertas(
    entrada({ pedidos: [pedido("a", "pagado", 25), pedido("b", "pagado", 49)] }),
  );
  assert.equal(alertasPara(alertas, "operacion").length, 2);
  assert.deepEqual(alertasPara(alertas, "dueno").map((a) => a.tipo), ["pedido_escalado"]);
});

console.log("\nResumen diario");

comprueba("sin nada pendiente no hay resumen", () => {
  assert.equal(resumenDiario([], [], AHORA), undefined);
});

comprueba("con pendientes, dice cuantos y de cuando es el mas viejo", () => {
  const pedidos = [pedido("a", "pagado", 5), pedido("b", "pagado", 4 * 24)];
  const r = resumenDiario(pedidos, calcularAlertas(entrada({ pedidos })), AHORA)!;
  assert.match(r.cuerpo, /Tienes 2 pedidos sin enviar, el mas viejo de hace 4 dias/);
});

console.log("\nAjustes");

comprueba("lo guardado roto se ignora y se usa el de por defecto", () => {
  const a = completarAjustes({ horasRecordatorio: 0, umbralExistenciasBajas: "5", inventado: 3 });
  assert.equal(a.horasRecordatorio, AJUSTES_POR_DEFECTO.horasRecordatorio);
  assert.equal(a.umbralExistenciasBajas, 5);
});

comprueba("escalar antes que recordar se corrige solo", () => {
  const a = completarAjustes({ horasRecordatorio: 30, horasEscalada: 20 });
  assert.equal(a.horasEscalada, 31);
});

comprueba("un valor fuera de limites se rechaza diciendo por que", () => {
  const v = validarAjuste("horaResumen", "25");
  assert.equal(v.ok, false);
  assert.match((v as { motivo: string }).motivo, /de 0 a 23/);
});

console.log("\nLa hora de Vilnius");

comprueba("en invierno es UTC+2 y en verano UTC+3", () => {
  assert.equal(horaEnVilnius(Date.UTC(2026, 0, 15, 7, 0)), 9);
  assert.equal(horaEnVilnius(Date.UTC(2026, 6, 15, 7, 0)), 10);
});

comprueba("el dia cambia a medianoche de Vilnius, no de Londres", () => {
  assert.equal(fechaEnVilnius(Date.UTC(2026, 10, 16, 22, 30)), "2026-11-17");
  assert.equal(fechaEnVilnius(Date.UTC(2026, 10, 16, 21, 30)), "2026-11-16");
});

console.log(`\n${hechas} comprobaciones de alertas, todas en verde.\n`);
