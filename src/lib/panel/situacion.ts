import "server-only";

/*
  Como esta el negocio ahora mismo: pedidos, existencias y alertas, leidos de
  una vez.

  Lo usan tres sitios —la pantalla de pedidos (para la franja de avisos), la de
  existencias y el vigia que manda los mensajes— y TIENEN que ver lo mismo. Si
  cada uno lo calculara a su manera, el telefono podria vibrar por algo que la
  pantalla no ensena. Por eso sale de aqui y de ningun otro sitio.
*/

import { completarAjustes, type AjustesPanel } from "./dominio/ajustes";
import { calcularAlertas, type Alerta } from "./dominio/alertas";
import {
  calcularExistencias,
  hayConteo,
  type ExistenciasColor,
} from "./dominio/existencias";
import type {
  Color,
  MovimientoExistencias,
  Pedido,
  PedidoMayorista,
  Tienda,
} from "./dominio/tipos";
import { servicios } from "./servicios";

export interface Situacion {
  ahora: number;
  ajustes: AjustesPanel;
  colores: Color[];
  pedidos: Pedido[];
  mayoristas: PedidoMayorista[];
  tiendas: Tienda[];
  movimientos: MovimientoExistencias[];
  existencias: ExistenciasColor[];
  conConteo: boolean;
  alertas: Alerta[];
}

export async function leerSituacion(ahora: number): Promise<Situacion> {
  const { almacen } = servicios();
  const [colores, pedidos, mayoristas, tiendas, movimientos, guardados, comprobantes] =
    await Promise.all([
      almacen.listarColores(),
      almacen.listarPedidos(),
      almacen.listarPedidosMayoristas(),
      almacen.listarTiendas(),
      almacen.listarMovimientos(),
      almacen.leerAjustes(),
      almacen.listarComprobantes(),
    ]);

  const ajustes = completarAjustes(guardados);
  const existencias = calcularExistencias({
    colores,
    movimientos,
    pedidos,
    mayoristas,
    umbralBajo: ajustes.umbralExistenciasBajas,
  });
  const conConteo = hayConteo(movimientos);
  const alertas = calcularAlertas({
    pedidos,
    mayoristas,
    tiendas,
    colores,
    existencias,
    conConteo,
    conRecibo: new Set(
      comprobantes.filter((c) => c.clase === "recibo-envio").map((c) => c.entidadId),
    ),
    ajustes,
    ahora,
  });

  return {
    ahora,
    ajustes,
    colores,
    pedidos,
    mayoristas,
    tiendas,
    movimientos,
    existencias,
    conConteo,
    alertas,
  };
}

/** Solo las existencias, para formularios que no necesitan las alertas. */
export async function leerExistencias(): Promise<{
  existencias: ExistenciasColor[];
  conConteo: boolean;
  colores: Color[];
}> {
  const s = await leerSituacion(Date.now());
  return { existencias: s.existencias, conConteo: s.conConteo, colores: s.colores };
}
