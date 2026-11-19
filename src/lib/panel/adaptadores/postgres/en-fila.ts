/*
  Una consulta a la vez por la conexion. Nunca dos en el aire.

  EL FALLO QUE ARREGLA, Y QUE LLEVABA DOS MESES SIN NOMBRE

  El cliente (`postgres.js`) tiene `max: 1`: una sola conexion por instancia.
  Cuando le llegan varias consultas a la vez —un `Promise.all` de seis listados,
  que es lo que hace cualquier pantalla—, no las espera: las manda TODAS
  seguidas por esa conexion y luego lee las respuestas en orden. Se llama
  "pipelining", y con un Postgres normal es mas rapido.

  Con el pooler de transacciones de Supabase, no. El pooler presta una conexion
  real POR TRANSACCION, y una tanda de consultas encadenadas sin esperar
  respuesta no la sabe repartir: unas contestan y otras se quedan esperando
  para siempre. Medido en produccion el 2026-11-19, en la misma pantalla y con
  la base recien creada:

      las seis consultas del panel, una detras de otra ..... 3 a 158 ms cada una
      las mismas seis, a la vez ............................ no contestan en 6,6 s

  Es exactamente la contradiccion que quedo sin explicar en septiembre
  ("count(*) en 25 ms; select * from tiendas agota 7 s") y, casi seguro, lo que
  hacia que el panel fuera lento y que hubiera que tocar las pestanas treinta
  veces: cada pantalla pide varias cosas a la vez.

  LO QUE HACE

  Pone las consultas en fila: la siguiente no sale hasta que la anterior
  contesto o fallo. El `Promise.all` de las pantallas sigue igual; lo que cambia
  es que por el cable va una sola cosa cada vez.

  Y SI UNA SE QUEDA COLGADA

  La fila no puede quedarse esperando para siempre detras de ella, que seria
  cambiar un atasco por otro. Si una consulta pasa de `esperaMaxMs`, se llama a
  `alAtascarse` —que tira la conexion— y la siguiente sale por una nueva. El
  limite va por encima del `statement_timeout` de las migraciones (15 s) a
  proposito: cortar una migracion a medias es como se dejaron los candados
  muertos de la vuelta 14. Lo normal es que antes salte el techo del almacen
  (7 s, `no-quedarse-colgado.ts`), que tambien vacia la fila.

  Sin `server-only` para poder probarlo, como `tope.ts` y `huecos.ts`.
*/

export interface Fila {
  /** Corre `trabajo` cuando le toque, y nunca a la vez que otro. */
  poner<T>(trabajo: () => Promise<T>): Promise<T>;
  /**
   * Abandona la consulta que esta en el aire y deja salir a la siguiente.
   * Se llama al tirar la conexion: la abandonada iba por la vieja, la
   * siguiente ira por una nueva, y por esa nueva sigue saliendo una a la vez.
   */
  vaciar(): void;
}

export function crearFila(opciones: {
  esperaMaxMs: number;
  /** Tiene que tirar la conexion Y llamar a `vaciar`. */
  alAtascarse: () => void;
}): Fila {
  let ocupada = false;
  /*
    Cada vez que se vacia, sube. Una consulta abandonada que termina tarde ve
    que su generacion ya no es la actual y no toca la fila: si lo hiciera,
    dejaria salir a otra encima de la que esta en el aire.
  */
  let generacion = 0;
  const esperando: (() => void)[] = [];

  const siguiente = () => {
    const correr = esperando.shift();
    if (correr) correr();
    else ocupada = false;
  };

  return {
    poner<T>(trabajo: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolver, rechazar) => {
        const correr = () => {
          ocupada = true;
          const mia = generacion;
          const reloj = setTimeout(() => {
            if (mia === generacion) opciones.alAtascarse();
          }, opciones.esperaMaxMs);

          Promise.resolve()
            .then(trabajo)
            .then(resolver, rechazar)
            .finally(() => {
              clearTimeout(reloj);
              if (mia === generacion) siguiente();
            });
        };
        if (ocupada) esperando.push(correr);
        else correr();
      });
    },
    vaciar() {
      if (!ocupada) return;
      generacion += 1;
      siguiente();
    },
  };
}
