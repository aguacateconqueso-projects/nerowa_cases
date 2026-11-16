/*
  El estuche dibujado en plano, para las miniaturas.

  Hace el papel de las fotos de producto de la referencia mientras no haya
  fotos. No es una ilustracion inventada: la silueta es la misma
  `outlinePoints` de la que sale el estuche 3D, asi que cuando cambie la forma
  cambian los dos a la vez. Cuando lleguen las fotos de verdad, este componente
  se reemplaza por un `<Image>` en los sitios donde se usa.

  Dos vistas, igual que el 3D:
    closed  la tapa, con su trenzado, su brillo y los dos cierres
    open    tapa y base lado a lado, con los dos arcos dentro
*/

import { useId } from "react";

import { outlinePoints } from "@/components/store/scene/case-shape";

/* Unidades de la escena 3D llevadas a unidades del SVG. */
const K = 100;

function pathFrom(widthScale: number, lengthScale: number): string {
  const points = outlinePoints(widthScale, lengthScale, 48);
  return (
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * K).toFixed(1)} ${(-p.y * K).toFixed(1)}`)
      .join("") + "Z"
  );
}

/* Se calculan una vez al cargar el modulo: son siempre las mismas. */
const SHELL = pathFrom(1, 1);
const RIM = pathFrom(0.86, 0.985);
const LINING = pathFrom(0.78, 0.97);

interface CaseGlyphProps {
  hex: string;
  view?: "closed" | "open";
  className?: string;
  style?: React.CSSProperties;
}

export function CaseGlyph({ hex, view = "closed", className, style }: CaseGlyphProps) {
  const id = useId().replace(/:/g, "");
  const open = view === "open";

  return (
    <svg
      viewBox={open ? "-175 -515 350 1030" : "-85 -515 170 1030"}
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        {/* Brillo de izquierda a derecha: la carcasa es curva, no plana. */}
        <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.36" />
        </linearGradient>
        {/* El trenzado de la carcasa, en diagonal como en el 3D. */}
        <pattern
          id={`${id}-weave`}
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="5" height="10" fill="#fff" fillOpacity="0.07" />
          <rect x="5" width="5" height="10" fill="#000" fillOpacity="0.07" />
        </pattern>
      </defs>

      {open ? (
        <>
          {/* La base, a la izquierda, con los dos arcos. */}
          <g transform="translate(-85 0)">
            <Shell hex={hex} id={id} />
            <path d={LINING} fill="#161616" />
            <Bow x={-20} />
            <Bow x={20} flip />
          </g>
          {/* La tapa, a la derecha, vista por dentro. */}
          <g transform="translate(85 0)">
            <Shell hex={hex} id={id} />
            <path d={LINING} fill="#202020" />
          </g>
        </>
      ) : (
        <>
          <Shell hex={hex} id={id} />
          <path d={RIM} fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" />
          {/* Los dos cierres, en el canto largo. */}
          <rect x="62" y="-170" width="12" height="44" fill="#1a1a1a" />
          <rect x="62" y="126" width="12" height="44" fill="#1a1a1a" />
        </>
      )}
    </svg>
  );
}

function Shell({ hex, id }: { hex: string; id: string }) {
  return (
    <>
      <path d={SHELL} fill={hex} />
      <path d={SHELL} fill={`url(#${id}-weave)`} />
      <path d={SHELL} fill={`url(#${id}-sheen)`} />
    </>
  );
}

/* Un arco: la vara de madera, el talon abajo y la punta arriba. `flip` lo pone
   al reves, que es como van dos arcos en un estuche. */
function Bow({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} 0) ${flip ? "scale(1 -1)" : ""}`}>
      <line x1="0" y1="-420" x2="0" y2="400" stroke="#7a5230" strokeWidth="5" />
      <line x1="5" y1="-410" x2="5" y2="330" stroke="#e8e2d4" strokeOpacity="0.7" strokeWidth="2" />
      <rect x="-6" y="330" width="16" height="56" fill="#121212" />
      <circle cx="2" cy="395" r="6" fill="#c9a227" />
    </g>
  );
}
