import type { ComponentPropsWithoutRef } from "react";

type ViewMode = "default" | "icon";

interface LiquidMetalButtonProps {
  label?: string;
  viewMode?: ViewMode;
  /* Si hay href se pinta como enlace; si no, como boton. */
  href?: string;
  className?: string;
  type?: ComponentPropsWithoutRef<"button">["type"];
}

/*
  Boton rectangular: fondo negro, borde dorado y texto dorado.

  El "metal liquido" es el borde. No es un borde de color plano sino un
  degradado de oro recorrido despacio, con un punto casi blanco que lo cruza
  como un reflejo sobre metal pulido. El truco esta en `globals.css`: dos capas
  de fondo, una recortada a la caja interior (el negro) y otra a la caja del
  borde (el degradado). Sin pseudo-elementos y sin SVG.

  Esquinas rectas a proposito. El resto del estilo sale del sistema: el texto
  usa el rol de etiqueta, 12 px en mayusculas con tracking +8%.
*/
export function LiquidMetalButton({
  label = "Get Started",
  viewMode = "default",
  href,
  className,
  type = "button",
}: LiquidMetalButtonProps) {
  const isIcon = viewMode === "icon";

  const classes = [
    "liquid-metal-button",
    isIcon ? "liquid-metal-button--icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span aria-hidden="true" className="liquid-metal-button__face" />
      <span className="relative z-10">
        {isIcon ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 6.5h18v11H3z" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        ) : (
          label
        )}
      </span>
    </>
  );

  /* En modo icono el texto visible desaparece: hace falta un nombre accesible. */
  const labelProps = isIcon ? { "aria-label": label } : {};

  if (href) {
    return (
      <a href={href} className={classes} {...labelProps}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...labelProps}>
      {content}
    </button>
  );
}

export default LiquidMetalButton;
