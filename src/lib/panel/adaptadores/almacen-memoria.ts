/*
  Almacen en memoria, con datos de ejemplo.

  Para que sirve: que el panel se pueda abrir y tocar en un preview de Vercel
  HOY, sin cuenta de base de datos, sin credenciales y sin esperar a que Alfredo
  defina la empresa. Adrian revisa la forma del panel mientras lo tecnico se
  define.

  Que NO es: un almacen de verdad. Vive en la memoria del proceso, asi que se
  reinicia cuando Vercel recicla la funcion y no se comparte entre dos personas
  a la vez. Cualquier cosa que se escriba aqui se pierde.

  Por eso el panel muestra un aviso de MODO DEMOSTRACION en pantalla cuando este
  adaptador esta activo. Nadie puede confundirlo con datos reales.

  El adaptador de Postgres implementa esta misma interfaz y entra cambiando una
  variable de entorno. Ver `src/lib/panel/servicios.ts`.
*/

import { CONTACT_EMAIL } from "@/lib/brand";

import { euros, IVA_LITUANIA } from "../dominio/dinero";
import { PRECIO_PUBLICO } from "../dominio/economia";
import type {
  Apunte,
  Color,
  Id,
  PedidoMayorista,
  Tienda,
  Lote,
  Pedido,
  Sesion,
  Usuario,
} from "../dominio/tipos";
import type { Almacen, CambioPedido, FiltroPedidos } from "../puertos/almacen";

/*
  Los catorce colores son de relleno, igual que en la tienda: Alfredo todavia no
  dio los nombres comerciales ni los valores exactos. Estan rotulados como
  marcador de posicion en la propia pantalla.
*/
const COLORES: Color[] = [
  ["negro", "Black", "#111111"],
  ["marino", "Navy", "#1b2a4a"],
  ["vinotinto", "Burgundy", "#5c1a2b"],
  ["morado", "Plum", "#43285c"],
  ["verde", "Forest", "#1f3d2b"],
  ["gris", "Graphite", "#4a4a4a"],
  ["crema", "Cream", "#e8ddc5"],
  ["oro", "Gold", "#c9a227"],
].map(([id, nombre, hex]) => ({ id, nombre, hex, activo: true }));

const AHORA = Date.now();
const hace = (horas: number) => new Date(AHORA - horas * 3_600_000).toISOString();

const LOTE_ACTUAL: Lote = {
  id: "lote-2026-08",
  referencia: "2026-08",
  llegadaEn: hace(24 * 30),
  unidades: 100,
  facturaFabrica: euros(2400),
  /*
    Los 1.000 EUR de traer el lote, todavia sin desglosar: van enteros en flete
    y el IVA cuenta como coste. Es el calculo conservador de
    `docs/economia-nerowa.md` §2.2. Cuando Alfredo pase el desglose, el coste
    unitario baja solo.
  */
  flete: euros(1000),
  aranceles: 0,
  ivaImportacion: 0,
  despacho: 0,
  ivaRecuperable: false,
  notas: "Falta el desglose de los 1.000 EUR: flete, arancel, IVA de importacion y despacho.",
};

function pedidoEjemplo(
  numero: number,
  horas: number,
  nombre: string,
  ciudad: string,
  pais: string,
  colorId: string,
  cantidad: number,
  estado: Pedido["estado"],
  extra: Partial<Pedido> = {},
): Pedido {
  return {
    id: `pedido-${numero}`,
    numero,
    origen: "web",
    estado,
    clienteNombre: nombre,
    clienteCorreo: `${nombre.split(" ")[0]!.toLowerCase()}@ejemplo.com`,
    direccion: {
      nombre,
      linea1: "Calle de ejemplo 12",
      ciudad,
      codigoPostal: "00000",
      pais,
    },
    lineas: [{ colorId, cantidad, precioUnitario: PRECIO_PUBLICO, loteId: LOTE_ACTUAL.id }],
    envioCobrado: euros(18),
    tipoIva: IVA_LITUANIA,
    pagadoEn: hace(horas),
    ...extra,
  };
}

