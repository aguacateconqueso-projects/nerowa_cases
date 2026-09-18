"use server";

/*
  Soltar las sesiones que quedaron a medio hacer.

  Existe porque el panel se atasco a si mismo: cuando a Vercel se le acaba el
  tiempo a mitad de una migracion, la sesion de Postgres queda abierta con los
  candados puestos, y la unica forma de quitarla de en medio era entrar al panel
  de Supabase y escribir SQL. Eso no se le puede pedir a nadie, y menos a las
  ocho de la tarde con la tienda esperando.
*/

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { conexion } from "@/lib/panel/adaptadores/postgres/conexion";
import { soltarAtascadas } from "@/lib/panel/adaptadores/postgres/salud";
import { exigirRol } from "@/lib/panel/sesion";

export async function soltarSesiones() {
  await exigirRol("dueno");

  let cuantas: number;
  try {
    cuantas = await soltarAtascadas(conexion());
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    redirect(`/panel/estado?fallo=${encodeURIComponent(motivo.slice(0, 160))}`);
  }

  revalidatePath("/panel/estado");
  redirect(`/panel/estado?soltadas=${cuantas}`);
}
