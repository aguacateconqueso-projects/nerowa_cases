/*
  El armazon del panel: la franja de estado, el contenido y la barra de tres
  pestanas abajo.

  Las pestanas contradicen a proposito la regla "sin pestanas" de
  `docs/estructura-web.md`, y esta razonado en `docs/panel-nerowa.md` §3: esa
  regla se escribio para seis pantallas de una sola funcion. Con tres areas
  distintas (ventas de la web, tiendas, administracion) las pestanas son la
  navegacion correcta. Lo que sigue en pie es la regla de dentro: cada tarea se
  resuelve en una sola pantalla.
*/

import type { Metadata, Viewport } from "next";

import "./panel.css";
import { BarraPestanas } from "./_piezas/barra-pestanas";
import { FranjaEstado } from "./_piezas/franja-estado";
import { RegistrarServicio } from "./_piezas/registrar-servicio";

export const metadata: Metadata = {
  title: {
    template: "%s · Panel Nerowa",
    default: "Panel Nerowa",
  },
  description: "Control de pedidos, tiendas y administracion de Nerowa Cases.",
  manifest: "/panel/app.webmanifest",
  /* El panel no es para nadie de fuera: que no lo indexe ningun buscador. */
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: {
    capable: true,
    title: "Nerowa",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/panel/icono-192.png", sizes: "192x192", type: "image/png" },
      { url: "/panel/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/panel/icono-apple.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  /*
    `viewportFit: cover` deja que la pagina llegue hasta el borde del iPhone;
    las variables `env(safe-area-inset-*)` de panel.css se encargan de que ni la
    barra de pestanas ni el contenido queden bajo la barra de gestos.
  */
  viewportFit: "cover",
};

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <FranjaEstado />
      <main className="panel-lienzo">{children}</main>
      <BarraPestanas />
      <RegistrarServicio />
    </div>
  );
}
