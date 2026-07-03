import { create } from 'zustand';
import type { Resident, ResidentYear, Rotation } from '../types';
import { differenceInYears, parseISO } from 'date-fns';
// mockData solo se importa estáticamente en modo mock (desarrollo sin Firebase)
// En producción esto no afecta ya que isMockMode() es false y el tree-shaking lo elimina
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
  return now.getMonth() < 4 ? now.getFullYear() - 1 : now.getFullYear();
};

const pushToHistory = (get: any, set: any) => {
  const current = get().rotations;
  const history = get().history || [];
  const updatedHistory = [...history, JSON.parse(JSON.stringify(current))].slice(-10);
  set({ history: updatedHistory });
};

interface RotationState {
  residents: Resident[];
  rotations: Rotation[];
  currentYear: number;
  viewMode: 'academicYear' | 'resident';
  selectedResidentId: string;
  isLoading: boolean;
  history: Rotation[][];
  
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
  undo: () => Promise<void>;

  // Residents Actions
  addResident: (resident: Omit<Resident, 'id' | 'year'>) => Promise<void>;
  updateResident: (id: string, updates: Partial<Omit<Resident, 'id' | 'year'>>) => Promise<void>;
  deleteResident: (id: string) => Promise<void>;
  
  // Row Cloning Action
  copyRotationsRow: (sourceResidentId: string, sourceYear: number, targetResidentId: string, targetYear: number) => Promise<void>;
  
  // Board Cloning Action
  cloneAcademicYear: (sourceYear: number, targetYear: number) => Promise<void>;
}

// En producción, el store arranca vacío y se rellena desde Firestore via initializeStore()
// En modo mock, usa los datos de mockData para desarrollo sin Firebase
const _isMock = isMockMode();

