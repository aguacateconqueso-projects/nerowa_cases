/*
  Existencias: cuantas cajas hay de cada color, y cuantas de esas ya tienen
  dueno.

  El numero grande de cada fila es DISPONIBLES —lo que se puede vender hoy—,
  porque es la pregunta que se hace antes de vender. Debajo, mas pequeno, lo
  que deberia haber en el estante, que es con lo que se comprueba un conteo.
  La diferencia entre los dos numeros esta explicada en
  `src/lib/panel/dominio/existencias.ts`.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { NOMBRE_MOVIMIENTO, totalesDeExistencias } from "@/lib/panel/dominio/existencias";
import type { ExistenciasColor } from "@/lib/panel/dominio/existencias";
import { describirEspera, horasDesde } from "@/lib/panel/dominio/tiempo";
import { ahoraServidor } from "@/lib/panel/reloj";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";
import { leerSituacion } from "@/lib/panel/situacion";

import { Confirmacion } from "../_piezas/confirmacion";

export const metadata = { title: "Existencias" };
export const dynamic = "force-dynamic";

export default async function PantallaExistencias({
  searchParams,
}: {
  searchParams: Promise<{ hecho?: string }>;
}) {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  const [{ hecho }, ahora] = await Promise.all([searchParams, ahoraServidor()]);
  const [situacion, usuarios] = await Promise.all([
    leerSituacion(ahora),
    servicios().almacen.listarUsuarios(),
  ]);
  const { existencias, conConteo, movimientos, ajustes } = situacion;
  const totales = totalesDeExistencias(existencias);
  const nombres = new Map(situacion.colores.map((c) => [c.id, c.nombre]));
  const personas = new Map(usuarios.map((u) => [u.id, u.nombre]));

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Pedidos
        </Link>
      </header>

      <h1 className="t-heading text-2xl">Existencias</h1>
      <Confirmacion hecho={hecho} />

      {!conConteo ? (
        <section
          className="mt-4 rounded-xl border p-5"
          style={{ borderColor: "var(--panel-aviso)", background: "var(--panel-tarjeta)" }}
        >
          <p className="t-heading text-lg">Falta contar los estuches</p>
          <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
            El panel todavia no sabe cuantas cajas hay de cada color. Cuentalas
            una vez y desde ahi lleva la cuenta solo: cada venta descuenta, cada
            cancelacion devuelve.
          </p>
          <Link href="/panel/existencias/contar" className="panel-boton panel-boton-principal mt-4">
            Contar el estante
          </Link>
        </section>
      ) : (
        <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          <span className="t-figures" style={{ color: "var(--panel-texto)" }}>
            {totales.disponibles}
          </span>{" "}
          para vender · {totales.enEstante} en el estante
          {totales.comprometidas > 0 ? ` · ${totales.comprometidas} vendidas sin enviar` : ""}
          {totales.agotados > 0 ? ` · ${totales.agotados} agotados` : ""}
        </p>
      )}

      {conConteo ? (
        <ul className="mt-4 grid gap-2">
          {existencias.map((e) => (
            <li key={e.color.id}>
              <FilaColor e={e} />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 grid gap-2">
        {conConteo ? (
          <Link href="/panel/existencias/contar" className="panel-boton panel-boton-suave">
            Contar el estante
          </Link>
        ) : null}
        <Link href="/panel/existencias/entrada" className="panel-boton panel-boton-suave">
          Llego mercancia
        </Link>
        <Link href="/panel/existencias/merma" className="panel-boton panel-boton-suave">
          Anotar una merma (rota, regalada…)
        </Link>
      </div>

      <p className="mt-3 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
        Con {ajustes.umbralExistenciasBajas} o menos un color avisa. Se cambia en{" "}
        <Link href="/panel/ajustes" style={{ color: "var(--gold-bright)" }}>
          Ajustes
        </Link>
        .
      </p>

      {movimientos.length > 0 ? (
        <details className="mt-6">
          <summary className="t-label cursor-pointer py-2" style={{ color: "var(--panel-tenue)" }}>
            Ultimos movimientos ({Math.min(movimientos.length, 20)})
          </summary>
          <ul className="grid gap-2 pt-2">
            {movimientos.slice(0, 20).map((m) => (
              <li
                key={m.id}
                className="rounded-lg border px-3 py-2 text-[0.875rem]"
                style={{ borderColor: "var(--panel-borde)" }}
              >
                <div className="flex justify-between gap-3">
                  <span>
                    {NOMBRE_MOVIMIENTO[m.tipo]} · {nombres.get(m.colorId) ?? m.colorId}
                  </span>
                  <span className="t-figures">
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </span>
                </div>
                <div style={{ color: "var(--panel-tenue)" }}>
                  {personas.get(m.usuarioId) ?? "?"} · {describirEspera(horasDesde(m.creadoEn, ahora))}
                  {m.motivo ? ` · ${m.motivo}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function FilaColor({ e }: { e: ExistenciasColor }) {
  const color =
    e.nivel === "agotado"
      ? "var(--panel-urgente)"
      : e.nivel === "bajo"
        ? "var(--panel-aviso)"
        : "var(--panel-texto)";

  const detalle: string[] = [`${e.enEstante} en el estante`];
  if (e.comprometidas > 0) detalle.push(`${e.comprometidas} por enviar`);
  if (e.porConfirmar > 0) detalle.push(`${e.porConfirmar} de tiendas sin confirmar`);
  if (!e.color.activo) detalle.push("color retirado");

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-3 py-3"
      style={{
        borderColor: "var(--panel-borde)",
        background: "var(--panel-tarjeta)",
        borderInlineStartWidth: e.nivel === "bien" ? undefined : 4,
        borderInlineStartColor: e.nivel === "bien" ? undefined : color,
      }}
    >
      <span
        className="panel-muestra"
        style={{ background: e.color.hex, width: "1.75rem", height: "1.75rem" }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[1.0625rem]">{e.color.nombre}</p>
        <p className="text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          {detalle.join(" · ")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="t-figures t-heading text-xl" style={{ color }}>
          {e.faltan > 0 ? `−${e.faltan}` : e.disponibles}
        </p>
        <p className="t-label" style={{ color, fontSize: "0.6875rem" }}>
          {e.faltan > 0 ? "faltan" : e.nivel === "agotado" ? "agotado" : e.nivel === "bajo" ? "quedan pocas" : "disponibles"}
        </p>
      </div>
    </div>
  );
}
