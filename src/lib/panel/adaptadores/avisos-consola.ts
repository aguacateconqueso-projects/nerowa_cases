/*
  Avisos que no salen a ningun lado: se escriben en el registro del servidor.

  Adaptador de hoy. Los de verdad — Telegram como canal principal de lo urgente,
  notificacion web como extra y correo de red de seguridad — llegan en la fase
  7.3, cuando existan el bot y las claves. Ver `docs/panel-nerowa.md` §4.2.

  Lo que ya queda decidido con esta forma: el codigo que dispara un aviso no
  sabe ni le importa por que canal sale. Anadir Telegram no toca ni una linea
  de las pantallas.
*/

import type { Aviso, Avisos } from "../puertos/avisos";
import type { Usuario } from "../dominio/tipos";

export function crearAvisosConsola(): Avisos {
  return {
    nombre: "consola",
    async avisar(a: Usuario, aviso: Aviso) {
      console.info(
        `[aviso:consola] ${aviso.urgencia.toUpperCase()} para=${a.nombre} ` +
          `titulo=${JSON.stringify(aviso.titulo)} enlace=${aviso.enlace ?? "-"}\n  ${aviso.cuerpo}`,
      );
      return { canales: ["consola"] };
    },
  };
}