/*
  Los pedidos de ejemplo cubren a proposito los casos que deciden si el panel
  esta bien hecho: uno recien entrado, uno que ya paso las 24 h del primer
  recordatorio, uno que paso las 48 h y ya deberia haber escalado a Adrian, y
  dos que ya no son trabajo. Ver `docs/panel-nerowa.md` §4.3.
*/
const PEDIDOS: Pedido[] = [
  pedidoEjemplo(1043, 2, "Marta Kazlauskiene", "Vilnius", "LT", "marino", 1, "pagado"),
  pedidoEjemplo(1042, 26, "Jonas Petrauskas", "Kaunas", "LT", "negro", 2, "pagado"),
  pedidoEjemplo(1041, 73, "Anna Schmidt", "Berlin", "DE", "vinotinto", 1, "pagado"),
  pedidoEjemplo(1040, 96, "Pierre Dubois", "Lyon", "FR", "verde", 1, "enviado", {
    seguimiento: "RA123456789LT",
    enviadoEn: hace(70),
    envioCoste: euros(16),
  }),
  pedidoEjemplo(1039, 240, "Elena Rossi", "Milano", "IT", "crema", 1, "entregado", {
    seguimiento: "RA987654321LT",
    enviadoEn: hace(220),
    entregadoEn: hace(60),
    envioCoste: euros(19),
  }),
];

/*
  Tres tiendas de ejemplo, elegidas para cubrir los tres casos de IVA que de
  verdad cambian el total de una factura, mas la deuda vencida que hay que ver
  de lejos. Ver `docs/economia-nerowa.md` §4.3.
*/
const TIENDAS: Tienda[] = [
  {
    id: "tienda-vilnius",
    nombre: "Muzikos Namai",
    razonSocial: "UAB Muzikos Namai",
    numeroIva: "LT100001738313",
    ivaValidado: true,
    direccion: {
      nombre: "Muzikos Namai",
      linea1: "Gedimino pr. 24",
      ciudad: "Vilnius",
      codigoPostal: "01103",
      pais: "LT",
    },
    contactoNombre: "Ruta Jankauskiene",
    contactoCorreo: "ruta@ejemplo.lt",
    plazoPagoDias: 30,
    activa: true,
    creadaEn: hace(24 * 120),
  },
  {
    id: "tienda-berlin",
    nombre: "Kontrabass Berlin",
    razonSocial: "Kontrabass Berlin GmbH",
    numeroIva: "DE811234567",
    ivaValidado: true,
    direccion: {
      nombre: "Kontrabass Berlin",
      linea1: "Oranienstrasse 12",
      ciudad: "Berlin",
      codigoPostal: "10999",
      pais: "DE",
    },
    contactoNombre: "Anna Weber",
    contactoCorreo: "anna@ejemplo.de",
    precioPersonalizado: euros(95),
    plazoPagoDias: 30,
    notas: "Precio acordado de 95 EUR por compromiso de 40 unidades al anio.",
    activa: true,
    creadaEn: hace(24 * 60),
  },
  {
    id: "tienda-paris",
    nombre: "La Contrebasse",
    razonSocial: "La Contrebasse SARL",
    /* A proposito sin validar: asi se le cobra IVA y se ve la diferencia. */
    numeroIva: "FR40303265045",
    ivaValidado: false,
    direccion: {
      nombre: "La Contrebasse",
      linea1: "Rue de Rome 40",
      ciudad: "Paris",
      codigoPostal: "75008",
      pais: "FR",
    },
    contactoNombre: "Julien Moreau",
    plazoPagoDias: 15,
    activa: true,
    creadaEn: hace(24 * 20),
  },
];

