/*
  El catalogo.

  LOS COLORES son los de la carta oficial ("Colour chart", septiembre 2026),
  con sus nombres y en su orden: 01 Yellow ... 14 Gold. El orden de la lista es
  el orden en que salen las muestras en la web. Se cambian aqui y en ningun otro
  sitio: la escena 3D, el fondo, el texto, las miniaturas y el carrito leen de
  esta lista.

  Los valores salen de la foto de cada muestra en la carta (la mediana del
  centro del cuadro), asi que son una guia, como dice la propia carta: el case
  fisico manda. Dos excepciones:

    - Pink y Lavender: la carta dice "Sample pending". Su valor es ESTIMADO,
      a ojo, hasta que haya foto de la muestra.
    - Brown: la foto de la carta lo ensena naranja tostado, no marron. Se usa
      tal cual, porque es lo que dice la carta; si no es asi, se corrige aqui.

  La disponibilidad sigue sin datos: los catorce van como disponibles.

  Cada color tiene sus fotos de producto en `public/images/case/`, renderizadas
  desde el `.glb`. Si cambia un color, hay que volver a sacarlas: ver
  `scripts/miniaturas-case.mjs`.
*/

export const PRICE_EUR = 180;

export type ColorAvailability = "available" | "low" | "sold-out";

export interface CaseColor {
  /* Identificador estable. No se traduce y no cambia aunque cambie el nombre. */
  id: string;
  /* Nombre comercial, el que ve el comprador. */
  name: string;
  /* El color del estuche. De aqui salen el fondo, el texto y el acento. */
  hex: string;
  availability: ColorAvailability;
}

export const COLORS: CaseColor[] = [
  { id: "yellow", name: "Yellow", hex: "#f4c50d", availability: "available" },
  { id: "turquoise", name: "Turquoise", hex: "#53c4f3", availability: "available" },
  { id: "teal", name: "Teal", hex: "#2a9d9a", availability: "available" },
  { id: "midnight-blue", name: "Midnight Blue", hex: "#10141e", availability: "available" },
  /* Estimado: muestra pendiente en la carta. */
  { id: "pink", name: "Pink", hex: "#e597b8", availability: "available" },
  { id: "red", name: "Red", hex: "#6d0101", availability: "available" },
  { id: "white", name: "White", hex: "#e1dfec", availability: "available" },
  { id: "silver", name: "Silver", hex: "#b2b6c9", availability: "available" },
  { id: "brown", name: "Brown", hex: "#e07c39", availability: "available" },
  /* Estimado: muestra pendiente en la carta. */
  { id: "lavender", name: "Lavender", hex: "#b8a6dc", availability: "available" },
  { id: "black", name: "Black", hex: "#0e0e10", availability: "available" },
  { id: "purple", name: "Purple", hex: "#9a41aa", availability: "available" },
  { id: "orange", name: "Orange", hex: "#fa9e09", availability: "available" },
  { id: "gold", name: "Gold", hex: "#d8b870", availability: "available" },
];

export const DEFAULT_COLOR_ID = "black";

export function colorById(id: string): CaseColor {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}

/* ------------------------------------------------------------------- vistas */

/*
  Dos vistas, decision de Alfredo: cerrado y abierto. La tercera vista de
  "detalle" que pedia `docs/estructura-web.md` queda fuera hasta que exista el
  modelo real y se sepa si los herrajes aguantan un acercamiento.
*/
export type CaseView = "closed" | "open";

export const VIEWS: { id: CaseView; label: string }[] = [
  { id: "closed", label: "Closed" },
  { id: "open", label: "Open" },
];
