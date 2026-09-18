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
  /**
   * Si quedaron los corchetes del hueco `[YOUR-PASSWORD]`.
   *
   * Hace falta aqui, ademas de en las pistas, porque con la contrasena tapada
   * el problema no se veria: los puntitos se ven igual con corchetes que sin
   * ellos, y este es justo el fallo que hay que poder ver de un vistazo.
   */
  contrasenaEntreCorchetes: boolean;
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
  /** Si se dejaron los corchetes del hueco `[YOUR-PASSWORD]` de Supabase. */
  contrasenaEntreCorchetes: boolean;
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

  return {
    puerto: vista.puerto,
    usuario: vista.usuario,
    anfitrion: vista.anfitrion,
    contrasenaSospechosa: /[@/#?[\]]/.test(bruta),
    contrasenaEntreCorchetes: bruta.startsWith("[") && bruta.endsWith("]"),
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
  if (trasEsquema === -1) {
    return {
      texto: "(no tiene forma de direccion)",
      tieneContrasena: false,
      contrasenaEntreCorchetes: false,
    };
  }

  const esquema = url.slice(0, trasEsquema + 2);
  const resto = url.slice(trasEsquema + 2);

  /* El ULTIMO `@` separa las credenciales del servidor: si la contrasena trae
     alguno, los de antes son suyos. */
  const corteArroba = resto.lastIndexOf("@");
  if (corteArroba === -1) {
    return {
      texto: `${esquema}(sin usuario ni contrasena)`,
      tieneContrasena: false,
      contrasenaEntreCorchetes: false,
    };
  }

  const credenciales = resto.slice(0, corteArroba);
  const servidor = resto.slice(corteArroba + 1);

  const corteDosPuntos = credenciales.indexOf(":");
  const usuario = corteDosPuntos === -1 ? credenciales : credenciales.slice(0, corteDosPuntos);
  const contrasenaBruta =
    corteDosPuntos === -1 ? "" : credenciales.slice(corteDosPuntos + 1);
  const tieneContrasena = contrasenaBruta.length > 0;
  const contrasenaEntreCorchetes =
    contrasenaBruta.startsWith("[") && contrasenaBruta.endsWith("]");

  const puertoTexto = /:(\d+)(\/|$)/.exec(servidor)?.[1];
  const anfitrion = servidor.split(/[:/]/)[0];

  /* Los corchetes se dejan A LA VISTA alrededor de los puntitos: es la unica
     forma de que se vea el fallo sin enseñar la contrasena. */
  const tapada = contrasenaEntreCorchetes ? "[•••••••]" : "•••••••";

  return {
    texto: `${esquema}${usuario}:${tieneContrasena ? tapada : "(vacia)"}@${servidor}`,
    usuario,
    anfitrion,
    puerto: puertoTexto ? Number(puertoTexto) : undefined,
    tieneContrasena,
    contrasenaEntreCorchetes,
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

  /*
    La conexion directa de Supabase (`db.<referencia>.supabase.co`) resuelve solo
    por IPv6, y las funciones de Vercel no salen por IPv6. El resultado no es un
    error de credenciales: la conexion se queda esperando hasta que Vercel corta
    la funcion y devuelve un 504. O sea que el sintoma —la pagina que no carga—
    no se parece en nada a la causa.

    Por eso es un error y no un aviso: desde Vercel, con esa cadena, no hay
    conexion posible.
  */
  const esDirectaDeSupabase = /^db\..+\.supabase\.co$/.test(forma.anfitrion ?? "");
  if (esDirectaDeSupabase) {
    pistas.push({
      nivel: "error",
      titulo: "Esa es la conexion directa, y desde Vercel no funciona",
      queHacer:
        "El servidor que empieza por 'db.' solo se puede alcanzar por IPv6, y las " +
        "funciones de Vercel no salen por ahi: la conexion se queda colgada hasta " +
        "que la pagina da tiempo agotado. Usa la cadena de la pestaña Transaction " +
        "pooler, cuyo servidor termina en 'pooler.supabase.com' y usa el puerto 6543.",
    });
  } else if (forma.puerto === 5432) {
    pistas.push({
      nivel: "aviso",
      titulo: "Estas usando el puerto de la conexion directa, no el del pooler",
      queHacer:
        "Puede funcionar, pero en Vercel se agotan las conexiones en cuanto haya " +
        "trafico. Cambia a la cadena del Transaction pooler, puerto 6543.",
    });
  }

  /*
    El error mas comun de todos, y el que mas tiempo cuesta porque no se parece
    a lo que es: Supabase da la cadena con `[YOUR-PASSWORD]` como hueco, y los
    corchetes son parte del hueco, no de la sintaxis. Al escribir la contrasena
    dentro de ellos, lo que viaja es `[laclave]` con corchetes y todo, y Postgres
    contesta "password authentication failed" — que suena a contrasena
    equivocada cuando la contrasena era la correcta.

    Se comprueba ANTES que lo de los caracteres raros porque es mas concreto: si
    la contrasena esta entre corchetes, decir "lleva caracteres que rompen la
    direccion" es cierto y no sirve de nada.
  */
  if (forma.contrasenaEntreCorchetes) {
    pistas.push({
      nivel: "error",
      titulo: "La contrasena quedo entre corchetes",
      queHacer:
        "Los corchetes de [YOUR-PASSWORD] son el hueco a rellenar, no parte de la " +
        "direccion: hay que BORRARLOS y dejar solo la contrasena. Si pones " +
        "[miclave], la contrasena que viaja es [miclave] con corchetes incluidos, " +
        "y por eso te la rechaza.",
    });
  } else if (forma.contrasenaSospechosa) {
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
export interface LoQueDijeronLasSondas {
  /** El puerto del servidor acepta conexiones. */
  seLlega?: boolean;
  /**
   * Si la base contesto a `select 1`, la consulta mas barata que existe.
   *
   * `false` significa que **ni eso** contesto, y ese dato lo cambia todo:
   * `select 1` no pide ningun candado, asi que si se queda esperando, un
   * candado no puede ser la causa. `undefined` es que no se llego a probar.
   */
  pulso?: boolean;
}

export function traducirError(
  mensaje: string,
  sondas: boolean | LoQueDijeronLasSondas = {},
): Pista | undefined {
  /* Admite el booleano de siempre para no reescribir cada llamada. */
  const { seLlega = false, pulso } =
    typeof sondas === "boolean" ? { seLlega: sondas, pulso: undefined } : sondas;
  const m = mensaje.toLowerCase();

  /*
    Un candado tiene nombre propio y no se parece a nada mas. Va el primero
    porque su mensaje contiene "timeout" y si no se adelantaria a el la pista
    generica de "no se pudo llegar", que manda a mirar la direccion — justo
    donde no esta el problema.
  */
  if (m.includes("lock timeout") || m.includes("statement timeout")) {
    return {
      nivel: "error",
      titulo: "La base responde, pero hay una consulta atascada bloqueandola",
      queHacer:
        "Una migracion anterior se quedo a medias —a Vercel se le acabo el tiempo " +
        "y corto la funcion— y su sesion sigue abierta reteniendo los candados de " +
        'las tablas. Abajo, en "quien mas esta conectado", salen cuantas hay. El ' +
        'boton "Soltar las sesiones atascadas" las cierra; despues recarga esta ' +
        "pantalla.",
    };
  }

  if (m.includes("password authentication failed")) {
    return {
      nivel: "error",
      titulo: "La base rechazo el usuario o la contrasena",
      queHacer:
        "Las dos causas mas comunes, por orden. UNA: dejar los corchetes de " +
        "[YOUR-PASSWORD] al rellenar la cadena — hay que borrarlos y dejar solo " +
        "la contrasena. DOS: entrar al pooler como \"postgres\" en vez de " +
        '"postgres.<referencia-del-proyecto>". Mira abajo "la cadena que esta ' +
        'puesta": ahi se ve cual de las dos es.',
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

  if (m.includes("no contesto en")) {
    /*
      La misma espera significa cosas opuestas segun si se llega al servidor o
      no, y mandar a revisar la direccion cuando el puerto acepta en 77 ms
      quema una vuelta entera persiguiendo lo que ya estaba bien. Por eso esta
      pista necesita saber lo que dijeron las sondas.
    */
    /*
      EL CASO QUE COSTO UNA SESION ENTERA, Y NO SE PUEDE VOLVER A CONFUNDIR.

      El puerto acepta en 6 ms y la consulta agota el tiempo. Hasta aqui,
      identico al caso del candado de la vuelta 14. La diferencia esta en un
      dato que antes esta funcion no recibia: **`select 1` tampoco contesto**.

      Y `select 1` no pide candados. Ninguno. Si se queda esperando, lo que
      falla no es una consulta bloqueada por otra: es que la sesion no tiene
      detras una base que conteste. El pooler de Supabase es compartido y sigue
      en pie —por eso acepta en 6 ms— aunque el proyecto que hay detras este
      dormido, reiniciandose o sin conexiones libres.

      Decir "es un candado" aqui manda a pulsar un boton que no puede arreglar
      nada, y ademas ese boton necesita la misma base que no contesta. Es
      exactamente el error de la vuelta 13: una pista correcta para el caso de
      ayer, falsa para el de hoy, que manda a rehacer lo que ya estaba bien.
    */
    if (seLlega && pulso === false) {
      return {
        nivel: "error",
        titulo: "Se llega al pooler, pero detras no hay base que conteste",
        queHacer:
          "Esto NO es un candado: ni siquiera un `select 1` —la consulta mas " +
          "barata que existe, que no pide ningun candado— contesta. El puerto que " +
          "responde es el del pooler de Supabase, que es compartido y sigue en pie " +
          "aunque el proyecto no. Mira el proyecto en Supabase: si esta Paused o " +
          "Restarting, reanudalo y espera a que quede Active. Si ya dice Active, " +
          "mira el uso de conexiones del pooler — si estan todas ocupadas, acepta " +
          "la conexion y nunca te da una sesion. Soltar sesiones atascadas aqui no " +
          "sirve: haria falta la misma base que no responde.",
      };
    }

    return seLlega
      ? {
          nivel: "error",
          titulo: "Se llega al servidor, pero la consulta se queda esperando",
          queHacer:
            "La direccion, el puerto y la contrasena estan bien: la sesion se abre " +
            "y se autentica. Lo que no termina es la consulta, y eso casi siempre " +
            "es un candado que retiene una sesion anterior que quedo a medias. " +
            'Mira abajo "quien mas esta conectado" y suelta las atascadas.',
        }
      : {
          nivel: "error",
          titulo: "La base no contesto a tiempo",
          queHacer:
            "Cuando no contesta nadie —en vez de rechazar la contrasena— casi siempre " +
            "es que la direccion no se puede alcanzar. La causa mas comun desde Vercel " +
            "es estar usando la conexion directa (el servidor que empieza por 'db.'), " +
            "que solo funciona por IPv6. Usa la del Transaction pooler. La otra causa " +
            "es que el proyecto de Supabase este dormido: abrelo y espera a que arranque.",
        };
  }

  if (m.includes("econnrefused") || m.includes("enotfound") || m.includes("timeout")) {
    return {
      nivel: "error",
      titulo: "No se pudo llegar a la base de datos",
      queHacer:
        "Comprueba que el proyecto de Supabase esta encendido —los gratuitos se " +
        "duermen si no se usan— y que la direccion y el puerto de DATABASE_URL son " +
        "los que da Supabase. El puerto del pooler es el 6543. Y si el servidor " +
        "empieza por 'db.', esa es la conexion directa y desde Vercel no funciona.",
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
