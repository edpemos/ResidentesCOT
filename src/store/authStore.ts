import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface AuthState {
  user: User | null;
  role: 'admin' | 'reader' | null;
  isLoading: boolean;
  admins: string[];
  setUser: (user: User | null) => void;
  setRole: (role: 'admin' | 'reader' | null) => void;
  addAdmin: (email: string) => void;
  removeAdmin: (email: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  admins: ['admin@hospital.com'], // Default admin
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  addAdmin: (email) => set((state) => ({ admins: [...state.admins, email] })),
  removeAdmin: (email) => set((state) => ({ admins: state.admins.filter(a => a !== email) })),
  logout: async () => {
    if (import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key' || !import.meta.env.VITE_FIREBASE_API_KEY) {
      set({ user: null, role: null });
      return;
    }
    await signOut(auth);
    set({ user: null, role: null });
  },
}));

// Initialize auth listener
onAuthStateChanged(auth, async (firebaseUser) => {
  const { setUser, setRole } = useAuthStore.getState();
  
  if (firebaseUser) {
    setUser(firebaseUser);
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setRole(userData.role as 'admin' | 'reader');
      } else {
        setRole('reader'); // Default role if not found
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole('reader');
    }
  } else {
    setUser(null);
    setRole(null);
  }
  
  useAuthStore.setState({ isLoading: false });
});
