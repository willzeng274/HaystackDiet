import { create } from "zustand";
import { MutableRefObject } from "react";
import * as THREE from "three";
import { v4 as uuid } from "uuid";
import Dave from "./horses/dave";
import { Dan } from "./horses/dan";
import { Dolly } from "./horses/dolly";
import { Denis } from "./horses/denis";

export interface HorseFrame {
  position: [number, number, number];
  rotation: [number, number, number];
  action: string;
  duration: number;
}

type Restriction =
  | "NORMAL"
  | "GLUTEN"
  | "LACTOSE"
  | "VEGAN"
  | "VEGETARIAN"
  | "HALAL"
  | "NUT"
  | "KOSHER";

export interface Horse {
  id: string;
  restriction: Restriction;
  component: React.ComponentType<any>;
//   ref: MutableRefObject<
//     | THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
//     | undefined
//   >;
  frame: HorseFrame;
}

export interface HorsesStore {
  horses: Horse[];
  //   addHorse: (horse: Horse) => void;
  queueNewHorse: () => void;
  removeHorse: (id: string) => void;
  updateHorse: (id: string, updates: Partial<Horse>) => void;
}

const useHorseStore = create<HorsesStore>((set) => ({
  horses: [],
  queueNewHorse: () =>
    set((state) => ({
      horses: [
        ...state.horses,
        {
          id: uuid(),
          // randomly get a restriction
          restriction: [
            "NORMAL",
            "GLUTEN",
            "LACTOSE",
            "VEGAN",
            "VEGETARIAN",
            "HALAL",
            "NUT",
            "KOSHER",
          ][Math.floor(Math.random() * 8)] as Restriction,
          component: [Dave, Dan, Dolly, Denis][Math.floor(Math.random() * 4)],
          // ref will be set by the component
          // ref: { current: undefined },
          // initial frame
          frame: {
            position: [-18, 0, -6],
            rotation: [0, 0, 0],
            action: "Walk",
            duration: 3000,
          },
        },
      ],
    })),
  removeHorse: (id: string) =>
    set((state) => ({
      horses: state.horses.filter((horse) => horse.id !== id),
    })),
  updateHorse: (id: string, updates: Partial<Horse>) =>
    set((state) => ({
      horses: state.horses.map((horse) =>
        horse.id === id ? { ...horse, ...updates } : horse
      ),
    })),
}));

export default useHorseStore;
