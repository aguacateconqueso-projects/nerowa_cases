/*
  Los numeros. A un toque de la cola de pedidos, no dentro de ella.

  El razonamiento esta en `docs/panel-nerowa.md` §6.5: si hubiera un grafico
  arriba en la pestana 1, lo primero que ve Alfredo al abrir el panel corriendo
  ya no seria lo que le falta despachar.

  Lo que hay hoy es el estado del lote, que es el unico numero que ya se puede
  calcular de verdad: sale de `docs/economia-nerowa.md` y no depende de que haya
  ventas. Los graficos de ventas y ganancia llegan en la fase 7.5.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import { costeDeLote, unidadesParaRecuperar } from "@/lib/panel/dominio/economia";
import { margenDePedido } from "@/lib/panel/dominio/economia";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

export const metadata = { title: "Numeros" };
export const dynamic = "force-dynamic";

export default async function PantallaNumeros() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");

  const { almacen } = servicios();
  const [lotes, pedidos] = await Promise.all([
    almacen.listarLotes(),
    almacen.listarPedidos(),
  ]);

  const costePorLote = new Map(lotes.map((l) => [l.id, costeDeLote(l).costeUnitario]));
  const costePorDefecto = lotes.length ? costeDeLote(lotes[lotes.length - 1]!).costeUnitario : 0;

  /* Un pedido cancelado no vendio nada: no cuenta ni como ingreso ni como salida. */
  const vendidos = pedidos.filter((p) => p.estado !== "cancelado");
  const margenTotal = vendidos.reduce(
    (suma, p) => suma + margenDePedido(p, costePorLote, costePorDefecto).margen,
    0,
  );
  const unidadesVendidas = vendidos.reduce(
    (n, p) => n + p.lineas.reduce((m, l) => m + l.cantidad, 0),
    0,
  );

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Pedidos
        </Link>
        {usuario.rol === "dueno" ? (
          <Link
            href="/panel/estado"
            className="t-label"
            style={{ color: "var(--panel-tenue)" }}
          >
            Estado del sistema ▸
          </Link>
        ) : null}
      </header>

      <h1 className="t-heading text-2xl">Numeros</h1>

      {lotes.map((lote) => {
        const coste = costeDeLote(lote);
        const margenMedio = unidadesVendidas > 0 ? Math.round(margenTotal / unidadesVendidas) : 0;
        const faltan = unidadesParaRecuperar(lote, margenMedio);
        const quedan = lote.unidades - unidadesVendidas;

        return (
          <section
            key={lote.id}
            className="mt-4 rounded-xl border p-4"
            style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
          >
            <h2 className="t-label mb-3" style={{ color: "var(--gold-bright)" }}>
              Lote {lote.referencia} · {lote.unidades} unidades
            </h2>
            <dl className="grid gap-1 text-[0.9375rem]">
              <Fila t="Desembolsado" v={formatearEuros(coste.desembolso, { decimales: false })} />
              <Fila t="Coste por estuche" v={formatearEuros(coste.costeUnitario)} />
              <Fila t="Vendidos" v={`${unidadesVendidas} de ${lote.unidades}`} />
              <Fila t="Quedan" v={`${quedan}`} />
              {faltan ? (
                <Fila t="El lote se paga con" v={`${faltan} ventas`} />
              ) : null}
            </dl>

            {coste.incompleto ? (
              <p className="mt-3 text-[0.8125rem]" style={{ color: "var(--panel-aviso)" }}>
                ⚠ Falta desglosar lo que costo traer el lote. Parte podria ser IVA
                de importacion recuperable, y entonces el coste por estuche baja.
              </p>
            ) : null}
          </section>
        );
      })}

      <section
        className="mt-4 rounded-xl border p-4"
        style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
      >
        <h2 className="t-label mb-3" style={{ color: "var(--panel-tenue)" }}>
          Graficos
        </h2>
        <p className="text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          Ventas por mes, ganancia por mes, unidades por color y paises llegan en
          la fase 7.5, cuando haya ventas de verdad que dibujar.
        </p>
        <p className="mt-3 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          Con menos de unas treinta ventas al mes no se van a dibujar tendencias ni
          porcentajes de crecimiento: con cinco pedidos, un porcentaje miente.
        </p>
      </section>
    </div>
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
