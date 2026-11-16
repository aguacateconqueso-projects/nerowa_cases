/*
  El adaptador de Telegram, con un `fetch` falso.

  Lo que importa: que un aviso NUNCA lance —un Telegram caido no puede impedir
  marcar un pedido enviado—, que distinga "fallo" de "no habia a donde
  mandarlo", y que el texto no se rompa con caracteres de HTML.
*/

import assert from "node:assert/strict";

import { crearAvisosConsola } from "../../adaptadores/avisos-consola";
import { chatsRecientes, crearAvisosTelegram, textoDelAviso } from "../../adaptadores/avisos-telegram";
import type { Usuario } from "../tipos";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const alfredo: Usuario = {
  id: "u-alfredo",
  nombre: "Alfredo",
  correo: "a@a",
  rol: "operacion",
  telegramChatId: "111",
  creadoEn: "2026-01-01T00:00:00.000Z",
};
const adrian: Usuario = { ...alfredo, id: "u-adrian", nombre: "Adrian", rol: "dueno", telegramChatId: undefined };

const aviso = {
  urgencia: "urgente" as const,
  titulo: "Venta <nueva> & urgente",
  cuerpo: "1 × Black",
  enlace: "/panel/pedido/abc",
};

type Llamada = { url: string; cuerpo: Record<string, unknown> };

function fetchFalso(responder: () => Response | Promise<Response>) {
  const llamadas: Llamada[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : {} });
    return responder();
  }) as unknown as typeof fetch;
  return { f, llamadas };
}

/* Silencia la consola mientras corre, para que la salida sea legible. */
const original = { info: console.info, warn: console.warn, error: console.error };
function callar() {
  console.info = console.warn = console.error = () => {};
}
function hablar() {
  Object.assign(console, original);
}

async function principal() {
  console.log("\nAvisos por Telegram");

  await comprueba("manda al chat de la persona, con el enlace y escapando el HTML", async () => {
    const { f, llamadas } = fetchFalso(() => new Response("{}", { status: 200 }));
    const avisos = crearAvisosTelegram({ token: "T", fetch: f, urlPanel: "https://x.app", respaldo: crearAvisosConsola() });
    callar();
    const r = await avisos.avisar(alfredo, aviso);
    hablar();
    assert.deepEqual(r.canales, ["consola", "telegram"]);
    assert.equal(llamadas[0]!.url, "https://api.telegram.org/botT/sendMessage");
    assert.equal(llamadas[0]!.cuerpo.chat_id, "111");
    assert.equal(llamadas[0]!.cuerpo.disable_notification, false);
    assert.match(String(llamadas[0]!.cuerpo.text), /Venta &lt;nueva&gt; &amp; urgente/);
    assert.match(String(llamadas[0]!.cuerpo.text), /https:\/\/x\.app\/panel\/pedido\/abc/);
  });

  await comprueba("lo normal llega en silencio", async () => {
    const { f, llamadas } = fetchFalso(() => new Response("{}", { status: 200 }));
    const avisos = crearAvisosTelegram({ token: "T", fetch: f, respaldo: crearAvisosConsola() });
    callar();
    await avisos.avisar(alfredo, { ...aviso, urgencia: "normal" });
    hablar();
    assert.equal(llamadas[0]!.cuerpo.disable_notification, true);
  });

  await comprueba("sin chat guardado usa el del rol; sin ninguno, no llama ni falla", async () => {
    const { f, llamadas } = fetchFalso(() => new Response("{}", { status: 200 }));
    const conRol = crearAvisosTelegram({ token: "T", fetch: f, chatPorRol: { dueno: "222" }, respaldo: crearAvisosConsola() });
    callar();
    await conRol.avisar(adrian, aviso);
    const sinNada = crearAvisosTelegram({ token: "T", fetch: f, respaldo: crearAvisosConsola() });
    const r = await sinNada.avisar(adrian, aviso);
    hablar();
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0]!.cuerpo.chat_id, "222");
    assert.deepEqual(r, { canales: ["consola"] });
  });

  await comprueba("si Telegram contesta error, no lanza y dice que fallo", async () => {
    const { f } = fetchFalso(() => new Response('{"description":"chat not found"}', { status: 400 }));
    const avisos = crearAvisosTelegram({ token: "T", fetch: f, respaldo: crearAvisosConsola() });
    callar();
    const r = await avisos.avisar(alfredo, aviso);
    hablar();
    assert.deepEqual(r.canales, ["consola"]);
    assert.match(r.fallo!, /400.*chat not found/);
  });

  await comprueba("si la red se cae, tampoco lanza", async () => {
    const { f } = fetchFalso(() => {
      throw new Error("ECONNRESET");
    });
    const avisos = crearAvisosTelegram({ token: "T", fetch: f, respaldo: crearAvisosConsola() });
    callar();
    const r = await avisos.avisar(alfredo, aviso);
    hablar();
    assert.equal(r.fallo, "ECONNRESET");
  });

  await comprueba("sin URL del panel, el aviso va sin enlace en vez de con uno roto", () => {
    assert.doesNotMatch(textoDelAviso(aviso), /href/);
  });

  await comprueba("buscar chats junta los que le escribieron al bot, sin repetir", async () => {
    const { f } = fetchFalso(
      () =>
        new Response(
          JSON.stringify({
            ok: true,
            result: [
              { message: { chat: { id: 111, first_name: "Alfredo" } } },
              { message: { chat: { id: 111, first_name: "Alfredo" } } },
              { message: { chat: { id: 222, first_name: "Adrian", last_name: "M" } } },
            ],
          }),
        ),
    );
    const r = await chatsRecientes("T", f);
    assert.deepEqual(r, {
      ok: true,
      chats: [
        { id: "111", nombre: "Alfredo" },
        { id: "222", nombre: "Adrian M" },
      ],
    });
  });

  console.log(`\n${hechas} comprobaciones de Telegram, todas en verde.\n`);
}

principal().catch((error) => {
  hablar();
  console.error("\n❌ Las comprobaciones de Telegram fallaron:\n", error);
  process.exit(1);
});
