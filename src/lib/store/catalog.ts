/*
  El catalogo. TODO ESTO ES PROVISIONAL menos el precio.

  Los catorce colores de abajo son un marcador de posicion: los nombres
  comerciales y los valores exactos los tiene Alfredo y estan anotados como
  pendientes en `progreso.md`. Cuando lleguen, se cambian aqui y en ningun otro
  sitio: la escena 3D, el fondo, el texto y el carrito leen de esta lista.

  El orden de la lista es el orden en que salen las muestras en el hero.
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
  { id: "black", name: "Black", hex: "#121212", availability: "available" },
  { id: "white", name: "White", hex: "#ececea", availability: "available" },
  { id: "red", name: "Red", hex: "#9e1b2f", availability: "available" },
  { id: "burgundy", name: "Burgundy", hex: "#5c1526", availability: "low" },
  { id: "navy", name: "Navy", hex: "#1b2a4a", availability: "available" },
  { id: "sky", name: "Sky", hex: "#4a7fb5", availability: "available" },
  { id: "forest", name: "Forest", hex: "#1f3d2b", availability: "available" },
  { id: "olive", name: "Olive", hex: "#5a5c33", availability: "available" },
  { id: "gold", name: "Gold", hex: "#c9a227", availability: "available" },
  { id: "yellow", name: "Yellow", hex: "#e0b500", availability: "low" },
  { id: "orange", name: "Orange", hex: "#c25612", availability: "available" },
  { id: "purple", name: "Purple", hex: "#4c2a63", availability: "available" },
  { id: "cream", name: "Cream", hex: "#d9cdb4", availability: "available" },
  { id: "graphite", name: "Graphite", hex: "#4a4a4d", availability: "sold-out" },
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
