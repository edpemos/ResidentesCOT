import { create } from 'zustand';
import type { Resident, ResidentYear, Rotation } from '../types';
import { differenceInYears, parseISO } from 'date-fns';
import { MOCK_RESIDENTS, MOCK_ROTATIONS } from './mockData';

export const calculateResidentYear = (startDate: string): ResidentYear => {
  const yearsDiff = differenceInYears(new Date(), parseISO(startDate));
  if (yearsDiff < 1) return 'R1';
  if (yearsDiff < 2) return 'R2';
  if (yearsDiff < 3) return 'R3';
  if (yearsDiff < 4) return 'R4';
  if (yearsDiff < 5) return 'R5';
  return 'Graduado';
};

interface RotationState {
  residents: Resident[];
  rotations: Rotation[];
  currentYear: number;
  isLoading: boolean;
  
  // Rotations Actions
  setRotations: (rotations: Rotation[]) => void;
  updateRotation: (rotationId: string, updates: Partial<Rotation>) => void;
  moveRotation: (rotationId: string, newResidentId: string, newMonth: number) => void;
  toggleVacation: (rotationId: string) => void;
  addRotation: (rotation: Omit<Rotation, 'id'>) => void;
  deleteRotation: (rotationId: string) => void;

  // Residents Actions
  addResident: (resident: Omit<Resident, 'id' | 'year'>) => void;
  updateResident: (id: string, updates: Partial<Omit<Resident, 'id' | 'year'>>) => void;
  deleteResident: (id: string) => void;
}

export const useRotationStore = create<RotationState>((set) => ({
  residents: MOCK_RESIDENTS.map(r => ({ ...r, year: calculateResidentYear(r.startDate) as any })),
  rotations: MOCK_ROTATIONS.map(r => ({ ...r, isVacation: false })),
  currentYear: new Date().getFullYear(),
  isLoading: false,

  setRotations: (rotations) => set({ rotations }),
  
  updateRotation: (id, updates) => set((state) => ({
    rotations: state.rotations.map(r => r.id === id ? { ...r, ...updates } : r)
  })),

  moveRotation: (id, newResidentId, newMonth) => set((state) => {
    const targetRotationIndex = state.rotations.findIndex(
      r => r.residentId === newResidentId && r.month === newMonth && r.year === state.currentYear
    );

    let newRotations = [...state.rotations];
    const sourceRotation = newRotations.find(r => r.id === id);

    if (!sourceRotation) return state;

    if (targetRotationIndex !== -1 && newRotations[targetRotationIndex].id !== id) {
      const tempResident = newRotations[targetRotationIndex].residentId;
      const tempMonth = newRotations[targetRotationIndex].month;
      
      newRotations[targetRotationIndex].residentId = sourceRotation.residentId;
      newRotations[targetRotationIndex].month = sourceRotation.month;
      
      sourceRotation.residentId = tempResident;
      sourceRotation.month = tempMonth;
    } else {
      sourceRotation.residentId = newResidentId;
      sourceRotation.month = newMonth;
    }

    return { rotations: newRotations };
  }),

  toggleVacation: (id) => set((state) => ({
    rotations: state.rotations.map(r => r.id === id ? { ...r, isVacation: !r.isVacation } : r)
  })),

  addRotation: (rotation) => set((state) => ({
    rotations: [...state.rotations, { ...rotation, id: Math.random().toString(36).substr(2, 9) }]
  })),

  deleteRotation: (id) => set((state) => ({
    rotations: state.rotations.filter(r => r.id !== id)
  })),

  addResident: (resident) => set((state) => ({
    residents: [...state.residents, { 
      ...resident, 
      id: Math.random().toString(36).substr(2, 9),
      year: calculateResidentYear(resident.startDate)
    }]
  })),

  updateResident: (id, updates) => set((state) => ({
    residents: state.residents.map(r => {
      if (r.id === id) {
        const merged = { ...r, ...updates };
        return { ...merged, year: calculateResidentYear(merged.startDate) };
      }
      return r;
    })
  })),

  deleteResident: (id) => set((state) => ({
    residents: state.residents.filter(r => r.id !== id),
    // Also delete their rotations
    rotations: state.rotations.filter(r => r.residentId !== id)
  })),
}));
