/*
  El unico sitio del proyecto que decide QUE adaptador se usa.

  Para cambiar de base de datos, de correo o de canal de avisos se toca este
  archivo y nada mas. Ninguna pantalla, ninguna accion y ningun formulario
  importa un proveedor: todos piden `servicios()` y reciben interfaces.

  Como se anade un proveedor nuevo, en tres pasos:

    1. Se escribe `adaptadores/almacen-postgres.ts` implementando `Almacen`.
    2. Se anade su caso al `switch` de abajo.
    3. Se pone `PANEL_ALMACEN=postgres` en las variables de entorno de Vercel.

  No hay paso 4. Si hiciera falta tocar una pantalla, el puerto estaria mal
  disenado y habria que arreglar el puerto, no la pantalla.

  Variables de entorno que lee:

    PANEL_ALMACEN   memoria (por defecto) | postgres
    PANEL_CORREO    consola (por defecto) | resend
    PANEL_AVISOS    consola (por defecto) | telegram
    PANEL_ARCHIVOS  memoria (por defecto) | supabase
*/

import { crearAlmacenMemoria } from "./adaptadores/almacen-memoria";
import { crearArchivosMemoria } from "./adaptadores/archivos-memoria";
import { crearAvisosConsola } from "./adaptadores/avisos-consola";
import { crearCorreoConsola } from "./adaptadores/correo-consola";
import type { Almacen } from "./puertos/almacen";
import type { Archivos } from "./puertos/archivos";
import type { Avisos } from "./puertos/avisos";
import type { Correo } from "./puertos/correo";

export interface Servicios {
  almacen: Almacen;
  correo: Correo;
  avisos: Avisos;
  archivos: Archivos;
}

/*
  Se construyen una sola vez por proceso. Con el almacen en memoria esto ademas
  es lo que hace que los datos de ejemplo sobrevivan entre peticiones dentro de
  la misma instancia.
*/
let cache: Servicios | undefined;

function construir(): Servicios {
  const almacen = ((): Almacen => {
    switch (process.env.PANEL_ALMACEN ?? "memoria") {
      case "memoria":
        return crearAlmacenMemoria();
      default:
        throw new Error(
          `PANEL_ALMACEN="${process.env.PANEL_ALMACEN}" no existe todavia. ` +
            `Hoy solo hay "memoria"; el adaptador de Postgres entra en la fase 7.2.`,
        );
    }
  })();

  const correo = ((): Correo => {
    switch (process.env.PANEL_CORREO ?? "consola") {
      case "consola":
        return crearCorreoConsola();
      default:
        throw new Error(
          `PANEL_CORREO="${process.env.PANEL_CORREO}" no existe todavia. Hoy solo hay "consola".`,
        );
    }
  })();

  const avisos = ((): Avisos => {
    switch (process.env.PANEL_AVISOS ?? "consola") {
      case "consola":
        return crearAvisosConsola();
      default:
        throw new Error(
          `PANEL_AVISOS="${process.env.PANEL_AVISOS}" no existe todavia. Hoy solo hay "consola".`,
        );
    }
  })();

  const archivos = ((): Archivos => {
    switch (process.env.PANEL_ARCHIVOS ?? "memoria") {
      case "memoria":
        return crearArchivosMemoria();
      default:
        throw new Error(
          `PANEL_ARCHIVOS="${process.env.PANEL_ARCHIVOS}" no existe todavia. Hoy solo hay "memoria".`,
        );
    }
  })();

  return { almacen, correo, avisos, archivos };
}

export function servicios(): Servicios {
  cache ??= construir();
  return cache;
}

/**
 * Si el panel corre con datos de ejemplo que se pierden al reiniciar.
 *
 * Cuando es cierto, el panel lo dice en pantalla con una franja bien visible.
 * Un panel de control que muestra datos inventados sin avisar es peor que no
 * tener panel.
 */
export function enModoDemostracion(): boolean {
  return servicios().almacen.nombre === "memoria";
}

/**
 * Permite entrar al panel enseñando el enlace en pantalla en vez de mandarlo
 * por correo. Solo con `PANEL_MODO_DEMO=1` puesto a mano.
 *
 * Existe porque todavia no hay proveedor de correo, y sin esto nadie podria
 * abrir el preview para revisarlo. NO se enciende en produccion: ahi el enlace
 * sale por correo o no sale.
 */
export function entradaSinCorreo(): boolean {
  return process.env.PANEL_MODO_DEMO === "1";
}
