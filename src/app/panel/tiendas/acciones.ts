"use server";

/*
  Las acciones de las tiendas y sus pedidos.

  Misma regla que en los pedidos de la web: se comprueba la sesion y el permiso
  AQUI dentro, la primera linea. Una accion de servidor se puede invocar con un
  POST directo sin pasar por la interfaz, asi que esconder un boton no protege
  nada.
*/

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { euros } from "@/lib/panel/dominio/dinero";
import {
  accionesDe,
  precioParaTienda,
  regimenDe,
  tipoIvaDe,
} from "@/lib/panel/dominio/mayorista";
import type {
  Direccion,
  EstadoCobro,
  EstadoEnvio,
  EstadoMayorista,
  PedidoMayorista,
  Tienda,
} from "@/lib/panel/dominio/tipos";
import { servicios } from "@/lib/panel/servicios";
import { exigirUsuario } from "@/lib/panel/sesion";

export interface Resultado {
  ok: boolean;
  mensaje: string;
}

/** Lee un importe escrito por una persona: "16,40" o "16.40". */
function importe(texto: string): number | undefined {
  const limpio = texto.trim().replace(",", ".");
  if (!limpio) return undefined;
  const valor = Number(limpio);
  return Number.isFinite(valor) && valor >= 0 ? euros(valor) : undefined;
}

function textoDe(datos: FormData, campo: string): string {
  return String(datos.get(campo) ?? "").trim();
}

/* --------------------------------------------------------------------------
   Tiendas
   -------------------------------------------------------------------------- */

export async function guardarTienda(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const id = textoDe(datos, "id");
  const nombre = textoDe(datos, "nombre");
  const pais = textoDe(datos, "pais").toUpperCase();

  if (!nombre) return { ok: false, mensaje: "La tienda necesita un nombre." };
  if (pais.length !== 2) {
    return { ok: false, mensaje: "El pais va en dos letras: LT, DE, FR…" };
  }

  const precioTexto = textoDe(datos, "precioPersonalizado");
  const precioPersonalizado = importe(precioTexto);
  if (precioTexto && precioPersonalizado === undefined) {
    return { ok: false, mensaje: "El precio acordado no es un numero valido." };
  }

  const plazo = Number(textoDe(datos, "plazoPagoDias") || "30");
  if (!Number.isInteger(plazo) || plazo < 0 || plazo > 365) {
    return { ok: false, mensaje: "El plazo de pago va en dias, de 0 a 365." };
  }

  const direccion: Direccion = {
    nombre: textoDe(datos, "razonSocial") || nombre,
    linea1: textoDe(datos, "linea1"),
    ciudad: textoDe(datos, "ciudad"),
    codigoPostal: textoDe(datos, "codigoPostal"),
    pais,
  };

  /*
    El numero de IVA se guarda tal cual, pero `ivaValidado` solo se pone si
    alguien marca la casilla. Un numero sin comprobar hace que se le cobre el
    IVA, que es el lado seguro: cobrarlo de mas se devuelve, no cobrarlo lo
    paga la empresa.
  */
  const campos = {
    nombre,
    razonSocial: textoDe(datos, "razonSocial") || undefined,
    numeroIva: textoDe(datos, "numeroIva").toUpperCase() || undefined,
    ivaValidado: datos.get("ivaValidado") === "on",
    direccion,
    contactoNombre: textoDe(datos, "contactoNombre") || undefined,
    contactoCorreo: textoDe(datos, "contactoCorreo") || undefined,
    contactoTelefono: textoDe(datos, "contactoTelefono") || undefined,
    precioPersonalizado,
    plazoPagoDias: plazo,
    notas: textoDe(datos, "notas") || undefined,
    activa: datos.get("activa") !== "off",
  };

  let tiendaId = id;
  if (id) {
    const existente = await almacen.tiendaPorId(id);
    if (!existente) return { ok: false, mensaje: "Esa tienda ya no existe." };
    await almacen.actualizarTienda(id, campos);
  } else {
    const nueva: Tienda = {
      id: crypto.randomUUID(),
      ...campos,
      creadaEn: new Date().toISOString(),
    };
    await almacen.crearTienda(nueva);
    tiendaId = nueva.id;
  }

  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "tienda",
    entidadId: tiendaId,
    accion: id ? "editada" : "creada",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} ${id ? "edito" : "dio de alta"} la tienda ${nombre}`,
    creadoEn: new Date().toISOString(),
  });

  revalidatePath("/panel/tiendas");
  redirect(`/panel/tiendas/${tiendaId}?hecho=m-${id ? "editada" : "creada"}`);
}

/* --------------------------------------------------------------------------
   Pedidos
   -------------------------------------------------------------------------- */

export async function crearPedidoMayorista(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const tiendaId = textoDe(datos, "tiendaId");
  const tienda = await almacen.tiendaPorId(tiendaId);
  if (!tienda) return { ok: false, mensaje: "Esa tienda ya no existe." };

  /*
    Las cantidades llegan como un campo por color. Se quedan solo los que traen
    un numero mayor que cero: pedir "0 negros" no es una linea del pedido.
  */
  const colores = await almacen.listarColores();
  const pedidas = colores
    .map((color) => ({
      colorId: color.id,
      cantidad: Number(textoDe(datos, `cantidad-${color.id}`) || "0"),
    }))
    .filter((l) => Number.isInteger(l.cantidad) && l.cantidad > 0);

  if (pedidas.length === 0) {
    return { ok: false, mensaje: "Pon al menos una unidad de algun color." };
  }

  const unidades = pedidas.reduce((n, l) => n + l.cantidad, 0);
  /*
    El precio se congela AHORA, con el tramo que le toca al total de unidades de
    este pedido. Si manana cambian los tramos, este pedido conserva lo acordado.
  */
  const precioUnitario = precioParaTienda(tienda, unidades);

  const envioTexto = textoDe(datos, "envioCobrado");
  const envioCobrado = importe(envioTexto) ?? 0;
  if (envioTexto && importe(envioTexto) === undefined) {
    return { ok: false, mensaje: "El envio no es un numero valido." };
  }

  const regimenIva = regimenDe(tienda);
  const pedido: PedidoMayorista = {
    id: crypto.randomUUID(),
    numero: await almacen.siguienteNumeroMayorista(),
    tiendaId,
    estado: "por_confirmar",
    cobro: "sin_facturar",
    envio: "sin_enviar",
    lineas: pedidas.map((l) => ({ ...l, precioUnitario })),
    envioCobrado,
    regimenIva,
    tipoIva: tipoIvaDe(regimenIva),
    creadoEn: new Date().toISOString(),
    notas: textoDe(datos, "notas") || undefined,
  };

  await almacen.crearPedidoMayorista(pedido);
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido-mayorista",
    entidadId: pedido.id,
    accion: "creado",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} creo el pedido #${pedido.numero} de ${tienda.nombre}: ${unidades} unidades`,
    creadoEn: pedido.creadoEn,
  });

  revalidatePath("/panel/tiendas");
  redirect(`/panel/tiendas/pedido/${pedido.id}?hecho=m-creado`);
}

