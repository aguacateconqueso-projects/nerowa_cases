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

  /*
    Tiendas mayoristas, con prefijo `m-`.

    Hace falta porque "pagado" y "enviado" ya existen arriba y significan otra
    cosa: en un pedido de la web "pagado" es el estado inicial —lo que acaba de
    entrar— y en uno mayorista es que la tienda por fin te transfirio. Sin
    prefijo, confirmar un cobro habria dicho "vuelve a estar por enviar".
  */
  "m-creada": "Tienda dada de alta.",
  "m-editada": "Cambios guardados.",
  "m-creado": "Pedido registrado. Falta confirmarlo.",
  "m-confirmado": "Pedido confirmado.",
  "m-cancelado": "Pedido cancelado.",
  "m-facturado": "Marcado como facturado. Empieza a contar el plazo de pago.",
  "m-pagado": "Cobrado. La deuda de esta tienda baja.",
  "m-enviado": "Marcado como enviado. Ya esta fuera.",
  "m-entregado": "Marcado como entregado.",
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
