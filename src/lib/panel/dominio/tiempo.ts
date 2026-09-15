/*
  Cuanto lleva esperando un pedido, y cuando eso deja de ser normal.

  Esta separado de las pantallas porque el mismo calculo lo usan la tarjeta del
  pedido (para el filete de color) y, mas adelante, el trabajo que manda los
  avisos escalados. Un pedido no puede ser "urgente" en la pantalla y "normal"
  para el que avisa.
*/

import { ESCALADO_HORAS } from "./estados";

export type Urgencia = "baja" | "media" | "alta";

export function horasDesde(instante: string, ahora = Date.now()): number {
  return (ahora - new Date(instante).getTime()) / 3_600_000;
}

/**
 * El nivel de atraso de un pedido pendiente.
 * Los cortes son los mismos del escalado de avisos: lo que se ve en pantalla y
 * lo que dispara un mensaje no pueden discrepar.
 */
export function urgenciaDeEspera(horas: number): Urgencia {
  if (horas >= ESCALADO_HORAS.escalada) return "alta";
  if (horas >= ESCALADO_HORAS.recordatorio) return "media";
  return "baja";
}

/**
 * "Hace 2 horas", "Hace 3 dias". En espanol y sin decimales.
 *
 * Se calcula en el servidor y se manda ya escrito. Hacerlo en el navegador
 * daria un texto distinto en el primer dibujado y en el segundo, y React se
 * queja con razon.
 */
export function describirEspera(horas: number): string {
  if (horas < 1) {
    const minutos = Math.max(1, Math.round(horas * 60));
    return `Hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  }
  if (horas < 48) {
    const h = Math.round(horas);
    return `Hace ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  const dias = Math.round(horas / 24);
  return `Hace ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
