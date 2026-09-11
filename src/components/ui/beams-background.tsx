"use client";

import { useEffect, useRef } from "react";

type Intensity = "subtle" | "medium" | "strong";

interface BeamsBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  intensity?: Intensity;
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

/*
  Fondo de haces de luz, negro y dorado.

  Los haces no se reparten al azar: cada uno tiene su carril y su desfase
  calculados a partir del indice. Asi la pagina se ve igual en cada carga y en
  cada aparato, en vez de salir negra una vez y mostaza la siguiente.

  El tono se mueve dentro de la franja ambar (36-52) para que nunca aparezca
  un haz verde ni rojizo.
*/
const GOLD_HUE_BASE = 36;
const GOLD_HUE_RANGE = 16;

const OPACITY_BY_INTENSITY: Record<Intensity, number> = {
  subtle: 0.7,
  medium: 1,
  strong: 1.35,
};

/*
  En movil se dibujan menos haces y con menos resolucion. Casi todo el trafico
  llega de Instagram, en telefono y con datos moviles: el fondo no puede ser
  lo que calienta el aparato.
*/
const BEAMS_DESKTOP = 14;
const BEAMS_MOBILE = 9;
const MOBILE_BREAKPOINT = 768;

const BLUR_PX = 28;

/* Proporcion aurea: reparte los desfases sin que dos haces caigan juntos. */
const PHI = 0.6180339887;

/* El haz es mas largo que la pantalla para que nunca se le vea el extremo. */
const LENGTH_FACTOR = 2.5;

/* Carriles: se extienden fuera de la pantalla porque los haces van inclinados. */
const LANE_START = -0.35;
const LANE_SPREAD = 1.7;

function laneX(index: number, total: number, width: number) {
  return width * (LANE_START + ((index + 0.5) / total) * LANE_SPREAD);
}

function createBeam(index: number, total: number, width: number, height: number): Beam {
  const length = height * LENGTH_FACTOR;

  return {
    x: laneX(index, total, width),
    /* Desfase en altura: el haz siempre cruza la pantalla, nunca queda fuera. */
    y: height - ((index * PHI) % 1) * length,
    width: 110 + (index % 4) * 45,
    length,
    angle: -32 + ((index % 3) - 1) * 3,
    speed: 0.35 + (index % 5) * 0.08,
    opacity: 0.32 + (index % 3) * 0.06,
    hue: GOLD_HUE_BASE + ((index + 0.5) / total) * GOLD_HUE_RANGE,
    pulse: index * PHI * Math.PI * 2,
    pulseSpeed: 0.006 + (index % 4) * 0.002,
  };
}

export function BeamsBackground({
  className,
  children,
  intensity = "medium",
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const total = isMobile ? BEAMS_MOBILE : BEAMS_DESKTOP;
      beamsRef.current = Array.from({ length: total }, (_, index) =>
        createBeam(index, total, window.innerWidth, window.innerHeight),
      );
    };

    const drawBeam = (beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity =
        beam.opacity *
        (0.85 + Math.sin(beam.pulse) * 0.15) *
        OPACITY_BY_INTENSITY[intensity];

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      gradient.addColorStop(0, `hsla(${beam.hue}, 92%, 60%, 0)`);
      gradient.addColorStop(0.1, `hsla(${beam.hue}, 92%, 60%, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(0.4, `hsla(${beam.hue}, 94%, 66%, ${pulsingOpacity})`);
      gradient.addColorStop(0.6, `hsla(${beam.hue}, 94%, 66%, ${pulsingOpacity})`);
      gradient.addColorStop(0.9, `hsla(${beam.hue}, 92%, 60%, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${beam.hue}, 92%, 60%, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    const paint = (advance: boolean) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);
      ctx.filter = `blur(${BLUR_PX}px)`;

      const total = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        if (advance) {
          beam.y -= beam.speed;
          beam.pulse += beam.pulseSpeed;

          /* Al salir por arriba vuelve por abajo, en el mismo carril. */
          if (beam.y + beam.length < 0) {
            beam.y = height;
            beam.x = laneX(index, total, width);
          }
        }

        drawBeam(beam);
      });

      ctx.filter = "none";
    };

    const animate = () => {
      paint(true);
      frameRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      resize();
      if (reducedMotion) paint(false);
    };

    resize();

    if (reducedMotion) {
      /* Un solo fotograma fijo: el degradado se ve, nada se mueve. */
      paint(false);
    } else {
      frameRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [intensity]);

  return (
    <div
      className={`relative flex min-h-svh w-full flex-col overflow-hidden bg-black ${className ?? ""}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/*
        Velo fijo. Suaviza el borde de los haces y baja el dorado a un nivel
        donde el texto blanco encima sigue cumpliendo AA. Sin animacion a
        proposito: al animarlo, el fondo oscilaba entre negro y mostaza.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#0b0700]/30 backdrop-blur-[30px]"
      />

      {/* Vineta: aparta la luz del centro para que el texto siempre contraste. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.32)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.88)_100%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

export default BeamsBackground;
