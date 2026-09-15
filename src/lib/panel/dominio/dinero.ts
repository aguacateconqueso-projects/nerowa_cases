/*
  El dinero se guarda SIEMPRE en centimos enteros. Nunca en euros con decimales.

  El motivo no es purismo: 0.1 + 0.2 no da 0.3 en coma flotante, y un panel que
  suma miles de lineas de pedido termina descuadrado por centimos que nadie sabe
  de donde salieron. Con enteros, la suma es exacta o no compila.

  La conversion a euros pasa por `formatearEuros`, y solo para mostrar.
*/

/** Centimos de euro. Entero, siempre. */
export type Centimos = number;

/** Tipo impositivo en puntos base: 2100 = 21%. Entero, por lo mismo. */
export type PuntosBase = number;

/** IVA de Lituania, de donde sale la mercancia. Ver docs/economia-nerowa.md §3. */
export const IVA_LITUANIA: PuntosBase = 2100;

export function euros(cantidad: number): Centimos {
  return Math.round(cantidad * 100);
}

export function formatearEuros(
  centimos: Centimos,
  opciones: { decimales?: boolean } = {},
): string {
  const { decimales = true } = opciones;
  /*
    Sin decimales cuando la cifra es redonda y el sitio es estrecho: en una
    tarjeta de pedido en telefono, "180 €" se lee de un vistazo y "180,00 €" no.
  */
  const mostrarDecimales = decimales || centimos % 100 !== 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: mostrarDecimales ? 2 : 0,
    maximumFractionDigits: mostrarDecimales ? 2 : 0,
  }).format(centimos / 100);
}

/** Aplica un tipo impositivo a una base imponible. */
export function aplicarIva(base: Centimos, tipo: PuntosBase): Centimos {
  return Math.round((base * tipo) / 10_000);
}

/** El precio final que ve el cliente: base + IVA. */
export function conIva(base: Centimos, tipo: PuntosBase): Centimos {
  return base + aplicarIva(base, tipo);
}

/**
 * Saca la base imponible de un total que ya lleva el IVA dentro.
 * Hace falta para leer de Stripe, que cobra sobre el total con impuestos.
 */
export function sinIva(total: Centimos, tipo: PuntosBase): Centimos {
  return Math.round((total * 10_000) / (10_000 + tipo));
}

/** Reparte `centimos` en `partes` sin perder ni ganar un centimo por redondeo. */
export function repartir(centimos: Centimos, partes: number): Centimos[] {
  if (partes <= 0) return [];
  const base = Math.floor(centimos / partes);
  const sobra = centimos - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < sobra ? 1 : 0));
}
