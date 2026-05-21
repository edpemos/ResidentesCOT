import { create } from 'zustand';
import type { Unit } from '../types';

const DEFAULT_UNITS: Unit[] = [
  { id: 'u1', name: 'Trauma General',    color: 'blue-light'   },
  { id: 'u2', name: 'Rodilla/Cadera',    color: 'emerald'      },
  { id: 'u3', name: 'Miembro Superior',  color: 'teal-light'   },
  { id: 'u4', name: 'Pie',              color: 'amber-light'  },
  { id: 'u5', name: 'Columna',          color: 'purple-light' },
  { id: 'u6', name: 'Infantil',         color: 'rose-light'   },
  { id: 'u7', name: 'Tumores',          color: 'indigo-light' },
  { id: 'u8', name: 'Rotación Externa', color: 'slate'        },
];

interface UnitState {
  units: Unit[];
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (id: string, updates: Partial<Omit<Unit, 'id'>>) => void;
  deleteUnit: (id: string) => void;
}

export const useUnitStore = create<UnitState>((set) => ({
  units: DEFAULT_UNITS,
  addUnit: (unit) => set((state) => ({
    units: [...state.units, { ...unit, id: Math.random().toString(36).substr(2, 9) }]
  })),
  updateUnit: (id, updates) => set((state) => ({
    units: state.units.map(u => u.id === id ? { ...u, ...updates } : u)
  })),
  deleteUnit: (id) => set((state) => ({
    units: state.units.filter(u => u.id !== id)
  }))
}));
