"use client";

/*
  "¿Cuanto costo mandarlo?", preguntado en el momento correcto: despues de
  marcar enviado, con el comprobante del correo en la mano.

  Trae sugerido el importe de la ultima vez, porque casi siempre es el mismo.
  Un toque si coincide, y escribirlo solo cuando cambie.

  El exito no se pinta aqui: la accion redirige y lo confirma la franja de
  `Confirmacion`. Si se pintara aqui, no se veria — al anotar el coste este
  bloque deja de dibujarse.
*/

import { useActionState } from "react";

import { registrarCosteEnvio, type Resultado } from "../pedido/acciones";

export function CosteEnvio({
  pedidoId,
  sugerido,
}: {
  pedidoId: string;
  /** En centimos, o `undefined` si todavia no hay ningun envio anotado. */
  sugerido?: number;
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    registrarCosteEnvio,
    undefined,
  );

  const enEuros = sugerido !== undefined ? (sugerido / 100).toFixed(2).replace(".", ",") : "";

  return (
    <form
      action={accion}
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
    >
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <label htmlFor="envioCoste" className="t-label mb-2 block">
        ¿Cuanto costo mandarlo?
      </label>
      <p className="mb-3 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
        Sin este dato, la ganancia de este pedido es una estimacion.
      </p>
      <div className="flex gap-2">
        <input
          id="envioCoste"
          name="envioCoste"
          className="panel-campo"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={enEuros}
          placeholder="16,40"
          required
        />
        <button
          type="submit"
          className="panel-boton panel-boton-principal panel-boton-compacto"
          disabled={enCurso}
        >
          {enCurso ? "…" : "Anotar"}
        </button>
      </div>
      {resultado && !resultado.ok ? (
        <p role="status" className="mt-2 text-[0.875rem]" style={{ color: "#f6b3ad" }}>
          ✕ {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
