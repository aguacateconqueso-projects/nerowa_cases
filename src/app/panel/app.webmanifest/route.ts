/*
  El manifiesto que hace instalable el panel.

  Va aqui, bajo /panel, y NO en `app/manifest.ts`: ese se inyecta en todas las
  paginas del dominio, y el dominio sirve la tienda. Lo instalable tiene que ser
  el panel y solo el panel.

  `start_url` apunta a /panel a proposito: cuando Alfredo toca el icono de su
  pantalla de inicio, abre directamente en la cola de pedidos. No en una
  portada, no en un menu. Ver `docs/panel-nerowa.md` §6.1.
*/

import type { MetadataRoute } from "next";

export const dynamic = "force-static";

function manifiesto(): MetadataRoute.Manifest {
  return {
    name: "Nerowa — Panel",
    short_name: "Nerowa",
    description: "Control de pedidos, tiendas y administracion de Nerowa Cases.",
    /* El id fija la identidad de la aplicacion instalada: si algun dia cambia
       la ruta de arranque, el telefono no la trata como una app distinta. */
    id: "/panel",
    start_url: "/panel",
    scope: "/panel",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    lang: "es",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/panel/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/panel/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/panel/icono-mascara.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export function GET() {
  return Response.json(manifiesto(), {
    headers: {
      "content-type": "application/manifest+json",
      "cache-control": "public, max-age=3600",
    },
  });
}
