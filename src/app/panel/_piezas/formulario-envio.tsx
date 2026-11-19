"use client";

/*
  El formulario que resuelve la prueba de aceptacion: pegar un numero de
  seguimiento y marcar enviado en menos de quince segundos, de pie y con una
  mano.

  Tres decisiones que le quitan segundos:
  - El campo se ofrece a rellenar con lo que haya en el portapapeles, que es de
    donde viene el numero: Alfredo lo copia de la aplicacion del correo.
  - El coste del envio NO se pregunta aqui. Se pregunta despues de marcar
    enviado, que es cuando Alfredo tiene el comprobante del correo en la mano —
    y ademas lo tapaba el boton anclado, que se vio mirando.
  - El boton dice lo que va a pasar y confirma que paso, con vibracion incluida.
*/

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { marcarEnviado, type Resultado } from "../pedido/acciones";

import { BotonRecibo } from "./campo-recibo";

export function FormularioEnvio({ pedidoId }: { pedidoId: string }) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    marcarEnviado,
    undefined,
  );
  const campo = useRef<HTMLInputElement>(null);
  const [sugerencia, setSugerencia] = useState<string | null>(null);
  /* La foto ya comprimida. Va aparte del formulario porque un `<input
     type=file>` no deja meterle un archivo distinto del que se eligio. */
  const [recibo, setRecibo] = useState<File | null>(null);

  useEffect(() => {
    if (resultado?.ok) navigator.vibrate?.([40, 30, 40]);
  }, [resultado]);

  /*
    Al tocar el campo se mira el portapapeles. Si lo que hay tiene pinta de
    codigo de seguimiento, se ofrece; no se pega solo, que meter texto ajeno en
    un campo sin permiso es peor que ahorrar un toque.
  */
  async function mirarPortapapeles() {
    try {
      const texto = (await navigator.clipboard.readText()).trim();
      if (/^[A-Z0-9]{8,24}$/i.test(texto) && texto !== campo.current?.value) {
        setSugerencia(texto);
      }
    } catch {
      /* El navegador puede negar la lectura. No pasa nada: se escribe a mano. */
    }
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        if (recibo) datos.set("recibo", recibo, recibo.name);
        startTransition(() => accion(datos));
      }}
    >
      <input type="hidden" name="pedidoId" value={pedidoId} />

      <div>
        <label htmlFor="seguimiento" className="t-label mb-2 block">
          Numero de seguimiento
        </label>
        <div className="flex gap-2">
          <input
            ref={campo}
            id="seguimiento"
            name="seguimiento"
            className="panel-campo"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="RA123456789LT"
            onFocus={mirarPortapapeles}
            required
          />
          <BotonRecibo alElegir={setRecibo} />
        </div>
        {sugerencia ? (
          <button
            type="button"
            className="t-label mt-2 block w-full rounded-lg px-3 py-2 text-start"
            style={{ background: "var(--panel-tarjeta-alta)", color: "var(--gold-bright)" }}
            onClick={() => {
              if (campo.current) campo.current.value = sugerencia;
              setSugerencia(null);
            }}
          >
            Pegar «{sugerencia}»
          </button>
        ) : null}
      </div>

      <div className="panel-accion-anclada">
        <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
          {enCurso ? (recibo ? "Subiendo el recibo…" : "Marcando…") : "Marcar enviado"}
        </button>
      </div>

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
          {resultado.ok ? "✓ " : "✕ "}
          {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