export const useRotationStore = create<RotationState>((set, get) => ({
  residents: _isMock ? MOCK_RESIDENTS.map(r => ({ ...r, year: calculateResidentYear(r.startDate) as any })) : [],
  rotations: _isMock ? MOCK_ROTATIONS.map(r => ({ ...r, isVacation: false })) : [],
  currentYear: getCurrentAcademicYearStart(),
  viewMode: 'academicYear',
  selectedResidentId: _isMock ? (MOCK_RESIDENTS[0]?.id || '') : '',
  isLoading: !_isMock, // En producción empieza cargando hasta que initializeStore complete
  history: [],

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
          batch.set(doc(db, 'units', u.id), { name: u.name, color: u.color, type: (u as any).type ?? 'interna' });
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
    pushToHistory(get, set);
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
    pushToHistory(get, set);
    const yearToUse = targetYear !== undefined ? targetYear : (newMonth >= 5 ? get().currentYear : get().currentYear + 1);
    
    const sourceRot = get().rotations.find(r => r.id === id);
    if (!sourceRot) return;

    const oldResidentId = sourceRot.residentId;
    const oldMonth = sourceRot.month;
    const oldYear = sourceRot.year;

    const targetRot = get().rotations.find(
      r => r.residentId === newResidentId && r.month === newMonth && r.year === yearToUse
    );

    const sourceNewId = `rot_${newResidentId}_${yearToUse}_${newMonth}`;
    const targetNewId = targetRot ? `rot_${oldResidentId}_${oldYear}_${oldMonth}` : null;

    if (isMockMode()) {
      set((state) => {
        let newRotations = state.rotations.filter(r => r.id !== id && (!targetRot || r.id !== targetRot.id));

        const updatedSource = {
          ...sourceRot,
          id: sourceNewId,
          residentId: newResidentId,
          month: newMonth,
          year: yearToUse
        };

        const updatedTarget = targetRot ? {
          ...targetRot,
          id: targetNewId!,
          residentId: oldResidentId,
          month: oldMonth,
          year: oldYear
        } : null;

        newRotations.push(updatedSource);
        if (updatedTarget) newRotations.push(updatedTarget);

        return { rotations: newRotations };
      });
      return;
    }

    try {
      const batch = writeBatch(db);

      // 1. Delete old documents in Firestore to free up slot keys
      batch.delete(doc(db, 'rotations', id));
      if (targetRot) {
        batch.delete(doc(db, 'rotations', targetRot.id));
      }

      // 2. Insert new documents with slot-matching IDs
      const updatedSource = {
        residentId: newResidentId,
        month: newMonth,
        year: yearToUse,
        unitId: sourceRot.unitId,
        isVacation: sourceRot.isVacation
      };
      batch.set(doc(db, 'rotations', sourceNewId), updatedSource);

      let updatedTargetObj: Rotation | null = null;
      if (targetRot) {
        const updatedTarget = {
          residentId: oldResidentId,
          month: oldMonth,
          year: oldYear,
          unitId: targetRot.unitId,
          isVacation: targetRot.isVacation
        };
        batch.set(doc(db, 'rotations', targetNewId!), updatedTarget);
        updatedTargetObj = { id: targetNewId!, ...updatedTarget } as Rotation;
      }

      await batch.commit();

      // 3. Update local state with new slot IDs
      set((state) => {
        let newRotations = state.rotations.filter(r => r.id !== id && (!targetRot || r.id !== targetRot.id));
        newRotations.push({ id: sourceNewId, ...updatedSource } as Rotation);
        if (updatedTargetObj) {
          newRotations.push(updatedTargetObj);
        }
        return { rotations: newRotations };
      });

    } catch (err) {
      console.error('Error moving rotation in Firestore:', err);
    }
  },

  toggleVacation: async (id) => {
    pushToHistory(get, set);
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
    pushToHistory(get, set);
    if (isMockMode()) {
      set((state) => {
        const filtered = state.rotations.filter(
          r => !(r.residentId === rotation.residentId && r.month === rotation.month && r.year === rotation.year)
        );
        return {
          rotations: [...filtered, { ...rotation, id: Math.random().toString(36).substr(2, 9) }]
        };
      });
      return;
    }
    try {
      const tempId = `rot_${rotation.residentId}_${rotation.year}_${rotation.month}`;
      await setDoc(doc(db, 'rotations', tempId), rotation);
      set((state) => {
        const filtered = state.rotations.filter(
          r => !(r.residentId === rotation.residentId && r.month === rotation.month && r.year === rotation.year)
        );
        return {
          rotations: [...filtered, { ...rotation, id: tempId }]
        };
      });
    } catch (err) {
      console.error('Error adding rotation to Firestore:', err);
    }
  },

  deleteRotation: async (id) => {
    pushToHistory(get, set);
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
  },

  copyRotationsRow: async (sourceResidentId, sourceYear, targetResidentId, targetYear) => {
    pushToHistory(get, set);
    // Correctly fetch rotations for academic year (June index 5 to Dec index 11 in sourceYear, Jan index 0 to May index 4 in sourceYear + 1)
    const sourceRotations = get().rotations.filter(
      r => r.residentId === sourceResidentId &&
        ((r.month >= 5 && r.year === sourceYear) || (r.month < 5 && r.year === sourceYear + 1))
    );

    if (sourceRotations.length === 0) return;

    if (isMockMode()) {
      set((state) => {
        const filtered = state.rotations.filter(
          r => !(r.residentId === targetResidentId &&
            ((r.month >= 5 && r.year === targetYear) || (r.month < 5 && r.year === targetYear + 1)))
        );
        
        const newCopied = sourceRotations.map(rot => {
          const tgtCalYear = rot.month >= 5 ? targetYear : targetYear + 1;
          return {
            id: Math.random().toString(36).substr(2, 9),
            residentId: targetResidentId,
            month: rot.month,
            year: tgtCalYear,
            unitId: rot.unitId,
            isVacation: rot.isVacation
          };
        });

        return { rotations: [...filtered, ...newCopied] };
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      
      const targetRotationsInState = get().rotations.filter(
        r => r.residentId === targetResidentId &&
          ((r.month >= 5 && r.year === targetYear) || (r.month < 5 && r.year === targetYear + 1))
      );

      targetRotationsInState.forEach(r => {
        batch.delete(doc(db, 'rotations', r.id));
      });

      const newCopiedRotations: Rotation[] = [];
      sourceRotations.forEach(rot => {
        const tgtCalYear = rot.month >= 5 ? targetYear : targetYear + 1;
        const tempId = `rot_${targetResidentId}_${tgtCalYear}_${rot.month}`;
        const newRot = {
          residentId: targetResidentId,
          month: rot.month,
          year: tgtCalYear,
          unitId: rot.unitId,
          isVacation: rot.isVacation
        };
        batch.set(doc(db, 'rotations', tempId), newRot);
        newCopiedRotations.push({ id: tempId, ...newRot } as Rotation);
      });

      await batch.commit();

      set((state) => {
        const filtered = state.rotations.filter(
          r => !(r.residentId === targetResidentId &&
            ((r.month >= 5 && r.year === targetYear) || (r.month < 5 && r.year === targetYear + 1)))
        );
        return { rotations: [...filtered, ...newCopiedRotations] };
      });
    } catch (err) {
      console.error('Error copying rotations row:', err);
    }
  },

  cloneAcademicYear: async (sourceYear, targetYear) => {
    pushToHistory(get, set);
    // Find all rotations for the source academic year (from June sourceYear to May sourceYear + 1)
    const sourceRotations = get().rotations.filter(
      r => (r.month >= 5 && r.year === sourceYear) || (r.month < 5 && r.year === sourceYear + 1)
    );

    if (sourceRotations.length === 0) return;

    if (isMockMode()) {
      set((state) => {
        // Delete all rotations in the target academic year
        const filtered = state.rotations.filter(
          r => !((r.month >= 5 && r.year === targetYear) || (r.month < 5 && r.year === targetYear + 1))
        );
        
        const newCopied = sourceRotations.map(rot => {
          const tgtCalYear = rot.month >= 5 ? targetYear : targetYear + 1;
          return {
            id: Math.random().toString(36).substr(2, 9),
            residentId: rot.residentId,
            month: rot.month,
            year: tgtCalYear,
            unitId: rot.unitId,
            isVacation: rot.isVacation
          };
        });

        return { rotations: [...filtered, ...newCopied] };
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Delete existing rotations in target academic year
      const targetRotationsInState = get().rotations.filter(
        r => (r.month >= 5 && r.year === targetYear) || (r.month < 5 && r.year === targetYear + 1)
      );

      targetRotationsInState.forEach(r => {
        batch.delete(doc(db, 'rotations', r.id));
      });

      const newCopiedRotations: Rotation[] = [];
      sourceRotations.forEach(rot => {
        const tgtCalYear = rot.month >= 5 ? targetYear : targetYear + 1;
        const tempId = `rot_${rot.residentId}_${tgtCalYear}_${rot.month}`;
        const newRot = {
          residentId: rot.residentId,
          month: rot.month,
          year: tgtCalYear,
          unitId: rot.unitId,
          isVacation: rot.isVacation
        };
        batch.set(doc(db, 'rotations', tempId), newRot);
        newCopiedRotations.push({ id: tempId, ...newRot } as Rotation);
      });

      await batch.commit();

      set((state) => {
        const filtered = state.rotations.filter(
          r => !((r.month >= 5 && r.year === targetYear) || (r.month < 5 && r.year === targetYear + 1))
        );
        return { rotations: [...filtered, ...newCopiedRotations] };
      });
    } catch (err) {
      console.error('Error cloning academic year:', err);
    }
  },

  undo: async () => {
    const history = get().history || [];
    if (history.length === 0) return;
    
    set({ isLoading: true });
    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const currentState = get().rotations;
    
    if (isMockMode()) {
      set({
        rotations: previousState,
        history: newHistory,
        isLoading: false
      });
      return;
    }
    
    try {
      const batch = writeBatch(db);
      
      // 1. Delete rotations that were added in current state
      const toDelete = currentState.filter(curr => !previousState.some(prev => prev.id === curr.id));
      toDelete.forEach(rot => {
        batch.delete(doc(db, 'rotations', rot.id));
      });
      
      // 2. Add or update rotations from previous state
      previousState.forEach(prev => {
        const curr = currentState.find(c => c.id === prev.id);
        if (!curr) {
          const { id, ...data } = prev;
          batch.set(doc(db, 'rotations', id), data);
        } else {
          const hasChanged = 
            curr.residentId !== prev.residentId ||
            curr.month !== prev.month ||
            curr.year !== prev.year ||
            curr.unitId !== prev.unitId ||
            curr.isVacation !== prev.isVacation ||
            curr.status !== prev.status ||
            curr.customName !== prev.customName;
            
          if (hasChanged) {
            const { id, ...data } = prev;
            batch.set(doc(db, 'rotations', id), data);
          }
        }
      });
      
      await batch.commit();
      
      set({
        rotations: previousState,
        history: newHistory,
        isLoading: false
      });
    } catch (err) {
      console.error('Error during undo operation:', err);
      set({ isLoading: false });
    }
  }
}));
