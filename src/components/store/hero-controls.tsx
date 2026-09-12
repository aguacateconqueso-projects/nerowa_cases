"use client";

/*
  El panel de compra del hero.

  DOS REORDENADAS, y la segunda es la que manda en la forma de hoy.

  PRIMERA (sesion 9, punto 7): antes era una columna pegada a la esquina inferior
  derecha con seis bloques apilados del mismo peso — nombre del color, catorce
  muestras sueltas, aviso de fidelidad, selector de vista, boton y una pista.
  Alfredo lo llamo pobre y tenia razon: no habia jerarquia, y lo que mas espacio
  ocupaba era el aviso legal. Paso a ser UNA pieza dividida en tres zonas por
  filetes de un pixel, en el orden de la decision de compra: eleccion,
  inspeccion, cierre.

  SEGUNDA (la misma sesion, despues de verlo): la pieza quedaba en horizontal
  abajo del todo y la pantalla salia descompensada — todo el peso repartido en una
  franja baja, y el menu abierto, que es un bloque alto arriba a la izquierda, sin
  nada que le respondiera. Ahora, en escritorio, **la pieza es vertical, pegada a
  la derecha, de media pantalla para abajo**: mismo ancho que el menu abierto, y
  las dos esquinas opuestas se equilibran.

  En telefono no cambia: sigue siendo la barra de abajo, con las tres zonas
  apiladas y las filas apretadas. Ahi el ancho es lo escaso, no el alto.

    escritorio                         telefono
    ┌─ menu ─┐                         ┌────────────────────────┐
    │        │                         │ FINISH    14 COLOURS   │
    │        │      ┌──────────────┐   │ Yellow  · Last few     │
    └────────┘      │ FINISH       │   │ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮         │
                    │ Yellow       │   ├────────────────────────┤
                    │ ▮▮▮▮▮▮▮▮▮▮▮▮ │   │ [ Closed | Open ]      │
                    ├──────────────┤   ├────────────────────────┤
                    │ VIEW         │   │ €180   [ ADD TO CART ] │
                    │ [Closed|Open]│   └────────────────────────┘
                    ├──────────────┤
                    │ ONE PRICE    │
                    │ €180         │
                    │ [ADD TO CART]│
                    └──────────────┘

  Sobre las muestras: van PEGADAS, sin un pixel entre ellas. Sueltas se leian como
  catorce botones; pegadas se leen como una cinta, que es el catalogo entero de un
  vistazo. La seleccionada crece y se enciende con SU PROPIO color — si el
  resplandor saliera del acento del tema, las catorce se encenderian igual y la
  cinta perderia justo lo que la hace legible.

  Y no hay boton de inspeccion. Lo hubo, y se quito: ofrecia como modo algo que
  ya estaba disponible siempre. El reparto de gestos esta explicado en
  `case-scene.tsx`.
*/

import { useState } from "react";

import { COLORS, PRICE_EUR, VIEWS, type CaseColor } from "@/lib/store/catalog";
import { useStore } from "./store-context";

interface HeroControlsProps {
  /* Verdadero cuando el estuche ya no esta en su pose de reposo. */
  poseDirty: boolean;
  onReset: () => void;
}

export function HeroControls({ poseDirty, onReset }: HeroControlsProps) {
  const { color, setColorId, view, setView, addToCart } = useStore();

  /* El nombre que se muestra: el del color sobre el que esta el puntero, o el
     seleccionado si no hay ninguno. Existe sobre todo para separar gold de
     yellow, que a tamano de muestra se confunden. */
  const [hovered, setHovered] = useState<CaseColor | null>(null);
  const shown = hovered ?? color;

  const soldOut = color.availability === "sold-out";

  return (
    /*
      Absoluto dentro del hero, no fijo: desde el cambio del 2026-09-12 el panel
      se va con el estuche al bajar, en vez de quedarse clavado encima de las
      especificaciones.

      En telefono se apoya abajo y centrado; en escritorio se va a la derecha y
      `items-end` lo pega al suelo, que es desde donde crece hacia arriba.
    */
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-3 sm:p-5 lg:justify-end lg:p-6">
      <div className="store-console pointer-events-auto w-full max-w-[560px] lg:w-[320px] lg:max-w-none">
        {/* ====================================================== eleccion */}
        <div className="store-console__zone">
          <div className="flex items-baseline justify-between gap-3">
            <p className="store-console__eyebrow">Finish</p>
            <p className="store-console__count t-figures">
              {COLORS.length} colours
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              key={shown.id}
              className="store-fade-in t-heading-soft text-2xl leading-none sm:text-[28px]"
            >
              {shown.name}
            </h2>
            {shown.availability === "low" && (
              <span className="store-console__note">Last few</span>
            )}
            {shown.availability === "sold-out" && (
              <span className="store-console__note">Sold out</span>
            )}
          </div>

          {/* ---------------------------------------------- la cinta de color */}
          <div
            className="store-swatches mt-4"
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
                style={{ "--swatch": swatch.hex } as React.CSSProperties}
                className={`store-focus store-swatch ${
                  swatch.id === color.id ? "store-swatch--on" : ""
                }`}
              >
                {swatch.availability === "sold-out" && (
                  <span aria-hidden className="store-swatch__out" />
                )}
              </button>
            ))}
          </div>

          <p className="store-console__fine mt-3">
            Screen colours may differ from the real finish
          </p>
        </div>

        {/* ==================================================== inspeccion */}
        <div className="store-console__zone">
          <div className="flex items-center justify-between gap-3">
            <p className="store-console__eyebrow">View</p>

            {/*
              Solo existe cuando hay algo que reiniciar, y se monta y se desmonta
              de verdad en vez de quedarse invisible: un hueco vacio al lado de un
              objeto que nadie movio descuadra la fila.
            */}
            {poseDirty && (
              <button
                type="button"
                onClick={onReset}
                className="store-focus store-ghost store-fade-in t-label -my-1"
              >
                Reset view
              </button>
            )}
          </div>

          <div
            className="store-segmented mt-2"
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
                className={`store-focus store-segmented__item t-label ${
                  option.id === view ? "store-segmented__item--on" : ""
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="store-console__fine mt-3">
            <span className="hidden lg:inline">
              Drag to turn &middot; scroll to zoom &middot; shift-drag to move
            </span>
            <span className="lg:hidden">
              Drag to turn it &middot; two fingers to zoom and move
            </span>
          </p>
        </div>

        {/* ======================================================== cierre */}
        {/*
          En telefono el precio y el boton comparten fila: el precio a la
          izquierda y el boton ocupando el resto. En el panel vertical el precio
          va encima, que es donde cabe.
        */}
        <div className="store-console__zone">
          <div className="flex items-center gap-4 lg:block">
            <div className="shrink-0 lg:mb-3">
              <p className="store-console__eyebrow">One price</p>
              <p className="t-figures t-heading-soft text-2xl leading-none sm:text-[28px]">
                &euro;{PRICE_EUR}
              </p>
            </div>

            <button
              type="button"
              onClick={() => addToCart(color.id)}
              disabled={soldOut}
              className="liquid-metal-button store-focus w-full"
            >
              <span className="liquid-metal-button__face" aria-hidden />
              <span className="relative z-10">
                {soldOut ? "Sold out" : "Add to cart"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
