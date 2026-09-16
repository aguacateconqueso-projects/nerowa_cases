/*
  El puerto de avisos. Un solo verbo, varios canales detras.

  La razon de que esto sea una interfaz y no una llamada directa a Telegram esta
  en `docs/panel-nerowa.md` §4.1: Alfredo usa iPhone, donde la notificacion web
  solo existe si la aplicacion esta instalada en la pantalla de inicio y se
  apaga en silencio si la quita. El panel manda por varios sitios a la vez y no
  le importa cual funciono.
*/

import type { Usuario } from "../dominio/tipos";

/** Que tan urgente es. Decide por que canales sale. */
export type Urgencia =
  /** Hay que enterarse ya: venta nueva, devolucion pedida. */
  | "urgente"
  /** Puede esperar a que abra el panel: resumen diario. */
  | "normal";

export interface Aviso {
  urgencia: Urgencia;
  titulo: string;
  cuerpo: string;
  /** Ruta dentro del panel que abre el aviso al tocarlo. */
  enlace?: string;
}

export interface Avisos {
  readonly nombre: string;
  /** Manda el aviso a una persona. Nunca lanza: un aviso fallido no puede
   *  tumbar la accion que lo disparo. Devuelve por donde salio. */
  avisar(a: Usuario, aviso: Aviso): Promise<{ canales: string[] }>;
}
