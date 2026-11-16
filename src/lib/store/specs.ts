/*
  Las medidas del case. Son las que mando Adrian el 2026-11-16, tomadas del case
  real; el `.glb` se modelo con ellas (largo 0.814 m, alto 0.065 m, junta a
  0.030 m) y su contorno coincide.

  Las leen `/shop` ("The numbers", con el plano acotado) y la tabla de
  especificaciones de `/store`. Se cambian aqui y en ningun otro sitio.

  Lo que mando y NO esta en la web, porque al comprador no le dice nada: el
  detalle de las placas de las bisagras (placa completa 4.7 x 2.5 cm, sobresale
  0.1 cm; placa baja 1.2 cm, alta 3.5 cm) y de la base de la anilla (3.2 x 1.6
  cm, sobresale 0.5 cm en el medio). Quedan anotados aqui por si hacen falta.
*/

export interface Spec {
  label: string;
  value: string;
}

/* Las tres cotas de ancho del plano. `at` es la posicion a lo largo del case,
   en milimetros desde el centro, con la punta ancha hacia +. Salen del contorno
   del `.glb`: donde el ancho real coincide con la medida. */
export const WIDTH_MARKS = [
  { at: -300, label: "5.6 cm", name: "tip" },
  { at: -127, label: "4.6 cm", name: "middle" },
  { at: 360, label: "10.12 cm", name: "wide end" },
] as const;

export const LENGTH_LABEL = "81.4 cm";

export const SPECS_CLOSED: Spec[] = [
  { label: "Length", value: "81.4 cm" },
  { label: "Width at the tip", value: "5.6 cm" },
  { label: "Width at the middle", value: "4.6 cm" },
  { label: "Width at the wide end", value: "10.12 cm" },
  { label: "Height, end to end", value: "6.5 cm" },
  { label: "Base / lid", value: "3 cm / 3.5 cm" },
];

/* Abierto, tapa y base lado a lado. */
export const SPECS_OPEN: Spec[] = [
  { label: "At the tip", value: "14.5 cm" },
  { label: "At the middle", value: "11.5 cm" },
  { label: "At the wide end", value: "23.9 cm" },
];

export const SPECS_HARDWARE: Spec[] = [
  { label: "Latches", value: "5.4 × 2 cm, stand out 1.2 cm" },
  { label: "Hinges", value: "Stand out 1 cm" },
  { label: "D-rings", value: "2 × 2.3 cm, stand out 2.5 cm upright" },
  { label: "Rubber seal", value: "1.6 cm, 0.6 cm showing" },
];
