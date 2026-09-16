import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { FormularioTienda } from "../../formulario-tienda";

export const metadata = { title: "Editar tienda" };
export const dynamic = "force-dynamic";

export default async function PantallaEditarTienda({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  const { id } = await params;
  const tienda = await servicios().almacen.tiendaPorId(id);
  if (!tienda) notFound();

  return (
    <div>
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link
          href={`/panel/tiendas/${tienda.id}`}
          className="t-label"
          style={{ color: "var(--panel-tenue)" }}
        >
          ◂ {tienda.nombre}
        </Link>
      </header>
      <h1 className="t-heading mb-5 text-2xl">Editar tienda</h1>
      <FormularioTienda tienda={tienda} />
    </div>
  );
}
