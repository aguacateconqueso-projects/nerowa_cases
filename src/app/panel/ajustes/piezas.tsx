"use client";

/*
  Las partes con botones de la pantalla de Ajustes.
*/

import { useActionState, useState, useTransition } from "react";

import type { ChatVisto } from "@/lib/panel/adaptadores/avisos-telegram";
import type { AjustesPanel, ClaveAjuste, DescripcionAjuste } from "@/lib/panel/dominio/ajustes";
import type { ResultadoRevision } from "@/lib/panel/vigia";

import {
  buscarMisChats,
  guardarAjustesPanel,
  guardarMiChat,
  mandarmeUnaPrueba,
  revisarAhora,
  type Resultado,
} from "./acciones";

function Mensaje({ r }: { r?: { ok: boolean; mensaje: string } }) {
  if (!r) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-lg px-3 py-2 text-[0.9375rem]"
      style={r.ok ? { background: "#12301e", color: "#9fe0b8" } : { background: "#3a1512", color: "#f6b3ad" }}
    >
      {r.ok ? "✓" : "✕"} {r.mensaje}
    </p>
  );
}

/* --------------------------------------------------------------------------
   Plazos
   -------------------------------------------------------------------------- */

export function FormularioPlazos({
  ajustes,
  descripciones,
}: {
  ajustes: AjustesPanel;
  descripciones: [ClaveAjuste, DescripcionAjuste][];
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    guardarAjustesPanel,
    undefined,
  );
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(ajustes).map(([k, v]) => [k, String(v)])),
  );

  return (
    <form action={accion} className="grid gap-3">
      {descripciones.map(([clave, d]) => (
        <div
          key={clave}
          className="flex items-center gap-3 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        >
          <label htmlFor={clave} className="min-w-0 flex-1">
            <span className="block text-[1rem]">{d.etiqueta}</span>
            <span className="block text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
              {d.ayuda}
            </span>
          </label>
          <input
            id={clave}
            name={clave}
            className="panel-campo"
            style={{ width: "4.5rem", textAlign: "center" }}
            inputMode="numeric"
            pattern="[0-9]*"
            value={valores[clave] ?? ""}
            onChange={(e) => setValores((v) => ({ ...v, [clave]: e.target.value }))}
          />
          <span className="w-10 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            {d.unidad}
          </span>
        </div>
      ))}
      <Mensaje r={resultado && !resultado.ok ? resultado : undefined} />
      <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
        {enCurso ? "Guardando…" : "Guardar los plazos"}
      </button>
    </form>
  );
}

/* --------------------------------------------------------------------------
   Telegram
   -------------------------------------------------------------------------- */

export function ConectarTelegram({
  chatActual,
  conToken,
}: {
  chatActual?: string;
  conToken: boolean;
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    guardarMiChat,
    undefined,
  );
  const [chat, setChat] = useState(chatActual ?? "");
  const [chats, setChats] = useState<ChatVisto[]>();
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string }>();
  const [ocupado, empezar] = useTransition();

  return (
    <div className="grid gap-3">
      <form action={accion} className="grid gap-3">
        <label htmlFor="chat" className="t-label block" style={{ color: "var(--panel-tenue)" }}>
          Tu numero de chat de Telegram
        </label>
        <div className="flex gap-2">
          <input
            id="chat"
            name="chat"
            className="panel-campo"
            inputMode="numeric"
            placeholder="Sin guardar"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
          />
          <button
            type="submit"
            className="panel-boton panel-boton-suave"
            style={{ width: "auto" }}
            disabled={enCurso}
          >
            Guardar
          </button>
        </div>
      </form>

      {conToken ? (
        <button
          type="button"
          className="panel-boton panel-boton-suave"
          disabled={ocupado}
          onClick={() =>
            empezar(async () => {
              const r = await buscarMisChats();
              if (r.ok) {
                setChats(r.chats);
                setAviso(undefined);
              } else {
                setChats(undefined);
                setAviso({ ok: false, mensaje: r.motivo });
              }
            })
          }
        >
          {ocupado ? "Buscando…" : "Buscar mi chat"}
        </button>
      ) : null}

      {chats ? (
        <ul className="grid gap-2">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="panel-boton panel-boton-suave"
                onClick={() => setChat(c.id)}
              >
                Soy {c.nombre} ({c.id})
              </button>
            </li>
          ))}
          <li className="text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            Toca tu nombre y despues &quot;Guardar&quot;.
          </li>
        </ul>
      ) : null}

      <button
        type="button"
        className="panel-boton panel-boton-suave"
        disabled={ocupado}
        onClick={() => empezar(async () => setAviso(await mandarmeUnaPrueba()))}
      >
        Mandarme un aviso de prueba
      </button>

      <Mensaje r={resultado} />
      <Mensaje r={aviso} />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Revisar ahora
   -------------------------------------------------------------------------- */

const RESUMEN: Record<ResultadoRevision["resumen"], string> = {
  enviado: "El resumen de hoy salio ahora.",
  "nada-pendiente": "Hoy no hay nada pendiente: el resumen no se manda.",
  "ya-salio": "El resumen de hoy ya habia salido.",
  "todavia-no-es-la-hora": "El resumen de hoy todavia no toca.",
};

export function RevisarAhora() {
  const [r, setR] = useState<Awaited<ReturnType<typeof revisarAhora>>>();
  const [ocupado, empezar] = useTransition();

  return (
    <div className="grid gap-3">
      <button
        type="button"
        className="panel-boton panel-boton-suave"
        disabled={ocupado}
        onClick={() => empezar(async () => setR(await revisarAhora()))}
      >
        {ocupado ? "Revisando…" : "Revisar los avisos ahora"}
      </button>
      {r && !r.ok ? <Mensaje r={{ ok: false, mensaje: r.motivo }} /> : null}
      {r && r.ok ? (
        <div
          role="status"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{ background: "var(--panel-tarjeta)", border: "1px solid var(--panel-borde)" }}
        >
          <p>
            {r.resultado.alertas === 0
              ? "No hay nada que avisar."
              : `${r.resultado.alertas} ${r.resultado.alertas === 1 ? "cosa pendiente" : "cosas pendientes"}; ${
                  r.resultado.enviados.length === 0
                    ? "todas ya se habian avisado."
                    : `${r.resultado.enviados.length} avisadas ahora.`
                }`}
          </p>
          {r.resultado.enviados.map((e) => (
            <p key={e.clave} className="mt-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
              → {e.titulo} · a {e.para}
              {e.reintentar ? " · fallo, se reintenta" : e.canales.includes("telegram") ? " · Telegram" : " · solo registro"}
            </p>
          ))}
          <p className="mt-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            {RESUMEN[r.resultado.resumen]}
          </p>
        </div>
      ) : null}
    </div>
  );
}
