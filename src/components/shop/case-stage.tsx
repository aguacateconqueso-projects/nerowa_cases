"use client";

/*
  El estuche de escritorio, uno solo para el hero y la seccion de color.

  Pedido de Adrian (2026-11-16): en el hero el estuche va a la derecha y no tapa
  el titular, y al bajar SE QUEDA a la derecha mientras la seccion de color
  presenta los colores. Es lo que hace la lata de la referencia, que viaja de una
  seccion a la otra.

  Como se hace: esta capa cubre el hero y la seccion de color juntos (es hija del
  mismo envoltorio en `shop-page.tsx`) y dentro lleva un bloque `sticky` de una
  pantalla de alto. El bloque se queda pegado arriba mientras pasan las dos
  secciones y, cuando se acaba la de color, se va con ella. Nada se mueve por
  JavaScript: el navegador hace el seguimiento solo.

  El lienzo ocupa la mitad derecha. Lo que hay de las secciones en esa mitad (las
  tarjetas de compra, las miniaturas) va con `z-20` y queda por encima; el fondo
  y el velo de color quedan por debajo.

  En telefono no se monta: ahi el estuche va debajo del titular, dentro de cada
  seccion, porque no hay ancho para ponerlo al lado del texto.
*/

import { useRef, useState } from "react";

import { CaseScene } from "@/components/store/scene/case-scene";
import { useStore } from "@/components/store/store-context";
import { useInView, useIsDesktop } from "./bits";

export function CaseStage({ ready }: { ready: boolean }) {
  const { color, view } = useStore();
  const isDesktop = useIsDesktop();
  const layerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(layerRef);
  const [grabbing, setGrabbing] = useState(false);

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-10">
      <div className="sticky top-0 h-[100svh] w-full">
        {isDesktop && ready && (
          <div
            className={`pointer-events-auto absolute bottom-0 right-0 top-12 w-[50%] ${
              grabbing ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <CaseScene
              colorHex={color.hex}
              open={view === "open"}
              active={inView}
              resetSignal={0}
              onGrabChange={setGrabbing}
              fit="fill"
            />
          </div>
        )}
      </div>
    </div>
  );
}
