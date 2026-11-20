/*
  El numero de seguimiento y lo que se le dice al cliente con el.

  Funciones puras, como el resto del dominio, y comprobadas en
  `__pruebas__/seguimiento.prueba.ts`.

  EL TEXTO AL CLIENTE VA EN INGLES: es lo que habla la tienda. Lo que lee
  Alfredo, en espanol.

  Y NO LLEVA ENLACE DE SEGUIMIENTO, a proposito. Enlazar bien el seguimiento de
  Lietuvos pastas —y el del pais de destino, que es por donde lo sigue el
  cliente cuando el paquete cruza la frontera— es la siguiente fase, y un
  enlace inventado que lleva a una pagina de error es peor que ningun enlace.
  Hoy va el numero, que es lo que sirve en cualquier buscador de envios.
*/

import type { Color, Pedido } from "./tipos";

/** Quita espacios y guiones, y lo pone en mayusculas: "ra 1234 5678 9lt" → "RA123456789LT". */
export function limpiarSeguimiento(texto: string): string {
  return texto.replace(/[\s-]+/g, "").toUpperCase();
}

/**
 * Si tiene la forma de los envios postales internacionales: dos letras, nueve
 * cifras y el pais (RA123456789LT). NO bloquea: un envio por mensajeria tiene
 * otro formato y es igual de valido. Solo sirve para avisar de una errata.
 */
export function esCodigoPostalInternacional(codigo: string): boolean {
  return /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(codigo);
}

/**
 * Lo que hay que mirar antes de guardarlo. Devuelve el motivo si no vale.
 * Lo que se acepta es amplio a proposito: solo se rechaza lo que seguro esta
 * mal, para no dejar a Alfredo plantado en la oficina de correos.
 */
export function validarSeguimiento(codigo: string): string | undefined {
  if (!codigo) return "Falta el numero de seguimiento.";
  if (codigo.length < 6) return "Ese numero es demasiado corto para ser un seguimiento.";
  if (codigo.length > 40) return "Ese numero es demasiado largo para ser un seguimiento.";
  if (!/^[A-Z0-9]+$/.test(codigo)) return "El seguimiento solo lleva letras y numeros.";
  return undefined;
}

function queLleva(pedido: Pedido, colores: ReadonlyMap<string, Color>): string {
  return pedido.lineas
    .map((l) => `${l.cantidad} × ${colores.get(l.colorId)?.nombre ?? l.colorId}`)
    .join(", ");
}

function nombrePila(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

/** El mensaje corto, para mandarlo por WhatsApp o Instagram. */
export function mensajeDeSeguimiento(
  pedido: Pedido,
  colores: ReadonlyMap<string, Color>,
): string {
  const hola = nombrePila(pedido.clienteNombre);
  return [
    `Hi${hola ? ` ${hola}` : ""}! Your Nerowa case is on its way (${queLleva(pedido, colores)}).`,
    `Tracking number: ${pedido.seguimiento ?? ""}`,
    `It ships with Lietuvos paštas (Lithuanian Post), so you can follow it on their site or on your local post office's tracking page.`,
    `Thank you, Nerowa Cases`,
  ].join("\n");
}

function escaparHtml(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** El correo con el seguimiento: asunto, texto plano y HTML sencillo. */
export function correoDeSeguimiento(
  pedido: Pedido,
  colores: ReadonlyMap<string, Color>,
): { asunto: string; texto: string; html: string } {
  const hola = nombrePila(pedido.clienteNombre);
  const lleva = queLleva(pedido, colores);
  const codigo = pedido.seguimiento ?? "";
  const asunto = `Your Nerowa case is on its way (order #${pedido.numero})`;

  const texto = [
    `Hi${hola ? ` ${hola}` : ""},`,
    "",
    `Your order #${pedido.numero} (${lleva}) has left our workshop in Vilnius.`,
    "",
    `Tracking number: ${codigo}`,
    "",
    "It ships with Lietuvos paštas (Lithuanian Post). You can follow it on their website, and once it reaches your country, on your local post office's tracking page with the same number.",
    "",
    "If anything looks wrong, just reply to this email.",
    "",
    "Thank you,",
    "Nerowa Cases",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f2ee;font-family:Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;background:#fff;padding:32px;border-radius:8px">
<p style="margin:0 0 16px">Hi${hola ? ` ${escaparHtml(hola)}` : ""},</p>
<p style="margin:0 0 24px">Your order <strong>#${pedido.numero}</strong> (${escaparHtml(lleva)}) has left our workshop in Vilnius.</p>
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666">Tracking number</p>
<p style="margin:0 0 24px;font-size:22px;font-family:Menlo,Consolas,monospace;letter-spacing:.04em"><strong>${escaparHtml(codigo)}</strong></p>
<p style="margin:0 0 16px">It ships with Lietuvos paštas (Lithuanian Post). You can follow it on their website, and once it reaches your country, on your local post office's tracking page with the same number.</p>
<p style="margin:0 0 24px">If anything looks wrong, just reply to this email.</p>
<p style="margin:0">Thank you,<br>Nerowa Cases</p>
</div></body></html>`;

  return { asunto, texto, html };
}

/**
 * Enlace para abrir WhatsApp con el mensaje ya escrito.
 * Sin telefono, o con uno que no se puede leer, no hay enlace.
 */
export function enlaceWhatsApp(telefono: string | undefined, texto: string): string | undefined {
  if (!telefono) return undefined;
  const cifras = telefono.replace(/[^\d]/g, "");
  /* wa.me necesita el numero internacional, sin el "+" ni el "00". */
  const internacional = cifras.startsWith("00") ? cifras.slice(2) : cifras;
  if (internacional.length < 8) return undefined;
  return `https://wa.me/${internacional}?text=${encodeURIComponent(texto)}`;
}
