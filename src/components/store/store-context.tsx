"use client";

/*
  El estado compartido de la tienda: que color se esta mirando, en que vista
  esta el estuche y que hay en el carrito.

  Vive en un contexto y no en la pagina porque tres zonas muy separadas del
  arbol dependen del mismo color: la escena 3D, la capa de texto y el cajon del
  carrito. Pasarlo por props obligaria a atravesar la pagina entera.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  COLORS,
  DEFAULT_COLOR_ID,
  PRICE_EUR,
  colorById,
  type CaseColor,
  type CaseView,
} from "@/lib/store/catalog";
import { paletteFor, type Palette } from "@/lib/store/palette";

export interface CartLine {
  colorId: string;
  quantity: number;
}

interface StoreValue {
  color: CaseColor;
  palette: Palette;
  setColorId: (id: string) => void;

  view: CaseView;
  setView: (view: CaseView) => void;

  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (colorId: string) => void;
  setQuantity: (colorId: string, quantity: number) => void;

  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const CART_KEY = "nerowa.cart.v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID);
  const [view, setView] = useState<CaseView>("closed");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  /*
    El carrito sobrevive a la recarga. Se lee despues del primer render a
    proposito: leer `localStorage` durante el render deja el HTML del servidor y
    el del cliente distintos, y React lo rechaza.
  */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY);
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;

      /* Se filtra contra el catalogo vivo: si un color deja de existir, su
         linea guardada se cae sola en vez de romper el carrito. */
      const valid = parsed.filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).colorId === "string" &&
          typeof (line as CartLine).quantity === "number" &&
          COLORS.some((c) => c.id === (line as CartLine).colorId),
      );
      /*
        eslint-disable-next-line react-hooks/set-state-in-effect --
        El almacenamiento del navegador no existe en el servidor. Si se leyera
        durante el render, el HTML del servidor saldria con el carrito vacio y
        el del cliente con el carrito lleno, y React rechaza esa diferencia. La
        unica forma de rehidratarlo es despues del primer render.
      */
      setCart(valid);
    } catch {
      /* Navegador con el almacenamiento bloqueado. El carrito arranca vacio. */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* Igual que arriba: si no se puede guardar, la sesion sigue. */
    }
  }, [cart]);

  const addToCart = useCallback((id: string) => {
    setCart((lines) => {
      const found = lines.find((line) => line.colorId === id);
      if (found) {
        return lines.map((line) =>
          line.colorId === id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...lines, { colorId: id, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setCart((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.colorId !== id)
        : lines.map((line) =>
            line.colorId === id ? { ...line, quantity } : line,
          ),
    );
  }, []);

  const color = colorById(colorId);
  const palette = useMemo(() => paletteFor(color.hex), [color.hex]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const value = useMemo<StoreValue>(
    () => ({
      color,
      palette,
      setColorId,
      view,
      setView,
      cart,
      cartCount,
      cartTotal: cartCount * PRICE_EUR,
      addToCart,
      setQuantity,
      cartOpen,
      setCartOpen,
    }),
    [color, palette, view, cart, cartCount, addToCart, setQuantity, cartOpen],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore se uso fuera de <StoreProvider>");
  return value;
}
