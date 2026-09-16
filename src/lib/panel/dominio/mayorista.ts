/*
  Las reglas de los pedidos a tiendas: que IVA toca, que precio toca, que se
  puede hacer con un pedido y quien debe cuanto desde cuando.

  Igual que el resto del dominio, esto no importa nada de Next ni de React ni de
  ningun proveedor: son funciones puras y se comprueban con una prueba.
*/

import {
  aplicarIva,
  type Centimos,
  IVA_LITUANIA,
  type PuntosBase,
} from "./dinero";
import { precioMayorista } from "./economia";
import type {
  EstadoCobro,
  EstadoEnvio,
  EstadoMayorista,
  PedidoMayorista,
  RegimenIva,
  Rol,
  Tienda,
} from "./tipos";

/** Desde donde sale la mercancia. Decide que es "nacional". */
export const PAIS_ORIGEN = "LT";

/**
 * Los paises de la Union Europea, para saber si un pedido es intracomunitario.
 * Lituania incluida; el codigo de Grecia en la nomenclatura del IVA es EL, pero
 * el ISO del pais es GR, asi que van los dos.
 */
const PAISES_UE = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR",
  "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT",
  "RO", "SE", "SI", "SK",
]);

/* --------------------------------------------------------------------------
   IVA
   -------------------------------------------------------------------------- */

/**
 * Que caso de IVA le toca a una tienda.
 *
 * **Esto hay que confirmarlo con el asesor antes de emitir la primera
 * factura.** El panel lo calcula y lo deja por escrito en cada pedido para que
 * quede constancia de que se aplico y por que, no para sustituir a nadie.
 */
export function regimenDe(tienda: Tienda): RegimenIva {
  const pais = tienda.direccion.pais.toUpperCase();
  if (pais === PAIS_ORIGEN) return "nacional";
  if (!PAISES_UE.has(pais)) return "exportacion";
  /* Un numero sin comprobar no cuenta como valido: se cobra el IVA. */
  return tienda.numeroIva && tienda.ivaValidado
    ? "intracomunitario"
    : "sin_numero_valido";
}

/** El tipo de IVA que se aplica segun el caso. En puntos base. */
export function tipoIvaDe(regimen: RegimenIva): PuntosBase {
  switch (regimen) {
    case "nacional":
    case "sin_numero_valido":
      return IVA_LITUANIA;
    case "intracomunitario":
    case "exportacion":
      /* Lo declara el comprador, o sale de la Union. */
      return 0;
  }
}

export const EXPLICACION_REGIMEN: Record<RegimenIva, string> = {
  nacional: "Tienda lituana: se le cobra el IVA.",
  intracomunitario:
    "Otro pais de la UE con numero de IVA validado: la factura va sin IVA y lo declara el comprador.",
  sin_numero_valido:
    "Otro pais de la UE sin numero de IVA validado: se le cobra el IVA. Si consigue el numero, cambia.",
  exportacion: "Fuera de la Union Europea: exportacion, sin IVA.",
};

/* --------------------------------------------------------------------------
   Precio
   -------------------------------------------------------------------------- */

/**
 * Lo que paga esta tienda por unidad.
 *
 * Su precio acordado si tiene uno; si no, el tramo por volumen que le toque por
 * el total de unidades del pedido. Los tramos estan en `economia.ts` y salen de
 * `docs/economia-nerowa.md` §4.1.
 */
export function precioParaTienda(tienda: Tienda, unidades: number): Centimos {
  return tienda.precioPersonalizado ?? precioMayorista(unidades);
}

export interface TotalesPedido {
  unidades: number;
  producto: Centimos;
  envio: Centimos;
  /** Producto mas envio, sin impuestos. */
  base: Centimos;
  iva: Centimos;
  /** Lo que dice la factura. */
  total: Centimos;
}

export function totalesDe(pedido: PedidoMayorista): TotalesPedido {
  const unidades = pedido.lineas.reduce((n, l) => n + l.cantidad, 0);
  const producto = pedido.lineas.reduce(
    (s, l) => s + l.precioUnitario * l.cantidad,
    0,
  );
  const base = producto + pedido.envioCobrado;
  const iva = aplicarIva(base, pedido.tipoIva);
  return { unidades, producto, envio: pedido.envioCobrado, base, iva, total: base + iva };
}

/* --------------------------------------------------------------------------
   Que se puede hacer con un pedido
   -------------------------------------------------------------------------- */

export interface AccionMayorista {
  /** Cual de las tres pistas mueve. */
  pista: "estado" | "cobro" | "envio";
  hacia: EstadoMayorista | EstadoCobro | EstadoEnvio;
  etiqueta: string;
  /** Vacio: cualquiera de los dos. */
  soloRol?: Rol;
  /** Si hace falta escribir algo. */
  requiere?: "seguimiento" | "factura";
  /**
   * Si deshace algo en vez de avanzar.
   *
   * Las destructivas se dibujan aparte y con menos peso, y piden confirmacion.
   * Se vio mirando: "Cancelar el pedido" salia en dorado y del mismo tamano que
   * "Confirmar el pedido", pegado justo debajo. Un toque mal dado en un telefono
   * cancelaba un pedido de dos mil euros.
   */
  destructiva?: boolean;
}

