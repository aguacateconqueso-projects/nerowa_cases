"use client";

/*
  Subir la foto del recibo despues de haber marcado enviado. Sirve igual para
  un pedido de la web que para uno de tienda.
*/

import { startTransition, useActionState, useState } from "react";

import { subirRecibo, type Resultado } from "../pedido/acciones";

import { CampoRecibo } from "./campo-recibo";

export function SubirRecibo({
  entidad,
  entidadId,
  hayAlguno,
}: {
  entidad: "pedido" | "pedido-mayorista";
  entidadId: string;
  /** Si ya hay recibo, esto es "subir otro"; si no, es lo que falta. */
  hayAlguno: boolean;
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    subirRecibo,
    undefined,
  );
  const [recibo, setRecibo] = useState<File | null>(null);
  /* Cambiar la clave vacia el campo despues de subir, sin estado de mas. */
  const [vuelta, setVuelta] = useState(0);

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!recibo) return;
        const datos = new FormData();
        datos.set("entidad", entidad);
        datos.set("entidadId", entidadId);
        datos.set("recibo", recibo, recibo.name);
        startTransition(() => accion(datos));
        setVuelta((v) => v + 1);
        setRecibo(null);
      }}
    >
      <CampoRecibo
        key={vuelta}
        alElegir={setRecibo}
        opcional={false}
        etiqueta={hayAlguno ? "Anadir otra foto" : "Falta la foto del recibo del correo"}
      />
      {recibo ? (
        <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
          {enCurso ? "Subiendo…" : "Guardar la foto"}
        </button>
      ) : null}
      {resultado && !resultado.ok ? (
        <p
          role="status"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{ background: "#3a1512", color: "#f6b3ad" }}
        >
          ✕ {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
