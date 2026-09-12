"use client";

/*
  La consola de compra del hero.

  ANTES: una columna pegada a la esquina inferior derecha con seis cosas apiladas
  una encima de otra — nombre del color, catorce muestras separadas, aviso de
  fidelidad, selector de vista, boton y una pista. Alfredo lo llamo pobre y tenia
  razon: eran seis bloques del mismo peso, sin jerarquia, y lo que mas espacio
  ocupaba era el aviso legal.

  AHORA: UNA sola pieza, una barra apoyada abajo, dividida en tres zonas por
  filetes de un pixel. Es la forma de la consola de un instrumento, y el orden va
  de izquierda a derecha como la decision de compra:

    ┌───────────────────────────┬──────────────┬──────────────────┐
    │ FINISH                    │ VIEW         │            €180  │
    │ Burgundy · Last few       │ Closed  Open │                  │
    │ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮            │ Inspect Reset│   ADD TO CART    │
    │ Screen colours may differ │              │                  │
    └───────────────────────────┴──────────────┴──────────────────┘
         eleccion                  inspeccion         cierre

  Lo que cambia respecto a lo anterior, y por que:

  - **Las muestras van pegadas**, sin un pixel entre ellas. Sueltas se leian como
    catorce botones; pegadas se leen como una cinta de color, que es lo que son:
    el catalogo entero de un vistazo. Las esquinas de los extremos son lo unico
    redondeado, asi que la cinta tiene principio y final.
  - **La seleccionada crece y se enciende con su propio color** (el `box-shadow`
    de color del ejemplo que mando Alfredo). El glow sale del color de la muestra,
    no de un acento fijo, asi que cada eleccion se ilumina distinto.
  - **El nombre del color pasa a titular.** Es la unica decision real que toma el
    comprador y ahora pesa como tal, en vez de ser una etiqueta de once pixeles.
  - **El aviso de fidelidad baja a pie de zona**, en gris, donde va un aviso.
  - **El precio sube al lado del boton** en vez de ir dentro. Un precio metido en
    el boton se lee como parte de la etiqueta.

  En telefono las tres zonas se apilan en el mismo orden y los filetes pasan de
  verticales a horizontales. La cinta de color va a todo el ancho: las catorce
  caben sin desplazar, que es lo que hace falta para elegir de un vistazo.
*/

import { useState } from "react";

import { COLORS, PRICE_EUR, VIEWS, type CaseColor } from "@/lib/store/catalog";
import { useStore } from "./store-context";

interface HeroControlsProps {
  /* Telefono: el lienzo se queda con todos los gestos. */
  inspect: boolean;
  onInspectChange: (on: boolean) => void;
  /* Verdadero cuando el estuche ya no esta en su pose de reposo. */
  poseDirty: boolean;
  onReset: () => void;
}

export function HeroControls({
  inspect,
  onInspectChange,
  poseDirty,
  onReset,
}: HeroControlsProps) {
  const { color, setColorId, view, setView, addToCart } = useStore();

  /* El nombre que se muestra: el del color sobre el que esta el puntero, o el
     seleccionado si no hay ninguno. Existe sobre todo para separar gold de
     yellow, que a tamano de muestra se confunden. */
  const [hovered, setHovered] = useState<CaseColor | null>(null);
  const shown = hovered ?? color;

  const soldOut = color.availability === "sold-out";

  return (
    /* Absoluto dentro del hero, no fijo. Desde el cambio del 2026-09-12 la
       consola se va con el estuche al bajar, en vez de quedarse clavada encima
       de las especificaciones. */
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-5 lg:p-6">
      <div className="store-console pointer-events-auto w-full max-w-[980px]">
        {/* ====================================================== eleccion */}
        <div className="store-console__zone store-console__zone--colour">
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
                /*
                  El glow sale del color de la propia muestra y no de una variable
                  del tema: si saliera del acento, las catorce se encenderian del
                  mismo color y la cinta perderia justo lo que la hace legible.
                */
                style={
                  { "--swatch": swatch.hex } as React.CSSProperties
                }
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
        {/*
          En telefono esta zona es UNA fila: el selector de vista a la izquierda y
          los botones de inspeccion a la derecha. Apilados, la consola se comia
          media pantalla y el estuche quedaba sin sitio.
        */}
        <div className="store-console__zone store-console__zone--view">
          <p className="store-console__eyebrow hidden lg:block">View</p>

          <div className="flex items-center gap-2 lg:mt-2 lg:block">
            <div
              className="store-segmented lg:w-full"
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

            {/* ----------------------------------------- agarrar el estuche */}
            <div className="flex shrink-0 items-center gap-1 lg:mt-2 lg:gap-2">
              {/*
                El interruptor de inspeccion solo existe en telefono. En
                escritorio el raton ya tiene arrastre, rueda y Mayus sin quitarle
                nada a la pagina, asi que un boton mas seria ruido.
              */}
              <button
                type="button"
                onClick={() => onInspectChange(!inspect)}
                aria-pressed={inspect}
                className={`store-focus store-ghost t-label lg:hidden ${
                  inspect ? "store-ghost--on" : ""
                }`}
              >
                {inspect ? "Done" : "Inspect"}
              </button>

              {/*
                Solo existe cuando hay algo que reiniciar, y se monta y se
                desmonta de verdad en vez de quedarse invisible: un hueco vacio
                al lado de un objeto que nadie movio descuadra la fila entera en
                escritorio, que es donde esta zona tiene mas aire.
              */}
              {poseDirty && (
                <button
                  type="button"
                  onClick={onReset}
                  className="store-focus store-ghost store-fade-in t-label"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <p className="store-console__fine mt-2 lg:mt-3">
            <span className="hidden lg:inline">
              Drag to turn &middot; scroll to zoom &middot; shift-drag to move
            </span>
            <span className="lg:hidden">
              {inspect
                ? "One finger turns it, two zoom and move it"
                : "Tap Inspect to turn, zoom and move it"}
            </span>
          </p>
        </div>

        {/* ======================================================== cierre */}
        {/*
          En telefono el precio y el boton comparten fila: el precio a la
          izquierda y el boton ocupando el resto. En escritorio el precio va
          encima, que es donde cabe.
        */}
        <div className="store-console__zone store-console__zone--buy">
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
