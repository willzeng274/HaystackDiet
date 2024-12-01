'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, PointerLockControls, Sky } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react'
import { Ground } from './ground';
import { Table } from './models/table';
import * as THREE from 'three';
import Walls from './walls';
import { Fence } from './models/fence';
import { Barn } from './models/barn';
import { BathroomSign } from './models/bathroom';
import Animated from './animated';
import useHorseStore, { Restriction, useFoodStore } from './store';
import { Food } from './models/food';
import { Food as IFood } from './store';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { House } from './models/house';
import { Cinema } from './models/cinema';
import { FarmHouse } from './models/farm_house';
import { Silo } from './models/silo';
import { Walkway } from './models/walkway';
import { Road } from './models/road';

const Crosshair = () => (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    }}
  >
    <div
      style={{
        width: '2px',
        height: '20px',
        background: 'white',
      }}
    />
    <div
      style={{
        width: '20px',
        height: '2px',
        background: 'white',
        position: 'absolute',
      }}
    />
  </div>
);


const CameraController = ({ bounds, speed = 0.2 }: { bounds: { x: [number, number], z: [number, number] }, speed?: number }) => {
  const movement = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const cameraRef = useThree((state) => state.camera);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') movement.current.forward = true;
      if (event.code === 'KeyS') movement.current.backward = true;
      if (event.code === 'KeyA') movement.current.left = true;
      if (event.code === 'KeyD') movement.current.right = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') movement.current.forward = false;
      if (event.code === 'KeyS') movement.current.backward = false;
      if (event.code === 'KeyA') movement.current.left = false;
      if (event.code === 'KeyD') movement.current.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!cameraRef) return;

    const camera = cameraRef;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const speed2 = delta * 50 * speed;

    const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

    const isMovingDiagonally =
      (movement.current.forward || movement.current.backward) &&
      (movement.current.left || movement.current.right);

    const adjustedSpeed = isMovingDiagonally ? speed2 * 0.7 : speed2;

    if (movement.current.forward) {
      camera.position.add(forward.clone().multiplyScalar(adjustedSpeed));
    }
    if (movement.current.backward) {
      camera.position.add(forward.clone().multiplyScalar(-adjustedSpeed));
    }
    if (movement.current.left) {
      camera.position.add(right.clone().multiplyScalar(adjustedSpeed));
    }
    if (movement.current.right) {
      camera.position.add(right.clone().multiplyScalar(-adjustedSpeed));
    }

    camera.position.x = Math.max(bounds.x[0], Math.min(bounds.x[1], camera.position.x));
    camera.position.z = Math.max(bounds.z[0], Math.min(bounds.z[1], camera.position.z));
  });

  return null;
};

function HorseSystem() {
  const queueNewHorse = useHorseStore((state) => state.queueNewHorse);
  useFrame((state, delta) => {
    if (state.clock.elapsedTime % 1 < delta) {
      queueNewHorse();
    }
  });
  return null;
}

function MySky() {
  const [sunPosition, setSunPosition] = useState([100, 20, 100]); // Initial position
  const sunAngle = useRef(0); // Tracks the angle of rotation

  useFrame((state, delta) => {
    const speed = Math.PI * 2 * 0.01; // Adjust the 0.1 multiplier for faster/slower cycles
    sunAngle.current = (sunAngle.current + speed * delta) % (Math.PI * 2); // Ensure angle wraps around
    const x = 100 * Math.cos(sunAngle.current); // Circular trajectory
    const y = 50 * Math.sin(sunAngle.current); // Adjust for vertical motion
    const z = 100 * Math.sin(sunAngle.current);
    setSunPosition([x, y, z]);
  });

  return (
    <Sky sunPosition={sunPosition as [number, number, number]} />
  );
}

function FloatingText() {
  const cameraRef = useRef<THREE.Group>();
  const currFoods = useFoodStore((state) => state.currFoods);
  const currFood = useHorseStore((state) => state.currFood);

  useFrame(({ camera }) => {
    if (cameraRef.current) {
      cameraRef.current.position.copy(camera.position); // Follow camera position
      cameraRef.current.rotation.copy(camera.rotation); // Follow camera rotation
    }
  });

  return currFoods[currFood as Restriction] && (
    <group ref={cameraRef}>
      <group position={[2, -0.6, -2]}>
        <Html transform>
          <div
            style={{
              fontSize: '16px',
              color: 'white',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '10px',
              borderRadius: '5px',
            }}
          >
            {currFoods[currFood as Restriction].name}
          </div>
        </Html>
      </group>
    </group>
  );
}

