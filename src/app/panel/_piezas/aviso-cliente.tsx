"use client";

/*
  "¿Le llego el numero al cliente?", con la respuesta y lo que hacer si no.

  Tres caminos, porque los clientes de Nerowa entran por tres sitios: la web
  (con correo), un mensaje de Instagram o WhatsApp (muchas veces sin correo), o
  en persona. El correo sale solo; para los otros dos, el mensaje ya escrito,
  a un toque de copiarlo o de abrirlo en WhatsApp.
*/

import { useActionState, useState } from "react";

import { corregirSeguimiento, reenviarSeguimiento, type Resultado } from "../pedido/acciones";

import { BotonCopiar } from "./copiar";

export type EstadoCorreo =
  | { tipo: "enviado"; detalle: string }
  | { tipo: "fallo"; detalle: string }
  | { tipo: "sin-correo" }
  | { tipo: "sin-conexion" }
  | { tipo: "pendiente" };

function Fallo({ r }: { r?: Resultado }) {
  if (!r || r.ok) return null;
  return (
    <p role="status" className="rounded-lg px-3 py-2 text-[0.9375rem]" style={{ background: "#3a1512", color: "#f6b3ad" }}>
      ✕ {r.mensaje}
    </p>
  );
}

export function AvisoCliente({
  pedidoId,
  seguimiento,
  estadoCorreo,
  mensaje,
  whatsapp,
}: {
  pedidoId: string;
  seguimiento: string;
  estadoCorreo: EstadoCorreo;
  /** El texto ya escrito para mandarlo a mano. */
  mensaje: string;
  whatsapp?: string;
}) {
  const [reenvio, reenviar, reenviando] = useActionState<Resultado | undefined, FormData>(
    reenviarSeguimiento,
    undefined,
  );
  const [correccion, corregir, corrigiendo] = useActionState<Resultado | undefined, FormData>(
    corregirSeguimiento,
    undefined,
  );
  const [nuevo, setNuevo] = useState(seguimiento);

  const linea = (() => {
    switch (estadoCorreo.tipo) {
      case "enviado":
        return { bien: true, texto: `✓ ${estadoCorreo.detalle}` };
      case "fallo":
        return { bien: false, texto: `✕ ${estadoCorreo.detalle}` };
      case "sin-correo":
        return { bien: false, texto: "Este cliente no tiene correo: mandale el mensaje por WhatsApp o Instagram." };
      case "sin-conexion":
        return { bien: false, texto: "Los correos al cliente todavia no estan conectados: mandale el mensaje a mano." };
      case "pendiente":
        return { bien: false, texto: "Al cliente todavia no se le mando el seguimiento." };
    }
  })();
  const puedeReenviar = estadoCorreo.tipo === "fallo" || estadoCorreo.tipo === "pendiente";

  return (
    <div className="grid gap-3">
      <p
        className="rounded-lg px-3 py-2 text-[0.9375rem]"
        style={linea.bien ? { background: "#12301e", color: "#9fe0b8" } : { background: "#3a2a12", color: "#f0cf95" }}
      >
        {linea.texto}
      </p>

      {puedeReenviar ? (
        <form action={reenviar}>
          <input type="hidden" name="pedidoId" value={pedidoId} />
          <button type="submit" className="panel-boton panel-boton-suave" disabled={reenviando}>
            {reenviando ? "Mandando…" : "Mandar el seguimiento por correo"}
          </button>
        </form>
      ) : null}
      <Fallo r={reenvio} />

      <div className="flex flex-wrap gap-2">
        <BotonCopiar texto={mensaje} etiqueta="Copiar mensaje para el cliente" />
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="panel-boton panel-boton-suave panel-boton-compacto"
          >
            Abrir en WhatsApp
          </a>
        ) : null}
      </div>

      <details>
        <summary className="t-label cursor-pointer py-2" style={{ color: "var(--panel-tenue)" }}>
          ¿El numero esta mal? Corregirlo
        </summary>
        <form action={corregir} className="grid gap-2 pt-2">
          <input type="hidden" name="pedidoId" value={pedidoId} />
          <input
            name="seguimiento"
            className="panel-campo"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            aria-label="Numero de seguimiento correcto"
          />
          <label className="flex items-center gap-3 text-[0.9375rem]">
            <input type="checkbox" name="avisar" value="si" defaultChecked className="h-6 w-6" />
            Mandarle al cliente el numero bueno
          </label>
          <button type="submit" className="panel-boton panel-boton-suave" disabled={corrigiendo}>
            {corrigiendo ? "Guardando…" : "Guardar el numero correcto"}
          </button>
          <Fallo r={correccion} />
        </form>
      </details>
    </div>
  );
}
