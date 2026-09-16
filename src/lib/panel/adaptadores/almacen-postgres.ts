/*
  El almacen sobre Postgres.

  ESTE ARCHIVO ES LA PRUEBA DE SI LOS PUERTOS ESTABAN BIEN.

  Se escribio despues de las pantallas, contra la misma interfaz `Almacen` que
  usaba el adaptador de memoria, y **no hubo que tocar ni una pantalla**. Eso es
  exactamente lo que Adrian pidio en la sesion 10: "deja margen para cambiar
  bases a futuro conforme vayamos definiendo todo lo tecnico de la empresa".

  Notas de traduccion entre el dominio y la tabla:

  - El dominio habla en camello (`clienteNombre`) y la tabla en serpiente
    (`cliente_nombre`). La conversion vive aqui y en ningun otro sitio.
  - El dinero es `bigint` en la tabla, y el cliente de Postgres lo devuelve como
    cadena para no perder precision con enteros grandes. Se convierte con
    `centimos()`, que es tambien donde se veria si algun dia un importe se pasa
    de lo que aguanta un numero de JavaScript.
  - Las fechas salen como `Date` y el dominio las quiere en ISO 8601.
*/

import type {
  Apunte,
  Color,
  Direccion,
  Id,
  LineaPedido,
  Lote,
  Pedido,
  PedidoMayorista,
  Tienda,
  Usuario,
} from "../dominio/tipos";
import type {
  Almacen,
  CambioPedido,
  CambioPedidoMayorista,
  CambioTienda,
  FiltroPedidos,
} from "../puertos/almacen";
import type { Conexion } from "./postgres/conexion";

/* --------------------------------------------------------------------------
   Traduccion de tipos
   -------------------------------------------------------------------------- */

/**
 * Un `bigint` de Postgres llega como cadena, porque puede no caber en un numero
 * de JavaScript. Los centimos de este negocio caben de sobra, pero se comprueba:
 * un importe que no quepa es un dato corrupto, y es mejor enterarse aqui.
 */
