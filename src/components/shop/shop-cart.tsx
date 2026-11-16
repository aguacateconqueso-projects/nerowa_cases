"use client";

/*
  El carrito. En la referencia no es un cajon de pantalla entera: es un panel
  claro que cae arriba a la derecha, con el titulo en grande, las lineas, el
  resumen del pedido y el boton de pagar. Vacio, ensena una frase en serif y una
  salida a la tienda.

  Lo que no se copia:
    - La barra de "envio gratis a partir de". Nerowa no tiene ese umbral, y
      inventarlo seria prometer algo.
    - El selector de suscripcion. Aqui se compra un estuche, no una entrega.

  El estado es el de `/store` (`store-context.tsx`): el mismo carrito, guardado
  en el navegador, sirve a las dos paginas.

  El pago todavia no existe, igual que en `/store`: el boton se queda a la vista
  y desactivado para que se entienda que el camino termina ahi.
*/

import { useEffect, useRef } from "react";

import { PRICE_EUR, colorById } from "@/lib/store/catalog";
import { useStore } from "@/components/store/store-context";
import { Roll } from "./bits";
import { CaseGlyph } from "./case-glyph";

export function ShopCart() {
  const { cart, cartCount, cartTotal, setQuantity, cartOpen, setCartOpen } = useStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cartOpen) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCartOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cartOpen, setCartOpen]);

  /* Con el carrito abierto, la pagina de detras no se mueve. */
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  const goShopping = () => {
    setCartOpen(false);
    document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div
        aria-hidden
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        aria-hidden={!cartOpen}
        className={`fixed right-2 top-2 z-50 flex max-h-[calc(100svh-16px)] w-[calc(100%-16px)] max-w-[440px] flex-col bg-[var(--sh-paper)] text-[var(--sh-ink)] shadow-[0_32px_64px_-32px_rgb(0_0_0/0.7)] transition-[opacity,transform] duration-300 ease-out ${
          cartOpen ? "opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-4 pt-4">
          <h2 className="sh-lg">
            Cart <span className="t-figures">({cartCount})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setCartOpen(false)}
            className="sh-roll-host sh-focus sh-label mt-1"
          >
            <Roll>Close</Roll>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col gap-10 px-4 pb-4 pt-8">
            <p className="sh-serif sh-serif-md opacity-60">
              Nothing in here yet. Fourteen colours are waiting, and two bows need a case.
            </p>
            <button type="button" onClick={goShopping} className="sh-btn sh-roll-host sh-focus w-full py-3">
              <Roll>Go to colours</Roll>
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-6 flex-1 overflow-y-auto border-t border-black/10">
              {cart.map((line) => {
                const color = colorById(line.colorId);
                return (
                  <li key={line.colorId} className="flex gap-3 border-b border-black/10 p-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[var(--sh-tile)]">
                      <CaseGlyph
                        hex={color.hex}
                        className="absolute left-1/2 top-1/2 h-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg]"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <p className="sh-label">Nerowa: {color.name}</p>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.colorId, 0)}
                          className="sh-roll-host sh-focus sh-label opacity-60 hover:opacity-100"
                          aria-label={`Remove ${color.name}`}
                        >
                          <Roll>Remove</Roll>
                        </button>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="sh-label opacity-60">Two-bow case</p>
                          <p className="sh-label t-figures">&euro;{PRICE_EUR * line.quantity}</p>
                        </div>
                        <label className="sh-label flex items-center gap-2 border border-black/15 px-2 py-1">
                          <span className="opacity-60">Qty</span>
                          <select
                            value={line.quantity}
                            onChange={(event) => setQuantity(line.colorId, Number(event.target.value))}
                            className="sh-focus t-figures bg-transparent"
                            aria-label={`Quantity of ${color.name}`}
                          >
                            {Array.from({ length: Math.max(10, line.quantity) }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="px-4 pb-4 pt-6">
              <p className="sh-eyebrow">Order summary</p>
              <dl className="mt-3 border-t border-black/10">
                <div className="flex justify-between border-b border-black/10 py-3">
                  <dt className="sh-label">
                    Subtotal (<span className="t-figures">{cartCount}</span>{" "}
                    {cartCount === 1 ? "item" : "items"})
                  </dt>
                  <dd className="sh-label t-figures">&euro;{cartTotal}</dd>
                </div>
                <div className="flex justify-between border-b border-black/10 py-3">
                  <dt className="sh-label">Shipping</dt>
                  <dd className="sh-label opacity-60">At checkout</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="sh-body font-medium">Total</dt>
                  <dd className="sh-body t-figures font-medium">&euro;{cartTotal}</dd>
                </div>
              </dl>
              <button type="button" disabled className="sh-btn mt-3 w-full py-3">
                Checkout opens soon
              </button>
              <p className="sh-caption mt-3 text-center opacity-60">
                Shipping and taxes calculated at checkout
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
