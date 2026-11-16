"use client";

/*
  El estuche real: el `.glb` hecho en Blender a partir de las medidas y las fotos
  del case. Lo usan `/store` y `/shop` por igual, a traves de `CaseScene`.

  La interfaz no cambio: recibe un color y si esta abierto, y nada de lo que hay
  alrededor (camara, luz, arrastre, zoom, la vuelta al cambiar de color) sabe
  que el estuche ahora es un archivo.

  ---------------------------------------------------------------------------
  CARGA PROGRESIVA (el trafico llega de Instagram, en telefono, con datos)

    1. Al instante se ve `ProceduralCase`, el estuche dibujado con codigo: no
       pide ningun archivo.
    2. Cuando el `.glb` termina de bajar y de descomprimirse, lo reemplaza.
    3. Si el `.glb` falla, se queda el de codigo y la tienda vende igual.

  El decodificador Draco se sirve desde `/draco/` (copiado de
  `three/examples/jsm/libs/draco/gltf`). No se usa el CDN de Google.

  ---------------------------------------------------------------------------
  DEL GLB A LA ESCENA

  El `.glb` viene en metros, con Y hacia arriba (lo normal en glTF):
    largo 0.814 m sobre Z (punta ancha hacia -Z), grosor 0.065 m sobre +Y
    (piso de la base en y=0, junta base/tapa en y=0.030), bisagras en -X y
    cierres en +X.

  La escena espera otra cosa (la que fijo el estuche de codigo): largo sobre Y
  y 10 unidades, grosor sobre Z con la tapa hacia la camara, y la junta en z=0.
  Las tres operaciones de abajo hacen el cambio, de dentro hacia fuera:

    JOINT_Y   baja el modelo 0.030 m para que la junta quede en el origen
    ROT_X     +90 grados en X: el grosor (+Y) pasa a +Z, hacia la camara, y la
              punta ancha (-Z) pasa a +Y, arriba, como en el estuche de codigo
    SCALE     10 / 0.814: el largo pasa a medir 10 unidades

  Nunca se espeja con escala negativa: el case real es asimetrico.

  ---------------------------------------------------------------------------
  ABRIR Y CERRAR

  El `.glb` trae una sola animacion, `abrir` (2.4 s): primero bajan las palancas
  de los dos cierres y se sueltan los ganchos, despues la tapa gira 180 grados
  sobre las bisagras. Abrir es reproducirla hacia adelante; cerrar, hacia atras
  (`timeScale = -1`), siempre desde donde este, asi que pulsar varias veces
  seguidas no da saltos.

  Al abrirse, el conjunto crece hacia el lado de la bisagra. `recenter` lo
  devuelve al eje, en la misma medida en que la tapa ya giro (se lee del propio
  `lid_pivot`, no del tiempo de la animacion: durante la fase de los cierres la
  tapa no se mueve y el estuche tampoco debe moverse).
*/

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { CASE_LENGTH } from "./case-shape";
import { ProceduralCase } from "./procedural-case";

export const CASE_GLB = "/models/nerowa_case_draco.glb";
const DRACO_PATH = "/draco/";

/* Medidas del `.glb`, en metros. */
const GLB_LENGTH = 0.814;
const JOINT_Y = 0.03;

const SCALE = CASE_LENGTH / GLB_LENGTH;
const ROT_X = Math.PI / 2;

/* El unico material que se tine. */
const SHELL_MATERIAL = "shell";
const OPEN_CLIP = "abrir";

/*
  La descarga arranca al cargar este modulo, no cuando se monta el lienzo. En
  `/shop` el lienzo del hero espera a que termine la entrada (casi dos
  segundos): ese tiempo se aprovecha bajando el `.glb`. Solo en el navegador; en
  el servidor no hay nada que descargar.
*/
if (typeof window !== "undefined") {
  useGLTF.preload(CASE_GLB, DRACO_PATH, false);
}

interface CaseModelProps {
  colorHex: string;
  open: boolean;
}