export default function Game() {
  const horses = useHorseStore((state) => state.horses);
  const servedHorses = useHorseStore((state) => state.servedHorses);
  const dialogueActive = useHorseStore((state) => state.dialogueActive);
  const setCurrentFood = useHorseStore((state) => state.setCurrFood);
  const currFoods = useFoodStore((state) => state.currFoods);
  const currFood = useHorseStore((state) => state.currFood);
  const health = useHorseStore((state) => state.health);
  const score = useHorseStore((state) => state.score);

  const foods = useMemo(() => Object.entries(currFoods).sort(() => Math.random() - 0.5) as [Restriction, IFood][], [currFoods]);

  // useEffect(() => {
  //   console.log(servedHorses);
  // }, [servedHorses]);

  return (
    <div className="w-screen h-screen">
      {dialogueActive && (
        // can you make this bottom center fixed with relative content width and min width
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/50 px-4 pb-4 rounded-lg min-w-[300px] w-[50%] max-w-[800px] z-[9999]">
          <TextGenerateEffect className="text-white" words={`Hello! I would like to get something ${horses[0].restriction.toLowerCase()} please and thanks.`} />
        </div>
      )}
      {/* top right displaying a heart + number (health), and curr food */}
      <div className="fixed top-4 right-4 flex items-center z-[9999]">
        <span className="text-white mr-4">🏆 {score}</span>
        <span className="text-white mr-4">❤️ {health}</span>
        <span className="text-white">🍔 {currFood ? currFoods[currFood].name : "Nothing"}</span>
      </div>
      <Crosshair />
      <Canvas
        camera={{ fov: 90, position: [0, 2.5, 0] }}
        shadows
      >
        <Suspense fallback={null}>
          <House position={[-10, 5, -15]} rotation={[0, -Math.PI / 2, 0]} scale={10} />
          <Cinema position={[-40, 0, 10]} rotation={[0, Math.PI / 2, 0]} />
          <FarmHouse position={[0, 0, 25]} scale={0.8} />
          {
            Array.from({ length: 20}).map((_, i) => <Walkway position={[-4 - 1.6 * i, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} />)
          }
          {
            Array.from({ length: 40}).map((_, i) => <Walkway position={[-35, 0.1, 1.6 * (i+1)]} rotation={[0, Math.PI / 2, 0]} />)
          }
          <Road position={[0, 0.5, 0]} />
          {/* {
            Array.from({ length: 20 }).map((_, i) => <Road position={[0, 0.1, 0]} />)
          } */}
          <Silo position={[10, 0, 10]} scale={1.3} />
          <Silo position={[10, 0, 5]} scale={1.3} />
          <Silo position={[10, 0, 0]} scale={1.3} />
          <Silo position={[10, 0, -5]} scale={1.3} />
          <Silo position={[10, 0, -10]} scale={1.3} />
          {/* <OrbitControls /> */}
          <HorseSystem />
          <CameraController
            bounds={{ x: [-1, 1], z: [-4, 4] }}
          />
          <PointerLockControls pointerSpeed={2} />
          <Perf position="top-left" />
          <MySky />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} />
          {/* <OrbitControls /> */}
          <Ground />
          <Table position={[2, 1, -1.8]} />
          <Table position={[2, 1, 1.8]} />
          <Fence position={[-2, 0, 2.4]} scale={4.5} rotation={[0, Math.PI / 2, 0]} />
          <Fence position={[-2, 0, -2.4]} scale={4.5} rotation={[0, Math.PI / 2, 0]} />
          <FloatingText />

          {/* object.entries curr food but shuffle the order */}
          {
            foods.map(([restriction, food], index) => (
              <Food key={index} food={food} position={[2, 1.5, -3 + index]} rotation={[0, Math.PI, 0]} onClick={() => setCurrentFood(restriction as Restriction)} />
            ))
          }

          <BathroomSign position={[-5, 3, 8]} scale={5} rotation={[0, Math.PI / 2, 0]} />

          <Barn position={[-20, 0, -5]} scale={1.5} rotation={[0, 0, 0]} />

          <Walls />
          {
            horses.map((horse) => (
              <Animated key={horse.id} Component={horse.component} horse={horse} />
            ))
          }
          {
            servedHorses.map((horse) => (
              <Animated key={horse.id} Component={horse.component} horse={horse} />
            ))
          }
          {/* <Denis action={"Walk"} position={[-4, 0, -4]} scale={0.5} rotation={[0, Math.PI / 2, 0]} /> */}
          {/* <Dolly action={"Walk"} position={[-4, 0, -6]} scale={0.8} rotation={[0, Math.PI / 2, 0]} /> */}
          {/* <Dave action={"Walk"} position={[-4, 0, -10]} scale={0.5} rotation={[0, Math.PI / 2, 0]} /> */}
          {/* <Dan action={"Run"} position={[-4, 0, -8]} scale={0.35} rotation={[0, Math.PI / 2, 0]} /> */}
        </Suspense>
      </Canvas>
    </div>
  )
}

