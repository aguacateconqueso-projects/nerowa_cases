/*
  Pestana 1 — la cola de trabajo. Es la pantalla de inicio del panel.

  Alfredo toca el icono de su pantalla de inicio y cae aqui: en lo que le falta
  despachar. No en una portada, no en un resumen, no en un grafico. Los numeros
  viven a un toque de distancia, en "Ver numeros", y eso esta razonado en
  `docs/panel-nerowa.md` §6.5.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { ESTADOS_PENDIENTES } from "@/lib/panel/dominio/estados";
import type { Color } from "@/lib/panel/dominio/tipos";
import { ahoraServidor } from "@/lib/panel/reloj";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { TarjetaPedido } from "./_piezas/tarjeta-pedido";

export const metadata = { title: "Pedidos" };
/* Hay sesion y datos vivos: esta pantalla no se puede prerenderizar. */
export const dynamic = "force-dynamic";

export default async function PantallaPedidos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");

  const { almacen } = servicios();
  const [pedidos, listaColores, ahora] = await Promise.all([
    almacen.listarPedidos(),
    almacen.listarColores(),
    ahoraServidor(),
  ]);

  const colores = new Map<string, Color>(listaColores.map((c) => [c.id, c]));
  const pendientes = pedidos.filter((p) => ESTADOS_PENDIENTES.includes(p.estado));
  const enCamino = pedidos.filter((p) => p.estado === "enviado");
  const cerrados = pedidos.filter((p) => p.estado === "entregado" || p.estado === "archivado");

  return (
    <div className="pb-4">
      <header className="flex items-end justify-between gap-3 pt-4 pb-5">
        <div>
          <p className="t-label" style={{ color: "var(--panel-tenue)" }}>
            Hola, {usuario.nombre}
          </p>
          <h1 className="t-heading text-2xl">
            {pendientes.length === 0
              ? "Todo despachado"
              : `${pendientes.length} ${pendientes.length === 1 ? "pedido" : "pedidos"} por enviar`}
          </h1>
        </div>
        <Link
          href="/panel/numeros"
          className="t-label shrink-0 pb-1"
          style={{ color: "var(--gold-bright)" }}
        >
          Ver numeros ▸
        </Link>
      </header>

      {pendientes.length === 0 ? (
        <EstadoVacio />
      ) : (
        <ul className="grid gap-3">
          {pendientes.map((pedido) => (
            <li key={pedido.id}>
              <TarjetaPedido pedido={pedido} colores={colores} ahora={ahora} />
            </li>
          ))}
        </ul>
      )}

      <Grupo titulo="En camino" cantidad={enCamino.length}>
        <ul className="grid gap-3 pt-3">
          {enCamino.map((pedido) => (
            <li key={pedido.id}>
              <TarjetaPedido pedido={pedido} colores={colores} ahora={ahora} />
            </li>
          ))}
        </ul>
      </Grupo>

      <Grupo titulo="Entregados" cantidad={cerrados.length}>
        <ul className="grid gap-3 pt-3">
          {cerrados.map((pedido) => (
            <li key={pedido.id}>
              <TarjetaPedido pedido={pedido} colores={colores} ahora={ahora} />
            </li>
          ))}
        </ul>
      </Grupo>
    </div>
  );
}

/*
  Lo hecho se pliega. Un pedido entregado ya no es trabajo, asi que no compite
  por el sitio con lo que si lo es.
*/
function Grupo({
  titulo,
  cantidad,
  children,
}: {
  titulo: string;
  cantidad: number;
  children: React.ReactNode;
}) {
  if (cantidad === 0) return null;
  return (
    <details className="mt-6">
      <summary
        className="t-label flex cursor-pointer items-center gap-2 py-2"
        style={{ color: "var(--panel-tenue)" }}
      >
        {titulo} ({cantidad})
      </summary>
      {children}
    </details>
  );
}

/*
  El estado vacio no es un hueco: es la pantalla que Alfredo mas va a ver al
  principio, y la que decide si confia en el panel. Ver `docs/estructura-web.md`.
*/
function EstadoVacio() {
  return (
    <div
      className="rounded-xl border p-8 text-center"
      style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
    >
      <p className="t-heading text-lg">No queda nada por enviar</p>
      <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        Cuando entre una venta la vas a ver aqui arriba, y te llega un aviso al
        telefono.
      </p>
      <Link
        href="/panel/pedido/nuevo"
        className="panel-boton panel-boton-suave mt-6"
        style={{ maxWidth: "20rem", marginInline: "auto" }}
      >
        Registrar una venta a mano
      </Link>
    </div>
  );
}