export async function avanzarPedidoMayorista(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const pedidoId = textoDe(datos, "pedidoId");
  const pista = textoDe(datos, "pista");
  const hacia = textoDe(datos, "hacia");

  const pedido = await almacen.pedidoMayoristaPorId(pedidoId);
  if (!pedido) return { ok: false, mensaje: "Ese pedido ya no existe." };

  /* La accion tiene que estar entre las que el dominio permite AHORA. */
  const permitida = accionesDe(pedido, usuario.rol).find(
    (a) => a.pista === pista && a.hacia === hacia,
  );
  if (!permitida) {
    return { ok: false, mensaje: "Ese cambio no esta permitido ahora mismo." };
  }

  const ahora = new Date().toISOString();
  const cambio: Record<string, unknown> = {};

  if (permitida.requiere === "factura") {
    const referencia = textoDe(datos, "referenciaFactura");
    if (!referencia) return { ok: false, mensaje: "Falta el numero de factura." };
    cambio.referenciaFactura = referencia;
  }
  if (permitida.requiere === "seguimiento") {
    const seguimiento = textoDe(datos, "seguimiento");
    if (!seguimiento) return { ok: false, mensaje: "Falta el numero de seguimiento." };
    cambio.seguimiento = seguimiento;
  }

  if (pista === "estado") {
    cambio.estado = hacia as EstadoMayorista;
    if (hacia === "confirmado") cambio.confirmadoEn = ahora;
  } else if (pista === "cobro") {
    cambio.cobro = hacia as EstadoCobro;
    if (hacia === "facturado") cambio.facturadoEn = ahora;
    if (hacia === "pagado") cambio.pagadoEn = ahora;
  } else {
    cambio.envio = hacia as EstadoEnvio;
    if (hacia === "enviado") cambio.enviadoEn = ahora;
    if (hacia === "entregado") cambio.entregadoEn = ahora;
  }

  await almacen.actualizarPedidoMayorista(pedidoId, cambio);
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido-mayorista",
    entidadId: pedidoId,
    accion: hacia,
    usuarioId: usuario.id,
    detalle: `${usuario.nombre}: ${permitida.etiqueta.toLowerCase()}`,
    creadoEn: ahora,
  });

  revalidatePath("/panel/tiendas");
  redirect(`/panel/tiendas/pedido/${pedidoId}?hecho=m-${hacia}`);
}
