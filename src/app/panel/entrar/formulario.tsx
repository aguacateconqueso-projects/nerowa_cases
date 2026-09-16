"use client";

import { useActionState } from "react";

import { entrarAlPanel, type ResultadoEntrada } from "./acciones";

export function FormularioEntrada({ correos }: { correos: string[] }) {
  const [resultado, accion, enCurso] = useActionState<
    ResultadoEntrada | undefined,
    FormData
  >(entrarAlPanel, undefined);

  return (
    <form action={accion} className="grid gap-3">
      <div>
        <label htmlFor="correo" className="t-label mb-2 block">
          Tu correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          className="panel-campo"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          /*
            El navegador y el gestor de claves del telefono rellenan los dos
            campos solos si se los nombra como toca. En un telefono, de pie, eso
            es la diferencia entre entrar de un toque y escribir veinte letras.
          */
          list="correos-panel"
          required
        />
        {/* Los correos que valen, para elegirlos en vez de escribirlos. */}
        <datalist id="correos-panel">
          {correos.map((correo) => (
            <option key={correo} value={correo} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="clave" className="t-label mb-2 block">
          Clave
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          className="panel-campo"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
        {enCurso ? "Entrando…" : "Entrar"}
      </button>

      {resultado ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{ background: "#3a1512", color: "#f6b3ad" }}
        >
          ✕ {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
