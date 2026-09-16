/*
  Correo que no manda correo: lo escribe en el registro del servidor.

  Es el adaptador de hoy, porque todavia no hay proveedor de correo contratado.
  Sirve para desarrollar el flujo entero de entrada al panel sin credenciales.

  Cuando exista la cuenta, se anade `correo-resend.ts` (o el que sea) con esta
  misma interfaz y se cambia una variable de entorno. Ni una pantalla se toca.
*/

import type { Correo, Mensaje } from "../puertos/correo";

export function crearCorreoConsola(): Correo {
  return {
    nombre: "consola",
    async enviar(mensaje: Mensaje) {
      console.info(
        `[correo:consola] para=${mensaje.para} asunto=${JSON.stringify(mensaje.asunto)}\n${mensaje.texto}`,
      );
    },
  };
}
