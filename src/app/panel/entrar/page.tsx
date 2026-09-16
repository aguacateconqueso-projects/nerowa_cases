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

  /*
    Los correos que valen, para elegirlos en vez de escribirlos.

    Va en un `try` porque es un lujo, no un requisito: **si la base de datos no
    responde, esta pantalla tiene que seguir apareciendo**. Antes no lo hacia, y
    una base caida dejaba el panel entero con un "A server error occurred" desde
    la mismisima pantalla de entrada — sin forma de entrar ni de ver que pasaba.
  */
  let correos: string[] = [];
  try {
    correos = (await servicios().almacen.listarUsuarios()).map((u) => u.correo);
  } catch {
    /* Sin sugerencias, se escribe el correo a mano y se entra igual. */
  }

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
