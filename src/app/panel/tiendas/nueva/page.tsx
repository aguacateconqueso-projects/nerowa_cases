import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/panel/sesion";

import { FormularioTienda } from "../formulario-tienda";

export const metadata = { title: "Nueva tienda" };
export const dynamic = "force-dynamic";

export default async function PantallaNuevaTienda() {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  return (
    <div>
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel/tiendas" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Tiendas
        </Link>
      </header>
      <h1 className="t-heading mb-5 text-2xl">Nueva tienda</h1>
      <FormularioTienda />
    </div>
  );
}
