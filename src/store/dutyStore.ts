import { create } from 'zustand';
import type { Duty, DutyType, Liquidation, LiquidationSummaryItem } from '../types';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

const getMockDuties = (): Duty[] => {
  const stored = localStorage.getItem('mock-duties');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing mock duties:', e);
    }
  }
  // Default seeded mock duties for testing if none exist
  const seeded: Duty[] = [
    {
      id: 'res_1_2026-06-15',
      residentId: 'res_1',
      date: '2026-06-15',
      type: 'guardia',
      notes: 'Guardia de lunes'
    },
    {
      id: 'res_1_2026-06-17',
      residentId: 'res_1',
      date: '2026-06-17',
      type: 'tarde',
      notes: 'Consulta de mañana/tarde'
    },
    {
      id: 'res_2_2026-06-16',
      residentId: 'res_2',
      date: '2026-06-16',
      type: 'libre',
      notes: 'Día de congreso'
    }
  ];
  localStorage.setItem('mock-duties', JSON.stringify(seeded));
  return seeded;
};

const getMockLiquidations = (): Liquidation[] => {
  const stored = localStorage.getItem('mock-liquidations');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing mock liquidations:', e);
    }
  }
  return [];
};

interface DutyState {
  duties: Duty[];
  liquidations: Liquidation[];
  isLoading: boolean;
  initializeStore: () => Promise<void>;
  assignDuty: (residentId: string, date: string, type: DutyType, notes?: string, hasTarde?: boolean, hasTardeEspecial?: boolean) => Promise<void>;
  removeDuty: (residentId: string, date: string) => Promise<void>;
  assignDutiesBulk: (assignments: { residentId: string; date: string; type: DutyType; notes?: string; hasTarde?: boolean; hasTardeEspecial?: boolean }[]) => Promise<void>;
  removeDutiesBulk: (ids: string[]) => Promise<void>;
  clearDutiesForMonth: (year: number, monthIndex: number) => Promise<void>;
  loadLiquidations: () => Promise<void>;
  liquidateMonth: (year: number, monthIndex: number, adminEmail: string, summary: LiquidationSummaryItem[], dutiesSnapshot: Duty[]) => Promise<void>;
}

