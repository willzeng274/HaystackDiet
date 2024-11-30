'use client';

import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";

export function Ground() {
    const texture = useLoader(TextureLoader, "grass.jpg");
    texture.repeat.set(240, 240);
    return (
        <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[1000, 1000]} />
            <meshStandardMaterial map={texture} map-repeat={[240, 240]} color="green" />
        </mesh>
    )
}