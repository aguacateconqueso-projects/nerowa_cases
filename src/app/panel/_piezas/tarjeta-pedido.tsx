/*
  La tarjeta de un pedido en la lista.

  Lo que lleva y por que, en este orden: el color y la cantidad primero, porque
  es lo que Alfredo necesita para ir a buscar la caja; despues a donde va; y el
  reloj al final pero visible, porque el atraso no se esconde.
*/

import Link from "next/link";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import { NOMBRE_ESTADO } from "@/lib/panel/dominio/estados";
import { describirEspera, horasDesde, urgenciaDeEspera } from "@/lib/panel/dominio/tiempo";
import type { Color, Pedido } from "@/lib/panel/dominio/tipos";

export function TarjetaPedido({
  pedido,
  colores,
  ahora,
}: {
  pedido: Pedido;
  colores: Map<string, Color>;
  ahora: number;
}) {
  const horas = horasDesde(pedido.pagadoEn, ahora);
  const pendiente = pedido.estado === "pagado" || pedido.estado === "incidencia";
  const urgencia = pendiente ? urgenciaDeEspera(horas) : "baja";

  const unidades = pedido.lineas.reduce((n, l) => n + l.cantidad, 0);
  const total = pedido.lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);

  return (
    <Link
      href={`/panel/pedido/${pedido.id}`}
      className="panel-tarjeta"
      data-urgencia={urgencia}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {pedido.lineas.map((linea) => {
            const color = colores.get(linea.colorId);
            return (
              <span
                key={linea.colorId}
                className="panel-muestra"
                style={{
                  background: color?.hex ?? "#666",
                  width: "1.75rem",
                  height: "1.75rem",
                }}
                /* El color tambien va escrito abajo: nadie deberia depender de
                   distinguir un tono para saber que caja agarrar. */
                aria-hidden="true"
              />
            );
          })}
          <span className="t-heading text-lg">
            {unidades} × {pedido.lineas.map((l) => colores.get(l.colorId)?.nombre ?? l.colorId).join(", ")}
          </span>
        </div>
        <span className="t-label shrink-0" style={{ color: "var(--panel-tenue)" }}>
          #{pedido.numero}
        </span>
      </div>

      <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        {pedido.clienteNombre} · {pedido.direccion.ciudad}, {pedido.direccion.pais}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className="t-label"
          style={{
            color:
              urgencia === "alta"
                ? "var(--panel-urgente)"
                : urgencia === "media"
                  ? "var(--panel-aviso)"
                  : "var(--panel-tenue)",
          }}
        >
          {urgencia !== "baja" ? "⚠ " : ""}
          {describirEspera(horas)}
          {!pendiente ? ` · ${NOMBRE_ESTADO[pedido.estado]}` : ""}
        </span>
        <span className="t-figures text-base">{formatearEuros(total, { decimales: false })}</span>
      </div>
    </Link>
  );
}
