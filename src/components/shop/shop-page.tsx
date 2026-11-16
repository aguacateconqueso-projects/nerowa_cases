"use client";

/*
  `/shop`: la tienda con la estructura de dialedcoffee.com, ajustada a Nerowa.

  Orden de la pagina, el mismo de la referencia:

    entrada        "TUNING IN 0-100%", una vez por sesion
    Hero           "TWO BOWS. ONE CASE." + tarjeta de compra
    ColourSlider   un color a pantalla completa, con las miniaturas
                   (en escritorio, un solo estuche 3D a la derecha recorre las
                   dos: `case-stage.tsx`)
    Catalogue      los catorce colores en carrusel
    Inside         lo que trae el estuche
    Numbers        las medidas, con el plano acotado del contorno real
    Confirm        "LOW END. HIGH STANDARDS." fijo + "THEY CAN CONFIRM."
    Answers        preguntas frecuentes
    ShopFooter     lista de correo + pie con el logo gigante

  Lo que se reusa de `/store` sin tocarlo: el estado y el carrito
  (`store-context.tsx`), la formula de color (`palette.ts`), el catalogo y la
  escena 3D con sus gestos. A la escena solo se le agrego `fit="fill"`.

  Capas:
     10-20  contenido de cada seccion
     40     cabecera y barra de avance
     50     carrito
     70     entrada
*/

import { useCallback, useEffect, useRef, useState } from "react";

import { StoreProvider, useStore } from "@/components/store/store-context";
import { Hero } from "./hero";
import { CaseStage } from "./case-stage";
import { ColourSlider } from "./colour-slider";
import { Numbers } from "./numbers";
import { Preloader } from "./preloader";
import { Answers, Catalogue, Confirm, Inside, ShopFooter } from "./sections";
import { ShopCart } from "./shop-cart";
import { ShopNav, type NavTone } from "./shop-nav";

export function ShopPage() {
  return (
    <StoreProvider>
      <ShopShell />
    </StoreProvider>
  );
}

/* La altura a la que se mira que seccion hay debajo: el centro de la cabecera. */
const NAV_PROBE = 24;

function ShopShell() {
  const { palette } = useStore();
  const [ready, setReady] = useState(false);
  const [tone, setTone] = useState<NavTone>("light");
  const progressRef = useRef<HTMLDivElement>(null);

  const onIntroDone = useCallback(() => setReady(true), []);

  /*
    Un solo oyente de scroll hace dos cosas en el mismo fotograma:

    1. La barra de avance de la derecha. Va por estilo directo y no por estado:
       cambia en cada fotograma y no vale un render de React cada vez.
    2. El tono de la cabecera, que si es estado, pero solo cambia al cruzar de
       una seccion a otra.

    Las secciones se recorren de la ULTIMA a la primera: donde una tapa a otra
    (el titular fijo de "Confirm"), la que va encima es la que viene despues.
  */
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
      }

      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]"));
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top <= NAV_PROBE && rect.bottom > NAV_PROBE) {
          setTone(sections[i].dataset.nav as NavTone);
          break;
        }
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className="shop relative min-h-screen"
      style={
        {
          /* El color elegido, a todo volumen y su texto. Lo leen la seccion de
             color y el fondo de "They can confirm". */
          "--hero": palette.hero,
          "--hero-ink": palette.heroForeground,
        } as React.CSSProperties
      }
    >
      <Preloader onDone={onIntroDone} />
      <ShopNav tone={tone} />

      {/* La barra de avance, pegada al borde derecho. */}
      <div aria-hidden className="pointer-events-none fixed right-0 top-0 z-40 h-full w-[3px]">
        <div
          ref={progressRef}
          className="h-full w-full origin-top bg-[var(--sh-gold)]"
          style={{ transform: "scaleY(0)" }}
        />
      </div>

      <main>
        {/* Hero y color comparten envoltorio: el estuche de escritorio vive
            aqui y baja pegado a la derecha por las dos secciones. */}
        <div className="relative">
          <CaseStage ready={ready} />
          <Hero ready={ready} />
          <ColourSlider />
        </div>
        <Catalogue />
        <Inside />
        <Numbers />
        <Confirm />
        <Answers />
      </main>

      <ShopFooter />
      <ShopCart />
    </div>
  );
}
