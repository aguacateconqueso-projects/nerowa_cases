"use client";

/*
  La cabecera. La de la referencia, ajustada:

    escritorio   Shop · For shops      [ logo ]      Contact · Cart (0)
    telefono     [ logo ]          Shop · For shops · Contact · Cart (0)

  Sin fondo: es texto suelto encima de la pagina, y cambia de color segun la
  seccion que tenga debajo (`tone`, que calcula `shop-page.tsx`). "Account" de
  la referencia no existe aqui: Nerowa no tiene cuentas, y "For Teams" pasa a
  ser "For shops", que es la venta a tiendas y luthiers.

  "Shop" abre un panel con los catorce colores, como el desplegable de
  productos de la referencia.
*/

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { CONTACT_EMAIL, LOGO } from "@/lib/brand";
import { COLORS, PRICE_EUR } from "@/lib/store/catalog";
import { availabilityShort } from "@/lib/shop/content";
import { useStore } from "@/components/store/store-context";
import { Roll } from "./bits";
import { CaseGlyph } from "./case-glyph";

export type NavTone = "light" | "dark" | "colour";

export function ShopNav({ tone }: { tone: NavTone }) {
  const { palette, cartCount, setCartOpen, setColorId } = useStore();
  const [shopOpen, setShopOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const shopButtonRef = useRef<HTMLButtonElement>(null);

  /* Con el panel abierto la cabecera va sobre papel claro, sea cual sea la
     seccion de debajo. */
  const darkText =
    shopOpen || tone === "light" || (tone === "colour" && !palette.heroIsDark);
  const ink = darkText ? "var(--sh-ink)" : tone === "colour" ? palette.heroForeground : "var(--sh-snow)";

  useEffect(() => {
    if (!shopOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShopOpen(false);
        shopButtonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (shopButtonRef.current?.contains(target)) return;
      setShopOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [shopOpen]);

  const goTo = (id: string) => {
    setShopOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const linkClass = "sh-roll-host sh-focus sh-label whitespace-nowrap";

  return (
    <header className="sh-nav fixed inset-x-0 top-0 z-40" style={{ color: ink }}>
      {/* El papel del panel, detras de la barra, para que la barra y el panel se
          lean como una sola pieza cuando esta abierto. */}
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-12 bg-[var(--sh-paper)] transition-opacity duration-300 ${
          shopOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative flex h-12 items-center px-4 lg:px-5">
        <a
          href="#top"
          aria-label="Nerowa Cases, back to top"
          className="sh-focus shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
        >
          <Image
            src={LOGO.src}
            width={LOGO.width}
            height={LOGO.height}
            alt="Nerowa"
            priority
            sizes="104px"
            className="sh-nav__logo h-auto w-[88px] lg:w-[104px]"
            style={{
              filter: darkText ? "brightness(0)" : "brightness(0) invert(1)",
            }}
          />
        </a>

        <nav aria-label="Shop" className="ml-auto flex items-center gap-4 lg:order-first lg:ml-0 lg:gap-6">
          <button
            ref={shopButtonRef}
            type="button"
            aria-expanded={shopOpen}
            aria-controls="sh-shop-panel"
            onClick={() => setShopOpen((open) => !open)}
            className={linkClass}
          >
            <Roll>Shop</Roll>
          </button>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa for shops")}`}
            className={linkClass}
          >
            <Roll>For shops</Roll>
          </a>
        </nav>

        <div className="ml-4 flex items-center gap-4 lg:ml-auto lg:gap-6">
          <a href="#answers" className={`${linkClass} hidden sm:inline-flex`}>
            <Roll>Contact</Roll>
          </a>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={linkClass}
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <Roll>
              Cart (<span className="t-figures">{cartCount}</span>)
            </Roll>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ el panel de "Shop" */}
      <div
        ref={panelRef}
        id="sh-shop-panel"
        aria-hidden={!shopOpen}
        className={`relative bg-[var(--sh-paper)] text-[var(--sh-ink)] shadow-[0_24px_48px_-32px_rgb(0_0_0/0.6)] transition-[opacity,transform] duration-300 ease-out ${
          shopOpen ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <ul className="sh-noscroll flex gap-2 overflow-x-auto px-4 pb-4 pt-2 lg:px-5">
          {COLORS.map((color) => (
            <li key={color.id} className="w-[148px] shrink-0 lg:w-[164px]">
              <button
                type="button"
                tabIndex={shopOpen ? 0 : -1}
                onClick={() => {
                  setColorId(color.id);
                  goTo("colours");
                }}
                className="sh-focus group block w-full text-left"
              >
                <span className="relative block aspect-[4/5] overflow-hidden bg-[var(--sh-tile)]">
                  <CaseGlyph
                    hex={color.hex}
                    className="absolute left-1/2 top-1/2 h-[118%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg] transition-transform duration-500 group-hover:-rotate-[30deg]"
                  />
                </span>
                <span className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="sh-label">{color.name}</span>
                  <span className="sh-label t-figures">&euro;{PRICE_EUR}</span>
                </span>
                <span className="sh-caption block opacity-60">
                  {availabilityShort(color)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end px-4 pb-4 lg:px-5">
          <button
            type="button"
            tabIndex={shopOpen ? 0 : -1}
            onClick={() => goTo("catalogue")}
            className="sh-btn sh-roll-host sh-focus"
          >
            <Roll>All colours</Roll>
          </button>
        </div>
      </div>
    </header>
  );
}
