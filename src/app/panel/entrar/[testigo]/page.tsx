/*
  Canjea el enlace por una sesion y entra.

  El canje ocurre en una accion de servidor, no al dibujar la pagina: los
  clientes de correo abren los enlaces por su cuenta para previsualizarlos, y
  si el canje pasara con un GET, el enlace se gastaria antes de que Alfredo
  llegue a tocarlo.
*/

import { redirect } from "next/navigation";

import { canjearEnlace } from "@/lib/panel/sesion";

export const metadata = { title: "Entrando" };
export const dynamic = "force-dynamic";

export default async function PantallaCanje({
  params,
}: {
  params: Promise<{ testigo: string }>;
}) {
  const { testigo } = await params;

  async function entrar() {
    "use server";
    const usuario = await canjearEnlace(testigo);
    if (!usuario) redirect("/panel/entrar?caducado=1");
    redirect("/panel");
  }

  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <form action={entrar} className="w-full max-w-sm text-center">
        <h1 className="t-heading text-2xl">Ya casi</h1>
        <p className="mt-2 mb-6 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          Toca para entrar al panel.
        </p>
        <button type="submit" className="panel-boton panel-boton-principal">
          Entrar
        </button>
      </form>
    </div>
  );
}