export const useDutyStore = create<DutyState>((set, get) => ({
  duties: [],
  liquidations: [],
  isLoading: false,

  initializeStore: async () => {
    if (isMockMode()) {
      set({ duties: getMockDuties(), liquidations: getMockLiquidations() });
      return;
    }
    set({ isLoading: true });
    try {
      const snap = await getDocs(collection(db, 'duties'));
      const loaded: Duty[] = [];
      snap.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() } as Duty);
      });

      const liqSnap = await getDocs(collection(db, 'liquidations'));
      const loadedLiq: Liquidation[] = [];
      liqSnap.forEach(doc => {
        loadedLiq.push({ id: doc.id, ...doc.data() } as Liquidation);
      });

      set({ duties: loaded, liquidations: loadedLiq, isLoading: false });
    } catch (err) {
      console.error('Error initializing duties:', err);
      set({ isLoading: false });
    }
  },

  assignDuty: async (residentId, date, type, notes = '', hasTarde = false, hasTardeEspecial = false) => {
    const id = `${residentId}_${date}`;
    const newDuty: Duty = { id, residentId, date, type, notes, hasTarde, hasTardeEspecial };

    if (isMockMode()) {
      set((state) => {
        const updated = [...state.duties.filter((d) => d.id !== id), newDuty];
        localStorage.setItem('mock-duties', JSON.stringify(updated));
        return { duties: updated };
      });
      return;
    }

    try {
      await setDoc(doc(db, 'duties', id), {
        residentId,
        date,
        type,
        notes,
        hasTarde,
        hasTardeEspecial
      });
      set((state) => ({
        duties: [...state.duties.filter((d) => d.id !== id), newDuty]
      }));
    } catch (err) {
      console.error('Error assigning duty:', err);
    }
  },

  removeDuty: async (residentId, date) => {
    const id = `${residentId}_${date}`;

    if (isMockMode()) {
      set((state) => {
        const updated = state.duties.filter((d) => d.id !== id);
        localStorage.setItem('mock-duties', JSON.stringify(updated));
        return { duties: updated };
      });
      return;
    }

    try {
      await deleteDoc(doc(db, 'duties', id));
      set((state) => ({
        duties: state.duties.filter((d) => d.id !== id)
      }));
    } catch (err) {
      console.error('Error removing duty:', err);
    }
  },

  assignDutiesBulk: async (assignments) => {
    if (assignments.length === 0) return;

    const newDuties: Duty[] = assignments.map((a) => ({
      id: `${a.residentId}_${a.date}`,
      residentId: a.residentId,
      date: a.date,
      type: a.type,
      notes: a.notes || '',
      hasTarde: a.hasTarde || false,
      hasTardeEspecial: a.hasTardeEspecial || false,
    }));

    if (isMockMode()) {
      set((state) => {
        const idsToFilter = new Set(newDuties.map((d) => d.id));
        const updated = [...state.duties.filter((d) => !idsToFilter.has(d.id)), ...newDuties];
        localStorage.setItem('mock-duties', JSON.stringify(updated));
        return { duties: updated };
      });
      return;
    }

    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const batch = writeBatch(db);

      newDuties.forEach((d) => {
        const docRef = doc(db, 'duties', d.id);
        batch.set(docRef, {
          residentId: d.residentId,
          date: d.date,
          type: d.type,
          notes: d.notes,
          hasTarde: d.hasTarde,
          hasTardeEspecial: d.hasTardeEspecial,
        });
      });

      await batch.commit();

      set((state) => {
        const idsToFilter = new Set(newDuties.map((d) => d.id));
        const updated = [...state.duties.filter((d) => !idsToFilter.has(d.id)), ...newDuties];
        return { duties: updated };
      });
    } catch (err) {
      console.error('Error assigning duties in bulk:', err);
    }
  },

  clearDutiesForMonth: async (year, monthIndex) => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;

    if (isMockMode()) {
      set((state) => {
        const updated = state.duties.filter((d) => !d.date.startsWith(prefix));
        localStorage.setItem('mock-duties', JSON.stringify(updated));
        return { duties: updated };
      });
      return;
    }

    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const dutiesToDelete = get().duties.filter((d) => d.date.startsWith(prefix));
      if (dutiesToDelete.length === 0) return;

      const batch = writeBatch(db);
      dutiesToDelete.forEach((d) => {
        const docRef = doc(db, 'duties', d.id);
        batch.delete(docRef);
      });

      await batch.commit();

      set((state) => ({
        duties: state.duties.filter((d) => !d.date.startsWith(prefix)),
      }));
    } catch (err) {
      console.error('Error clearing duties for month:', err);
    }
  },

  removeDutiesBulk: async (ids) => {
    if (ids.length === 0) return;

    if (isMockMode()) {
      set((state) => {
        const idSet = new Set(ids);
        const updated = state.duties.filter((d) => !idSet.has(d.id));
        localStorage.setItem('mock-duties', JSON.stringify(updated));
        return { duties: updated };
      });
      return;
    }

    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const batch = writeBatch(db);

      ids.forEach((id) => {
        const docRef = doc(db, 'duties', id);
        batch.delete(docRef);
      });

      await batch.commit();

      set((state) => {
        const idSet = new Set(ids);
        const updated = state.duties.filter((d) => !idSet.has(d.id));
        return { duties: updated };
      });
    } catch (err) {
      console.error('Error removing duties in bulk:', err);
    }
  },

  loadLiquidations: async () => {
    if (isMockMode()) {
      set({ liquidations: getMockLiquidations() });
      return;
    }
    try {
      const liqSnap = await getDocs(collection(db, 'liquidations'));
      const loadedLiq: Liquidation[] = [];
      liqSnap.forEach(doc => {
        loadedLiq.push({ id: doc.id, ...doc.data() } as Liquidation);
      });
      set({ liquidations: loadedLiq });
    } catch (err) {
      console.error('Error loading liquidations:', err);
    }
  },

  liquidateMonth: async (year, monthIndex, adminEmail, summary, dutiesSnapshot) => {
    const id = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const newLiquidation: Liquidation = {
      id,
      year,
      monthIndex,
      liquidatedAt: new Date().toISOString(),
      liquidatedBy: adminEmail,
      summary,
      dutiesSnapshot
    };

    if (isMockMode()) {
      set((state) => {
        const updated = [...state.liquidations.filter(l => l.id !== id), newLiquidation];
        localStorage.setItem('mock-liquidations', JSON.stringify(updated));
        return { liquidations: updated };
      });
      return;
    }

    try {
      await setDoc(doc(db, 'liquidations', id), newLiquidation);
      set((state) => ({
        liquidations: [...state.liquidations.filter(l => l.id !== id), newLiquidation]
      }));
    } catch (err) {
      console.error('Error liquidating month:', err);
    }
  },
}));
