/*
  Paleta reactiva. Toda la web cambia de color cuando el comprador cambia el
  color del estuche, y ese cambio no puede romper la legibilidad: de eso se
  encarga este archivo y nadie mas.

  Hay DOS superficies, y cada una tiene su regla. Es la decision de Alfredo del
  2026-09-12: la pagina tiene que "explotar" de color al cambiar de estuche, pero
  un amarillo saturado a lo largo de seis secciones de texto no se lee.

    `hero`        FULL COLOR. El color del estuche llevado a su version mas
                  encendida. Ocupa solo la primera pantalla, que es donde vive
                  el impacto y donde casi no hay texto corrido.
    `background`  La version muy oscura y desaturada del mismo tono. Ocupa todo
                  lo que se lee: especificaciones, envios, preguntas, pie.

  Sobre el hero no se puede dar por hecho que el texto claro contrasta: un
  amarillo encendido pide texto negro y un azul marino pide texto blanco. Por eso
  `heroForegroundFor` no elige por gusto sino midiendo, con `contrastRatio`, cual
  de los dos gana. De ahi sale tambien `heroIsDark`, que es lo que usan el vidrio
  de la cabecera y los haces para darse vuelta enteros.

  Sobre `background` sigue valiendo lo de antes: nunca pasa del 10% de
  luminosidad, asi que el texto claro cumple AA en los catorce colores sin
  comprobarlos de a uno.
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

/* ------------------------------------------------------- el hero, full color */

/* Lo que la WCAG pide para texto normal. El hero se corrige hasta cumplirlo. */
const AA = 4.5;

/*
  El color del hero. Aqui NO se apaga nada: se enciende.

  - La saturacion sube a 0.62 como minimo. Los colores de catalogo que vienen
    apagados (el azul marino, el verde bosque) son los que mas lo necesitan: sin
    este piso, la pantalla completa se ve gris sucia en vez de azul.
  - La luminosidad se encierra entre 0.34 y 0.62. Por debajo de 0.34 el color deja
    de leerse como color y se vuelve una mancha oscura; por encima de 0.62 los
    haces negros pierden el sitio donde apoyarse y todo se lava.
  - Los grises no tienen tono que encender, asi que se resuelven por luminosidad:
    se abren a la franja 0.20-0.86 conservando cual era mas claro. El negro no se
    queda en negro puro a proposito — sobre negro puro un haz negro no existe.

  Y despues de todo eso, una correccion que NO es opcional. Encender el color deja
  a algunos tonos justo en la franja media, que es donde ni el texto blanco ni el
  negro llegan a AA: con los catorce colores de hoy le pasa al verde bosque (4.16)
  y al naranja (4.24). `enforceContrast` empuja la luminosidad del hero en la
  direccion que le conviene al texto que ya iba ganando, de a poco, hasta cruzar
  el 4.5. Es un ajuste de centesimas que no se ve, y sin el la pagina publica
  texto que no se lee.
*/
export function heroSurfaceFor(caseHex: string): string {
  const { h, s, l } = hexToHsl(caseHex);

  if (s < 0.06) {
    return enforceContrast({ h: 0, s: 0, l: 0.2 + l * 0.66 });
  }

  return enforceContrast({
    h,
    s: Math.max(s, 0.62),
    l: Math.min(Math.max(l, 0.34), 0.62),
  });
}

/*
  Mueve la luminosidad hasta que el mejor de los dos textos posibles llegue a AA.

  La direccion no se elige: se deduce. Si el que iba ganando era el texto claro,
  el hero tiene que oscurecerse; si era el oscuro, tiene que aclararse. El paso es
  de una centesima y el recorrido esta topado, asi que en el peor caso devuelve lo
  mejor que encontro en vez de irse a blanco o a negro.
*/
function enforceContrast(hsl: Hsl): string {
  let current = hsl;

  for (let step = 0; step < 40; step += 1) {
    const hex = hslToHex(current);
    const fg = heroForegroundFor(hex);
    if (contrastRatio(hex, fg) >= AA) return hex;

    /* Texto claro ganando -> hay que bajar el fondo. Oscuro -> subirlo. */
    const towardsDark = relativeLuminance(fg) > 0.5;
    const next = current.l + (towardsDark ? -0.01 : 0.01);
    if (next < 0.12 || next > 0.9) return hex;
    current = { ...current, l: next };
  }

  return hslToHex(current);
}

