import { create } from 'zustand';
import type { Session } from '../types';

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
  addSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: MOCK_SESSIONS,
  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, { ...session, id: Math.random().toString(36).substr(2, 9) }]
  })),
  updateSession: (id, updates) => set((state) => ({
    sessions: state.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  deleteSession: (id) => set((state) => ({
    sessions: state.sessions.filter(s => s.id !== id)
  }))
}));
