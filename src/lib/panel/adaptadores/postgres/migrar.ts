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
    PRIMERO SE PREGUNTA, Y SOLO SE CREA SI HACE FALTA.

    Antes esto empezaba siempre por un `begin; ... create table if not exists
    ...; commit;` **por el protocolo simple**, aunque la tabla llevara dias
    creada. Era la primera cosa que el panel le decia a la base en cada
    instancia nueva, y la unica de todo el panel que usa ese protocolo.

    Y ahi estaba el atasco. Medido en produccion: las consultas directas
    contestaban en **29 ms** y el camino del almacen agotaba los **7 segundos**
    del techo. La diferencia entre los dos caminos era este arranque.

    Un `begin ... commit` multisentencia por protocolo simple contra el pooler
    de transacciones de Supabase es justo lo que no conviene mandarle: el pooler
    tiene que seguir el estado de la transaccion de algo que le llega como un
    solo bloque, y ahi es donde la respuesta puede no volver nunca.

    Preguntar es barato y va por el protocolo normal, el mismo que contesta en
    29 ms. Si la tabla esta —que es el caso siempre, menos la primerisima vez—
    no se manda nada por el protocolo simple. El camino de todos los dias deja
    de tocar la parte fragil.
  */
  let aplicadas: { nombre: string }[];
  try {
    aplicadas = await cx.consultar<{ nombre: string }>(
      "select nombre from migraciones_aplicadas",
    );
  } catch {
    /*
      Que falle aqui quiere decir, casi siempre, que la tabla todavia no
      existe: base nueva, primer arranque. Se crea y se vuelve a preguntar.
      Si el fallo era otro, la segunda consulta lo lanza igual y se ve.
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
    aplicadas = await cx.consultar<{ nombre: string }>(
      "select nombre from migraciones_aplicadas",
    );
  }

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
