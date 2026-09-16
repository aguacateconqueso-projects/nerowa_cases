"use server";

import { redirect } from "next/navigation";

import { entrar } from "@/lib/panel/sesion";

export interface ResultadoEntrada {
  mensaje: string;
}

export async function entrarAlPanel(
  _anterior: ResultadoEntrada | undefined,
  datos: FormData,
): Promise<ResultadoEntrada> {
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) {
    return { mensaje: "Faltan el correo o la clave." };
  }

  const usuario = await entrar(correo, clave);

  /*
    Un solo mensaje para los dos fallos, a proposito. "Ese correo no existe"
    dejaria averiguar quien tiene acceso probando direcciones.
  */
  if (!usuario) {
    return { mensaje: "El correo o la clave no son correctos." };
  }

  redirect("/panel");
}