/**
 * Lo que se puede hacer ahora mismo con este pedido.
 *
 * Las tres pistas avanzan por su cuenta, con una sola atadura: **nada se cobra
 * ni se envia antes de confirmar el pedido**. Un pedido "por confirmar" es lo
 * que la tienda pidio, no lo que se acordo.
 */
export function accionesDe(pedido: PedidoMayorista, rol: Rol): AccionMayorista[] {
  if (pedido.estado === "cancelado") return [];

  const acciones: AccionMayorista[] = [];

  if (pedido.estado === "por_confirmar") {
    acciones.push(
      { pista: "estado", hacia: "confirmado", etiqueta: "Confirmar el pedido" },
      {
        pista: "estado",
        hacia: "cancelado",
        etiqueta: "Cancelar el pedido",
        soloRol: "dueno",
        destructiva: true,
      },
    );
    /*
      Sale por el mismo filtro de rol del final. Devolverlas aqui directamente
      dejaba que el rol operacion cancelara un pedido, que es dinero y es del
      dueno. Lo encontro la prueba, no la lectura.
    */
    return acciones.filter((a) => !a.soloRol || a.soloRol === rol);
  }

  if (pedido.cobro === "sin_facturar") {
    acciones.push({
      pista: "cobro",
      hacia: "facturado",
      etiqueta: "Marcar facturado",
      requiere: "factura",
    });
  } else if (pedido.cobro === "facturado") {
    /* Dar por cobrado es dinero: lo confirma el dueno, igual que el reembolso. */
    acciones.push({
      pista: "cobro",
      hacia: "pagado",
      etiqueta: "Marcar pagado",
      soloRol: "dueno",
    });
  }

  if (pedido.envio === "sin_enviar") {
    acciones.push({
      pista: "envio",
      hacia: "enviado",
      etiqueta: "Marcar enviado",
      requiere: "seguimiento",
    });
  } else if (pedido.envio === "enviado") {
    acciones.push({ pista: "envio", hacia: "entregado", etiqueta: "Marcar entregado" });
  }

  return acciones.filter((a) => !a.soloRol || a.soloRol === rol);
}

/** Un pedido esta cerrado cuando ya no queda nada que cobrar ni que mandar. */
export function estaCerrado(pedido: PedidoMayorista): boolean {
  return (
    pedido.estado === "cancelado" ||
    (pedido.estado === "confirmado" &&
      pedido.cobro === "pagado" &&
      pedido.envio === "entregado")
  );
}

/* --------------------------------------------------------------------------
   Lo que deben
   -------------------------------------------------------------------------- */

export interface Deuda {
  /** Lo facturado y no cobrado. */
  importe: Centimos;
  /** Dias desde la factura mas vieja sin pagar. */
  diasDelMasViejo: number;
  /** Si algun pedido paso del plazo acordado con esa tienda. */
  vencida: boolean;
  pedidos: number;
}

/**
 * Cuanto debe una tienda y desde cuando.
 *
 * Es el numero que se mira primero al abrir una ficha: una tienda que debe
 * 800 EUR desde hace 50 dias tiene que ser imposible de no ver.
 */
export function deudaDe(
  pedidos: readonly PedidoMayorista[],
  tienda: Tienda,
  ahora: number,
): Deuda {
  const sinPagar = pedidos.filter(
    (p) => p.estado === "confirmado" && p.cobro === "facturado" && p.facturadoEn,
  );

  const importe = sinPagar.reduce((s, p) => s + totalesDe(p).total, 0);
  const dias = sinPagar.map((p) =>
    Math.floor((ahora - new Date(p.facturadoEn!).getTime()) / 86_400_000),
  );
  const diasDelMasViejo = dias.length ? Math.max(...dias) : 0;

  return {
    importe,
    diasDelMasViejo,
    vencida: diasDelMasViejo > tienda.plazoPagoDias,
    pedidos: sinPagar.length,
  };
}

export const NOMBRE_COBRO: Record<EstadoCobro, string> = {
  sin_facturar: "Sin facturar",
  facturado: "Facturado, sin cobrar",
  pagado: "Cobrado",
};

export const NOMBRE_ENVIO: Record<EstadoEnvio, string> = {
  sin_enviar: "Sin enviar",
  enviado: "En camino",
  entregado: "Entregado",
};

export const NOMBRE_ESTADO_MAYORISTA: Record<EstadoMayorista, string> = {
  por_confirmar: "Por confirmar",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};
