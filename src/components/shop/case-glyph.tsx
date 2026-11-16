/*
  La foto de producto del case, para miniaturas, tarjetas, menu y carrito.

  Son renders del `.glb` real, uno cerrado y uno abierto por color, con fondo
  transparente, en `public/images/case/`. Los saca `scripts/miniaturas-case.cjs`
  con la misma luz y la misma pose de reposo que el visor 3D; si cambia un color
  o el modelo, se vuelven a sacar con ese guion.

  La foto viene vertical (el largo de arriba abajo). Quien la usa la coloca y la
  gira con clases, igual que antes: `absolute`, una altura en porcentaje de la
  caja y el giro de la diagonal. El ancho sale solo de la proporcion.
*/

import Image from "next/image";

import type { CaseColor } from "@/lib/store/catalog";
import { CASE_IMAGE_SIZE } from "@/lib/store/case-images";

interface CaseGlyphProps {
  color: CaseColor;
  view?: "closed" | "open";
  className?: string;
  style?: React.CSSProperties;
  /* Ancho real en pantalla de la foto (no de la caja): las fotos son angostas.
     Sirve para que Next no mande mas pixeles de los que se ven. */
  sizes?: string;
}

export function CaseGlyph({
  color,
  view = "closed",
  className = "",
  style,
  sizes = "96px",
}: CaseGlyphProps) {
  const { width, height } = CASE_IMAGE_SIZE[view];

  return (
    <Image
      src={`/images/case/${color.id}-${view}.webp`}
      width={width}
      height={height}
      alt=""
      aria-hidden
      draggable={false}
      sizes={sizes}
      className={`pointer-events-none w-auto max-w-none select-none ${className}`}
      style={style}
    />
  );
}
