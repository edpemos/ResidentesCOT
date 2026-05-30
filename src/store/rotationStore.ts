import { create } from 'zustand';
import type { Resident, ResidentYear, Rotation } from '../types';
import { differenceInYears, parseISO } from 'date-fns';
import { MOCK_RESIDENTS, MOCK_ROTATIONS } from './mockData';
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from './authStore';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

export const calculateResidentYear = (startDate: string): ResidentYear => {
  const yearsDiff = differenceInYears(new Date(), parseISO(startDate));
  if (yearsDiff < 1) return 'R1';
  if (yearsDiff < 2) return 'R2';
  if (yearsDiff < 3) return 'R3';
  if (yearsDiff < 4) return 'R4';
  if (yearsDiff < 5) return 'R5';
  return 'Graduado';
};

export const calculateResidentYearForAcademicYear = (startDate: string, academicYear: number): ResidentYear => {
  const startYear = new Date(startDate).getFullYear();
  const yearsDiff = academicYear - startYear;
  if (yearsDiff < 0) return 'R1';
  if (yearsDiff === 0) return 'R1';
  if (yearsDiff === 1) return 'R2';
  if (yearsDiff === 2) return 'R3';
  if (yearsDiff === 3) return 'R4';
  if (yearsDiff === 4) return 'R5';
  return 'Graduado';
};

const getCurrentAcademicYearStart = (): number => {
  const now = new Date();
  return now.getMonth() < 5 ? now.getFullYear() - 1 : now.getFullYear();
};

interface RotationState {
  residents: Resident[];
  rotations: Rotation[];
  currentYear: number;
  viewMode: 'academicYear' | 'resident';
  selectedResidentId: string;
  isLoading: boolean;
  
  // Store actions
  initializeStore: () => Promise<void>;
  setRotations: (rotations: Rotation[]) => void;
  updateRotation: (rotationId: string, updates: Partial<Rotation>) => Promise<void>;
  moveRotation: (rotationId: string, newResidentId: string, newMonth: number, targetYear?: number) => Promise<void>;
  toggleVacation: (rotationId: string) => Promise<void>;
  addRotation: (rotation: Omit<Rotation, 'id'>) => Promise<void>;
  deleteRotation: (rotationId: string) => Promise<void>;
  setCurrentYear: (year: number) => void;
  setViewMode: (mode: 'academicYear' | 'resident') => void;
  setSelectedResidentId: (id: string) => void;

  // Residents Actions
  addResident: (resident: Omit<Resident, 'id' | 'year'>) => Promise<void>;
  updateResident: (id: string, updates: Partial<Omit<Resident, 'id' | 'year'>>) => Promise<void>;
  deleteResident: (id: string) => Promise<void>;
}

