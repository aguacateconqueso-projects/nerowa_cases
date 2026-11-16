/*
  Saca las fotos de producto del case, una cerrada y una abierta por color,
  desde el `.glb`. Son las que usan las miniaturas, tarjetas y el carrito.

  Cuando correrlo: cada vez que cambie un color en `src/lib/store/catalog.ts`
  o cambie el `.glb`.

  Como:
    1. npm run dev                      (deja el servidor en marcha)
    2. node scripts/miniaturas-case.cjs  [http://localhost:3000] [id ...]

  Con ids al final (por ejemplo `midnight-blue`), saca solo esos colores.

  Necesita Playwright con Chromium instalado en la maquina (no es dependencia
  del proyecto). `sharp` si lo es: viene con Next.

  Lee los colores de `catalog.ts`, abre `/render-case` (pagina que solo existe
  en desarrollo) para cada uno, toma los pixeles del lienzo tal cual (con
  transparencia, sin nada de la pagina encima), recorta el aire alrededor y
  guarda en `public/images/case/<id>-closed.webp` y `<id>-open.webp`. Al final
  escribe `src/lib/store/case-images.ts` con las medidas de las fotos.
*/

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");

const BASE = process.argv[2] || "http://localhost:3000";
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public/images/case");

const catalog = fs.readFileSync(path.join(ROOT, "src/lib/store/catalog.ts"), "utf8");
const block = catalog.slice(catalog.indexOf("export const COLORS"), catalog.indexOf("];", catalog.indexOf("export const COLORS")));
const all = [...block.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
const only = process.argv.slice(3);
const ids = only.length ? all.filter((id) => only.includes(id)) : all;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  const sizes = {};

  for (const id of ids) {
    for (const view of ["closed", "open"]) {
      await page.goto(`${BASE}/render-case?color=${id}&view=${view}`, { waitUntil: "networkidle" });
      await page.waitForSelector("#studio[data-ready]", { timeout: 120000 });
      const dataUrl = await page.evaluate(() => document.querySelector("#studio canvas").toDataURL("image/png"));
      const png = Buffer.from(dataUrl.split(",")[1], "base64");
      const file = path.join(OUT, `${id}-${view}.webp`);
      const { info } = await sharp(png)
        .trim({ threshold: 1 })
        .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 82, alphaQuality: 90 })
        .toFile(file)
        .then((info) => ({ info }));
      sizes[view] = sizes[view] || { width: info.width, height: info.height };
      console.log(`${id}-${view}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    }
  }
  await browser.close();

  /* Todas las fotos de una vista miden lo mismo (misma pose, mismo case), asi
     que basta una medida por vista. */
  const ts = `/*
  GENERADO por \`scripts/miniaturas-case.cjs\`. No se edita a mano.
  Medidas reales de las fotos de producto en \`public/images/case/\`.
*/

export const CASE_IMAGE_SIZE = ${JSON.stringify(sizes, null, 2)} as const;
`;
  fs.writeFileSync(path.join(ROOT, "src/lib/store/case-images.ts"), ts);
  console.log("listo:", ids.length, "colores");
})();
