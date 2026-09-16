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
  /** El principal: al que se le mandan los enlaces de entrada. */
  correo: string;
  /**
   * Otras direcciones con las que tambien puede entrar.
   *
   * Existe porque la gente tiene correo de trabajo y correo personal, y no se
   * acuerda de cual uso para entrar la vez anterior. Cualquiera de los suyos
   * vale; el enlace siempre sale al principal.
   */
  correosAlternos?: string[];
  rol: Rol;
  /** Para avisarle por Telegram. Vacio hasta que el bot lo conozca. */
  telegramChatId?: string;
  creadoEn: Instante;
}

export interface Sesion {
  id: Id;
  usuarioId: Id;
  creadaEn: Instante;
  expiraEn: Instante;
}

/** Enlace de un solo uso que sustituye a la contrasena. */
export interface EnlaceEntrada {
  id: Id;
  correo: string;
  /** Hash del testigo, nunca el testigo en claro. */
  testigoHash: string;
  expiraEn: Instante;
  usadoEn?: Instante;
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
