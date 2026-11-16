"use client";

/*
  Piezas chicas que usan varias secciones de `/shop`.
*/

import { useEffect, useState, type RefObject } from "react";

import { PRICE_EUR, type CaseColor } from "@/lib/store/catalog";
import { availabilityShort } from "@/lib/shop/content";
import { useStore } from "@/components/store/store-context";
import { CaseGlyph } from "./case-glyph";

/* ------------------------------------------------------------ texto que rueda */

/*
  El texto de los enlaces de la referencia: sube y entra una copia desde abajo.
  El efecto lo enciende la clase `sh-roll-host` del enlace o boton que lo
  envuelve. La copia de abajo es solo decorado y se esconde del lector.
*/
export function Roll({ children }: { children: React.ReactNode }) {
  return (
    <span className="sh-roll">
      <span className="sh-roll__track">
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------- esta a la vista */

/*
  Verdadero mientras el elemento esta en pantalla. Lo usan las escenas 3D para
  apagar su bucle de dibujo fuera de pantalla: hay dos en la pagina y no tiene
  sentido que una gaste bateria mientras se lee la otra.
*/
export function useInView(
  ref: RefObject<Element | null>,
  rootMargin = "0px",
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

/* --------------------------------------------------------------- comprar */

/* Lo que hace "Buy now" en toda la pagina: mete el estuche y abre el carrito. */
export function useBuy() {
  const { addToCart, setCartOpen } = useStore();
  return (color: CaseColor) => {
    if (color.availability === "sold-out") return;
    addToCart(color.id);
    setCartOpen(true);
  };
}

/* ------------------------------------------------------- la tarjeta de compra */

/*
  La tarjeta pequena que flota en las esquinas de la referencia: foto, nombre,
  cantidad, precio y "Buy now". Aqui la foto es el estuche dibujado en el color.
*/
export function MiniCard({
  color,
  className = "",
}: {
  color: CaseColor;
  className?: string;
}) {
  const buy = useBuy();
  const soldOut = color.availability === "sold-out";

  return (
    <div
      className={`flex w-full max-w-[340px] bg-[var(--sh-paper)] text-[var(--sh-ink)] shadow-[0_16px_40px_-24px_rgb(0_0_0/0.5)] ${className}`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[var(--sh-tile)]">
        <CaseGlyph
          key={color.id}
          hex={color.hex}
          className="sh-fade absolute left-1/2 top-1/2 h-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-2 pl-3 pr-3">
        <div className="sh-label flex items-baseline justify-between gap-3">
          <span key={color.id} className="sh-fade truncate">
            {color.name}
          </span>
          <span className="shrink-0 opacity-60">
            {soldOut ? "Sold out" : color.availability === "low" ? "Last few" : "1 case"}
          </span>
        </div>
        <div className="sh-label flex items-end justify-between gap-3">
          <span className="t-figures">&euro;{PRICE_EUR}</span>
          {soldOut ? (
            <span className="opacity-60">Back in 2–3 weeks</span>
          ) : (
            <button
              type="button"
              onClick={() => buy(color)}
              className="sh-roll-host sh-focus -m-1 p-1"
              aria-label={`Buy now: ${color.name} case, ${availabilityShort(color).toLowerCase()}`}
            >
              <Roll>Buy now</Roll>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------- el formulario de correo */

/*
  La lista de correo todavia no existe: no hay donde guardar la direccion. El
  formulario esta con su forma final, pero al enviarlo dice la verdad en vez de
  fingir que se apunto a alguien. Cuando exista la lista, aqui va la llamada.
*/
export function useListSignup() {
  const [tried, setTried] = useState(false);
  return {
    tried,
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
    },
  };
}
