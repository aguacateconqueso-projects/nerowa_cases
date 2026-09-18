/*
  Correr algo con un tope de tiempo.

  Existe porque Vercel corta las funciones a los pocos segundos y devuelve su
  propia pagina de error —un 504 sin explicacion—, no la del panel. Una pantalla
  que espera sin tope a una base de datos que no contesta desaparece justo
  cuando hacia falta que dijera algo.

  Va en su propio archivo, sin `server-only`, para poder probarlo: una garantia
  que no se comprueba no es una garantia.
*/

export class TiempoAgotado extends Error {
  constructor(public readonly ms: number) {
    super(`La base no contesto en ${ms / 1000} segundos`);
    this.name = "TiempoAgotado";
  }
}

/**
 * Devuelve lo que devuelva `promesa`, o lanza `TiempoAgotado` si tarda mas de
 * `ms`.
 *
 * El reloj se cancela siempre, gane quien gane: un temporizador suelto mantiene
 * viva la funcion despues de responder, y en un entorno sin servidor fijo eso se
 * paga en tiempo facturado.
 */
export async function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_, rechazar) => {
        reloj = setTimeout(() => rechazar(new TiempoAgotado(ms)), ms);
      }),
    ]);
  } finally {
    if (reloj) clearTimeout(reloj);
  }
}
