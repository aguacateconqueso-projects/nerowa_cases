/*
  Llego mercancia: un lote nuevo, o parte de uno, o una caja que volvio.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { registrarEntrada } from "../acciones";
import { FormularioCantidades } from "../formulario-cantidades";

export const metadata = { title: "Llego mercancia" };
export const dynamic = "force-dynamic";

export default async function PantallaEntrada() {
  if (!(await usuarioActual())) redirect("/panel/entrar");
  const { almacen } = servicios();
  const [colores, lotes] = await Promise.all([almacen.listarColores(), almacen.listarLotes()]);

  return (
    <div>
      <header className="pt-4 pb-5">
        <Link href="/panel/existencias" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Existencias
        </Link>
      </header>
      <h1 className="t-heading mb-1 text-2xl">Llego mercancia</h1>
      <p className="mb-5 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        Cuantas cajas nuevas de cada color. Se suman a lo que ya hay.
      </p>
      <FormularioCantidades
        accion={registrarEntrada}
        filas={colores
          .filter((c) => c.activo)
          .map((c) => ({ id: c.id, nombre: c.nombre, hex: c.hex }))}
        textoBoton="Registrar la entrada"
        motivo={{ etiqueta: "Nota (opcional)", ejemplo: "Segunda parte del lote, devolucion…" }}
        lotes={lotes.map((l) => ({ id: l.id, nombre: `Lote ${l.referencia} (${l.unidades} uds.)` }))}
      />
    </div>
  );
}
