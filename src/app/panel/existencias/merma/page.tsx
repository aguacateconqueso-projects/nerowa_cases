/*
  Una merma: cajas que salen del estante sin ser una venta. Una rota, una
  regalada a un musico, una que se quedo de muestra. Lleva motivo obligatorio:
  una caja que desaparece sin explicacion es lo que hace que un conteo no
  cuadre dentro de tres meses.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/panel/sesion";
import { leerExistencias } from "@/lib/panel/situacion";

import { registrarMerma } from "../acciones";
import { FormularioCantidades } from "../formulario-cantidades";

export const metadata = { title: "Merma" };
export const dynamic = "force-dynamic";

export default async function PantallaMerma() {
  if (!(await usuarioActual())) redirect("/panel/entrar");
  const { existencias, conConteo } = await leerExistencias();

  return (
    <div>
      <header className="pt-4 pb-5">
        <Link href="/panel/existencias" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Existencias
        </Link>
      </header>
      <h1 className="t-heading mb-1 text-2xl">Anotar una merma</h1>
      <p className="mb-5 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        Cajas que salen sin ser una venta. Se restan del estante.
      </p>
      <FormularioCantidades
        accion={registrarMerma}
        filas={existencias
          .filter((e) => e.color.activo)
          .map((e) => ({
            id: e.color.id,
            nombre: e.color.nombre,
            hex: e.color.hex,
            pista: conConteo ? `${e.enEstante} en el estante` : undefined,
          }))}
        textoBoton="Anotar la merma"
        motivo={{ etiqueta: "Que paso", ejemplo: "Golpeada en el envio, regalo a un musico…", requerido: true }}
      />
    </div>
  );
}
