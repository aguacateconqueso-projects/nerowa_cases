/*
  Los calculos de dinero del negocio, aislados de las pantallas.

  Las cifras de entrada y su origen estan en `docs/economia-nerowa.md`. Aqui
  esta la aritmetica, que es lo unico que se comprueba con una prueba.
*/

import {
  type Centimos,
  aplicarIva,
  conIva,
  euros,
  IVA_LITUANIA,
  sinIva,
} from "./dinero";
import type { Lote, Pedido } from "./tipos";

/* --------------------------------------------------------------------------
   Precios de hoy. Datos de Adrian, sesion 10.
   -------------------------------------------------------------------------- */

/** Precio al publico SIN IVA. Con el 21% lituano son 217,80 EUR. */
export const PRECIO_PUBLICO: Centimos = euros(180);

/**
 * Los tramos mayoristas. Envio siempre aparte.
 * Ordenados de mas unidades a menos: el primero que encaje, gana.
 */
export const TRAMOS_MAYORISTA: readonly { desde: number; precio: Centimos }[] = [
  { desde: 16, precio: euros(100) },
  { desde: 6, precio: euros(110) },
  { desde: 1, precio: euros(120) },
] as const;

export function precioMayorista(unidades: number): Centimos {
  const tramo = TRAMOS_MAYORISTA.find((t) => unidades >= t.desde);
  return tramo ? tramo.precio : TRAMOS_MAYORISTA[TRAMOS_MAYORISTA.length - 1].precio;
}

/* --------------------------------------------------------------------------
   Coste real por unidad, lote a lote
   -------------------------------------------------------------------------- */

export interface CosteLote {
  /** Lo que se desembolso en total por el lote. */
  desembolso: Centimos;
  /** Lo que de verdad cuesta, descontando el IVA si se recupera. */
  costeReal: Centimos;
  /** El numero que usa el grafico de ganancia. */
  costeUnitario: Centimos;
  /** Si hay conceptos sin desglosar y el numero puede mejorar. */
  incompleto: boolean;
}

export function costeDeLote(lote: Lote): CosteLote {
  const extras = lote.flete + lote.aranceles + lote.ivaImportacion + lote.despacho;
  const desembolso = lote.facturaFabrica + extras;

  /*
    El IVA de importacion se recupera si la empresa esta registrada: es dinero
    adelantado, no gastado. Mientras no se confirme, cuenta como coste — mejor
    que el margen salga corto y luego mejore, a que prometa lo que no esta.
  */
  const costeReal = lote.ivaRecuperable ? desembolso - lote.ivaImportacion : desembolso;

  return {
    desembolso,
    costeReal,
    costeUnitario: lote.unidades > 0 ? Math.round(costeReal / lote.unidades) : 0,
    /* Un lote con la factura puesta pero sin nada de traerlo esta a medias. */
    incompleto: extras === 0 && lote.facturaFabrica > 0,
  };
}

/* --------------------------------------------------------------------------
   Margen de un pedido
   -------------------------------------------------------------------------- */

export interface MargenPedido {
  /** Lo que entro del cliente, con IVA. */
  cobrado: Centimos;
  /** El IVA, que no es nuestro. */
  iva: Centimos;
  /** Cobrado menos IVA. */
  ingresoNeto: Centimos;
  costeProducto: Centimos;
  costeEnvio: Centimos;
  comision: Centimos;
  /** Lo que queda. */
  margen: Centimos;
  /** Si algun coste es una estimacion y no un dato real. */
  estimado: boolean;
}

/**
 * Comision de Stripe estimada, para pedidos que todavia no tienen la real.
 * Tarifa habitual de tarjeta europea; la cuenta de Stripe manda cuando exista.
 * Se cobra sobre el total CON IVA, porque Stripe no sabe que parte es impuesto.
 */
function comisionEstimada(totalConIva: Centimos): Centimos {
  return Math.round(totalConIva * 0.015) + 25;
}

export function margenDePedido(
  pedido: Pedido,
  costeUnitarioPorLote: Map<string, Centimos>,
  costeUnitarioPorDefecto: Centimos,
): MargenPedido {
  const baseProducto = pedido.lineas.reduce(
    (suma, l) => suma + l.precioUnitario * l.cantidad,
    0,
  );
  const base = baseProducto + pedido.envioCobrado;
  const iva = aplicarIva(base, pedido.tipoIva);

  /* Si Stripe ya dijo lo que cobro, manda Stripe. Si no, se calcula. */
  const cobrado = pedido.stripeTotalCobrado ?? base + iva;
  const ingresoNeto = pedido.stripeTotalCobrado
    ? sinIva(pedido.stripeTotalCobrado, pedido.tipoIva)
    : base;

  const costeProducto = pedido.lineas.reduce((suma, l) => {
    const unitario =
      (l.loteId ? costeUnitarioPorLote.get(l.loteId) : undefined) ??
      costeUnitarioPorDefecto;
    return suma + unitario * l.cantidad;
  }, 0);

  const comisionReal = pedido.stripeComision;
  const comision =
    comisionReal ?? (pedido.origen === "mayorista" ? 0 : comisionEstimada(cobrado));

  /* Sin comprobante del correo todavia: el envio se supone cobrado a coste. */
  const costeEnvio = pedido.envioCoste ?? pedido.envioCobrado;

  return {
    cobrado,
    iva: cobrado - ingresoNeto,
    ingresoNeto,
    costeProducto,
    costeEnvio,
    comision,
    margen: ingresoNeto - costeProducto - costeEnvio - comision,
    estimado: comisionReal === undefined || pedido.envioCoste === undefined,
  };
}

/* --------------------------------------------------------------------------
   Recuperacion del lote
   -------------------------------------------------------------------------- */

/**
 * Cuantas unidades hay que vender para pagar el lote.
 * Es la cifra que decide cuando pedir el siguiente.
 */
export function unidadesParaRecuperar(
  lote: Lote,
  margenPorUnidad: Centimos,
): number | undefined {
  if (margenPorUnidad <= 0) return undefined;
  return Math.ceil(costeDeLote(lote).costeReal / margenPorUnidad);
}

/** El precio que se le ensena al cliente: con el IVA dentro. */
export function precioEscaparate(
  base: Centimos = PRECIO_PUBLICO,
  tipo = IVA_LITUANIA,
): Centimos {
  return conIva(base, tipo);
}
