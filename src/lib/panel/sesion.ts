/*
  Entrar al panel sin contrasena.

  Por que no hay contrasenas, y queda decidido: Alfredo no va a recordar una.
  Va a terminar anotada en algun sitio, que es peor que no tenerla. En su lugar,
  un enlace de un solo uso al correo y una sesion que dura meses, para que en la
  practica no tenga que volver a entrar casi nunca.

  Ver `docs/panel-nerowa.md` §10 y la decision del 2026-09-15 en `progreso.md`.
*/

import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { Rol, Sesion, Usuario } from "./dominio/tipos";
import { servicios } from "./servicios";

const COOKIE = "nerowa_panel";
/** La sesion dura tres meses. Se renueva sola cada vez que se usa. */
const DIAS_SESION = 90;
/** El enlace de entrada, quince minutos. Lo justo para ir al correo y volver. */
const MINUTOS_ENLACE = 15;

function hash(testigo: string): string {
  return createHash("sha256").update(testigo).digest("hex");
}

function enMilisegundos(dias: number) {
  return dias * 24 * 3_600_000;
}

/* --------------------------------------------------------------------------
   Pedir el enlace
   -------------------------------------------------------------------------- */

export interface EnlacePedido {
  /** La ruta completa a la que hay que ir. Solo se enseña en modo demostracion. */
  ruta: string;
}

/**
 * Crea un enlace de entrada para un correo.
 *
 * Devuelve la ruta SIEMPRE, y quien llama decide si la manda por correo o la
 * enseña. Nunca dice si el correo existe o no: eso lo decide el llamante, y la
 * pantalla contesta lo mismo en los dos casos para no filtrar quien tiene
 * cuenta.
 */
export async function crearEnlaceEntrada(correo: string): Promise<EnlacePedido | undefined> {
  const { almacen } = servicios();
  const usuario = await almacen.usuarioPorCorreo(correo);
  if (!usuario) return undefined;

  const testigo = randomBytes(32).toString("base64url");
  await almacen.crearEnlaceEntrada({
    id: crypto.randomUUID(),
    correo: usuario.correo,
    testigoHash: hash(testigo),
    expiraEn: new Date(Date.now() + MINUTOS_ENLACE * 60_000).toISOString(),
  });

  return { ruta: `/panel/entrar/${testigo}` };
}

/* --------------------------------------------------------------------------
   Canjear el enlace por una sesion
   -------------------------------------------------------------------------- */

export async function canjearEnlace(testigo: string): Promise<Usuario | undefined> {
  const { almacen } = servicios();
  /*
    El almacen comprueba caducidad y uso previo, y lo marca usado en el mismo
    paso. Aqui no se re-comprueba: una sola fuente de verdad para el canje.
  */
  const enlace = await almacen.consumirEnlaceEntrada(hash(testigo));
  if (!enlace) return undefined;

  const usuario = await almacen.usuarioPorCorreo(enlace.correo);
  if (!usuario) return undefined;

  const sesion: Sesion = {
    id: randomBytes(32).toString("base64url"),
    usuarioId: usuario.id,
    creadaEn: new Date().toISOString(),
    expiraEn: new Date(Date.now() + enMilisegundos(DIAS_SESION)).toISOString(),
  };
  await almacen.crearSesion(sesion);

  const tarro = await cookies();
  tarro.set(COOKIE, sesion.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/panel",
    maxAge: DIAS_SESION * 24 * 3600,
  });

  return usuario;
}

/* --------------------------------------------------------------------------
   Leer y cerrar
   -------------------------------------------------------------------------- */

/** El usuario de la peticion, o `undefined` si no hay sesion valida. */
export async function usuarioActual(): Promise<Usuario | undefined> {
  const tarro = await cookies();
  const id = tarro.get(COOKIE)?.value;
  if (!id) return undefined;

  const { almacen } = servicios();
  const sesion = await almacen.sesionPorId(id);
  if (!sesion) return undefined;

  return almacen.usuarioPorId(sesion.usuarioId);
}

/**
 * El usuario, o se acabo.
 *
 * Toda accion de servidor llama a esto ANTES de hacer nada. Las acciones de
 * servidor se pueden invocar con un POST directo, no solo desde la interfaz,
 * asi que comprobar el permiso en la pantalla no sirve de nada.
 */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sesion no valida");
  return usuario;
}

export async function exigirRol(rol: Rol): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (usuario.rol !== rol) {
    throw new Error(`Esta accion es solo para el rol "${rol}"`);
  }
  return usuario;
}

export async function cerrarSesion(): Promise<void> {
  const tarro = await cookies();
  const id = tarro.get(COOKIE)?.value;
  if (id) await servicios().almacen.borrarSesion(id);
  tarro.delete(COOKIE);
}

/** Comparacion de cadenas en tiempo constante, para lo que compare secretos. */
export function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
