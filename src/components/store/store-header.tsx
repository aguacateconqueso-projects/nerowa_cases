"use client";

/*
  La cabecera flotante. Vive encima de la escena, no dentro del flujo, y por eso
  esta separada del resto: es lo unico que acompana al comprador de arriba abajo
  de la pagina.

  DOS CAMBIOS DE ALFREDO, del 2026-09-12, y los dos van juntos por la misma razon:

  1. **El logo tambien abre el menu.** Antes solo lo abria la hamburguesa y el
     logo subia al principio. Si la placa de vidrio es una sola pieza, toda la
     pieza tiene que responder igual; que la mitad haga una cosa y la otra mitad
     otra es lo que la partia en dos a la vista. Subir al principio no se pierde:
     lo hacen "Buy the case", dentro del menu, y el boton de volver al estuche.

  2. **El menu no es un panel aparte: la placa se estira.** Antes habia un
     rectangulo de vidrio arriba y otro rectangulo de vidrio debajo, separados por
     ocho pixeles. Ahora es UNA sola placa que crece hacia abajo y hacia los lados
     y ensena lo que tenia guardado.

  Como se estira, que es lo unico con truco:
  - **El alto** no se anima con `max-height` — con una altura tope inventada, la
    animacion corre a una velocidad distinta a la real y se nota el tiron al
    cerrar. Se anima `grid-template-rows` de `0fr` a `1fr`, que es el alto de
    verdad del contenido, medido por el navegador.
  - **El ancho** no se anima desde `auto`, que no interpola en ningun navegador
    que importe hoy. Va entre dos anchos escritos en `globals.css`
    (`--shell-closed` y `--shell-open`), uno por tamano de pantalla.
  - Las dos cosas comparten la misma curva y la misma duracion, asi que la placa
    crece en diagonal en un solo gesto en vez de en dos tiempos.
*/

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LOGO } from "@/lib/brand";
import { useStore } from "./store-context";

export interface MenuLink {
  id: string;
  label: string;
  hint: string;
}

interface StoreHeaderProps {
  links: MenuLink[];
  /* Verdadero cuando el estuche ya salio de pantalla. */
  pastHero: boolean;
}

