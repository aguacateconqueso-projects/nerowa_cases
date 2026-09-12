/*
  La silueta del estuche y la textura de trenzado, en un solo sitio.

  MARCADOR DE POSICION. Esto no es el estuche: es una aproximacion a su forma
  hecha a partir de las fotos, para poder resolver camara, luz, giro, apertura y
  cambio de color antes de que exista el `.glb`. Cuando llegue el modelo real,
  lo que se borra es este archivo y el cuerpo de `case-model.tsx`; la escena, la
  interaccion y el color se quedan como estan.

  Medidas del marcador, en unidades de escena:
    largo 10 · ancho maximo 1.42 (proporcion 1:7) · grosor cerrado 0.70
*/

import * as THREE from "three";

export const CASE_LENGTH = 10;
export const CASE_HALF_WIDTH = 0.71;
export const LID_DEPTH = 0.34;
export const BASE_DEPTH = 0.3;

/*
  Medio ancho a lo largo del estuche. `t` va de 0 (punta angosta, la del
  clavijero) a 1 (punta ancha).

  Son dos factores multiplicados:
  - `belly` da la panza asimetrica que tiene el estuche en las fotos, mas ancho
    pasado el primer tercio.
  - `cap` mantiene el ancho casi constante en el medio y lo cierra en redondo en
    los dos extremos. El exponente 8 es lo que hace que la curva no empiece a
    cerrar hasta muy cerca de la punta; el 0.45 final es lo que redondea la
    punta en vez de dejarla en pico.
*/
function halfWidthAt(t: number): number {
  const belly = 0.78 + 0.22 * Math.sin(Math.PI * Math.pow(t, 0.85));
  const cap = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 8)), 0.45);
  return CASE_HALF_WIDTH * belly * cap;
}

/*
  La silueta cerrada, vista desde arriba. Se recorre el borde derecho de punta a
  punta y se vuelve por el izquierdo. El largo va en Y para que el eje largo del
  estuche sea vertical: asi la diagonal del hero es un giro en Z y nada mas.
*/
export function buildCaseOutline(
  widthScale = 1,
  lengthScale = widthScale,
  steps = 120,
): THREE.Shape {
  return new THREE.Shape(outlinePoints(widthScale, lengthScale, steps));
}

/*
  El ancho y el largo se escalan por separado. El hueco interior no es la
  silueta encogida: encoge mucho de ancho, porque ahi va el grosor de la pared,
  y casi nada de largo, porque el estuche por dentro es casi tan largo como por
  fuera. Encogerlo parejo dejaria un reborde de metro y medio en cada punta.
*/
function outlinePoints(
  widthScale: number,
  lengthScale: number,
  steps: number,
): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(
      new THREE.Vector2(
        halfWidthAt(t) * widthScale,
        (t - 0.5) * CASE_LENGTH * lengthScale,
      ),
    );
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    points.push(
      new THREE.Vector2(
        -halfWidthAt(t) * widthScale,
        (t - 0.5) * CASE_LENGTH * lengthScale,
      ),
    );
  }

  return points;
}

/*
  La misma silueta como agujero. Va al reves que el contorno: si las dos curvas
  giran en el mismo sentido, el extrusor no entiende cual es el hueco y devuelve
  una cara solida.
*/
export function buildCaseHole(
  widthScale: number,
  lengthScale: number,
  steps = 120,
): THREE.Path {
  return new THREE.Path(
    outlinePoints(widthScale, lengthScale, steps).reverse(),
  );
}

/*
  Trenzado de fibra de carbono, dibujado en un lienzo y repetido sobre la
  carcasa. No pinta color: solo modula la rugosidad, que es lo que hace que la
  luz se quiebre en diagonal como en las fotos del estuche blanco y el rojo.

  Se dibuja una vez y se reparte entre todos los materiales.
*/
let weaveTexture: THREE.Texture | null = null;

export function getWeaveTexture(): THREE.Texture | null {
  if (weaveTexture) return weaveTexture;
  if (typeof document === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  /* Sarga 2x2: dos familias de diagonales cruzadas, una clara y una oscura. */
  ctx.lineWidth = 3;
  for (const [offset, shade] of [
    [0, "rgba(255,255,255,0.5)"],
    [8, "rgba(0,0,0,0.42)"],
  ] as const) {
    ctx.strokeStyle = shade;
    ctx.beginPath();
    for (let i = -size; i < size * 2; i += 16) {
      ctx.moveTo(i + offset, 0);
      ctx.lineTo(i + offset + size, size);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 18);
  texture.anisotropy = 4;

  weaveTexture = texture;
  return texture;
}
