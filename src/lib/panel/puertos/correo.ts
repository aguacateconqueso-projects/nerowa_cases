/*
  El puerto de correo: lo que le llega al cliente (hoy, el numero de
  seguimiento; despues, confirmaciones y devoluciones).
*/

export interface Mensaje {
  para: string;
  asunto: string;
  /** Texto plano. Siempre, aunque haya HTML: hay clientes de correo que solo leen esto. */
  texto: string;
  html?: string;
  /** A donde va la respuesta si el cliente contesta. */
  responderA?: string;
}

export type ResultadoCorreo = { ok: true } | { ok: false; motivo: string };

export interface Correo {
  readonly nombre: string;
  /** Igual que en los avisos: lo que no sale a ningun sitio tiene que decirlo. */
  describir(): { listo: boolean; detalle: string };
  /** Nunca lanza: un correo que no sale no puede deshacer el envio marcado. */
  enviar(mensaje: Mensaje): Promise<ResultadoCorreo>;
}
