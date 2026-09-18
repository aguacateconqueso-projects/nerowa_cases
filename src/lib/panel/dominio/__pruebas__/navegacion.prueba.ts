/*
  El guardian de que un toque en una pestana sigue contestando.

  POR QUE ESTO ES UNA PRUEBA Y NO UN COMENTARIO

  Porque ya pasó una vez: en la vuelta 16 la regla de `salud.ts` estaba escrita
  en la cabecera del propio archivo, y la rompi yo tres dias despues,
  optimizando. La leccion de aquella vuelta fue que **un comentario en una
  cabecera no protege nada**.

  Lo que se vigila aqui son dos averias que **no dan ningun error**. No rompen
  la compilacion, no fallan ninguna otra prueba, no sale nada en rojo: el panel
  simplemente vuelve a quedarse mudo al tocar, y nadie se entera hasta que
  Adrian escribe otra vez que tiene que tocar treinta veces.

  Son de lectura del codigo fuente, no de ejecucion, y eso esta bien: lo que se
  comprueba es una propiedad de la FORMA de los archivos, que es justo lo que
  se pierde de vista al editarlos.
*/

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let hechas = 0;
function comprueba(que: string, fn: () => void) {
  fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

/* Las pruebas se lanzan desde la raiz del proyecto (ver `package.json`). */
const raiz = process.cwd();
const PANEL = join(raiz, "src", "app", "panel");

console.log("\nQue un toque en una pestana siga contestando");

comprueba("existe el loading.tsx del panel, que es lo unico que se precarga", () => {
  /*
    Sin este archivo, Next NO precarga nada de una ruta dinamica — y todas las
    del panel lo son, porque leen la cookie de sesion. Medido: la precarga
    pasaba de ~8 KB con el armazon dentro a ~300 bytes con `null` en cada
    hueco, o sea nada que pintar. El toque dejaba de cambiar un solo pixel.

    Esta escrito en la documentacion de esta version de Next, en
    `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`:

      "Dynamic Route: prefetching is skipped, or the route is partially
       prefetched if loading.tsx is present."
  */
  assert.ok(
    existsSync(join(PANEL, "loading.tsx")),
    "falta src/app/panel/loading.tsx: sin el, ninguna pantalla del panel se " +
      "precarga y el toque vuelve a no dar senal",
  );
});

comprueba("el layout del panel no espera datos, que dejaria mudo al loading.tsx", () => {
  /*
    LA AVERIA SILENCIOSA, y es la peor de las dos.

    Un `loading.tsx` NO cubre a su propio layout. Si este layout se vuelve
    `async` o se pone a consultar algo, la navegacion se bloquea ESPERANDO AL
    LAYOUT y el esqueleto no llega a verse — con el archivo ahi, intacto, y sin
    un solo error en ninguna parte. La documentacion de `loading.js` lo dice:

      "If the layout accesses uncached or runtime data [...] Navigation blocks
       until the layout finishes rendering."

    El arreglo, el dia que haga falta un dato en el layout: que lo pida una
    pieza envuelta en su propio `<Suspense>`, no el layout.
  */
  const layout = readFileSync(join(PANEL, "layout.tsx"), "utf8");

  assert.doesNotMatch(
    layout,
    /export default async function/,
    "el layout del panel se volvio async: la navegacion espera por el y el " +
      "esqueleto de loading.tsx deja de verse",
  );
  assert.doesNotMatch(
    layout,
    /\bawait\b/,
    "el layout del panel espera algo (await): bloquea la navegacion y anula " +
      "el loading.tsx",
  );
  assert.doesNotMatch(
    layout,
    /servicios\(\)|usuarioActual|cookies\(/,
    "el layout del panel pide datos o sesion: eso bloquea la navegacion. " +
      "Va en la pantalla, o en una pieza con su propio <Suspense>",
  );
});

comprueba("la pestana avisa de que se la toco, sin esperar al servidor", () => {
  /*
    Las tres senales de un toque, y las tres tienen que seguir ahi. Ver la
    cabecera de `barra-pestanas.tsx`: la primera es instantanea pero se va al
    levantar el dedo, la segunda cubre la espera, la tercera dice a donde se va.
  */
  const barra = readFileSync(join(PANEL, "_piezas", "barra-pestanas.tsx"), "utf8");
  const css = readFileSync(join(PANEL, "panel.css"), "utf8");

  assert.match(
    barra,
    /useLinkStatus/,
    "la barra de pestanas dejo de mirar si la navegacion esta en curso",
  );
  /*
    Y que ademas se USE. Mirar solo que la palabra aparezca no vale: la primera
    version de esta prueba daba verde con el `<Yendo />` quitado del render,
    porque `useLinkStatus` seguia escrito mas abajo en una funcion que ya no
    llamaba nadie. Una senal que no se pinta es igual que no tenerla.
  */
  assert.match(
    barra,
    /<Yendo\s*\/>/,
    "la marca de 'voy' ya no se pinta dentro del <Link>: useLinkStatus sigue " +
      "escrito pero no lo usa nadie",
  );
  assert.match(
    css,
    /\.panel-pestana:active/,
    "la pestana se quedo sin :active: es la unica senal que llega en cero ms",
  );
  assert.match(
    css,
    /\.panel-pestana:has\(\.panel-pestana-marca\)/,
    "el CSS ya no lee la marca de 'voy' que pone useLinkStatus",
  );
});

comprueba("la barra de pestanas no vuelve a llevar desenfoque", () => {
  /*
    `backdrop-filter` sobre un elemento `position: fixed` obliga a Safari de
    iPhone a recomponer la franja en cada fotograma del scroll — justo la barra
    que hay que poder tocar. Se quito por lo que cuesta, no por lo que se ve.

    Si alguien lo quiere de vuelta: que mida antes en un telefono de verdad y
    borre esta comprobacion a conciencia, no de pasada.
  */
  const css = readFileSync(join(PANEL, "panel.css"), "utf8");
  /* Sin los comentarios, que ahi si se nombra, y a proposito. */
  const soloReglas = css.replace(/\/\*[\s\S]*?\*\//g, "");

  assert.doesNotMatch(
    soloReglas,
    /backdrop-filter/,
    "volvio el desenfoque a la barra: cuesta un recompuesto por fotograma en " +
      "el iPhone y no se distingue sobre un fondo ya opaco al 92 %",
  );
});

console.log(`\n${hechas} comprobaciones de navegacion, todas en verde.\n`);
