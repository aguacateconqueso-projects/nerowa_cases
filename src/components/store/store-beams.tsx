"use client";

/*
  Los haces del hero, en negro.

  Es el mismo motor que el fondo de la pagina de espera
  (`src/components/ui/beams-background.tsx`) con la decision de Alfredo del
  2026-09-12 metida dentro: alli los haces son dorados sobre negro; aqui son
  NEGROS sobre el color encendido del estuche. El color lo pone la superficie de
  abajo, y los haces solo lo sombrean.

  Por que es un archivo aparte y no una variante del otro: aquel componente monta
  su propio contenedor negro con velo y vineta, y aqui hace falta lo contrario —
  una capa transparente que se pinta ENCIMA de un color que cambia. Lo unico que
  comparten es la matematica de los carriles, que son treinta lineas.

  Lo que si se hereda tal cual, porque ya estaba resuelto:
  - Los haces no se reparten al azar. Cada uno saca su carril y su desfase del
    indice, asi la pagina se ve igual en cada carga y en cada aparato.
  - En telefono se dibujan menos haces y con menos resolucion. Casi todo el
    trafico llega de Instagram, en telefono y con datos moviles.
*/

import { useEffect, useRef } from "react";

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

const BEAMS_DESKTOP = 14;
const BEAMS_MOBILE = 9;
const MOBILE_BREAKPOINT = 768;

const BLUR_PX = 30;

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

function createBeam(
  index: number,
  total: number,
  width: number,
  height: number,
): Beam {
  const length = height * LENGTH_FACTOR;

  return {
    x: laneX(index, total, width),
    y: height - ((index * PHI) % 1) * length,
    width: 120 + (index % 4) * 60,
    length,
    angle: -32 + ((index % 3) - 1) * 3,
    speed: 0.35 + (index % 5) * 0.08,
    opacity: 0.55 + (index % 3) * 0.15,
    pulse: index * PHI * Math.PI * 2,
    pulseSpeed: 0.006 + (index % 4) * 0.002,
  };
}

interface StoreBeamsProps {
  /*
    Cuanto pesa el negro, de 0 a 1. Sale de `beamStrengthFor` en `palette.ts`:
    sobre un hero claro los haces se sujetan y sobre uno oscuro se suben, porque
    si no, sobre azul marino no aparecen.
  */
  strength: number;
  /* Falso cuando el hero salio de pantalla: apaga el bucle de dibujo. */
  active: boolean;
}

export function StoreBeams({ strength, active }: StoreBeamsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const frameRef = useRef<number>(0);
  /* El pintor del bucle, guardado para poder pedir un fotograma suelto desde
     fuera cuando todo esta detenido. */
  const paintRef = useRef<((advance: boolean) => void) | null>(null);

  /*
    La fuerza se lee por referencia dentro del bucle. Si entrara como dependencia
    del efecto que monta el lienzo, cada cambio de color lo volveria a montar
    entero y los haces saltarian de sitio justo en el fotograma en que hay que
    mirarlos.
  */
  const strengthRef = useRef(strength);

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

      const alpha =
        beam.opacity *
        (0.85 + Math.sin(beam.pulse) * 0.15) *
        strengthRef.current;

      /* Negro puro. Los extremos se van a transparente para que el haz no
         termine en un corte recto contra el color. */
      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.1, `rgba(0,0,0,${alpha * 0.45})`);
      gradient.addColorStop(0.42, `rgba(0,0,0,${alpha})`);
      gradient.addColorStop(0.58, `rgba(0,0,0,${alpha})`);
      gradient.addColorStop(0.9, `rgba(0,0,0,${alpha * 0.45})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");

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
      if (reducedMotion || !active) paint(false);
    };

    resize();
    paintRef.current = paint;

    if (reducedMotion || !active) {
      /* Un solo fotograma fijo: los haces se ven, nada se mueve. */
      paint(false);
    } else {
      frameRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameRef.current);
      paintRef.current = null;
    };
  }, [active]);

  /*
    Un repintado suelto al cambiar de color mientras todo esta detenido. Con el
    bucle andando sobra, porque el proximo fotograma ya toma la fuerza nueva; con
    `prefers-reduced-motion` o con el hero fuera de pantalla el lienzo no se
    vuelve a dibujar solo y los haces se quedarian con el peso del color anterior.
  */
  useEffect(() => {
    strengthRef.current = strength;

    const still =
      !active || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) paintRef.current?.(false);
  }, [strength, active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
