/*
  Avisos por Telegram: el canal principal de lo urgente.

  Por que Telegram y no la notificacion web, dicho en `docs/panel-nerowa.md`
  §4.1: Alfredo usa iPhone, y ahi la notificacion web solo existe si el panel
  esta instalado en la pantalla de inicio — y se apaga en silencio si lo quita.
  Telegram es una app nativa que ya vibra, es gratis, y el aviso llega aunque
  el panel no este ni abierto.

  COMO SE CONECTA (lo que hay que hacer una vez, fuera del codigo)

    1. En Telegram, hablarle a @BotFather, `/newbot`, y guardar el token.
    2. Ponerlo en Vercel como TELEGRAM_BOT_TOKEN y PANEL_AVISOS=telegram.
    3. Cada uno abre el bot y le manda cualquier mensaje.
    4. En el panel, Admin → Avisos, cada uno toca "Buscar mi chat" y guarda el
       suyo. Desde ahi, "Mandarme un aviso de prueba" confirma que llega.

  LO QUE NO HACE NUNCA: LANZAR

  Un aviso que falla no puede tumbar la accion que lo disparo. Si Telegram no
  contesta, el pedido se marca enviado igual; el aviso se queda en el registro
  del servidor y `canales` lo dice, para que quien lo llama pueda reintentar.

  VA SIN `server-only` para poder probarlo con un `fetch` falso, igual que los
  otros archivos de `adaptadores/postgres/` que tienen prueba.
*/

import type { Rol, Usuario } from "../dominio/tipos";
import type { Aviso, Avisos } from "../puertos/avisos";

export interface OpcionesTelegram {
  token: string;
  /**
   * Chat de respaldo por rol, por si la persona aun no guardo el suyo en el
   * panel. Sale de PANEL_TELEGRAM_OPERACION y PANEL_TELEGRAM_DUENO.
   */
  chatPorRol?: Partial<Record<Rol, string>>;
  /** La direccion del panel, para que el aviso se abra de un toque. */
  urlPanel?: string;
  /** Para las pruebas. En produccion, el `fetch` de siempre. */
  fetch?: typeof fetch;
  /** Donde se deja constancia de todo, salga o no. */
  respaldo: Avisos;
  /** Cuanto se espera a Telegram antes de darlo por fallido. */
  esperaMs?: number;
}

/** Telegram con `parse_mode: HTML` solo pide escapar estos tres. */
function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function textoDelAviso(aviso: Aviso, urlPanel?: string): string {
  const partes = [`<b>${escapar(aviso.titulo)}</b>`, escapar(aviso.cuerpo)];
  if (aviso.enlace && urlPanel) {
    const url = new URL(aviso.enlace, urlPanel).toString();
    partes.push(`<a href="${escapar(url)}">Abrir en el panel</a>`);
  }
  return partes.join("\n\n");
}

export function crearAvisosTelegram(o: OpcionesTelegram): Avisos {
  const llamar = o.fetch ?? fetch;
  const api = `https://api.telegram.org/bot${o.token}`;

  return {
    nombre: "telegram",

    describir() {
      return {
        listo: true,
        detalle:
          "Los avisos salen por Telegram a quien tenga su chat guardado. Los urgentes suenan; los demas llegan en silencio.",
      };
    },

    async avisar(a: Usuario, aviso: Aviso) {
      /* La constancia va siempre, salga o no por Telegram. */
      const { canales } = await o.respaldo.avisar(a, aviso);

      const chat = a.telegramChatId || o.chatPorRol?.[a.rol];
      if (!chat) {
        console.warn(
          `[aviso:telegram] ${a.nombre} no tiene chat de Telegram guardado; ` +
            "el aviso solo quedo en el registro.",
        );
        return { canales };
      }

      try {
        const respuesta = await llamar(`${api}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: chat,
            text: textoDelAviso(aviso, o.urlPanel),
            parse_mode: "HTML",
            /* "normal" llega sin sonar: se lee al abrir, no interrumpe. */
            disable_notification: aviso.urgencia !== "urgente",
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(o.esperaMs ?? 5000),
        });
        if (!respuesta.ok) {
          /* El cuerpo dice por que: "chat not found", "bot was blocked"... */
          const motivo = await respuesta.text().catch(() => "");
          console.error(
            `[aviso:telegram] Telegram contesto ${respuesta.status} para ${a.nombre}: ${motivo.slice(0, 200)}`,
          );
          return { canales, fallo: `Telegram contesto ${respuesta.status}: ${motivo.slice(0, 120)}` };
        }
        return { canales: [...canales, "telegram"] };
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        console.error(`[aviso:telegram] no se pudo mandar a ${a.nombre}: ${motivo}`);
        return { canales, fallo: motivo };
      }
    },
  };
}

export interface ChatVisto {
  id: string;
  nombre: string;
}

/**
 * Los chats que le escribieron al bot hace poco.
 *
 * Es como cada uno encuentra su numero de chat sin tener que saber que es eso:
 * le manda un mensaje al bot, toca "Buscar mi chat" en el panel y elige su
 * nombre. Telegram guarda esos mensajes 24 horas.
 */
export async function chatsRecientes(
  token: string,
  llamar: typeof fetch = fetch,
): Promise<{ ok: true; chats: ChatVisto[] } | { ok: false; motivo: string }> {
  try {
    const r = await llamar(`https://api.telegram.org/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(5000),
    });
    const datos = (await r.json()) as {
      ok: boolean;
      description?: string;
      result?: { message?: { chat?: { id: number; first_name?: string; last_name?: string; username?: string; title?: string } } }[];
    };
    if (!datos.ok) return { ok: false, motivo: datos.description ?? `Telegram contesto ${r.status}` };

    const vistos = new Map<string, ChatVisto>();
    for (const u of datos.result ?? []) {
      const c = u.message?.chat;
      if (!c) continue;
      const nombre =
        c.title ??
        ([c.first_name, c.last_name].filter(Boolean).join(" ") || (c.username ? `@${c.username}` : String(c.id)));
      vistos.set(String(c.id), { id: String(c.id), nombre });
    }
    return { ok: true, chats: [...vistos.values()] };
  } catch (error) {
    return { ok: false, motivo: error instanceof Error ? error.message : String(error) };
  }
}
