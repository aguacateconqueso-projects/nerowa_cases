"use client";

/*
  Registrar un pedido de una tienda.

  La decision de diseno que manda aqui: **el precio se calcula y se enseña
  mientras se escribe**, porque el tramo depende del total de unidades y nadie
  tiene por que saberse de memoria que pasar de 15 a 16 estuches baja el precio
  de 110 a 100. Si el panel no lo dice, se descubre al facturar.
*/

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import type { Color, Tienda } from "@/lib/panel/dominio/tipos";

import { crearPedidoMayorista, type Resultado } from "../../acciones";

export function FormularioPedido({
  tienda,
  colores,
  precioPorTramo,
}: {
  tienda: Tienda;
  colores: Color[];
  /** Los tramos, ya resueltos en el servidor: [unidadesDesde, precio]. */
  precioPorTramo: { desde: number; precio: number }[];
}) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    crearPedidoMayorista,
    undefined,
  );
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [envio, setEnvio] = useState("");

  const unidades = useMemo(
    () => Object.values(cantidades).reduce((n, c) => n + (c || 0), 0),
    [cantidades],
  );

  const precioUnitario = useMemo(() => {
    if (tienda.precioPersonalizado) return tienda.precioPersonalizado;
    const tramo = precioPorTramo.find((t) => unidades >= t.desde);
    return tramo?.precio ?? precioPorTramo[precioPorTramo.length - 1]!.precio;
  }, [tienda.precioPersonalizado, precioPorTramo, unidades]);

  const envioCentimos = Math.round((Number(envio.replace(",", ".")) || 0) * 100);
  const base = precioUnitario * unidades + envioCentimos;

  return (
    <form action={accion} className="grid gap-5 pb-4">
      <input type="hidden" name="tiendaId" value={tienda.id} />

      <section>
        <h2 className="t-label mb-3" style={{ color: "var(--gold-bright)" }}>
          Cuantos de cada color
        </h2>
        <ul className="grid gap-2">
          {colores.map((color) => (
            <li
              key={color.id}
              className="flex items-center gap-3 rounded-xl border px-3 py-2"
              style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
            >
              <span
                className="panel-muestra"
                style={{ background: color.hex, width: "1.75rem", height: "1.75rem" }}
                aria-hidden="true"
              />
              <label htmlFor={`cantidad-${color.id}`} className="flex-1 text-[1.0625rem]">
                {color.nombre}
              </label>
              <input
                id={`cantidad-${color.id}`}
                name={`cantidad-${color.id}`}
                className="panel-campo"
                style={{ width: "5.5rem", textAlign: "center" }}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                onChange={(e) =>
                  setCantidades((c) => ({
                    ...c,
                    [color.id]: Number(e.target.value) || 0,
                  }))
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <label htmlFor="envioCobrado" className="t-label mb-2 block">
          Envio que se le cobra
        </label>
        <input
          id="envioCobrado"
          name="envioCobrado"
          className="panel-campo"
          inputMode="decimal"
          placeholder="60,00"
          value={envio}
          onChange={(e) => setEnvio(e.target.value)}
        />
      </section>

      <section>
        <label htmlFor="notas" className="t-label mb-2 block">
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          className="panel-campo"
          style={{ minHeight: "5rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
          placeholder="Lo que se hablo de este pedido."
        />
      </section>

      {/* El resumen, en vivo. Sin esto, el tramo se descubre al facturar. */}
      <section
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        aria-live="polite"
      >
        <dl className="grid gap-1 text-[0.9375rem]">
          <Fila t="Unidades" v={String(unidades)} />
          <Fila
            t="Precio por unidad"
            v={
              unidades === 0
                ? "—"
                : `${formatearEuros(precioUnitario)}${tienda.precioPersonalizado ? " (acordado)" : ""}`
            }
          />
          {envioCentimos > 0 ? <Fila t="Envio" v={formatearEuros(envioCentimos)} /> : null}
          <div
            className="mt-2 flex justify-between border-t pt-2"
            style={{ borderColor: "var(--panel-borde)" }}
          >
            <dt className="t-heading">Base, sin IVA</dt>
            <dd className="t-figures t-heading">{formatearEuros(base)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          El IVA se calcula al guardar, segun el pais y el numero de esta tienda.
        </p>
      </section>

      <div className="panel-accion-anclada grid gap-2">
        <button
          type="submit"
          className="panel-boton panel-boton-principal"
          disabled={enCurso || unidades === 0}
        >
          {enCurso ? "Guardando…" : "Registrar el pedido"}
        </button>
        <Link href={`/panel/tiendas/${tienda.id}`} className="panel-boton panel-boton-suave">
          Cancelar
        </Link>
      </div>

      {resultado && !resultado.ok ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{ background: "#3a1512", color: "#f6b3ad" }}
        >
          ✕ {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

function Fila({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: "var(--panel-tenue)" }}>{t}</dt>
      <dd className="t-figures">{v}</dd>
    </div>
  );
}
