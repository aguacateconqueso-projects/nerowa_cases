/*
  La ficha de una tienda.

  Arriba, lo unico que se mira todos los dias: cuanto debe y desde cuando.
  Despues sus pedidos, y al final sus datos — que se consultan cuando hace falta
  facturar, no cada vez que se abre la ficha.
*/

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import {
  deudaDe,
  EXPLICACION_REGIMEN,
  NOMBRE_COBRO,
  NOMBRE_ENVIO,
  NOMBRE_ESTADO_MAYORISTA,
  regimenDe,
  totalesDe,
} from "@/lib/panel/dominio/mayorista";
import { ahoraServidor } from "@/lib/panel/reloj";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { Confirmacion } from "../../_piezas/confirmacion";
import { BotonCopiar } from "../../_piezas/copiar";

export const dynamic = "force-dynamic";

export default async function PantallaTienda({
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

  const tienda = await almacen.tiendaPorId(id);
  if (!tienda) notFound();

  const [pedidos, colores, apuntes, ahora] = await Promise.all([
    almacen.listarPedidosMayoristas(id),
    almacen.listarColores(),
    almacen.listarApuntes("tienda", id),
    ahoraServidor(),
  ]);

  const nombreColor = new Map(colores.map((c) => [c.id, c.nombre]));
  const deuda = deudaDe(pedidos, tienda, ahora);
  const regimen = regimenDe(tienda);

  const confirmados = pedidos.filter((p) => p.estado === "confirmado");
  const unidades = confirmados.reduce((n, p) => n + totalesDe(p).unidades, 0);
  const facturado = confirmados.reduce((s, p) => s + totalesDe(p).base, 0);

  const datosFacturacion = [
    tienda.razonSocial ?? tienda.nombre,
    tienda.numeroIva,
    tienda.direccion.linea1,
    `${tienda.direccion.codigoPostal} ${tienda.direccion.ciudad}`,
    tienda.direccion.pais,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel/tiendas" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Tiendas
        </Link>
        <Link
          href={`/panel/tiendas/${tienda.id}/editar`}
          className="t-label"
          style={{ color: "var(--gold-bright)" }}
        >
          Editar
        </Link>
      </header>

      <Confirmacion hecho={hecho} />

      <h1 className="t-heading mt-4 text-2xl">{tienda.nombre}</h1>
      <p className="t-label mt-1" style={{ color: "var(--panel-tenue)" }}>
        {tienda.direccion.ciudad}, {tienda.direccion.pais}
        {!tienda.activa ? " · inactiva" : ""}
      </p>

      {/* Lo primero: lo que debe. */}
      <section
        className="mt-5 rounded-xl border p-4"
        style={{
          borderColor: deuda.vencida ? "var(--panel-urgente)" : "var(--panel-borde)",
          background: "var(--panel-tarjeta)",
        }}
      >
        {deuda.importe > 0 ? (
          <>
            <p className="t-label" style={{ color: "var(--panel-tenue)" }}>
              Debe
            </p>
            <p className="t-heading t-figures text-2xl">{formatearEuros(deuda.importe)}</p>
            <p
              className="t-label mt-1"
              style={{
                color: deuda.vencida ? "var(--panel-urgente)" : "var(--panel-tenue)",
              }}
            >
              {deuda.vencida ? "⚠ Vencida · " : ""}
              {deuda.pedidos} {deuda.pedidos === 1 ? "factura" : "facturas"} · desde hace{" "}
              {deuda.diasDelMasViejo} {deuda.diasDelMasViejo === 1 ? "dia" : "dias"} · plazo
              acordado {tienda.plazoPagoDias}
            </p>
          </>
        ) : (
          <p className="t-heading text-lg">Al dia, no debe nada</p>
        )}
      </section>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Dato termino="Pedidos" valor={String(confirmados.length)} />
        <Dato termino="Estuches" valor={String(unidades)} />
        <Dato
          termino="Facturado"
          valor={formatearEuros(facturado, { decimales: false })}
        />
      </dl>

      {/* Pedidos */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="t-label" style={{ color: "var(--panel-tenue)" }}>
            Pedidos ({pedidos.length})
          </h2>
          <Link
            href={`/panel/tiendas/pedido/nuevo?tienda=${tienda.id}`}
            className="t-label"
            style={{ color: "var(--gold-bright)" }}
          >
            + Pedido
          </Link>
        </div>

        {pedidos.length === 0 ? (
          <p
            className="rounded-xl border p-6 text-center text-[0.9375rem]"
            style={{ borderColor: "var(--panel-borde)", color: "var(--panel-tenue)" }}
          >
            Todavia no le has registrado ningun pedido.
          </p>
        ) : (
          <ul className="grid gap-3">
            {pedidos.map((p) => {
              const total = totalesDe(p);
              return (
                <li key={p.id}>
                  <Link href={`/panel/tiendas/pedido/${p.id}`} className="panel-tarjeta">
                    <div className="flex items-start justify-between gap-3">
                      <span className="t-heading text-lg">
                        {total.unidades} ×{" "}
                        {p.lineas.map((l) => nombreColor.get(l.colorId) ?? l.colorId).join(", ")}
                      </span>
                      <span className="t-label shrink-0" style={{ color: "var(--panel-tenue)" }}>
                        #{p.numero}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center justify-between gap-3">
                      <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
                        {p.estado === "confirmado"
                          ? `${NOMBRE_COBRO[p.cobro]} · ${NOMBRE_ENVIO[p.envio]}`
                          : NOMBRE_ESTADO_MAYORISTA[p.estado]}
                      </span>
                      <span className="t-figures">{formatearEuros(total.total)}</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Datos, para cuando toque facturar */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="t-label" style={{ color: "var(--panel-tenue)" }}>
            Datos de facturacion
          </h2>
          <BotonCopiar texto={datosFacturacion} etiqueta="Copiar" />
        </div>
        <p
          className="rounded-xl border px-4 py-3 whitespace-pre-line"
          style={{
            borderColor: "var(--panel-borde)",
            background: "var(--panel-tarjeta)",
            lineHeight: 1.45,
          }}
        >
          {datosFacturacion}
        </p>
        <p
          className="mt-2 rounded-lg px-3 py-2 text-[0.8125rem]"
          style={{ background: "var(--panel-tarjeta-alta)", color: "var(--panel-tenue)" }}
        >
          <strong style={{ color: "var(--gold-bright)" }}>IVA:</strong>{" "}
          {EXPLICACION_REGIMEN[regimen]}
          {tienda.numeroIva && !tienda.ivaValidado
            ? " Tiene numero, pero nadie lo ha comprobado todavia."
            : ""}
        </p>
      </section>

      {(tienda.contactoNombre || tienda.contactoCorreo || tienda.contactoTelefono) ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Contacto
          </h2>
          <p className="text-[0.9375rem]">
            {[tienda.contactoNombre, tienda.contactoCorreo, tienda.contactoTelefono]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
          Condiciones
        </h2>
        <p className="text-[0.9375rem]">
          {tienda.precioPersonalizado
            ? `Precio acordado: ${formatearEuros(tienda.precioPersonalizado)} por unidad.`
            : "Sin precio acordado: se le aplican los tramos por volumen."}{" "}
          Paga a {tienda.plazoPagoDias} dias.
        </p>
        {tienda.notas ? (
          <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
            {tienda.notas}
          </p>
        ) : null}
      </section>

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

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div
      className="rounded-xl border px-3 py-3 text-center"
      style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
    >
      <dt className="t-label" style={{ color: "var(--panel-tenue)" }}>
        {termino}
      </dt>
      <dd className="t-figures t-heading mt-1 text-lg">{valor}</dd>
    </div>
  );
}
