"use client";

/*
  La entrada. En la referencia es "DIALING IN" con un contador de 0 a 100% sobre
  fondo oscuro, que al terminar sube como una cortina. Aqui es "TUNING IN", que
  es lo que hace un contrabajista antes de tocar.

  Las reglas de `docs/estructura-web.md` para la cortina se cumplen todas:
    - Una vez por sesion. El guion de `app/shop/page.tsx` la esconde antes de
      pintar si ya se vio; este componente la quita despues de hidratar.
    - Se salta con cualquier toque, clic o tecla.
    - Dura menos de dos segundos: 1.3 s de contador y 0.55 s de cortina.
    - No bloquea nada: si algo falla, la pagina esta debajo, entera.
*/

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LOGO } from "@/lib/brand";
import { INTRO_KEY } from "@/lib/shop/content";

const COUNT_MS = 1300;
const LEAVE_MS = 550;

export function Preloader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"run" | "leaving" | "gone">("run");
  const [pct, setPct] = useState(0);

  /* La devolucion de llamada puede cambiar en cada render del padre; la entrada
     solo tiene que avisar una vez, con la ultima que haya. */
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(INTRO_KEY) !== null;
      window.sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* Almacenamiento bloqueado: la entrada se ve, y ya. */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let leaveTimer = 0;
    let left = false;

    const finish = () => {
      setPhase("gone");
      done.current();
    };

    const leave = () => {
      if (left) return;
      left = true;
      window.cancelAnimationFrame(frame);
      setPct(100);
      setPhase("leaving");
      leaveTimer = window.setTimeout(finish, LEAVE_MS);
    };

    if (seen || reduced) {
      /* Por temporizador y no en el cuerpo del efecto: cambiar estado en el
         cuerpo provoca un render encadenado. */
      leaveTimer = window.setTimeout(finish, 0);
      return () => window.clearTimeout(leaveTimer);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / COUNT_MS, 1);
      /* Arranca rapido y frena al final, como una aguja que se asienta. */
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else leave();
    };
    frame = window.requestAnimationFrame(tick);

    window.addEventListener("pointerdown", leave);
    window.addEventListener("keydown", leave);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(leaveTimer);
      window.removeEventListener("pointerdown", leave);
      window.removeEventListener("keydown", leave);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`sh-preloader flex flex-col ${phase === "leaving" ? "sh-preloader--out" : ""}`}
    >
      <div className="px-4 pt-3 lg:px-5">
        <p className="sh-xxl">Tuning in</p>
        <p className="sh-xxl t-figures">{pct}%</p>
      </div>

      <div className="mt-10 grid grid-cols-[1fr_auto] items-start gap-4 px-4 lg:grid-cols-[160px_1fr_auto] lg:px-5">
        <p className="sh-label">Two-bow case</p>
        <p className="sh-label hidden uppercase opacity-60 lg:block">
          Double bass
          <br />
          Bow case
        </p>
        <Image
          src={LOGO.src}
          width={LOGO.width}
          height={LOGO.height}
          alt=""
          sizes="96px"
          className="h-auto w-24"
        />
      </div>

      {/* La barra de avance, abajo del todo, como la pista de la referencia. */}
      <div className="mt-auto h-px w-full bg-white/15">
        <div
          className="h-full origin-left bg-[var(--sh-gold)]"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}
