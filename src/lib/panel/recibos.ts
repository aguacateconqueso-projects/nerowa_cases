import "server-only";

/*
  Guardar la foto de un recibo y avisar al cliente del seguimiento.

  Lo usan las acciones de los pedidos de la web y las de las tiendas, por eso
  esta aqui y no dentro de una de ellas.
*/

import { correoDeSeguimiento } from "./dominio/seguimiento";
import type { Color, Comprobante, Pedido, Usuario } from "./dominio/tipos";
import { CONTACT_EMAIL } from "@/lib/brand";
import { servicios } from "./servicios";

/* El telefono la manda ya comprimida (~300 KB). Esto es el techo para lo que
   llegue sin comprimir, un PDF por ejemplo. Por debajo del limite de las
   acciones de servidor (`next.config.ts`) y del de la base (5 MB). */
export const MAXIMO_RECIBO_BYTES = 4 * 1024 * 1024;

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);

/**
 * Guarda el recibo si viene uno. Devuelve el motivo si no se pudo, o
 * `undefined` si se guardo o no habia nada que guardar.
 */
export async function guardarRecibo(
  usuario: Usuario,
  entidad: "pedido" | "pedido-mayorista",
  entidadId: string,
  archivo: FormDataEntryValue | null,
): Promise<string | undefined> {
  if (!archivo || typeof archivo === "string" || archivo.size === 0) return undefined;
  if (!TIPOS.has(archivo.type)) {
    return "El recibo tiene que ser una foto (o un PDF).";
  }
  if (archivo.size > MAXIMO_RECIBO_BYTES) {
    return "La foto del recibo pesa demasiado. Prueba otra vez desde la camara del panel.";
  }

  const { almacen } = servicios();
  const ahora = new Date().toISOString();
  const comprobante: Comprobante = {
    id: crypto.randomUUID(),
    entidad,
    entidadId,
    clase: "recibo-envio",
    tipo: archivo.type,
    bytes: archivo.size,
    usuarioId: usuario.id,
    creadoEn: ahora,
  };
  await almacen.guardarComprobante(comprobante, new Uint8Array(await archivo.arrayBuffer()));
  await almacen.anotar({
    id: crypto.randomUUID(),
    entidad,
    entidadId,
    accion: "recibo",
    usuarioId: usuario.id,
    detalle: `${usuario.nombre} subio la foto del recibo del envio`,
    creadoEn: ahora,
  });
  return undefined;
}

export type ResultadoAvisoCliente = "enviado" | "sin-correo" | "sin-conexion" | "fallo";

/**
 * Le manda al cliente el correo con el seguimiento y deja constancia.
 *
 * Nunca lanza. Si no sale, queda escrito por que en el historial del pedido,
 * y la pantalla ofrece copiar el mensaje para mandarlo a mano.
 */
export async function avisarAlCliente(
  usuario: Usuario,
  pedido: Pedido,
  colores: ReadonlyMap<string, Color>,
): Promise<ResultadoAvisoCliente> {
  const { almacen, correo } = servicios();
  const ahora = new Date().toISOString();
  const anotar = (accion: string, detalle: string) =>
    almacen
      .anotar({
        id: crypto.randomUUID(),
        entidad: "pedido",
        entidadId: pedido.id,
        accion,
        usuarioId: usuario.id,
        detalle,
        creadoEn: ahora,
      })
      .catch(() => {});

  if (!pedido.clienteCorreo.includes("@")) return "sin-correo";
  /* Sin proveedor no es un fallo: es que todavia no se conecto. Se dice asi. */
  if (!correo.describir().listo) return "sin-conexion";

  const m = correoDeSeguimiento(pedido, colores);
  const r = await correo
    .enviar({
      para: pedido.clienteCorreo,
      asunto: m.asunto,
      texto: m.texto,
      html: m.html,
      responderA: CONTACT_EMAIL,
    })
    .catch((e: unknown) => ({ ok: false as const, motivo: String(e) }));

  if (r.ok) {
    await anotar("correo-seguimiento", `Correo con el seguimiento enviado a ${pedido.clienteCorreo}`);
    return "enviado";
  }
  await anotar("correo-seguimiento-fallo", `El correo al cliente no salio: ${r.motivo}`);
  return "fallo";
}
