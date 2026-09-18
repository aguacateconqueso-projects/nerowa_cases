/*
  Construir `($1, $2, $3), ($4, $5, $6), ...` para meter varias filas de una vez.

  POR QUE EXISTE, SIENDO UNA LINEA

  Porque cada consulta es un viaje de ida y vuelta a Irlanda. Sembrar fila a
  fila eran once consultas encadenadas, cada una esperando a la anterior, y con
  la latencia medida desde Vercel —453 ms por consulta— eso solo eran cinco
  segundos. La pantalla de estado agotaba su tiempo ahi y parecia una averia.

  Y esta en su propio archivo, sin `server-only`, para poder probarlo: la
  numeracion de los `$n` es justo donde un desfase de uno mezclaria las columnas
  de una fila con las de la siguiente, y eso no da error — guarda mal y ya.

  El numero de filas y columnas lo pone el codigo, nunca nadie de fuera, y los
  valores siguen viajando como parametros. Aqui solo se generan los huecos.
*/

export function huecos(filas: number, columnas: number): string {
  if (filas < 1 || columnas < 1) {
    throw new Error(`huecos(${filas}, ${columnas}): hacen falta filas y columnas`);
  }
  return Array.from({ length: filas }, (_, f) =>
    `(${Array.from({ length: columnas }, (_, c) => `$${f * columnas + c + 1}`).join(", ")})`,
  ).join(", ");
}
