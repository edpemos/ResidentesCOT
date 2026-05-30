import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

const configDoc = () => doc(db, 'config', 'settings');

interface AuthState {
  user: User | null;
  role: 'admin' | 'reader' | null;
  isLoading: boolean;
  needsSetup: boolean;
  adminEmails: string[];
  initializeAsAdmin: () => Promise<void>;
  addAdmin: (email: string) => Promise<void>;
  removeAdmin: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: true,
  needsSetup: false,
  adminEmails: isMockMode() ? ['admin@hospital.com', 'edpemos@gmail.com'] : [],

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
    if (isMockMode()) {
      set({ user: null, role: null, needsSetup: false });
      return;
    }
    await signOut(auth);
    set({ user: null, role: null, adminEmails: [], needsSetup: false });
  },
}));

// Auth state listener
onAuthStateChanged(auth, async (firebaseUser) => {
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
        const role = adminEmails.includes(firebaseUser.email ?? '') ? 'admin' : 'reader';
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
