/*
  Las fotos de los recibos de un pedido, y el campo para subir la que falta.

  Si no hay ninguna, el bloque se pinta como algo pendiente —en ambar— porque
  lo es: Alfredo tiene que subir el recibo de cada envio.
*/

import type { Comprobante } from "@/lib/panel/dominio/tipos";

import { SubirRecibo } from "./subir-recibo";

export function Recibos({
  entidad,
  entidadId,
  recibos,
}: {
  entidad: "pedido" | "pedido-mayorista";
  entidadId: string;
  recibos: Comprobante[];
}) {
  return (
    <section
      className="grid gap-3 rounded-xl border p-3"
      style={{
        borderColor: recibos.length ? "var(--panel-borde)" : "var(--panel-aviso)",
        background: "var(--panel-tarjeta)",
      }}
    >
      <h2 className="t-label" style={{ color: recibos.length ? "var(--panel-tenue)" : "var(--panel-aviso)" }}>
        {recibos.length ? `Recibo del envio (${recibos.length})` : "⚠ Falta el recibo del envio"}
      </h2>
      {recibos.length ? (
        <ul className="flex flex-wrap gap-2">
          {recibos.map((r) => (
            <li key={r.id}>
              <a
                href={`/panel/comprobante/${r.id}`}
                target="_blank"
                rel="noopener"
                className="block overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--panel-borde)" }}
                aria-label="Ver el recibo en grande"
              >
                {r.tipo === "application/pdf" ? (
                  <span className="t-label flex h-20 w-20 items-center justify-center">PDF</span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- imagen privada detras de sesion, no pasa por el optimizador */
                  <img src={`/panel/comprobante/${r.id}`} alt="Recibo del envio" className="h-20 w-20 object-cover" loading="lazy" />
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <SubirRecibo entidad={entidad} entidadId={entidadId} hayAlguno={recibos.length > 0} />
    </section>
  );
}