export const useRotationStore = create<RotationState>((set, get) => ({
  residents: MOCK_RESIDENTS.map(r => ({ ...r, year: calculateResidentYear(r.startDate) as any })),
  rotations: MOCK_ROTATIONS.map(r => ({ ...r, isVacation: false })),
  currentYear: getCurrentAcademicYearStart(),
  viewMode: 'academicYear',
  selectedResidentId: MOCK_RESIDENTS[0]?.id || '',
  isLoading: false,

  initializeStore: async () => {
    if (isMockMode()) return;
    set({ isLoading: true });
    try {
      const residentsSnap = await getDocs(collection(db, 'residents'));
      const rotationsSnap = await getDocs(collection(db, 'rotations'));
      
      const loadedResidents: Resident[] = [];
      residentsSnap.forEach(doc => {
        loadedResidents.push({ id: doc.id, ...doc.data() } as Resident);
      });

      const loadedRotations: Rotation[] = [];
      rotationsSnap.forEach(doc => {
        loadedRotations.push({ id: doc.id, ...doc.data() } as Rotation);
      });

      const { role } = useAuthStore.getState();
      
      // AUTO-SEEDING: Seed if the Firestore database is totally empty and user is admin
      if (loadedResidents.length === 0 && role === 'admin') {
        console.log('Firestore is empty. Automatic seeding of spreadsheet data...');
        const batch = writeBatch(db);

        // 1. Seed Units
        const { MOCK_UNITS } = await import('./mockData');
        MOCK_UNITS.forEach(u => {
          batch.set(doc(db, 'units', u.id), { name: u.name, color: u.color });
        });

        // 2. Seed Residents
        const { MOCK_RESIDENTS } = await import('./mockData');
        MOCK_RESIDENTS.forEach(r => {
          batch.set(doc(db, 'residents', r.id), {
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            startDate: r.startDate,
            endDate: r.endDate
          });
        });

        // 3. Seed Rotations
        const { MOCK_ROTATIONS } = await import('./mockData');
        MOCK_ROTATIONS.forEach(rot => {
          const rotId = rot.id || `rot_${rot.residentId}_${rot.year}_${rot.month}`;
          batch.set(doc(db, 'rotations', rotId), {
            residentId: rot.residentId,
            month: rot.month,
            year: rot.year,
            unitId: rot.unitId,
            isVacation: false,
            type: 'interna-cot'
          });
        });

        await batch.commit();
        console.log('✓ Seeding complete!');

        // Reload fresh seeded data from Firestore
        const resSnap = await getDocs(collection(db, 'residents'));
        const rotSnap = await getDocs(collection(db, 'rotations'));
        
        const finalResidents: Resident[] = [];
        resSnap.forEach(doc => {
          finalResidents.push({ id: doc.id, ...doc.data() } as Resident);
        });

        const finalRotations: Rotation[] = [];
        rotSnap.forEach(doc => {
          finalRotations.push({ id: doc.id, ...doc.data() } as Rotation);
        });

        // Also reload units in unitStore
        const { useUnitStore } = await import('./unitStore');
        useUnitStore.getState().loadUnits();

        set({
          residents: finalResidents.map(r => ({ ...r, year: calculateResidentYear(r.startDate) as any })),
          rotations: finalRotations,
          selectedResidentId: finalResidents[0]?.id || '',
          isLoading: false
        });
      } else {
        // Normal load from database
        set({
          residents: loadedResidents.map(r => ({ ...r, year: calculateResidentYear(r.startDate) as any })),
          rotations: loadedRotations,
          selectedResidentId: loadedResidents[0]?.id || get().selectedResidentId || '',
          isLoading: false
        });
      }
    } catch (err) {
      console.error('Error initializing rotationStore:', err);
      set({ isLoading: false });
    }
  },

  setRotations: (rotations) => set({ rotations }),
  setCurrentYear: (currentYear) => set({ currentYear }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedResidentId: (selectedResidentId) => set({ selectedResidentId }),
  
  updateRotation: async (id, updates) => {
    if (isMockMode()) {
      set((state) => ({
        rotations: state.rotations.map(r => r.id === id ? { ...r, ...updates } : r)
      }));
      return;
    }
    try {
      await updateDoc(doc(db, 'rotations', id), updates);
      set((state) => ({
        rotations: state.rotations.map(r => r.id === id ? { ...r, ...updates } : r)
      }));
    } catch (err) {
      console.error('Error updating rotation in Firestore:', err);
    }
  },

  moveRotation: async (id, newResidentId, newMonth, targetYear) => {
    const yearToUse = targetYear !== undefined ? targetYear : (newMonth >= 5 ? get().currentYear : get().currentYear + 1);
    
    // Perform local memory update first for zero-latency UI
    set((state) => {
      const targetRotationIndex = state.rotations.findIndex(
        r => r.residentId === newResidentId && r.month === newMonth && r.year === yearToUse
      );

      let newRotations = [...state.rotations];
      const sourceRotation = newRotations.find(r => r.id === id);

      if (!sourceRotation) return state;

      if (targetRotationIndex !== -1 && newRotations[targetRotationIndex].id !== id) {
        // Swap rotations
        const tempResident = newRotations[targetRotationIndex].residentId;
        const tempMonth = newRotations[targetRotationIndex].month;
        const tempYear = newRotations[targetRotationIndex].year;
        
        newRotations[targetRotationIndex].residentId = sourceRotation.residentId;
        newRotations[targetRotationIndex].month = sourceRotation.month;
        newRotations[targetRotationIndex].year = sourceRotation.year;
        
        sourceRotation.residentId = tempResident;
        sourceRotation.month = tempMonth;
        sourceRotation.year = tempYear;
      } else {
        sourceRotation.residentId = newResidentId;
        sourceRotation.month = newMonth;
        sourceRotation.year = yearToUse;
      }

      // Background sync to Firestore
      if (!isMockMode()) {
        const batch = writeBatch(db);
        if (targetRotationIndex !== -1 && newRotations[targetRotationIndex].id !== id) {
          const tRot = newRotations[targetRotationIndex];
          batch.set(doc(db, 'rotations', tRot.id), {
            residentId: tRot.residentId,
            month: tRot.month,
            year: tRot.year,
            unitId: tRot.unitId,
            isVacation: tRot.isVacation,
            type: tRot.type ?? 'interna-cot'
          });
        }
        batch.set(doc(db, 'rotations', sourceRotation.id), {
          residentId: sourceRotation.residentId,
          month: sourceRotation.month,
          year: sourceRotation.year,
          unitId: sourceRotation.unitId,
          isVacation: sourceRotation.isVacation,
          type: sourceRotation.type ?? 'interna-cot'
        });
        batch.commit().catch(err => console.error('Error syncing moved rotation to Firestore:', err));
      }

      return { rotations: newRotations };
    });
  },

  toggleVacation: async (id) => {
    const rotation = get().rotations.find(r => r.id === id);
    if (!rotation) return;
    const nextVacationState = !rotation.isVacation;

    if (isMockMode()) {
      set((state) => ({
        rotations: state.rotations.map(r => r.id === id ? { ...r, isVacation: nextVacationState } : r)
      }));
      return;
    }
    try {
      await updateDoc(doc(db, 'rotations', id), { isVacation: nextVacationState });
      set((state) => ({
        rotations: state.rotations.map(r => r.id === id ? { ...r, isVacation: nextVacationState } : r)
      }));
    } catch (err) {
      console.error('Error toggling vacation in Firestore:', err);
    }
  },

  addRotation: async (rotation) => {
    if (isMockMode()) {
      set((state) => ({
        rotations: [...state.rotations, { ...rotation, id: Math.random().toString(36).substr(2, 9) }]
      }));
      return;
    }
    try {
      const tempId = `rot_${rotation.residentId}_${rotation.year}_${rotation.month}`;
      await setDoc(doc(db, 'rotations', tempId), rotation);
      set((state) => ({
        rotations: [...state.rotations, { ...rotation, id: tempId }]
      }));
    } catch (err) {
      console.error('Error adding rotation to Firestore:', err);
    }
  },

  deleteRotation: async (id) => {
    if (isMockMode()) {
      set((state) => ({
        rotations: state.rotations.filter(r => r.id !== id)
      }));
      return;
    }
    try {
      await deleteDoc(doc(db, 'rotations', id));
      set((state) => ({
        rotations: state.rotations.filter(r => r.id !== id)
      }));
    } catch (err) {
      console.error('Error deleting rotation from Firestore:', err);
    }
  },

  addResident: async (resident) => {
    if (isMockMode()) {
      set((state) => ({
        residents: [...state.residents, { 
          ...resident, 
          id: Math.random().toString(36).substr(2, 9),
          year: calculateResidentYear(resident.startDate)
        }]
      }));
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'residents'), resident);
      const newResident = {
        ...resident,
        id: docRef.id,
        year: calculateResidentYear(resident.startDate)
      };
      set((state) => ({
        residents: [...state.residents, newResident]
      }));
    } catch (err) {
      console.error('Error adding resident to Firestore:', err);
    }
  },

  updateResident: async (id, updates) => {
    if (isMockMode()) {
      set((state) => ({
        residents: state.residents.map(r => {
          if (r.id === id) {
            const merged = { ...r, ...updates };
            return { ...merged, year: calculateResidentYear(merged.startDate) };
          }
          return r;
        })
      }));
      return;
    }
    try {
      const { year, ...fieldsToUpdate } = updates as any;
      await updateDoc(doc(db, 'residents', id), fieldsToUpdate);
      set((state) => ({
        residents: state.residents.map(r => {
          if (r.id === id) {
            const merged = { ...r, ...updates };
            return { ...merged, year: calculateResidentYear(merged.startDate) };
          }
          return r;
        })
      }));
    } catch (err) {
      console.error('Error updating resident in Firestore:', err);
    }
  },

  deleteResident: async (id) => {
    if (isMockMode()) {
      set((state) => ({
        residents: state.residents.filter(r => r.id !== id),
        rotations: state.rotations.filter(r => r.residentId !== id)
      }));
      return;
    }
    try {
      await deleteDoc(doc(db, 'residents', id));
      
      const userRotations = get().rotations.filter(r => r.residentId === id);
      const batch = writeBatch(db);
      userRotations.forEach(r => {
        batch.delete(doc(db, 'rotations', r.id));
      });
      await batch.commit();

      set((state) => ({
        residents: state.residents.filter(r => r.id !== id),
        rotations: state.rotations.filter(r => r.residentId !== id)
      }));
    } catch (err) {
      console.error('Error deleting resident from Firestore:', err);
    }
  }
}));