const PEDIDOS_MAYORISTAS: PedidoMayorista[] = [
  {
    id: "pm-501",
    numero: 501,
    tiendaId: "tienda-vilnius",
    estado: "confirmado",
    cobro: "facturado",
    envio: "entregado",
    lineas: [
      { colorId: "negro", cantidad: 10, precioUnitario: euros(110), loteId: LOTE_ACTUAL.id },
      { colorId: "marino", cantidad: 6, precioUnitario: euros(110), loteId: LOTE_ACTUAL.id },
    ],
    envioCobrado: euros(60),
    regimenIva: "nacional",
    tipoIva: IVA_LITUANIA,
    creadoEn: hace(24 * 60),
    confirmadoEn: hace(24 * 58),
    /* Facturado hace 50 dias con plazo de 30: vencida, y se tiene que ver. */
    facturadoEn: hace(24 * 50),
    enviadoEn: hace(24 * 55),
    entregadoEn: hace(24 * 52),
    seguimiento: "RA111222333LT",
    referenciaFactura: "2026-014",
  },
  {
    id: "pm-502",
    numero: 502,
    tiendaId: "tienda-berlin",
    estado: "confirmado",
    cobro: "sin_facturar",
    envio: "enviado",
    lineas: [{ colorId: "vinotinto", cantidad: 20, precioUnitario: euros(95), loteId: LOTE_ACTUAL.id }],
    envioCobrado: euros(120),
    regimenIva: "intracomunitario",
    tipoIva: 0,
    creadoEn: hace(24 * 8),
    confirmadoEn: hace(24 * 7),
    enviadoEn: hace(24 * 5),
    seguimiento: "CP444555666LT",
  },
  {
    id: "pm-503",
    numero: 503,
    tiendaId: "tienda-paris",
    estado: "por_confirmar",
    cobro: "sin_facturar",
    envio: "sin_enviar",
    lineas: [{ colorId: "crema", cantidad: 4, precioUnitario: euros(120) }],
    envioCobrado: euros(45),
    regimenIva: "sin_numero_valido",
    tipoIva: IVA_LITUANIA,
    creadoEn: hace(30),
  },
];

