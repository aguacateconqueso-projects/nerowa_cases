import "server-only";

/*
  Entrar al panel, con la sesion firmada dentro de la propia cookie.

  POR QUE NO SE GUARDA LA SESION EN EL ALMACEN, QUE ES COMO ESTABA

  Estaba en un `Map` en la memoria del proceso. En local funciona, porque hay un
  solo proceso. En Vercel no: cada peticion puede caer en una instancia
  distinta, y las instancias se reciclan solas. Entonces entras en la instancia
  A, el siguiente toque va a la B, la B no conoce esa sesion y te manda otra vez
  a la pantalla de entrada.

  Eso es exactamente lo que le pasaba a Adrian: **cada click le pedia la clave
  de nuevo**, y el panel no se podia ni probar.

  La sesion no puede depender de que dos peticiones caigan en el mismo sitio.
  Asi que va **dentro de la cookie, firmada**: quien es y hasta cuando, mas una
  firma que solo puede calcular el servidor. Cualquier instancia la verifica sin
  consultar nada. Es lo que hay que hacer en un entorno sin servidor fijo, y
  ademas deja de necesitar almacen.

  Lo que NO se puede falsificar: el contenido va en claro pero firmado con
  HMAC-SHA256. Cambiar el usuario o la fecha invalida la firma, y la firma no se
  puede recalcular sin el secreto.
*/

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { claveCorrecta } from "./clave";
import type { Rol, Usuario } from "./dominio/tipos";
import { servicios } from "./servicios";

const COOKIE = "nerowa_panel";
/** La sesion dura tres meses, para no tener que volver a entrar casi nunca. */
const DIAS_SESION = 90;

/*
  El secreto con el que se firma.

  Tiene que ser EL MISMO en todas las instancias, o cada una firmaria distinto y
  volveriamos al problema de arriba. Por eso no se genera al azar al arrancar:
  o viene de una variable de entorno, o se deriva de algo fijo.
*/
function secreto(): Buffer {
  const desdeEntorno = process.env.PANEL_SECRETO;
  if (desdeEntorno) return Buffer.from(desdeEntorno, "utf8");

  /*
    Sin variable puesta, se deriva de la clave del panel. Es determinista, asi
    que todas las instancias llegan al mismo valor — y si alguien cambia la
    clave, las sesiones abiertas dejan de valer, que es justo lo que se espera.
  */
  return scryptSync(
    process.env.PANEL_CLAVE ?? "clave-por-defecto-del-panel",
    "nerowa-sesion",
    32,
  );
}

function firmar(cuerpo: string): string {
  return createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
}

function firmaValida(cuerpo: string, firma: string): boolean {
  const esperada = Buffer.from(firmar(cuerpo));
  const recibida = Buffer.from(firma);
  /* En tiempo constante: comparar con `===` delata cuantos caracteres acerto
     quien prueba, por lo que tarda en cortarse. */
  if (esperada.length !== recibida.length) return false;
  return timingSafeEqual(esperada, recibida);
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
  const usuario = await servicios().almacen.usuarioPorCorreo(correo);

  /*
    La clave se comprueba SIEMPRE, exista el usuario o no. Si se saliera antes
    cuando el correo no existe, la respuesta llegaria mucho mas rapido en ese
    caso y el tiempo delataria que direcciones tienen cuenta.
  */
  const valida = claveCorrecta(clave);
  if (!usuario || !valida) return undefined;

  const expira = Date.now() + DIAS_SESION * 24 * 3_600_000;
  /* El `nonce` hace que dos sesiones del mismo usuario no salgan identicas. */
  const cuerpo = `${usuario.id}.${expira}.${randomBytes(9).toString("base64url")}`;

  const tarro = await cookies();
  tarro.set(COOKIE, `${cuerpo}.${firmar(cuerpo)}`, {
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
  const cookie = tarro.get(COOKIE)?.value;
  if (!cookie) return undefined;

  /* usuarioId . expira . nonce . firma — la firma es lo ultimo. */
  const corte = cookie.lastIndexOf(".");
  if (corte < 1) return undefined;

  const cuerpo = cookie.slice(0, corte);
  const firma = cookie.slice(corte + 1);
  if (!firmaValida(cuerpo, firma)) return undefined;

  const [usuarioId, expiraTexto] = cuerpo.split(".");
  if (!usuarioId || !expiraTexto) return undefined;

  const expira = Number(expiraTexto);
  if (!Number.isFinite(expira) || expira < Date.now()) return undefined;

  return servicios().almacen.usuarioPorId(usuarioId);
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
  tarro.delete(COOKIE);
}
