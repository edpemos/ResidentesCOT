import { create } from 'zustand';
import type { Unit } from '../types';

const DEFAULT_UNITS: Unit[] = [
  { id: 'u1', name: 'Trauma General', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'u2', name: 'Rodilla/Cadera', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'u3', name: 'Miembro Superior', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'u4', name: 'Pie', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'u5', name: 'Columna', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'u6', name: 'Infantil', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'u7', name: 'Tumores', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'u8', name: 'Rotación Externa', color: 'bg-slate-100 text-slate-800 border-slate-200' },
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
