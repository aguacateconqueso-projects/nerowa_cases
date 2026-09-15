/*
  El marcador de una pantalla que todavia no existe.

  No es un "proximamente" decorativo: dice que fase la trae y que hace falta
  para poder construirla, sacado de `docs/panel-nerowa.md` §12 y §14. Sirve para
  que Adrian vea la forma completa del panel y sepa exactamente que esta
  esperando a quien.
*/

import Link from "next/link";

export function ProximaFase({
  titulo,
  fase,
  descripcion,
  bloqueadoPor,
}: {
  titulo: string;
  fase: string;
  descripcion: string;
  bloqueadoPor?: string[];
}) {
  return (
    <div className="pt-4">
      <h1 className="t-heading text-2xl">{titulo}</h1>
      <p
        className="mt-4 rounded-xl border p-4 text-[0.9375rem]"
        style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
      >
        <span className="t-label mb-2 block" style={{ color: "var(--gold-bright)" }}>
          Llega en la fase {fase}
        </span>
        {descripcion}
      </p>

      {bloqueadoPor?.length ? (
        <div className="mt-4">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Antes hace falta
          </h2>
          <ul className="grid gap-2">
            {bloqueadoPor.map((cosa) => (
              <li
                key={cosa}
                className="rounded-lg border px-3 py-2 text-[0.875rem]"
                style={{ borderColor: "var(--panel-borde)", color: "var(--panel-tenue)" }}
              >
                {cosa}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link href="/panel" className="panel-boton panel-boton-suave mt-6">
        Volver a los pedidos
      </Link>
    </div>
  );
}
