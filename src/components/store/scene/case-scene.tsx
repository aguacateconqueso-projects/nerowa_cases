"use client";

/*
  La escena del hero. Aqui vive todo el comportamiento del estuche y nada de su
  forma: cuando llegue el `.glb`, este archivo no se toca.

  Lo que resuelve:
  - La entrada: el estuche entra grande y de frente, se aleja dando una vuelta
    entera sobre su eje y aterriza en la diagonal.
  - La diagonal: esquina superior derecha a esquina inferior izquierda.
  - El seguimiento del cursor, muy leve, y una deriva lenta para que el objeto
    nunca se vea congelado.
  - **La inspeccion completa**, que es lo que pidio Alfredo el 2026-09-12: girar,
    acercar, alejar, subir, bajar y dar la vuelta. Detalle abajo.
  - El cambio de color: una vuelta completa mientras se transforma.

  ---------------------------------------------------------------------------
  COMO SE AGARRA EL ESTUCHE

  Escritorio (raton):
    arrastrar            gira
    Mayus + arrastrar    mueve (sube, baja, corre a los lados)
    boton central o
      boton derecho      mueve, sin tener que soltar Mayus
    rueda                acerca y aleja
    doble clic           lo devuelve a su sitio

  Telefono:
    un dedo, empezando de lado    gira, en los dos ejes
    dos dedos                     acercan, alejan y mueven
    doble toque                   lo devuelve a su sitio
    un dedo hacia abajo           baja la pagina, como debe ser

  **No hay modo de inspeccion y no hace falta.** El reparto lo hace
  `touch-action: pan-y` en el lienzo, y se comprobo con eventos tactiles de
  verdad: si el dedo arranca de lado, el navegador nos entrega el gesto COMPLETO
  y el componente vertical tambien nos llega, asi que se gira en los dos ejes sin
  pedir permiso a nadie; si arranca hacia abajo, se lo queda la pagina. Los dos
  dedos llegan siempre.

  Lo unico que no se puede es girar con un dedo que arranque en vertical seco, y
  eso es exactamente lo que hay que ceder: el hero ocupa la pantalla entera y el
  gesto de bajar a leer el precio no se puede fallar. Los dos dedos cubren ese
  hueco.

  Hubo una version con un boton "Inspect" que cambiaba el lienzo entre las dos
  cosas. Se quito: ofrecia como modo algo que ya estaba disponible siempre.

  La pose NO se pierde sola. Antes cualquier desplazamiento de la pagina la
  devolvia a la diagonal; ahora se queda donde la dejaron hasta que alguien pulse
  "Reset view", que aparece solo cuando hay algo que reiniciar. Es parte del mismo
  cambio del 2026-09-12: el estuche se queda donde esta.
  ---------------------------------------------------------------------------
*/

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

/* Topes del acercamiento. Por debajo de 0.55 el estuche es una astilla; por
   encima de 3.2 se ve el poligono del relleno y deja de convencer. Con el `.glb`
   real el tope de arriba se puede subir. */
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 3.2;

/* Cuanto gira por pixel arrastrado. */
const YAW_PER_PX = 0.007;
const PITCH_PER_PX = 0.006;

interface CaseSceneProps {
  colorHex: string;
  open: boolean;
  /* Falso cuando el hero salio de pantalla: con esto se apaga el bucle de
     dibujo y la escena deja de gastar bateria mientras se lee el resto. */
  active: boolean;
  /* Sube cada vez que alguien pide "Reset view". */
  resetSignal: number;
  onGrabChange?: (grabbing: boolean) => void;
  /* Verdadero en cuanto el estuche deja su pose de reposo. Lo usa la consola
     para ensenar o esconder "Reset view". */
  onPoseDirty?: (dirty: boolean) => void;
}

