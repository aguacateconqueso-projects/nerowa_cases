/*
  La puerta del cron: Vercel la llama una vez al dia (ver `vercel.json`) y el
  vigia revisa y manda los avisos que toquen. El porque de "una vez al dia" y
  no cada hora esta en `src/lib/panel/vigia.ts`.

  QUIEN PUEDE LLAMARLA

  Solo quien traiga `CRON_SECRET`. Vercel la manda sola en la cabecera
  `Authorization: Bearer ...` cuando la variable existe en el proyecto. Sin la
  variable puesta, la puerta queda CERRADA para todos, no abierta: una URL
  publica que dispara mensajes al telefono de Alfredo no puede depender de que
  nadie la adivine.
*/

import { revisarAvisos } from "@/lib/panel/vigia";

export const dynamic = "force-dynamic";

export async function GET(peticion: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json(
      { ok: false, motivo: "Falta CRON_SECRET en las variables de entorno de Vercel." },
      { status: 503 },
    );
  }
  if (peticion.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, motivo: "No autorizado." }, { status: 401 });
  }

  try {
    const resultado = await revisarAvisos();
    return Response.json({ ok: true, ...resultado });
  } catch (error) {
    console.error("[vigia] la revision del cron fallo:", error);
    return Response.json(
      { ok: false, motivo: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
