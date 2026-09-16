/*
  Los tipos del panel. Esto es el contrato: las pantallas y los adaptadores de
  almacenamiento hablan de esto y no de tablas concretas.

  Regla que sostiene todo lo demas: aqui NO se importa nada de Next, de React ni
  de ningun proveedor. Si algun dia la base de datos cambia de Postgres a otra
  cosa, este archivo no se toca.
*/

import type { Centimos, PuntosBase } from "./dinero";

export type Id = string;
/** Marca de tiempo ISO 8601 en UTC. Se formatea al mostrar, nunca al guardar. */
export type Instante = string;

/* --------------------------------------------------------------------------
   Quien usa el panel
   -------------------------------------------------------------------------- */

/**
 * Los dos trabajos del panel, que no son el mismo.
 * Ver `docs/panel-nerowa.md` §5.
 */
export type Rol = "operacion" | "dueno";

export interface Usuario {
  id: Id;
  nombre: string;
  correo: string;
  rol: Rol;
  /** Para avisarle por Telegram. Vacio hasta que el bot lo conozca. */
  telegramChatId?: string;
  creadoEn: Instante;
}

/* --------------------------------------------------------------------------
   Producto y existencias
   -------------------------------------------------------------------------- */

export interface Color {
  id: Id;
  /** Nombre comercial, en ingles: es lo que ve el cliente. */
  nombre: string;
  hex: string;
  /** Un color agotado o retirado no se puede comprar, pero sus pedidos siguen. */
  activo: boolean;
}

/**
 * Un lote de importacion. De aqui sale el costo real por unidad.
 *
 * Existe porque el costo NO es un numero fijo: el lote actual salio a 24 EUR de
 * fabrica y 34 EUR puesto en Vilnius, y el flete y la aduana cambian en cada
 * pedido. Con un numero unico, el dia que llegue un lote mas caro se ensucia
 * hacia atras todo lo ya vendido. Ver `docs/economia-nerowa.md` §2.
 */
export interface Lote {
  id: Id;
  referencia: string;
  llegadaEn: Instante;
  unidades: number;
  facturaFabrica: Centimos;
  /*
    Los cuatro conceptos de traer el lote, por separado y no en un saco, porque
    el IVA de importacion se recupera si la empresa esta registrada y los otros
    tres no. Mientras no haya desglose van a cero y el costo sale conservador.
  */
  flete: Centimos;
  aranceles: Centimos;
  ivaImportacion: Centimos;
  despacho: Centimos;
  /** Si el IVA de importacion se pudo recuperar. Lo confirma el asesor. */
  ivaRecuperable: boolean;
  notas?: string;
}

/* --------------------------------------------------------------------------
   Pedidos
   -------------------------------------------------------------------------- */

/** De donde vino la venta. Ver `docs/panel-nerowa.md` §12, fase 7.1. */
export type OrigenPedido = "web" | "manual" | "mayorista";

/**
 * Los estados por los que pasa un pedido.
 *
 * Deliberadamente NO existe "preparando": anadia un toque que no le dice nada
 * al cliente y que Alfredo ya sabe. Ver `docs/panel-nerowa.md` §6.2.
 */
export type EstadoPedido =
  | "pagado"
  | "enviado"
  | "entregado"
  | "archivado"
  | "cancelado"
  | "incidencia";

export interface LineaPedido {
  colorId: Id;
  cantidad: number;
  /** Precio unitario SIN IVA, congelado en el momento de la venta. */
  precioUnitario: Centimos;
  /** Lote del que salieron estas unidades, para saber que costaron de verdad. */
  loteId?: Id;
}

export interface Direccion {
  nombre: string;
  linea1: string;
  linea2?: string;
  ciudad: string;
  codigoPostal: string;
  /** Codigo de pais ISO 3166-1 alfa-2, en mayusculas: "LT", "DE". */
  pais: string;
  telefono?: string;
}

export interface Pedido {
  id: Id;
  /** El numero que se dice en voz alta: #1043. */
  numero: number;
  origen: OrigenPedido;
  estado: EstadoPedido;

  clienteNombre: string;
  clienteCorreo: string;
  direccion: Direccion;

  lineas: LineaPedido[];
  /** Lo que se le cobro al cliente por el envio, sin IVA. */
  envioCobrado: Centimos;
  tipoIva: PuntosBase;

  /** Lo que Stripe cobro y se quedo de verdad. Se lee de Stripe, no se estima. */
  stripeTotalCobrado?: Centimos;
  stripeComision?: Centimos;
  stripePaymentIntentId?: string;

  /** Lo que costo mandarlo. Se pregunta al marcar enviado. */
  envioCoste?: Centimos;
  seguimiento?: string;

