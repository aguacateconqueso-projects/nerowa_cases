/*
  Entrar al panel. Sin contrasena: un enlace de un solo uso al correo.

  El razonamiento esta en `docs/panel-nerowa.md` §10: Alfredo no va a recordar
  una contrasena, va a terminar anotada en algun sitio, y eso es peor que no
  tenerla. La sesion dura tres meses, asi que en la practica entra una vez.
*/

import { redirect } from "next/navigation";

import { entradaSinCorreo } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { FormularioEntrada } from "./formulario";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PantallaEntrar() {
  if (await usuarioActual()) redirect("/panel");

  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <div className="w-full max-w-sm">
        <h1 className="t-heading text-2xl">Panel de Nerowa</h1>
        <p className="mt-2 mb-6 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          Escribe tu correo y te mandamos un enlace para entrar. No hay contrasena
          que recordar.
        </p>
        <FormularioEntrada modoDemo={entradaSinCorreo()} />
      </div>
    </div>
  );
}
