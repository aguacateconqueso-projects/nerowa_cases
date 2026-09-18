import "server-only";

/*
  La conexion a Postgres.

  POR QUE HAY UNA INTERFAZ Y NO SE LLAMA AL CLIENTE DIRECTAMENTE

  Para poder probar el SQL de verdad sin credenciales ni red. Las pruebas
  levantan un Postgres embebido (PGlite, Postgres compilado a WebAssembly) que
  habla el mismo dialecto pero no el mismo protocolo, asi que el adaptador pide
  "algo que ejecute SQL" en vez de un cliente concreto.

  No es una capa de abstraccion sobre la base de datos: el SQL sigue siendo SQL
  de Postgres escrito a mano. Es solo por donde entra.
*/

export interface Conexion {
  /** Una sentencia con parametros. Es lo que usa el panel todo el rato. */
  consultar<T = Record<string, unknown>>(
    sql: string,
    parametros?: readonly unknown[],
  ): Promise<T[]>;

  /**
   * Un script con VARIAS sentencias y sin parametros. Solo para migraciones.
   *
   * Hace falta porque una consulta preparada no admite mas de una sentencia
   * —"cannot insert multiple commands into a prepared statement"—, y un archivo
   * de migracion son quince `create table` seguidos. Va por el protocolo
   * simple, que si las acepta.
   *
   * Que no admita parametros no es una limitacion a salvar: es la garantia de
   * que por aqui no entra nada que venga de fuera.
   */
  ejecutar(sql: string): Promise<void>;
}

/*
  El cliente real, contra Supabase o cualquier otro Postgres.

  Se crea PEREZOSAMENTE, en la primera consulta, y no al pedir la conexion. Dos
  razones, las dos aprendidas a golpes:

  1. **Crearlo puede lanzar.** Si la contrasena trae una barra o un caracter sin
     codificar, el cliente no consigue leer la direccion y revienta. Si eso
     pasara al construir los servicios, se caeria hasta la pantalla de entrada —
     y con ella la de estado, que es la que tendria que explicar el problema.
  2. **El error del cliente trae la cadena entera dentro, contrasena incluida.**
     En Vercel eso acaba escrito en el registro. Aqui se cambia por un mensaje
     que dice que pasa sin repetir ni un caracter de la cadena.
*/
let sql: import("postgres").Sql | undefined;
let cliente: Conexion | undefined;

/** Crea el cliente la primera vez. Nunca deja escapar la cadena en el error. */
function clientePostgres() {
  if (sql) return sql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Es la cadena de conexion del pooler de transacciones " +
        "(puerto 6543), no la directa.",
    );
  }

  /*
    `postgres` se carga aqui dentro y no arriba del archivo para que el paquete
    no entre en el build cuando el panel corre con el almacen de memoria.
  */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require("postgres") as typeof import("postgres");

  try {
    sql = postgres(url, {
      /*
        En un entorno sin servidor fijo cada instancia vive poco y puede haber
        muchas a la vez. Un grupo grande por instancia agota el limite de la
        base de datos en cuanto hay trafico; uno solo por instancia es lo
        correcto.
      */
      max: 1,
      idle_timeout: 20,
      /*
        Menos que el tope de la funcion de Vercel. Si la conexion se queda
        esperando mas que eso, lo que ve la persona es la pagina de error de
        Vercel —un 504 sin explicacion— en vez de la pantalla del panel
        diciendo que pasa. Mejor rendirse pronto y poder contarlo.
      */
      connect_timeout: 5,
      /*
        El pooler de transacciones NO admite sentencias preparadas: cada consulta
        puede caer en una conexion distinta del pooler, y la preparacion se
        perderia. Sin esto, falla en cuanto se repite una consulta.
      */
      prepare: false,
    });
  } catch (error) {
    /*
      Se relanza SIN la cadena. El error original la lleva entera en su campo
      `input`, contrasena incluida, y de ahi iria directa al registro de Vercel.
    */
    const motivo = error instanceof Error ? error.message : String(error);
    const invalida = /invalid url/i.test(motivo);
    throw new Error(
      invalida
        ? "DATABASE_URL no tiene forma de direccion valida. Suele ser la contrasena: " +
          "si lleva @, /, #, ? o corchetes, rompe la direccion. Lo mas facil es " +
          "cambiarla en Supabase por una de letras y numeros."
        : "No se pudo preparar la conexion a la base de datos.",
    );
  }

  return sql;
}

export function conexion(): Conexion {
  if (cliente) return cliente;

  cliente = {
    async consultar<T>(texto: string, parametros: readonly unknown[] = []) {
      const s = clientePostgres();
      return s.unsafe(texto, parametros as never[]) as unknown as Promise<T[]>;
    },
    async ejecutar(texto: string) {
      /* `.simple()` cambia al protocolo simple, el unico que acepta varias
         sentencias en un mismo envio. */
      await clientePostgres().unsafe(texto).simple();
    },
  };
  return cliente;
}
