"use server";

import { crearEnlaceEntrada } from "@/lib/panel/sesion";
import { entradaSinCorreo, servicios } from "@/lib/panel/servicios";

export interface ResultadoEntrada {
  ok: boolean;
  mensaje: string;
  /** Solo en modo demostracion: la ruta se enseña en vez de mandarse. */
  ruta?: string;
}

export async function pedirEnlace(
  _anterior: ResultadoEntrada | undefined,
  datos: FormData,
): Promise<ResultadoEntrada> {
  const correo = String(datos.get("correo") ?? "").trim();
  if (!correo.includes("@")) {
    return { ok: false, mensaje: "Eso no parece un correo." };
  }

  const enlace = await crearEnlaceEntrada(correo);

  /*
    La respuesta es LA MISMA exista o no el correo. Si dijera "ese correo no
    tiene cuenta", cualquiera podria averiguar quien trabaja aqui probando
    direcciones. Cuesta nada y cierra la puerta.
  */
  const respuesta: ResultadoEntrada = {
    ok: true,
    mensaje: "Si ese correo tiene acceso, le acaba de llegar un enlace. Dura 15 minutos.",
  };

  if (!enlace) return respuesta;

  if (entradaSinCorreo()) {
    /* Solo con PANEL_MODO_DEMO=1: sin proveedor de correo no habria forma de
       abrir el panel para revisarlo. Nunca se enciende en produccion. */
    return { ...respuesta, ruta: enlace.ruta };
  }

  await servicios().correo.enviar({
    para: correo,
    asunto: "Tu enlace para entrar al panel de Nerowa",
    texto:
      `Toca este enlace para entrar al panel:\n\n` +
      `${process.env.PANEL_URL_BASE ?? "https://nerowacases.com"}${enlace.ruta}\n\n` +
      `Dura 15 minutos y sirve una sola vez.\n` +
      `Si no lo pediste tu, ignora este mensaje.`,
  });

  return respuesta;
}