export function crearAlmacenMemoria(): Almacen {
  /*
    El estado vive en variables del modulo, no en un objeto exportado, para que
    nadie lo lea por detras de la interfaz. Se clona al devolver por la misma
    razon: que una pantalla no pueda mutar el almacen sin pasar por un metodo.
  */
  const colores = [...COLORES];
  const lotes = [LOTE_ACTUAL];
  const pedidos = [...PEDIDOS];
  const tiendas = [...TIENDAS];
  const pedidosMayoristas = [...PEDIDOS_MAYORISTAS];
  /*
    Las dos personas del panel, con los correos que existen de verdad. Son dos
    y solo dos; el dia que haga falta otro, se anade aqui.

    El de Alfredo es el correo de contacto de Nerowa, que ya vive en
    `src/lib/brand.ts` porque lo usan la pagina de espera y la tienda. Se
    importa de ahi en vez de repetir la cadena: el dia que cambie, cambia en un
    solo sitio y el panel se entera solo.

    Estan escritos con un valor por defecto, y no solo en la variable de
    entorno, por lo mismo que la entrada sin correo se enciende sola: si
    dependieran de configurar algo en Vercel, el preview seria un panel al que
    no entra nadie.

    Cuando llegue la base de datos, las personas viven ahi y esto se borra
    entero. Dar de alta a alguien no puede ser un commit.
  */
  const usuarios: Usuario[] = [
    {
      id: "u-alfredo",
      nombre: "Alfredo",
      correo: process.env.PANEL_CORREO_OPERACION ?? CONTACT_EMAIL,
      rol: "operacion",
      creadoEn: hace(24 * 60),
    },
    {
      id: "u-adrian",
      nombre: "Adrian",
      correo: process.env.PANEL_CORREO_DUENO ?? "hello@arcmediahouse.com",
      rol: "dueno",
      creadoEn: hace(24 * 60),
    },
  ];
  const sesiones = new Map<Id, Sesion>();
  const apuntes: Apunte[] = [];

  const clon = <T,>(v: T): T => structuredClone(v);
  const norm = (correo: string) => correo.trim().toLowerCase();

  return {
    nombre: "memoria",

    async usuarioPorCorreo(correo) {
      return clon(usuarios.find((u) => norm(u.correo) === norm(correo)));
    },
    async usuarioPorId(id) {
      return clon(usuarios.find((u) => u.id === id));
    },
    async listarUsuarios() {
      return clon(usuarios);
    },

    async crearSesion(sesion) {
      sesiones.set(sesion.id, clon(sesion));
    },
    async sesionPorId(id) {
      const sesion = sesiones.get(id);
      if (!sesion) return undefined;
      if (new Date(sesion.expiraEn).getTime() < Date.now()) {
        sesiones.delete(id);
        return undefined;
      }
      return clon(sesion);
    },
    async borrarSesion(id) {
      sesiones.delete(id);
    },

    async listarColores() {
      return clon(colores);
    },
    async listarLotes() {
      return clon(lotes);
    },
    async lotePorId(id) {
      return clon(lotes.find((l) => l.id === id));
    },

    async listarPedidos(filtro: FiltroPedidos = {}) {
      let resultado = pedidos;
      if (filtro.estados) {
        const estados = filtro.estados;
        resultado = resultado.filter((p) => estados.includes(p.estado));
      }
      /* El mas viejo primero: lo que lleva mas tiempo esperando es lo urgente. */
      resultado = [...resultado].sort(
        (a, b) => new Date(a.pagadoEn).getTime() - new Date(b.pagadoEn).getTime(),
      );
      if (filtro.limite) resultado = resultado.slice(0, filtro.limite);
      return clon(resultado);
    },
    async pedidoPorId(id) {
      return clon(pedidos.find((p) => p.id === id));
    },
    async crearPedido(pedido) {
      pedidos.push(clon(pedido));
      return clon(pedido);
    },
    async actualizarPedido(id, cambio: CambioPedido) {
      const i = pedidos.findIndex((p) => p.id === id);
      if (i === -1) return undefined;
      pedidos[i] = { ...pedidos[i]!, ...cambio };
      return clon(pedidos[i]!);
    },
    async siguienteNumeroPedido() {
      return pedidos.reduce((max, p) => Math.max(max, p.numero), 1000) + 1;
    },

    async listarTiendas() {
      /* Las activas primero, y dentro de cada grupo por nombre. */
      return clon(
        [...tiendas].sort(
          (a, b) =>
            Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, "es"),
        ),
      );
    },
    async tiendaPorId(id) {
      return clon(tiendas.find((t) => t.id === id));
    },
    async crearTienda(tienda) {
      tiendas.push(clon(tienda));
      return clon(tienda);
    },
    async actualizarTienda(id, cambio) {
      const i = tiendas.findIndex((t) => t.id === id);
      if (i === -1) return undefined;
      tiendas[i] = { ...tiendas[i]!, ...cambio };
      return clon(tiendas[i]!);
    },

    async listarPedidosMayoristas(tiendaId) {
      const lista = tiendaId
        ? pedidosMayoristas.filter((p) => p.tiendaId === tiendaId)
        : pedidosMayoristas;
      /* El mas nuevo primero: al reves que los de la web, donde lo viejo es lo
         urgente. Aqui lo urgente se mide por la deuda, no por la antiguedad. */
      return clon(
        [...lista].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
      );
    },
    async pedidoMayoristaPorId(id) {
      return clon(pedidosMayoristas.find((p) => p.id === id));
    },
    async crearPedidoMayorista(pedido) {
      pedidosMayoristas.push(clon(pedido));
      return clon(pedido);
    },
    async actualizarPedidoMayorista(id, cambio) {
      const i = pedidosMayoristas.findIndex((p) => p.id === id);
      if (i === -1) return undefined;
      pedidosMayoristas[i] = { ...pedidosMayoristas[i]!, ...cambio };
      return clon(pedidosMayoristas[i]!);
    },
    async siguienteNumeroMayorista() {
      return pedidosMayoristas.reduce((max, p) => Math.max(max, p.numero), 500) + 1;
    },

    async anotar(apunte) {
      apuntes.push(clon(apunte));
    },
    async listarApuntes(entidad, entidadId) {
      return clon(
        apuntes
          .filter((a) => a.entidad === entidad && a.entidadId === entidadId)
          .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
      );
    },
  };
}
