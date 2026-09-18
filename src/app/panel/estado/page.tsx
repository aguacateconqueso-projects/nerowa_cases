/*
  "¿Esto esta guardando de verdad?"

  Es la pantalla que contesta esa pregunta de un vistazo, sin abrir Vercel ni
  Supabase. Solo la ve el dueno: no es informacion secreta, pero tampoco es
  trabajo de quien despacha.
*/

import Link from "next/link";
import { redirect } from "next/navigation";

import { diagnosticar } from "@/lib/panel/diagnostico";
import { usuarioActual } from "@/lib/panel/sesion";

export const metadata = { title: "Estado" };
export const dynamic = "force-dynamic";

export default async function PantallaEstado() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");
  if (usuario.rol !== "dueno") redirect("/panel");

  const d = await diagnosticar();
  const bien = d.persistente && !d.error;

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel/numeros" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Numeros
        </Link>
      </header>

      <h1 className="t-heading text-2xl">Estado del sistema</h1>

      {/* El veredicto, primero y grande. */}
      <section
        className="mt-4 rounded-xl border p-4"
        style={{
          borderColor: bien ? "var(--panel-bien)" : "var(--panel-aviso)",
          background: "var(--panel-tarjeta)",
        }}
      >
        <p className="t-heading text-lg" style={{ color: bien ? "var(--panel-bien)" : "var(--panel-aviso)" }}>
          {bien
            ? "✓ Guardando en la base de datos"
            : d.error
              ? "✕ La base de datos no responde"
              : "⚠ Modo demostracion: no se guarda nada"}
        </p>
        <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
          {bien
            ? `Lo que guardes se queda. La base contesto en ${d.respondeEnMs} ms.`
            : d.error
              ? "El panel encontro la configuracion pero no pudo hablar con la base. El detalle esta abajo."
              : "Falta poner PANEL_ALMACEN=postgres y DATABASE_URL en Vercel. Mientras tanto el panel funciona, pero lo que escribas se pierde."}
        </p>
      </section>

      {/*
        Las pistas van ANTES del mensaje crudo. El mensaje exacto es lo que
        permite buscar en internet o en el registro; la pista es lo que permite
        arreglarlo sin saber de bases de datos, y eso es lo que hace falta
        primero.
      */}
      {d.pistas.length > 0 ? (
        <section className="mt-4 grid gap-3">
          {d.pistas.map((pista) => (
            <div
              key={pista.titulo}
              className="rounded-xl border p-4"
              style={{
                borderColor:
                  pista.nivel === "error" ? "var(--panel-urgente)" : "var(--panel-aviso)",
                background: "var(--panel-tarjeta)",
              }}
            >
              <p
                className="t-heading text-[1.0625rem]"
                style={{
                  color:
                    pista.nivel === "error" ? "var(--panel-urgente)" : "var(--panel-aviso)",
                }}
              >
                {pista.nivel === "error" ? "✕ " : "⚠ "}
                {pista.titulo}
              </p>
              <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-texto)" }}>
                {pista.queHacer}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {d.error ? (
        <section className="mt-4">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            El mensaje exacto de la base, por si hay que buscarlo
          </h2>
          <p
            className="rounded-xl border p-4 text-[0.875rem]"
            style={{
              borderColor: "var(--panel-urgente)",
              background: "#2a0f0d",
              color: "#f6b3ad",
              wordBreak: "break-word",
            }}
          >
            {d.error}
          </p>
        </section>
      ) : null}

      {/*
        La cadena con la contrasena tapada. Con solo el error de Postgres hay
        que adivinar si lo que esta mal es el usuario, el puerto o la
        contrasena; viendola, el problema salta a la vista.
      */}
      {d.cadena ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            La cadena que esta puesta
          </h2>
          <p
            className="t-figures rounded-xl border px-4 py-3 text-[0.8125rem]"
            style={{
              borderColor: "var(--panel-borde)",
              background: "var(--panel-tarjeta)",
              wordBreak: "break-all",
              lineHeight: 1.5,
            }}
          >
            {d.cadena.texto}
          </p>
          <dl className="mt-2 grid gap-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            <Comprobacion
              termino="Usuario"
              valor={d.cadena.usuario ?? "(ninguno)"}
              bien={Boolean(d.cadena.usuario?.includes("."))}
              nota={
                d.cadena.usuario?.includes(".")
                  ? "lleva la referencia del proyecto, como pide el pooler"
                  : 'al pooler le falta el ".<referencia-del-proyecto>"'
              }
            />
            <Comprobacion
              termino="Puerto"
              valor={String(d.cadena.puerto ?? "(ninguno)")}
              bien={d.cadena.puerto === 6543}
              nota={d.cadena.puerto === 6543 ? "el del pooler, correcto" : "el del pooler es el 6543"}
            />
            <Comprobacion
              termino="Contrasena"
              valor={
                d.cadena.contrasenaEntreCorchetes
                  ? "entre corchetes"
                  : d.cadena.tieneContrasena
                    ? "puesta"
                    : "vacia"
              }
              bien={d.cadena.tieneContrasena && !d.cadena.contrasenaEntreCorchetes}
              nota={
                d.cadena.contrasenaEntreCorchetes
                  ? "hay que borrar los corchetes de [YOUR-PASSWORD]"
                  : "su valor no se lee ni se enseña nunca"
              }
            />
          </dl>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
          Que hay conectado
        </h2>
        <dl
          className="rounded-xl border p-4 text-[0.9375rem]"
          style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        >
          <Fila t="Datos" v={d.almacen} bien={d.persistente} />
          <Fila t="Correo" v={d.correo} bien={d.correo !== "consola"} />
          <Fila t="Avisos" v={d.avisos} bien={d.avisos !== "consola"} />
          <Fila t="Archivos" v={d.archivos} bien={d.archivos !== "memoria"} />
        </dl>
        <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          Los que salen en gris todavia no estan conectados: escriben en el registro
          del servidor en vez de salir a ningun sitio. Llegan en las fases 7.2 y 7.3.
        </p>
      </section>

      {d.cuentas.length > 0 ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Que hay guardado
          </h2>
          <dl
            className="rounded-xl border p-4 text-[0.9375rem]"
            style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
          >
            {d.cuentas.map((c) => (
              <div key={c.que} className="flex justify-between py-1">
                <dt style={{ color: "var(--panel-tenue)" }}>{c.que}</dt>
                <dd className="t-figures">{c.cuantos}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
          Variables de entorno
        </h2>
        <ul className="grid gap-2">
          {d.variables.map((v) => (
            <li
              key={v.nombre}
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="t-figures text-[0.9375rem]">{v.nombre}</span>
                <span
                  className="t-label"
                  style={{ color: v.puesta ? "var(--panel-bien)" : "var(--panel-tenue)" }}
                >
                  {v.puesta ? "✓ puesta" : "sin poner"}
                </span>
              </span>
              {v.nota ? (
                <span
                  className="mt-1 block text-[0.8125rem]"
                  style={{ color: "var(--panel-tenue)" }}
                >
                  {v.nota}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          Solo se dice si estan puestas. Su valor no sale de aqui ni aunque lo pida
          alguien.
        </p>
      </section>
    </div>
  );
}

function Comprobacion({
  termino,
  valor,
  bien,
  nota,
}: {
  termino: string;
  valor: string;
  bien: boolean;
  nota: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>
        {termino}{" "}
        <span style={{ color: "var(--panel-tenue)", opacity: 0.8 }}>— {nota}</span>
      </dt>
      <dd
        className="t-figures shrink-0"
        style={{ color: bien ? "var(--panel-bien)" : "var(--panel-urgente)" }}
      >
        {bien ? "✓ " : "✕ "}
        {valor}
      </dd>
    </div>
  );
}

function Fila({ t, v, bien }: { t: string; v: string; bien: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <dt style={{ color: "var(--panel-tenue)" }}>{t}</dt>
      <dd style={{ color: bien ? "var(--panel-bien)" : "var(--panel-tenue)" }}>
        {bien ? "✓ " : ""}
        {v}
      </dd>
    </div>
  );
}
