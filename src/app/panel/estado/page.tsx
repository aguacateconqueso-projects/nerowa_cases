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

import { soltarSesiones } from "./acciones";

export const metadata = { title: "Estado" };
export const dynamic = "force-dynamic";

export default async function PantallaEstado({
  searchParams,
}: {
  searchParams: Promise<{ soltadas?: string; fallo?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/panel/entrar");
  if (usuario.rol !== "dueno") redirect("/panel");

  const [{ soltadas, fallo }, d] = await Promise.all([searchParams, diagnosticar()]);
  const bien = d.persistente && !d.error;

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between gap-3 pt-4 pb-5">
        <Link href="/panel/numeros" className="t-label" style={{ color: "var(--panel-tenue)" }}>
          ◂ Numeros
        </Link>
      </header>

      <h1 className="t-heading text-2xl">Estado del sistema</h1>

      {soltadas ? (
        <p
          className="mt-4 rounded-xl border p-3 text-[0.875rem]"
          style={{ borderColor: "var(--panel-bien)", color: "var(--panel-bien)" }}
        >
          {soltadas === "0"
            ? "No habia ninguna sesion atascada que soltar."
            : `Sesiones soltadas: ${soltadas}. Recarga para ver si la base ya responde.`}
        </p>
      ) : null}

      {fallo ? (
        <p
          className="mt-4 rounded-xl border p-3 text-[0.875rem]"
          style={{ borderColor: "var(--panel-aviso)", color: "var(--panel-tenue)" }}
        >
          No se pudieron soltar: {fallo}
        </p>
      ) : null}

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

      {/*
        Si se LLEGA al servidor, antes de hablar de Postgres.

        Hubo un caso con las tres comprobaciones de arriba en verde —usuario,
        puerto y contrasena— y aun asi nadie contestaba. Con solo el error de la
        base no habia forma de saber si el nombre estaba mal, si el puerto
        estaba cerrado o si la base rechazaba. Estas dos lineas lo separan.
      */}
      {d.red ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Si se llega a ese servidor
          </h2>
          <dl className="grid gap-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            <Comprobacion
              termino="El nombre"
              valor={
                d.red.dns.estado === "resuelve"
                  ? d.red.dns.familias.map((f) => `IPv${f}`).join(" y ")
                  : d.red.dns.estado === "tardo"
                    ? "no se pudo consultar"
                    : "no existe"
              }
              bien={d.red.dns.estado === "resuelve" && d.red.dns.familias.includes(4)}
              nota={
                d.red.dns.estado !== "resuelve"
                  ? "sin direccion no hay a quien preguntar"
                  : d.red.dns.familias.includes(4)
                    ? "resuelve por IPv4, que es por donde sale Vercel"
                    : "solo IPv6: es la conexion directa, no el pooler"
              }
            />
            {d.red.tcp ? (
              <Comprobacion
                termino="El puerto"
                valor={
                  d.red.tcp.estado === "acepta"
                    ? `acepta en ${d.red.tcp.ms} ms`
                    : d.red.tcp.estado === "rechaza"
                      ? `rechaza (${d.red.tcp.codigo})`
                      : "no contesta"
                }
                bien={d.red.tcp.estado === "acepta"}
                nota={
                  d.red.tcp.estado === "acepta"
                    ? "hay alguien escuchando: el fallo esta mas adentro"
                    : d.red.tcp.estado === "rechaza"
                      ? "hay maquina, pero ese puerto esta cerrado"
                      : "nadie responde: proyecto pausado, casi siempre"
                }
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      {/*
        El camino de las pantallas rotas, recorrido aqui.

        Solo sale cuando falla, y es el mensaje mas util de la pantalla: en
        produccion React tapa el error de servidor y deja solo un numero, asi
        que esta es la unica forma de leerlo.
      */}
      {/*
        Cada consulta del almacen por separado. Es la seccion que dice CUAL, y
        sin ella solo se sabia que "algo tarda".
      */}
      {d.llamadas && d.llamadas.length > 0 ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Cada consulta del panel, una por una
          </h2>
          <dl className="grid gap-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            {d.llamadas.map((l) => (
              <Comprobacion
                key={l.que}
                termino={l.que}
                valor={l.error ? `${l.error} (${l.ms} ms)` : `${l.ms} ms`}
                bien={!l.error}
                nota={l.error ? "esta es la que revienta" : "contesta bien"}
              />
            ))}
          </dl>
        </section>
      ) : null}

      {d.arranqueError ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            El arranque de la base
          </h2>
          <p
            className="rounded-lg border p-3 text-[0.8125rem] leading-relaxed"
            style={{ borderColor: "var(--panel-aviso)", background: "#2a2107", color: "#f4d78a" }}
          >
            {d.arranqueError}
          </p>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            Las migraciones y la semilla corren una vez por instancia, antes de la
            primera consulta. Ya NO pueden dejar el panel sin cargar: si tardan de
            mas, la consulta sigue adelante y el arranque termina por su cuenta.
          </p>
        </section>
      ) : null}

      {d.caminoDelPanelError ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            El camino que recorren las pantallas del panel
          </h2>
          <p
            className="rounded-lg border p-3 text-[0.8125rem] leading-relaxed"
            style={{
              borderColor: "var(--panel-urgente)",
              background: "#2a1211",
              color: "#f6b3ad",
            }}
          >
            {d.caminoDelPanelError}
          </p>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            Esto es lo que revienta en <span className="t-figures">/panel</span> y
            en <span className="t-figures">/panel/tiendas</span>. Las consultas
            directas de arriba funcionan, asi que el fallo no esta en la base sino
            en el camino: el arranque de las tablas, la semilla o el techo de
            tiempo.
          </p>
        </section>
      ) : null}

      {/*
        Las dos conexiones de prueba.

        Aparece solo cuando hizo falta: se llega al puerto y no hay pulso. Es la
        seccion que dice DE QUIEN ES EL PROBLEMA — si la desnuda contesta y la
        del panel no, es nuestro; si no contesta ninguna, es de Supabase. Ver
        `sonda-sesion.ts`.
      */}
      {d.sesiones ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Dos conexiones nuevas, para saber de quien es el problema
          </h2>
          <dl className="grid gap-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            {d.sesiones.map((intento) => (
              <Comprobacion
                key={intento.como}
                termino={intento.como}
                valor={
                  intento.error
                    ? intento.error
                    : `abre en ${intento.saludoMs} ms, viaje de ${intento.viajeMs} ms`
                }
                bien={!intento.error}
                nota={
                  intento.error
                    ? "no se pudo abrir una sesion asi"
                    : "esta forma de conectar SI funciona"
                }
              />
            ))}
          </dl>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            La unica diferencia entre las dos son los ajustes que el panel manda
            al abrir la sesion. Si una contesta y la otra no, el problema esta en
            el codigo; si fallan las dos, esta en la base.
          </p>
        </section>
      ) : null}

      {/*
        Quien mas esta conectado a la base.

        Solo aparece cuando la base contesta: si no contesta, esto no se puede
        saber y una seccion vacia solo estorba. Las sesiones `idle in
        transaction` son las que importan — son migraciones que se quedaron a
        medias y retienen los candados que bloquean a todas las demas.
      */}
      {d.salud ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            Quien mas esta conectado
          </h2>
          <dl className="grid gap-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            <Comprobacion
              termino="El pulso"
              valor={`${d.salud.pulsoMs} ms`}
              bien={true}
              nota="un select que no toca ninguna tabla: la base SI responde"
            />
            <Comprobacion
              termino="Las tablas"
              valor={d.salud.tablasCreadas ? "creadas" : "sin crear"}
              bien={d.salud.tablasCreadas}
              nota={
                d.salud.tablasCreadas
                  ? "la migracion ya corrio alguna vez"
                  : "todavia no se pudo aplicar la migracion"
              }
            />
            <Comprobacion
              termino="Sesiones abiertas"
              valor={String(d.salud.sesiones.length)}
              bien={d.salud.atascadas.length === 0}
              nota={
                d.salud.atascadas.length === 0
                  ? "ninguna atascada"
                  : `${d.salud.atascadas.length} a medio hacer, reteniendo candados`
              }
            />
          </dl>

          {d.salud.atascadas.length > 0 ? (
            <form action={soltarSesiones} className="mt-3">
              <ul className="mb-3 grid gap-1">
                {d.salud.atascadas.map((s, i) => (
                  <li
                    key={i}
                    className="t-figures rounded-lg border px-3 py-2 text-[0.75rem]"
                    style={{
                      borderColor: "var(--panel-borde)",
                      background: "var(--panel-tarjeta)",
                      color: "var(--panel-tenue)",
                      wordBreak: "break-all",
                    }}
                  >
                    {s.estado} · quieta hace {s.quietaHace}s
                    {s.ultima ? ` · ${s.ultima}` : ""}
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                className="t-label w-full rounded-xl px-4 py-3"
                style={{ background: "var(--panel-oro)", color: "#17171a" }}
              >
                Soltar las sesiones atascadas
              </button>
              <p className="mt-2 text-[0.75rem]" style={{ color: "var(--panel-tenue)" }}>
                Cierra solo las que estan a medio hacer. No corta ninguna consulta
                en curso ni ninguna conexion sana: una sesion en ese estado no
                esta haciendo nada, solo reteniendo el candado.
              </p>
            </form>
          ) : null}
        </section>
      ) : null}

      {d.saludError ? (
        <section className="mt-6">
          <h2 className="t-label mb-2" style={{ color: "var(--panel-tenue)" }}>
            No se pudo preguntarle a la base por si misma
          </h2>
          <p
            className="t-figures rounded-xl border px-4 py-3 text-[0.8125rem]"
            style={{
              borderColor: "var(--panel-aviso)",
              background: "var(--panel-tarjeta)",
              color: "var(--panel-tenue)",
              wordBreak: "break-word",
            }}
          >
            {d.saludError}
          </p>
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
