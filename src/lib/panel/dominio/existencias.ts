/*
  Cuantos estuches hay, de que color, y cuantos de esos ya estan vendidos.

  LA DECISION QUE SOSTIENE TODO ESTE ARCHIVO: LAS VENTAS NO SE APUNTAN DOS VECES

  Lo obvio era un contador por color que baja cada vez que entra un pedido. Se
  descarta, y no por gusto: un contador es una SEGUNDA copia de algo que ya
  esta escrito en los pedidos. Basta con que una accion guarde el pedido y
  falle justo antes de bajar el contador —o que se cancele un pedido y nadie se
  acuerde de subirlo— para que el numero mienta para siempre, sin que nada
  avise.

  Asi que las existencias NO se guardan: se CALCULAN cada vez.

      en el estante = lo que entro (lotes, conteos, mermas)
                    - lo que ya salio por la puerta (pedidos enviados)

      comprometidas = vendidas y todavia en el estante (pedidos sin enviar)

      disponibles   = en el estante - comprometidas

  Lo unico que se apunta a mano es lo que ningun pedido explica: que llego un
  lote, que una caja se rompio, que Alfredo conto y habia uno menos. Eso son
  los `MovimientoExistencias`. Cancelar un pedido devuelve sus unidades sin
  hacer nada, porque un pedido cancelado deja de contar.

  POR QUE "EN EL ESTANTE" Y "DISPONIBLES" SON DOS NUMEROS

  Porque contestan dos preguntas distintas y las dos se hacen:

  - Alfredo, delante de las cajas: "¿cuantos negros deberia haber aqui?" —
    en el estante. Es el numero con el que se comprueba un conteo.
  - Cualquiera, antes de vender: "¿puedo vender otro negro?" — disponibles.

  Con un solo numero, uno de los dos sale mal: o el conteo nunca cuadra porque
  descuenta cajas que siguen ahi, o se venden cajas que ya tienen dueno.

  Igual que el resto del dominio: funciones puras, sin Next ni proveedores, y
  comprobadas en `__pruebas__/existencias.prueba.ts`.
*/

import type {
  Color,
  EstadoPedido,
  Id,
  LineaPedido,
  MovimientoExistencias,
  Pedido,
  PedidoMayorista,
} from "./tipos";

/* --------------------------------------------------------------------------
   Que estados mueven cajas
   -------------------------------------------------------------------------- */

/**
 * Los estados de un pedido de la web en los que la caja YA salio del estante.
 *
 * `incidencia` cuenta como salida: solo se llega ahi desde `enviado`, asi que
 * la caja esta en manos del correo, perdida o rota, pero no en el estante. Si
 * vuelve, entra con un movimiento.
 */
const WEB_YA_SALIO: readonly EstadoPedido[] = [
  "enviado",
  "entregado",
  "archivado",
  "incidencia",
];

/** Vendido y todavia en el estante. */
const WEB_COMPROMETIDO: readonly EstadoPedido[] = ["pagado"];

/** Suma las unidades de unas lineas por color. */
export function unidadesPorColor(
  lineas: readonly LineaPedido[],
  destino = new Map<Id, number>(),
): Map<Id, number> {
  for (const l of lineas) {
    destino.set(l.colorId, (destino.get(l.colorId) ?? 0) + l.cantidad);
  }
  return destino;
}

/* --------------------------------------------------------------------------
   El calculo
   -------------------------------------------------------------------------- */

export type NivelExistencias = "agotado" | "bajo" | "bien";

export interface ExistenciasColor {
  color: Color;
  /** Las cajas que deberia haber fisicamente, contando las ya vendidas. */
  enEstante: number;
  /** Vendidas y sin enviar: estan en el estante pero ya tienen dueno. */
  comprometidas: number;
  /** Pedidos de tiendas que nadie confirmo todavia. No se descuentan. */
  porConfirmar: number;
  /** Lo que se puede vender hoy. Puede ser negativo: se vendio de mas. */
  disponibles: number;
  /** Cuantas cajas faltan para servir lo ya vendido. Cero si llega. */
  faltan: number;
  nivel: NivelExistencias;
  /**
   * El ultimo movimiento que SUMO cajas. Sirve para que el aviso de "quedan
   * pocas" vuelva a salir despues de reponer, y no una sola vez en la vida.
   */
  ultimaReposicionId?: Id;
}

export interface EntradaExistencias {
  colores: readonly Color[];
  movimientos: readonly MovimientoExistencias[];
  pedidos: readonly Pedido[];
  mayoristas: readonly PedidoMayorista[];
  /** Con estas o menos disponibles, el color esta "bajo". */
  umbralBajo: number;
}

