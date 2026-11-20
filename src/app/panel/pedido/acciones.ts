"use server";

/*
  Las acciones que cambian un pedido.

  Regla que no se salta ninguna: se comprueba la sesion y el permiso AQUI
  dentro, la primera linea. Una accion de servidor se puede invocar con un POST
  directo, sin pasar por la interfaz, asi que esconder un boton no protege nada.

  Y la segunda: la transicion se valida contra la maquina de estados del
  dominio, nunca contra lo que venga del formulario.
*/

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { euros, IVA_LITUANIA, sinIva } from "@/lib/panel/dominio/dinero";
import { NOMBRE_ESTADO, puedeTransitar } from "@/lib/panel/dominio/estados";
import { faltantesPara } from "@/lib/panel/dominio/existencias";
import { limpiarSeguimiento, validarSeguimiento } from "@/lib/panel/dominio/seguimiento";
import type { EstadoPedido, LineaPedido, Pedido } from "@/lib/panel/dominio/tipos";
import { servicios } from "@/lib/panel/servicios";
import { exigirUsuario } from "@/lib/panel/sesion";
import { avisarAlCliente, guardarRecibo } from "@/lib/panel/recibos";
import { leerExistencias } from "@/lib/panel/situacion";
import { avisarEvento } from "@/lib/panel/vigia";

export interface Resultado {
  ok: boolean;
  mensaje: string;
}

/*
  Como se confirma que algo paso, y por que no es lo obvio.

  Lo obvio era devolver el mensaje y pintarlo en el formulario. No funciona:
  al revalidar, el pedido ya esta en otro estado, el formulario deja de
  dibujarse y se lleva el mensaje consigo. La accion ocurria y la pantalla no
  decia nada — exactamente el "guardar en silencio" que la especificacion
  prohibe, y se vio probandolo, no leyendolo.

  Asi que lo exitoso se confirma desde la URL: la accion redirige con
  `?hecho=…` y la pantalla dibuja la franja. Sobrevive al cambio de estado, se
  puede compartir, y desaparece sola al navegar. Los errores SI vuelven por
  `useActionState`, porque ahi el formulario sigue en pantalla.
*/
function confirmar(pedidoId: string, hecho: string): never {
  redirect(`/panel/pedido/${pedidoId}?hecho=${hecho}`);
}

/**
 * Marca un pedido como enviado con su numero de seguimiento.
 *
 * Es LA accion del panel: un campo, un boton, quince segundos. Todo lo demas
 * de esta pantalla puede esperar; esto no.
 */
