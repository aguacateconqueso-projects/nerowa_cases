import "server-only";

/*
  El estado del sistema: que adaptadores estan activos y si la base responde.

  Para que existe: cuando algo no funciona, la primera pregunta siempre es "¿el
  panel esta hablando con la base de datos, o sigue en modo demostracion?". Sin
  esta pantalla, esa pregunta se contesta mirando variables de entorno en el
  panel de Vercel, que es justo lo que este proyecto no le puede pedir a nadie.

  LO QUE NUNCA SALE DE AQUI: la cadena de conexion, la clave, el secreto de
  firma ni ningun otro valor sensible. Solo si estan puestos y si funcionan.
*/

import {
  cadenaALaVista,
  revisarCadena,
  traducirError,
  type CadenaALaVista,
  type Pista,
} from "./diagnostico-conexion";
import { conexion } from "./adaptadores/postgres/conexion";
import { falloDelArranque } from "./adaptadores/postgres/fallo-del-arranque";
import { contarFilas, medirSalud, type Salud } from "./adaptadores/postgres/salud";
import { servicios } from "./servicios";
import {
  describirSonda,
  pistasDeRed,
  resolverNombre,
  tocarPuerto,
  type SondaRed,
} from "./sonda-red";
import { probarSesion, type Intento } from "./sonda-sesion";
import { conTope } from "./tope";

export interface Cuenta {
  que: string;
  cuantos: number;
}

export interface Diagnostico {
  almacen: string;
  correo: string;
  avisos: string;
  archivos: string;
  /** Si el almacen guarda de verdad o se pierde al reiniciar. */
  persistente: boolean;
  /** Si respondio, y en cuanto. `undefined` cuando no aplica. */
  respondeEnMs?: number;
  error?: string;
  /**
   * Que hacer, en castellano y con el sitio exacto.
   *
   * El mensaje crudo de la base sigue estando —es lo que permite buscarlo— pero
   * lo que se lee primero es esto: un error exacto que no dice donde tocar no
   * sirve de mucho mas que la pantalla negra que sustituyo.
   */
  pistas: Pista[];
  /** La cadena de conexion con la contrasena tapada, para poder mirarla. */
  cadena?: CadenaALaVista;
  /** Si se puede LLEGAR al servidor, antes de hablar de Postgres. */
  red?: SondaRed;
  /** La sonda de red en una frase, para la pantalla. */
  redEnUnaFrase?: string;
  /** Lo que dice la base sobre si misma, con consultas que no se bloquean. */
  salud?: Salud;
  /** Por que no se pudo medir la salud, si no se pudo. */
  saludError?: string;
  /**
   * Dos conexiones nuevas, una con los ajustes del panel y otra desnuda.
   *
   * Solo se prueba cuando el puerto acepta y aun asi no hay pulso, que es el
   * unico caso en el que la respuesta no se puede deducir de lo ya medido.
   */
  sesiones?: Intento[];
  /** Por que no se pudieron contar las filas, si no se pudo. */
  cuentasError?: string;
  /**
   * El MISMO camino que recorren las pantallas del panel, recorrido aqui.
   *
   * Existe porque hubo un dia en que `/panel/estado` decia que todo estaba
   * bien —pulso de 25 ms, tablas creadas, ninguna sesion atascada— y `/panel`
   * y `/panel/tiendas` daban "Esta pantalla no cargo" con un numero y nada
   * mas. En produccion React tapa el mensaje de un error de servidor y solo
   * deja el numero, asi que no habia forma de saber que fallaba.
   *
   * La diferencia entre esta pantalla y aquellas es que esta pregunta por la
   * conexion directa y aquellas pasan por el almacen —con su arranque, sus
   * migraciones y su semilla—. Este campo recorre ese camino a proposito y
   * ensena el error crudo, que es lo unico que permite arreglarlo.
   */
  caminoDelPanelError?: string;
  /**
   * Si el arranque de la base (migraciones y semilla) fallo o tardo de mas.
   *
   * Ya no tumba el panel —las consultas siguen adelante— pero un fallo que no
   * bloquea y no se cuenta es un fallo invisible, y de esos ya hubo bastantes
   * en esta sesion.
   */
  arranqueError?: string;
  cuentas: Cuenta[];
  migraciones: string[];
  /** Variables que hacen falta y si estan puestas. Nunca su valor. */
  variables: { nombre: string; puesta: boolean; nota?: string }[];
}

/*
  Cuanto se espera a la base antes de dar la respuesta por perdida.

  Vercel corta las funciones a los pocos segundos y devuelve un 504 —una pagina
  de Vercel, no del panel—, asi que si esta pantalla esperara sin tope, la
  herramienta de diagnostico se caeria por lo mismo que tiene que diagnosticar.
  Es la segunda vez que ese error aparece, y por eso ahora hay un tope propio,
  mas corto que el de Vercel: la pantalla responde SIEMPRE, y si la base no
  contesta a tiempo lo dice en vez de desaparecer.
*/
const PRESUPUESTO_MS = 7000;

