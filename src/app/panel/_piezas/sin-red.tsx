"use client";

/*
  El aviso de que no hay conexion.

  Por que importa aqui y no en la tienda: Alfredo empaqueta en un sitio con
  cobertura irregular, y la regla del diseno es que una accion nunca puede
  mentir diciendo que ya esta cuando no salio. Ver `docs/panel-nerowa.md` §11.3.

  Next 16 trae la deteccion y el reintento automatico de acciones de servidor
  bloqueadas: se enciende con `experimental.useOffline` en `next.config.ts`.
  Aqui solo se lee el estado para poder decirlo en pantalla.
*/

import { useOffline } from "next/offline";

export function SinRed() {
  const sinRed = useOffline();
  if (!sinRed) return null;

  return (
    <p className="panel-franja panel-franja-sinred" role="status" aria-live="polite">
      <span aria-hidden="true">●</span>
      <span>
        <strong>Sin conexion.</strong> Lo que marques queda en cola y se manda
        solo en cuanto vuelva la senal.
      </span>
    </p>
  );
}
