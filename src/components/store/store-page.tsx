"use client";

/*
  El armado de la tienda. Una sola pagina que se baja hasta el final.

  ---------------------------------------------------------------------------
  EL CAMBIO DE FONDO DEL 2026-09-12, que es lo que manda en este archivo.

  Antes el lienzo 3D era `fixed` y ocupaba la pantalla entera durante TODA la
  pagina: al bajar, el estuche se quedaba clavado detras mientras las secciones
  le pasaban por encima, y para que el texto se leyera habia que desvanecerlo.
  Alfredo lo corto: "es un scroll, no quiero que las letras le queden encima y
  haga fade out".

  Ahora el lienzo vive DENTRO del hero, en absoluto, no en fijo. El hero es una
  seccion normal de una pantalla de alto y se va hacia arriba como se va cualquier
  cosa cuando se baja la pagina. El estuche no se desvanece, no se encoge y no se
  aparta: se queda donde esta, con su consola de compra, y lo que sigue empieza
  despues de el. Nada se superpone a nada.

  Lo unico que se apaga con el scroll es el COLOR del hero, que es un fondo fijo
  aparte (`TexturedBackground`): el amarillo encendido se va calmando hasta la
  superficie oscura de lectura conforme se baja. Eso no es el estuche
  desvaneciendose, es la sala bajando las luces para leer.
  ---------------------------------------------------------------------------

  Reparto de capas:
    -10  el fondo fijo: hero a todo color arriba, superficie de lectura debajo
      0  el lienzo 3D, dentro del hero
     20  la consola de compra, dentro del hero
     40  la cabecera flotante
     50  el cajon del carrito
*/

import { useCallback, useEffect, useRef, useState } from "react";

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

  /* Inspeccion en telefono: mientras esta encendida el lienzo se queda con todos
     los gestos y la pagina no se desplaza. */
  const [inspect, setInspect] = useState(false);
  /* Verdadero cuando el estuche ya no esta en su pose de reposo. */
  const [poseDirty, setPoseDirty] = useState(false);
  /* Sube de uno en uno; la escena solo mira que cambio. */
  const [resetSignal, setResetSignal] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);

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

  /*
    El scroll hace dos cosas, y las dos en el mismo fotograma:

    1. Apaga el color del hero, de forma continua. Se escribe en una variable CSS
       y no en el estado de React: es un valor que cambia en cada fotograma de
       scroll y pasarlo por un render seria pedirle a React sesenta renders por
       segundo para mover una opacidad.
    2. Marca cuando el hero ya salio, que si es estado porque enciende y apaga
       cosas de verdad — el bucle de dibujo, los haces y el boton de volver.
  */
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const height = window.innerHeight;
      const y = window.scrollY;

      /* El color aguanta entero el primer 15% y se apaga hasta el 85%: asi el
         hero se ve a todo color mientras todavia se ve el estuche. */
      const veil = 1 - Math.min(Math.max((y - height * 0.15) / (height * 0.7), 0), 1);
      rootRef.current?.style.setProperty("--hero-veil", veil.toFixed(3));

      const gone = y > height * 0.85;
      setPastHero(gone);

      /* Si alguien logra bajar con la inspeccion encendida, se apaga sola: dejar
         la pagina bloqueada con el estuche fuera de vista es una trampa. Se
         resuelve aqui, dentro del propio fotograma de scroll, y no en un efecto
         aparte que reaccione a `pastHero`: ese efecto encadenaria un render de
         mas por cada vez que se cruza el borde del hero. */
      if (gone) setInspect(false);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* Mientras el carrito esta abierto, o mientras se inspecciona el estuche en
     telefono, la pagina de detras no se mueve. */
  useEffect(() => {
    const locked = cartOpen || inspect;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, inspect]);

  const resetPose = useCallback(() => setResetSignal((n) => n + 1), []);

  return (
    <div
      ref={rootRef}
      /*
        Aqui empieza y termina el cambio de color. Estas variables las leen el
        fondo, todo el texto, los filetes, la consola y el cajon del carrito;
        nada mas abajo sabe que color esta seleccionado.

          --store-hero    la primera pantalla, a todo color
          --store-bg      la superficie de lectura, muy oscura
          --store-fg      el texto de lo que se lee
          --store-ink     el texto de lo que flota encima (cabecera, consola)
          --store-chrome  la superficie de lo que flota encima
          --store-accent  el acento
      */
      style={
        {
          "--store-hero": palette.hero,
          "--store-bg": palette.background,
          "--store-fg": palette.foreground,
          "--store-accent": palette.accent,
          /* Lo que flota cruza las dos superficies, asi que se da vuelta al
             pasar el hero en vez de quedarse con el color de una sola. */
          "--store-ink": pastHero ? palette.foreground : palette.heroForeground,
          "--store-chrome": pastHero ? palette.background : palette.chrome,
          "--hero-veil": "1",
        } as React.CSSProperties
      }
      className="relative min-h-screen text-[var(--store-fg)]"
    >
      <TexturedBackground
        beamStrength={palette.beamStrength}
        heroActive={!pastHero}
      />

      <StoreHeader links={MENU_LINKS} pastHero={pastHero} />

      {/* ============================================================ hero */}
      {/*
        Seccion normal, de una pantalla de alto. El estuche va dentro y se va con
        ella al bajar: no es fijo, no se desvanece y nada le pasa por encima.
      */}
      <section className="relative h-[100svh] overflow-hidden">
        <div
          className={`absolute inset-0 z-0 ${
            grabbing ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <CaseScene
            colorHex={color.hex}
            open={view === "open"}
            active={!pastHero}
            inspect={inspect}
            resetSignal={resetSignal}
            onGrabChange={setGrabbing}
            onPoseDirty={setPoseDirty}
          />
        </div>

        {/*
          `pointer-events-none` en la capa, y no solo cuando esta oculta.

          Esta caja cubre el hero entero para poder fundir la consola de una sola
          vez. Sin esta linea se queda con TODOS los gestos del lienzo aunque sea
          transparente — una caja sin fondo sigue recibiendo el puntero — y el
          estuche no se puede agarrar. Se vio probando el arrastre en el
          navegador: los oyentes estaban puestos y no llegaba ni un solo evento.
          La consola de dentro vuelve a encenderlos para si misma.
        */}
        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-700 ${
            introDone ? "opacity-100" : "opacity-0"
          }`}
        >
          <HeroControls
            inspect={inspect}
            onInspectChange={setInspect}
            poseDirty={poseDirty}
            onReset={resetPose}
          />

          {/* Aviso de que hay mas abajo. En pantallas grandes la consola no llega
              a los bordes y queda sitio de sobra al costado; en telefono la
              consola ya ocupa todo el bajo y esto solo seria ruido. */}
          <span
            aria-hidden
            className="t-label pointer-events-none absolute bottom-8 right-6 hidden text-[10px] opacity-40 [writing-mode:vertical-rl] xl:block"
            style={{ color: "var(--store-ink)" }}
          >
            Scroll
          </span>
        </div>
      </section>

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
