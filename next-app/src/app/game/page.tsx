'use client';

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Suspense } from 'react'
import { Ground } from './ground';
import { Warehouse } from './warehouse';

export default function Game() {
  return (
    <div className="w-screen h-screen">
      <Canvas
        shadows
      >
        <Suspense fallback={null}>
          <Perf position="top-left" />
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} />
          <OrbitControls />
          {/* <Ground /> */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="hotpink" />
          </mesh>
          <Warehouse />
        </Suspense>
      </Canvas>
    </div>
  )
}

