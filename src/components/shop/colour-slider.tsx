"use client";

/*
  La seccion de producto a todo color. En la referencia es la lata roja: el
  nombre del sabor enorme, la lata en 3D a la derecha, tres columnas de datos,
  la tarjeta de compra arriba a la derecha y abajo las miniaturas para cambiar
  de sabor. El fondo es el color de la lata y baja a casi negro.

  Aqui cada "sabor" es uno de los catorce colores del estuche, y el fondo sale
  de `paletteFor` (`--hero`, que pone `shop-page.tsx`): el mismo color a todo
  volumen que ya se uso en `/store`, con su contraste ya comprobado. Elegir un
  color aqui lo elige en toda la pagina: el hero, las tarjetas y el carrito
  hablan del mismo estuche.

  En escritorio el estuche de la derecha no es de esta seccion: es el de
  `case-stage.tsx`, que viene bajando desde el hero. En telefono si es de aqui.

  Lo que se agrega a la referencia, porque el estuche lo necesita:
    - Las vistas cerrado y abierto, como en `/store`.
    - El aviso de que el color en pantalla puede variar (`estructura-web.md`).

  Disposicion:

    escritorio                                  telefono
    ┌───────────────────────────────┬───────┐   ┌───────────────┐
    │ BURGUNDY                      │ card  │   │ BURGUNDY      │
    │                               └───────┤   │ [ card ]      │
    │ Two-bow case            (3D)     logo │   │ col · col     │
    │                                       │   │    (3D)       │
    │ Burgundy · Two bows · Availability    │   │ ▢▢▢▢▢▢ →      │
    │          ▢▢▢▢▢▢▢▢▢▢▢▢▢▢               │   └───────────────┘
    └───────────────────────────────────────┘
*/

import { useRef, useState } from "react";

import { COLORS, VIEWS } from "@/lib/store/catalog";
import { availabilityLong, availabilityShort } from "@/lib/shop/content";
import { CaseScene } from "@/components/store/scene/case-scene";
import { useStore } from "@/components/store/store-context";
import { MiniCard, useInView, useIsDesktop } from "./bits";
import { CaseGlyph } from "./case-glyph";

