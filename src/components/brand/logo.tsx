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
        Sin `sizes`, Next sirve la variante mas grande del srcset. El trafico
        llega con datos moviles, asi que se declara el tamano real en pantalla.
      */
      sizes="(max-width: 480px) 74vw, 360px"
      className={className}
    />
  );
}
