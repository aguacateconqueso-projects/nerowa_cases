import "server-only";

/*
  Las dos personas del panel, definidas UNA vez.

  Antes estaban en dos sitios —el almacen de memoria y la semilla de Postgres—
  con los mismos valores copiados. Ahora salen de aqui los tres usos:

    1. Los datos de ejemplo del almacen de memoria.
    2. La semilla de la base de datos.
    3. El respaldo para poder entrar cuando la base no responde (ver abajo).

  EL RESPALDO, Y POR QUE NO ABRE NINGUNA PUERTA

  Identificar a quien entra salia de la base de datos. Con la base caida eso
  lanzaba una excepcion, asi que no se podia entrar — y sin entrar tampoco se
  llegaba a la pantalla de estado, que es la que dice que le pasa a la base.
  Quedaba un panel mudo: un muro de "A server error occurred" y ninguna forma
  de averiguar nada.

  Con el respaldo se entra igual y se llega al diagnostico. **La clave sigue
  siendo obligatoria** y los correos son exactamente los mismos que estan
  configurados, asi que no se permite nada que no se permitiera ya.

  Cuando llegue mas gente, esto deja de valer como respaldo: entonces las
  personas viven solo en la base y lo que hay que hacer es que la pantalla de
  estado no necesite sesion.
*/

import { CONTACT_EMAIL } from "@/lib/brand";

import type { Usuario } from "./dominio/tipos";

export function personasDelPanel(): Usuario[] {
  return [
    {
      id: "u-alfredo",
      nombre: "Alfredo",
      correo: process.env.PANEL_CORREO_OPERACION ?? CONTACT_EMAIL,
      rol: "operacion",
      creadoEn: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "u-adrian",
      nombre: "Adrian",
      correo: process.env.PANEL_CORREO_DUENO ?? "hello@arcmediahouse.com",
      rol: "dueno",
      creadoEn: "2026-09-01T00:00:00.000Z",
    },
  ];
}

export function personaPorCorreo(correo: string): Usuario | undefined {
  const buscado = correo.trim().toLowerCase();
  return personasDelPanel().find((u) => u.correo.trim().toLowerCase() === buscado);
}
