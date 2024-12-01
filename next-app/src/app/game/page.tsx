'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls, Sky } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Suspense, useEffect, useRef } from 'react'
import { Ground } from './ground';
import { Table } from './table';
import * as THREE from 'three';
import { Dave } from './horses/dave';
import { Denis } from './horses/denis';
import { Dolly } from './horses/dolly';
import { Dan } from './horses/dan';
import { Wall } from './wall';
import Walls from './walls';
import { Fence } from './fence';
import { Barn } from './barn';
import { BathroomSign } from './bathroom';

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

  useFrame(() => {
    if (!cameraRef) return;

    const camera = cameraRef;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

    const isMovingDiagonally =
      (movement.current.forward || movement.current.backward) &&
      (movement.current.left || movement.current.right);

    const adjustedSpeed = isMovingDiagonally ? speed * 0.7 : speed;

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

export default function Game() {
  return (
    <div className="w-screen h-screen">
      <Crosshair />
      <Canvas
        camera={{ fov: 90, position: [0, 2.5, 0] }}
        shadows
      >
        <Suspense fallback={null}>
          <CameraController
            bounds={{ x: [-1, 1], z: [-4, 4] }}
          />
          <PointerLockControls pointerSpeed={3} />
          <Perf position="top-left" />
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} />
          {/* <OrbitControls /> */}
          <Ground />
          <Table position={[2, 1, -1.8]} />
          <Table position={[2, 1, 1.8]} />
          <Fence position={[-2, 0, 2.4]} scale={4.5} rotation={[0, Math.PI / 2, 0]} />
          <Fence position={[-2, 0, -2.4]} scale={4.5} rotation={[0, Math.PI / 2, 0]} />

          <BathroomSign position={[-5, 3, 8]} scale={5} rotation={[0, Math.PI / 2, 0]} />

          <Barn position={[-20, 0, -5]} scale={1.5} rotation={[0, 0, 0]} />

          <Walls />
          <Dave action={"Walk"} position={[-8, 0, 0]} scale={0.5} rotation={[0, Math.PI / 2, 0]} />
          <Denis action={"Walk"} position={[-5, 0, 0]} scale={0.5} rotation={[0, Math.PI / 2, 0]} />
          <Dolly action={"Walk"} position={[-11, 0, 0]} scale={0.8} rotation={[0, Math.PI / 2, 0]} />
          <Dan action={"Run"} position={[-14, 0, 0]} scale={0.35} rotation={[0, Math.PI / 2, 0]} />
        </Suspense>
      </Canvas>
    </div>
  )
}