export function ColourSlider() {
  const { color, palette, setColorId, view, setView } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  /* Se enciende un poco antes de llegar, para que el estuche ya este dibujado
     cuando la seccion asoma. */
  const inView = useInView(sectionRef, "200px 0px");
  const isDesktop = useIsDesktop();
  const [grabbing, setGrabbing] = useState(false);

  const index = COLORS.findIndex((c) => c.id === color.id);
  const step = (delta: number) =>
    setColorId(COLORS[(index + delta + COLORS.length) % COLORS.length].id);

  return (
    <section
      ref={sectionRef}
      id="colours"
      data-nav="colour"
      aria-label="Colours"
      className="sh-colour relative flex min-h-[100svh] flex-col overflow-hidden lg:block lg:h-[100svh] lg:min-h-[680px]"
    >
      <div aria-hidden className="sh-colour__veil pointer-events-none absolute inset-0" />

      {/* ------------------------------------------------ nombre, arriba */}
      <div className="relative z-20 px-4 pt-16 lg:px-5" style={{ color: palette.heroForeground }}>
        <h2 key={color.id} className="sh-xxl sh-fade">
          {color.name}
        </h2>
        <p className="sh-label mt-4 hidden lg:block">Two-bow case</p>
      </div>

      {/* ------------------------------------- tarjeta de compra, arriba */}
      <div className="relative z-20 mt-4 px-4 lg:absolute lg:right-5 lg:top-16 lg:mt-0 lg:w-[340px] lg:px-0">
        <MiniCard color={color} />
      </div>

      {/* ------------------------------------- el estuche, solo en telefono */}
      <div
        className={`relative z-10 h-[52svh] min-h-[320px] lg:hidden ${
          grabbing ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {isDesktop === false && (
          <CaseScene
            colorHex={color.hex}
            open={view === "open"}
            active={inView}
            resetSignal={0}
            onGrabChange={setGrabbing}
            fit="fill"
          />
        )}
      </div>

      {/* ----------------------------------------------- datos y miniaturas */}
      <div className="relative z-20 mt-auto px-4 pb-6 text-[var(--sh-snow)] lg:absolute lg:inset-x-5 lg:bottom-6 lg:px-0 lg:pb-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:w-[62%] lg:grid-cols-3">
          <div className="col-span-2 lg:col-span-1">
            <p key={color.id} className="sh-serif sh-serif-sm sh-fade">
              {color.name}
            </p>
            <p className="sh-label mt-2">
              Double bass
              <br />
              Bow case
            </p>
          </div>
          <div>
            <p className="sh-label opacity-70">Two bows</p>
            <p className="sh-label mt-2">German and French, at the same time</p>
          </div>
          <div>
            <p className="sh-label opacity-70">{availabilityShort(color)}</p>
            <p className="sh-label mt-2">{availabilityLong(color)}</p>
          </div>
        </div>

        {/*
          Encima de las miniaturas, en una fila: las vistas y el paso entre
          colores. En escritorio las vistas van CENTRADAS sobre las miniaturas
          (pedido de Adrian: a la izquierda se perdian) y el paso a la derecha;
          en telefono, vistas a la izquierda y paso a la derecha.
        */}
        <div className="mt-8 flex items-center justify-between gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <span aria-hidden className="hidden lg:block" />

          {/* Las vistas del estuche. */}
          <div className="flex border border-white/25 p-0.5" role="radiogroup" aria-label="Case view">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={view === option.id}
                onClick={() => setView(option.id)}
                className={`sh-focus sh-label min-w-[76px] px-4 py-2.5 transition-colors ${
                  view === option.id ? "bg-[var(--sh-snow)] text-[var(--sh-ink)]" : "hover:bg-white/15"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 lg:justify-self-end">
            <button type="button" onClick={() => step(-1)} className="sh-focus sh-label -m-2 p-2 opacity-80 hover:opacity-100">
              Prev
            </button>
            <span className="sh-label t-figures opacity-70">
              {String(index + 1).padStart(2, "0")} / {COLORS.length}
            </span>
            <button type="button" onClick={() => step(1)} className="sh-focus sh-label -m-2 p-2 opacity-80 hover:opacity-100">
              Next
            </button>
          </div>
        </div>

        {/* Las miniaturas: una por color, en fila. En telefono se desliza. */}
        <div
          role="radiogroup"
          aria-label="Case colour"
          className="sh-noscroll -mx-4 mt-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:justify-center lg:px-0"
        >
          {COLORS.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              role="radio"
              aria-checked={swatch.id === color.id}
              aria-label={`${swatch.name}, ${availabilityShort(swatch).toLowerCase()}`}
              title={swatch.name}
              onClick={() => setColorId(swatch.id)}
              /* Cuadro vertical y el case entero, apenas inclinado: asi se lee
                 su silueta (la punta ancha, la placa, los cierres). En diagonal
                 y cortado, como estaba, era una raya de color. */
              className={`sh-thumb sh-focus relative h-24 w-11 shrink-0 overflow-hidden lg:h-28 lg:w-14 ${
                swatch.id === color.id ? "sh-thumb--on" : ""
              } ${swatch.availability === "sold-out" ? "opacity-50" : ""}`}
            >
              <CaseGlyph
                color={swatch}
                sizes="24px"
                className="absolute left-1/2 top-1/2 h-[90%] -translate-x-1/2 -translate-y-1/2 -rotate-[12deg]"
              />
            </button>
          ))}
        </div>
        <p className="sh-caption mt-3 opacity-60 lg:text-center">
          Screen colours may differ from the real finish
        </p>
      </div>
    </section>
  );
}
