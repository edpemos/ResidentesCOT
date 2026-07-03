import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

const configDoc = () => doc(db, 'config', 'settings');

export interface Reader {
  username: string;
  password?: string;
  role?: 'reader' | 'coordinador';
}

interface AuthState {
  user: User | null;
  role: 'admin' | 'reader' | 'coordinador' | null;
  isLoading: boolean;
  needsSetup: boolean;
  adminEmails: string[];
  readers: Reader[];
  initializeAsAdmin: () => Promise<void>;
  addAdmin: (email: string) => Promise<void>;
  removeAdmin: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchReaders: () => Promise<void>;
  addReader: (username: string, password: string, role?: 'reader' | 'coordinador') => Promise<void>;
  removeReader: (username: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: true,
  needsSetup: false,
  adminEmails: isMockMode() ? ['admin@hospital.com', 'edpemos@gmail.com'] : [],
  readers: [],

  initializeAsAdmin: async () => {
    const { user } = get();
    if (!user?.email) return;
    const email = user.email;
    await setDoc(configDoc(), { adminEmails: [email] });
    set({ role: 'admin', needsSetup: false, adminEmails: [email] });
  },

  addAdmin: async (email: string) => {
    if (isMockMode()) {
      set(state => ({ adminEmails: [...state.adminEmails, email] }));
      return;
    }
    await updateDoc(configDoc(), { adminEmails: arrayUnion(email) });
    set(state => ({ adminEmails: [...state.adminEmails, email] }));
  },

  removeAdmin: async (email: string) => {
    if (isMockMode()) {
      set(state => ({ adminEmails: state.adminEmails.filter(e => e !== email) }));
      return;
    }
    await updateDoc(configDoc(), { adminEmails: arrayRemove(email) });
    set(state => ({ adminEmails: state.adminEmails.filter(e => e !== email) }));
  },

  logout: async () => {
    localStorage.removeItem('session-reader');
    localStorage.removeItem('session-reader-role');
    if (isMockMode()) {
      set({ user: null, role: null, needsSetup: false });
      return;
    }
    await signOut(auth);
    set({ user: null, role: null, adminEmails: [], needsSetup: false });
  },

  fetchReaders: async () => {
    if (isMockMode()) {
      const stored = localStorage.getItem('mock-readers');
      const mockReaders = stored ? JSON.parse(stored) : [];
      set({ readers: mockReaders });
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'readers'));
      const readers: Reader[] = [];
      snap.forEach(d => {
        readers.push({ username: d.id, ...d.data() } as Reader);
      });
      set({ readers });
    } catch (err) {
      console.error('Error fetching readers:', err);
    }
  },

  addReader: async (username: string, password: string, role: 'reader' | 'coordinador' = 'reader') => {
    const newReader = { username, password, role };
    if (isMockMode()) {
      const stored = localStorage.getItem('mock-readers');
      const readers = stored ? JSON.parse(stored) : [];
      const updated = [...readers.filter((r: any) => r.username !== username), newReader];
      localStorage.setItem('mock-readers', JSON.stringify(updated));
      set({ readers: updated });
      return;
    }
    await setDoc(doc(db, 'readers', username), { password, role });
    set(state => {
      const updated = [...state.readers.filter(r => r.username !== username), newReader];
      return { readers: updated };
    });
  },

  removeReader: async (username: string) => {
    if (isMockMode()) {
      const stored = localStorage.getItem('mock-readers');
      const readers = stored ? JSON.parse(stored) : [];
      const updated = readers.filter((r: any) => r.username !== username);
      localStorage.setItem('mock-readers', JSON.stringify(updated));
      set({ readers: updated });
      return;
    }
    await deleteDoc(doc(db, 'readers', username));
    set(state => ({ readers: state.readers.filter(r => r.username !== username) }));
  },
}));

// Auth state listener
onAuthStateChanged(auth, async (firebaseUser) => {
  const storedReader = localStorage.getItem('session-reader');
  const storedReaderRole = (localStorage.getItem('session-reader-role') as 'reader' | 'coordinador') || 'reader';
  if (storedReader) {
    useAuthStore.setState({
      user: { uid: 'reader-' + storedReader, email: storedReader, displayName: storedReader } as any,
      role: storedReaderRole,
      isLoading: false,
      needsSetup: false
    });
    return;
  }

  if (isMockMode()) {
    useAuthStore.setState({ isLoading: false });
    return;
  }

  if (firebaseUser) {
    useAuthStore.setState({ user: firebaseUser, isLoading: true });
    try {
      const snap = await getDoc(configDoc());
      if (!snap.exists()) {
        useAuthStore.setState({ role: null, needsSetup: true, adminEmails: [], isLoading: false });
      } else {
        const adminEmails: string[] = snap.data().adminEmails || [];
        const normalizedEmail = (firebaseUser.email ?? '').toLowerCase();
        const role = adminEmails.map(e => e.toLowerCase()).includes(normalizedEmail) ? 'admin' : 'reader';
        useAuthStore.setState({ role, adminEmails, needsSetup: false, isLoading: false });
      }
    } catch (error: any) {
      // If permission-denied, Firestore rules haven't been set up yet → show setup screen
      if (error?.code === 'permission-denied') {
        useAuthStore.setState({ role: null, needsSetup: true, adminEmails: [], isLoading: false });
      } else {
        console.error('Error fetching config:', error);
        useAuthStore.setState({ role: 'reader', isLoading: false });
      }
    }
  } else {
    useAuthStore.setState({ user: null, role: null, adminEmails: [], needsSetup: false, isLoading: false });
  }
});
