/*
  Archivos en memoria, como marcador de posicion hasta la fase 7.7.

  No guarda nada que sobreviva a un reinicio, y lo dice: devuelve una URL de
  datos, no un enlace a ningun sitio. Existe para que el puerto tenga una
  implementacion y el panel arranque sin un proveedor de almacenamiento.
*/

import type { ArchivoGuardado, Archivos } from "../puertos/archivos";

export function crearArchivosMemoria(): Archivos {
  const guardados = new Map<string, ArchivoGuardado>();

  return {
    nombre: "memoria",
    async guardar(nombre, tipo, datos) {
      const id = crypto.randomUUID();
      const archivo: ArchivoGuardado = {
        id,
        nombre,
        tipo,
        bytes: datos.byteLength,
        url: `data:${tipo};base64,${Buffer.from(datos).toString("base64")}`,
      };
      guardados.set(id, archivo);
      return archivo;
    },
    async borrar(id) {
      guardados.delete(id);
    },
  };
}
