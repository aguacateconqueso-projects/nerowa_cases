"use client";

/*
  Un boton que mueve una de las tres pistas de un pedido mayorista.

  Los que piden escribir algo —el numero de factura, el de seguimiento— abren el
  campo al tocarlos en vez de tenerlo siempre a la vista: en la mayoria de las
  visitas a esta pantalla no se va a facturar nada, y un formulario abierto que
  casi nunca se usa es ruido encima de lo que si se mira.
*/

import { useActionState, useState } from "react";

import { avanzarPedidoMayorista, type Resultado } from "../acciones";

export function BotonAvanzar({
  pedidoId,
  pista,
  hacia,
  etiqueta,
  requiere,
  destructiva = false,
}: {
  pedidoId: string;
  pista: string;
  hacia: string;
  etiqueta: string;
  requiere?: "seguimiento" | "factura";
  destructiva?: boolean;
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    avanzarPedidoMayorista,
    undefined,
  );
  const [abierto, setAbierto] = useState(false);

  const campo = requiere === "factura" ? "referenciaFactura" : "seguimiento";
  const etiquetaCampo =
    requiere === "factura" ? "Numero de factura" : "Numero de seguimiento";

  if (destructiva) {
    /* Peso bajo y confirmacion: deshace algo y vive al lado de lo que avanza. */
    return (
      <form
        action={accion}
        onSubmit={(e) => {
          if (!window.confirm(`${etiqueta}. Esto no se deshace. ¿Seguro?`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <input type="hidden" name="pista" value={pista} />
        <input type="hidden" name="hacia" value={hacia} />
        <button
          type="submit"
          className="panel-boton panel-boton-suave"
          disabled={enCurso}
          style={{ color: "var(--panel-urgente)" }}
        >
          {enCurso ? "Un momento…" : etiqueta}
        </button>
        {resultado && !resultado.ok ? (
          <p role="status" className="mt-2 text-[0.875rem]" style={{ color: "#f6b3ad" }}>
            ✕ {resultado.mensaje}
          </p>
        ) : null}
      </form>
    );
  }

  if (requiere && !abierto) {
    return (
      <button
        type="button"
        className="panel-boton panel-boton-suave"
        onClick={() => setAbierto(true)}
      >
        {etiqueta}
      </button>
    );
  }

  return (
    <form action={accion} className="grid gap-2">
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="pista" value={pista} />
      <input type="hidden" name="hacia" value={hacia} />

      {requiere ? (
        <div>
          <label htmlFor={`${campo}-${hacia}`} className="t-label mb-2 block">
            {etiquetaCampo}
          </label>
          <input
            id={`${campo}-${hacia}`}
            name={campo}
            className="panel-campo"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={requiere === "factura" ? "2026-015" : "RA123456789LT"}
            autoFocus
            required
          />
        </div>
      ) : null}

      <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
        {enCurso ? "Un momento…" : etiqueta}
      </button>

      {resultado && !resultado.ok ? (
        <p role="status" className="text-[0.875rem]" style={{ color: "#f6b3ad" }}>
          ✕ {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
