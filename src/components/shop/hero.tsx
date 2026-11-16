"use client";

/*
  La primera pantalla. En la referencia: "GET DIALED. STAY DIALED." en enorme,
  la lata en 3D por delante del titular, y abajo a la derecha dos tarjetas
  pequenas, una para comprar y otra para la lista de correo.

  Aqui: "TWO BOWS. ONE CASE." y el estuche 3D de `/store` encima, en el color
  elegido, con todos sus gestos (girar, acercar, doble toque para volver).

  La tarjeta de correo de la referencia ofrece un 10% de descuento. Esa parte no
  se copia: `docs/estructura-web.md` deja fuera los descuentos de entrada. Lo que
  queda es apuntarse para enterarse de colores nuevos y reposiciones, y se puede
  cerrar.
*/

import { useRef, useState } from "react";

import { CONTACT_EMAIL } from "@/lib/brand";
import { CaseScene } from "@/components/store/scene/case-scene";
import { useStore } from "@/components/store/store-context";
import { MiniCard, Roll, useInView, useListSignup } from "./bits";

export function Hero({ ready }: { ready: boolean }) {
  const { color } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);
  const [grabbing, setGrabbing] = useState(false);
  const [listClosed, setListClosed] = useState(false);
  const signup = useListSignup();

  return (
    <section
      ref={sectionRef}
      id="top"
      data-nav="light"
      className="relative h-[100svh] min-h-[600px] overflow-hidden bg-[var(--sh-light)] text-[var(--sh-ink)]"
    >
      <h1 className="sh-xxl sh-xxl--hero absolute inset-x-4 top-16 lg:inset-x-5 lg:top-[28vh]">
        <span className="block">Two bows.</span>
        <span className="block">One case.</span>
      </h1>

      {/*
        El estuche va POR DELANTE del titular, como la lata de la referencia. En
        telefono el lienzo empieza debajo del titular para que el estuche no lo
        tape entero; en escritorio ocupa la pantalla y cruza las letras.
        Solo se monta cuando termino la entrada: asi su propia animacion de
        llegada se ve, en vez de pasar detras de la cortina.
      */}
      <div
        className={`absolute inset-x-0 bottom-0 top-[30%] z-10 lg:top-0 ${
          grabbing ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {ready && (
          <CaseScene
            colorHex={color.hex}
            open={false}
            active={inView}
            resetSignal={0}
            onGrabChange={setGrabbing}
            fit="fill"
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col items-end gap-1 lg:inset-x-auto lg:right-5 lg:bottom-5 lg:w-[340px]">
        <MiniCard color={color} className="pointer-events-auto" />

        {!listClosed && (
          <div className="pointer-events-auto hidden w-full max-w-[340px] bg-[var(--sh-paper)] px-3 py-2 sm:block">
            <div className="sh-label flex items-start justify-between gap-3">
              <p>Join the list: new colours and restocks</p>
              <button
                type="button"
                onClick={() => setListClosed(true)}
                className="sh-roll-host sh-focus shrink-0 opacity-60"
              >
                <Roll>Close</Roll>
              </button>
            </div>
            {signup.tried ? (
              <p className="sh-label sh-fade mt-3 opacity-80">
                The list opens with the shop. Until then, write to {CONTACT_EMAIL}.
              </p>
            ) : (
              <form onSubmit={signup.onSubmit} className="mt-3 flex items-end gap-3 border-b border-black/20 pb-1">
                <label className="sr-only" htmlFor="sh-hero-email">
                  Email address
                </label>
                <input
                  id="sh-hero-email"
                  type="email"
                  required
                  placeholder="YOUR EMAIL ADDRESS"
                  autoComplete="email"
                  className="sh-input sh-label min-w-0 flex-1"
                />
                <button type="submit" className="sh-roll-host sh-focus sh-label">
                  <Roll>Submit</Roll>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
