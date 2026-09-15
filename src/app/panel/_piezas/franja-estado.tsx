/*
  Las franjas de aviso de arriba. Dos cosas que el panel nunca puede callar:

  1. Que esta corriendo con datos de ejemplo. Un panel de control que muestra
     numeros inventados sin decirlo es peor que no tener panel.
  2. Que se perdio la conexion. Ver `SinRed`.

  La franja de demostracion NO lleva `role="status"`: no cambia nunca, y siendo
  region viva competia con la confirmacion de "marcado enviado", que si tiene
  que anunciarse a un lector de pantalla.
*/

import { enModoDemostracion } from "@/lib/panel/servicios";

import { SinRed } from "./sin-red";

export function FranjaEstado() {
  return (
    <>
      {enModoDemostracion() ? (
        <p className="panel-franja panel-franja-demo">
          <span aria-hidden="true">●</span>
          <span>
            <strong>Modo demostracion.</strong> Los pedidos son de ejemplo y lo que
            marques se pierde al recargar. Falta conectar la base de datos.
          </span>
        </p>
      ) : null}
      <SinRed />
    </>
  );
}
