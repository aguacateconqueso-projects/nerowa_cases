/*
  El puerto de almacenamiento: lo unico que las pantallas saben de los datos.

  ESTA ES LA PIEZA QUE PERMITE CAMBIAR DE BASE DE DATOS SIN TOCAR EL PANEL.
  Adrian lo pidio expresamente: "deja margen para cambiar bases a futuro
  conforme vayamos definiendo todo lo tecnico de la empresa".

  Ninguna pantalla, ningun formulario y ninguna accion importa un cliente de
  base de datos. Todos hablan con esta interfaz. Hoy detras hay un almacen en
  memoria con datos de ejemplo; manana habra Postgres, y lo unico que cambia es
  una variable de entorno y un archivo nuevo en `adaptadores/`.

  Lo que NO se cuela aqui, para que la promesa se sostenga:
  - Nada de SQL, ni nombres de tabla, ni tipos de ningun proveedor.
  - Nada de paginacion por cursor de un motor concreto.
  - Los metodos hablan del negocio ("pedidos pendientes"), no de consultas.
*/

import type {
  Apunte,
  Color,
  EstadoPedido,
  Id,
  Lote,
  Pedido,
  PedidoMayorista,
  Sesion,
  Tienda,
  Usuario,
} from "../dominio/tipos";

/** Lo que se puede cambiar de un pedido. El resto es historia y no se toca. */
export type CambioPedido = Partial<
  Pick<
    Pedido,
    | "estado"
    | "seguimiento"
    | "envioCoste"
    | "entregadoEn"
    | "enviadoEn"
    | "archivadoEn"
    | "notaInterna"
    | "stripeTotalCobrado"
    | "stripeComision"
  >
>;

/** Lo que se puede cambiar de una tienda. El id y el alta no se tocan. */
export type CambioTienda = Partial<Omit<Tienda, "id" | "creadaEn">>;

/** Lo que se puede cambiar de un pedido mayorista. Las lineas no se editan. */
export type CambioPedidoMayorista = Partial<
  Omit<PedidoMayorista, "id" | "numero" | "tiendaId" | "lineas" | "creadoEn">
>;

export interface FiltroPedidos {
  estados?: readonly EstadoPedido[];
  limite?: number;
}

export interface Almacen {
  /** Nombre del adaptador, para poder decirlo en pantalla y en los registros. */
  readonly nombre: string;

  /* --- Quien entra --- */
  usuarioPorCorreo(correo: string): Promise<Usuario | undefined>;
  usuarioPorId(id: Id): Promise<Usuario | undefined>;
  listarUsuarios(): Promise<Usuario[]>;

  crearSesion(sesion: Sesion): Promise<void>;
  sesionPorId(id: Id): Promise<Sesion | undefined>;
  borrarSesion(id: Id): Promise<void>;

  /* --- Producto --- */
  listarColores(): Promise<Color[]>;
  listarLotes(): Promise<Lote[]>;
  lotePorId(id: Id): Promise<Lote | undefined>;

  /* --- Pedidos --- */
  listarPedidos(filtro?: FiltroPedidos): Promise<Pedido[]>;
  pedidoPorId(id: Id): Promise<Pedido | undefined>;
  crearPedido(pedido: Pedido): Promise<Pedido>;
  /**
   * Cambia un pedido. Devuelve el resultado, o `undefined` si no existe.
   * La comprobacion de que la transicion es legal NO va aqui: va en el dominio,
   * porque tiene que valer igual sea cual sea el almacen de debajo.
   */
  actualizarPedido(id: Id, cambio: CambioPedido): Promise<Pedido | undefined>;
  /** El siguiente numero visible de pedido. Empieza en 1001. */
  siguienteNumeroPedido(): Promise<number>;

  /* --- Tiendas mayoristas --- */
  listarTiendas(): Promise<Tienda[]>;
  tiendaPorId(id: Id): Promise<Tienda | undefined>;
  crearTienda(tienda: Tienda): Promise<Tienda>;
  actualizarTienda(id: Id, cambio: CambioTienda): Promise<Tienda | undefined>;

  /** Todos los pedidos mayoristas, o solo los de una tienda. */
  listarPedidosMayoristas(tiendaId?: Id): Promise<PedidoMayorista[]>;
  pedidoMayoristaPorId(id: Id): Promise<PedidoMayorista | undefined>;
  crearPedidoMayorista(pedido: PedidoMayorista): Promise<PedidoMayorista>;
  actualizarPedidoMayorista(
    id: Id,
    cambio: CambioPedidoMayorista,
  ): Promise<PedidoMayorista | undefined>;
  /** El siguiente numero visible de pedido mayorista. Empieza en 501. */
  siguienteNumeroMayorista(): Promise<number>;

  /* --- Rastro --- */
  anotar(apunte: Apunte): Promise<void>;
  listarApuntes(entidad: string, entidadId: Id): Promise<Apunte[]>;
}
