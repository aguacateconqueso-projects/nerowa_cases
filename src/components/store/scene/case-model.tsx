"use client";

/*
  El estuche. MARCADOR DE POSICION hasta que llegue el `.glb` real.

  Lo unico que este archivo promete es la interfaz: recibe un color y una vista,
  y se abre o se cierra solo. El dia que exista el modelo de verdad, esta pieza
  se reemplaza por un `useGLTF` que pinte el mismo color en su material y gire
  su tapa; nada de lo que hay alrededor (camara, luz, arrastre, fondo) cambia.

  La tapa gira sobre la bisagra del canto largo derecho. Media vuelta completa
  la deja plana al lado de la base, como en la foto del estuche abierto.
*/

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  BASE_DEPTH,
  CASE_HALF_WIDTH,
  LID_DEPTH,
  buildCaseHole,
  buildCaseOutline,
  getWeaveTexture,
} from "./case-shape";

/* Cuanto del ancho interior se come la pared de la carcasa. */
const WALL = 0.8;
const INNER_LENGTH = 0.975;

interface CaseModelProps {
  colorHex: string;
  open: boolean;
}

export function CaseModel({ colorHex, open }: CaseModelProps) {
  const lidPivot = useRef<THREE.Group>(null);
  const recenter = useRef<THREE.Group>(null);
  const openAmount = useRef(0);

  const weave = useMemo(() => getWeaveTexture(), []);

  /* Contorno macizo para las tapas, y contorno con hueco para las paredes. */
  const solid = useMemo(() => buildCaseOutline(1), []);
  const shell = useMemo(() => {
    const shape = buildCaseOutline(1);
    shape.holes.push(buildCaseHole(WALL, INNER_LENGTH));
    return shape;
  }, []);
  const lining = useMemo(
    () => buildCaseOutline(WALL - 0.04, INNER_LENGTH - 0.01),
    [],
  );

  const wallExtrude = useMemo(
    () => ({ depth: 1, bevelEnabled: false }),
    [],
  );
  const faceExtrude = useMemo(
    () => ({
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 5,
    }),
    [],
  );
  const flatExtrude = useMemo(
    () => ({ depth: 0.04, bevelEnabled: false }),
    [],
  );

  useFrame((_, delta) => {
    const target = open ? 1 : 0;
    /* `damp` es independiente de los fotogramas: la apertura tarda lo mismo a
       120 Hz que a 30. */
    openAmount.current = THREE.MathUtils.damp(
      openAmount.current,
      target,
      3.2,
      delta,
    );

    if (lidPivot.current) {
      lidPivot.current.rotation.y = openAmount.current * Math.PI;
    }
    if (recenter.current) {
      /* Al abrirse el conjunto crece hacia la derecha; esto lo devuelve al eje. */
      recenter.current.position.x = -CASE_HALF_WIDTH * openAmount.current;
    }
  });

  return (
    <group ref={recenter}>
      {/* ----------------------------------------------------------- base */}
      <group position={[0, 0, -BASE_DEPTH]}>
        {/* Paredes. */}
        <mesh scale={[1, 1, BASE_DEPTH]}>
          <extrudeGeometry args={[shell, wallExtrude]} />
          <ShellMaterial colorHex={colorHex} weave={weave} />
        </mesh>
        {/* Fondo. */}
        <mesh position={[0, 0, -0.02]}>
          <extrudeGeometry args={[solid, faceExtrude]} />
          <ShellMaterial colorHex={colorHex} weave={weave} />
        </mesh>
        {/* Forro y dos canales para los arcos. */}
        <mesh position={[0, 0, 0.1]}>
          <extrudeGeometry args={[lining, flatExtrude]} />
          <meshStandardMaterial color="#202024" roughness={1} />
        </mesh>
        <BowChannels />
      </group>

      {/* ------------------------------------------------------------ tapa */}
      <group ref={lidPivot} position={[CASE_HALF_WIDTH, 0, 0]}>
        <group position={[-CASE_HALF_WIDTH, 0, 0]}>
          <mesh scale={[1, 1, LID_DEPTH]}>
            <extrudeGeometry args={[shell, wallExtrude]} />
            <ShellMaterial colorHex={colorHex} weave={weave} />
          </mesh>
          <mesh position={[0, 0, LID_DEPTH - 0.08]}>
            <extrudeGeometry args={[solid, faceExtrude]} />
            <ShellMaterial colorHex={colorHex} weave={weave} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <extrudeGeometry args={[lining, flatExtrude]} />
            <meshStandardMaterial color="#202024" roughness={1} />
          </mesh>
          <Plaque />
        </group>
      </group>

      {/* Banda negra de la costura: es lo que en las fotos separa tapa de base
          y lo que le da al estuche su linea horizontal. Va fija a la base para
          que al abrirse quede con ella. */}
      <mesh position={[0, 0, -0.045]} scale={[1.012, 1.002, 0.09]}>
        <extrudeGeometry args={[solid, wallExtrude]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.55} />
      </mesh>

      <Hardware />
    </group>
  );
}

/* ------------------------------------------------------------------ material */

/*
  La carcasa. El trenzado no pinta color: modula la rugosidad, que es lo que
  quiebra la luz en diagonal como en las fotos. El barniz (`clearcoat`) es la
  capa brillante de encima, la que hace el reflejo duro sobre el color mate.
*/
function ShellMaterial({
  colorHex,
  weave,
}: {
  colorHex: string;
  weave: THREE.Texture | null;
}) {
  return (
    <meshPhysicalMaterial
      color={colorHex}
      roughness={0.45}
      roughnessMap={weave}
      metalness={0.05}
      clearcoat={1}
      clearcoatRoughness={0.16}
      sheen={0.12}
      sheenColor="#ffffff"
    />
  );
}

/* ------------------------------------------------------------------ interior */

function BowChannels() {
  return (
    <group position={[0, 0, 0.13]}>
      {/* Tabique central entre los dos arcos. */}
      {/* La varilla que separa los dos arcos. Es lo unico claro del interior:
          sin ella el hueco se lee como una mancha negra y no como un interior. */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.08, 8.6, 0.1]} />
        <meshStandardMaterial color="#6e6e76" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Cintas de sujecion. */}
      {[-3, 0, 3].map((y) => (
        <mesh key={y} position={[0, y, 0.07]}>
          <boxGeometry args={[0.62, 0.34, 0.05]} />
          <meshStandardMaterial color="#0b0b0c" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ herrajes */

/*
  Cierres y anillas en el canto de delante, que es el opuesto a la bisagra.
  Formas simples a proposito: su trabajo aqui es romper la silueta y dar algo
  metalico a lo que agarrarse la luz, no parecerse al herraje real.
*/
function Hardware() {
  const latches = [-3.6, -1.15, 1.15, 3.6];
  const rings = [-2.3, 2.3];

  return (
    <group position={[-CASE_HALF_WIDTH * 0.97, 0, -0.04]}>
      {latches.map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.16, 0.42, 0.3]} />
          <meshStandardMaterial color="#191919" roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
      {rings.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.12, 0.035, 8, 20]} />
          <meshStandardMaterial color="#232323" roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* La placa de la marca en la tapa. Sin texto: la tipografia llega con el
   modelo real, y una letra falsa en 3D se nota mas que su ausencia. */
function Plaque() {
  return (
    <mesh position={[0, 3.15, LID_DEPTH + 0.03]}>
      <boxGeometry args={[0.82, 0.3, 0.03]} />
      <meshStandardMaterial color="#0c0c0c" roughness={0.45} />
    </mesh>
  );
}
