
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Horse: THREE.SkinnedMesh
    All: THREE.Bone
    Root: THREE.Bone
  }
  materials: {
    AtlasMaterial: THREE.MeshStandardMaterial
  }
}

type ActionName =
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Death'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Headbutt'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle_Eating'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Jump_Loop'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Jump_Start'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Run'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Walk'

/* add these code to all horse animations */
interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

interface MyGLTFResult extends GLTFResult {
  animations: GLTFAction[];
}
/* add these code to all horse animations */

export function Dolly(props: any) {
  const group = useRef<THREE.Group>()
  const { nodes, materials, animations } = useGLTF('/dolly.glb') as MyGLTFResult
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (props.action) {
        const action = actions[('AnimalArmature|AnimalArmature|AnimalArmature|' + props.action) as ActionName];
        if (!action) return;
        action.reset().play();
    }
  }, [props.action]);
  
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="AnimalArmature" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <primitive object={nodes.All} />
            <primitive object={nodes.Root} />
          </group>
          <skinnedMesh
            name="Horse"
            geometry={nodes.Horse.geometry}
            material={materials.AtlasMaterial}
            skeleton={nodes.Horse.skeleton}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/dolly.glb')