import React from 'react'
import { useGLTF } from '@react-three/drei'

export function Warehouse(props: any) {
  const { nodes, materials } = useGLTF('/warehouse.glb')
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI, 0, -Math.PI]}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.NurbsPath053.geometry}
          material={materials.Metal}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.NurbsPath053_1.geometry}
          material={materials.Emissive}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.NurbsPath053_2.geometry}
          material={materials.WetConcrete}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/warehouse.glb')