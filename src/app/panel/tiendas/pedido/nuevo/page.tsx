import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TRAMOS_MAYORISTA } from "@/lib/panel/dominio/economia";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { FormularioPedido } from "./formulario";

export const metadata = { title: "Nuevo pedido" };
export const dynamic = "force-dynamic";

export default async function PantallaNuevoPedido({
  searchParams,
}: {
  searchParams: Promise<{ tienda?: string }>;
}) {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  const { tienda: tiendaId } = await searchParams;
  if (!tiendaId) redirect("/panel/tiendas");

  const { almacen } = servicios();
  const [tienda, colores] = await Promise.all([
    almacen.tiendaPorId(tiendaId),
    almacen.listarColores(),
  ]);
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
      <h1 className="t-heading mb-5 text-2xl">Nuevo pedido</h1>
      <FormularioPedido
        tienda={tienda}
        colores={colores.filter((c) => c.activo)}
        precioPorTramo={TRAMOS_MAYORISTA.map((t) => ({ desde: t.desde, precio: t.precio }))}
      />
    </div>
  );
}
