/*
  Que una consulta atascada no deje inservible la instancia entera.

  EL FALLO, MEDIDO EN PRODUCCION Y SIN LUGAR A DUDAS

  El panel llevaba dos dias sin cargar. La sonda de `/panel/estado` abrio dos
  conexiones NUEVAS contra la misma base, en ese mismo momento:

      con los ajustes del panel .... abre en 22 ms, viaje de 3 ms
      sin ajustes, desnuda ......... abre en 13 ms, viaje de 2 ms

  La base estaba **perfecta**. No era Supabase, no eran los ajustes del saludo
  inicial, no era la red. Lo unico roto era **la conexion reutilizada de esa
  instancia**, y nada en el codigo la renovaba nunca.

  COMO SE QUEDA ASI

  El cliente tiene `max: 1`: una conexion por instancia. Se queda ocupada para
  siempre por cualquiera de estas dos, y las dos pasan en Vercel:

    1. Una consulta abandonada por un tope. `conTope` deja de esperarla pero la
       consulta sigue viva al otro lado y la conexion, ocupada. Apuntado en la
       vuelta 14 y nunca resuelto hasta hoy.
    2. Un socket que murio mientras la instancia estaba congelada. Vercel
       congela las instancias entre peticiones; el pooler cierra lo que lleva
       rato quieto. Al despertar, el cliente cree que tiene conexion y no la
       tiene.

  En los dos casos, la siguiente consulta se pone en fila detras de algo que no
  va a terminar nunca. **`statement_timeout` no salva esto**: esa consulta ni
  siquiera llega a empezar, asi que no hay sentencia que cortar. Por eso hacen
  falta las dos cosas de aqui: un techo de tiempo Y tirar la conexion.

  LO QUE NO LLEVA TECHO, Y ES DELIBERADO

  `preparar()` —las migraciones y la semilla— se espera **sin tope**. Tienen
  permitido `statement_timeout = '15s'` a proposito, y cortarlas a mitad de
  transaccion es exactamente como se dejaron los candados muertos de la
  vuelta 14. Es la trampa obvia de este arreglo y por eso esta escrito aqui: el
  techo va sobre la CONSULTA, nunca sobre el arranque.

  VA EN SU PROPIO ARCHIVO Y SIN `server-only` para poder probarlo, por lo mismo
  que `huecos.ts`, `tope.ts` y `una-sola-vez.ts`.
*/

import type { Almacen } from "../../puertos/almacen";
import { conTope, TiempoAgotado } from "../../tope";

/*
  Cuanto se le deja a UNA consulta del panel.

  Por encima de `statement_timeout` (5 s) a proposito: si la base esta viva pero
  la consulta tarda, quien tiene que rendirse primero es Postgres, porque su
  error DICE que paso. Este techo es para lo que Postgres no puede ver — una
  consulta que nunca llego a empezar porque la conexion estaba ocupada.

  Y por debajo del corte de Vercel, para que la pantalla pueda contarlo.
*/
export const TECHO_CONSULTA_MS = 7000;

/**
 * Envuelve el almacen para que espere al arranque, y para que ninguna consulta
 * pueda colgarse indefinidamente detras de una conexion atascada.
 *
 * `soltar` se llama SOLO cuando se agota el techo, que es la unica senal de que
 * la conexion quedo inservible. Un error normal de Postgres —tabla que no
 * existe, permiso denegado— no toca la conexion: esa esta bien y tirarla seria
 * pagar una reconexion por nada.
 */
export function envolverAlmacenPostgres(
  almacen: Almacen,
  preparar: () => Promise<void>,
  soltar: () => void,
): Almacen {
  /*
    Es un Proxy generado y no una lista de metodos escrita a mano para que,
    cuando el puerto `Almacen` gane un metodo nuevo, este archivo no se olvide
    de el. Un olvido aqui seria una consulta sin techo, y el fallo volveria por
    una sola pantalla.
  */
  return new Proxy(almacen, {
    get(objetivo, propiedad, receptor) {
      const valor = Reflect.get(objetivo, propiedad, receptor);
      if (typeof valor !== "function") return valor;

      return async (...args: unknown[]) => {
        /* Sin techo: ver arriba. Las migraciones necesitan su tiempo. */
        await preparar();

        try {
          return await conTope(
            Promise.resolve(
              (valor as (...a: unknown[]) => unknown).apply(objetivo, args),
            ),
            TECHO_CONSULTA_MS,
          );
        } catch (error) {
          if (error instanceof TiempoAgotado) {
            /*
              Aqui esta el rescate. Sin esta linea, esa instancia se queda
              contestando con el esqueleto para siempre y solo se arregla
              cuando Vercel la recicla — que fueron dos dias.
            */
            soltar();
          }
          throw error;
        }
      };
    },
  });
}
