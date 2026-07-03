import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomSheet from '../common/BottomSheet';
import SectionHeader from '../common/SectionHeader';
import ToastContainer from '../common/ToastContainer';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { Menu, Home, LayoutDashboard, CalendarCheck, CalendarDays } from 'lucide-react';
import clsx from 'clsx';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
  );
  const { user } = useAuthStore();
  const { initializeStore } = useRotationStore();
  const { loadUnits } = useUnitStore();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      loadUnits();
      initializeStore();
    }
  }, [user, loadUnits, initializeStore]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Determine if current page uses full-bleed layout (no internal scroll padding)
  const isFullBleed = location.pathname === '/duties' || location.pathname === '/dashboard';

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Mobile Bottom Navigation Bar — 72px + safe area */}
      <nav
        aria-label="Navegación principal"
        className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-45 bg-teal-950 border-t border-teal-900 lg:hidden flex justify-around items-start pt-2 px-1 shadow-lg"
      >
        <NavLink
          to="/home"
          aria-label="Inicio"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 text-sm font-bold gap-1.5 pb-1 transition-all',
              isActive ? 'text-emerald-400' : 'text-teal-200 hover:text-white'
            )
          }
        >
          <Home className="w-7 h-7" aria-hidden="true" />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          aria-label="Pizarra de Rotaciones"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 text-sm font-bold gap-1.5 pb-1 transition-all',
              isActive ? 'text-emerald-400' : 'text-teal-200 hover:text-white'
            )
          }
        >
          <LayoutDashboard className="w-7 h-7" aria-hidden="true" />
          <span>Pizarra</span>
        </NavLink>

        <NavLink
          to="/duties"
          aria-label="Guardias y Tardes"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 text-sm font-bold gap-1.5 pb-1 transition-all',
              isActive ? 'text-emerald-400' : 'text-teal-200 hover:text-white'
            )
          }
        >
          <CalendarCheck className="w-7 h-7" aria-hidden="true" />
          <span>Guardias</span>
        </NavLink>

        <NavLink
          to="/sessions"
          aria-label="Sesiones Semanales"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 text-sm font-bold gap-1.5 pb-1 transition-all',
              isActive ? 'text-emerald-400' : 'text-teal-200 hover:text-white'
            )
          }
        >
          <CalendarDays className="w-7 h-7" aria-hidden="true" />
          <span>Sesiones</span>
        </NavLink>

        {/* Más → abre BottomSheet en lugar de sidebar lateral */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Abrir menú completo"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="flex flex-col items-center justify-center flex-1 text-sm font-bold gap-1.5 pb-1 text-teal-200 hover:text-white transition-all cursor-pointer"
        >
          <Menu className="w-7 h-7" aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet (replaces sidebar slide for mobile "Más") */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section Header (desktop breadcrumb) */}
        <SectionHeader />

        <main
          className={clsx(
            'flex-1 flex flex-col min-h-0',
            isFullBleed
              ? 'overflow-hidden p-0 content-pb-safe lg:p-2 lg:pb-2'
              : clsx(
                  'overflow-y-auto p-2 content-pb-safe lg:pb-2',
                  location.pathname === '/home' && 'lg:overflow-hidden'
                )
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default MainLayout;
