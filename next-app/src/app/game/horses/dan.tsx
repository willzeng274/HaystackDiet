import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Horse_1: THREE.SkinnedMesh
    Horse_2: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    ['Material.003']: THREE.MeshStandardMaterial
    ['Material.006']: THREE.MeshStandardMaterial
  }
}

type ActionName =
  | 'Armature|Death'
  | 'Armature|Idle'
  | 'Armature|Jump'
  | 'Armature|Run'
  | 'Armature|Walk'
  | 'Armature|WalkSlow'


/* add these code to all horse animations */
interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

interface MyGLTFResult extends GLTFResult {
  animations: GLTFAction[];
}
/* add these code to all horse animations */

export function Dan(props: any) {
  const group = useRef<THREE.Group>()
  const { nodes, materials, animations } = useGLTF('dan.glb') as MyGLTFResult
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (props.action) {
        const action = actions[('Armature|' + props.action) as ActionName];
        if (!action) return;
        action.reset().play();
    }
  }, [props.action]);
  /* add these code to all horse animations */
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="Armature" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <primitive object={nodes.root} />
          </group>
          <group name="Horse" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh
              name="Horse_1"
              geometry={nodes.Horse_1.geometry}
              material={materials['Material.003']}
              skeleton={nodes.Horse_1.skeleton}
            />
            <skinnedMesh
              name="Horse_2"
              geometry={nodes.Horse_2.geometry}
              material={materials['Material.006']}
              skeleton={nodes.Horse_2.skeleton}
            />
          </group>
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/dan.glb')