export async function marcarEnviado(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const pedidoId = String(datos.get("pedidoId") ?? "");
  /* Lo copiado de un papel trae espacios y minusculas: se limpia antes de
     guardarlo, que es el numero que va a buscar el cliente. */
  const seguimiento = limpiarSeguimiento(String(datos.get("seguimiento") ?? ""));
  const costeTexto = String(datos.get("envioCoste") ?? "").trim();

  const malo = validarSeguimiento(seguimiento);
  if (malo) return { ok: false, mensaje: malo };

  const pedido = await almacen.pedidoPorId(pedidoId);
  if (!pedido) return { ok: false, mensaje: "Ese pedido ya no existe." };

  const transicion = puedeTransitar(pedido.estado, "enviado", usuario.rol);
  if (!transicion) {
    return {
      ok: false,
      mensaje: `Un pedido en "${pedido.estado}" no se puede marcar enviado.`,
    };
  }

  /*
    El coste del envio se pregunta aqui, en el momento en que Alfredo tiene el
    comprobante del correo en la mano. Preguntarlo a fin de mes es no
    preguntarlo. Es opcional: si no lo pone, el pedido se envia igual y el
    grafico de ganancia lo marca como estimado.
  */
  const envioCoste = costeTexto ? euros(Number(costeTexto.replace(",", "."))) : undefined;
  if (costeTexto && (!Number.isFinite(envioCoste) || envioCoste! < 0)) {
    return { ok: false, mensaje: "El coste del envio no es un numero valido." };
  }

  /*
    La foto del recibo va con el envio si Alfredo la tomo ya, que es lo comodo:
    esta en la oficina de correos con el papel en la mano. Es opcional para no
    romper los quince segundos; si falta, el panel la pide despues.

    Se guarda ANTES de marcar enviado: si la foto no vale, el pedido sigue en
    "por enviar" y el formulario dice por que, en vez de quedar enviado a
    medias.
  */
  const fallaRecibo = await guardarRecibo(usuario, "pedido", pedidoId, datos.get("recibo"));
  if (fallaRecibo) return { ok: false, mensaje: fallaRecibo };

  const ahora = new Date().toISOString();
  const enviado = await almacen.actualizarPedido(pedidoId, {
    estado: "enviado",
    seguimiento,
    enviadoEn: ahora,
    ...(envioCoste !== undefined ? { envioCoste } : {}),
  });

  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido",
    entidadId: pedidoId,
    accion: "enviado",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} lo marco enviado con el seguimiento ${seguimiento}`,
    creadoEn: ahora,
  });

  /*
    El aviso al otro: si despacha Alfredo, Adrian se entera; en silencio,
    porque es una buena noticia y no algo que haya que atender. El correo al
    cliente con el seguimiento llega con la fase 7.2, cuando haya proveedor.
  */
  avisarEvento({
    clave: `pedido:${pedidoId}:enviado`,
    para: ["operacion", "dueno"],
    menos: usuario.id,
    aviso: {
      urgencia: "normal",
      titulo: `#${pedido.numero} enviado`,
      cuerpo: `${usuario.nombre} lo despacho con el seguimiento ${seguimiento}.`,
      enlace: `/panel/pedido/${pedidoId}`,
    },
  });

  /* Y el cliente recibe su numero, que es para lo que se escribio. */
  const colores = new Map((await almacen.listarColores()).map((c) => [c.id, c]));
  const alCliente = enviado ? await avisarAlCliente(usuario, enviado, colores) : "fallo";

  revalidatePath("/panel");
  revalidatePath(`/panel/pedido/${pedidoId}`);
  confirmar(pedidoId, `enviado-${alCliente}`);
}

/* --------------------------------------------------------------------------
   El recibo y el seguimiento, despues de enviado
   -------------------------------------------------------------------------- */

/** Sube la foto del recibo a un pedido de la web o de una tienda. */
export async function subirRecibo(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();
  const entidad = String(datos.get("entidad") ?? "");
  const id = String(datos.get("entidadId") ?? "");

  if (entidad !== "pedido" && entidad !== "pedido-mayorista") {
    return { ok: false, mensaje: "No se sabe a que pedido va este recibo." };
  }
  const existe =
    entidad === "pedido" ? await almacen.pedidoPorId(id) : await almacen.pedidoMayoristaPorId(id);
  if (!existe) return { ok: false, mensaje: "Ese pedido ya no existe." };

  const archivo = datos.get("recibo");
  if (!archivo || typeof archivo === "string" || archivo.size === 0) {
    return { ok: false, mensaje: "Toma o elige la foto del recibo." };
  }
  const falla = await guardarRecibo(usuario, entidad, id, archivo);
  if (falla) return { ok: false, mensaje: falla };

  const ruta = entidad === "pedido" ? `/panel/pedido/${id}` : `/panel/tiendas/pedido/${id}`;
  revalidatePath("/panel");
  revalidatePath(ruta);
  redirect(`${ruta}?hecho=recibo`);
}

/** Vuelve a mandar el seguimiento por correo: si fallo, o si se conecto Resend despues. */
export async function reenviarSeguimiento(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();
  const pedido = await almacen.pedidoPorId(String(datos.get("pedidoId") ?? ""));
  if (!pedido?.seguimiento) return { ok: false, mensaje: "Este pedido no tiene seguimiento." };

  const colores = new Map((await almacen.listarColores()).map((c) => [c.id, c]));
  const r = await avisarAlCliente(usuario, pedido, colores);
  if (r === "sin-correo") return { ok: false, mensaje: "Este cliente no tiene correo: copia el mensaje." };
  if (r === "sin-conexion") {
    return { ok: false, mensaje: "Los correos todavia no estan conectados (falta Resend): copia el mensaje." };
  }

  revalidatePath(`/panel/pedido/${pedido.id}`);
  confirmar(pedido.id, r === "enviado" ? "correo-ok" : "correo-fallo");
}

