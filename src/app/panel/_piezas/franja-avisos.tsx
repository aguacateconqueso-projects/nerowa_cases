/*
  Lo que hay que atender y NO es un pedido por enviar.

  Los pedidos atrasados ya se ven en su tarjeta, con el filete de color; aqui
  no se repiten. Lo que sale aqui es lo que, sin esta franja, solo se veria
  entrando a otra pantalla: un color agotado, una tienda esperando respuesta,
  una factura vencida, un paquete que lleva diez dias en camino.

  Las alertas de existencias se juntan en UNA linea. Catorce colores pueden dar
  muchas a la vez, y una franja de seis lineas encima de la cola de trabajo
  empuja hacia abajo justo lo que Alfredo abrio el panel para ver.
*/

import Link from "next/link";

import type { Alerta } from "@/lib/panel/dominio/alertas";

const DE_PEDIDOS_POR_ENVIAR = new Set(["pedido_recordatorio", "pedido_escalado"]);
const DE_EXISTENCIAS = new Set([
  "existencias_faltan",
  "existencias_agotadas",
  "existencias_bajas",
]);

interface Linea {
  clave: string;
  texto: string;
  enlace: string;
  urgente: boolean;
}

export function FranjaAvisos({ alertas }: { alertas: readonly Alerta[] }) {
  const lineas: Linea[] = [];

  const deExistencias = alertas.filter((a) => DE_EXISTENCIAS.has(a.tipo));
  if (deExistencias.length === 1) {
    const a = deExistencias[0]!;
    lineas.push({ clave: a.clave, texto: a.titulo, enlace: a.enlace, urgente: a.gravedad === "urgente" });
  } else if (deExistencias.length > 1) {
    const agotados = deExistencias.filter((a) => a.tipo !== "existencias_bajas").length;
    const bajos = deExistencias.length - agotados;
    const partes = [
      agotados ? `${agotados} ${agotados === 1 ? "color agotado" : "colores agotados"}` : "",
      bajos ? `${bajos} con pocas cajas` : "",
    ].filter(Boolean);
    lineas.push({
      clave: "existencias",
      texto: partes.join(", "),
      enlace: "/panel/existencias",
      urgente: agotados > 0,
    });
  }

  for (const a of alertas) {
    if (DE_PEDIDOS_POR_ENVIAR.has(a.tipo) || DE_EXISTENCIAS.has(a.tipo)) continue;
    lineas.push({ clave: a.clave, texto: a.titulo, enlace: a.enlace, urgente: a.gravedad === "urgente" });
  }

  if (lineas.length === 0) return null;
  const visibles = lineas.slice(0, 4);

  return (
    <ul className="mb-5 grid gap-2" aria-label="Avisos">
      {visibles.map((l) => (
        <li key={l.clave}>
          <Link
            href={l.enlace}
            className="flex items-center gap-3 rounded-xl border px-3 py-3 text-[0.9375rem]"
            style={{
              borderColor: l.urgente ? "var(--panel-urgente)" : "var(--panel-aviso)",
              background: "var(--panel-tarjeta)",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <span aria-hidden="true" style={{ color: l.urgente ? "var(--panel-urgente)" : "var(--panel-aviso)" }}>
              {l.urgente ? "●" : "○"}
            </span>
            <span className="flex-1">{l.texto}</span>
            <span aria-hidden="true" style={{ color: "var(--panel-tenue)" }}>
              ▸
            </span>
          </Link>
        </li>
      ))}
      {lineas.length > visibles.length ? (
        <li className="text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          Y {lineas.length - visibles.length} mas.
        </li>
      ) : null}
    </ul>
  );
}
