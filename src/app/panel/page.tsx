/*
  Pestana 1 — la cola de trabajo. Es la pantalla de inicio del panel.

  Alfredo toca el icono de su pantalla de inicio y cae aqui: en lo que le falta
  despachar. No en una portada, no en un resumen, no en un grafico. Los numeros
  viven a un toque de distancia, en "Ver numeros", y eso esta razonado en
  `docs/panel-nerowa.md` §6.5.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { alertasPara } from "@/lib/panel/dominio/alertas";
import { ESTADOS_PENDIENTES } from "@/lib/panel/dominio/estados";
import type { Color } from "@/lib/panel/dominio/tipos";
import { ahoraServidor } from "@/lib/panel/reloj";
import { usuarioActual } from "@/lib/panel/sesion";
import { leerSituacion } from "@/lib/panel/situacion";
import { revisarEnSegundoPlano } from "@/lib/panel/vigia";

import { FranjaAvisos } from "./_piezas/franja-avisos";
import { TarjetaPedido } from "./_piezas/tarjeta-pedido";

export const metadata = { title: "Pedidos" };
/* Hay sesion y datos vivos: esta pantalla no se puede prerenderizar. */
export const dynamic = "force-dynamic";

export default async function PantallaPedidos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");

  const ahora = await ahoraServidor();
  /*
    Una sola lectura para la cola, la franja de avisos y los cortes de
    urgencia: lo que se ve aqui y lo que manda el vigia salen del mismo
    calculo. Ver `src/lib/panel/situacion.ts`.
  */
  const { pedidos, colores: listaColores, alertas, ajustes } = await leerSituacion(ahora);

  /*
    Y despues de ensenar la pantalla, el vigia mira si hay avisos que mandar.
    No retrasa nada: corre cuando la respuesta ya salio, y como mucho cada
    cinco minutos. Ver `src/lib/panel/vigia.ts`.
  */
  revisarEnSegundoPlano();

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
        <nav className="flex shrink-0 flex-col items-end gap-2 pb-1" aria-label="Mas">
          <Link href="/panel/existencias" className="t-label" style={{ color: "var(--gold-bright)" }}>
            Existencias ▸
          </Link>
          <Link href="/panel/numeros" className="t-label" style={{ color: "var(--gold-bright)" }}>
            Numeros ▸
          </Link>
        </nav>
      </header>

      <FranjaAvisos alertas={alertasPara(alertas, usuario.rol)} />

      {pendientes.length === 0 ? (
        <EstadoVacio />
      ) : (
        <ul className="grid gap-3">
          {pendientes.map((pedido) => (
            <li key={pedido.id}>
              <TarjetaPedido pedido={pedido} colores={colores} ahora={ahora} cortes={ajustes} />
            </li>
          ))}
        </ul>
      )}

      {pendientes.length > 0 ? (
        <Link href="/panel/pedido/nuevo" className="panel-boton panel-boton-suave mt-4">
          + Registrar una venta a mano
        </Link>
      ) : null}

      <Grupo titulo="En camino" cantidad={enCamino.length}>
        <ul className="grid gap-3 pt-3">
          {enCamino.map((pedido) => (
            <li key={pedido.id}>
              <TarjetaPedido pedido={pedido} colores={colores} ahora={ahora} cortes={ajustes} />
            </li>
          ))}
        </ul>
      </Grupo>

      <Grupo titulo="Entregados" cantidad={cerrados.length}>
        <ul className="grid gap-3 pt-3">
          {cerrados.map((pedido) => (
            <li key={pedido.id}>
              <TarjetaPedido pedido={pedido} colores={colores} ahora={ahora} cortes={ajustes} />
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