/**
 * Corrige un numero de seguimiento mal escrito.
 *
 * Una errata aqui es un cliente que no encuentra su paquete, asi que se puede
 * arreglar sin "corregir el estado" y queda anotado el numero de antes.
 */
export async function corregirSeguimiento(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();
  const pedido = await almacen.pedidoPorId(String(datos.get("pedidoId") ?? ""));
  if (!pedido) return { ok: false, mensaje: "Ese pedido ya no existe." };

  const nuevo = limpiarSeguimiento(String(datos.get("seguimiento") ?? ""));
  const malo = validarSeguimiento(nuevo);
  if (malo) return { ok: false, mensaje: malo };
  if (nuevo === pedido.seguimiento) return { ok: false, mensaje: "Es el mismo numero que ya estaba." };

  const corregido = await almacen.actualizarPedido(pedido.id, { seguimiento: nuevo });
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido",
    entidadId: pedido.id,
    accion: "seguimiento-corregido",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} corrigio el seguimiento: ${pedido.seguimiento ?? "(vacio)"} → ${nuevo}`,
    creadoEn: new Date().toISOString(),
  });

  let hecho = "seguimiento";
  if (datos.get("avisar") === "si" && corregido) {
    const colores = new Map((await almacen.listarColores()).map((c) => [c.id, c]));
    const r = await avisarAlCliente(usuario, corregido, colores);
    hecho = r === "enviado" ? "seguimiento-correo" : "seguimiento";
  }
  revalidatePath(`/panel/pedido/${pedido.id}`);
  confirmar(pedido.id, hecho);
}

/** Cualquier otro cambio de estado que no necesite escribir nada. */
export async function cambiarEstado(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const pedidoId = String(datos.get("pedidoId") ?? "");
  const hacia = String(datos.get("hacia") ?? "") as EstadoPedido;

  const pedido = await almacen.pedidoPorId(pedidoId);
  if (!pedido) return { ok: false, mensaje: "Ese pedido ya no existe." };

  const transicion = puedeTransitar(pedido.estado, hacia, usuario.rol);
  if (!transicion) {
    return { ok: false, mensaje: "Ese cambio no esta permitido." };
  }
  if (transicion.requiere === "seguimiento") {
    return { ok: false, mensaje: "Ese cambio necesita el numero de seguimiento." };
  }

  const ahora = new Date().toISOString();
  await almacen.actualizarPedido(pedidoId, {
    estado: hacia,
    ...(hacia === "entregado" ? { entregadoEn: ahora } : {}),
    ...(hacia === "archivado" ? { archivadoEn: ahora } : {}),
  });

  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido",
    entidadId: pedidoId,
    accion: hacia,
    usuarioId: usuario.id,
    detalle: `${usuario.nombre}: ${transicion.etiqueta.toLowerCase()}`,
    creadoEn: ahora,
  });

  /*
    Una incidencia es lo unico de estos cambios que alguien mas tiene que saber
    YA: un paquete perdido o roto es un cliente esperando respuesta.
  */
  if (hacia === "incidencia") {
    avisarEvento({
      clave: `pedido:${pedidoId}:incidencia:${ahora}`,
      para: ["operacion", "dueno"],
      menos: usuario.id,
      aviso: {
        urgencia: "urgente",
        titulo: `#${pedido.numero}: incidencia`,
        cuerpo: `${usuario.nombre} reporto una incidencia con el envio de ${pedido.clienteNombre}.`,
        enlace: `/panel/pedido/${pedidoId}`,
      },
    });
  }

  revalidatePath("/panel");
  revalidatePath(`/panel/pedido/${pedidoId}`);
  confirmar(pedidoId, hacia);
}

