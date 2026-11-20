/*
  Correo que no manda correo: lo escribe en el registro del servidor.

  Es el adaptador mientras no haya proveedor. Y lo DICE: devuelve que no
  salio, para que el pedido no anote "correo enviado al cliente" cuando el
  cliente no recibio nada.
*/

import type { Correo, Mensaje } from "../puertos/correo";

export function crearCorreoConsola(): Correo {
  return {
    nombre: "consola",
    describir() {
      return {
        listo: false,
        detalle: "Los correos al cliente no salen todavia: falta conectar Resend.",
      };
    },
    async enviar(mensaje: Mensaje) {
      console.info(
        `[correo:consola] para=${mensaje.para} asunto=${JSON.stringify(mensaje.asunto)}\n${mensaje.texto}`,
      );
      return { ok: false, motivo: "El correo no esta conectado todavia (falta Resend)." };
    },
  };
}
