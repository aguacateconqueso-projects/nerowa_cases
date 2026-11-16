"use client";

/*
  Un lienzo con el case quieto, en la pose de reposo del visor, sobre fondo
  transparente. `preserveDrawingBuffer` deja que la captura lea el lienzo.

  Cuando el `.glb` termino de cargar (y no el case de respaldo), escribe
  `data-ready` en el lienzo: es lo que espera el guion para disparar.
*/

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

import { colorById } from "@/lib/store/catalog";
import { CaseModel, CASE_GLB } from "@/components/store/scene/case-model";
import { Lighting, REST_PITCH, REST_YAW } from "@/components/store/scene/case-scene";

/* Lo mismo que hace el visor al abrir: ponerse un poco mas de frente. */
const OPEN_YAW = 0.45;

export function RenderCase({ colorId, open }: { colorId: string; open: boolean }) {
  const color = colorById(colorId);

  return (
    <div style={{ width: open ? 900 : 560, height: 1400 }}>
      <Canvas
        id="studio"
        /* Abierto, a doble resolucion: es la foto que la seccion oscura de
           `/shop` ensena a casi toda la altura de la pantalla. */
        dpr={open ? 2 : 1}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 19], fov: 32 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Lighting />
        <group rotation={[REST_PITCH, REST_YAW + (open ? OPEN_YAW : 0), 0]}>
          <CaseModel colorHex={color.hex} open={open} />
        </group>
        <Suspense fallback={null}>
          <ReadyFlag />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* Se monta cuando el `.glb` ya esta en cache: entonces el case real esta en la
   escena. Espera un momento mas para que pase un par de cuadros. */
function ReadyFlag() {
  useGLTF(CASE_GLB, "/draco/", false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById("studio")?.setAttribute("data-ready", "1");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
