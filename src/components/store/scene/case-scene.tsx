"use client";

/*
  La escena del hero. Aqui vive todo el comportamiento del estuche y nada de su
  forma: cuando llegue el `.glb`, este archivo no se toca.

  Lo que resuelve:
  - La entrada: el estuche entra grande y de frente, se aleja dando una vuelta
    entera sobre su eje y aterriza en la diagonal.
  - La diagonal: esquina superior derecha a esquina inferior izquierda.
  - El seguimiento del cursor, muy leve. En movil no hay cursor, asi que en su
    lugar queda una deriva lenta para que el objeto nunca se vea congelado.
  - El arrastre: se agarra el estuche y se gira. La posicion se queda donde la
    dejaron, en las dos vistas, y solo vuelve a la diagonal al hacer scroll.
  - El cambio de color: una vuelta completa mientras se transforma.

  Sobre el arrastre en movil: el lienzo deja pasar el desplazamiento vertical
  del dedo (`touch-action: pan-y`), porque si lo capturara, la pagina dejaria de
  poder bajarse desde el hero, que ocupa la pantalla entera. La consecuencia es
  que en telefono el dedo gira el estuche en horizontal y la pagina se lleva el
  vertical. En escritorio el arrastre es libre en los dos ejes.
*/

import { useEffect, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { CaseModel } from "./case-model";
import { CASE_LENGTH } from "./case-shape";

/* Inclinacion de la diagonal, en radianes. Negativa = la punta se va a la
   derecha y el pie a la izquierda, como en el boceto. */
const DIAGONAL = -0.72;

/* Giro de reposo sobre el eje largo: deja ver la cara y el canto de los
   cierres a la vez, en vez de una silueta plana. */
const REST_YAW = -0.6;
const REST_PITCH = 0.2;

const INTRO_MS = 2400;

interface CaseSceneProps {
  colorHex: string;
  open: boolean;
  /* Falso cuando el hero salio de pantalla: con esto se apaga el bucle de
     dibujo y la escena deja de gastar bateria mientras se lee el resto. */
  active: boolean;
  onGrabChange?: (grabbing: boolean) => void;
}

export function CaseScene({
  colorHex,
  open,
  active,
  onGrabChange,
}: CaseSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 19], fov: 32 }}
      style={{ touchAction: "pan-y" }}
    >
      <Lighting />
      <CaseRig colorHex={colorHex} open={open} onGrabChange={onGrabChange} />
    </Canvas>
  );
}

/* --------------------------------------------------------------------- luces */

/*
  Sin mapa de entorno. Un HDRI habria que descargarlo de un CDN en cada visita y
  el trafico de esta tienda llega por datos moviles; estas cuatro luces dan el
  mismo relieve sin pedir un solo archivo.
*/
function Lighting() {
  return (
    <>
      {/* Baja a proposito. Con ambiente alto los catorce colores salian
          lavados: el rojo profundo se veia rosa polvo y el vinotinto, marron. */}
      <ambientLight intensity={0.28} />
      {/* Luz principal, arriba a la derecha. */}
      <directionalLight position={[6, 8, 10]} intensity={2.4} />
      {/* Relleno frio del lado opuesto, para que la sombra no quede muerta. */}
      <directionalLight position={[-8, -2, 6]} intensity={0.8} color="#9db4d0" />
      {/* Contraluz: es la que dibuja el filo brillante del canto. */}
      <directionalLight position={[-4, 6, -8]} intensity={1.6} color="#fff4e0" />
      {/* Punto cercano: le da al barniz un reflejo concreto donde agarrarse. */}
      <pointLight position={[3, -4, 7]} intensity={26} distance={30} decay={2} />
    </>
  );
}

/* ------------------------------------------------------------------- el rig */

