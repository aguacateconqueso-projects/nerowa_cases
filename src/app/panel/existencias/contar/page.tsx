/*
  Contar el estante.

  Cada campo se compara con lo que el panel cree que hay en el estante —con las
  cajas vendidas y sin enviar dentro, porque siguen ahi— y solo se apunta la
  diferencia. Un color que no se cuenta (campo vacio) se queda como estaba:
  no contar no es contar cero.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/panel/sesion";
import { leerExistencias } from "@/lib/panel/situacion";

import { guardarConteo } from "../acciones";
import { FormularioCantidades } from "../formulario-cantidades";

export const metadata = { title: "Contar el estante" };
export const dynamic = "force-dynamic";

export default async function PantallaContar() {
  if (!(await usuarioActual())) redirect("/panel/entrar");
  const { existencias, conConteo } = await leerExistencias();

  return (
    <div>
      <header className="pt-4 pb-5">
        <Link href="/panel/existencias" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Existencias
        </Link>
      </header>
      <h1 className="t-heading mb-1 text-2xl">Contar el estante</h1>
      <p className="mb-5 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        Escribe cuantas cajas hay de cada color, contando tambien las que estan
        vendidas y sin enviar. Deja en blanco lo que no cuentes.
      </p>
      <FormularioCantidades
        accion={guardarConteo}
        filas={existencias.map((e) => ({
          id: e.color.id,
          nombre: e.color.nombre,
          hex: e.color.hex,
          pista: conConteo
            ? `El panel espera ${e.enEstante}${e.comprometidas > 0 ? ` (${e.comprometidas} por enviar)` : ""}`
            : e.comprometidas > 0
              ? `${e.comprometidas} vendidas sin enviar: cuentalas tambien`
              : undefined,
        }))}
        textoBoton="Guardar el conteo"
        motivo={{ etiqueta: "Nota (opcional)", ejemplo: "Conteo de fin de mes" }}
      />
    </div>
  );
}
