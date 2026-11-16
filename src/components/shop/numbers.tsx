"use client";

/*
  "The numbers." Las medidas del case, en `/shop`.

  Va despues de "Built for two bows" (lo que trae por dentro) y antes de "They
  can confirm": quien llega aqui ya vio el case y ahora quiere saber si le cabe
  en la funda, en la maleta o en el atril.

  Arriba, el plano: el contorno REAL del case visto desde arriba (sale del `.glb`,
  `lib/store/case-outline.ts`), pintado del color elegido, con la cota del largo
  y las tres del ancho donde de verdad se miden. Las etiquetas van en HTML
  encima del dibujo y no dentro del SVG: en telefono el plano mide 360 px de
  ancho y un texto del SVG se encogeria hasta no leerse.

  Abajo, tres listas: cerrado, abierto y herrajes. Datos en `lib/store/specs.ts`.
*/

import { CASE_OUTLINE, edgesAt } from "@/lib/store/case-outline";
import {
  LENGTH_LABEL,
  SPECS_CLOSED,
  SPECS_HARDWARE,
  SPECS_OPEN,
  WIDTH_MARKS,
  type Spec,
} from "@/lib/store/specs";
import { useStore } from "@/components/store/store-context";

/* Aire alrededor del case dentro del dibujo, en milimetros: arriba la cota del
   largo, abajo sitio para las etiquetas de ancho. */
const PAD_X = 8;
const PAD_TOP = 34;
const PAD_BOTTOM = 22;

const VB_X = CASE_OUTLINE.minX - PAD_X;
const VB_Y = CASE_OUTLINE.minY - PAD_TOP;
const VB_W = CASE_OUTLINE.maxX - CASE_OUTLINE.minX + PAD_X * 2;
const VB_H = CASE_OUTLINE.maxY - CASE_OUTLINE.minY + PAD_TOP + PAD_BOTTOM;

/* De milimetros del dibujo a porcentaje de la caja, para las etiquetas HTML. */
const leftPct = (x: number) => `${((x - VB_X) / VB_W) * 100}%`;
const topPct = (y: number) => `${((y - VB_Y) / VB_H) * 100}%`;

const LENGTH_Y = CASE_OUTLINE.minY - 18;
/* El borde de abajo del dibujo: ahi terminan las cotas y empiezan las etiquetas. */
const LABEL_Y = VB_Y + VB_H;

export function Numbers() {
  const { color } = useStore();

  return (
    <section
      id="numbers"
      data-nav="light"
      aria-labelledby="sh-numbers-title"
      className="bg-[var(--sh-paper)] px-4 py-24 text-[var(--sh-ink)] lg:px-5 lg:py-32"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <h2 id="sh-numbers-title" className="sh-lg lg:col-span-5">
          The numbers.
        </h2>
        <p className="sh-serif sh-serif-md text-pretty lg:col-span-6 lg:col-start-7">
          Measured on the real case. One length, three widths, the same height from end to end.
        </p>
      </div>

      {/* ------------------------------------------------------ el plano */}
      <figure className="relative mt-16 lg:mt-24">
        <svg
          viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Top view of the case: ${LENGTH_LABEL} long; ${WIDTH_MARKS.map((m) => `${m.label} at the ${m.name}`).join(", ")}.`}
        >
          <path
            d={CASE_OUTLINE.path}
            fill={color.hex}
            stroke="var(--sh-ink)"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            className="transition-[fill] duration-500"
          />

          {/* Cota del largo, por encima. */}
          <g stroke="var(--sh-ink)" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <line x1={CASE_OUTLINE.minX} x2={CASE_OUTLINE.maxX} y1={LENGTH_Y} y2={LENGTH_Y} vectorEffect="non-scaling-stroke" />
            {[CASE_OUTLINE.minX, CASE_OUTLINE.maxX].map((x) => (
              <line key={x} x1={x} x2={x} y1={LENGTH_Y - 6} y2={LENGTH_Y + 6} vectorEffect="non-scaling-stroke" />
            ))}
          </g>

          {/*
            Cotas del ancho, de borde a borde, donde se miden, y bajando hasta la
            fila de etiquetas. Cada linea va dos veces: una ancha y clara debajo,
            una fina y oscura encima. Asi se ve sobre los catorce colores, del
            negro al blanco.
          */}
          {[
            { stroke: "var(--sh-paper)", width: 3.5 },
            { stroke: "var(--sh-ink)", width: 1 },
          ].map((pass) => (
            <g key={pass.stroke} stroke={pass.stroke} strokeWidth={pass.width} strokeLinecap="round">
              {WIDTH_MARKS.map((mark) => {
                const { top, bottom } = edgesAt(mark.at);
                return (
                  <g key={mark.name}>
                    <line x1={mark.at} x2={mark.at} y1={top} y2={bottom} vectorEffect="non-scaling-stroke" />
                    <line x1={mark.at} x2={mark.at} y1={bottom} y2={LABEL_Y} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
                    <line x1={mark.at - 6} x2={mark.at + 6} y1={top} y2={top} vectorEffect="non-scaling-stroke" />
                    <line x1={mark.at - 6} x2={mark.at + 6} y1={bottom} y2={bottom} vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        {/* Las etiquetas, en HTML. */}
        <span
          aria-hidden
          className="sh-label t-figures absolute -translate-x-1/2 -translate-y-full bg-[var(--sh-paper)] px-2 pb-1"
          style={{ left: leftPct(0), top: topPct(LENGTH_Y) }}
        >
          {LENGTH_LABEL}
        </span>
        {/* Las etiquetas de ancho, en una sola fila debajo del dibujo. La de la
            punta ancha se alinea a la derecha de su cota: centrada se saldria
            de la pantalla en telefono. */}
        <div aria-hidden className="relative h-11">
          {WIDTH_MARKS.map((mark) => {
            const alignRight = mark.at > CASE_OUTLINE.maxX * 0.7;
            return (
              <span
                key={mark.name}
                className={`sh-label absolute top-1 whitespace-nowrap ${
                  alignRight ? "-translate-x-full text-right" : "-translate-x-1/2 text-center"
                }`}
                style={{ left: leftPct(mark.at) }}
              >
                <span className="t-figures block">{mark.label}</span>
                <span className="sh-caption block opacity-60">{mark.name}</span>
              </span>
            );
          })}
        </div>

        <figcaption className="sh-caption mt-8 opacity-60">
          Top view, to scale. Hinges on the straight side, latches on the curved one.
        </figcaption>
      </figure>

      {/* ---------------------------------------------------- las listas */}
      <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-3 lg:gap-6">
        <SpecList title="Closed" specs={SPECS_CLOSED} />
        <SpecList title="Open, lying flat" specs={SPECS_OPEN} />
        <SpecList title="Hardware" specs={SPECS_HARDWARE} />
      </div>
    </section>
  );
}

function SpecList({ title, specs }: { title: string; specs: Spec[] }) {
  return (
    <div>
      <h3 className="sh-serif sh-serif-sm">{title}</h3>
      <dl className="mt-4 border-t border-black/12">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-baseline justify-between gap-6 border-b border-black/12 py-3">
            <dt className="sh-label opacity-70">{spec.label}</dt>
            <dd className="sh-label t-figures text-right">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
