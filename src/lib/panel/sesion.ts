/*
  Entrar al panel.

  Correo mas una clave compartida, y una sesion que dura tres meses para que en
  la practica no haya que volver a entrar casi nunca. El porque de la clave, y
  lo que hay que cambiar antes de que haya datos de verdad, esta en `clave.ts`.
*/

import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { claveCorrecta } from "./clave";
import type { Rol, Sesion, Usuario } from "./dominio/tipos";
import { servicios } from "./servicios";

const COOKIE = "nerowa_panel";
/** La sesion dura tres meses. */
const DIAS_SESION = 90;

function enMilisegundos(dias: number) {
  return dias * 24 * 3_600_000;
}

/* --------------------------------------------------------------------------
   Entrar
   -------------------------------------------------------------------------- */

/**
 * Comprueba correo y clave, y si cuadran deja la sesion puesta.
 *
 * Devuelve `undefined` cuando falla, sin decir cual de los dos estaba mal: si
 * dijera "ese correo no existe", cualquiera podria averiguar quien tiene acceso
 * probando direcciones.
 */
export async function entrar(
  correo: string,
  clave: string,
): Promise<Usuario | undefined> {
  const { almacen } = servicios();
  const usuario = await almacen.usuarioPorCorreo(correo);

  /*
    La clave se comprueba SIEMPRE, exista el usuario o no. Si se saliera antes
    cuando el correo no existe, la respuesta llegaria mucho mas rapido en ese
    caso y el tiempo delataria que direcciones tienen cuenta.
  */
  const valida = claveCorrecta(clave);
  if (!usuario || !valida) return undefined;

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
