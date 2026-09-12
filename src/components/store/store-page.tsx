"use client";

/*
  El armado de la tienda. Una sola pagina que se baja hasta el final.

  Reparto de capas, de atras hacia delante:
    -10  fondo con textura, del color de la paleta
      0  el lienzo 3D, fijo, que se desvanece al pasar el hero
     30  los controles de compra
     40  la cabecera flotante
     50  el cajon del carrito

  El lienzo es fijo y no vive dentro del hero porque asi el estuche no se
  arrastra con el scroll: se queda quieto, se apaga, y el contenido pasa por
  encima. Ademas permite apagar el bucle de dibujo en cuanto sale de vista, que
  en telefono es la diferencia entre una pagina fluida y una que calienta.
*/

import { useEffect, useState } from "react";

import { CartDrawer } from "./cart-drawer";
import { HeroControls } from "./hero-controls";
import { CaseScene } from "./scene/case-scene";
import { StoreHeader, type MenuLink } from "./store-header";
import { StoreProvider, useStore } from "./store-context";
import {
  Contact,
  Faq,
  Footer,
  Shipping,
  Specs,
  WhatItIs,
} from "./store-sections";
import { TexturedBackground } from "./textured-background";

const MENU_LINKS: MenuLink[] = [
  { id: "what-it-is", label: "The case", hint: "What it is" },
  { id: "specs", label: "Specifications", hint: "Measurements and materials" },
  { id: "shipping", label: "Shipping", hint: "Where it goes and when" },
  { id: "faq", label: "Questions", hint: "Asked often enough" },
  { id: "contact", label: "Contact", hint: "A person answers" },
];

/* Lo que tarda la entrada en dejar el estuche en su sitio. Tiene que coincidir
   con `INTRO_MS` de la escena: es cuando aparece el resto de la interfaz. */
const INTRO_MS = 2400;

export function StorePage() {
  return (
    <StoreProvider>
      <StoreShell />
    </StoreProvider>
  );
}

function StoreShell() {
  const { color, palette, view, cartOpen } = useStore();

  const [pastHero, setPastHero] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [grabbing, setGrabbing] = useState(false);

  /* La interfaz entra cuando el estuche ya aterrizo, no antes: si aparece
     durante el zoom, compite con lo unico que hay que mirar. */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Sin animacion la interfaz no espera a nada, pero igual pasa por el
       temporizador: asi el cambio de estado ocurre siempre en una devolucion de
       llamada y no en el cuerpo del efecto, que es lo que provoca un render
       encadenado. */
    const timer = window.setTimeout(
      () => setIntroDone(true),
      reduced ? 0 : INTRO_MS - 500,
    );
    return () => window.clearTimeout(timer);
  }, []);

  /* Se mira una sola vez por fotograma de scroll y con un margen de holgura,
     para no encender y apagar la escena en el borde exacto. */
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setPastHero(window.scrollY > window.innerHeight * 0.7);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* Mientras el carrito esta abierto, la pagina de detras no se mueve. */
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  return (
    <div
      /*
        Aqui empieza y termina el cambio de color: estas tres variables las lee
        el fondo, todo el texto, los filetes y el cajon del carrito. Nada mas
        abajo sabe que color esta seleccionado.
      */
      style={
        {
          "--store-bg": palette.background,
          "--store-fg": palette.foreground,
          "--store-accent": palette.accent,
        } as React.CSSProperties
      }
      className="relative min-h-screen text-[var(--store-fg)]"
    >
      <TexturedBackground />

      {/* ------------------------------------------------------ el estuche */}
      <div
        className={`fixed inset-0 z-0 transition-opacity duration-500 ${
          pastHero ? "pointer-events-none opacity-0" : "opacity-100"
        } ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <CaseScene
          colorHex={color.hex}
          open={view === "open"}
          active={!pastHero}
          onGrabChange={setGrabbing}
        />
      </div>

      <StoreHeader links={MENU_LINKS} pastHero={pastHero} />

      {/* ------------------------------------------------------------ hero */}
      <div className="relative h-[100svh]">
        <div
          className={`transition-opacity duration-700 ${
            introDone && !pastHero
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <HeroControls />
        </div>

        {/* Aviso de que hay mas abajo. Se va en cuanto alguien baja. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 transition-opacity duration-500 sm:block ${
            introDone && !pastHero ? "opacity-40" : "opacity-0"
          }`}
        >
          <span className="t-label text-[10px] text-[var(--store-fg)]">
            Scroll
          </span>
        </div>
      </div>

      {/* --------------------------------------------------- lo que sigue */}
      <main className="relative z-10">
        <WhatItIs />
        <Specs />
        <Shipping />
        <Faq />
        <Contact />
        <Footer />
      </main>

      <CartDrawer />
    </div>
  );
}
