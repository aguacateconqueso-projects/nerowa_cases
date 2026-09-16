/*
  La pantalla del pedido. La mas importante de todo el panel.

  El orden de arriba a abajo ES el diseno, y sale de `docs/panel-nerowa.md` §6.3:

    1. El color y la cantidad, grandes. Es lo primero que hace falta para ir a
       buscar la caja correcta.
    2. La direccion, con un boton de copiar todo.
    3. El campo de seguimiento y el boton que marca enviado.
    4. Todo lo demas — cliente, dinero, historial — abajo y mas pequeno.
*/

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import { costeDeLote, margenDePedido } from "@/lib/panel/dominio/economia";
import { NOMBRE_ESTADO, transicionesDesde } from "@/lib/panel/dominio/estados";
import { describirEspera, horasDesde } from "@/lib/panel/dominio/tiempo";
import type { Centimos } from "@/lib/panel/dominio/dinero";
import { ahoraServidor } from "@/lib/panel/reloj";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { ultimoCosteEnvio } from "../acciones";

import { Confirmacion } from "../../_piezas/confirmacion";
import { BotonCopiar } from "../../_piezas/copiar";
import { CosteEnvio } from "../../_piezas/coste-envio";
import { FormularioEnvio } from "../../_piezas/formulario-envio";
import { BotonEstado } from "../../_piezas/boton-estado";

export const dynamic = "force-dynamic";

