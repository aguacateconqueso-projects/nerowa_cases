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
import { crearAlmacenPostgres } from "./adaptadores/almacen-postgres";
import { prepararBase } from "./adaptadores/postgres/arranque";
import { conexion, soltarConexion } from "./adaptadores/postgres/conexion";
import { envolverAlmacenPostgres } from "./adaptadores/postgres/no-quedarse-colgado";
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
      case "postgres": {
        /*
          Crear las tablas y sembrar lo minimo es asincrono, y construir los
          servicios no lo es. En vez de complicar la construccion, cada metodo
          espera a que la base este puesta: la promesa se crea una sola vez por
          proceso, asi que a partir de la segunda llamada ya esta resuelta y no
          cuesta nada.
        */
        const cx = conexion();
        const almacenReal = crearAlmacenPostgres(cx);
        /*
          La envoltura hace dos cosas y las dos hacen falta: esperar al arranque
          antes de la primera consulta, y no dejar que una consulta se cuelgue
          detras de una conexion atascada. Lo segundo es lo que arregla que una
          instancia se quede inservible para siempre — ver
          `no-quedarse-colgado.ts`, que lleva los numeros de produccion.
        */
        return envolverAlmacenPostgres(
          almacenReal,
          () => prepararBase(cx),
          soltarConexion,
        );
      }
      default:
        throw new Error(
          `PANEL_ALMACEN="${process.env.PANEL_ALMACEN}" no existe. ` +
            `Los que hay son "memoria" y "postgres".`,
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
