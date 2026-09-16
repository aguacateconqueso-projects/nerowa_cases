/*
  Pestana 2 — las tiendas mayoristas.

  Lo que ocupa la pantalla es lo mismo que en la pestana 1: lo que hay que
  atender. Aqui eso no es lo mas viejo, sino **lo que deben y desde cuando**.
  Una tienda que debe 800 EUR desde hace 50 dias tiene que ser imposible de no
  ver; una que no debe nada puede esperar a que la busquen.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import { deudaDe, totalesDe } from "@/lib/panel/dominio/mayorista";
import { ahoraServidor } from "@/lib/panel/reloj";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { Confirmacion } from "../_piezas/confirmacion";

export const metadata = { title: "Tiendas" };
export const dynamic = "force-dynamic";

export default async function PantallaTiendas({
  searchParams,
}: {
  searchParams: Promise<{ hecho?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");

  const { almacen } = servicios();
  const [tiendas, pedidos, ahora, { hecho }] = await Promise.all([
    almacen.listarTiendas(),
    almacen.listarPedidosMayoristas(),
    ahoraServidor(),
    searchParams,
  ]);

  const porTienda = new Map(
    tiendas.map((t) => [t.id, pedidos.filter((p) => p.tiendaId === t.id)]),
  );

  const conDeuda = tiendas
    .map((t) => ({ tienda: t, deuda: deudaDe(porTienda.get(t.id) ?? [], t, ahora) }))
    .filter((x) => x.deuda.importe > 0)
    /* Lo vencido primero, y dentro de eso lo mas viejo. */
    .sort(
      (a, b) =>
        Number(b.deuda.vencida) - Number(a.deuda.vencida) ||
        b.deuda.diasDelMasViejo - a.deuda.diasDelMasViejo,
    );

  const porConfirmar = pedidos.filter((p) => p.estado === "por_confirmar");
  const totalDeuda = conDeuda.reduce((s, x) => s + x.deuda.importe, 0);

  return (
    <div className="pb-4">
      <header className="flex items-end justify-between gap-3 pt-4 pb-5">
        <div>
          <p className="t-label" style={{ color: "var(--panel-tenue)" }}>
            Mayoristas
          </p>
          <h1 className="t-heading text-2xl">
            {totalDeuda > 0
              ? `${formatearEuros(totalDeuda, { decimales: false })} por cobrar`
              : "Nada por cobrar"}
          </h1>
        </div>
        <Link
          href="/panel/tiendas/nueva"
          className="t-label shrink-0 pb-1"
          style={{ color: "var(--gold-bright)" }}
        >
          + Tienda
        </Link>
      </header>

      <Confirmacion hecho={hecho} />

      {porConfirmar.length > 0 ? (
        <section className="mb-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-aviso)" }}>
            Pedidos por confirmar ({porConfirmar.length})
          </h2>
          <ul className="grid gap-3">
            {porConfirmar.map((p) => {
              const t = tiendas.find((x) => x.id === p.tiendaId);
              const total = totalesDe(p);
              return (
                <li key={p.id}>
                  <Link
                    href={`/panel/tiendas/pedido/${p.id}`}
                    className="panel-tarjeta"
                    data-urgencia="media"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="t-heading text-lg">{t?.nombre ?? "Tienda"}</span>
                      <span className="t-label shrink-0" style={{ color: "var(--panel-tenue)" }}>
                        #{p.numero}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center justify-between gap-3 text-[0.9375rem]">
                      <span style={{ color: "var(--panel-tenue)" }}>
                        {total.unidades} {total.unidades === 1 ? "estuche" : "estuches"}
                      </span>
                      <span className="t-figures">{formatearEuros(total.total)}</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {conDeuda.length > 0 ? (
        <section className="mb-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Deben
          </h2>
          <ul className="grid gap-3">
            {conDeuda.map(({ tienda, deuda }) => (
              <li key={tienda.id}>
                <Link
                  href={`/panel/tiendas/${tienda.id}`}
                  className="panel-tarjeta"
                  data-urgencia={deuda.vencida ? "alta" : "baja"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="t-heading text-lg">{tienda.nombre}</span>
                    <span className="t-figures shrink-0">
                      {formatearEuros(deuda.importe, { decimales: false })}
                    </span>
                  </div>
                  <p
                    className="t-label mt-2"
                    style={{
                      color: deuda.vencida ? "var(--panel-urgente)" : "var(--panel-tenue)",
                    }}
                  >
                    {deuda.vencida ? "⚠ " : ""}
                    Desde hace {deuda.diasDelMasViejo}{" "}
                    {deuda.diasDelMasViejo === 1 ? "dia" : "dias"}
                    {deuda.vencida ? ` · plazo de ${tienda.plazoPagoDias}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
          Todas las tiendas ({tiendas.length})
        </h2>
        {tiendas.length === 0 ? (
          <EstadoVacio />
        ) : (
          <ul className="grid gap-3">
            {tiendas.map((t) => {
              const suyos = porTienda.get(t.id) ?? [];
              const unidades = suyos
                .filter((p) => p.estado === "confirmado")
                .reduce((n, p) => n + totalesDe(p).unidades, 0);
              return (
                <li key={t.id}>
                  <Link href={`/panel/tiendas/${t.id}`} className="panel-tarjeta">
                    <div className="flex items-start justify-between gap-3">
                      <span className="t-heading text-lg">
                        {t.nombre}
                        {!t.activa ? (
                          <span className="t-label ml-2" style={{ color: "var(--panel-tenue)" }}>
                            inactiva
                          </span>
                        ) : null}
                      </span>
                      <span className="t-label shrink-0" style={{ color: "var(--panel-tenue)" }}>
                        {t.direccion.pais}
                      </span>
                    </div>
                    <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
                      {suyos.length} {suyos.length === 1 ? "pedido" : "pedidos"} ·{" "}
                      {unidades} {unidades === 1 ? "estuche" : "estuches"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function EstadoVacio() {
  return (
    <div
      className="rounded-xl border p-8 text-center"
      style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
    >
      <p className="t-heading text-lg">Todavia no hay ninguna tienda</p>
      <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        Da de alta la primera con sus datos de facturacion y sus condiciones, y
        despues le registras los pedidos.
      </p>
      <Link
        href="/panel/tiendas/nueva"
        className="panel-boton panel-boton-principal mt-6"
        style={{ maxWidth: "20rem", marginInline: "auto" }}
      >
        Dar de alta una tienda
      </Link>
    </div>
  );
}
