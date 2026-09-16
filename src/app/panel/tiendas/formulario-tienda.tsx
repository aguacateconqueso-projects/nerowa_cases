"use client";

/*
  El formulario de una tienda: alta y edicion con el mismo componente, porque
  los campos son los mismos y mantener dos copias es como se desincronizan.

  El orden de los campos no es alfabetico ni por tipo: es el orden en que se
  tienen los datos delante cuando se da de alta una tienda — primero como se
  llama y donde esta, despues con quien se habla, y al final las condiciones
  que se acordaron.
*/

import Link from "next/link";
import { useActionState } from "react";

import { guardarTienda, type Resultado } from "./acciones";
import type { Tienda } from "@/lib/panel/dominio/tipos";

function Campo({
  id,
  etiqueta,
  ayuda,
  ...resto
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="t-label mb-2 block">
        {etiqueta}
      </label>
      <input id={id} name={id} className="panel-campo" {...resto} />
      {ayuda ? (
        <p className="mt-1 text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

export function FormularioTienda({ tienda }: { tienda?: Tienda }) {
  const [resultado, accion, enCurso] = useActionState<Resultado | undefined, FormData>(
    guardarTienda,
    undefined,
  );

  const euros = (c?: number) =>
    c === undefined ? "" : (c / 100).toFixed(2).replace(".", ",");

  return (
    <form action={accion} className="grid gap-5 pb-4">
      {tienda ? <input type="hidden" name="id" value={tienda.id} /> : null}

      <section className="grid gap-4">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Quien es
        </h2>
        <Campo
          id="nombre"
          etiqueta="Nombre de la tienda"
          defaultValue={tienda?.nombre}
          placeholder="Muzikos Namai"
          required
        />
        <Campo
          id="razonSocial"
          etiqueta="Razon social"
          ayuda="El nombre legal, el que va en la factura. Se puede poner despues."
          defaultValue={tienda?.razonSocial}
          placeholder="UAB Muzikos Namai"
        />
      </section>

      <section className="grid gap-4">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Donde esta
        </h2>
        <Campo id="linea1" etiqueta="Direccion" defaultValue={tienda?.direccion.linea1} />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            id="codigoPostal"
            etiqueta="Codigo postal"
            defaultValue={tienda?.direccion.codigoPostal}
          />
          <Campo id="ciudad" etiqueta="Ciudad" defaultValue={tienda?.direccion.ciudad} />
        </div>
        <Campo
          id="pais"
          etiqueta="Pais"
          ayuda="Dos letras: LT, DE, FR, ES… Decide que IVA se le cobra."
          defaultValue={tienda?.direccion.pais}
          placeholder="LT"
          maxLength={2}
          autoCapitalize="characters"
          required
        />
      </section>

      <section className="grid gap-4">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Con quien se habla
        </h2>
        <Campo
          id="contactoNombre"
          etiqueta="Persona de contacto"
          defaultValue={tienda?.contactoNombre}
        />
        <Campo
          id="contactoCorreo"
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          defaultValue={tienda?.contactoCorreo}
        />
        <Campo
          id="contactoTelefono"
          etiqueta="Telefono"
          type="tel"
          inputMode="tel"
          defaultValue={tienda?.contactoTelefono}
        />
      </section>

      <section className="grid gap-4">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Impuestos
        </h2>
        <Campo
          id="numeroIva"
          etiqueta="Numero de IVA intracomunitario"
          ayuda="Sin numero validado se le cobra el IVA, que es el lado seguro."
          defaultValue={tienda?.numeroIva}
          placeholder="DE811234567"
          autoCapitalize="characters"
        />
        <label
          htmlFor="ivaValidado"
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        >
          <input
            id="ivaValidado"
            name="ivaValidado"
            type="checkbox"
            defaultChecked={tienda?.ivaValidado}
            style={{ width: "1.5rem", height: "1.5rem", marginTop: "0.125rem", flex: "none" }}
          />
          <span>
            <span className="t-label block">El numero esta comprobado</span>
            <span className="text-[0.8125rem]" style={{ color: "var(--panel-tenue)" }}>
              Marcalo solo si alguien lo verifico de verdad. Sin marcar, el panel
              le cobra el IVA — cobrarlo de mas se devuelve, no cobrarlo lo paga
              la empresa.
            </span>
          </span>
        </label>
      </section>

      <section className="grid gap-4">
        <h2 className="t-label" style={{ color: "var(--gold-bright)" }}>
          Condiciones
        </h2>
        <Campo
          id="precioPersonalizado"
          etiqueta="Precio acordado por unidad"
          ayuda="Dejalo vacio para usar los tramos: 120 € de 1 a 5, 110 € de 6 a 15, 100 € de 16 en adelante."
          inputMode="decimal"
          defaultValue={euros(tienda?.precioPersonalizado)}
          placeholder="95,00"
        />
        <Campo
          id="plazoPagoDias"
          etiqueta="Plazo de pago, en dias"
          ayuda="Pasado ese plazo, la deuda de esta tienda sale marcada en rojo."
          inputMode="numeric"
          defaultValue={String(tienda?.plazoPagoDias ?? 30)}
        />
        <div>
          <label htmlFor="notas" className="t-label mb-2 block">
            Notas
          </label>
          <textarea
            id="notas"
            name="notas"
            className="panel-campo"
            style={{ minHeight: "6rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
            defaultValue={tienda?.notas}
            placeholder="Lo que se acordo con esta tienda y conviene no olvidar."
          />
        </div>
      </section>

      {tienda ? (
        <label
          htmlFor="activa"
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        >
          <input
            id="activa"
            name="activa"
            type="checkbox"
            defaultChecked={tienda.activa}
            style={{ width: "1.5rem", height: "1.5rem", flex: "none" }}
          />
          <span className="t-label">Tienda activa</span>
        </label>
      ) : null}

      <div className="panel-accion-anclada grid gap-2">
        <button type="submit" className="panel-boton panel-boton-principal" disabled={enCurso}>
          {enCurso ? "Guardando…" : tienda ? "Guardar cambios" : "Dar de alta la tienda"}
        </button>
        <Link
          href={tienda ? `/panel/tiendas/${tienda.id}` : "/panel/tiendas"}
          className="panel-boton panel-boton-suave"
        >
          Cancelar
        </Link>
      </div>

      {resultado && !resultado.ok ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg px-3 py-2 text-[0.9375rem]"
          style={{ background: "#3a1512", color: "#f6b3ad" }}
        >
          ✕ {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
