import { create } from 'zustand';
import type { Unit } from '../types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MOCK_UNITS } from './mockData';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

interface UnitState {
  units: Unit[];
  isLoading: boolean;
  loadUnits: () => Promise<void>;
  addUnit: (unit: Omit<Unit, 'id'>) => Promise<void>;
  updateUnit: (id: string, updates: Partial<Omit<Unit, 'id'>>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
}

export const useUnitStore = create<UnitState>((set) => ({
  units: MOCK_UNITS,
  isLoading: false,

  loadUnits: async () => {
    if (isMockMode()) return;
    set({ isLoading: true });
    try {
      const snap = await getDocs(collection(db, 'units'));
      const units: Unit[] = [];
      snap.forEach(doc => {
        units.push({ id: doc.id, ...doc.data() } as Unit);
      });
      if (units.length > 0) {
        set({ units, isLoading: false });
      } else {
        // Keep mock units if empty (will be seeded by rotationStore)
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Error loading units from Firestore:', err);
      set({ isLoading: false });
    }
  },

  addUnit: async (unit) => {
    if (isMockMode()) {
      set((state) => ({
        units: [...state.units, { ...unit, id: Math.random().toString(36).substr(2, 9) }]
      }));
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'units'), unit);
      set((state) => ({
        units: [...state.units, { ...unit, id: docRef.id }]
      }));
    } catch (err) {
      console.error('Error adding unit to Firestore:', err);
    }
  },

  updateUnit: async (id, updates) => {
    if (isMockMode()) {
      set((state) => ({
        units: state.units.map(u => u.id === id ? { ...u, ...updates } : u)
      }));
      return;
    }
    try {
      await updateDoc(doc(db, 'units', id), updates);
      set((state) => ({
        units: state.units.map(u => u.id === id ? { ...u, ...updates } : u)
      }));
    } catch (err) {
      console.error('Error updating unit in Firestore:', err);
    }
  },

  deleteUnit: async (id) => {
    if (isMockMode()) {
      set((state) => ({
        units: state.units.filter(u => u.id !== id)
      }));
      return;
    }
    try {
      await deleteDoc(doc(db, 'units', id));
      set((state) => ({
        units: state.units.filter(u => u.id !== id)
      }));
    } catch (err) {
      console.error('Error deleting unit from Firestore:', err);
    }
  }
}));
