/*
  Saca el contorno del case visto desde arriba, del `.glb` real, para el plano
  acotado de `/shop` ("The numbers").

  Cuando correrlo: si cambia la forma del `.glb`.
    node scripts/contorno-case.cjs

  Lee la cascara de la base (`base_shell`, material `shell`) del `.glb` sin
  comprimir, la pinta vista desde arriba en una cuadricula de 0.25 mm y toma su
  borde. Escribe `src/lib/store/case-outline.ts` en milimetros, con el
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

function readAccessor(index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const start = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return { accessor, view, start };
}

/* Vertices, en el plano de arriba: x (ancho) y z (largo). */
const pos = readAccessor(primitive.attributes.POSITION);
const posStride = pos.view.byteStride || 12;
const vx = new Float32Array(pos.accessor.count);
const vz = new Float32Array(pos.accessor.count);
for (let i = 0; i < pos.accessor.count; i++) {
  vx[i] = glb.readFloatLE(pos.start + i * posStride);
  vz[i] = glb.readFloatLE(pos.start + i * posStride + 8);
}

/* Triangulos. */
const idx = readAccessor(primitive.indices);
const idxSize = idx.accessor.componentType === 5125 ? 4 : 2;
const readIndex = (i) =>
  idxSize === 4 ? glb.readUInt32LE(idx.start + i * 4) : glb.readUInt16LE(idx.start + i * 2);

/*
  Se "fotografia" la cascara desde arriba: cada triangulo se pinta en una
  cuadricula de 0.25 mm. El contorno es el borde de lo pintado, columna a
  columna. Asi las puntas salen redondas y los bordes lisos; sacarlo de los
  vertices sueltos (como se hacia antes) dejaba los bordes ondulados y las
  puntas cortadas en recto.
*/
const RES = 4; /* celdas por milimetro */
const [zMin, zMax] = [pos.accessor.min[2], pos.accessor.max[2]];
const [xMin, xMax] = [pos.accessor.min[0], pos.accessor.max[0]];
const cols = Math.ceil((zMax - zMin) * 1000 * RES) + 1;
const rows = Math.ceil((xMax - xMin) * 1000 * RES) + 1;
const grid = new Uint8Array(cols * rows);
const toCol = (z) => (z - zMin) * 1000 * RES;
const toRow = (x) => (x - xMin) * 1000 * RES;

for (let t = 0; t < idx.accessor.count; t += 3) {
  const a = readIndex(t), b = readIndex(t + 1), c = readIndex(t + 2);
  const p = [[toCol(vz[a]), toRow(vx[a])], [toCol(vz[b]), toRow(vx[b])], [toCol(vz[c]), toRow(vx[c])]];
  const area = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
  if (Math.abs(area) < 1e-9) continue;
  const c0 = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0])));
  const c1 = Math.min(cols - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
  const r0 = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1])));
  const r1 = Math.min(rows - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
  for (let col = c0; col <= c1; col++) {
    for (let row = r0; row <= r1; row++) {
      const x = col + 0.5, y = row + 0.5;
      const w0 = (p[1][0] - x) * (p[2][1] - y) - (p[2][0] - x) * (p[1][1] - y);
      const w1 = (p[2][0] - x) * (p[0][1] - y) - (p[0][0] - x) * (p[2][1] - y);
      const w2 = (p[0][0] - x) * (p[1][1] - y) - (p[1][0] - x) * (p[0][1] - y);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) grid[col * rows + row] = 1;
    }
  }
}

/* Borde de arriba y de abajo en cada columna, en milimetros del plano: el largo
   va en horizontal y se invierte para dejar la punta ancha (-Z) a la derecha. */
const edges = [];
for (let col = 0; col < cols; col++) {
  let lo = -1, hi = -1;
  for (let row = 0; row < rows; row++) {
    if (!grid[col * rows + row]) continue;
    if (lo < 0) lo = row;
    hi = row + 1;
  }
  if (lo < 0) continue;
  const xmm = -(zMin * 1000 + col / RES + 0.5 / RES);
  edges.push([xmm, xMin * 1000 + lo / RES, xMin * 1000 + hi / RES]);
}
edges.sort((a, b) => a[0] - b[0]);

/* Se aligera la linea (Ramer-Douglas-Peucker, 0.12 mm) para no mandar miles de
   puntos: a esa tolerancia la diferencia no se ve ni a pantalla completa. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0], [bx, by] = points[points.length - 1];
  let worst = 0, at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / Math.hypot(bx - ax, by - ay);
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

const round = (v) => Math.round(v * 10) / 10;
const ring = [
  ...edges.map(([x, top]) => [x, top]),
  ...edges.slice().reverse().map(([x, , bottom]) => [x, bottom]),
];
const outline = simplify(ring, 0.12);
const d = "M" + outline.map(([x, y]) => `${round(x)} ${round(y)}`).join("L") + "Z";

/* Para las cotas: un borde cada ~4 mm basta. */
const samples = edges
  .filter((_, i) => i % 16 === 0)
  .map(([x, top, bottom]) => [round(x), round(top), round(bottom)]);
/* Donde van las bisagras y los cierres, a lo largo del case (mm del plano). */
const along = (prefix) =>
  gltf.nodes
    .filter((n) => new RegExp(`^${prefix}_\\d+_leaf_base$|^${prefix}_\\d+_body$`).test(n.name || ""))
    .map((n) => round(-n.translation[2] * 1000));
const hinges = along("hinge");
const latches = along("latch");

const minX = round(edges[0][0]), maxX = round(edges[edges.length - 1][0]);
const minY = round(Math.min(...edges.map((e) => e[1]))), maxY = round(Math.max(...edges.map((e) => e[2])));

const ts = `/*
  GENERADO por \`scripts/contorno-case.cjs\` desde el \`.glb\`. No se edita a mano.

  El contorno del case visto desde arriba, en milimetros. El largo va en
  horizontal, con la punta ancha a la derecha; el lado de las bisagras (recto)
  arriba y el de los cierres (curvo) abajo.
*/

export const CASE_OUTLINE = {
  /* Caja del dibujo: x de punta a punta, y de borde a borde. */
  minX: ${minX},
  maxX: ${maxX},
  minY: ${minY},
  maxY: ${maxY},
  path: "${d}",
  /* [x, borde de arriba, borde de abajo] por tramo, de izquierda a derecha. */
  samples: ${JSON.stringify(samples)} as ReadonlyArray<readonly [number, number, number]>,
  /* Posicion a lo largo de cada bisagra (borde recto) y cada cierre (borde curvo). */
  hinges: ${JSON.stringify(hinges)} as ReadonlyArray<number>,
  latches: ${JSON.stringify(latches)} as ReadonlyArray<number>,
} as const;

/* Los dos bordes del case en una x, en milimetros. */
export function edgesAt(x: number): { top: number; bottom: number } {
  let best = CASE_OUTLINE.samples[0];
  for (const s of CASE_OUTLINE.samples) if (Math.abs(s[0] - x) < Math.abs(best[0] - x)) best = s;
  return { top: best[1], bottom: best[2] };
}
`;
fs.writeFileSync(path.join(ROOT, "src/lib/store/case-outline.ts"), ts);
console.log("contorno:", outline.length, "puntos,", d.length, "caracteres,", samples.length, "muestras para las cotas");
