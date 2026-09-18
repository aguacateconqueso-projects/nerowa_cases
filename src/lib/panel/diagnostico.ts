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
import { medirSalud, type Salud } from "./adaptadores/postgres/salud";
import { servicios } from "./servicios";
import {
  describirSonda,
  pistasDeRed,
  resolverNombre,
  tocarPuerto,
  type SondaRed,
} from "./sonda-red";
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
const PRESUPUESTO_MS = 8000;

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
      base.salud = await conTope(medirSalud(conexion()), Math.min(3000, queda()));
    } catch (error) {
      base.saludError = error instanceof Error ? error.message : String(error);
    }
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

  const desde = Date.now();
  try {
    /*
      Se cuentan cosas de verdad en vez de hacer un `select 1`: asi la pantalla
      no solo dice que la base responde, sino que las tablas existen y tienen lo
      que deberian. Una base viva con las tablas vacias es un fallo distinto y
      hay que poder distinguirlo.
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
    const traducido = traducirError(base.error, base.red?.tcp?.estado === "acepta");
    if (traducido) base.pistas.push(traducido);
  }

  return base;
}
