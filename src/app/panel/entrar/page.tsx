/*
  Entrar al panel: correo y clave.

  Antes esto era un enlace de un solo uso al correo, que es mejor para Alfredo
  —no hay nada que recordar— pero necesita un proveedor de correo que todavia no
  existe. Sin el, el enlace habia que enseñarlo en pantalla, y la pantalla decia
  "le acaba de llegar un enlace" cuando no salia ningun correo: Adrian se quedo
  esperandolo y el panel no se pudo abrir.

  El porque de la clave, y lo que hay que cambiar antes de que haya datos
  reales, esta en `src/lib/panel/clave.ts`.
*/

import { redirect } from "next/navigation";

import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { FormularioEntrada } from "./formulario";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PantallaEntrar() {
  if (await usuarioActual()) redirect("/panel");

  /* Se sacan del almacen, no se escriben a mano: asi siguen siendo ciertos. */
  const correos = (await servicios().almacen.listarUsuarios()).map((u) => u.correo);

  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <div className="w-full max-w-sm">
        <h1 className="t-heading text-2xl">Panel de Nerowa</h1>
        <p className="mt-2 mb-6 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          Entra con tu correo y la clave del panel.
        </p>
        <FormularioEntrada correos={correos} />
      </div>
    </div>
  );
}
