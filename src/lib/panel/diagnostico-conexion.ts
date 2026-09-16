/*
  Traduce los problemas de conexion a instrucciones que se puedan seguir.

  POR QUE EXISTE

  La pantalla de estado hizo su trabajo y enseño el error de verdad:
  `password authentication failed for user "postgres"`. Correcto, exacto... y en
  ingles, con vocabulario de base de datos, y sin decir que hacer. Para quien no
  programa, eso es tan util como la pantalla negra que sustituyo.

  Aqui se convierte cada fallo conocido en una frase que dice **donde tocar y
  que poner**. Es la misma regla que el resto del panel: la pantalla tiene que
  decir que hacer ahora.

  NADA DE ESTO ENSENA SECRETOS. La cadena de conexion se analiza para sacar el
  puerto y la forma del usuario; **la contrasena no se lee, no se guarda y no se
  devuelve**, ni siquiera enmascarada. Hay una prueba que lo comprueba.

  Este archivo NO lleva `server-only`, y es a proposito: son funciones puras que
  reciben la cadena como argumento en vez de ir a buscarla. Eso permite
  probarlas aisladas, que es como se comprueba lo del parrafo anterior. Quien si
  lleva la marca es `diagnostico.ts`, que es el que lee las variables de
  entorno.
*/

/**
 * La cadena de conexion **con la contrasena tapada**, para poder mirarla.
 *
 * Hacia falta: con solo el error de Postgres hay que adivinar si lo que esta
 * mal es el usuario, el puerto o la contrasena, y adivinar cuesta una vuelta
 * entera cada vez. Enseñando la cadena sin la contrasena, el problema se ve de
 * un vistazo — "ah, el usuario no tiene el punto", "ah, el puerto es el 5432".
 *
 * Lo que se tapa es la contrasena y nada mas. El usuario, el servidor y el
 * puerto no son secretos: son la mitad publica de una conexion, no abren nada
 * sin la contrasena, y son justo lo que hay que poder comprobar.
 */
export interface CadenaALaVista {
  /** Ej.: `postgresql://postgres.abc:•••@aws-0.pooler.supabase.com:6543/postgres` */
  texto: string;
  usuario?: string;
  anfitrion?: string;
  puerto?: number;
  /** Si hay contrasena, sin decir cual ni de que largo. */
  tieneContrasena: boolean;
}

export interface Pista {
  /** Que esta mal, en una frase. */
  titulo: string;
  /** Que hacer, con el sitio exacto. */
  queHacer: string;
  /** `error` frena el panel; `aviso` funciona pero conviene arreglarlo. */
  nivel: "error" | "aviso";
}

/* --------------------------------------------------------------------------
   Lo que se puede saber ANTES de conectar, mirando la forma de la cadena
   -------------------------------------------------------------------------- */

interface FormaCadena {
  puerto?: number;
  usuario?: string;
  anfitrion?: string;
  /** Si la contrasena trae caracteres que en una URL significan otra cosa. */
  contrasenaSospechosa: boolean;
}

