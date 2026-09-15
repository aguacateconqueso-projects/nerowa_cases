"use client";

/*
  Las tres pestanas, abajo, donde llega el pulgar de una mano.

  Solo tres, y no crecen. En cuanto aparezca la cuarta, el panel empieza a ser
  el panel de Stripe en el que Alfredo ya se perdio una vez.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Pestana {
  href: string;
  etiqueta: string;
  icono: React.ReactNode;
}

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PESTANAS: Pestana[] = [
  {
    href: "/panel",
    etiqueta: "Pedidos",
    icono: (
      <svg viewBox="0 0 24 24" className="panel-pestana-icono" aria-hidden="true">
        <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" {...trazo} />
        <path d="M3 7.5 12 12l9-4.5M12 12v9" {...trazo} />
      </svg>
    ),
  },
  {
    href: "/panel/tiendas",
    etiqueta: "Tiendas",
    icono: (
      <svg viewBox="0 0 24 24" className="panel-pestana-icono" aria-hidden="true">
        <path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" {...trazo} />
        <path d="M4 9 5.6 4.5A1 1 0 0 1 6.5 4h11a1 1 0 0 1 .9.5L20 9" {...trazo} />
        <path d="M9.5 20v-5h5v5" {...trazo} />
      </svg>
    ),
  },
  {
    href: "/panel/admin",
    etiqueta: "Admin",
    icono: (
      <svg viewBox="0 0 24 24" className="panel-pestana-icono" aria-hidden="true">
        <path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" {...trazo} />
        <path d="M14 4v5h5M8.5 13.5h7M8.5 17h4.5" {...trazo} />
      </svg>
    ),
  },
];

export function BarraPestanas() {
  const ruta = usePathname();

  return (
    <nav className="panel-barra" aria-label="Secciones del panel">
      {PESTANAS.map((p) => {
        /*
          La primera pestana solo se marca en su ruta exacta; las otras tambien
          en sus subrutas. Si no, "Pedidos" saldria activa estando en Tiendas.
        */
        const activa = p.href === "/panel" ? ruta === "/panel" : ruta.startsWith(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            className="panel-pestana"
            aria-current={activa ? "page" : undefined}
          >
            {p.icono}
            <span className="t-label" style={{ fontSize: "0.6875rem" }}>
              {p.etiqueta}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
