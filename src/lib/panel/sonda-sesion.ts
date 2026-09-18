/*
  La sonda que separa "el pooler no me da base" de "mis ajustes rompen la
  sesion". Es la tercera sonda y existe porque las dos anteriores se quedaron
  cortas.

  DONDE SE ATASCO EL DIAGNOSTICO, QUE ES POR QUE ESTO EXISTE

  Lo que llega de produccion es esto, y es contradictorio a simple vista:

    - el nombre resuelve por IPv4 .................... verde
    - el puerto del pooler acepta en 3 ms ............ verde
    - usuario, puerto y contrasena ................... verdes
    - `select 1` ..................................... NO contesta en 2 s

  Se llega al servidor en tres milisegundos y la consulta mas barata que existe
  no vuelve. Con lo que habia no se podia decidir entre dos causas que se
  arreglan en sitios OPUESTOS:

    A. El pooler de Supabase acepta pero no consigue darte una sesion —proyecto
       dormido, reiniciandose o sin conexiones libres—. Se arregla en Supabase.

    B. La sesion se rechaza o se queda a medias por culpa de los AJUSTES con los
       que la abrimos. El panel manda `lock_timeout` y `statement_timeout` en el
       saludo inicial (se anadieron en la vuelta 16), y un pooler en modo
       transaccion admite solo una lista corta de parametros de arranque. Se
       arregla en el codigo.

  Adivinar cual es costaba otra vuelta, y ya iban tres. Esta sonda lo mide.

  COMO LO SEPARA, EN UNA FRASE

  Abre DOS conexiones nuevas —una igual que las del panel, otra desnuda— y le
  pide a cada una un `select 1`. Si la desnuda contesta y la del panel no, es B
  y esta en nuestro tejado. Si no contesta ninguna, es A y esta en Supabase.

  DOS COSAS QUE NO SE PUEDEN OLVIDAR AQUI

  1. **Cierra siempre.** El `finally` no es adorno: en la vuelta 14 se aprendio
     que una sonda que deja conexiones abiertas alimenta la averia que mide, y
     la sospecha A es justamente que no quedan conexiones libres. Una sonda que
     gasta dos y no las devuelve seria la peor herramienta posible.

  2. **No usa la conexion del panel.** Esa tiene `max: 1` y puede estar ocupada
     por una consulta abandonada, que es otra de las sospechas. Medirla a traves
     de ella seria medir el atasco con el atasco.

  NO LLEVA `server-only`: recibe la cadena como argumento en vez de ir a
  buscarla al entorno, y asi se puede probar contra un Postgres de mentira. La
  cadena no sale de aqui ni en los errores — ver `sinCadena`.
*/

import { conTope, TiempoAgotado } from "./tope";

export interface Intento {
  /** Como se abrio: con los ajustes del panel o sin ninguno. */
  como: "con los ajustes del panel" | "sin ajustes, desnuda";
  /** ms del primer `select 1`: incluye abrir la sesion y autenticarse. */
  saludoMs?: number;
  /** ms del segundo `select 1`, ya con la sesion abierta: el viaje puro. */
  viajeMs?: number;
  /** Por que no se pudo, si no se pudo. Nunca incluye la cadena. */
  error?: string;
}

/**
 * Quita de un mensaje cualquier cosa con forma de cadena de conexion.
 *
 * El error de `postgres` puede traerla entera, contrasena incluida, y de aqui
 * va derecho a una pantalla que Adrian mira en una captura. Ver la misma
 * precaucion en `conexion.ts`.
 */
export function sinCadena(mensaje: string): string {
  return mensaje.replace(/[a-z]+:\/\/\S+/gi, "(la cadena, tapada)");
}

/**
 * Abre UNA conexion nueva y le pide dos `select 1`.
 *
 * `conAjustes` decide si se mandan `lock_timeout` y `statement_timeout` en el
 * saludo inicial, que es exactamente la diferencia que se quiere medir.
 */
export async function probarSesion(
  cadena: string,
  conAjustes: boolean,
  topeMs: number,
): Promise<Intento> {
  const como = conAjustes ? "con los ajustes del panel" : "sin ajustes, desnuda";

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require("postgres") as typeof import("postgres");

  let sql: import("postgres").Sql | undefined;
  try {
    sql = postgres(cadena, {
      max: 1,
      prepare: false,
      /* Que se rinda antes que el tope de fuera, para que el error que salga
         sea el SUYO —"no llego", "me rechazaron"— y no un "tardo mucho". */
      connect_timeout: Math.max(1, Math.round(topeMs / 1000) - 1),
      ...(conAjustes
        ? { connection: { lock_timeout: 2000, statement_timeout: 5000 } }
        : {}),
    });

    const antesDelSaludo = Date.now();
    await conTope(sql`select 1 as pulso`, topeMs);
    const saludoMs = Date.now() - antesDelSaludo;

    /*
      El segundo `select 1` va con la sesion ya abierta, asi que mide solo el
      viaje. Comparar los dos dice si lo caro fue abrir o fue preguntar, que son
      dos averias distintas: la primera apunta al pooler, la segunda a la red.
    */
    const antesDelViaje = Date.now();
    await conTope(sql`select 1 as pulso`, topeMs);
    const viajeMs = Date.now() - antesDelViaje;

    return { como, saludoMs, viajeMs };
  } catch (error) {
    const motivo =
      error instanceof TiempoAgotado
        ? `no contesto en ${topeMs / 1000} s`
        : error instanceof Error
          ? error.message
          : String(error);
    return { como, error: sinCadena(motivo) };
  } finally {
    /*
      SIEMPRE. Gane, pierda o reviente. Si esto no estuviera, cada visita a la
      pantalla de estado dejaria dos conexiones colgando contra el pooler — y
      "no quedan conexiones libres" es una de las cosas que esta sonda intenta
      averiguar. Ver la vuelta 14: el instrumento que altera lo que mide.
    */
    await sql?.end({ timeout: 2 }).catch(() => {});
  }
}