/**
 * Registra lo que costo mandar un pedido, despues de haberlo enviado.
 *
 * Va separado de `marcarEnviado` a proposito. Preguntarlo antes estorbaba a la
 * prueba de los quince segundos, y ademas es el orden equivocado: el
 * comprobante del correo lo tiene Alfredo DESPUES de despachar, no antes.
 *
 * Es lo que hace que el grafico diga ganancia y no solo ventas, que fue la
 * decision de Adrian. Ver `docs/economia-nerowa.md` §6.
 */
export async function registrarCosteEnvio(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const pedidoId = String(datos.get("pedidoId") ?? "");
  const texto = String(datos.get("envioCoste") ?? "").trim();

  const valor = Number(texto.replace(",", "."));
  if (!texto || !Number.isFinite(valor) || valor < 0) {
    return { ok: false, mensaje: "Escribe cuanto costo, en euros." };
  }

  const pedido = await almacen.pedidoPorId(pedidoId);
  if (!pedido) return { ok: false, mensaje: "Ese pedido ya no existe." };

  const envioCoste = euros(valor);
  await almacen.actualizarPedido(pedidoId, { envioCoste });
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido",
    entidadId: pedidoId,
    accion: "coste-envio",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} anoto que el envio costo ${(envioCoste / 100).toFixed(2)} EUR`,
    creadoEn: new Date().toISOString(),
  });

  revalidatePath(`/panel/pedido/${pedidoId}`);
  confirmar(pedidoId, "coste");
}

/** El coste de envio de la ultima vez, para sugerirlo y no escribirlo cada vez. */
export async function ultimoCosteEnvio(): Promise<number | undefined> {
  await exigirUsuario();
  const pedidos = await servicios().almacen.listarPedidos();
  const conCoste = pedidos
    .filter((p) => p.envioCoste !== undefined && p.enviadoEn)
    .sort((a, b) => (b.enviadoEn ?? "").localeCompare(a.enviadoEn ?? ""));
  return conCoste[0]?.envioCoste;
}

/* --------------------------------------------------------------------------
   Registrar una venta a mano
   -------------------------------------------------------------------------- */

export interface ResultadoNuevo extends Resultado {
  /** Los colores que no llegan, para que la persona decida si vende igual. */
  faltantes?: { nombre: string; piden: number; hay: number }[];
}

/** Lee un importe escrito por una persona: "217,80" o "217.80". */
function importe(texto: string): number | undefined {
  const limpio = texto.trim().replace(",", ".");
  if (!limpio) return undefined;
  const valor = Number(limpio);
  return Number.isFinite(valor) && valor >= 0 ? euros(valor) : undefined;
}

/**
 * Registra una venta que entro por mensaje directo, en persona o por telefono.
 *
 * Es la fase 7.1: el panel sirve desde hoy para lo que Alfredo ya vende sin la
 * tienda. El pedido entra como cualquier otro —"por enviar", con su numero—, y
 * cuando llegue Stripe los de la web caeran en la misma cola sin rehacer nada.
 *
 * LOS PRECIOS SE ESCRIBEN CON IVA, y se guardan sin el. Alfredo sabe lo que el
 * cliente le pago, no la base imponible; obligarlo a hacer la cuenta en la
 * calle es garantizar un error. El panel la hace con el IVA lituano.
 */
export async function crearPedidoManual(
  _anterior: ResultadoNuevo | undefined,
  datos: FormData,
): Promise<ResultadoNuevo> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();
  const texto = (campo: string) => String(datos.get(campo) ?? "").trim();

  const clienteNombre = texto("clienteNombre");
  if (!clienteNombre) return { ok: false, mensaje: "Falta el nombre de quien compro." };

  const linea1 = texto("linea1");
  const ciudad = texto("ciudad");
  const pais = texto("pais").toUpperCase();
  if (!linea1 || !ciudad) {
    return { ok: false, mensaje: "Falta la direccion: calle y ciudad, para la etiqueta." };
  }
  if (!/^[A-Z]{2}$/.test(pais)) {
    return { ok: false, mensaje: "El pais va en dos letras: LT, DE, FR…" };
  }

  const precioConIva = importe(texto("precio"));
  if (precioConIva === undefined || precioConIva === 0) {
    return { ok: false, mensaje: "Escribe cuanto pago por estuche, con IVA." };
  }
  const envioTexto = texto("envio");
  const envioConIva = envioTexto ? importe(envioTexto) : 0;
  if (envioConIva === undefined) {
    return { ok: false, mensaje: "El envio cobrado no es un numero valido." };
  }

  const [colores, lotes] = await Promise.all([almacen.listarColores(), almacen.listarLotes()]);
  /* Las unidades salen del lote mas reciente: es el que esta en el estante. */
  const loteId = [...lotes].sort((a, b) => b.llegadaEn.localeCompare(a.llegadaEn))[0]?.id;
  const precioUnitario = sinIva(precioConIva, IVA_LITUANIA);

  const lineas: LineaPedido[] = [];
  for (const color of colores.filter((c) => c.activo)) {
    const valor = texto(`cantidad-${color.id}`);
    if (!valor) continue;
    const cantidad = Number(valor);
    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 99) {
      return { ok: false, mensaje: `La cantidad de ${color.nombre} no es valida.` };
    }
    if (cantidad > 0) lineas.push({ colorId: color.id, cantidad, precioUnitario, loteId });
  }
  if (lineas.length === 0) {
    return { ok: false, mensaje: "Pon cuantos estuches se llevo, y de que color." };
  }

  /*
    Si no hay cajas para servirlo, se AVISA y la persona decide. No se bloquea:
    puede que el conteo vaya atrasado o que el lote llegue manana, y un panel
    que no deja trabajar se deja de usar. Lo que no puede pasar es venderlo sin
    enterarse.
  */
  if (datos.get("venderIgual") !== "si") {
    const { existencias, conConteo } = await leerExistencias();
    if (conConteo) {
      const faltan = faltantesPara(existencias, lineas);
      if (faltan.length > 0) {
        const nombres = new Map(colores.map((c) => [c.id, c.nombre]));
        return {
          ok: false,
          mensaje: "No hay cajas suficientes para esta venta.",
          faltantes: faltan.map((f) => ({
            nombre: nombres.get(f.colorId) ?? f.colorId,
            piden: f.piden,
            hay: f.hay,
          })),
        };
      }
    }
  }

  const ahora = new Date().toISOString();
  const pedido: Pedido = {
    id: crypto.randomUUID(),
    numero: await almacen.siguienteNumeroPedido(),
    origen: "manual",
    estado: "pagado",
    clienteNombre,
    clienteCorreo: texto("clienteCorreo"),
    direccion: {
      nombre: clienteNombre,
      linea1,
      linea2: texto("linea2") || undefined,
      ciudad,
      codigoPostal: texto("codigoPostal"),
      pais,
      telefono: texto("telefono") || undefined,
    },
    lineas,
    envioCobrado: sinIva(envioConIva, IVA_LITUANIA),
    tipoIva: IVA_LITUANIA,
    pagadoEn: ahora,
    notaInterna: texto("nota") || undefined,
  };

  await almacen.crearPedido(pedido);
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "pedido",
    entidadId: pedido.id,
    accion: "creado",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} registro la venta a mano`,
    creadoEn: ahora,
  });

  const unidades = lineas.reduce((n, l) => n + l.cantidad, 0);
  const nombres = lineas
    .map((l) => colores.find((c) => c.id === l.colorId)?.nombre ?? l.colorId)
    .join(", ");
  avisarEvento({
    clave: `pedido:${pedido.id}:nuevo`,
    para: ["operacion", "dueno"],
    menos: usuario.id,
    aviso: {
      urgencia: "urgente",
      titulo: `Venta nueva #${pedido.numero}`,
      cuerpo: `${unidades} × ${nombres} para ${clienteNombre}, ${ciudad} (${pais}). La registro ${usuario.nombre}; esta ${NOMBRE_ESTADO.pagado.toLowerCase()}.`,
      enlace: `/panel/pedido/${pedido.id}`,
    },
  });

  revalidatePath("/panel");
  revalidatePath("/panel/existencias");
  redirect(`/panel/pedido/${pedido.id}?hecho=creado`);
}