function centimos(valor: unknown): number {
  if (valor === null || valor === undefined) return 0;
  const n = typeof valor === "string" ? Number(valor) : Number(valor);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Importe fuera de rango en la base de datos: ${String(valor)}`);
  }
  return n;
}

function centimosOpcional(valor: unknown): number | undefined {
  return valor === null || valor === undefined ? undefined : centimos(valor);
}

function instante(valor: unknown): string {
  return valor instanceof Date ? valor.toISOString() : String(valor);
}

function instanteOpcional(valor: unknown): string | undefined {
  return valor === null || valor === undefined ? undefined : instante(valor);
}

function texto(valor: unknown): string | undefined {
  return valor === null || valor === undefined ? undefined : String(valor);
}

/**
 * Lee una columna `jsonb`.
 *
 * Los clientes de Postgres no coinciden en esto: unos devuelven el objeto ya
 * montado y otros la cadena. Se acepta cualquiera de los dos en vez de confiar
 * en el que toque, porque confiar fue justo lo que fallo: la prueba corria
 * sobre un cliente que lo devolvia montado y la produccion sobre otro que no,
 * asi que `direccion.pais` era `undefined` solo en Vercel.
 */
function objeto<T>(valor: unknown): T {
  if (typeof valor === "string") return JSON.parse(valor) as T;
  return valor as T;
}

type Fila = Record<string, unknown>;

function aUsuario(f: Fila): Usuario {
  return {
    id: String(f.id),
    nombre: String(f.nombre),
    correo: String(f.correo),
    rol: f.rol as Usuario["rol"],
    telegramChatId: texto(f.telegram_chat_id),
    creadoEn: instante(f.creado_en),
  };
}

function aLote(f: Fila): Lote {
  return {
    id: String(f.id),
    referencia: String(f.referencia),
    llegadaEn: instante(f.llegada_en),
    unidades: Number(f.unidades),
    facturaFabrica: centimos(f.factura_fabrica),
    flete: centimos(f.flete),
    aranceles: centimos(f.aranceles),
    ivaImportacion: centimos(f.iva_importacion),
    despacho: centimos(f.despacho),
    ivaRecuperable: Boolean(f.iva_recuperable),
    notas: texto(f.notas),
  };
}

function aPedido(f: Fila): Pedido {
  return {
    id: String(f.id),
    numero: Number(f.numero),
    origen: f.origen as Pedido["origen"],
    estado: f.estado as Pedido["estado"],
    clienteNombre: String(f.cliente_nombre),
    clienteCorreo: String(f.cliente_correo),
    direccion: objeto<Direccion>(f.direccion),
    lineas: objeto<LineaPedido[]>(f.lineas),
    envioCobrado: centimos(f.envio_cobrado),
    tipoIva: Number(f.tipo_iva),
    stripeTotalCobrado: centimosOpcional(f.stripe_total_cobrado),
    stripeComision: centimosOpcional(f.stripe_comision),
    stripePaymentIntentId: texto(f.stripe_payment_intent_id),
    envioCoste: centimosOpcional(f.envio_coste),
    seguimiento: texto(f.seguimiento),
    pagadoEn: instante(f.pagado_en),
    enviadoEn: instanteOpcional(f.enviado_en),
    entregadoEn: instanteOpcional(f.entregado_en),
    archivadoEn: instanteOpcional(f.archivado_en),
    tiendaId: texto(f.tienda_id),
    notaInterna: texto(f.nota_interna),
  };
}

function aTienda(f: Fila): Tienda {
  return {
    id: String(f.id),
    nombre: String(f.nombre),
    razonSocial: texto(f.razon_social),
    numeroIva: texto(f.numero_iva),
    ivaValidado: Boolean(f.iva_validado),
    direccion: objeto<Direccion>(f.direccion),
    contactoNombre: texto(f.contacto_nombre),
    contactoCorreo: texto(f.contacto_correo),
    contactoTelefono: texto(f.contacto_telefono),
    precioPersonalizado: centimosOpcional(f.precio_personalizado),
    plazoPagoDias: Number(f.plazo_pago_dias),
    notas: texto(f.notas),
    activa: Boolean(f.activa),
    creadaEn: instante(f.creada_en),
  };
}

function aPedidoMayorista(f: Fila): PedidoMayorista {
  return {
    id: String(f.id),
    numero: Number(f.numero),
    tiendaId: String(f.tienda_id),
    estado: f.estado as PedidoMayorista["estado"],
    cobro: f.cobro as PedidoMayorista["cobro"],
    envio: f.envio as PedidoMayorista["envio"],
    lineas: objeto<LineaPedido[]>(f.lineas),
    envioCobrado: centimos(f.envio_cobrado),
    envioCoste: centimosOpcional(f.envio_coste),
    regimenIva: f.regimen_iva as PedidoMayorista["regimenIva"],
    tipoIva: Number(f.tipo_iva),
    creadoEn: instante(f.creado_en),
    confirmadoEn: instanteOpcional(f.confirmado_en),
    facturadoEn: instanteOpcional(f.facturado_en),
    pagadoEn: instanteOpcional(f.pagado_en),
    enviadoEn: instanteOpcional(f.enviado_en),
    entregadoEn: instanteOpcional(f.entregado_en),
    referenciaFactura: texto(f.referencia_factura),
    seguimiento: texto(f.seguimiento),
    notas: texto(f.notas),
  };
}

/* --------------------------------------------------------------------------
   Actualizaciones parciales
   -------------------------------------------------------------------------- */

/**
 * Arma un `update` con solo los campos que vienen en el cambio.
 *
 * Los nombres de columna NO salen de la entrada: se buscan en un mapa fijo y lo
 * que no este se ignora. Asi, aunque a una accion le llegara un campo inventado
 * por un POST directo, no puede acabar en el SQL.
 */
function armarUpdate(
  tabla: string,
  columnas: Record<string, string>,
  cambio: Record<string, unknown>,
  id: string,
  /** Columnas `jsonb`, que necesitan el casteo explicito igual que al insertar. */
  columnasJson: readonly string[] = [],
): { sql: string; params: unknown[] } | undefined {
  const trozos: string[] = [];
  const params: unknown[] = [];

  for (const [campo, valor] of Object.entries(cambio)) {
    const columna = columnas[campo];
    if (!columna || valor === undefined) continue;
    params.push(valor);
    const casteo = columnasJson.includes(columna) ? "::jsonb" : "";
    trozos.push(`${columna} = $${params.length}${casteo}`);
  }
  if (trozos.length === 0) return undefined;

  params.push(id);
  return {
    sql: `update ${tabla} set ${trozos.join(", ")} where id = $${params.length} returning *`,
    params,
  };
}

const COLUMNAS_PEDIDO: Record<string, string> = {
  estado: "estado",
  seguimiento: "seguimiento",
  envioCoste: "envio_coste",
  entregadoEn: "entregado_en",
  enviadoEn: "enviado_en",
  archivadoEn: "archivado_en",
  notaInterna: "nota_interna",
  stripeTotalCobrado: "stripe_total_cobrado",
  stripeComision: "stripe_comision",
};

const COLUMNAS_TIENDA: Record<string, string> = {
  nombre: "nombre",
  razonSocial: "razon_social",
  numeroIva: "numero_iva",
  ivaValidado: "iva_validado",
  direccion: "direccion",
  contactoNombre: "contacto_nombre",
  contactoCorreo: "contacto_correo",
  contactoTelefono: "contacto_telefono",
  precioPersonalizado: "precio_personalizado",
  plazoPagoDias: "plazo_pago_dias",
  notas: "notas",
  activa: "activa",
};

const COLUMNAS_MAYORISTA: Record<string, string> = {
  estado: "estado",
  cobro: "cobro",
  envio: "envio",
  envioCobrado: "envio_cobrado",
  envioCoste: "envio_coste",
  regimenIva: "regimen_iva",
  tipoIva: "tipo_iva",
  confirmadoEn: "confirmado_en",
  facturadoEn: "facturado_en",
  pagadoEn: "pagado_en",
  enviadoEn: "enviado_en",
  entregadoEn: "entregado_en",
  referenciaFactura: "referencia_factura",
  seguimiento: "seguimiento",
  notas: "notas",
};

/* --------------------------------------------------------------------------
   El adaptador
   -------------------------------------------------------------------------- */

/**
 * La conexion se recibe, no se busca.
 *
 * Asi este archivo no sabe de donde sale — ni lee variables de entorno, ni
 * importa el cliente de Postgres — y se puede probar contra un Postgres
 * embebido sin credenciales ni red. Quien la elige es `servicios.ts`, que es
 * donde se eligen todos los adaptadores.
 */
export function crearAlmacenPostgres(cx: Conexion): Almacen {
  /*
    El JSON se manda como texto y se castea con `::jsonb` en el propio SQL.
    Sin el casteo, un cliente que trate el parametro como texto guarda una
    CADENA dentro del jsonb en vez del objeto, y al leerla vuelve una cadena.
    Con el casteo, el resultado es el mismo con cualquier cliente.
  */
  const json = (v: unknown) => JSON.stringify(v);

  return {
    nombre: "postgres",

    async usuarioPorCorreo(correo) {
      const filas = await cx.consultar<Fila>(
        "select * from usuarios where lower(correo) = lower($1)",
        [correo.trim()],
      );
      return filas[0] ? aUsuario(filas[0]) : undefined;
    },
    async usuarioPorId(id) {
      const filas = await cx.consultar<Fila>("select * from usuarios where id = $1", [id]);
      return filas[0] ? aUsuario(filas[0]) : undefined;
    },
    async listarUsuarios() {
      const filas = await cx.consultar<Fila>("select * from usuarios order by nombre");
      return filas.map(aUsuario);
    },

    async listarColores() {
      const filas = await cx.consultar<Fila>("select * from colores order by nombre");
      return filas.map(
        (f): Color => ({
          id: String(f.id),
          nombre: String(f.nombre),
          hex: String(f.hex),
          activo: Boolean(f.activo),
        }),
      );
    },
    async listarLotes() {
      const filas = await cx.consultar<Fila>("select * from lotes order by llegada_en");
      return filas.map(aLote);
    },
    async lotePorId(id) {
      const filas = await cx.consultar<Fila>("select * from lotes where id = $1", [id]);
      return filas[0] ? aLote(filas[0]) : undefined;
    },

    async listarPedidos(filtro: FiltroPedidos = {}) {
      /* El mas viejo primero: lo que lleva mas tiempo esperando es lo urgente. */
      let sql = "select * from pedidos";
      const params: unknown[] = [];
      if (filtro.estados && filtro.estados.length > 0) {
        params.push(filtro.estados as unknown);
        sql += ` where estado = any($${params.length})`;
      }
      sql += " order by pagado_en asc";
      if (filtro.limite) {
        params.push(filtro.limite);
        sql += ` limit $${params.length}`;
      }
      const filas = await cx.consultar<Fila>(sql, params);
      return filas.map(aPedido);
    },
    async pedidoPorId(id) {
      const filas = await cx.consultar<Fila>("select * from pedidos where id = $1", [id]);
      return filas[0] ? aPedido(filas[0]) : undefined;
    },
    async crearPedido(pedido) {
      await cx.consultar(
        `insert into pedidos (
           id, numero, origen, estado, cliente_nombre, cliente_correo, direccion,
           lineas, envio_cobrado, tipo_iva, stripe_total_cobrado, stripe_comision,
           stripe_payment_intent_id, envio_coste, seguimiento, pagado_en, enviado_en,
           entregado_en, archivado_en, tienda_id, nota_interna
         ) values (
           $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19, $20, $21
         )`,
        [
          pedido.id, pedido.numero, pedido.origen, pedido.estado,
          pedido.clienteNombre, pedido.clienteCorreo, json(pedido.direccion),
          json(pedido.lineas), pedido.envioCobrado, pedido.tipoIva,
          pedido.stripeTotalCobrado ?? null, pedido.stripeComision ?? null,
          pedido.stripePaymentIntentId ?? null, pedido.envioCoste ?? null,
          pedido.seguimiento ?? null, pedido.pagadoEn, pedido.enviadoEn ?? null,
          pedido.entregadoEn ?? null, pedido.archivadoEn ?? null,
          pedido.tiendaId ?? null, pedido.notaInterna ?? null,
        ],
      );
      return pedido;
    },
    async actualizarPedido(id, cambio: CambioPedido) {
      const q = armarUpdate("pedidos", COLUMNAS_PEDIDO, cambio, id);
      if (!q) return this.pedidoPorId(id);
      const filas = await cx.consultar<Fila>(q.sql, q.params);
      return filas[0] ? aPedido(filas[0]) : undefined;
    },
    async siguienteNumeroPedido() {
      const filas = await cx.consultar<Fila>(
        "select coalesce(max(numero), 1000) + 1 as siguiente from pedidos",
      );
      return Number(filas[0]?.siguiente ?? 1001);
    },

    async listarTiendas() {
      const filas = await cx.consultar<Fila>(
        "select * from tiendas order by activa desc, nombre",
      );
      return filas.map(aTienda);
    },
    async tiendaPorId(id) {
      const filas = await cx.consultar<Fila>("select * from tiendas where id = $1", [id]);
      return filas[0] ? aTienda(filas[0]) : undefined;
    },
    async crearTienda(tienda) {
      await cx.consultar(
        `insert into tiendas (
           id, nombre, razon_social, numero_iva, iva_validado, direccion,
           contacto_nombre, contacto_correo, contacto_telefono,
           precio_personalizado, plazo_pago_dias, notas, activa, creada_en
         ) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          tienda.id, tienda.nombre, tienda.razonSocial ?? null,
          tienda.numeroIva ?? null, tienda.ivaValidado, json(tienda.direccion),
          tienda.contactoNombre ?? null, tienda.contactoCorreo ?? null,
          tienda.contactoTelefono ?? null, tienda.precioPersonalizado ?? null,
          tienda.plazoPagoDias, tienda.notas ?? null, tienda.activa, tienda.creadaEn,
        ],
      );
      return tienda;
    },
    async actualizarTienda(id, cambio: CambioTienda) {
      const preparado: Record<string, unknown> = { ...cambio };
      if (preparado.direccion) preparado.direccion = json(preparado.direccion);
      const q = armarUpdate("tiendas", COLUMNAS_TIENDA, preparado, id, ["direccion"]);
      if (!q) return this.tiendaPorId(id);
      const filas = await cx.consultar<Fila>(q.sql, q.params);
      return filas[0] ? aTienda(filas[0]) : undefined;
    },

    async listarPedidosMayoristas(tiendaId) {
      /* El mas nuevo primero: aqui lo urgente se mide por la deuda, no por la
         antiguedad, asi que el orden natural es el cronologico inverso. */
      const filas = tiendaId
        ? await cx.consultar<Fila>(
            "select * from pedidos_mayoristas where tienda_id = $1 order by creado_en desc",
            [tiendaId],
          )
        : await cx.consultar<Fila>(
            "select * from pedidos_mayoristas order by creado_en desc",
          );
      return filas.map(aPedidoMayorista);
    },
    async pedidoMayoristaPorId(id) {
      const filas = await cx.consultar<Fila>(
        "select * from pedidos_mayoristas where id = $1",
        [id],
      );
      return filas[0] ? aPedidoMayorista(filas[0]) : undefined;
    },
    async crearPedidoMayorista(pedido) {
      await cx.consultar(
        `insert into pedidos_mayoristas (
           id, numero, tienda_id, estado, cobro, envio, lineas, envio_cobrado,
           envio_coste, regimen_iva, tipo_iva, creado_en, confirmado_en,
           facturado_en, pagado_en, enviado_en, entregado_en, referencia_factura,
           seguimiento, notas
         ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          pedido.id, pedido.numero, pedido.tiendaId, pedido.estado, pedido.cobro,
          pedido.envio, json(pedido.lineas), pedido.envioCobrado,
          pedido.envioCoste ?? null, pedido.regimenIva, pedido.tipoIva,
          pedido.creadoEn, pedido.confirmadoEn ?? null, pedido.facturadoEn ?? null,
          pedido.pagadoEn ?? null, pedido.enviadoEn ?? null,
          pedido.entregadoEn ?? null, pedido.referenciaFactura ?? null,
          pedido.seguimiento ?? null, pedido.notas ?? null,
        ],
      );
      return pedido;
    },
    async actualizarPedidoMayorista(id, cambio: CambioPedidoMayorista) {
      const q = armarUpdate("pedidos_mayoristas", COLUMNAS_MAYORISTA, cambio, id);
      if (!q) return this.pedidoMayoristaPorId(id);
      const filas = await cx.consultar<Fila>(q.sql, q.params);
      return filas[0] ? aPedidoMayorista(filas[0]) : undefined;
    },
    async siguienteNumeroMayorista() {
      const filas = await cx.consultar<Fila>(
        "select coalesce(max(numero), 500) + 1 as siguiente from pedidos_mayoristas",
      );
      return Number(filas[0]?.siguiente ?? 501);
    },

    async anotar(apunte: Apunte) {
      await cx.consultar(
        `insert into apuntes (id, entidad, entidad_id, accion, usuario_id, detalle, creado_en)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          apunte.id, apunte.entidad, apunte.entidadId, apunte.accion,
          apunte.usuarioId, apunte.detalle, apunte.creadoEn,
        ],
      );
    },
    async listarApuntes(entidad, entidadId: Id) {
      const filas = await cx.consultar<Fila>(
        `select * from apuntes where entidad = $1 and entidad_id = $2
         order by creado_en desc`,
        [entidad, entidadId],
      );
      return filas.map(
        (f): Apunte => ({
          id: String(f.id),
          entidad: String(f.entidad),
          entidadId: String(f.entidad_id),
          accion: String(f.accion),
          usuarioId: String(f.usuario_id),
          detalle: String(f.detalle),
          creadoEn: instante(f.creado_en),
        }),
      );
    },
  };
}
