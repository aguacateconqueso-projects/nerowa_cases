/*
  El puerto de correo. Lo usan el enlace de entrada al panel y, mas adelante,
  los avisos al cliente (confirmacion, envio con seguimiento, devolucion).
*/

export interface Mensaje {
  para: string;
  asunto: string;
  /** Texto plano. Las plantillas con formato llegan con los correos al cliente. */
  texto: string;
}

export interface Correo {
  readonly nombre: string;
  enviar(mensaje: Mensaje): Promise<void>;
}