export function calcularExistencias(e: EntradaExistencias): ExistenciasColor[] {
  const movido = new Map<Id, number>();
  const ultimaReposicion = new Map<Id, { id: Id; en: string }>();
  for (const m of e.movimientos) {
    movido.set(m.colorId, (movido.get(m.colorId) ?? 0) + m.cantidad);
    if (m.cantidad > 0) {
      const previa = ultimaReposicion.get(m.colorId);
      if (!previa || m.creadoEn > previa.en) {
        ultimaReposicion.set(m.colorId, { id: m.id, en: m.creadoEn });
      }
    }
  }

  const salido = new Map<Id, number>();
  const comprometido = new Map<Id, number>();
  const porConfirmar = new Map<Id, number>();

  for (const p of e.pedidos) {
    if (WEB_YA_SALIO.includes(p.estado)) unidadesPorColor(p.lineas, salido);
    else if (WEB_COMPROMETIDO.includes(p.estado)) unidadesPorColor(p.lineas, comprometido);
    /* `cancelado` no cuenta: sus cajas vuelven a estar libres sin hacer nada. */
  }

  for (const p of e.mayoristas) {
    if (p.estado === "cancelado") continue;
    /*
      El envio manda sobre la confirmacion: si la caja salio, salio, aunque el
      pedido siga "por confirmar" porque alguien se salto el paso.
    */
    if (p.envio !== "sin_enviar") unidadesPorColor(p.lineas, salido);
    else if (p.estado === "confirmado") unidadesPorColor(p.lineas, comprometido);
    else unidadesPorColor(p.lineas, porConfirmar);
  }

  const resultado: ExistenciasColor[] = [];
  for (const color of e.colores) {
    const enEstante = (movido.get(color.id) ?? 0) - (salido.get(color.id) ?? 0);
    const comprometidas = comprometido.get(color.id) ?? 0;
    const pendientes = porConfirmar.get(color.id) ?? 0;
    const disponibles = enEstante - comprometidas;

    /*
      Un color retirado sin nada dentro no es informacion, es ruido: se queda
      fuera. Si tiene algo —cajas, o pedidos colgando— se ensena igual, porque
      esas cajas existen aunque el color ya no se venda.
    */
    if (!color.activo && enEstante === 0 && comprometidas === 0 && pendientes === 0) {
      continue;
    }

    resultado.push({
      color,
      enEstante,
      comprometidas,
      porConfirmar: pendientes,
      disponibles,
      faltan: Math.max(0, -disponibles),
      nivel: disponibles <= 0 ? "agotado" : disponibles <= e.umbralBajo ? "bajo" : "bien",
      ultimaReposicionId: ultimaReposicion.get(color.id)?.id,
    });
  }
  return resultado;
}

/**
 * Si alguien conto el estante alguna vez.
 *
 * Sin ningun movimiento, todas las existencias salen a cero o en negativo, y
 * eso no es "agotado": es "no se sabe". El panel lo dice asi, y no dispara
 * catorce avisos de agotado el primer dia.
 */
export function hayConteo(movimientos: readonly MovimientoExistencias[]): boolean {
  return movimientos.length > 0;
}

export interface TotalesExistencias {
  enEstante: number;
  comprometidas: number;
  disponibles: number;
  agotados: number;
  bajos: number;
}

export function totalesDeExistencias(lista: readonly ExistenciasColor[]): TotalesExistencias {
  return lista.reduce<TotalesExistencias>(
    (t, e) => ({
      enEstante: t.enEstante + e.enEstante,
      comprometidas: t.comprometidas + e.comprometidas,
      disponibles: t.disponibles + Math.max(0, e.disponibles),
      agotados: t.agotados + (e.color.activo && e.nivel === "agotado" ? 1 : 0),
      bajos: t.bajos + (e.color.activo && e.nivel === "bajo" ? 1 : 0),
    }),
    { enEstante: 0, comprometidas: 0, disponibles: 0, agotados: 0, bajos: 0 },
  );
}

/* --------------------------------------------------------------------------
   Conteo
   -------------------------------------------------------------------------- */

export interface Diferencia {
  colorId: Id;
  /** Lo que el panel creia que habia en el estante. */
  esperado: number;
  /** Lo que Alfredo conto. */
  contado: number;
  /** Lo que hay que apuntar para que cuadre: contado - esperado. */
  ajuste: number;
}

/**
 * Lo que hay que apuntar despues de contar el estante.
 *
 * Se compara contra "en el estante", NO contra "disponibles": las cajas
 * vendidas y sin enviar siguen fisicamente ahi, y Alfredo las cuenta. Comparar
 * contra disponibles haria que cada conteo "perdiera" las cajas por enviar.
 *
 * Los colores que no se contaron (campo vacio) no se tocan: no contar no es
 * contar cero.
 */
export function diferenciasDeConteo(
  existencias: readonly ExistenciasColor[],
  contados: ReadonlyMap<Id, number>,
): Diferencia[] {
  const diferencias: Diferencia[] = [];
  for (const e of existencias) {
    const contado = contados.get(e.color.id);
    if (contado === undefined) continue;
    const ajuste = contado - e.enEstante;
    if (ajuste !== 0) {
      diferencias.push({ colorId: e.color.id, esperado: e.enEstante, contado, ajuste });
    }
  }
  return diferencias;
}

/* --------------------------------------------------------------------------
   Antes de vender
   -------------------------------------------------------------------------- */

export interface Faltante {
  colorId: Id;
  piden: number;
  hay: number;
}

/**
 * Que colores de un pedido no se pueden servir con lo que hay.
 *
 * NO bloquea la venta: el panel avisa y la persona decide. Hay razones de
 * sobra para vender algo que el panel no ve —un conteo atrasado, un lote que
 * llega manana— y un panel que impide trabajar se deja de usar. Lo que no
 * puede pasar es venderlo SIN enterarse.
 */
export function faltantesPara(
  existencias: readonly ExistenciasColor[],
  lineas: readonly LineaPedido[],
): Faltante[] {
  const disponibles = new Map(existencias.map((e) => [e.color.id, e.disponibles]));
  const piden = unidadesPorColor(lineas);
  const faltan: Faltante[] = [];
  for (const [colorId, cantidad] of piden) {
    const hay = Math.max(0, disponibles.get(colorId) ?? 0);
    if (cantidad > hay) faltan.push({ colorId, piden: cantidad, hay });
  }
  return faltan;
}

export const NOMBRE_MOVIMIENTO: Record<MovimientoExistencias["tipo"], string> = {
  entrada: "Entrada",
  ajuste: "Conteo",
  merma: "Merma",
};
