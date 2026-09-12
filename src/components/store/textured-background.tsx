"use client";

/*
  El fondo. No es un color plano: es el color de la paleta con el mismo
  trenzado diagonal que tiene la carcasa, muy por debajo del umbral de lo
  evidente, mas un halo suave detras del estuche.

  El trenzado es CSS puro, no una imagen. Cuando Alfredo mande la textura real,
  se cambia `.store-weave` en `globals.css` por un `background-image` y el resto
  se queda igual.

  La animacion es minima a proposito: el trenzado se desplaza catorce pixeles en
  cuarenta segundos y el halo respira en veinte. Nada de eso se ve mirandolo de
  frente; se nota cuando falta.
*/

export function TexturedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Color base. Cambia con el estuche, con un fundido largo. */}
      <div className="absolute inset-0 bg-[var(--store-bg)] transition-colors duration-700 ease-out" />

      {/* Trenzado. */}
      <div className="store-weave absolute inset-0" />

      {/* Halo detras del objeto: separa el estuche del fondo sin encender una
          luz de verdad, que en 3D costaria un fotograma entero. */}
      <div className="store-halo absolute inset-0" />

      {/* Vineta: cierra las esquinas para que el texto de las esquinas tenga
          siempre algo oscuro debajo. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_45%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