export default async function PantallaPedido({
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

  const pedido = await almacen.pedidoPorId(id);
  if (!pedido) notFound();

  const [listaColores, lotes, apuntes, ahora, costeSugerido] = await Promise.all([
    almacen.listarColores(),
    almacen.listarLotes(),
    almacen.listarApuntes("pedido", id),
    ahoraServidor(),
    ultimoCosteEnvio(),
  ]);

  const colores = new Map(listaColores.map((c) => [c.id, c]));
  const costePorLote = new Map<string, Centimos>(
    lotes.map((l) => [l.id, costeDeLote(l).costeUnitario]),
  );
  /* Si una linea no dice de que lote salio, se usa el del ultimo lote conocido. */
  const costePorDefecto = lotes.length
    ? costeDeLote(lotes[lotes.length - 1]!).costeUnitario
    : 0;

  const margen = margenDePedido(pedido, costePorLote, costePorDefecto);
  const transiciones = transicionesDesde(pedido.estado, usuario.rol);
  const direccionCompleta = [
    pedido.direccion.nombre,
    pedido.direccion.linea1,
    pedido.direccion.linea2,
    `${pedido.direccion.codigoPostal} ${pedido.direccion.ciudad}`,
    pedido.direccion.pais,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Pedidos
        </Link>
        <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
          #{pedido.numero} · {NOMBRE_ESTADO[pedido.estado]}
        </span>
      </header>

      <Confirmacion hecho={hecho} />

      {/* 1. Que hay que meter en la caja */}
      <section
        className="rounded-xl border px-4 py-3"
        style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
      >
        <h1 className="sr-only">Pedido {pedido.numero}</h1>
        <ul className="grid gap-3">
          {pedido.lineas.map((linea) => {
            const color = colores.get(linea.colorId);
            return (
              <li key={linea.colorId} className="flex items-center gap-4">
                <span
                  className="panel-muestra"
                  style={{ background: color?.hex ?? "#666", width: "2.75rem", height: "2.75rem" }}
                  aria-hidden="true"
                />
                <span>
                  <span className="t-heading block text-2xl">
                    {linea.cantidad} × {color?.nombre ?? linea.colorId}
                  </span>
                  <span className="t-label" style={{ color: "var(--panel-tenue)" }}>
                    {formatearEuros(linea.precioUnitario, { decimales: false })} por unidad, sin IVA
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/*
        2. A donde va.

        El boton de copiar va EN la cabecera de la seccion y no debajo como una
        accion de ancho completo. Se descubrio midiendo: con el bloque de
        direccion a tamano suelto, el boton "Marcar enviado" caia en y=641 de una
        pantalla de 664 y habia que bajar para verlo, que es justo lo que la
        prueba de los quince segundos no puede permitir. Sigue midiendo 44 px de
        alto, que es lo minimo pulsable con el pulgar.
      */}
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="t-label" style={{ color: "var(--panel-tenue)" }}>
            Direccion de envio
          </h2>
          <BotonCopiar texto={direccionCompleta} etiqueta="Copiar" />
        </div>
        <p
          className="rounded-xl border px-4 py-3 text-[1.0625rem] whitespace-pre-line"
          style={{
            borderColor: "var(--panel-borde)",
            background: "var(--panel-tarjeta)",
            lineHeight: 1.45,
          }}
        >
          {direccionCompleta}
        </p>
      </section>

      {/* 3. La accion. Un campo, un boton. */}
      <section className="mt-6">
        {pedido.estado === "pagado" || pedido.estado === "incidencia" ? (
          <FormularioEnvio pedidoId={pedido.id} />
        ) : (
          <div className="grid gap-3">
            {pedido.seguimiento ? (
              <p
                className="rounded-xl border p-4"
                style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
              >
                <span className="t-label block" style={{ color: "var(--panel-tenue)" }}>
                  Seguimiento
                </span>
                <span className="t-figures text-lg">{pedido.seguimiento}</span>
              </p>
            ) : null}
            {/*
              Lo que costo el envio se pregunta AQUI, ya enviado el pedido: es
              cuando Alfredo tiene el comprobante del correo en la mano. Antes
              estaba dentro del formulario de envio y el boton anclado lo tapaba,
              lo cual se vio mirando y no leyendo.
            */}
            {pedido.enviadoEn && pedido.envioCoste === undefined ? (
              <CosteEnvio pedidoId={pedido.id} sugerido={costeSugerido} />
            ) : null}
            {transiciones
              .filter((t) => !t.correctiva && !t.requiere)
              .map((t) => (
                <BotonEstado
                  key={t.hacia}
                  pedidoId={pedido.id}
                  hacia={t.hacia}
                  etiqueta={t.etiqueta}
                />
              ))}
          </div>
        )}
      </section>

      {/* 4. Lo demas */}
      <section className="mt-8">
        <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
          Cliente
        </h2>
        <p className="text-[0.9375rem]">
          {pedido.clienteNombre} · {pedido.clienteCorreo}
        </p>
        <p className="mt-1 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          Pago {describirEspera(horasDesde(pedido.pagadoEn, ahora)).toLowerCase()}
        </p>
      </section>

      {usuario.rol === "dueno" ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Que deja este pedido
          </h2>
          <dl
            className="rounded-xl border p-4 text-[0.9375rem]"
            style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
          >
            <Fila termino="Cobrado, con IVA" valor={formatearEuros(margen.cobrado)} />
            <Fila termino="IVA" valor={`− ${formatearEuros(margen.iva)}`} />
            <Fila termino="Coste del estuche" valor={`− ${formatearEuros(margen.costeProducto)}`} />
            <Fila termino="Envio" valor={`− ${formatearEuros(margen.costeEnvio)}`} />
            <Fila termino="Comision" valor={`− ${formatearEuros(margen.comision)}`} />
            <div
              className="mt-2 flex justify-between border-t pt-2"
              style={{ borderColor: "var(--panel-borde)" }}
            >
              <dt className="t-heading">Queda</dt>
              <dd className="t-figures t-heading">{formatearEuros(margen.margen)}</dd>
            </div>
          </dl>
          {margen.estimado ? (
            <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-aviso)" }}>
              Hay cifras estimadas: falta el coste real del envio o la comision que
              cobro Stripe.
            </p>
          ) : null}
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

      {transiciones.some((t) => t.correctiva) ? (
        <details className="mt-8">
          <summary className="t-label cursor-pointer py-2" style={{ color: "var(--panel-tenue)" }}>
            Corregir el estado
          </summary>
          <div className="grid gap-2 pt-2">
            <p className="text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
              Solo si algo se marco por error. Queda anotado quien lo hizo.
            </p>
            {transiciones
              .filter((t) => t.correctiva)
              .map((t) => (
                <BotonEstado
                  key={t.hacia}
                  pedidoId={pedido.id}
                  hacia={t.hacia}
                  etiqueta={t.etiqueta}
                  confirmar
                />
              ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Fila({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex justify-between py-1">
      <dt style={{ color: "var(--panel-tenue)" }}>{termino}</dt>
      <dd className="t-figures">{valor}</dd>
    </div>
  );
}
