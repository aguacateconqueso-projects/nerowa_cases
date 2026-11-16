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

export interface ResultadoAviso {
  /** Por donde salio de verdad. */
  canales: string[];
  /**
   * Si se INTENTO mandar por un canal real y no salio. Distinto de "no habia
   * a donde mandarlo": lo primero se reintenta, lo segundo no.
   */
  fallo?: string;
}

export interface Avisos {
  readonly nombre: string;
  /**
   * Por donde salen de verdad los avisos, en una frase para la pantalla de
   * Ajustes. Un aviso que no sale a ningun sitio tiene que decirlo: "se
   * escriben en el registro del servidor" no puede parecer "te llegan al
   * telefono".
   */
  describir(): { listo: boolean; detalle: string };
  /** Manda el aviso a una persona. Nunca lanza: un aviso fallido no puede
   *  tumbar la accion que lo disparo. Devuelve por donde salio. */
  avisar(a: Usuario, aviso: Aviso): Promise<ResultadoAviso>;
}