export function CaseScene({
  colorHex,
  open,
  active,
  resetSignal,
  onGrabChange,
  onPoseDirty,
}: CaseSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 19], fov: 32 }}
      /*
        `pan-y` es todo el reparto de gestos del telefono, en una linea: el dedo
        que arranca hacia abajo se lo queda la pagina y el que arranca de lado nos
        lo entrega entero. Los dos dedos llegan siempre.
      */
      style={{ touchAction: "pan-y" }}
    >
      <Lighting />
      <CaseRig
        colorHex={colorHex}
        open={open}
        resetSignal={resetSignal}
        onGrabChange={onGrabChange}
        onPoseDirty={onPoseDirty}
      />
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
  resetSignal,
  onGrabChange,
  onPoseDirty,
}: {
  colorHex: string;
  open: boolean;
  resetSignal: number;
  onGrabChange?: (grabbing: boolean) => void;
  onPoseDirty?: (dirty: boolean) => void;
}) {
  const gl = useThree((state) => state.gl);

  /*
    Cuatro grupos, de fuera hacia dentro, y cada uno hace UNA cosa. Mezclarlos
    fue el error de la primera version: el acercamiento se comia el encaje
    automatico y en telefono el estuche se salia de la pantalla.

      user   lo que hace el comprador: acercar y mover
      fit    el encaje automatico a la pantalla, que nadie controla
      tilt   la diagonal
      spin   los giros
  */
  const user = useRef<THREE.Group>(null);
  const fit = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);

  /* Momento en que arranco la entrada. Se toma en el primer fotograma y no al
     construir el componente: el reloj de la escena es la unica fuente de tiempo
     que existe tanto en el servidor como en el navegador. */
  const startedAt = useRef<number | null>(null);

  /* Lo que puso el comprador. Se queda donde lo dejaron hasta "Reset view". */
  const dragYaw = useRef(0);
  const dragPitch = useRef(0);
  const zoom = useRef(1);
  const panX = useRef(0);
  const panY = useRef(0);

  /* Los valores a los que se va acercando cada fotograma. Todo lo que toca el
     comprador entra por aqui y no directo en el grupo: asi cada gesto llega
     amortiguado y ningun salto se ve brusco. */
  const zoomTarget = useRef(1);
  const panXTarget = useRef(0);
  const panYTarget = useRef(0);

  const dragging = useRef(false);
  const resetting = useRef(false);
  const poseDirty = useRef(false);

  /* Seguimiento del cursor, ya suavizado. */
  const pointer = useRef({ x: 0, y: 0 });
  const smoothPointer = useRef({ x: 0, y: 0 });

  /* Vuelta entera al cambiar de color. */
  const flourish = useRef(0);
  const flourishTarget = useRef(0);
  const firstColor = useRef(true);

  const reducedMotion = useRef(false);

  /* Cuantas unidades del mundo mide un pixel de pantalla. Lo calcula el bucle en
     cada fotograma y lo leen los gestos, que corren fuera de el. */
  const worldPerPixel = useRef(0.02);
  /* Medio ancho y medio alto visibles: los topes del movimiento. */
  const halfViewport = useRef({ x: 10, y: 6 });

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

  /* -------------------------------------------------------------- reinicio */

  const markDirty = (dirty: boolean) => {
    if (poseDirty.current === dirty) return;
    poseDirty.current = dirty;
    onPoseDirty?.(dirty);
  };

  /* El primer `resetSignal` es el valor inicial y no significa que nadie haya
     pulsado nada, asi que se deja pasar. */
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    resetting.current = true;
    zoomTarget.current = 1;
    panXTarget.current = 0;
    panYTarget.current = 0;
  }, [resetSignal]);

  /* ------------------------------------------------------------- los gestos */

  /*
    Todos los gestos se escuchan en el lienzo, no en la malla del estuche. Con el
    trazado de rayos habria que acertarle al objeto para poder girarlo, y en
    telefono, con el estuche en diagonal y delgado, se falla la mitad de las
    veces. Aqui se agarra el aire alrededor y funciona igual.
  */
  useEffect(() => {
    const canvas = gl.domElement;

    /* Punteros vivos. Con uno se gira o se mueve; con dos se acerca. */
    const active = new Map<number, { x: number; y: number }>();
    let mode: "none" | "rotate" | "pan" = "none";
    let last = { x: 0, y: 0 };
    let pinchDistance = 0;
    let pinchMid = { x: 0, y: 0 };

    const clampPan = () => {
      panXTarget.current = THREE.MathUtils.clamp(
        panXTarget.current,
        -halfViewport.current.x,
        halfViewport.current.x,
      );
      panYTarget.current = THREE.MathUtils.clamp(
        panYTarget.current,
        -halfViewport.current.y,
        halfViewport.current.y,
      );
    };

    const centreOf = (points: { x: number; y: number }[]) => ({
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    });

    const onPointerDown = (event: PointerEvent) => {
      /* En telefono, con Inspect apagado, el lienzo solo se queda con el dedo si
         el navegador se lo deja: `touch-action: pan-y` ya reparte el gesto. */
      canvas.setPointerCapture(event.pointerId);
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (active.size === 1) {
        /* Mayus, boton central o boton derecho: mover en vez de girar. */
        mode = event.shiftKey || event.button === 1 || event.button === 2
          ? "pan"
          : "rotate";
        last = { x: event.clientX, y: event.clientY };
        dragging.current = true;
        resetting.current = false;
        onGrabChange?.(true);
      } else if (active.size === 2) {
        const points = [...active.values()];
        pinchDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        pinchMid = centreOf(points);
        mode = "pan";
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!active.has(event.pointerId)) return;
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (active.size >= 2) {
        /* Dos dedos: la separacion acerca y el punto medio mueve. */
        const points = [...active.values()];
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        const mid = centreOf(points);

        if (pinchDistance > 0) {
          zoomTarget.current = THREE.MathUtils.clamp(
            zoomTarget.current * (distance / pinchDistance),
            ZOOM_MIN,
            ZOOM_MAX,
          );
        }

        panXTarget.current += (mid.x - pinchMid.x) * worldPerPixel.current;
        panYTarget.current -= (mid.y - pinchMid.y) * worldPerPixel.current;
        clampPan();

        pinchDistance = distance;
        pinchMid = mid;
        markDirty(true);
        return;
      }

      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };

      if (mode === "pan") {
        panXTarget.current += dx * worldPerPixel.current;
        panYTarget.current -= dy * worldPerPixel.current;
        clampPan();
      } else if (mode === "rotate") {
        /* El giro es acumulativo y sin tope: se le puede dar la vuelta entera
           tantas veces como haga falta. El cabeceo si se topa, porque pasado el
           limite el estuche se pone de canto y deja de leerse como un objeto. */
        dragYaw.current += dx * YAW_PER_PX;
        dragPitch.current = THREE.MathUtils.clamp(
          dragPitch.current + dy * PITCH_PER_PX,
          -1.4,
          1.4,
        );
      }

      markDirty(true);
    };

    const onPointerUp = (event: PointerEvent) => {
      active.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (active.size === 1) {
        /* Se solto un dedo de los dos: el que queda sigue, girando. */
        const [remaining] = [...active.values()];
        last = { ...remaining };
        mode = "rotate";
        pinchDistance = 0;
        return;
      }

      if (active.size === 0) {
        mode = "none";
        dragging.current = false;
        pinchDistance = 0;
        onGrabChange?.(false);
      }
    };

    /*
      La rueda acerca. El oyente va en el lienzo y a mano, no por React: React
      registra `wheel` como pasivo y desde ahi `preventDefault` no hace nada, asi
      que la pagina se desplazaria mientras se intenta acercar.
    */
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const step = Math.exp(-event.deltaY * 0.0012);
      zoomTarget.current = THREE.MathUtils.clamp(
        zoomTarget.current * step,
        ZOOM_MIN,
        ZOOM_MAX,
      );
      resetting.current = false;
      markDirty(true);
    };

    /* Doble clic o doble toque: a su sitio. */
    const onDoubleClick = () => {
      resetting.current = true;
      zoomTarget.current = 1;
      panXTarget.current = 0;
      panYTarget.current = 0;
    };

    /* Sin esto, el boton derecho abre el menu del navegador en mitad del gesto
       de mover. */
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    /*
      Guardas para los dos dedos, y solo para los dos dedos.

      `touch-action: pan-y` reparte bien el dedo suelto, pero no dice nada del
      acercamiento de pellizco: Safari en iPhone lo entiende como acercar la
      PAGINA entera, porque la etiqueta de ventana de Next deja escalar. Estas dos
      guardas se lo quitan de las manos sin tocar el dedo suelto, que es el que
      baja la pagina y tiene que seguir siendo del navegador.

      `touchmove` va con `passive: false` a proposito: registrado como pasivo,
      `preventDefault` no hace nada. Solo corta cuando hay dos dedos o mas.

      `gesturestart` y `gesturechange` son de Safari y no existen en el resto; van
      con el nombre en crudo porque TypeScript no los conoce.
    */
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) event.preventDefault();
    };
    const onSafariGesture = (event: Event) => event.preventDefault();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("gesturestart", onSafariGesture);
    canvas.addEventListener("gesturechange", onSafariGesture);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("gesturestart", onSafariGesture);
      canvas.removeEventListener("gesturechange", onSafariGesture);
    };
    /* Solo el lienzo. `markDirty` se deja fuera a proposito: volver a montar los
       oyentes en mitad de un gesto lo cortaria, y lo unico que cierra encima es
       una devolucion de llamada estable. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

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

    const { width, height } = state.viewport;
    worldPerPixel.current = width / state.size.width;
    halfViewport.current = { x: width * 0.45, y: height * 0.45 };

    /* --------------------------------------------- lo que puso el comprador */

    if (user.current) {
      zoom.current = THREE.MathUtils.damp(
        zoom.current,
        zoomTarget.current,
        resetting.current ? 5 : 9,
        delta,
      );
      panX.current = THREE.MathUtils.damp(
        panX.current,
        panXTarget.current,
        resetting.current ? 5 : 12,
        delta,
      );
      panY.current = THREE.MathUtils.damp(
        panY.current,
        panYTarget.current,
        resetting.current ? 5 : 12,
        delta,
      );

      user.current.scale.setScalar(zoom.current);
      user.current.position.set(panX.current, panY.current, 0);
    }

    /* Vuelta a la pose de reposo. Solo se hace cuando alguien lo pidio; el
       estuche ya no se recoloca solo por desplazar la pagina. */
    if (resetting.current && !dragging.current) {
      dragYaw.current = THREE.MathUtils.damp(dragYaw.current, 0, 4, delta);
      dragPitch.current = THREE.MathUtils.damp(dragPitch.current, 0, 4, delta);

      const settled =
        Math.abs(dragYaw.current) < 0.004 &&
        Math.abs(dragPitch.current) < 0.004 &&
        Math.abs(zoom.current - 1) < 0.004 &&
        Math.abs(panX.current) < 0.01 &&
        Math.abs(panY.current) < 0.01;

      if (settled) {
        dragYaw.current = 0;
        dragPitch.current = 0;
        zoom.current = 1;
        panX.current = 0;
        panY.current = 0;
        resetting.current = false;
        markDirty(false);
      }
    }

    /* -------------------------------------------------------------- encaje */

    /* El estuche mide diez unidades de largo; puesto en diagonal ocupa casi
       tanto de alto como de ancho, y en movil manda el ancho. Se recalcula en
       cada fotograma porque tambien depende de si esta abierto, que es cuando
       mas ancho pide. */
    if (fit.current) {
      const openFactor = open ? 2.1 : 1;
      const needHeight = CASE_LENGTH * Math.cos(DIAGONAL) * 1.16;
      const needWidth =
        (CASE_LENGTH * Math.abs(Math.sin(DIAGONAL)) + 1.5 * openFactor) * 1.16;

      /*
        El estuche no se reparte el sitio con el panel de compra: se aparta.

        En vertical el panel es una barra que se come el tercio de abajo, asi que
        el estuche se encoge a la altura que queda libre y sube para quedar
        centrado en ese hueco. En escritorio el panel esta de pie a la derecha, asi
        que lo que sobra no es alto sino ancho: el estuche se queda casi entero de
        alto y se corre a la izquierda, al centro de lo que el panel deja libre.
      */
      const portrait = width < height * 0.8;
      const usableHeight = height * (portrait ? 0.6 : 0.8);
      /* Ancho del panel mas su margen, en unidades del mundo. Sale de los mismos
         320 px + 24 que fija `globals.css`. */
      const panel = portrait ? 0 : (344 / state.size.width) * width;
      const usableWidth = (width - panel) * 0.96;

      const scale = Math.min(usableHeight / needHeight, usableWidth / needWidth);

      fit.current.scale.setScalar(
        THREE.MathUtils.damp(fit.current.scale.x, scale, 6, delta),
      );
      fit.current.position.y = THREE.MathUtils.damp(
        fit.current.position.y,
        portrait ? height * 0.16 : height * 0.02,
        6,
        delta,
      );
      fit.current.position.x = THREE.MathUtils.damp(
        fit.current.position.x,
        -panel / 2,
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
       nadie lo toca. Se apaga mientras se le tiene agarrado, porque sumada al
       arrastre se siente como si el estuche se resbalara. */
    const drift =
      reducedMotion.current || dragging.current
        ? 0
        : Math.sin(now * 0.35) * 0.045;

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

    /* El seguimiento del cursor se aparta mientras hay un gesto en marcha: si no,
       el mismo raton que arrastra esta empujando por dos vias a la vez. */
    const follow = dragging.current ? 0 : 1;

    spin.current.rotation.y =
      REST_YAW +
      openYaw +
      introSpin +
      flourish.current +
      dragYaw.current +
      smoothPointer.current.x * 0.12 * follow +
      drift;

    spin.current.rotation.x =
      REST_PITCH +
      dragPitch.current +
      smoothPointer.current.y * 0.08 * follow;
  });

  return (
    <group ref={user}>
      <group ref={fit}>
        <group ref={tilt}>
          <group ref={spin}>
            <CaseModel colorHex={colorHex} open={open} />
          </group>
        </group>
      </group>
    </group>
  );
}
