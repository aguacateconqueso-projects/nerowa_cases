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
import { anotarFalloDelArranque } from "./fallo-del-arranque";

/*
  Cuanto se le deja a UNA consulta del panel.

  Por encima de `statement_timeout` (5 s) a proposito: si la base esta viva pero
  la consulta tarda, quien tiene que rendirse primero es Postgres, porque su
  error DICE que paso. Este techo es para lo que Postgres no puede ver — una
  consulta que nunca llego a empezar porque la conexion estaba ocupada.

  Y por debajo del corte de Vercel, para que la pantalla pueda contarlo.
*/
export const TECHO_CONSULTA_MS = 7000;

/*
  Cuanto se ESPERA al arranque antes de seguir sin el.

  Con la base sana el arranque son cuatro viajes cortos —preguntar por las
  migraciones y tres `insert ... on conflict do nothing`—, o sea unos pocos
  cientos de milisegundos. Cuatro segundos es de sobra, y si no llega en ese
  rato es que hay algo mal y el panel no puede quedarse esperandolo.
*/
export const TECHO_ARRANQUE_MS = 4000;

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
        /*
          SE ESPERA AL ARRANQUE, PERO NO PARA SIEMPRE — Y SIN ABANDONARLO.

          Esta es la diferencia que importa, y costo tres dias no verla. El
          arranque corre antes de CADA consulta de cada instancia nueva, asi
          que mientras el no vuelva, el panel entero esta caido. Medido en
          produccion: consultas directas a 29 ms, camino del almacen agotando
          los 7 segundos del techo. Lo unico que habia en medio era esto.

          Lo que se techa es **la espera**, no el trabajo. La promesa del
          arranque esta guardada (ver `una-sola-vez.ts`) y sigue viva por su
          cuenta: la migracion termina igual, sin que nadie la corte a mitad de
          transaccion — que es como se dejaron los candados muertos de la
          vuelta 14 y no se va a repetir.

          Y si el arranque falla, la consulta sigue adelante igual. Las tablas
          ya existen: el panel puede trabajar. Si de verdad faltara alguna, la
          consulta dira "relation ... does not exist", que es un error con
          nombre y con arreglo — infinitamente mejor que una pantalla en gris.
        */
        try {
          await conTope(preparar(), TECHO_ARRANQUE_MS);
        } catch (error) {
          if (error instanceof TiempoAgotado) {
            /*
              Y SE SUELTA LA CONEXION, que es lo que hace que esto sirva de
              algo.

              Dejar de esperar al arranque no basta: si el arranque esta colgado
              es porque tiene la conexion ocupada, y con `max: 1` la consulta
              que viene justo detras se pondria en la misma fila y heredaria el
              mismo atasco. Se soltaria sola siete segundos despues, y el panel
              habria tardado once para no cargar.

              Soltandola aqui, la consulta abre una conexion nueva —que en
              produccion tardan 13 y 22 ms, esta medido— y la pantalla carga.
            */
            soltar();
            anotarFalloDelArranque(
              `El arranque de la base no termino en ${TECHO_ARRANQUE_MS / 1000} s, ` +
                "asi que se solto esa conexion y la consulta siguio por una nueva. " +
                "Si las tablas ya estan, el panel funciona igual.",
            );
          } else {
            anotarFalloDelArranque(
              error instanceof Error ? error.message : String(error),
            );
          }
        }

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
