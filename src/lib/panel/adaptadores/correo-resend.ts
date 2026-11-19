/*
  Correo de verdad, con Resend.

  Por que Resend: tiene plan gratis de 3.000 correos al mes, manda desde
  servidores europeos si se elige la region, y se conecta con una sola clave.
  Para mandar en nombre de @nerowacases.com hay que verificar el dominio en
  Resend (tres registros DNS que da su panel), una vez.

  Sin `server-only` para poder probarlo con un `fetch` falso.
*/

import type { Correo, Mensaje } from "../puertos/correo";

export function crearCorreoResend(o: {
  clave: string;
  /** "Nerowa Cases <info@nerowacases.com>". Tiene que ser de un dominio verificado. */
  desde: string;
  fetch?: typeof fetch;
}): Correo {
  const llamar = o.fetch ?? fetch;

  return {
    nombre: "resend",
    describir() {
      return { listo: true, detalle: `Los correos al cliente salen desde ${o.desde}.` };
    },
    async enviar(m: Mensaje) {
      try {
        const r = await llamar("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${o.clave}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: o.desde,
            to: [m.para],
            subject: m.asunto,
            text: m.texto,
            ...(m.html ? { html: m.html } : {}),
            ...(m.responderA ? { reply_to: m.responderA } : {}),
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          /* Resend dice por que: dominio sin verificar, direccion invalida... */
          const cuerpo = (await r.text().catch(() => "")).slice(0, 200);
          console.error(`[correo:resend] ${r.status}: ${cuerpo}`);
          return { ok: false, motivo: `Resend contesto ${r.status}: ${cuerpo}` };
        }
        return { ok: true };
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        console.error(`[correo:resend] no salio: ${motivo}`);
        return { ok: false, motivo };
      }
    },
  };
}
