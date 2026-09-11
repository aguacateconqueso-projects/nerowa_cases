import type { ComponentPropsWithoutRef } from "react";

interface PearlButtonProps {
  children?: React.ReactNode;
  /* Si hay href se pinta como enlace; si no, como boton. */
  href?: string;
  className?: string;
  type?: ComponentPropsWithoutRef<"button">["type"];
}

/*
  Boton perlado en dorado. La superficie es un degradado de cuatro paradas con
  un reflejo arriba y una sombra interior abajo: eso es lo que le da el aspecto
  de perla en vez de un rectangulo de color plano. El barrido de luz lo dibuja
  `.pearl-sheen` desde `globals.css`.

  El texto va casi negro sobre el dorado a proposito: es la unica combinacion
  del par que mantiene el contraste AA cuando el degradado llega a su punto
  mas claro.
*/
export function PearlButton({
  children = "Write to us",
  href,
  className,
  type = "button",
}: PearlButtonProps) {
  const content = (
    <>
      <span aria-hidden="true" className="pearl-sheen" />
      <span className="relative z-10">{children}</span>
    </>
  );

  const classes = `pearl-button ${className ?? ""}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes}>
      {content}
    </button>
  );
}

export default PearlButton;