/*
  Lo que se le da a cada sonda. Son topes, no esperas: cuando el servidor esta
  bien las tres juntas tardan menos de medio segundo, y lo que sobra se lo queda
  la consulta.

  El reparto importa. La consulta se lleva lo que quede del presupuesto, y el
  `connect_timeout` del cliente de Postgres (3 s, en `conexion.ts`) es MENOR que
  eso a proposito: asi el que se rinde primero es Postgres, y lo que sale en
  pantalla es su error de verdad —"no llego", "me rechazaron"— en vez del
  generico "no contesto a tiempo". Cuando el tope de aqui gana al del cliente,
  esta pantalla se queda ciega justo cuando mas falta hace ver.
*/
const ESPERA_DNS_MS = 2000;
const ESPERA_TCP_MS = 2500;

export async function diagnosticar(): Promise<Diagnostico> {
  const { almacen, correo, avisos, archivos } = servicios();
  const persistente = almacen.nombre !== "memoria";

  const base: Diagnostico = {
    almacen: almacen.nombre,
    correo: correo.nombre,
    avisos: avisos.nombre,
    archivos: archivos.nombre,
    persistente,
    pistas: [],
    cuentas: [],
    migraciones: [],
    variables: [
      {
        nombre: "PANEL_ALMACEN",
        puesta: Boolean(process.env.PANEL_ALMACEN),
        nota: 'tiene que valer "postgres" para que se guarde',
      },
      {
        nombre: "DATABASE_URL",
        puesta: Boolean(process.env.DATABASE_URL),
        nota: "la del pooler de transacciones, puerto 6543",
      },
      {
        nombre: "PANEL_SECRETO",
        puesta: Boolean(process.env.PANEL_SECRETO),
        nota: "opcional: sin ella se deriva de la clave",
      },
      {
        nombre: "PANEL_CLAVE",
        puesta: Boolean(process.env.PANEL_CLAVE),
        nota: "opcional: sin ella vale la clave por defecto",
      },
    ],
  };

  /*
    La revision de la cadena va ANTES de intentar conectar. No necesita red, es
    instantanea, y es justo la que dice que esta mal cuando la conexion cuelga:
    si se hiciera despues, una base que no responde se llevaria por delante las
    unicas pistas utiles.
  */
  const arranque = Date.now();
  const queda = () => PRESUPUESTO_MS - (Date.now() - arranque);

  if (persistente) {
    base.pistas.push(...revisarCadena(process.env.DATABASE_URL));
    base.cadena = cadenaALaVista(process.env.DATABASE_URL);
  }

  /*
    Antes de preguntarle nada a Postgres: ¿se puede llegar?

    Esta pantalla vivio un caso en el que la cadena era correcta —usuario con la
    referencia, puerto 6543, contrasena puesta, las tres marcadas en verde— y aun
    asi no contestaba nadie. Con solo el error de la base no habia forma de saber
    si el fallo era la direccion, el puerto o la base misma. Dos sondas que no
    necesitan credenciales lo separan en medio segundo.
  */
  const anfitrion = base.cadena?.anfitrion;
  const puerto = base.cadena?.puerto;
  if (persistente && anfitrion && puerto) {
    const dns = await resolverNombre(anfitrion, Math.min(ESPERA_DNS_MS, queda()));
    const sonda: SondaRed = { anfitrion, puerto, dns };
    /* Tocar el puerto de un nombre que no resuelve no anade informacion. */
    if (dns.estado === "resuelve") {
      sonda.tcp = await tocarPuerto(
        anfitrion,
        puerto,
        Math.min(ESPERA_TCP_MS, queda()),
      );
    }
    base.red = sonda;
    base.redEnUnaFrase = describirSonda(sonda);
    base.pistas.push(...pistasDeRed(sonda));
  }

  /*
    Preguntarle a la base por si misma ANTES de tocar las tablas del panel.

    El caso que llevo a esto: red en verde, puerto aceptando en 77 ms, usuario y
    contrasena correctos —la sesion se autentica, se sabe porque el
    `connect_timeout` de 3 s no salta— y aun asi la consulta agota el tiempo.
    Con las tablas de por medio no hay forma de saber si la base esta muda o si
    es una consulta nuestra la que espera un candado. `select 1` y
    `pg_stat_activity` no piden candados, asi que contestan igual.
  */
  if (persistente && base.red?.tcp?.estado === "acepta") {
    try {
      base.salud = await conTope(medirSalud(conexion()), Math.min(2000, queda()));
    } catch (error) {
      base.saludError = error instanceof Error ? error.message : String(error);
    }
  }

  /*
    SI NO HAY PULSO, NO SE SIGUE PREGUNTANDO.

    Cuando `medirSalud` falla, abajo se caia al camino de los seis listados —que
    con Postgres son seis viajes en fila india, porque `max: 1`— y se gastaba el
    resto del presupuesto para acabar diciendo lo mismo, pero mas tarde y peor.
    Eso es lo que le salia a Adrian: "no contesto en 2 segundos" arriba y "no
    contesto en 4.983 segundos" abajo, dos veces el mismo hecho.

    Si `select 1` no vuelve, nada va a volver. Se contesta ya, con el dato bueno
    —el del pulso— y con la pista correcta, que NO es la del candado.
  */
  if (persistente && base.saludError) {
    base.error = base.saludError;

    /*
      AQUI ES DONDE SE DECIDE, y hasta ahora se adivinaba.

      Se llega al puerto y no hay pulso. Con eso solo, no se puede saber si el
      pooler no da sesion o si son NUESTROS ajustes los que la rompen. Dos
      conexiones nuevas —una como las del panel, otra desnuda— lo separan en un
      par de segundos. Ver `sonda-sesion.ts`.

      Solo se prueban en este caso: si hay pulso, no hay nada que separar, y
      abrir conexiones porque si es lo que no se debe hacer cuando se sospecha
      que no quedan libres.
    */
    const cadena = process.env.DATABASE_URL;
    if (cadena && base.red?.tcp?.estado === "acepta") {
      const topePorIntento = Math.min(2500, Math.max(queda() / 2, 1500));
      base.sesiones = [
        await probarSesion(cadena, true, topePorIntento),
        await probarSesion(cadena, false, topePorIntento),
      ];

      const conAjustes = base.sesiones[0];
      const desnuda = base.sesiones[1];

      if (conAjustes.error && !desnuda.error) {
        /* El veredicto que NO se podia dar antes, y que cambia de tejado. */
        base.pistas.push({
          nivel: "error",
          titulo: "La base esta bien: son los ajustes con los que abrimos la sesion",
          queHacer:
            "Una conexion desnuda contesta y la del panel no. La diferencia son " +
            "`lock_timeout` y `statement_timeout`, que el panel manda en el saludo " +
            "inicial desde la vuelta 16, y que un pooler en modo transaccion puede " +
            "no admitir. Esto NO se arregla en Supabase: hay que quitarlos del " +
            "saludo en `conexion.ts` y ponerlos por consulta o por transaccion.",
        });
      } else if (conAjustes.error && desnuda.error) {
        base.pistas.push({
          nivel: "error",
          titulo: "No hay sesion posible, ni con ajustes ni sin ellos",
          queHacer:
            "Las dos conexiones fallan igual, asi que no son nuestros ajustes ni " +
            "nuestro codigo: el pooler acepta el puerto pero no esta dando ninguna " +
            "sesion. Mira el proyecto en Supabase — si esta Paused o Restarting, " +
            "reanudalo y espera a que quede Active; si ya dice Active, mira el uso " +
            "de conexiones del pooler.",
        });
      } else if (!conAjustes.error) {
        base.pistas.push({
          nivel: "aviso",
          titulo: "Una conexion nueva SI contesta: la que estaba atascada era la de siempre",
          queHacer:
            "Abrir una sesion nueva funciona, asi que la base esta bien. Lo que " +
            "estaba bloqueado era la conexion reutilizada de esta instancia, con " +
            "una consulta abandonada ocupandola. Recarga: si se arregla solo, es " +
            "eso, y lo que hay que arreglar es que un tope cierre la conexion.",
        });
      }
    }

    const traducido = traducirError(base.saludError, {
      seLlega: base.red?.tcp?.estado === "acepta",
      pulso: false,
    });
    if (traducido) base.pistas.push(traducido);
    return base;
  }

  if (base.salud && base.salud.atascadas.length > 0) {
    base.pistas.push({
      nivel: "error",
      titulo: `Hay ${base.salud.atascadas.length} sesion(es) atascadas reteniendo candados`,
      queHacer:
        "Son migraciones que se quedaron a medias cuando a Vercel se le acabo el " +
        "tiempo. Siguen abiertas y con los candados puestos, asi que cualquier " +
        'consulta nueva espera a un cliente que ya no existe. Pulsa "Soltar las ' +
        'sesiones atascadas" aqui abajo y recarga.',
    });
  }

  /*
    Con Postgres, los conteos ya vienen de `medirSalud` en UNA consulta. Pedir
    aqui los seis listados costaba seis viajes mas —`max: 1` pone en fila india
    lo que parece paralelo— y encima traia las filas enteras para mirar
    `.length`. Contar es trabajo de la base.
  */
  /*
    RECORRER EL CAMINO DE LAS PANTALLAS ROTAS, no uno parecido.

    Todo lo de arriba pregunta por `conexion()` directamente. Las pantallas del
    panel no: pasan por `servicios().almacen`, que antes de cada consulta espera
    al arranque —migraciones y semilla— y lleva su propio techo de tiempo. Es
    exactamente el trozo que esta pantalla no probaba, y por eso podia salir
    entera en verde mientras las demas no cargaban ninguna.

    Se hace con las mismas dos llamadas que hace la pantalla de pedidos.
  */
  if (persistente) {
    try {
      await conTope(
        Promise.all([almacen.listarPedidos(), almacen.listarColores()]),
        Math.max(Math.min(9000, queda() + 3000), 2000),
      );
    } catch (error) {
      /*
        Crudo y entero. Esta pantalla solo la ve el dueno, y este mensaje es el
        unico que dice donde tocar. Lo unico que nunca sale es la cadena de
        conexion, que va en la traza y no en el mensaje.
      */
      base.caminoDelPanelError = error instanceof Error ? error.message : String(error);
      base.pistas.push({
        nivel: "error",
        titulo: "Esta pantalla funciona, pero las del panel no",
        queHacer:
          "La base responde a las consultas directas y falla cuando se pasa por " +
          "el almacen. O sea que no es la base: es el arranque —migraciones y " +
          "semilla— o el techo de tiempo de las consultas. El mensaje exacto sale " +
          "abajo, en \"el camino que recorren las pantallas del panel\".",
      });
    }
  }

  /* Lo sepa o no el camino de arriba, si el arranque tropezo hay que decirlo. */
  if (persistente) base.arranqueError = falloDelArranque();

  if (base.salud?.tablasCreadas) {
    /*
      Contar VA APARTE de medir la salud, aunque compartan viaje.

      Se intento juntarlo por ahorrar una consulta y salio caro: contar toca las
      tablas del panel, o sea que puede esperar un candado, y al estar dentro de
      `medirSalud` se llevaba por delante el pulso, la lista de sesiones y el
      boton de soltarlas. La pantalla se quedo muda otra vez.

      Ahora esto puede fallar tranquilamente: se anota y el resto del
      diagnostico —que es el que dice que hacer— sigue en pie.
    */
    base.respondeEnMs = base.salud.pulsoMs;
    try {
      const conteos = await conTope(contarFilas(conexion()), Math.min(2500, queda()));
      base.cuentas = Object.entries(conteos).map(([que, cuantos]) => ({ que, cuantos }));
    } catch (error) {
      base.cuentasError = error instanceof Error ? error.message : String(error);
      /* Aqui el pulso SI contesto: se llego por `base.salud`. Un candado es
         una explicacion legitima, y los conteos si tocan tablas del panel. */
      const traducido = traducirError(base.cuentasError, { seLlega: true, pulso: true });
      if (traducido) base.pistas.push(traducido);
    }
    return base;
  }

  const desde = Date.now();
  try {
    /*
      El camino del almacen en memoria, donde no hay SQL que valga y los seis
      listados no cuestan nada porque no salen del proceso.
    */
    const [usuarios, colores, lotes, pedidos, tiendas, mayoristas] = await conTope(
      Promise.all([
        almacen.listarUsuarios(),
        almacen.listarColores(),
        almacen.listarLotes(),
        almacen.listarPedidos(),
        almacen.listarTiendas(),
        almacen.listarPedidosMayoristas(),
      ]),
      Math.max(queda(), 500),
    );
    base.respondeEnMs = Date.now() - desde;
    base.cuentas = [
      { que: "Personas con acceso", cuantos: usuarios.length },
      { que: "Colores", cuantos: colores.length },
      { que: "Lotes de importacion", cuantos: lotes.length },
      { que: "Pedidos de la web", cuantos: pedidos.length },
      { que: "Tiendas", cuantos: tiendas.length },
      { que: "Pedidos de tiendas", cuantos: mayoristas.length },
    ];
  } catch (error) {
    /*
      El mensaje del error se ensena tal cual porque es lo unico que permite
      arreglarlo —"no existe la tabla", "contrasena incorrecta", "no se puede
      conectar"— y esta pantalla solo la ve el dueno. Lo que no sale nunca es la
      cadena de conexion, que iria en la traza y no en el mensaje.
    */
    base.error = error instanceof Error ? error.message : String(error);
    const traducido = traducirError(base.error, {
      seLlega: base.red?.tcp?.estado === "acepta",
      /* `base.salud` puesto = el `select 1` contesto. Sin sonda, sin dato. */
      pulso: base.salud ? true : base.saludError ? false : undefined,
    });
    if (traducido) base.pistas.push(traducido);
  }

  return base;
}
