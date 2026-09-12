"use client";

/*
  El carrito. Entra desde la derecha sobre un panel opaco, no translucido: aqui
  hay cifras y direcciones, y el vidrio deja el fondo compitiendo con el texto.

  El panel es oscuro o claro segun el fondo que tenga la web en ese momento. Hoy
  la formula del fondo siempre devuelve oscuro, asi que siempre sale oscuro; la
  pregunta esta escrita igual para que el dia que entre un fondo claro el cajon
  se de vuelta solo en vez de quedarse negro sobre negro.

  El pago todavia no existe: el boton de salida esta desactivado hasta la fase
  de Stripe. Se deja a la vista, y no escondido, para que se entienda que el
  camino termina ahi.
*/

import { useEffect, useRef } from "react";

import { PRICE_EUR, colorById } from "@/lib/store/catalog";
import { useStore } from "./store-context";

export function CartDrawer() {
  const { cart, cartCount, cartTotal, setQuantity, cartOpen, setCartOpen, palette } =
    useStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Escape cierra, y el foco entra al panel al abrirse: sin eso el teclado se
     queda detras, recorriendo los colores que ya no se ven. */
  useEffect(() => {
    if (!cartOpen) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCartOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cartOpen, setCartOpen]);

  const surface = palette.isDark ? "#0b0b0c" : "#fbfbfa";
  const ink = palette.isDark ? "#f2f2f2" : "#111111";

  return (
    <>
      <div
        aria-hidden
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        aria-hidden={!cartOpen}
        style={{ background: surface, color: ink }}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col transition-transform duration-[400ms] ease-out ${
          cartOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div
          className="flex items-center justify-between px-6 py-6"
          style={{ borderBottom: `1px solid ${ink}1a` }}
        >
          <h2 className="t-label">
            Cart
            {cartCount > 0 && (
              <span className="t-figures ml-2 opacity-50">{cartCount}</span>
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            className="store-focus -m-2 p-2 text-xl leading-none opacity-60 transition-opacity hover:opacity-100"
          >
            &#215;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {cart.length === 0 ? (
            <p className="t-body-sm opacity-50">
              Nothing here yet. Pick a colour and add a case.
            </p>
          ) : (
            <ul className="flex flex-col gap-5">
              {cart.map((line) => {
                const color = colorById(line.colorId);
                return (
                  <li key={line.colorId} className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="h-11 w-11 shrink-0 rounded-sm"
                      style={{
                        background: color.hex,
                        boxShadow: `inset 0 0 0 1px ${ink}26`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="t-body-sm font-medium">{color.name}</p>
                      <p className="t-figures text-sm opacity-50">
                        &euro;{PRICE_EUR} each
                      </p>
                    </div>
                    <Stepper
                      ink={ink}
                      quantity={line.quantity}
                      label={color.name}
                      onChange={(next) => setQuantity(line.colorId, next)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="px-6 py-6"
          style={{ borderTop: `1px solid ${ink}1a` }}
        >
          <div className="flex items-baseline justify-between">
            <span className="t-label opacity-60">Total</span>
            <span className="t-figures text-xl font-semibold">
              &euro;{cartTotal}
            </span>
          </div>
          <p className="t-label mt-2 text-[10px] opacity-45">
            Shipping calculated at checkout
          </p>

          <button
            type="button"
            disabled
            className="store-focus mt-5 w-full cursor-not-allowed px-6 py-4 t-label"
            style={{ background: `${ink}14`, color: `${ink}80` }}
          >
            Checkout opens soon
          </button>
        </div>
      </div>
    </>
  );
}

function Stepper({
  quantity,
  onChange,
  label,
  ink,
}: {
  quantity: number;
  onChange: (next: number) => void;
  label: string;
  ink: string;
}) {
  const border = `1px solid ${ink}26`;

  return (
    <div className="flex items-center" style={{ border }}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label={`Remove one ${label}`}
        className="store-focus h-9 w-9 text-base leading-none opacity-70 transition-opacity hover:opacity-100"
      >
        &#8722;
      </button>
      <span className="t-figures w-7 text-center text-sm">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`Add one ${label}`}
        className="store-focus h-9 w-9 text-base leading-none opacity-70 transition-opacity hover:opacity-100"
      >
        +
      </button>
    </div>
  );
}
