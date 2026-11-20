"use client";

/*
  La foto del recibo del correo: se toma con la camara y se comprime EN EL
  TELEFONO antes de subirla.

  Por que comprimirla aqui: una foto de iPhone pesa 3 o 4 MB, y en la oficina
  de correos con mala senal eso es una subida que no termina. Reducida a 2000
  px por el lado largo queda en unos 300-400 KB y el texto del recibo —que es
  pequeno, de impresora termica— se sigue leyendo entero.

  Si el telefono no sabe decodificarla (algun formato raro), se manda la
  original tal cual: mejor una foto pesada que ninguna.
*/

import { useEffect, useRef, useState } from "react";

const LADO_MAXIMO = 2000;
const CALIDAD = 0.75;

export async function comprimirFoto(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const ancho = Math.round(imagen.width * escala);
    const alto = Math.round(imagen.height * escala);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    imagen.close();
    const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/jpeg", CALIDAD));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], "recibo.jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

export function CampoRecibo({
  alElegir,
  etiqueta = "Foto del recibo del correo",
  opcional = true,
}: {
  alElegir: (archivo: File | null) => void;
  etiqueta?: string;
  opcional?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState<string>();
  const [peso, setPeso] = useState<number>();
  const [preparando, setPreparando] = useState(false);

  /* La vista previa ocupa memoria: se suelta al cambiarla o al salir. */
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  async function elegir(lista: FileList | null) {
    const original = lista?.[0];
    if (!original) return;
    setPreparando(true);
    const listo = await comprimirFoto(original);
    setPreparando(false);
    setVista(listo.type.startsWith("image/") ? URL.createObjectURL(listo) : undefined);
    setPeso(listo.size);
    alElegir(listo);
  }

  function quitar() {
    setVista(undefined);
    setPeso(undefined);
    if (entrada.current) entrada.current.value = "";
    alElegir(null);
  }

  return (
    <div>
      <span className="t-label mb-2 block">
        {etiqueta}
        {opcional ? <span style={{ color: "var(--panel-tenue)" }}> (puedes subirla despues)</span> : null}
      </span>
      {peso !== undefined ? (
        <div
          className="flex items-center gap-3 rounded-xl border p-2"
          style={{ borderColor: "var(--panel-borde)", background: "var(--panel-tarjeta)" }}
        >
          {vista ? (
            /* eslint-disable-next-line @next/next/no-img-element -- es una vista previa local, no una imagen del sitio */
            <img src={vista} alt="Vista previa del recibo" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <span className="t-label px-2">PDF</span>
          )}
          <span className="flex-1 text-[0.875rem]" style={{ color: "var(--panel-tenue)" }}>
            Lista para subir · {Math.round(peso / 1024)} KB
          </span>
          <button type="button" className="t-label px-3 py-3" style={{ color: "var(--panel-tenue)" }} onClick={quitar}>
            Quitar
          </button>
        </div>
      ) : (
        <label className="panel-boton panel-boton-suave cursor-pointer">
          {preparando ? "Preparando la foto…" : "📷 Foto del recibo"}
          <input
            ref={entrada}
            type="file"
            /*
              Sin `capture` a proposito: con el, el iPhone abre la camara y no
              deja elegir una foto ya tomada ni el PDF que mando el correo. Sin
              el, ofrece las tres cosas, y "Tomar foto" sigue a un toque.
            */
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => void elegir(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}

/*
  La misma foto, en un cuadrado del tamano de un pulgar, para ir AL LADO del
  campo del numero de seguimiento.

  Existe porque la version grande, debajo del campo, se metia bajo el boton
  anclado de "Marcar enviado": medido en un iPhone SE (568 px de alto), el
  boton tapaba la foto y hasta el borde del campo del numero. Asi el
  formulario ocupa lo mismo que antes de anadir la foto.
*/
export function BotonRecibo({ alElegir }: { alElegir: (archivo: File | null) => void }) {
  const [vista, setVista] = useState<string>();
  const [elegido, setElegido] = useState(false);
  const [preparando, setPreparando] = useState(false);

  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  async function elegir(lista: FileList | null) {
    const original = lista?.[0];
    if (!original) return;
    setPreparando(true);
    const listo = await comprimirFoto(original);
    setPreparando(false);
    setVista(listo.type.startsWith("image/") ? URL.createObjectURL(listo) : undefined);
    setElegido(true);
    alElegir(listo);
  }

  return (
    <label
      className="relative flex shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border"
      style={{
        width: "3.5rem",
        height: "3.5rem",
        borderColor: elegido ? "var(--panel-bien)" : "var(--panel-borde)",
        background: "var(--panel-tarjeta)",
      }}
    >
      {vista ? (
        /* eslint-disable-next-line @next/next/no-img-element -- vista previa local */
        <img src={vista} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      ) : null}
      <span aria-hidden="true" className="relative text-lg leading-none">
        {preparando ? "…" : elegido ? "✓" : "📷"}
      </span>
      <span className="relative mt-1 text-[0.625rem] uppercase tracking-wide" style={{ color: "var(--panel-tenue)" }}>
        {elegido ? "Lista" : "Recibo"}
      </span>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-label={elegido ? "Cambiar la foto del recibo" : "Foto del recibo (opcional)"}
        onChange={(e) => void elegir(e.target.files)}
      />
    </label>
  );
}
