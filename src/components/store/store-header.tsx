"use client";

/*
  La cabecera flotante. Vive encima de la escena, no dentro del flujo, y por eso
  esta separada del resto: es lo unico que acompana al comprador de arriba abajo
  de la pagina.

  A la izquierda: el menu y el logo, en un solo bloque de vidrio. A la derecha:
  el carrito. Pasado el hero aparece, al lado del menu, el boton que devuelve al
  estuche; es el que evita que alguien lea las especificaciones y se vaya sin
  volver a ver lo que se vende.
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
  const menuRef = useRef<HTMLDivElement>(null);

  /* El menu se cierra al tocar fuera y con Escape. Sin esto, en telefono queda
     abierto tapando los colores y hay que adivinar donde pulsar. */
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
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

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-4 p-4 sm:p-6">
      {/* ------------------------------------------------------ izquierda */}
      <div className="pointer-events-auto flex items-center" ref={menuRef}>
        <div className="relative">
          <div className="store-glass flex shrink-0 items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="store-focus -m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-1"
            >
              <HamburgerIcon open={menuOpen} />
            </button>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="store-focus rounded-sm"
              aria-label="Nerowa Cases, back to top"
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

          <MenuPanel
            open={menuOpen}
            links={links}
            onNavigate={goTo}
            onBuy={() => {
              setMenuOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />

          {/*
            Vuelta al estuche. Va colocado en absoluto, al lado del menu y fuera
            del flujo: si ocupara sitio en la fila, en telefono empujaria al
            logo contra el carrito y lo dejaria del tamano de una uña, aunque
            estuviera invisible.
          */}
          <button
            type="button"
            tabIndex={pastHero ? 0 : -1}
            aria-hidden={!pastHero}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={`store-glass store-focus t-label absolute left-[calc(100%+8px)] top-0 whitespace-nowrap px-4 py-3 transition-all duration-300 ${
              pastHero
                ? "translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-2 opacity-0"
            }`}
          >
            <span aria-hidden className="mr-2">&#8593;</span>
            <span className="hidden sm:inline">Back to the case</span>
            <span className="sm:hidden">The case</span>
          </button>
        </div>
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

/* --------------------------------------------------------------- el panel */

function MenuPanel({
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
  return (
    <div
      role="menu"
      aria-hidden={!open}
      className={`store-glass absolute left-0 top-[calc(100%+8px)] w-[264px] origin-top-left overflow-hidden p-2 transition-all duration-200 ease-out ${
        open
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-95 opacity-0"
      }`}
    >
      <ul className="flex flex-col">
        {links.map((link, index) => (
          <li key={link.id}>
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => onNavigate(link.id)}
              style={{ transitionDelay: open ? `${40 + index * 30}ms` : "0ms" }}
              className={`store-focus group flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-[opacity,transform,background-color] duration-200 hover:bg-[var(--store-fg)]/8 ${
                open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              }`}
            >
              <span className="t-body-sm font-medium text-[var(--store-fg)]">
                {link.label}
              </span>
              <span className="t-label text-[10px] text-[var(--store-fg)]/45">
                {link.hint}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* La invitacion a comprar es el elemento que mas pesa del menu, por
          norma del proyecto. Va separada por un filete y con el acento vivo. */}
      <div className="mt-2 border-t border-[var(--store-fg)]/10 pt-2">
        <button
          type="button"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={onBuy}
          className="store-focus store-menu-buy t-label flex w-full items-center justify-between rounded-lg px-3 py-3"
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
          className="absolute left-0 block h-[1.5px] w-full rounded-full bg-[var(--store-fg)] transition-all duration-300 ease-out"
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
