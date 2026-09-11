import Image from "next/image";

import { LOGO } from "@/lib/brand";

interface LogoProps {
  /* El tamano en pantalla lo pone quien lo usa, con clases de ancho. */
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Image
      src={LOGO.src}
      width={LOGO.width}
      height={LOGO.height}
      alt="Nerowa Cases"
      priority
      /*
        Sin `sizes`, Next sirve la variante mas grande del srcset. En pantalla
        el logo nunca pasa de 360 px, y el trafico llega con datos moviles.
      */
      sizes="(max-width: 480px) 74vw, 360px"
      className={className}
    />
  );
}