  pagadoEn: Instante;
  enviadoEn?: Instante;
  entregadoEn?: Instante;
  archivadoEn?: Instante;

  /** Si es de una tienda mayorista. */
  tiendaId?: Id;
  notaInterna?: string;
}

/* --------------------------------------------------------------------------
   Registro de lo que pasa
   -------------------------------------------------------------------------- */

/**
 * Cada cambio de estado deja rastro: que, quien, cuando.
 *
 * Cuesta casi nada construirlo ahora y es imposible reconstruirlo despues.
 * Con dos personas y dinero de por medio, "quien marco esto enviado y a que
 * hora" tiene que tener respuesta. Ver `docs/panel-nerowa.md` §5.
 */
export interface Apunte {
  id: Id;
  /** Sobre que cosa: "pedido", "devolucion", "lote", "tienda". */
  entidad: string;
  entidadId: Id;
  accion: string;
  usuarioId: Id;
  /** Texto corto y legible por una persona, no un volcado de datos. */
  detalle: string;
  creadoEn: Instante;
}

/* --------------------------------------------------------------------------
   Tiendas mayoristas
   -------------------------------------------------------------------------- */

/**
 * Como se le cobra el IVA a una tienda. Lo decide su pais y su numero de IVA.
 *
 * No es un matiz contable: **cambia el total de la factura**. Un pedido de 16
 * estuches son 1.600 EUR, y el IVA lituano sobre eso son 336 EUR de diferencia
 * entre facturar a una tienda de Vilnius y a una de Berlin con numero valido.
 * Ver `docs/economia-nerowa.md` §4.3.
 *
 * El panel lo calcula y lo deja por escrito en cada pedido, pero **el
 * procedimiento hay que confirmarlo con el asesor** antes de emitir la primera
 * factura. Aqui solo se guarda que caso se aplico y por que.
 */
export type RegimenIva =
  /** Tienda del mismo pais. Se le cobra el IVA. */
  | "nacional"
  /** Otro pais de la UE con numero de IVA validado. Normalmente sin IVA. */
  | "intracomunitario"
  /** Otro pais de la UE sin numero valido. Se le cobra el IVA. */
  | "sin_numero_valido"
  /** Fuera de la UE. Exportacion. */
  | "exportacion";

export interface Tienda {
  id: Id;
  /** El nombre con el que se la conoce. "Musik Schmidt". */
  nombre: string;
  /** El nombre legal, que va en la factura. Puede faltar al darla de alta. */
  razonSocial?: string;
  /** Numero de IVA intracomunitario. Sin el, se le cobra IVA. */
  numeroIva?: string;
  /** Si alguien comprobo ese numero. Sin comprobar, no se asume valido. */
  ivaValidado: boolean;
  direccion: Direccion;

  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;

  /**
   * Precio por unidad propio de esta tienda, si se le acordo uno.
   * Sin esto, se usan los tramos por volumen de `economia.ts`.
   */
  precioPersonalizado?: Centimos;
  /** Dias que se le dan para pagar desde que se factura. */
  plazoPagoDias: number;

  notas?: string;
  activa: boolean;
  creadaEn: Instante;
}

/**
 * Por donde va un pedido mayorista.
 *
 * Son TRES cosas a la vez y no una, que es la diferencia con un pedido de la
 * web: se confirma, se cobra y se envia. **El cobro y el envio van por
 * separado porque en mayorista casi nunca pasan a la vez** — se envia y se
 * cobra a treinta dias, o se cobra por adelantado y se envia cuando hay stock.
 *
 * Un solo estado lineal obligaria a elegir un orden que no siempre se cumple, y
 * a mentir el resto de las veces.
 */
export type EstadoMayorista = "por_confirmar" | "confirmado" | "cancelado";
export type EstadoCobro = "sin_facturar" | "facturado" | "pagado";
export type EstadoEnvio = "sin_enviar" | "enviado" | "entregado";

export interface PedidoMayorista {
  id: Id;
  numero: number;
  tiendaId: Id;

  estado: EstadoMayorista;
  cobro: EstadoCobro;
  envio: EstadoEnvio;

  lineas: LineaPedido[];
  /** Envio, siempre aparte del precio del estuche. */
  envioCobrado: Centimos;
  envioCoste?: Centimos;

  /** Que caso de IVA se aplico, congelado al confirmar el pedido. */
  regimenIva: RegimenIva;
  tipoIva: PuntosBase;

  creadoEn: Instante;
  confirmadoEn?: Instante;
  facturadoEn?: Instante;
  pagadoEn?: Instante;
  enviadoEn?: Instante;
  entregadoEn?: Instante;

  /** El numero de la factura, cuando se emita. */
  referenciaFactura?: string;
  seguimiento?: string;
  notas?: string;
}
