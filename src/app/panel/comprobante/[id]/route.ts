/*
  Ver la foto de un recibo. Solo con sesion: son direcciones y nombres de
  clientes, y no pueden quedar a la vista de quien adivine una URL.
*/

import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

export const dynamic = "force-dynamic";

export async function GET(_peticion: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await usuarioActual())) return new Response("No autorizado", { status: 401 });

  const { id } = await ctx.params;
  const encontrado = await servicios().almacen.datosDeComprobante(id);
  if (!encontrado) return new Response("No existe", { status: 404 });

  const { comprobante, datos } = encontrado;
  return new Response(new Uint8Array(datos), {
    headers: {
      "content-type": comprobante.tipo,
      "content-length": String(datos.byteLength),
      /* Privado: que ningun intermediario lo guarde. En el telefono si, un
         rato, para que volver a abrirlo no lo descargue otra vez. */
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-disposition": `inline; filename="recibo-${comprobante.id.slice(0, 8)}.${comprobante.tipo === "application/pdf" ? "pdf" : "jpg"}"`,
    },
  });
}
