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
  await cx.consultar(`
    create table if not exists migraciones_aplicadas (
      nombre      text primary key,
      aplicada_en timestamptz not null default now()
    )
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
