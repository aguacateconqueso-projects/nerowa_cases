/*
  Correr algo UNA sola vez por proceso — pero sin quedarse con el fallo puesto.

  EL FALLO QUE ESTO ARREGLA, Y COMO SE VEIA

  El arranque de la base (migraciones y semilla) se guardaba asi:

      let puesta: Promise<void> | undefined;
      puesta ??= (async () => { ... })();

  Parece correcto y tiene un agujero: **si ese primer intento falla, la promesa
  fallida se queda guardada para siempre**. Todas las consultas posteriores de
  ese proceso reciben el mismo fallo de hace rato, aunque la base ya este
  perfectamente sana. El proceso no se recupera nunca.

  Medido, que es como se encontro. Base caida al arrancar, primera peticion:
  falla, como debe. Se levanta la base, se comprueba que responde (`select 1`),
  y se vuelve a pedir la misma pantalla **tres veces**: las tres sin datos. Un
  proceso nuevo, con el mismo codigo y la misma base sana: funciona a la
  primera. Lo unico roto era el proceso que vivio el fallo.

  POR QUE IMPORTA TANTO EN VERCEL

  Ahi no hay un servidor, hay muchas instancias que se crean y se reciclan
  solas. Una instancia que pilla un tropiezo de la base en su primera peticion
  —un reinicio de Supabase, un candado, medio segundo de red— **queda inservible
  mientras viva**, y las peticiones que caigan en ella no cargan nunca. Las que
  caigan en otra, si. Desde fuera eso se ve como un panel que "a veces no carga"
  sin que la base tenga nada.

  LA REGLA: se recuerda el exito, no el fracaso. Un fallo se vuelve a intentar.

  VA EN SU PROPIO ARCHIVO Y SIN `server-only` para poder comprobarlo, por lo
  mismo que `huecos.ts` y `tope.ts`: una garantia que no se prueba no es una
  garantia, y esta se escribio justamente porque la anterior no se probaba.
*/

/**
 * Envuelve `tarea` para que corra una sola vez y su resultado se reutilice.
 *
 * Mientras esta en curso, las llamadas simultaneas esperan a la MISMA promesa
 * —que es para lo que existia el guardado original: que diez peticiones a la
 * vez no lancen diez migraciones—. Si termina bien, se queda guardada. Si
 * falla, se olvida, y la siguiente llamada lo vuelve a intentar de cero.
 */
export function unaSolaVez<T>(tarea: () => Promise<T>): () => Promise<T> {
  let enCurso: Promise<T> | undefined;

  return () => {
    if (enCurso) return enCurso;

    const intento = tarea();
    enCurso = intento;

    /*
      El olvido se engancha DESPUES de guardar, no dentro de `tarea`. Si se
      hiciera dentro, un fallo lanzado antes del primer `await` limpiaria la
      variable y justo despues la asignacion volveria a dejar puesta la promesa
      fallida — el mismo agujero, mas escondido.

      La comparacion `enCurso === intento` es para no borrar un intento NUEVO:
      si mientras este fallaba alguien arranco otro, el que manda es el otro.
    */
    intento.catch(() => {
      if (enCurso === intento) enCurso = undefined;
    });

    return intento;
  };
}
