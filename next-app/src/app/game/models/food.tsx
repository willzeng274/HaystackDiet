import * as THREE from 'three'
import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    styrofoamDinner_1: THREE.Mesh
    styrofoamDinner_1_1: THREE.Mesh
    styrofoamDinner_1_2: THREE.Mesh
    styrofoamDinner_1_3: THREE.Mesh
    styrofoamDinner_1_4: THREE.Mesh
    lid: THREE.Mesh
  }
  materials: {
    brownLight: THREE.MeshStandardMaterial
    brownDark: THREE.MeshStandardMaterial
    green: THREE.MeshStandardMaterial
    _defaultMat: THREE.MeshStandardMaterial
    greenDark: THREE.MeshStandardMaterial
  }
}

export function food(props: any) {
  const { nodes, materials } = useGLTF('/food.glb') as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.lid.geometry}
        material={materials._defaultMat}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.styrofoamDinner_1.geometry}
        material={materials.brownLight}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.styrofoamDinner_1_1.geometry}
        material={materials.brownDark}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.styrofoamDinner_1_2.geometry}
        material={materials.green}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.styrofoamDinner_1_3.geometry}
        material={materials._defaultMat}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.styrofoamDinner_1_4.geometry}
        material={materials.greenDark}
      />
    </group>
  )
}

useGLTF.preload('/food.glb')