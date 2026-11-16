"use client";

/*
  Un formulario de "cuantas de cada color", que sirve para las tres cosas que
  mueven cajas: contar el estante, recibir mercancia y anotar una merma.

  Campos controlados, por lo mismo que la venta a mano: si la accion vuelve con
  un error, lo que se tecleo con el pulgar no se puede perder.
*/

import Link from "next/link";
import { useActionState, useState } from "react";

import type { Resultado } from "./acciones";

export interface FilaCantidad {
  id: string;
  nombre: string;
  hex: string;
  /** Lo que se ve debajo del nombre: "El panel espera 12". */
  pista?: string;
}

export function FormularioCantidades({
  accion: hacer,
  filas,
  textoBoton,
  motivo,
  lotes,
}: {
  accion: (anterior: Resultado | undefined, datos: FormData) => Promise<Resultado>;
  filas: FilaCantidad[];
  textoBoton: string;
  motivo: { etiqueta: string; ejemplo: string; requerido?: boolean };
  /** Solo para las entradas: de que lote viene la mercancia. */
  lotes?: { id: string; nombre: string }[];
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    hacer,
    undefined,
  );
  const [valores, setValores] = useState<Record<string, string>>({
    loteId: lotes?.[lotes.length - 1]?.id ?? "",
  });
  const poner = (clave: string, valor: string) => setValores((v) => ({ ...v, [clave]: valor }));
  const alguno = filas.some((f) => (valores[`cantidad-${f.id}`] ?? "").trim() !== "");

  return (
    <form action={accion} className="grid gap-5 pb-4">
      {lotes && lotes.length > 0 ? (
        <div>
          <label htmlFor="loteId" className="t-label mb-1 block" style={{ color: "var(--panel-tenue)" }}>
            De que lote
          </label>
          <select
            id="loteId"
            name="loteId"
            className="panel-campo"
            value={valores.loteId}
            onChange={(e) => poner("loteId", e.target.value)}
          >
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
            <option value="">Sin lote (devolucion, otra cosa)</option>
          </select>
        </div>
      ) : null}

      <ul className="grid gap-2">
        {filas.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border px-3 py-2"
            style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
          >
            <span
              className="panel-muestra"
              style={{ background: f.hex, width: "1.75rem", height: "1.75rem" }}
              aria-hidden="true"
            />
            <label htmlFor={`cantidad-${f.id}`} className="flex-1">
              <span className="block text-[1.0625rem]">{f.nombre}</span>
              {f.pista ? (
                <span className="block text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
                  {f.pista}
                </span>
              ) : null}
            </label>
            <input
              id={`cantidad-${f.id}`}
              name={`cantidad-${f.id}`}
              className="panel-campo"
              style={{ width: "5rem", textAlign: "center" }}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="—"
              value={valores[`cantidad-${f.id}`] ?? ""}
              onChange={(e) => poner(`cantidad-${f.id}`, e.target.value)}
            />
          </li>
        ))}
      </ul>

      <div>
        <label htmlFor="motivo" className="t-label mb-1 block" style={{ color: "var(--panel-tenue)" }}>
          {motivo.etiqueta}
          {motivo.requerido ? <span aria-hidden="true"> *</span> : null}
        </label>
        <input
          id="motivo"
          name="motivo"
          className="panel-campo"
          placeholder={motivo.ejemplo}
          value={valores.motivo ?? ""}
          onChange={(e) => poner("motivo", e.target.value)}
        />
      </div>

      {resultado && !resultado.ok ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{ background: "#3a1512", color: "#f6b3ad" }}
        >
          ✕ {resultado.mensaje}
        </p>
      ) : null}

      <div className="panel-accion-anclada grid gap-2">
        <button
          type="submit"
          className="panel-boton panel-boton-principal"
          disabled={enCurso || !alguno}
        >
          {enCurso ? "Guardando…" : textoBoton}
        </button>
        <Link href="/panel/existencias" className="panel-boton panel-boton-suave">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