export function CaseModel(props: CaseModelProps) {
  const fallback = <ProceduralCase {...props} />;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfCase {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/* ----------------------------------------------------------- el modelo real */

function GltfCase({ colorHex, open }: CaseModelProps) {
  const { scene, animations } = useGLTF(CASE_GLB, DRACO_PATH, false);

  /*
    Copia propia de la escena y de la cascara. En `/shop` puede haber dos
    lienzos a la vez (telefono: hero y seccion de color), y un mismo objeto de
    three no puede vivir en dos escenas. La cascara se clona para que teñir un
    lienzo no tina el otro por debajo.
  */
  const { root, shell, lidPivot, lidRest } = useMemo(() => {
    const copy = scene.clone(true);
    let shellMaterial: THREE.MeshPhysicalMaterial | null = null;

    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.Material;
      if (material.name !== SHELL_MATERIAL) return;
      shellMaterial ??= (material as THREE.MeshPhysicalMaterial).clone();
      mesh.material = shellMaterial;
    });

    const pivot = copy.getObjectByName("lid_pivot") ?? null;
    return {
      root: copy,
      shell: shellMaterial as THREE.MeshPhysicalMaterial | null,
      lidPivot: pivot,
      /* La tapa cerrada, tal como viene en el archivo. El giro se mide contra
         esto y no contra cero: el pivote puede traer una rotacion de reposo. */
      lidRest: pivot ? pivot.quaternion.clone() : null,
    };
  }, [scene]);

  /* El eje de las bisagras, en las unidades del `.glb`. De aqui sale cuanto hay
     que correr el par abierto para devolverlo al centro. */
  const hingeX = lidPivot?.position.x ?? 0;

  useLayoutEffect(() => {
    shell?.color.set(colorHex);
  }, [shell, colorHex]);

  const recenter = useRef<THREE.Group>(null);

  /*
    El mezclador y la accion viven en refs y se crean en un efecto: son objetos
    de three que se mutan en cada fotograma, y lo que devuelve un hook React lo
    trata como inmutable.
  */
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  /* Lo ultimo que se pidio. El efecto del mezclador lo lee al crearse, para
     que el estuche llegue ya en la vista elegida. */
  const openRef = useRef(open);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(root);
    const clip = THREE.AnimationClip.findByName(animations, OPEN_CLIP);
    if (!clip) {
      console.warn(`[nerowa] El .glb no trae la animacion "${OPEN_CLIP}".`);
      return;
    }
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;

    /* Sin animar: la accion se deja pausada en el extremo que toca. */
    action.play();
    action.paused = true;
    action.time = openRef.current ? clip.duration : 0;
    mixer.update(0);

    mixerRef.current = mixer;
    actionRef.current = action;
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      mixerRef.current = null;
      actionRef.current = null;
    };
  }, [root, animations]);

  useEffect(() => {
    if (openRef.current === open) return;
    openRef.current = open;

    const action = actionRef.current;
    const mixer = mixerRef.current;
    if (!action || !mixer) return;

    /* Con menos movimiento pedido, directo al final. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      action.paused = true;
      action.time = open ? action.getClip().duration : 0;
      mixer.update(0);
      return;
    }

    /* Desde donde este, hacia donde toque. Si estaba terminada y clavada en un
       extremo, `paused` la tiene quieta: se suelta y se le da la direccion.
       A medio camino, solo se le da la vuelta: nunca salta. */
    action.enabled = true;
    action.paused = false;
    action.timeScale = open ? 1 : -1;
    if (!action.isScheduled()) action.play();
  }, [open]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    if (!recenter.current || !lidPivot || !lidRest) return;
    /* Cuanto giro la tapa, de 0 (cerrada) a 1 (media vuelta). */
    const turned = Math.min(lidRest.angleTo(lidPivot.quaternion) / Math.PI, 1);
    /* Hacia el lado contrario a la bisagra. */
    recenter.current.position.x = -hingeX * SCALE * turned;
  });

  return (
    <group ref={recenter}>
      <group scale={SCALE} rotation-x={ROT_X}>
        <group position-y={-JOINT_Y}>
          <primitive object={root} />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------- si el archivo falla */

/*
  Un `.glb` que no carga (red cortada, archivo movido, decodificador ausente)
  tira un error desde `useGLTF`. Sin esto, el error tumba el lienzo entero y la
  tienda se queda sin estuche; con esto, se queda el de codigo.
*/
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[nerowa] El estuche 3D no cargo; se usa el de respaldo.", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
