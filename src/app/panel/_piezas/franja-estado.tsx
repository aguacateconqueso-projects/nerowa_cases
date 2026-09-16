/*
  Las franjas de aviso de arriba. Dos cosas que el panel nunca puede callar:

  1. Que esta corriendo con datos de ejemplo Y que esos datos no se guardan de
     verdad. Lo segundo importa tanto como lo primero: el almacen vive en la
     memoria del proceso, y en Vercel dos peticiones seguidas pueden caer en
     instancias distintas. O sea que una tienda dada de alta puede no estar al
     toque siguiente. Un panel de control que pierde lo que le escribes sin
     avisar es peor que no tener panel.
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
            <strong>Modo demostracion.</strong> Los datos son de ejemplo y viven en
            la memoria del servidor: lo que guardes{" "}
            <strong>puede desaparecer al cambiar de pantalla</strong>, no solo al
            recargar. Sirve para probar como se usa el panel, no para meter datos
            de verdad. Se arregla conectando la base de datos.
          </span>
        </p>
      ) : null}
      <SinRed />
    </>
  );
}
