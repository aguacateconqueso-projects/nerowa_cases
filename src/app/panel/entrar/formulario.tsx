"use client";

import Link from "next/link";
import { useActionState } from "react";

import { pedirEnlace, type ResultadoEntrada } from "./acciones";

export function FormularioEntrada({ modoDemo }: { modoDemo: boolean }) {
  const [resultado, accion, enCurso] = useActionState<ResultadoEntrada | undefined, FormData>(
    pedirEnlace,
    undefined,
  );

  return (
    <div className="grid gap-4">
      <form action={accion} className="grid gap-3">
        <label htmlFor="correo" className="t-label">
          Tu correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          className="panel-campo"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
          {enCurso ? "Enviando…" : "Mandarme el enlace"}
        </button>
      </form>

      {resultado ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{
            background: resultado.ok ? "#12301e" : "#3a1512",
            color: resultado.ok ? "#9fe0b8" : "#f6b3ad",
          }}
        >
          {resultado.mensaje}
        </p>
      ) : null}

      {modoDemo && resultado?.ruta ? (
        <Link href={resultado.ruta} className="panel-boton panel-boton-suave">
          Entrar (modo demostracion)
        </Link>
      ) : null}

      {modoDemo ? (
        <p className="text-[0.8125rem]" style={{ color: "var(--panel-aviso)" }}>
          Modo demostracion: todavia no hay proveedor de correo, asi que el enlace
          se enseña aqui en vez de mandarse. Correos de prueba:{" "}
          <strong>alfredo@nerowacases.com</strong> (operacion) y el de Adrian (dueno).
        </p>
      ) : null}
    </div>
  );
}
