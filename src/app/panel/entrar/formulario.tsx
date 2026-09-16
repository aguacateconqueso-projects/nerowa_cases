"use client";

import Link from "next/link";
import { useActionState } from "react";

import { pedirEnlace, type ResultadoEntrada } from "./acciones";

export interface Acceso {
  nombre: string;
  rol: string;
  correos: string[];
}

export function FormularioEntrada({
  modoDemo,
  accesos,
}: {
  modoDemo: boolean;
  accesos: Acceso[];
}) {
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
        <div className="text-[0.8125rem]" style={{ color: "var(--panel-aviso)" }}>
          <p>
            Modo demostracion: todavia no hay proveedor de correo, asi que el
            enlace se enseña aqui en vez de mandarse. Correos que entran:
          </p>
          <ul className="mt-2 grid gap-2">
            {accesos.map((a) => (
              <li key={a.nombre}>
                <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
                  {a.nombre} · {a.rol}
                </span>
                <span className="mt-1 grid gap-1">
                  {a.correos.map((correo) => (
                    /* Se tocan y se rellenan solos: escribir un correo en un
                       telefono, de pie, es lo contrario de a prueba de tontos. */
                    <button
                      key={correo}
                      type="button"
                      className="rounded-lg px-2 py-1 text-start"
                      style={{ background: "var(--panel-tarjeta-alta)", color: "var(--gold-bright)" }}
                      onClick={() => {
                        const campo = document.getElementById("correo");
                        if (campo instanceof HTMLInputElement) {
                          campo.value = correo;
                          campo.focus();
                        }
                      }}
                    >
                      {correo}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
