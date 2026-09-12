"use client";

/*
  El fondo de la tienda. Son dos superficies distintas, apiladas, y esa division
  es la decision de fondo del 2026-09-12.

    1. El HERO, a todo color. Ocupa exactamente la primera pantalla. El color
       encendido del estuche, los haces negros encima, y un pozo oscuro en el
       centro para que el estuche no se pierda contra su propio color.
    2. LO QUE SE LEE, debajo. La version muy oscura y desaturada del mismo tono,
       que es lo que habia antes. Seis secciones de texto sobre un amarillo
       encendido no las lee nadie.

  Entre las dos hay un degradado de una pantalla de alto, asi que al bajar no se
  cruza una linea: el color se apaga solo, como si se metiera en sombra.

  El trenzado sigue siendo CSS puro, no una imagen. Cuando Alfredo mande la
  textura real, se cambia `.store-weave` en `globals.css` por un
  `background-image` y el resto se queda igual.
*/

import { StoreBeams } from "./store-beams";

interface TexturedBackgroundProps {
  /* Peso de los haces negros, de `beamStrengthFor`. */
  beamStrength: number;
  /* Falso cuando el hero salio de pantalla. */
  heroActive: boolean;
}

export function TexturedBackground({
  beamStrength,
  heroActive,
}: TexturedBackgroundProps) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* ------------------------------------------- la superficie de lectura */}
      {/* Va abajo del todo y cubre la pantalla entera: es lo que se ve cuando el
          hero ya se apago, y lo que hay detras de todos los degradados. */}
      <div className="absolute inset-0 bg-[var(--store-bg)] transition-colors duration-700 ease-out" />

      {/* ------------------------------------------------- el hero, full color */}
      {/*
        Se desvanece con el scroll. No es el elemento el que se mueve — es el
        contenedor fijo el que se queda quieto y la opacidad la maneja el
        contenedor de la pagina con `--hero-veil`, que va de 1 arriba a 0 pasada
        la primera pantalla. Asi el cambio es continuo y no un salto.
      */}
      <div
        className="absolute inset-0 opacity-[var(--hero-veil)]"
        style={{ transition: "opacity 160ms linear" }}
      >
        <div className="absolute inset-0 bg-[var(--store-hero)] transition-colors duration-700 ease-out" />

        {/* Los haces. Negros, siempre. */}
        <StoreBeams strength={beamStrength} active={heroActive} />

        {/*
          El pozo. Sin esto, un estuche amarillo sobre un hero amarillo se ve
          recortado en papel. Es negro y esta centrado donde esta el objeto, asi
          que ademas le devuelve el volumen que los haces le quitan.
        */}
        <div className="store-hero-well absolute inset-0" />
      </div>

      {/* Trenzado. Encima de las dos superficies: es el material, no el color. */}
      <div className="store-weave absolute inset-0" />

      {/* Vineta: cierra las esquinas para que el texto de las esquinas tenga
          siempre algo oscuro debajo. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_45%,transparent_38%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}
