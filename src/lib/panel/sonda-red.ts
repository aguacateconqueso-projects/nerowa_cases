/*
  Sondas de red: antes de preguntar nada a Postgres, comprobar si se puede
  llegar.

  POR QUE EXISTE

  La cadena de conexion puede estar perfecta —usuario con la referencia del
  proyecto, puerto del pooler, contrasena puesta— y aun asi no contestar nadie.
  Cuando eso pasa, "la base no contesto a tiempo" es verdad y no sirve: no
  distingue entre tres averias que se arreglan en sitios distintos.

    1. El nombre del servidor NO EXISTE     -> la direccion esta mal, o el
                                               proyecto se borro
    2. El nombre existe pero NADIE ACEPTA   -> el proyecto esta dormido o
                                               pausado, o el puerto no es ese
    3. Acepta y NO HABLA POSTGRES           -> hay algo delante: un cortafuegos
                                               o un proxy

  Estas dos sondas separan los tres casos en menos de un segundo, sin
  credenciales y sin tocar la base. El error de Postgres, cuando llega, llega ya
  con el contexto de si habia alguien al otro lado.

  NO LLEVA `server-only` a proposito, por lo mismo que `diagnostico-conexion.ts`:
  recibe el servidor y el puerto como argumentos en vez de ir a buscarlos a las
  variables de entorno, y asi se puede probar contra sockets de mentira. La
  contrasena no entra aqui ni de lejos.
*/

import { conTope, TiempoAgotado } from "./tope";
import type { Pista } from "./diagnostico-conexion";

export type ResultadoDns =
  | { estado: "resuelve"; familias: (4 | 6)[]; ms: number }
  | { estado: "no_resuelve"; codigo: string; ms: number }
  | { estado: "tardo"; ms: number };

export type ResultadoTcp =
  | { estado: "acepta"; ms: number }
  | { estado: "rechaza"; codigo: string; ms: number }
  | { estado: "no_contesta"; ms: number };

export interface SondaRed {
  anfitrion: string;
  puerto: number;
  dns: ResultadoDns;
  /** Solo se intenta si el nombre resuelve. Tocar una IP que no existe no dice nada. */
  tcp?: ResultadoTcp;
}

/**
 * Traduce el nombre del servidor a direcciones IP.
 *
 * Se piden TODAS (`all`) y no solo la primera porque lo que importa no es que
 * direccion sale, sino **de que familia**: una que solo resuelve a IPv6 es la
 * conexion directa de Supabase, y desde Vercel no se alcanza. Esa es la
 * diferencia entre "esta mal escrito" y "esta bien escrito pero es la otra".
 */
export async function resolverNombre(
  anfitrion: string,
  ms: number,
): Promise<ResultadoDns> {
  const desde = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("node:dns") as typeof import("node:dns");
    const encontradas = await conTope(
      dns.promises.lookup(anfitrion, { all: true }),
      ms,
    );
    const familias = [
      ...new Set(encontradas.map((d) => d.family as 4 | 6)),
    ].sort();
    return { estado: "resuelve", familias, ms: Date.now() - desde };
  } catch (error) {
    if (error instanceof TiempoAgotado) {
      return { estado: "tardo", ms: Date.now() - desde };
    }
    const codigo =
      (error as NodeJS.ErrnoException)?.code ?? "DESCONOCIDO";
    return { estado: "no_resuelve", codigo, ms: Date.now() - desde };
  }
}

/**
 * Abre un socket y lo cierra. Nada mas.
 *
 * No manda un solo byte ni espera respuesta: la pregunta es solo si hay algo
 * escuchando. Distinguir "me rechazan" (hay maquina, no hay servicio) de "no
 * contesta nadie" (se pierde el paquete) es exactamente lo que separa un puerto
 * equivocado de un proyecto dormido.
 */
export function tocarPuerto(
  anfitrion: string,
  puerto: number,
  ms: number,
): Promise<ResultadoTcp> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const net = require("node:net") as typeof import("node:net");
  return new Promise<ResultadoTcp>((resolver) => {
    const desde = Date.now();
    const socket = new net.Socket();
    let contestado = false;

    /*
      El socket SIEMPRE se destruye, gane quien gane la carrera. Un socket
      abierto mantiene viva la funcion en Vercel igual que un reloj sin limpiar,
      y aqui se abre uno en cada carga de la pantalla de estado.
    */
    const acabar = (resultado: ResultadoTcp) => {
      if (contestado) return;
      contestado = true;
      socket.destroy();
      resolver(resultado);
    };

    socket.setTimeout(ms);
    socket.once("connect", () =>
      acabar({ estado: "acepta", ms: Date.now() - desde }),
    );
    socket.once("timeout", () =>
      acabar({ estado: "no_contesta", ms: Date.now() - desde }),
    );
    socket.once("error", (error: NodeJS.ErrnoException) =>
      acabar({
        estado: "rechaza",
        codigo: error?.code ?? "DESCONOCIDO",
        ms: Date.now() - desde,
      }),
    );
    socket.connect(puerto, anfitrion);
  });
}

