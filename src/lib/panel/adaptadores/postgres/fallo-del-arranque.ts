/*
  El ultimo tropiezo del arranque de la base, apuntado para poder contarlo.

  POR QUE ESTA SUELTO Y NO DENTRO DE `arranque.ts`

  Por lo mismo que `huecos.ts`, `tope.ts` y `una-sola-vez.ts`: `arranque.ts`
  lleva `server-only` y con el dentro no se puede probar nada de esto. Y aqui
  hay algo que probar — que un arranque que falla NO deja el panel sin cargar—,
  asi que el dato vive aparte.

  POR QUE HACE FALTA APUNTARLO

  Desde la vuelta 24, el arranque ya no puede bloquear al panel: si tarda de mas
  o revienta, la consulta sigue adelante. Eso es lo correcto —las tablas ya
  existen y el panel puede trabajar— pero **un fallo que no bloquea y no se
  cuenta es un fallo invisible**, y de esos ya hubo demasiados en esta sesion.
  Se apunta aqui y la pantalla de estado lo enseña.
*/

let ultimo: string | undefined;

/** Lo ultimo que le paso al arranque, si es que le paso algo. */
export function falloDelArranque(): string | undefined {
  return ultimo;
}

export function anotarFalloDelArranque(motivo: string): void {
  ultimo = motivo;
}

/** Solo para las comprobaciones: empezar de cero entre casos. */
export function olvidarFalloDelArranque(): void {
  ultimo = undefined;
}
