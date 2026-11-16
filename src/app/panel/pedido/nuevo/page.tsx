/*
  Registrar una venta a mano. Fase 7.1.

  Para lo que Alfredo ya vende hoy por mensaje directo, en persona o por
  telefono. El pedido cae en la misma cola que los de la web: por enviar, con
  su numero, con sus avisos.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { conIva, IVA_LITUANIA } from "@/lib/panel/dominio/dinero";
import { PRECIO_PUBLICO } from "@/lib/panel/dominio/economia";
import { usuarioActual } from "@/lib/panel/sesion";
import { leerExistencias } from "@/lib/panel/situacion";

import { FormularioVenta } from "./formulario";

export const metadata = { title: "Venta a mano" };
export const dynamic = "force-dynamic";

export default async function PantallaVentaManual() {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  const { existencias, conConteo, colores } = await leerExistencias();
  const disponibles = Object.fromEntries(existencias.map((e) => [e.color.id, e.disponibles]));

  return (
    <div>
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Pedidos
        </Link>
      </header>
      <h1 className="t-heading mb-1 text-2xl">Venta a mano</h1>
      <p className="mb-5 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        Lo que se vendio por mensaje, en persona o por telefono. Entra en la cola
        de pedidos por enviar.
      </p>
      <FormularioVenta
        colores={colores.filter((c) => c.activo)}
        disponibles={conConteo ? disponibles : undefined}
        precioSugerido={conIva(PRECIO_PUBLICO, IVA_LITUANIA)}
      />
    </div>
  );
}