/**
 * Que hacer segun lo que contestaron las sondas.
 *
 * Devuelve como mucho UNA pista: es la causa raiz, y encima de ella no hay nada
 * mas que decir. Si el nombre no resuelve, que el puerto este bien da igual.
 */
export function pistasDeRed(sonda: SondaRed): Pista[] {
  const { dns, tcp, anfitrion, puerto } = sonda;

  if (dns.estado === "no_resuelve") {
    return [
      {
        titulo: "Ese servidor no existe",
        queHacer:
          `El nombre "${anfitrion}" no se puede traducir a ninguna direccion, asi ` +
          "que no es que la base no conteste: es que no hay a quien preguntar. " +
          "Suele ser una letra de mas o de menos al copiar, o un proyecto de " +
          "Supabase borrado. Vuelve a copiar la cadena entera desde Supabase → " +
          "Connect → Transaction pooler, sin escribir nada a mano.",
        nivel: "error",
      },
    ];
  }

  if (dns.estado === "tardo") {
    return [
      {
        titulo: "No se pudo ni traducir el nombre del servidor",
        queHacer:
          "La consulta de nombres se quedo colgada, que es raro y casi nunca es " +
          "culpa de la cadena. Vuelve a cargar esta pantalla; si se repite, el " +
          "problema esta en la red de Vercel y no en la configuracion.",
        nivel: "aviso",
      },
    ];
  }

  if (dns.estado === "resuelve" && !dns.familias.includes(4)) {
    return [
      {
        titulo: "Ese servidor solo tiene IPv6, y Vercel no llega por ahi",
        queHacer:
          "Es la marca de la conexion directa de Supabase. La del Transaction " +
          "pooler resuelve por IPv4 y si se alcanza: servidor terminado en " +
          "'pooler.supabase.com', puerto 6543.",
        nivel: "error",
      },
    ];
  }

  if (tcp?.estado === "no_contesta") {
    return [
      {
        titulo: "El servidor existe pero no acepta la conexion",
        queHacer:
          `El nombre resuelve, o sea que la direccion es buena, pero el puerto ` +
          `${puerto} no contesta ni para decir que no. Con Supabase eso es casi ` +
          "siempre el **proyecto pausado**: los gratuitos se duermen solos y hay " +
          "que despertarlos a mano. Entra a supabase.com, abre el proyecto y si " +
          'sale un boton de "Restore" o "Resume", pulsalo y espera a que arranque.',
        nivel: "error",
      },
    ];
  }

  if (tcp?.estado === "rechaza") {
    const dormido = tcp.codigo === "ECONNRESET";
    return [
      {
        titulo: dormido
          ? "El servidor corta la conexion nada mas abrirla"
          : "En ese puerto no hay nadie escuchando",
        queHacer: dormido
          ? "Eso lo hace un proyecto de Supabase pausado o a medio arrancar. " +
            "Abrelo en supabase.com, despiertalo si hace falta, y espera un " +
            "minuto antes de volver aqui."
          : `Hay maquina en esa direccion, pero el puerto ${puerto} esta cerrado ` +
            `(${tcp.codigo}). El del pooler de transacciones es el 6543; el 5432 ` +
            "es el de la conexion directa, que desde Vercel no vale.",
        nivel: "error",
      },
    ];
  }

  return [];
}

/** Una frase para la pantalla, sin tecnicismos. */
export function describirSonda(sonda: SondaRed): string {
  const { dns, tcp } = sonda;
  if (dns.estado === "no_resuelve") return "el nombre no existe";
  if (dns.estado === "tardo") return "no se pudo traducir el nombre";

  const familias = dns.familias.map((f) => `IPv${f}`).join(" y ");
  if (!tcp) return `el nombre resuelve (${familias})`;
  if (tcp.estado === "acepta") {
    return `el nombre resuelve (${familias}) y el puerto acepta en ${tcp.ms} ms`;
  }
  if (tcp.estado === "rechaza") {
    return `el nombre resuelve (${familias}) pero el puerto rechaza (${tcp.codigo})`;
  }
  return `el nombre resuelve (${familias}) pero el puerto no contesta`;
}
