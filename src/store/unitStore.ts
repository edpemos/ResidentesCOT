import { create } from 'zustand';
import type { Unit } from '../types';
import { MOCK_UNITS } from './mockData';

interface UnitState {
  units: Unit[];
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (id: string, updates: Partial<Omit<Unit, 'id'>>) => void;
  deleteUnit: (id: string) => void;
}

export const useUnitStore = create<UnitState>((set) => ({
  units: MOCK_UNITS,
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
