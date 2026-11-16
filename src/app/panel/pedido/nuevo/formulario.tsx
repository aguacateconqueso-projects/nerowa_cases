"use client";

/*
  El formulario de la venta a mano.

  Lo que importa del diseno:

  - Los colores primero, con las cajas que quedan al lado. Es lo que se decide
    antes de nada, y si no hay cajas se tiene que ver ANTES de escribir la
    direccion, no despues.
  - El precio con IVA, que es lo que el cliente pago y lo que Alfredo sabe. El
    panel saca la base al guardar.
  - Todos los campos son controlados. React vacia los formularios al terminar
    una accion, y si la venta vuelve con "no hay cajas suficientes", perder la
    direccion que se acababa de escribir con el pulgar es inaceptable.
*/

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { formatearEuros } from "@/lib/panel/dominio/dinero";
import type { Color } from "@/lib/panel/dominio/tipos";

import { crearPedidoManual, type ResultadoNuevo } from "../acciones";

type Campos = Record<string, string>;

export function FormularioVenta({
  colores,
  disponibles,
  precioSugerido,
}: {
  colores: Color[];
  /** Por color. `undefined` si nadie conto el estante todavia. */
  disponibles?: Record<string, number>;
  precioSugerido: number;
}) {
  const [resultado, accion, enCurso] = useActionState<ResultadoNuevo | undefined, FormData>(
    crearPedidoManual,
    undefined,
  );
  const [c, setC] = useState<Campos>({
    pais: "LT",
    precio: (precioSugerido / 100).toFixed(2).replace(".", ","),
    envio: "",
  });
  /*
    El aviso de error sale al final del formulario, y el boton esta anclado
    abajo: en un telefono, el aviso queda fuera de la vista y parece que el
    boton no hizo nada. Se baja hasta el.
  */
  const avisoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (resultado && !resultado.ok) {
      avisoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [resultado]);

  const campo = (nombre: string) => ({
    id: nombre,
    name: nombre,
    value: c[nombre] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setC((previo) => ({ ...previo, [nombre]: e.target.value })),
  });

  const unidades = colores.reduce((n, color) => n + (Number(c[`cantidad-${color.id}`]) || 0), 0);
  const centimos = (t?: string) => Math.round((Number((t ?? "").replace(",", ".")) || 0) * 100);
  const total = centimos(c.precio) * unidades + centimos(c.envio);

  return (
    <form action={accion} className="grid gap-6 pb-4">
      <section>
        <h2 className="t-label mb-3" style={{ color: "var(--gold-bright)" }}>
          Que se llevo
        </h2>
        <ul className="grid gap-2">
          {colores.map((color) => {
            const hay = disponibles?.[color.id];
            return (
              <li
                key={color.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
              >
                <span
                  className="panel-muestra"
                  style={{ background: color.hex, width: "1.75rem", height: "1.75rem" }}
                  aria-hidden="true"
                />
                <label htmlFor={`cantidad-${color.id}`} className="flex-1">
                  <span className="block text-[1.0625rem]">{color.nombre}</span>
                  {hay !== undefined ? (
                    <span
                      className="block text-[0.8125rem]"
                      style={{ color: hay > 0 ? "var(--panel-tenue)" : "var(--panel-urgente)" }}
                    >
                      {hay > 0 ? `${hay} ${hay === 1 ? "disponible" : "disponibles"}` : "No quedan"}
                    </span>
                  ) : null}
                </label>
                <input
                  {...campo(`cantidad-${color.id}`)}
                  className="panel-campo"
                  style={{ width: "5rem", textAlign: "center" }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                />
              </li>
            );
          })}
        </ul>
        {disponibles === undefined ? (
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
            Todavia no se contaron los estuches, asi que el panel no puede decir
            cuantos quedan. <Link href="/panel/existencias/contar" style={{ color: "var(--gold-bright)" }}>Contarlos</Link>.
          </p>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Quien compro
        </h2>
        <Campo etiqueta="Nombre" requerido>
          <input {...campo("clienteNombre")} className="panel-campo" autoComplete="off" />
        </Campo>
        <Campo etiqueta="Correo (si lo tienes)">
          <input {...campo("clienteCorreo")} className="panel-campo" type="email" inputMode="email" autoComplete="off" />
        </Campo>
        <Campo etiqueta="Telefono (para la etiqueta)">
          <input {...campo("telefono")} className="panel-campo" type="tel" inputMode="tel" autoComplete="off" />
        </Campo>
      </section>

      <section className="grid gap-3">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          A donde va
        </h2>
        <Campo etiqueta="Calle y numero" requerido>
          <input {...campo("linea1")} className="panel-campo" autoComplete="off" />
        </Campo>
        <Campo etiqueta="Piso, puerta (opcional)">
          <input {...campo("linea2")} className="panel-campo" autoComplete="off" />
        </Campo>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Campo etiqueta="Ciudad" requerido>
            <input {...campo("ciudad")} className="panel-campo" autoComplete="off" />
          </Campo>
          <Campo etiqueta="C. postal">
            <input {...campo("codigoPostal")} className="panel-campo" autoComplete="off" />
          </Campo>
        </div>
        <Campo etiqueta="Pais, en dos letras" requerido>
          <input
            {...campo("pais")}
            className="panel-campo"
            style={{ width: "6rem", textTransform: "uppercase" }}
            maxLength={2}
            autoComplete="off"
          />
        </Campo>
      </section>

      <section className="grid gap-3">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Cuanto pago
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Por estuche, con IVA" requerido>
            <input {...campo("precio")} className="panel-campo" inputMode="decimal" />
          </Campo>
          <Campo etiqueta="Envio, con IVA">
            <input {...campo("envio")} className="panel-campo" inputMode="decimal" placeholder="0" />
          </Campo>
        </div>
        <p className="t-figures text-[0.9375rem]" aria-live="polite">
          Total cobrado: <strong>{formatearEuros(total)}</strong>
          {unidades > 0 ? ` · ${unidades} ${unidades === 1 ? "estuche" : "estuches"}` : ""}
        </p>
        <Campo etiqueta="Nota interna (opcional)">
          <textarea
            {...campo("nota")}
            className="panel-campo"
            style={{ minHeight: "4.5rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
            placeholder="Pago por transferencia, recoge en mano…"
          />
        </Campo>
      </section>

      {resultado && !resultado.ok ? (
        <div
          ref={avisoRef}
          role="status"
          aria-live="polite"
          className="rounded-lg px-3 py-3 text-[0.9375rem]"
          style={{ background: "#3a1512", color: "#f6b3ad" }}
        >
          <p>✕ {resultado.mensaje}</p>
          {resultado.faltantes ? (
            <>
              <ul className="mt-2 grid gap-1">
                {resultado.faltantes.map((f) => (
                  <li key={f.nombre}>
                    {f.nombre}: piden {f.piden}, {f.hay === 0 ? "no queda ninguno" : `quedan ${f.hay}`}.
                  </li>
                ))}
              </ul>
              <label className="mt-3 flex items-center gap-3">
                <input type="checkbox" name="venderIgual" value="si" className="h-6 w-6" />
                Venderlo igual (el conteo va atrasado, o llegan mas)
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="panel-accion-anclada grid gap-2">
        <button
          type="submit"
          className="panel-boton panel-boton-principal"
          disabled={enCurso || unidades === 0}
        >
          {enCurso ? "Guardando…" : "Registrar la venta"}
        </button>
        <Link href="/panel" className="panel-boton panel-boton-suave">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Campo({
  etiqueta,
  requerido,
  children,
}: {
  etiqueta: string;
  requerido?: boolean;
  children: React.ReactElement<{ id?: string }>;
}) {
  return (
    <div>
      <label htmlFor={children.props.id} className="t-label mb-1 block" style={{ color: "var(--panel-tenue)" }}>
        {etiqueta}
        {requerido ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
