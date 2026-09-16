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

import { revisarCadena, traducirError, type Pista } from "./diagnostico-conexion";
import { servicios } from "./servicios";

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
  cuentas: Cuenta[];
  migraciones: string[];
  /** Variables que hacen falta y si estan puestas. Nunca su valor. */
  variables: { nombre: string; puesta: boolean; nota?: string }[];
}

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

  const desde = Date.now();
  try {
    /*
      Se cuentan cosas de verdad en vez de hacer un `select 1`: asi la pantalla
      no solo dice que la base responde, sino que las tablas existen y tienen lo
      que deberian. Una base viva con las tablas vacias es un fallo distinto y
      hay que poder distinguirlo.
    */
    const [usuarios, colores, lotes, pedidos, tiendas, mayoristas] = await Promise.all([
      almacen.listarUsuarios(),
      almacen.listarColores(),
      almacen.listarLotes(),
      almacen.listarPedidos(),
      almacen.listarTiendas(),
      almacen.listarPedidosMayoristas(),
    ]);
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
    const traducido = traducirError(base.error);
    if (traducido) base.pistas.push(traducido);
  }

  /*
    La revision de la cadena va DESPUES de intentar conectar, pero se hace
    siempre: aunque la conexion funcione, puede haber algo que convenga
    arreglar —como estar usando la conexion directa en vez del pooler—.
  */
  if (persistente) {
    base.pistas.push(...revisarCadena(process.env.DATABASE_URL));
  }

  return base;
}
