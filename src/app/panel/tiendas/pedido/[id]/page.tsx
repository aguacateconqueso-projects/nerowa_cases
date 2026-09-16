/*
  Un pedido de una tienda.

  Lo que lo diferencia de un pedido de la web: **cobro y envio se ven como dos
  pistas separadas**, porque en mayorista casi nunca pasan a la vez. Se envia y
  se cobra a treinta dias, o se cobra por adelantado y se manda cuando hay
  stock. Un solo estado lineal obligaria a mentir la mitad de las veces.
*/

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import {
  accionesDe,
  EXPLICACION_REGIMEN,
  NOMBRE_COBRO,
  NOMBRE_ENVIO,
  NOMBRE_ESTADO_MAYORISTA,
  totalesDe,
} from "@/lib/panel/dominio/mayorista";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { Confirmacion } from "../../../_piezas/confirmacion";
import { BotonAvanzar } from "../avanzar";

export const dynamic = "force-dynamic";

export default async function PantallaPedidoMayorista({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hecho?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");

  const [{ id }, { hecho }] = await Promise.all([params, searchParams]);
  const { almacen } = servicios();

  const pedido = await almacen.pedidoMayoristaPorId(id);
  if (!pedido) notFound();

  const [tienda, colores, apuntes] = await Promise.all([
    almacen.tiendaPorId(pedido.tiendaId),
    almacen.listarColores(),
    almacen.listarApuntes("pedido-mayorista", id),
  ]);

  const nombreColor = new Map(colores.map((c) => [c.id, c.nombre]));
  const hexColor = new Map(colores.map((c) => [c.id, c.hex]));
  const total = totalesDe(pedido);
  const acciones = accionesDe(pedido, usuario.rol);
  const avanzan = acciones.filter((a) => !a.destructiva);
  const deshacen = acciones.filter((a) => a.destructiva);

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link
          href={`/panel/tiendas/${pedido.tiendaId}`}
          className="t-label"
          style={{ color: "var(--panel-tenue)" }}
        >
          ◂ {tienda?.nombre ?? "Tienda"}
        </Link>
        <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
          #{pedido.numero}
        </span>
      </header>

      <Confirmacion hecho={hecho} />

      {/* Las tres pistas, de un vistazo */}
      <section className="mt-4 grid grid-cols-3 gap-2">
        <Pista
          titulo="Pedido"
          valor={NOMBRE_ESTADO_MAYORISTA[pedido.estado]}
          hecho={pedido.estado === "confirmado"}
          malo={pedido.estado === "cancelado"}
        />
        <Pista
          titulo="Cobro"
          valor={NOMBRE_COBRO[pedido.cobro]}
          hecho={pedido.cobro === "pagado"}
        />
        <Pista
          titulo="Envio"
          valor={NOMBRE_ENVIO[pedido.envio]}
          hecho={pedido.envio === "entregado"}
        />
      </section>

      {/* Que lleva */}
      <section
        className="mt-4 rounded-xl border p-4"
        style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
      >
        <ul className="grid gap-3">
          {pedido.lineas.map((linea) => (
            <li key={linea.colorId} className="flex items-center gap-3">
              <span
                className="panel-muestra"
                style={{
                  background: hexColor.get(linea.colorId) ?? "#666",
                  width: "2.25rem",
                  height: "2.25rem",
                }}
                aria-hidden="true"
              />
              <span className="flex-1">
                <span className="t-heading block text-lg">
                  {linea.cantidad} × {nombreColor.get(linea.colorId) ?? linea.colorId}
                </span>
                <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
                  {formatearEuros(linea.precioUnitario)} por unidad
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* La cuenta */}
      <section className="mt-4">
        <dl
          className="rounded-xl border p-4 text-[0.9375rem]"
          style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        >
          <Fila t={`${total.unidades} estuches`} v={formatearEuros(total.producto)} />
          {total.envio > 0 ? <Fila t="Envio" v={formatearEuros(total.envio)} /> : null}
          <Fila t="Base" v={formatearEuros(total.base)} />
          <Fila
            t={pedido.tipoIva > 0 ? `IVA (${pedido.tipoIva / 100}%)` : "IVA"}
            v={pedido.tipoIva > 0 ? formatearEuros(total.iva) : "no se cobra"}
          />
          <div
            className="mt-2 flex justify-between border-t pt-2"
            style={{ borderColor: "var(--panel-borde)" }}
          >
            <dt className="t-heading">Total de la factura</dt>
            <dd className="t-figures t-heading">{formatearEuros(total.total)}</dd>
          </div>
        </dl>
        <p
          className="mt-2 rounded-lg px-3 py-2 text-[0.8125rem]"
          style={{ background: "var(--panel-tarjeta-alta)", color: "var(--panel-tenue)" }}
        >
          {EXPLICACION_REGIMEN[pedido.regimenIva]}
        </p>
      </section>

      {/* Lo que se puede hacer. Lo que avanza arriba; lo que deshace, aparte. */}
      {avanzan.length > 0 ? (
        <section className="mt-6 grid gap-3">
          {avanzan.map((a) => (
            <BotonAvanzar
              key={`${a.pista}-${a.hacia}`}
              pedidoId={pedido.id}
              pista={a.pista}
              hacia={a.hacia}
              etiqueta={a.etiqueta}
              requiere={a.requiere}
            />
          ))}
        </section>
      ) : null}

      {deshacen.length > 0 ? (
        <details className="mt-8">
          <summary className="t-label cursor-pointer py-2" style={{ color: "var(--panel-tenue)" }}>
            Cancelar este pedido
          </summary>
          <div className="grid gap-2 pt-2">
            <p className="text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
              Un pedido cancelado no se puede reabrir. Queda anotado quien lo hizo.
            </p>
            {deshacen.map((a) => (
              <BotonAvanzar
                key={`${a.pista}-${a.hacia}`}
                pedidoId={pedido.id}
                pista={a.pista}
                hacia={a.hacia}
                etiqueta={a.etiqueta}
                requiere={a.requiere}
                destructiva
              />
            ))}
          </div>
        </details>
      ) : null}

      {(pedido.referenciaFactura || pedido.seguimiento) ? (
        <section className="mt-6 grid gap-2 text-[0.9375rem]">
          {pedido.referenciaFactura ? (
            <p>
              <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
                Factura{" "}
              </span>
              <span className="t-figures">{pedido.referenciaFactura}</span>
            </p>
          ) : null}
          {pedido.seguimiento ? (
            <p>
              <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
                Seguimiento{" "}
              </span>
              <span className="t-figures">{pedido.seguimiento}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {pedido.notas ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Notas
          </h2>
          <p className="text-[0.9375rem]">{pedido.notas}</p>
        </section>
      ) : null}

      {apuntes.length > 0 ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Que ha pasado
          </h2>
          <ul className="grid gap-2 text-[0.875rem]" style={{ color: "var(--panel-tenue)" }}>
            {apuntes.map((a) => (
              <li key={a.id}>
                {new Date(a.creadoEn).toLocaleString("es-ES", { timeZone: "Europe/Vilnius" })} —{" "}
                {a.detalle}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Pista({
  titulo,
  valor,
  hecho,
  malo,
}: {
  titulo: string;
  valor: string;
  hecho: boolean;
  malo?: boolean;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: malo
          ? "var(--panel-urgente)"
          : hecho
            ? "var(--panel-bien)"
            : "var(--panel-borde)",
        background: "var(--panel-tarjeta)",
      }}
    >
      <p className="t-label" style={{ color: "var(--panel-tenue)" }}>
        {titulo}
      </p>
      <p
        className="mt-1 text-[0.9375rem] leading-tight"
        style={{ color: malo ? "var(--panel-urgente)" : hecho ? "var(--panel-bien)" : undefined }}
      >
        {hecho ? "✓ " : ""}
        {valor}
      </p>
    </div>
  );
}

function Fila({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex justify-between py-1">
      <dt style={{ color: "var(--panel-tenue)" }}>{t}</dt>
      <dd className="t-figures">{v}</dd>
    </div>
  );
}
