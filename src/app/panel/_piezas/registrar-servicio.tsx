"use client";

/*
  Registra el trabajador de servicio del panel.

  Hace falta para dos cosas: que el panel se pueda instalar en la pantalla de
  inicio, y que pueda recibir notificaciones web. En iPhone las notificaciones
  SOLO existen si la aplicacion esta instalada, que es exactamente por que
  Telegram es el canal principal de lo urgente y esto es el extra.
  Ver `docs/panel-nerowa.md` §4.

  El archivo vive en `public/panel/sw.js` y no en otro sitio: el alcance de un
  trabajador de servicio no puede subir por encima de su propia carpeta, asi que
  para gobernar `/panel` tiene que estar dentro de `/panel`.
*/

import { useEffect } from "react";

export function RegistrarServicio() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/panel/sw.js", { scope: "/panel/", updateViaCache: "none" })
      .catch((error: unknown) => {
        /* Que falle no puede romper el panel: sin el, sigue funcionando todo
           menos instalarlo y las notificaciones. */
        console.warn("[panel] no se pudo registrar el trabajador de servicio", error);
      });
  }, []);

  return null;
}
