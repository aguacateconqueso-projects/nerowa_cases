"use server";

/*
  Ajustes de los avisos y la conexion con Telegram.

  La sesion se comprueba en la primera linea de cada accion, como en todas.
*/

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { chatsRecientes, type ChatVisto } from "@/lib/panel/adaptadores/avisos-telegram";
import {
  type AjustesPanel,
  CLAVES_AJUSTE,
  completarAjustes,
  validarAjuste,
} from "@/lib/panel/dominio/ajustes";
import { servicios } from "@/lib/panel/servicios";
import { exigirUsuario } from "@/lib/panel/sesion";
import { avisoDePrueba, revisarAvisos, type ResultadoRevision } from "@/lib/panel/vigia";

export interface Resultado {
  ok: boolean;
  mensaje: string;
}

export async function guardarAjustesPanel(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const cambio: Partial<AjustesPanel> = {};
  for (const clave of CLAVES_AJUSTE) {
    const v = validarAjuste(clave, datos.get(clave) ?? "");
    if (!v.ok) return { ok: false, mensaje: v.motivo };
    cambio[clave] = v.valor;
  }
  const final = completarAjustes(cambio);
  if (final.horasEscalada !== cambio.horasEscalada) {
    return {
      ok: false,
      mensaje: "Avisar a Adrian tiene que ser despues del recordatorio a Alfredo.",
    };
  }

  await almacen.guardarAjustes(cambio);
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "ajustes",
    entidadId: "avisos",
    accion: "guardar",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} cambio los ajustes: ${CLAVES_AJUSTE.map((c) => `${c}=${cambio[c]}`).join(", ")}`,
    creadoEn: new Date().toISOString(),
  });

  revalidatePath("/panel", "layout");
  redirect("/panel/ajustes?hecho=e-ajustes");
}

/* --------------------------------------------------------------------------
   Telegram
   -------------------------------------------------------------------------- */

export async function buscarMisChats(): Promise<
  { ok: true; chats: ChatVisto[] } | { ok: false; motivo: string }
> {
  await exigirUsuario();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, motivo: "Falta poner TELEGRAM_BOT_TOKEN en Vercel." };
  }
  const r = await chatsRecientes(token);
  if (r.ok && r.chats.length === 0) {
    return {
      ok: false,
      motivo:
        "El bot no tiene mensajes recientes. Abrelo en Telegram, mandale cualquier cosa y vuelve a buscar.",
    };
  }
  return r;
}

export async function guardarMiChat(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const chat = String(datos.get("chat") ?? "").trim();
  /* Los chats de Telegram son numeros, con signo para los grupos. */
  if (chat && !/^-?\d{3,20}$/.test(chat)) {
    return { ok: false, mensaje: "Eso no parece un numero de chat de Telegram." };
  }
  await servicios().almacen.actualizarUsuario(usuario.id, {
    telegramChatId: chat || null,
  });
  revalidatePath("/panel/ajustes");
  return {
    ok: true,
    mensaje: chat
      ? "Chat guardado. Prueba a mandarte un aviso."
      : "Chat quitado: ya no te llegan avisos por Telegram.",
  };
}

export async function mandarmeUnaPrueba(): Promise<Resultado> {
  const usuario = await exigirUsuario();
  /* Se relee: el chat se acaba de guardar y la sesion trae la copia de antes. */
  const fresco = (await servicios().almacen.usuarioPorId(usuario.id)) ?? usuario;
  const r = await avisoDePrueba(fresco);
  if (r.canales.includes("telegram")) {
    return { ok: true, mensaje: "Enviado. Deberia haberte sonado el telefono." };
  }
  return {
    ok: false,
    mensaje: r.fallo
      ? `No salio por Telegram: ${r.fallo}`
      : "Solo quedo en el registro del servidor: falta conectar Telegram o guardar tu chat.",
  };
}

export async function revisarAhora(): Promise<
  { ok: true; resultado: ResultadoRevision } | { ok: false; motivo: string }
> {
  await exigirUsuario();
  try {
    const resultado = await revisarAvisos();
    revalidatePath("/panel/ajustes");
    return { ok: true, resultado };
  } catch (error) {
    return { ok: false, motivo: error instanceof Error ? error.message : String(error) };
  }
}
