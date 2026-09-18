/*
  Crear las tablas.

  Las migraciones son archivos `.sql` numerados y se aplican en orden, una sola
  vez cada una. No hay herramienta de migraciones ni ORM: para ocho tablas, un
  archivo de SQL que cualquiera puede leer vale mas que una capa que hay que
  aprender.

  `migraciones_aplicadas` lleva la cuenta. Cada archivo corre dentro de una
  transaccion: o entra entero o no entra.
*/

import type { Conexion } from "./conexion";

export interface Migracion {
  nombre: string;
  sql: string;
}

export async function migrar(cx: Conexion, migraciones: readonly Migracion[]) {
  /*
    La tabla de control es la PRIMERA consulta que hace el panel contra la base,
    y tambien pide un candado exclusivo. Va en su propia transaccion con el
    mismo limite: si esta es la que esta atascada, hay que enterarse aqui y no
    veinte segundos despues en una pantalla de Vercel.
  */
  await cx.ejecutar(`
    begin;
    set local lock_timeout = '3s';
    create table if not exists migraciones_aplicadas (
      nombre      text primary key,
      aplicada_en timestamptz not null default now()
    );
    commit;
  `);

  const aplicadas = await cx.consultar<{ nombre: string }>(
    "select nombre from migraciones_aplicadas",
  );
  const yaEstan = new Set(aplicadas.map((f) => f.nombre));

  const nuevas: string[] = [];
  for (const m of migraciones) {
    if (yaEstan.has(m.nombre)) continue;

    /*
      Todo en un solo script, transaccion incluida: o entra la migracion entera
      y queda anotada, o no entra nada. Si fueran llamadas sueltas, con el
      pooler de transacciones cada una podria caer en una conexion distinta y
      el `begin` no cubriria al resto.

      El nombre se interpola porque este script no admite parametros, y es
      seguro: sale del nombre de un archivo del repositorio, no de nadie de
      fuera. Aun asi se escapan las comillas.
    */
    const nombre = m.nombre.replace(/'/g, "''");
    const script = [
      "begin;",
      /*
        UN CANDADO NO SE ESPERA PARA SIEMPRE.

        Si una migracion anterior murio a medias —a Vercel se le acabo el
        tiempo y corto la funcion—, su sesion se queda `idle in transaction`
        con los candados puestos, y Postgres espera al cliente muerto
        indefinidamente. Sin esto, el `create table` de abajo se cuelga hasta
        que alguien mire por que, y cada intento nuevo anade otra sesion
        abandonada al monton. Paso.

        Con el limite puesto, el fallo llega en tres segundos y DICE que es un
        candado, que es la diferencia entre una averia con nombre y una
        pantalla que se queda pensando.

        `set local` y no `set` a secas: dura lo que dure esta transaccion. En el
        pooler de transacciones es lo unico que se puede garantizar, porque la
        siguiente consulta puede caer en otra conexion.
      */
      "set local lock_timeout = '3s';",
      "set local statement_timeout = '15s';",
      m.sql,
      `insert into migraciones_aplicadas (nombre) values ('${nombre}');`,
      "commit;",
    ].join("\n");

    try {
      await cx.ejecutar(script);
      nuevas.push(m.nombre);
    } catch (error) {
      await cx.ejecutar("rollback;").catch(() => {});
      throw new Error(`La migracion ${m.nombre} fallo: ${String(error)}`);
    }
  }
  return nuevas;
}
