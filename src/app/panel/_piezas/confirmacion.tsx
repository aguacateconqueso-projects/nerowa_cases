/*
  La franja verde de "hecho", dibujada a partir de `?hecho=…` de la URL.

  Ver el comentario de `pedido/acciones.ts`: la confirmacion no puede vivir en
  el formulario, porque el formulario desaparece justo cuando la accion tiene
  exito.
*/

const MENSAJES: Record<string, string> = {
  enviado: "Marcado como enviado. Ya esta fuera.",
  entregado: "Marcado como entregado.",
  archivado: "Archivado.",
  incidencia: "Incidencia anotada.",
  pagado: "Corregido: vuelve a estar por enviar.",
  cancelado: "Pedido cancelado.",
  coste: "Anotado lo que costo el envio. Ya cuenta en la ganancia.",
};

export function Confirmacion({ hecho }: { hecho?: string }) {
  const mensaje = hecho ? MENSAJES[hecho] : undefined;
  if (!mensaje) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="mt-4 rounded-lg px-3 py-3 text-[0.9375rem]"
      style={{ background: "#12301e", color: "#9fe0b8" }}
    >
      ✓ {mensaje}
    </p>
  );
}
