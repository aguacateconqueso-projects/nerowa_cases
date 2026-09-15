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

import { euros } from "@/lib/panel/dominio/dinero";
import { puedeTransitar } from "@/lib/panel/dominio/estados";
import type { EstadoPedido } from "@/lib/panel/dominio/tipos";
import { servicios } from "@/lib/panel/servicios";
import { exigirUsuario } from "@/lib/panel/sesion";

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
  const seguimiento = String(datos.get("seguimiento") ?? "").trim();
  const costeTexto = String(datos.get("envioCoste") ?? "").trim();

  if (!seguimiento) {
    return { ok: false, mensaje: "Falta el numero de seguimiento." };
  }

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

  const ahora = new Date().toISOString();
  await almacen.actualizarPedido(pedidoId, {
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
    Aqui van, cuando existan: el correo al cliente con el seguimiento y el aviso
    al otro. Los puertos ya estan (`servicios().correo` y `.avisos`); lo que
    falta son las cuentas. Fase 7.2 y 7.3.
  */

  revalidatePath("/panel");
  revalidatePath(`/panel/pedido/${pedidoId}`);
  confirmar(pedidoId, "enviado");
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