function leerForma(url: string): FormaCadena | undefined {
  /*
    Se parte a mano y NO con `URL`, por la misma razon que `cadenaALaVista`:
    cuando la contrasena trae caracteres sin codificar, `URL` parte por donde no
    debe y da un usuario que no es el que hay escrito — justo en el caso que
    hay que detectar.
  */
  const vista = cadenaALaVista(url);
  if (!vista || !vista.usuario) return undefined;

  const trasEsquema = url.indexOf("//");
  const resto = url.slice(trasEsquema + 2);
  const credenciales = resto.slice(0, resto.lastIndexOf("@"));
  const corteDosPuntos = credenciales.indexOf(":");

  /*
    Se mira SOLO si la contrasena trae caracteres que rompen una direccion. No
    se guarda, no se devuelve y no se registra en ningun sitio.
  */
  const bruta = corteDosPuntos === -1 ? "" : credenciales.slice(corteDosPuntos + 1);
  const contrasenaSospechosa = /[@/#?[\]]/.test(bruta);

  return {
    puerto: vista.puerto,
    usuario: vista.usuario,
    anfitrion: vista.anfitrion,
    contrasenaSospechosa,
  };
}

/**
 * La cadena con la contrasena sustituida por puntos.
 *
 * Se construye a mano en vez de con `URL`, porque cuando la contrasena trae
 * caracteres sin codificar —que es justo el caso que hay que poder ver— `URL`
 * la parte por donde no debe, y entonces lo que se enseñaria seria una cadena
 * que no se parece a la que hay puesta.
 */
export function cadenaALaVista(url: string | undefined): CadenaALaVista | undefined {
  if (!url) return undefined;

  const trasEsquema = url.indexOf("//");
  if (trasEsquema === -1) return { texto: "(no tiene forma de direccion)", tieneContrasena: false };

  const esquema = url.slice(0, trasEsquema + 2);
  const resto = url.slice(trasEsquema + 2);

  /* El ULTIMO `@` separa las credenciales del servidor: si la contrasena trae
     alguno, los de antes son suyos. */
  const corteArroba = resto.lastIndexOf("@");
  if (corteArroba === -1) {
    return { texto: `${esquema}(sin usuario ni contrasena)`, tieneContrasena: false };
  }

  const credenciales = resto.slice(0, corteArroba);
  const servidor = resto.slice(corteArroba + 1);

  const corteDosPuntos = credenciales.indexOf(":");
  const usuario = corteDosPuntos === -1 ? credenciales : credenciales.slice(0, corteDosPuntos);
  const tieneContrasena = corteDosPuntos !== -1 && credenciales.length > corteDosPuntos + 1;

  const puertoTexto = /:(\d+)(\/|$)/.exec(servidor)?.[1];
  const anfitrion = servidor.split(/[:/]/)[0];

  return {
    texto: `${esquema}${usuario}:${tieneContrasena ? "•••••••" : "(vacia)"}@${servidor}`,
    usuario,
    anfitrion,
    puerto: puertoTexto ? Number(puertoTexto) : undefined,
    tieneContrasena,
  };
}

/**
 * Revisa la cadena de conexion sin llegar a usarla.
 *
 * Detecta las incoherencias que se pueden ver a simple vista, que son
 * justamente las que mas cuestan de encontrar a mano.
 */
export function revisarCadena(url: string | undefined): Pista[] {
  if (!url) return [];

  const forma = leerForma(url);
  if (!forma) {
    return [
      {
        nivel: "error",
        titulo: "La cadena de conexion no tiene forma de direccion valida",
        queHacer:
          "Vuelve a copiarla entera desde Supabase: Project Settings → Database → " +
          "Connection string → Transaction pooler. Sin espacios ni saltos de linea.",
      },
    ];
  }

  const pistas: Pista[] = [];
  const esPooler = forma.puerto === 6543;
  const usuarioSinProyecto = forma.usuario === "postgres";

  /*
    El fallo mas comun con Supabase, de largo. Al pooler NO se entra como
    "postgres" sino como "postgres.<referencia-del-proyecto>", y el sintoma es
    exactamente "password authentication failed for user postgres": parece un
    problema de contrasena y es de usuario.
  */
  if (esPooler && usuarioSinProyecto) {
    pistas.push({
      nivel: "error",
      titulo: 'Al pooler no se entra como "postgres" a secas',
      queHacer:
        'El usuario tiene que ser "postgres.<referencia-del-proyecto>", con un punto ' +
        "y la referencia de tu proyecto detras. Eso ya viene puesto si copias la " +
        "cadena tal cual de Supabase → Project Settings → Database → Connection " +
        "string → pestaña Transaction pooler. Si la escribiste a mano o cambiaste " +
        "el puerto de la directa, el usuario se queda corto y falla asi.",
    });
  }

  if (forma.puerto === 5432) {
    pistas.push({
      nivel: "aviso",
      titulo: "Estas usando la conexion directa, no el pooler",
      queHacer:
        "Funciona, pero en Vercel se agotan las conexiones en cuanto haya trafico. " +
        "Cambia a la cadena del Transaction pooler, puerto 6543.",
    });
  }

  if (forma.contrasenaSospechosa) {
    pistas.push({
      nivel: "error",
      titulo: "La contrasena lleva caracteres que rompen la direccion",
      queHacer:
        "Si la contrasena tiene @, /, #, ? o corchetes, hay que escribirlos en " +
        "codigo de URL (@ es %40, / es %2F, # es %23). Lo mas facil: cambia la " +
        "contrasena en Supabase por una de letras y numeros.",
    });
  }

  return pistas;
}

/* --------------------------------------------------------------------------
   Lo que dice la base cuando ya se intento conectar
   -------------------------------------------------------------------------- */

/**
 * Traduce el mensaje de error de Postgres a que hacer.
 *
 * Se mira el texto del mensaje y no un codigo de error porque los codigos no
 * llegan igual por todos los caminos, y el texto de estos fallos concretos es
 * estable desde hace anios.
 */
export function traducirError(mensaje: string): Pista | undefined {
  const m = mensaje.toLowerCase();

  if (m.includes("password authentication failed")) {
    return {
      nivel: "error",
      titulo: "La base rechazo el usuario o la contrasena",
      queHacer:
        "Casi siempre es el usuario, no la contrasena: al pooler de Supabase se " +
        'entra como "postgres.<referencia-del-proyecto>", no como "postgres". ' +
        "Copia la cadena entera desde Project Settings → Database → Connection " +
        "string → Transaction pooler y pegala en DATABASE_URL sin tocar nada. " +
        "Si aun asi falla, cambia la contrasena de la base en Supabase y vuelve a " +
        "copiar la cadena.",
    };
  }

  if (m.includes("no tiene forma de direccion valida")) {
    return {
      nivel: "error",
      titulo: "La cadena de conexion esta rota",
      queHacer:
        "Casi siempre es la contrasena: si lleva @, /, #, ? o corchetes, parte la " +
        "direccion por donde no debe. Lo mas rapido es cambiarla en Supabase " +
        "(Project Settings → Database → Reset database password) por una de solo " +
        "letras y numeros, y volver a copiar la cadena del Transaction pooler.",
    };
  }

  if (m.includes("econnrefused") || m.includes("enotfound") || m.includes("timeout")) {
    return {
      nivel: "error",
      titulo: "No se pudo llegar a la base de datos",
      queHacer:
        "Comprueba que el proyecto de Supabase esta encendido —los gratuitos se " +
        "duermen si no se usan— y que la direccion y el puerto de DATABASE_URL son " +
        "los que da Supabase. El puerto del pooler es el 6543.",
    };
  }

  if (m.includes("does not exist") && m.includes("database")) {
    return {
      nivel: "error",
      titulo: "Esa base de datos no existe en el servidor",
      queHacer:
        'El nombre va al final de la cadena y normalmente es "postgres". ' +
        "Vuelve a copiarla de Supabase tal cual.",
    };
  }

  if (m.includes("too many clients") || m.includes("max client")) {
    return {
      nivel: "error",
      titulo: "Se agotaron las conexiones",
      queHacer:
        "Es lo que pasa con la conexion directa en Vercel. Cambia DATABASE_URL a " +
        "la del Transaction pooler, puerto 6543.",
    };
  }

  if (m.includes("prepared statement")) {
    return {
      nivel: "error",
      titulo: "El pooler no admite sentencias preparadas",
      queHacer:
        "Esto es cosa del codigo, no de la configuracion: avisa y se arregla en " +
        "el adaptador de Postgres.",
    };
  }

  return undefined;
}
