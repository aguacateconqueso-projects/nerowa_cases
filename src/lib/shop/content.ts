/*
  Los textos y constantes de `/shop` en un solo sitio.

  TODO LO QUE DICE "pending" ES MARCADOR DE POSICION. Las fichas de "They can
  confirm" son huecos con la forma final, no testimonios: los nombres, las fotos
  y las frases tienen que salir de musicos que de verdad tocan con un Nerowa, y
  todavia no hay ninguno confirmado. No se rellenan con nombres inventados: un
  testimonio falso publicado es peor que un hueco.
*/

import type { CaseColor } from "@/lib/store/catalog";

/* La entrada se ve una vez por sesion. La leen el guion del `head` (antes de
   pintar) y el componente (despues de hidratar). */
export const INTRO_KEY = "nerowa.shop.intro.v1";

/* Lo que dice cada estado de existencias, en corto y en largo. */
export function availabilityShort(color: CaseColor): string {
  if (color.availability === "sold-out") return "Sold out";
  if (color.availability === "low") return "Last few";
  return "In stock";
}

export function availabilityLong(color: CaseColor): string {
  if (color.availability === "sold-out")
    return "Next batch in two to three weeks";
  if (color.availability === "low") return "Last few from this batch";
  return "Ships from Europe";
}

/* La lista de "Built for two bows". Solo lo que ya se sabe del estuche. */
export const INSIDE = [
  {
    title: "Two channels",
    body: "A German and a French bow at the same time. Either bow fits either side.",
  },
  {
    title: "Hard shell",
    body: "A carbon-look shell around both bows, closed by its own latches.",
  },
  {
    title: "Lined interior",
    body: "Each bow rests in its own lined channel, held by three straps.",
  },
  {
    title: "Fourteen colours",
    body: "One model, one price. The colour is the only thing you choose.",
  },
];

export interface Voice {
  number: string;
  name: string;
  role: string;
  quote: string;
  /* El color del estuche que hace de foto mientras no haya foto. */
  colorId: string;
}

export const VOICES: Voice[] = [
  {
    number: "01",
    name: "Name pending",
    role: "Double bass · City",
    quote: "One or two lines from a player who already carries their bows in a Nerowa.",
    colorId: "red",
  },
  {
    number: "02",
    name: "Name pending",
    role: "Double bass · City",
    quote: "A teacher, a section player, a soloist: whoever answers first.",
    colorId: "midnight-blue",
  },
  {
    number: "03",
    name: "Name pending",
    role: "Luthier · City",
    quote: "Short is better. The name and the instrument do most of the work.",
    colorId: "gold",
  },
];
