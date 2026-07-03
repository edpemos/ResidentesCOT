import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { AppLogo } from '../../components/common/AppLogo';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { adminEmails } = useAuthStore.getState();
      const mockMode = import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key' || !import.meta.env.VITE_FIREBASE_API_KEY;
      
      // 1. Check custom readers first (works in both mock and real mode)
      if (mockMode) {
        const stored = localStorage.getItem('mock-readers');
        const readers = stored ? JSON.parse(stored) : [];
        const matched = readers.find((r: any) => r.username.toLowerCase() === email.toLowerCase() && r.password === password);
        if (matched) {
          const role = matched.role || 'reader';
          localStorage.setItem('session-reader', email.toLowerCase());
          localStorage.setItem('session-reader-role', role);
          useAuthStore.setState({
            user: { uid: 'reader-' + email, email, displayName: email } as any,
            role,
            isLoading: false,
            needsSetup: false
          });
          return;
        }
      } else {
        // Dynamic imports to avoid blocking build/loading
        const { doc, getDocFromServer } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');
        try {
          // Usamos getDocFromServer para saltarnos el caché local y forzar lectura desde red
          const docRef = doc(db, 'readers', email.toLowerCase());
          const docSnap = await getDocFromServer(docRef);
          if (docSnap.exists() && docSnap.data().password === password) {
            const role = docSnap.data().role || 'reader';
            localStorage.setItem('session-reader', email.toLowerCase());
            localStorage.setItem('session-reader-role', role);
            useAuthStore.setState({
              user: { uid: 'reader-' + email, email, displayName: email } as any,
              role,
              isLoading: false,
              needsSetup: false
            });
            return;
          }
        } catch (e) {
          console.error('Error verifying reader in firestore:', e);
        }
      }
      
      // MOCK LOGIN if Firebase is not configured
      if (mockMode) {
        setTimeout(() => {
          const isAdmin = adminEmails.map(e => e.toLowerCase()).includes(email.toLowerCase());
          useAuthStore.setState({
            user: { uid: isAdmin ? 'mock-admin' : 'mock-reader', email, emailVerified: true } as any,
            role: isAdmin ? 'admin' : 'reader',
          });
        }, 800);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Credenciales incorrectas o usuario no encontrado.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(20,184,166,0.04)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-teal-900/30 rounded-3xl p-8 shadow-2xl shadow-teal-950/80 z-10 flex flex-col relative overflow-hidden group">
        {/* Subtle top border glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500/10 via-teal-500/50 to-emerald-500/10" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-950/40 border border-teal-900/40 text-white shadow-lg shadow-teal-500/10 rotate-[-8deg] hover:rotate-0 transition-transform duration-500 ease-out mb-4">
            <AppLogo size={44} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-200 via-slate-100 to-emerald-300 bg-clip-text text-transparent mb-1">
            COT Sync
          </h2>
          <p className="text-teal-300/80 text-[10px] font-black uppercase tracking-widest">
            Portal de Gestión de Residentes
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="space-y-2 group/input">
            <label className="block text-xs font-bold text-teal-300/80 uppercase tracking-wider">
              Usuario o Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-11 pr-4 py-3 border border-slate-800 bg-slate-950/45 text-white rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder-slate-650 text-sm font-medium"
                placeholder="Introduce tu usuario o email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 group/input">
            <label className="block text-xs font-bold text-teal-300/80 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-11 pr-4 py-3 border border-slate-800 bg-slate-950/45 text-white rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder-slate-650 text-sm font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-teal-600/20 hover:shadow-emerald-500/30 transition-all duration-300 transform active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed select-none"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Acceder al Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-[10px] text-slate-500 mt-8 font-semibold tracking-wide">
          &copy; {new Date().getFullYear()} COT Sync &bull; Todos los derechos reservados
        </div>
      </div>
    </div>
  );
};

export default Login;
