import "server-only";

/*
  La hora, como dato de la peticion y no como efecto suelto en el render.

  React considera `Date.now()` impuro dentro de un componente, y tiene razon:
  si el componente se vuelve a dibujar, da otro valor y la pantalla cambia sin
  que haya cambiado nada. Leerla aqui, en una funcion asincrona que el
  componente espera, la convierte en una entrada mas — igual que los pedidos.

  Y de paso resuelve algo que si importa: una sola marca de tiempo para toda la
  pantalla. Si cada tarjeta preguntara la hora por su cuenta, dos pedidos
  entrados en el mismo segundo podrian salir con relojes distintos.
*/
export async function ahoraServidor(): Promise<number> {
  return Date.now();
}
