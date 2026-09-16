import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/*
  La clave del panel, mientras es provisional.

  POR QUE HAY CONTRASEÑA, SI SE HABIA DECIDIDO QUE NO

  El diseño (`docs/panel-nerowa.md` §10) descarta las contraseñas con un
  argumento que sigue siendo bueno: Alfredo no va a recordar una y va a
  terminar anotada en algun sitio. La entrada iba a ser un enlace de un solo uso
  al correo.

  El problema es que todavia no hay proveedor de correo, asi que el enlace no
  se podia mandar y habia que enseñarlo en pantalla. Eso confundio a Adrian —
  la pantalla decia "le acaba de llegar un enlace" cuando no salia ningun
  correo — y dejo el panel sin poder abrirse. Un acceso que necesita que te
  expliquen como usarlo no sirve, y menos para desbloquear el trabajo.

  Asi que por ahora: **una sola clave, compartida por los dos**. Cuando exista
  el proveedor de correo se decide si se vuelve al enlace o se queda esto.

  LO QUE HAY QUE CAMBIAR ANTES DE QUE HAYA DATOS REALES

  Hoy el panel corre con pedidos de ejemplo, asi que no hay nada que proteger.
  El dia que se conecte la base de datos, esta clave compartida deja de ser
  suficiente: una clave por persona, y guardada fuera del repositorio.
  Esta anotado en `progreso.md`.

  COMO ESTA GUARDADA

  No en claro. Se guarda el resultado de pasarla por scrypt con una sal, que es
  una funcion pensada para esto: lenta a proposito y cara de revertir. Con el
  repositorio delante no se lee la clave, solo el hash.

  La comparacion es en tiempo constante (`timingSafeEqual`): comparar con `===`
  se corta en la primera letra distinta, y el tiempo que tarda delata cuantas
  letras acerto quien prueba.
*/

/** Coste de scrypt. 32 bytes de salida, parametros por defecto de Node. */
const LARGO = 32;

/*
  El valor por defecto es la clave que pidio Adrian el 2026-09-16.
  Se puede cambiar sin tocar codigo con `PANEL_CLAVE` en Vercel; si esa variable
  existe, manda ella y esto se ignora.
*/
const SAL_POR_DEFECTO = "6cc8793d490534a06969cd1014af4a0b";
const HASH_POR_DEFECTO =
  "c5386209bc0ac9f750934fdc7c7b1f160da494b61dd33c4809c047cc73c51131";

function iguales(a: Buffer, b: Buffer): boolean {
  /* `timingSafeEqual` revienta si los largos difieren, asi que se mira antes. */
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Si la clave escrita es la del panel. */
export function claveCorrecta(escrita: string): boolean {
  const desdeEntorno = process.env.PANEL_CLAVE;

  if (desdeEntorno) {
    /*
      Las dos se pasan por scrypt con la misma sal de un solo uso, en vez de
      comparar los textos: asi el tiempo que tarda no depende de cuanto se
      parecen, ni siquiera de cuanto miden.
    */
    const sal = randomBytes(16);
    return iguales(
      scryptSync(escrita, sal, LARGO),
      scryptSync(desdeEntorno, sal, LARGO),
    );
  }

  return iguales(
    scryptSync(escrita, SAL_POR_DEFECTO, LARGO),
    Buffer.from(HASH_POR_DEFECTO, "hex"),
  );
}