export function StoreHeader({ links, pastHero }: StoreHeaderProps) {
  const { cartCount, setCartOpen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  /* El menu se cierra al tocar fuera y con Escape. Sin esto, en telefono queda
     abierto tapando los colores y hay que adivinar donde pulsar. */
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggle = () => setMenuOpen((open) => !open);

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-4 p-4 sm:p-6">
      {/* ------------------------------------------------------ izquierda */}
      <div className="pointer-events-auto relative" ref={shellRef}>
        {/* La placa. Una sola pieza de vidrio que crece. */}
        <div
          className={`store-shell store-glass ${menuOpen ? "store-shell--open" : ""}`}
        >
          {/* ------------------------------------------- la fila de siempre */}
          <div className="store-shell__bar">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={menuOpen}
              aria-controls="store-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="store-focus -m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-1"
            >
              <HamburgerIcon open={menuOpen} />
            </button>

            {/*
              El logo abre el mismo menu que la hamburguesa. Es un boton y no un
              enlace porque no lleva a ningun sitio: despliega lo que ya esta en
              pantalla. Comparte `aria-controls` con la hamburguesa para que quien
              navegue con lector sepa que las dos mandan sobre lo mismo.
            */}
            <button
              type="button"
              onClick={toggle}
              aria-expanded={menuOpen}
              aria-controls="store-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="store-focus rounded-sm"
            >
              {/*
                Norma del sistema visual: el logo va blanco plano, arriba a la
                izquierda, 140 px en escritorio y 110 en movil. La excepcion
                dorada y centrada es solo de la pagina de espera.
              */}
              <Image
                src={LOGO.src}
                alt="Nerowa"
                width={LOGO.width}
                height={LOGO.height}
                priority
                sizes="140px"
                className="logo-flat-white h-auto w-[110px] shrink-0 sm:w-[140px]"
              />
            </button>
          </div>

          {/* --------------------------------------- lo que la placa guarda */}
          {/*
            El `grid-template-rows` de esta caja es lo que se anima. El hijo lleva
            el `overflow: hidden`: sin el, el contenido se sale de una caja de
            alto cero y el menu se ve entero mientras deberia estar cerrado.
          */}
          <div id="store-menu" className="store-shell__drawer" aria-hidden={!menuOpen}>
            <div className="store-shell__drawer-clip">
              <MenuBody
                open={menuOpen}
                links={links}
                onNavigate={goTo}
                onBuy={() => {
                  setMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </div>
        </div>

        {/*
          Vuelta al estuche. Va colocado en absoluto, al lado de la placa y fuera
          del flujo: si ocupara sitio en la fila, en telefono empujaria al logo
          contra el carrito y lo dejaria del tamano de una uña, aunque estuviera
          invisible. Se esconde con el menu abierto, que es cuando la placa crece
          hacia donde el esta.
        */}
        <button
          type="button"
          tabIndex={pastHero && !menuOpen ? 0 : -1}
          aria-hidden={!pastHero || menuOpen}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          /*
            En telefono queda solo la flecha. Con el texto puesto, la placa de
            176 px mas este boton llegaban debajo del carrito y los dos se
            tocaban; se vio en pantalla a 390 px.
          */
          className={`store-glass store-focus t-label absolute left-[calc(var(--store-shell-w)+8px)] top-0 whitespace-nowrap px-3 py-3 transition-all duration-300 sm:px-4 ${
            pastHero && !menuOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-2 opacity-0"
          }`}
        >
          <span aria-hidden className="sm:mr-2">&#8593;</span>
          <span className="hidden sm:inline">Back to the case</span>
          <span className="sr-only sm:hidden">Back to the case</span>
        </button>
      </div>

      {/* -------------------------------------------------------- derecha */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="store-glass store-focus pointer-events-auto t-label flex items-center gap-2 px-4 py-3"
        aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "case" : "cases"}`}
      >
        <CartIcon />
        <span className="t-figures tabular-nums">{cartCount}</span>
      </button>
    </header>
  );
}

/* ------------------------------------------------ el contenido del cajon */

function MenuBody({
  open,
  links,
  onNavigate,
  onBuy,
}: {
  open: boolean;
  links: MenuLink[];
  onNavigate: (id: string) => void;
  onBuy: () => void;
}) {
  /*
    El escalonado es lo que separa "un panel que aparece" de "una placa que se
    abre". Cada linea entra 40 ms despues de la anterior, arrancando cuando la
    placa ya empezo a crecer. Al cerrar todos los retrasos se van a cero: una
    salida escalonada se lee como lentitud, no como cuidado.
  */
  const delay = (index: number) => (open ? `${120 + index * 40}ms` : "0ms");

  return (
    <div className="px-2 pb-2 pt-1">
      {/* Filete de separacion con la fila del logo. Es lo unico que sigue
          diciendo que hay dos zonas, ahora que no hay dos rectangulos. */}
      <div className="mx-1 mb-1 h-px bg-[var(--store-line)]" />

      <ul className="flex flex-col">
        {links.map((link, index) => (
          <li key={link.id}>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => onNavigate(link.id)}
              style={{ transitionDelay: delay(index) }}
              className={`store-focus store-menu-item flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <span className="t-body-sm font-medium">{link.label}</span>
              <span className="t-label text-[10px] opacity-45">{link.hint}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* La invitacion a comprar es el elemento que mas pesa del menu, por
          norma del proyecto. Va separada por un filete y con el acento vivo. */}
      <div className="mt-2 border-t border-[var(--store-line)] pt-2">
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={onBuy}
          style={{ transitionDelay: delay(links.length) }}
          className={`store-focus store-menu-item store-menu-buy t-label flex w-full items-center justify-between rounded-lg px-3 py-3 ${
            open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <span>Buy the case</span>
          <span aria-hidden>&#8594;</span>
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- iconos */

/* Tres trazos que se cruzan al abrirse. El boton tiene que llamar la atencion:
   es la unica navegacion del sitio. */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-[14px] w-[18px]">
      {[0, 1, 2].map((line) => (
        <span
          key={line}
          className="absolute left-0 block h-[1.5px] w-full rounded-full bg-current transition-all duration-300 ease-out"
          style={{
            top: open ? "6px" : `${line * 6}px`,
            opacity: open && line === 1 ? 0 : 1,
            transform: open
              ? `rotate(${line === 0 ? 45 : line === 2 ? -45 : 0}deg)`
              : "none",
          }}
        />
      ))}
    </span>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h1.6l1.3 8h7.2l1.4-5.6H4.4" />
      <circle cx="6.4" cy="13.2" r="1" />
      <circle cx="11.6" cy="13.2" r="1" />
    </svg>
  );
}
