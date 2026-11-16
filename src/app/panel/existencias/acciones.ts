"use server";

/*
  Lo que mueve cajas sin ser una venta: contar el estante, recibir mercancia y
  anotar una merma.

  Las ventas NO pasan por aqui: se descuentan solas leyendo los pedidos (ver
  `src/lib/panel/dominio/existencias.ts`). Aqui solo entra lo que ningun pedido
  explica.

  Misma regla que el resto de acciones: la sesion se comprueba en la primera
  linea, porque una accion de servidor se puede llamar con un POST directo.
*/

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { diferenciasDeConteo } from "@/lib/panel/dominio/existencias";
import type { MovimientoExistencias, TipoMovimiento } from "@/lib/panel/dominio/tipos";
import { servicios } from "@/lib/panel/servicios";
import { exigirUsuario } from "@/lib/panel/sesion";
import { leerExistencias } from "@/lib/panel/situacion";

export interface Resultado {
  ok: boolean;
  mensaje: string;
}

const MAXIMO = 1000;

/** Lee las cantidades por color. Vacio es "no se toco", no cero. */
function leerCantidades(
  datos: FormData,
  ids: readonly string[],
  nombres: ReadonlyMap<string, string>,
): { ok: true; cantidades: Map<string, number> } | { ok: false; mensaje: string } {
  const cantidades = new Map<string, number>();
  for (const id of ids) {
    const texto = String(datos.get(`cantidad-${id}`) ?? "").trim();
    if (!texto) continue;
    const n = Number(texto);
    if (!Number.isInteger(n) || n < 0 || n > MAXIMO) {
      return { ok: false, mensaje: `La cantidad de ${nombres.get(id) ?? id} no es valida.` };
    }
    cantidades.set(id, n);
  }
  return { ok: true, cantidades };
}

function terminar(hecho: string): never {
  revalidatePath("/panel");
  revalidatePath("/panel/existencias");
  redirect(`/panel/existencias?hecho=${hecho}`);
}

/**
 * Guarda un conteo del estante.
 *
 * Se compara contra lo que el panel cree que hay EN EL ESTANTE —contando las
 * cajas vendidas que aun no salieron, porque siguen ahi— y se apunta solo la
 * diferencia. Asi un conteo nunca pisa las ventas: si entre conteo y conteo se
 * vendieron tres, el panel ya las habia descontado y el conteo solo corrige lo
 * que de verdad no cuadraba.
 */
export async function guardarConteo(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const { existencias } = await leerExistencias();
  const nombres = new Map(existencias.map((e) => [e.color.id, e.color.nombre]));
  const leidas = leerCantidades(datos, [...nombres.keys()], nombres);
  if (!leidas.ok) return leidas;
  if (leidas.cantidades.size === 0) {
    return { ok: false, mensaje: "No se conto ningun color. Escribe cuantas cajas hay." };
  }

  const diferencias = diferenciasDeConteo(existencias, leidas.cantidades);
  if (diferencias.length === 0) terminar("e-conteo-igual");

  const nota = String(datos.get("motivo") ?? "").trim();
  const ahora = new Date().toISOString();
  const movimientos: MovimientoExistencias[] = diferencias.map((d) => ({
    id: crypto.randomUUID(),
    colorId: d.colorId,
    cantidad: d.ajuste,
    tipo: "ajuste",
    motivo: `Conteo: habia ${d.contado}, el panel esperaba ${d.esperado}${nota ? `. ${nota}` : ""}`,
    usuarioId: usuario.id,
    creadoEn: ahora,
  }));

  await almacen.registrarMovimientos(movimientos);
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "existencias",
    entidadId: "estante",
    accion: "conteo",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} conto el estante: ${diferencias
      .map((d) => `${nombres.get(d.colorId)} ${d.ajuste > 0 ? "+" : ""}${d.ajuste}`)
      .join(", ")}`,
    creadoEn: ahora,
  });

  terminar("e-conteo");
}

async function registrar(
  tipo: Exclude<TipoMovimiento, "ajuste">,
  datos: FormData,
): Promise<Resultado> {
  const usuario = await exigirUsuario();
  const { almacen } = servicios();

  const colores = (await almacen.listarColores()).filter((c) => c.activo);
  const nombres = new Map(colores.map((c) => [c.id, c.nombre]));
  const leidas = leerCantidades(datos, colores.map((c) => c.id), nombres);
  if (!leidas.ok) return leidas;

  const conCantidad = [...leidas.cantidades].filter(([, n]) => n > 0);
  if (conCantidad.length === 0) {
    return { ok: false, mensaje: "Escribe cuantas cajas, al menos de un color." };
  }

  const motivo = String(datos.get("motivo") ?? "").trim();
  /* Una merma sin motivo es una caja que desaparecio sin explicacion. */
  if (tipo === "merma" && !motivo) {
    return { ok: false, mensaje: "Escribe que paso: rota, regalada a un musico, muestra…" };
  }

  let loteId: string | undefined;
  if (tipo === "entrada") {
    loteId = String(datos.get("loteId") ?? "").trim() || undefined;
    if (loteId && !(await almacen.lotePorId(loteId))) {
      return { ok: false, mensaje: "Ese lote no existe." };
    }
  }

  const ahora = new Date().toISOString();
  const signo = tipo === "merma" ? -1 : 1;
  await almacen.registrarMovimientos(
    conCantidad.map(([colorId, n]) => ({
      id: crypto.randomUUID(),
      colorId,
      cantidad: signo * n,
      tipo,
      loteId,
      motivo: motivo || undefined,
      usuarioId: usuario.id,
      creadoEn: ahora,
    })),
  );
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad: "existencias",
    entidadId: "estante",
    accion: tipo,
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} anoto ${tipo === "entrada" ? "una entrada" : "una merma"}: ${conCantidad
      .map(([id, n]) => `${n} ${nombres.get(id)}`)
      .join(", ")}`,
    creadoEn: ahora,
  });

  terminar(tipo === "entrada" ? "e-entrada" : "e-merma");
}

export async function registrarEntrada(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  return registrar("entrada", datos);
}

export async function registrarMerma(
  _anterior: Resultado | undefined,
  datos: FormData,
): Promise<Resultado> {
  return registrar("merma", datos);
}
