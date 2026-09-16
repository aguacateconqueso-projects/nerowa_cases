"use client";

/*
  Un boton que cambia el estado de un pedido.

  Los correctivos piden confirmacion: son los que deshacen algo, y un toque
  accidental en un telefono es facil. Los normales no, porque pedir confirmacion
  para todo entrena a la gente a decir que si sin leer.
*/

import { useActionState, useEffect } from "react";

import { cambiarEstado, type Resultado } from "../pedido/acciones";
import type { EstadoPedido } from "@/lib/panel/dominio/tipos";

export function BotonEstado({
  pedidoId,
  hacia,
  etiqueta,
  confirmar = false,
}: {
  pedidoId: string;
  hacia: EstadoPedido;
  etiqueta: string;
  confirmar?: boolean;
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    cambiarEstado,
    undefined,
  );

  useEffect(() => {
    if (resultado?.ok) navigator.vibrate?.(40);
  }, [resultado]);

  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(`${etiqueta}. ¿Seguro?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="hacia" value={hacia} />
      <button
        type="submit"
        className={`panel-boton ${confirmar ? "panel-boton-suave" : "panel-boton-principal"}`}
        disabled={enCurso}
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
