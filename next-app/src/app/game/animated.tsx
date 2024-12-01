import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// import { MathUtils } from 'three';

const Animated = ({ Component }: { Component: React.ComponentType<any> }) => {
    const FRAME_DURATION = 15000; // Change this value to adjust frame duration (in milliseconds)
    const [action, setAction] = useState("Walk");
    const [position, setPosition] = useState([-18, 0, -6]);
    const [rotation, setRotation] = useState([0, 0, 0]);
    const daveRef = useRef<THREE.Mesh | undefined>();
    const startTimeRef = useRef(0);
    const currentFrameRef = useRef(0);
    const frames = [
        { position: [-18, 0, -6], rotation: [0, 0, 0], action: "Walk", duration: 3000 },
        { position: [-18, 0, 0], rotation: [0, Math.PI / 2, 0], action: "Walk", duration: 3000 },
        { position: [-4, 0, 0], rotation: [0, Math.PI / 2, 0], action: "Idle", duration: 5000 },
    ];
    
    useFrame((state) => {
        if (!startTimeRef.current) startTimeRef.current = state.clock.getElapsedTime();
        const elapsed = (state.clock.getElapsedTime() - startTimeRef.current) * 1000;
        const frameIndex = Math.floor(elapsed / FRAME_DURATION);
        
        if (frameIndex < frames.length - 1) {
            const alpha = (elapsed % FRAME_DURATION) / FRAME_DURATION;
            const currentFrame = frames[frameIndex];
            const nextFrame = frames[frameIndex + 1];
            
            if (daveRef.current) {
                const newPos = currentFrame.position.map((start, i) => 
                    THREE.MathUtils.lerp(start, nextFrame.position[i], alpha)
                );
                const newRot = currentFrame.rotation.map((start, i) => 
                    THREE.MathUtils.lerp(start, nextFrame.rotation[i], alpha)
                );
                
                daveRef.current.position.set(newPos[0], newPos[1], newPos[2]);
                daveRef.current.rotation.set(newRot[0], newRot[1], newRot[2]);
                
                if (frameIndex !== currentFrameRef.current) {
                    currentFrameRef.current = frameIndex;
                    console.log("Setting action to", currentFrame.action);
                    setAction(currentFrame.action);
                }
            }
        }
    });

    return (
        <Component
            ref={daveRef}
            action={action}
            position={position}
            scale={0.5}
            rotation={rotation}
        />
    );
};

export default Animated;