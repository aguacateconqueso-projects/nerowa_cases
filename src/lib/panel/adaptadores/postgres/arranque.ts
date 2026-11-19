import "server-only";

/*
  Poner la base de datos a punto la primera vez.

  Crea las tablas si no estan y siembra lo minimo para que el panel abra: las
  dos personas, los colores y el lote actual. Se ejecuta sola en la primera
  peticion que llegue, una vez por proceso.

  Por que se siembra desde el codigo y no a mano en el panel de Supabase: para
  que levantar una base de datos nueva —otro proveedor, un entorno de prueba,
  el dia que haga falta— no dependa de que alguien recuerde que hay que meter
  catorce colores a mano.

  La semilla NO pisa nada. Cada insercion lleva `on conflict do nothing`: si la
  fila ya existe, se deja como esta. Asi puede correr en cada arranque sin
  deshacer lo que alguien haya editado.
*/

import { COLORS } from "../../../store/catalog";
import { personasDelPanel } from "../../personas";

import type { Conexion } from "./conexion";
import { huecos } from "./huecos";
import { migrar, type Migracion } from "./migrar";
import {
  SQL_001_INICIAL,
  SQL_002_EXISTENCIAS_Y_AVISOS,
  SQL_003_COMPROBANTES,
} from "./migraciones";
import { unaSolaVez } from "./una-sola-vez";

const MIGRACIONES: readonly Migracion[] = [
  { nombre: "001-inicial", sql: SQL_001_INICIAL },
  { nombre: "002-existencias-y-avisos", sql: SQL_002_EXISTENCIAS_Y_AVISOS },
  { nombre: "003-comprobantes", sql: SQL_003_COMPROBANTES },
];

/*
  Los catorce colores de la carta oficial, leidos del catalogo de la tienda.
  Antes aqui habia ocho de relleno; la migracion 002 los desactiva y mete
  estos. Se siembran tambien desde aqui para que una base NUEVA arranque con
  los mismos colores que la tienda, sin depender de que alguien los meta a
  mano. `on conflict do nothing`: lo que ya este, se respeta.
*/
const COLORES: [string, string, string, number][] = COLORS.map((c, i) => [
  c.id,
  c.name,
  c.hex,
  i + 1,
]);

async function sembrar(cx: Conexion) {
  /*
    Tres consultas, una por tabla, en vez de once. Las tres son
    `on conflict do nothing`: pueden correr en cada arranque sin pisar nada de
    lo que alguien haya editado despues.
  */
  const personas = personasDelPanel();
  await cx.consultar(
    `insert into usuarios (id, nombre, correo, rol)
     values ${huecos(personas.length, 4)}
     on conflict (id) do nothing`,
    personas.flatMap((p) => [p.id, p.nombre, p.correo, p.rol]),
  );

  await cx.consultar(
    `insert into colores (id, nombre, hex, activo, orden)
     values ${huecos(COLORES.length, 5)}
     on conflict (id) do nothing`,
    COLORES.flatMap(([id, nombre, hex, orden]) => [id, nombre, hex, true, orden]),
  );

  /*
    El lote de importacion que Alfredo ya trajo: 100 unidades, 2.400 EUR de
    fabrica y 1.000 EUR mas de traerlo a Vilnius. Los 1.000 van enteros en
    `flete` porque todavia falta el desglose, y el IVA cuenta como coste — es el
    calculo conservador de `docs/economia-nerowa.md` §2.2.
  */
  await cx.consultar(
    `insert into lotes (id, referencia, llegada_en, unidades, factura_fabrica, flete, notas)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do nothing`,
    [
      "lote-2026-08",
      "2026-08",
      "2026-08-20T00:00:00.000Z",
      100,
      240_000,
      100_000,
      "Falta el desglose de los 1.000 EUR: flete, arancel, IVA de importacion y despacho.",
    ],
  );
}

let puesta: (() => Promise<void>) | undefined;

/**
 * Se llama antes de la primera consulta del proceso.
 *
 * Corre una sola vez: varias peticiones simultaneas esperan a la misma promesa,
 * que es para lo que existe el guardado — diez peticiones a la vez no pueden
 * lanzar diez migraciones.
 *
 * **Lo que NO se guarda es el fallo.** Antes si, y era un agujero serio: una
 * instancia que pillaba un tropiezo de la base en su primera peticion se
 * quedaba inservible mientras viviera, aunque la base se recuperara al segundo
 * siguiente. Esta medido y contado en `una-sola-vez.ts`.
 */
export function prepararBase(cx: Conexion): Promise<void> {
  puesta ??= unaSolaVez(async () => {
    const nuevas = await migrar(cx, MIGRACIONES);
    if (nuevas.length > 0) {
      console.info(`[panel] migraciones aplicadas: ${nuevas.join(", ")}`);
    }
    await sembrar(cx);
  });
  return puesta();
}