/*
  El texto del hero no se elige, se mide. Sobre amarillo encendido gana el negro y
  sobre azul marino gana el blanco, y cual de los dos sea depende del color que
  mande Alfredo, no de lo que a mi me parezca hoy. Se comparan los dos con
  `contrastRatio` y se queda el que mas saca.

  No son negro y blanco puros: el casi-negro lleva una pizca del tono y el
  casi-blanco tambien, para que el texto se vea parte de la misma superficie y no
  pegado encima de ella.
*/
export function heroForegroundFor(heroHex: string): string {
  const { h, s } = hexToHsl(heroHex);
  const ink = s < 0.06 ? "#0b0b0b" : hslToHex({ h, s: 0.55, l: 0.07 });
  const paper = s < 0.06 ? "#fafafa" : hslToHex({ h, s: 0.16, l: 0.97 });

  return contrastRatio(heroHex, ink) >= contrastRatio(heroHex, paper)
    ? ink
    : paper;
}

/*
  La superficie de los paneles flotantes que van encima del hero: la placa de la
  cabecera, el carrito y la consola de compra.

  No puede salir del color del hero directamente. Sobre un amarillo encendido un
  vidrio amarillo translucido no separa nada: el panel y el fondo son el mismo
  color y el borde desaparece. Lo que se hace es ir al extremo contrario del texto
  — si el texto del hero es claro, el panel es casi negro; si es oscuro, casi
  blanco — conservando una pizca del tono para que no se vea pegado de otra
  pagina.
*/
export function chromeFor(heroHex: string, heroIsDark: boolean): string {
  const { h, s } = hexToHsl(heroHex);
  if (s < 0.06) return heroIsDark ? "#0d0d0d" : "#f0f0f0";
  return hslToHex({ h, s: 0.3, l: heroIsDark ? 0.07 : 0.93 });
}

/*
  Cuanto pesan los haces negros encima del hero. Sobre un color claro el negro
  tiene todo el recorrido del mundo y hay que sujetarlo; sobre uno oscuro hay que
  subirlo o los haces no aparecen. Sale de la luminancia del propio hero, asi que
  se ajusta solo cuando entren los colores de verdad.
*/
export function beamStrengthFor(heroHex: string): number {
  const lum = relativeLuminance(heroHex);
  /* Los numeros salen de mirarlo, no de una formula bonita: con el reparto
     anterior los haces se veian bien sobre el azul marino y desaparecian sobre el
     amarillo. 0.05 de luminancia -> 0.71 ; 0.50 -> 0.49. */
  return Math.min(Math.max(0.74 - lum * 0.5, 0.42), 0.74);
}

export interface Palette {
  /* La superficie de lectura: todo lo que hay debajo del hero. */
  background: string;
  foreground: string;
  accent: string;
  /* Verdadero cuando el fondo es oscuro, que hoy es siempre. La interfaz
     pregunta por esto en vez de asumirlo, para que el dia que entre un fondo
     claro el cajon del carrito y los bordes se den vuelta solos. */
  isDark: boolean;

  /* La primera pantalla, a todo color. */
  hero: string;
  heroForeground: string;
  /* Verdadero cuando sobre el hero gano el texto claro. Lo leen el vidrio de la
     cabecera, la consola de compra y los haces, que se dan vuelta enteros. */
  heroIsDark: boolean;
  /* Peso de los haces negros sobre el hero, de 0 a 1. */
  beamStrength: number;
  /* La superficie de los paneles flotantes mientras se esta en el hero. */
  chrome: string;
}

export function paletteFor(caseHex: string): Palette {
  const background = backgroundFor(caseHex);
  const hero = heroSurfaceFor(caseHex);
  const heroForeground = heroForegroundFor(hero);
  const heroIsDark = relativeLuminance(heroForeground) > 0.5;

  return {
    background,
    foreground: foregroundFor(caseHex),
    accent: accentFor(caseHex),
    isDark: relativeLuminance(background) < 0.35,

    hero,
    heroForeground,
    heroIsDark,
    beamStrength: beamStrengthFor(hero),
    chrome: chromeFor(hero, heroIsDark),
  };
}
