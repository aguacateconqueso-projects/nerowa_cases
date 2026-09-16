"use client";

/*
  Lo que se ve cuando una pantalla del panel revienta.

  Existe porque lo que habia antes era la pantalla en blanco de Next con "A
  server error occurred. Reload to try again." — que no dice que paso, ni a
  quien preguntar, ni que hacer. Para alguien que no programa, eso es un muro.

  Lo que hace esta: decir en castellano que puede estar pasando, mandar a la
  pantalla de estado —que ahora si funciona con la base caida— y dejar el
  identificador del error a mano para poder buscarlo en el registro de Vercel.
*/

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel] la pantalla reventó:", error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <div className="w-full max-w-sm">
        <h1 className="t-heading text-2xl">Esta pantalla no cargó</h1>
        <p className="mt-3 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          Lo más probable es que el panel no esté pudiendo hablar con la base de
          datos. No se perdió nada: lo que ya estaba guardado sigue ahí.
        </p>

        <div className="mt-6 grid gap-2">
          <button type="button" onClick={reset} className="panel-boton panel-boton-principal">
            Reintentar
          </button>
          <Link href="/panel/estado" className="panel-boton panel-boton-suave">
            Ver qué le pasa al sistema
          </Link>
          <Link href="/panel" className="panel-boton panel-boton-suave">
            Volver a los pedidos
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-6 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            Si hay que buscarlo en el registro del servidor, el error es el{" "}
            <span className="t-figures">{error.digest}</span>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
