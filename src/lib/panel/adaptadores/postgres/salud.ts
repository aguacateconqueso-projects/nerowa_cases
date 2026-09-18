/*
  Preguntarle a la base por su propio estado, con consultas que NO se pueden
  quedar bloqueadas.

  POR QUE EXISTE

  La pantalla de estado llego a un punto en el que todo lo comprobable estaba en
  verde —el nombre resuelve, el puerto acepta en 77 ms, el usuario y el puerto
  son los del pooler— y la consulta seguia colgada hasta agotar el tiempo. Con
  eso no se puede distinguir "la base no responde" de "la base responde pero mi
  consulta espera un candado".

  Son dos averias completamente distintas y hasta ahora se veian iguales.

  LA REGLA DE ESTE ARCHIVO: aqui solo entran consultas que no tocan las tablas
  del panel. `select 1`, catalogos del sistema y `pg_stat_activity` no piden
  candados sobre `pedidos` ni `migraciones_aplicadas`, asi que responden aunque
  todo lo demas este atascado. Una sonda que se bloquea por lo mismo que esta
  midiendo no mide nada.
*/

import type { Conexion } from "./conexion";

export interface Sesion {
  estado: string;
  /** Segundos desde que esa sesion cambio de estado. */
  quietaHace: number;
  /** Lo que estaba haciendo. Se recorta: puede ser una consulta larga. */
  ultima: string;
}

export interface Salud {
  /** Cuanto tarda un `select 1`. Es el pulso: no toca ninguna tabla. */
  pulsoMs: number;
  /** Si las tablas del panel ya existen. */
  tablasCreadas: boolean;
  /** Sesiones abiertas contra esta base, sin contar la nuestra. */
  sesiones: Sesion[];
  /** Las que quedaron a medio hacer y por tanto retienen candados. */
  atascadas: Sesion[];
}

/** Consultas en curso o transacciones abiertas que nadie va a terminar. */
function estaAtascada(s: Sesion) {
  return s.estado === "idle in transaction" || s.estado === "idle in transaction (aborted)";
}

export async function medirSalud(cx: Conexion): Promise<Salud> {
  const desde = Date.now();
  await cx.consultar("select 1 as pulso");
  const pulsoMs = Date.now() - desde;

  /*
    `to_regclass` mira el catalogo y devuelve null si la tabla no existe. NO
    toca la tabla, asi que no espera a ningun candado — que es justo por lo que
    se usa esto en vez de un `select` de prueba.
  */
  const [{ existe }] = await cx.consultar<{ existe: boolean }>(
    "select to_regclass('public.migraciones_aplicadas') is not null as existe",
  );

  /*
    Quien mas esta conectado y que esta haciendo. Sin `query` completa: puede
    traer datos, y esta pantalla se mira en una captura.
  */
  const filas = await cx.consultar<{
    estado: string | null;
    quieta_hace: string | null;
    ultima: string | null;
  }>(`
    select
      state                                              as estado,
      extract(epoch from (now() - state_change))         as quieta_hace,
      left(coalesce(query, ''), 60)                      as ultima
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
      and backend_type = 'client backend'
    order by state_change asc
    limit 30
  `);

  const sesiones: Sesion[] = filas.map((f) => ({
    estado: f.estado ?? "desconocido",
    quietaHace: Math.round(Number(f.quieta_hace ?? 0)),
    ultima: (f.ultima ?? "").trim(),
  }));

  return {
    pulsoMs,
    tablasCreadas: existe,
    sesiones,
    atascadas: sesiones.filter(estaAtascada),
  };
}

/**
 * Cerrar las sesiones que quedaron a medio hacer.
 *
 * POR QUE HACE FALTA UN BOTON PARA ESTO
 *
 * Cuando Vercel corta una funcion a mitad de una migracion, la sesion se queda
 * `idle in transaction` **con los candados puestos**. Postgres no la limpia
 * sola: espera educadamente a un cliente que ya no existe. A partir de ahi
 * cualquier `create table` se queda esperando para siempre, y cada recarga de
 * la pantalla de estado anade otra sesion abandonada al monton.
 *
 * Solo toca sesiones `idle in transaction` de ESTA base: no corta consultas en
 * curso ni conexiones sanas. Una sesion en ese estado no esta haciendo nada
 * —por definicion— y lo unico que aporta es el candado que retiene.
 */
export async function soltarAtascadas(cx: Conexion): Promise<number> {
  const filas = await cx.consultar<{ pid: number }>(`
    select pg_terminate_backend(pid) as ok, pid
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
      and state in ('idle in transaction', 'idle in transaction (aborted)')
  `);
  return filas.length;
}