function CaseRig({
  colorHex,
  open,
  onGrabChange,
}: {
  colorHex: string;
  open: boolean;
  onGrabChange?: (grabbing: boolean) => void;
}) {
  const fit = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);

  /* Momento en que arranco la entrada. Se toma en el primer fotograma y no al
     construir el componente: el reloj de la escena es la unica fuente de tiempo
     que existe tanto en el servidor como en el navegador. */
  const startedAt = useRef<number | null>(null);

  /* Arrastre acumulado. Se queda donde lo dejaron hasta que haya scroll. */
  const dragYaw = useRef(0);
  const dragPitch = useRef(0);
  const dragging = useRef(false);
  const returningHome = useRef(false);

  /* Seguimiento del cursor, ya suavizado. */
  const pointer = useRef({ x: 0, y: 0 });
  const smoothPointer = useRef({ x: 0, y: 0 });

  /* Vuelta entera al cambiar de color. */
  const flourish = useRef(0);
  const flourishTarget = useRef(0);
  const firstColor = useRef(true);

  const reducedMotion = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = query.matches;
    const onChange = () => {
      reducedMotion.current = query.matches;
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  /* Una vuelta completa cada vez que cambia el color, menos en la primera
     pintada: ahi el giro ya lo hace la entrada. */
  useEffect(() => {
    if (firstColor.current) {
      firstColor.current = false;
      return;
    }
    if (reducedMotion.current) return;
    flourishTarget.current += Math.PI * 2;
  }, [colorHex]);

  /* El cursor se lee en la ventana y no en el lienzo: si se leyera en el
     lienzo, el estuche se quedaria quieto en cuanto el puntero pasara por
     encima de los colores o del boton de compra. */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* Cualquier desplazamiento de la pagina devuelve el estuche a la diagonal. */
  useEffect(() => {
    const onScroll = () => {
      if (dragging.current) return;
      if (dragYaw.current !== 0 || dragPitch.current !== 0) {
        returningHome.current = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ------------------------------------------------------------- arrastre */

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    dragging.current = true;
    returningHome.current = false;
    onGrabChange?.(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const fromYaw = dragYaw.current;
    const fromPitch = dragPitch.current;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      dragYaw.current = fromYaw + dx * 0.007;
      /* El cabeceo se topa: pasado el limite el estuche se pone de canto y
         deja de leerse como un objeto. */
      dragPitch.current = THREE.MathUtils.clamp(
        fromPitch + dy * 0.006,
        -1.1,
        1.1,
      );
    };

    const onEnd = () => {
      dragging.current = false;
      onGrabChange?.(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  /* -------------------------------------------------------------- fotograma */

  useFrame((state, delta) => {
    const now = state.clock.getElapsedTime();
    if (startedAt.current === null) startedAt.current = now;

    /* Entrada: de muy cerca a su sitio, con una vuelta entera por el camino. */
    const elapsed = (now - startedAt.current) * 1000;
    const raw = reducedMotion.current
      ? 1
      : THREE.MathUtils.clamp(elapsed / INTRO_MS, 0, 1);
    const intro = 1 - Math.pow(1 - raw, 3);

    state.camera.position.z = THREE.MathUtils.lerp(7.5, 19, intro);
    state.camera.updateProjectionMatrix();

    /* Encaje. El estuche mide diez unidades de largo; puesto en diagonal ocupa
       casi tanto de alto como de ancho, y en movil manda el ancho. Se calcula
       en cada fotograma porque tambien depende de si esta abierto. */
    if (fit.current) {
      const { width, height } = state.viewport;

      /* Puesto en diagonal, el estuche ocupa casi tanto de ancho como de alto.
         Se recalcula en cada fotograma porque tambien depende de si esta
         abierto, que es cuando mas ancho pide. */
      const openFactor = open ? 2.1 : 1;
      const needHeight = CASE_LENGTH * Math.cos(DIAGONAL) * 1.16;
      const needWidth =
        (CASE_LENGTH * Math.abs(Math.sin(DIAGONAL)) + 1.5 * openFactor) * 1.16;

      /*
        En vertical, la barra de compra se come el tercio de abajo de la
        pantalla. El estuche no puede repartirse el sitio con ella: se encoge a
        la altura que queda libre y sube para quedar centrado en ese hueco. En
        escritorio los controles estan en una esquina y no estorban, asi que ahi
        se usa la pantalla entera.
      */
      const portrait = width < height * 0.8;
      const usableHeight = height * (portrait ? 0.66 : 0.95);

      const scale = Math.min(
        usableHeight / needHeight,
        (width * 0.94) / needWidth,
      );

      fit.current.scale.setScalar(
        THREE.MathUtils.damp(fit.current.scale.x, scale, 6, delta),
      );
      fit.current.position.y = THREE.MathUtils.damp(
        fit.current.position.y,
        portrait ? height * 0.15 : 0,
        6,
        delta,
      );
    }

    /* Diagonal. Entra girando desde la vertical. */
    if (tilt.current) {
      tilt.current.rotation.z = DIAGONAL * intro;
    }

    if (!spin.current) return;

    /* Cursor suavizado. El factor es deliberadamente pequenio: el enunciado
       pide que el movimiento sea muy leve, no un juguete. */
    smoothPointer.current.x = THREE.MathUtils.damp(
      smoothPointer.current.x,
      pointer.current.x,
      3,
      delta,
    );
    smoothPointer.current.y = THREE.MathUtils.damp(
      smoothPointer.current.y,
      pointer.current.y,
      3,
      delta,
    );

    /* Deriva: un vaiven casi imperceptible para que el objeto respire cuando
       nadie lo toca. Es lo unico que se mueve en telefono. */
    const drift = reducedMotion.current ? 0 : Math.sin(now * 0.35) * 0.045;

    if (returningHome.current && !dragging.current) {
      dragYaw.current = THREE.MathUtils.damp(dragYaw.current, 0, 4, delta);
      dragPitch.current = THREE.MathUtils.damp(dragPitch.current, 0, 4, delta);
      if (
        Math.abs(dragYaw.current) < 0.002 &&
        Math.abs(dragPitch.current) < 0.002
      ) {
        dragYaw.current = 0;
        dragPitch.current = 0;
        returningHome.current = false;
      }
    }

    flourish.current = THREE.MathUtils.damp(
      flourish.current,
      flourishTarget.current,
      3.4,
      delta,
    );

    /* La vuelta de la entrada se descuenta: empieza en -360 grados y termina
       en cero, asi el aterrizaje cae exactamente en la pose de reposo. */
    const introSpin = reducedMotion.current ? 0 : (intro - 1) * Math.PI * 2;

    /* Cuando esta abierto, el estuche se pone mas de frente: si no, el interior
       queda de canto y no se ve para que sirve la vista. */
    const openYaw = open ? 0.45 : 0;

    spin.current.rotation.y =
      REST_YAW +
      openYaw +
      introSpin +
      flourish.current +
      dragYaw.current +
      smoothPointer.current.x * 0.12 +
      drift;

    spin.current.rotation.x =
      REST_PITCH + dragPitch.current + smoothPointer.current.y * 0.08;
  });

  return (
    <group ref={fit}>
      <group ref={tilt}>
        <group ref={spin} onPointerDown={beginDrag}>
          <CaseModel colorHex={colorHex} open={open} />
        </group>
      </group>
    </group>
  );
}
