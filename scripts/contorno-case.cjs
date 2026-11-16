/*
  Saca el contorno del case visto desde arriba, del `.glb` real, para el plano
  acotado de `/shop` ("The numbers").

  Cuando correrlo: si cambia la forma del `.glb`.
    node scripts/contorno-case.cjs

  Lee la cascara de la base (`base_shell`, material `shell`) del `.glb` sin
  comprimir, parte el largo en tramos y en cada tramo toma el borde de un lado
  y del otro. Escribe `src/lib/store/case-outline.ts` en milimetros, con el
  largo en horizontal: la punta ancha a la derecha, el lado de las bisagras
  (recto) arriba y el de los cierres (curvo) abajo.
*/

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const glb = fs.readFileSync(path.join(ROOT, "public/models/nerowa_case.glb"));
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
const binStart = 20 + jsonLength + 8;

const node = gltf.nodes.find((n) => n.name === "base_shell");
const primitive = gltf.meshes[node.mesh].primitives.find((p) => gltf.materials[p.material].name === "shell");
const accessor = gltf.accessors[primitive.attributes.POSITION];
const view = gltf.bufferViews[accessor.bufferView];
const offset = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
const stride = view.byteStride || 12;

const [zMin, zMax] = [accessor.min[2], accessor.max[2]];
const STEPS = 200;
const lo = new Array(STEPS).fill(Infinity);
const hi = new Array(STEPS).fill(-Infinity);

for (let i = 0; i < accessor.count; i++) {
  const x = glb.readFloatLE(offset + i * stride);
  const z = glb.readFloatLE(offset + i * stride + 8);
  const k = Math.min(Math.floor(((z - zMin) / (zMax - zMin)) * STEPS), STEPS - 1);
  lo[k] = Math.min(lo[k], x);
  hi[k] = Math.max(hi[k], x);
}

/* De metros del `.glb` a milimetros del plano. El largo va en horizontal y se
   invierte para dejar la punta ancha (-Z) a la derecha. */
const mm = (v) => Math.round(v * 10000) / 10;
const zAt = (k) => zMin + ((k + 0.5) / STEPS) * (zMax - zMin);
const top = [], bottom = [], samples = [];
for (let k = 0; k < STEPS; k++) {
  if (!Number.isFinite(lo[k])) continue;
  top.push(`${mm(-zAt(k))} ${mm(lo[k])}`);
  bottom.push(`${mm(-zAt(k))} ${mm(hi[k])}`);
  samples.push([mm(-zAt(k)), mm(lo[k]), mm(hi[k])]);
}
/* De izquierda a derecha, para buscar el borde en una x dada. */
samples.sort((a, b) => a[0] - b[0]);
const d = `M${top.join("L")}L${bottom.reverse().join("L")}Z`;

const ts = `/*
  GENERADO por \`scripts/contorno-case.cjs\` desde el \`.glb\`. No se edita a mano.

  El contorno del case visto desde arriba, en milimetros. El largo va en
  horizontal, con la punta ancha a la derecha; el lado de las bisagras (recto)
  arriba y el de los cierres (curvo) abajo.
*/

export const CASE_OUTLINE = {
  /* Caja del dibujo: x de punta a punta, y de borde a borde. */
  minX: ${mm(-zMax)},
  maxX: ${mm(-zMin)},
  minY: ${mm(Math.min(...lo.filter(Number.isFinite)))},
  maxY: ${mm(Math.max(...hi.filter(Number.isFinite)))},
  path: "${d}",
  /* [x, borde de arriba, borde de abajo] por tramo, de izquierda a derecha. */
  samples: ${JSON.stringify(samples)} as ReadonlyArray<readonly [number, number, number]>,
} as const;

/* Los dos bordes del case en una x, en milimetros. */
export function edgesAt(x: number): { top: number; bottom: number } {
  let best = CASE_OUTLINE.samples[0];
  for (const s of CASE_OUTLINE.samples) if (Math.abs(s[0] - x) < Math.abs(best[0] - x)) best = s;
  return { top: best[1], bottom: best[2] };
}
`;
fs.writeFileSync(path.join(ROOT, "src/lib/store/case-outline.ts"), ts);
console.log("contorno:", top.length, "tramos,", d.length, "caracteres");
