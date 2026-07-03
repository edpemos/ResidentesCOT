import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Mail, ClipboardList, Settings, LogOut, Sun, Moon, X 
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, isDark, onToggleTheme }) => {
  const { role, user, logout } = useAuthStore();
  const isAdmin = role === 'admin';
  const sheetRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) focusable[0].focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const adminItems = isAdmin ? [
    { name: 'Supervisión Vacaciones', path: '/vacations', icon: Mail },
    { name: 'Liquidación Mensual',    path: '/liquidations', icon: ClipboardList },
    { name: 'Ajustes',               path: '/settings',    icon: Settings },
  ] : [];

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-teal-950 border-t border-teal-900/60 rounded-t-3xl shadow-2xl bottom-sheet-enter safe-area-bottom"
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-teal-800" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-teal-900/40">
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">Menú</p>
            <p className="text-[10px] text-teal-400 font-medium truncate mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-2 rounded-xl bg-teal-900/40 text-teal-300 hover:bg-teal-800/40 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin nav items */}
        {adminItems.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-teal-500 px-2 mb-2">
              Administración
            </p>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-4 px-4 py-4 rounded-xl text-base font-bold transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg'
                      : 'text-teal-100 hover:bg-teal-900/40 active:bg-teal-800/40'
                  )}
                >
                  <item.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="px-4 pt-2 pb-4 border-t border-teal-900/30 mt-2 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-base font-bold text-teal-100 hover:bg-teal-900/40 transition-all cursor-pointer"
          >
            {isDark
              ? <Moon className="w-6 h-6 text-indigo-400" aria-hidden="true" />
              : <Sun  className="w-6 h-6 text-amber-400"  aria-hidden="true" />
            }
            {isDark ? 'Modo Oscuro' : 'Modo Claro'}
            <span className="ml-auto text-[10px] text-teal-500 font-semibold">
              {isDark ? 'Activo' : 'Activo'}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-base font-bold text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-all cursor-pointer"
          >
            <LogOut className="w-6 h-6 shrink-0" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>

        {/* Safe area spacer */}
        <div className="safe-area-bottom" />
      </div>
    </>
  );
};

export default BottomSheet;
