import { create } from 'zustand';
import type { Session } from '../types';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

const MOCK_SESSIONS: Session[] = [
  {
    id: 's1',
    date: '2026-06-15T08:00:00Z',
    topic: 'Manejo Inicial de Fracturas de Pelvis',
    residentId: '1',
    tutorId: 'Dr. López',
    status: 'Pendiente'
  }
];

interface SessionState {
  sessions: Session[];
  isLoading: boolean;
  initializeStore: () => Promise<void>;
  addSession: (session: Omit<Session, 'id'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  isLoading: false,

  initializeStore: async () => {
    if (isMockMode()) {
      set({ sessions: MOCK_SESSIONS });
      return;
    }
    set({ isLoading: true });
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const loaded: Session[] = [];
      snap.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() } as Session);
      });
      set({ sessions: loaded, isLoading: false });
    } catch (err) {
      console.error('Error initializing sessions:', err);
      set({ isLoading: false });
    }
  },

  addSession: async (session) => {
    if (isMockMode()) {
      set((state) => ({
        sessions: [...state.sessions, { ...session, id: Math.random().toString(36).substr(2, 9) }]
      }));
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'sessions'), session);
      set((state) => ({
        sessions: [...state.sessions, { ...session, id: docRef.id }]
      }));
    } catch (err) {
      console.error('Error adding session:', err);
    }
  },

  updateSession: async (id, updates) => {
    if (isMockMode()) {
      set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
      }));
      return;
    }
    try {
      await updateDoc(doc(db, 'sessions', id), updates);
      set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
      }));
    } catch (err) {
      console.error('Error updating session:', err);
    }
  },

  deleteSession: async (id) => {
    if (isMockMode()) {
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      }));
      return;
    }
    try {
      await deleteDoc(doc(db, 'sessions', id));
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      }));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }
}));
