/*
  Ajustes y avisos.

  Tres cosas, en el orden en que se necesitan:

  1. Que los avisos lleguen al telefono: el estado de Telegram, el chat de
     cada uno y un aviso de prueba. Sin esto lo demas no sirve de nada.
  2. Cuando avisar: los plazos del escalado, el umbral de "quedan pocas" y la
     hora del resumen. La especificacion pide que no esten en el codigo.
  3. Lo que ya se aviso, para poder contestar "¿me tuvo que llegar algo?".
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { completarAjustes, DESCRIPCION_AJUSTES } from "@/lib/panel/dominio/ajustes";
import type { ClaveAjuste } from "@/lib/panel/dominio/ajustes";
import { describirEspera, horasDesde } from "@/lib/panel/dominio/tiempo";
import { ahoraServidor } from "@/lib/panel/reloj";
import { servicios } from "@/lib/panel/servicios";
import { usuarioActual } from "@/lib/panel/sesion";

import { Confirmacion } from "../_piezas/confirmacion";
import { ConectarTelegram, FormularioPlazos, RevisarAhora } from "./piezas";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function PantallaAjustes({
  searchParams,
}: {
  searchParams: Promise<{ hecho?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");

  const { almacen, avisos } = servicios();
  const [{ hecho }, guardados, enviados, yo, ahora] = await Promise.all([
    searchParams,
    almacen.leerAjustes(),
    almacen.listarAvisosEnviados(15),
    almacen.usuarioPorId(usuario.id),
    ahoraServidor(),
  ]);
  const ajustes = completarAjustes(guardados);
  const canal = avisos.describir();

  return (
    <div className="pb-4">
      <header className="pt-4 pb-5">
        <Link href="/panel/admin" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Admin
        </Link>
      </header>
      <h1 className="t-heading text-2xl">Ajustes y avisos</h1>
      <Confirmacion hecho={hecho} />

      <Seccion titulo="Avisos al telefono">
        <p
          className="mb-3 rounded-lg px-3 py-2 text-[0.9375rem]"
          style={
            canal.listo
              ? { background: "#12301e", color: "#9fe0b8" }
              : { background: "#3a2a12", color: "#f0cf95" }
          }
        >
          {canal.listo ? "✓ " : "⚠ "}
          {canal.detalle}
        </p>
        <ConectarTelegram
          chatActual={yo?.telegramChatId}
          conToken={Boolean(process.env.TELEGRAM_BOT_TOKEN)}
        />
        {!canal.listo ? (
          <details className="mt-3 text-[0.875rem]" style={{ color: "var(--panel-tenue)" }}>
            <summary className="cursor-pointer py-1">Como se conecta Telegram</summary>
            <ol className="mt-2 grid list-decimal gap-1 pl-5">
              <li>En Telegram, escribirle a @BotFather, mandar /newbot y guardar el token que da.</li>
              <li>En Vercel, poner TELEGRAM_BOT_TOKEN con ese token y PANEL_AVISOS=telegram, y volver a desplegar.</li>
              <li>Cada uno abre el bot y le manda cualquier mensaje.</li>
              <li>Aqui, &quot;Buscar mi chat&quot;, tocar tu nombre y &quot;Guardar&quot;.</li>
              <li>&quot;Mandarme un aviso de prueba&quot;: tiene que sonar el telefono.</li>
            </ol>
          </details>
        ) : null}
      </Seccion>

      <Seccion titulo="Cuando avisar">
        <FormularioPlazos
          ajustes={ajustes}
          descripciones={Object.entries(DESCRIPCION_AJUSTES) as [ClaveAjuste, (typeof DESCRIPCION_AJUSTES)[ClaveAjuste]][]}
        />
      </Seccion>

      <Seccion titulo="Revisar">
        <p className="mb-3 text-[0.875rem]" style={{ color: "var(--panel-tenue)" }}>
          El panel revisa solo una vez al dia y cada vez que alguien abre los
          pedidos. Esto lo hace ahora mismo.
        </p>
        <RevisarAhora />
      </Seccion>

      <Seccion titulo="Ultimos avisos">
        {enviados.length === 0 ? (
          <p className="text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
            Todavia no salio ningun aviso.
          </p>
        ) : (
          <ul className="grid gap-2">
            {enviados.map((a) => (
              <li
                key={a.clave}
                className="rounded-lg border px-3 py-2 text-[0.875rem]"
                style={{ borderColor: "var(--panel-borde)" }}
              >
                <p>{a.titulo}</p>
                <p style={{ color: "var(--panel-tenue)" }}>
                  {a.para || "nadie"} · {describirEspera(horasDesde(a.enviadoEn, ahora))} ·{" "}
                  {a.canales.includes("telegram") ? "Telegram" : a.canales.length ? "solo registro" : "no se mando"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="t-label mb-3" style={{ color: "var(--gold-bright)" }}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}
