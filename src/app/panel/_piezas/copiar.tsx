"use client";

/*
  Copiar la direccion de un toque.

  Sin esto, Alfredo tiene que seleccionar texto con el dedo en un telefono, que
  es de las cosas mas torpes que existen. Con esto: un toque, y a pegar en la
  etiqueta.
*/

import { useState } from "react";

export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      /* Vibracion corta: la confirmacion se nota sin mirar la pantalla. */
      navigator.vibrate?.(30);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Safari niega el portapapeles si el gesto no cuenta como directo.
         Se dice, no se traga en silencio. */
      setCopiado(false);
      alert("El telefono no dejo copiar. Seleccionalo a mano.");
    }
  }

  return (
    <button type="button" onClick={copiar} className="panel-boton panel-boton-suave panel-boton-compacto">
      {copiado ? "✓ Copiado" : etiqueta}
    </button>
  );
}
