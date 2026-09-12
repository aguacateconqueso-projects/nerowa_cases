"use client";

/*
  El bloque de compra del hero: colores, vista y boton. Abajo a la derecha en
  escritorio, barra inferior en telefono.

  El orden es el del boceto y no se cambia sin motivo: primero el color, porque
  es la unica decision real que toma el comprador; despues la vista, que es
  inspeccion; y de ultimo el boton, que es el unico elemento que cierra.

  Es "add to cart" y no "buy now" por decision de Alfredo: hoy la gente compra
  de a varias cajas y mandarlos a pagar despues de la primera rompe esa compra.
*/

import { useState } from "react";

import { COLORS, PRICE_EUR, VIEWS, type CaseColor } from "@/lib/store/catalog";
import { useStore } from "./store-context";

export function HeroControls() {
  const { color, setColorId, view, setView, addToCart } = useStore();

  /* El nombre que se muestra arriba de las muestras: el del color sobre el que
     esta el puntero, o el seleccionado si no hay ninguno. Existe sobre todo
     para separar gold de yellow, que a tamano de muestra se confunden. */
  const [hovered, setHovered] = useState<CaseColor | null>(null);
  const shown = hovered ?? color;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 sm:justify-end sm:p-6 lg:p-8">
      <div className="pointer-events-auto flex w-full max-w-[420px] flex-col items-stretch gap-4 sm:w-auto sm:items-end">
        {/* ------------------------------------------------------- colores */}
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-baseline gap-2 sm:justify-end">
            <span
              key={shown.id}
              className="store-fade-in t-label text-[var(--store-fg)]"
            >
              {shown.name}
            </span>
            {shown.availability === "low" && (
              <span className="t-label text-[10px] text-[var(--store-fg)]/50">
                Last few
              </span>
            )}
            {shown.availability === "sold-out" && (
              <span className="t-label text-[10px] text-[var(--store-fg)]/50">
                Sold out
              </span>
            )}
          </div>

          <div
            className="grid grid-cols-7 gap-2 sm:grid-cols-5"
            role="radiogroup"
            aria-label="Case colour"
          >
            {COLORS.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                role="radio"
                aria-checked={swatch.id === color.id}
                aria-label={swatch.name}
                title={swatch.name}
                onClick={() => setColorId(swatch.id)}
                onPointerEnter={() => setHovered(swatch)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(swatch)}
                onBlur={() => setHovered(null)}
                className={`store-focus store-swatch ${
                  swatch.id === color.id ? "store-swatch--on" : ""
                }`}
              >
                <span
                  className="store-swatch__chip"
                  style={{ background: swatch.hex }}
                />
                {swatch.availability === "sold-out" && (
                  <span aria-hidden className="store-swatch__out" />
                )}
              </button>
            ))}
          </div>

          {/*
            Aviso de fidelidad. Discreto, siempre visible mientras haya colores
            a la vista, sin ventana emergente y sin nada que aceptar.
          */}
          <p className="t-label max-w-[260px] text-[10px] leading-snug text-[var(--store-fg)]/40 sm:text-right">
            Screen colours may differ from the real finish
          </p>
        </div>

        {/* --------------------------------------------------------- vista */}
        <div
          className="grid grid-cols-2 gap-2 sm:flex sm:justify-end"
          role="radiogroup"
          aria-label="Case view"
        >
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === view}
              onClick={() => setView(option.id)}
              className={`store-focus store-view t-label ${
                option.id === view ? "store-view--on" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* --------------------------------------------------------- boton */}
        <button
          type="button"
          onClick={() => addToCart(color.id)}
          disabled={color.availability === "sold-out"}
          className="liquid-metal-button store-focus w-full justify-between sm:w-[280px]"
        >
          <span className="liquid-metal-button__face" aria-hidden />
          {/* El boton de marca centra su contenido; el `flex-1` es lo que
              separa la etiqueta del precio sin pelearse con esa regla. */}
          <span className="relative z-10 flex-1 text-left">
            {color.availability === "sold-out" ? "Sold out" : "Add to cart"}
          </span>
          <span className="t-figures relative z-10 shrink-0">
            &euro;{PRICE_EUR}
          </span>
        </button>

        <p className="t-label hidden text-[10px] text-[var(--store-fg)]/40 sm:block sm:text-right">
          Drag the case to inspect it
        </p>
      </div>
    </div>
  );
}
