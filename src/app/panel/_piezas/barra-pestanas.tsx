"use client";

/*
  Las tres pestanas, abajo, donde llega el pulgar de una mano.

  Solo tres, y no crecen. En cuanto aparezca la cuarta, el panel empieza a ser
  el panel de Stripe en el que Alfredo ya se perdio una vez.

  POR QUE UNA PESTANA AVISA DE QUE SE LA TOCO

  Porque no avisaba, y por eso habia que tocarla treinta veces.

  `usePathname` solo cambia cuando la navegacion YA entro. Hasta ese momento la
  pestana tocada se veia exactamente igual que antes del toque: ni marcada, ni
  a medias, ni nada. Quien toca y no ve respuesta vuelve a tocar — eso no es
  impaciencia, es leer bien una interfaz que no contesta.

  Ahora un toque da tres senales, en este orden:

    1. `:active` en el CSS — al bajar el dedo, sin JavaScript ni red.
    2. `useLinkStatus` — el dorado de "voy", mientras se va a por la pantalla.
    3. `loading.tsx` — el esqueleto en el sitio del contenido.

  Las tres hacen falta y ninguna sustituye a las otras: la primera es
  instantanea pero se va al levantar el dedo, la segunda cubre la espera, y la
  tercera es la que dice a donde se esta yendo.
*/

import Link, { useLinkStatus } from "next/link";
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
            <Yendo />
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

/*
  Deja una marca en el DOM mientras la navegacion de ESTE enlace esta en curso.

  Tiene que ser un componente aparte y por dentro del `Link`: `useLinkStatus`
  solo funciona en un descendiente suyo, que es como sabe de que enlace habla.
  Desde dentro no se le puede poner un atributo al `Link`, asi que la marca la
  pone el hijo y el CSS la lee hacia arriba con `:has()`.

  La marca NO se ve y NO ocupa: es un `<span>` con `display: none`. Lo unico
  que hace es existir. Asi el aviso es un cambio de color de lo que ya estaba
  en pantalla, y no un punto nuevo que empuja el icono justo cuando el dedo
  esta encima — el error clasico de los indicadores en linea, que la propia
  documentacion de `useLinkStatus` avisa de no cometer.

  No lleva region viva a proposito: quien usa lector de pantalla ya recibe el
  aviso del esqueleto de `loading.tsx`, y dos anuncios para un mismo toque
  estorban mas de lo que ayudan.
*/
function Yendo() {
  const { pending: yendo } = useLinkStatus();
  if (!yendo) return null;

  return <span className="panel-pestana-marca" aria-hidden="true" />;
}
