import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, X, Settings, User, LogOut, Sun, Moon, Home, CalendarCheck, Mail, ClipboardList, Users } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { AppLogo } from '../common/AppLogo';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, isDark = false, onToggleTheme }) => {
  const { user, role, logout } = useAuthStore();
  const isAdmin = role === 'admin';

  const navItems = [
    { name: 'Inicio', path: '/home', icon: Home },
    { name: 'Pizarra de Rotaciones', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Guardias y Tardes', path: '/duties', icon: CalendarCheck },
    { name: 'Sesiones Semanales', path: '/sessions', icon: Megaphone },
    { name: 'Adjuntos', path: '/adjuntos', icon: Users },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Supervisión Vacaciones', path: '/vacations', icon: Mail });
    navItems.push({ name: 'Liquidación Mensual', path: '/liquidations', icon: ClipboardList });
    navItems.push({ name: 'Ajustes', path: '/settings', icon: Settings });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-800/50 z-48 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Panel de navegación lateral"
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 bg-teal-950/95 backdrop-blur-md text-teal-100 transform transition-all duration-300 ease-in-out flex flex-col overflow-y-auto lg:overflow-hidden group shadow-xl border-r border-teal-900/40",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "w-64 lg:w-16 lg:hover:w-64"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-teal-950/40 border-b border-teal-900/40 overflow-hidden shrink-0">
          <div className="flex items-center text-white min-w-0">
            <div className="flex-shrink-0 flex items-center justify-center">
              <AppLogo size={32} />
            </div>
            <span className="font-bold text-lg tracking-wide whitespace-nowrap transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-32 overflow-hidden ml-2 lg:ml-0 lg:group-hover:ml-2">
              COT Sync
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            aria-label="Cerrar menú lateral"
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Menú principal" className="flex-1 px-3 py-6 space-y-1 overflow-y-visible lg:overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={({ isActive }) =>
                clsx(
                  "flex items-center rounded-xl font-semibold transition-all duration-300 px-4 py-3.5 lg:px-3 lg:py-2.5 gap-3 whitespace-nowrap text-base lg:text-sm",
                  isActive
                    ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/30"
                    : "text-white hover:bg-teal-900/40 hover:translate-x-0.5"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0 text-white" aria-hidden="true" />
              <span className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-40 overflow-hidden">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout Section */}
        <div className="p-3 border-t border-teal-900/40 shrink-0 bg-teal-950/40">
          <div className="flex flex-col gap-2">

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <div className="px-1 mb-1">
                <button
                  onClick={onToggleTheme}
                  aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  aria-pressed={isDark}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 hover:bg-teal-900/30 text-white hover:text-white cursor-pointer select-none border border-transparent hover:border-teal-900/20"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? (
                      <Moon className="w-4 h-4 text-indigo-400 animate-pulse" aria-hidden="true" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    )}
                    <span className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-40 overflow-hidden whitespace-nowrap">
                      {isDark ? 'Modo Oscuro' : 'Modo Claro'}
                    </span>
                  </div>
                  <div className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-6 h-3.5 bg-teal-900 rounded-full p-0.5 relative" aria-hidden="true">
                    <div
                      className={clsx(
                        "w-2.5 h-2.5 rounded-full transition-all duration-300 shadow-sm",
                        isDark ? "bg-indigo-400 translate-x-2" : "bg-amber-400 translate-x-0"
                      )}
                    />
                  </div>
                </button>
              </div>
            )}

            {/* User Profile Info */}
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-teal-900/25 border border-teal-900/35 overflow-hidden min-h-[48px] shadow-inner">
              <div className="w-8 h-8 rounded-full bg-teal-900 flex items-center justify-center shrink-0 border border-teal-800/50 shadow-sm" aria-hidden="true">
                <User className="w-4 h-4 text-teal-200" />
              </div>

              <div className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-40 overflow-hidden flex flex-col">
                <span className="text-[11px] font-semibold text-white truncate" title={user?.email || ''}>
                  {user?.email}
                </span>
                <span className="text-[9px] font-extrabold uppercase text-emerald-400 tracking-wider">
                  {role === 'admin' ? 'Administrador' : role === 'coordinador' ? 'Coordinador' : 'Residente'}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => logout()}
              aria-label="Cerrar sesión"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-red-950/40 hover:text-red-400 text-white hover:translate-x-0.5 group/logout cursor-pointer select-none border border-transparent hover:border-red-900/20"
            >
              <LogOut className="w-5 h-5 flex-shrink-0 transition-colors group-hover/logout:text-red-400 text-white" aria-hidden="true" />
              <span className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-40 overflow-hidden whitespace-nowrap">
                Cerrar Sesión
              </span>
            </button>

          </div>
        </div>

        <div className="pt-3 px-3 pb-12 lg:pb-3 border-t border-teal-900/30 text-[10px] text-teal-400 text-center transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-56 overflow-hidden whitespace-nowrap shrink-0">
          &copy; {new Date().getFullYear()} COT Internal App
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
