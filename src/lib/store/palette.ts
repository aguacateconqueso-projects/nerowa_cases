/*
  Paleta reactiva. Toda la web cambia de color cuando el comprador cambia el
  color del estuche, y ese cambio no puede romper la legibilidad: de eso se
  encarga este archivo y nadie mas.

  Regla del fondo (viene de `docs/estructura-web.md`): el fondo NO toma el color
  literal del estuche. Toma una version muy oscura y desaturada del mismo tono.
  Si el estuche es crema y el fondo es crema, el objeto desaparece.

  Como el fondo siempre queda por debajo del 10% de luminosidad, el texto claro
  cumple AA en los catorce colores sin tener que comprobarlos uno a uno. La
  comprobacion igual esta escrita abajo, en `contrastRatio`, para poder correrla.
*/

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

/* ---------------------------------------------------------------- conversion */

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function hexToHsl(hex: string): Hsl {
  const [r255, g255, b255] = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* ----------------------------------------------------------------- contraste */

/* Luminancia relativa de la WCAG. 0 es negro, 1 es blanco. */
export function relativeLuminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/* Razon de contraste entre dos colores. AA para texto normal pide 4.5. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* --------------------------------------------------------------- la formula */

/*
  Del color del estuche al fondo de la web.

  - El tono se conserva: es lo unico que hace reconocible el cambio.
  - La saturacion se corta a un tercio y se topa en 0.20. Sin ese tope, el rojo
    daria un fondo vinotinto encendido que compite con el estuche.
  - La luminosidad se aplasta a una franja de 0.05 a 0.085. Un estuche claro
    deja un fondo apenas mas abierto que uno oscuro, lo justo para que se note
    que cambio, nunca lo suficiente para tragarse el objeto.
  - Los grises (saturacion casi nula) se van a negro puro: un gris "desaturado"
    con tono inventado se ve sucio.
*/
export function backgroundFor(caseHex: string): string {
  const { h, s, l } = hexToHsl(caseHex);

  if (s < 0.06) return hslToHex({ h: 0, s: 0, l: 0.035 + l * 0.03 });

  return hslToHex({
    h,
    s: Math.min(s * 0.34, 0.2),
    l: 0.05 + l * 0.035,
  });
}

/*
  El texto sale del mismo tono que el fondo, casi blanco y con una pizca de
  color. Blanco puro sobre un fondo con tono se ve pegado encima; este se ve
  parte de la misma escena y sigue cumpliendo AA de sobra.
*/
export function foregroundFor(caseHex: string): string {
  const { h, s } = hexToHsl(caseHex);
  if (s < 0.06) return "#f2f2f2";
  return hslToHex({ h, s: 0.1, l: 0.955 });
}

/*
  El acento es el color del estuche, pero llevado a una franja donde siempre se
  lee sobre el fondo oscuro: se le sube la luminosidad a los tonos apagados y se
  le sube la saturacion a los lavados. El negro y el blanco no tienen tono que
  usar, asi que caen en el dorado de la marca.
*/
export function accentFor(caseHex: string): string {
  const { h, s, l } = hexToHsl(caseHex);
  if (s < 0.06) return l > 0.5 ? "#e8e8e8" : "#d4a441";
  return hslToHex({
    h,
    s: Math.max(s, 0.55),
    l: Math.min(Math.max(l, 0.6), 0.72),
  });
}

export interface Palette {
  background: string;
  foreground: string;
  accent: string;
  /* Verdadero cuando el fondo es oscuro, que hoy es siempre. La interfaz
     pregunta por esto en vez de asumirlo, para que el dia que entre un fondo
     claro el cajon del carrito y los bordes se den vuelta solos. */
  isDark: boolean;
}

export function paletteFor(caseHex: string): Palette {
  const background = backgroundFor(caseHex);
  return {
    background,
    foreground: foregroundFor(caseHex),
    accent: accentFor(caseHex),
    isDark: relativeLuminance(background) < 0.35,
  };
}
