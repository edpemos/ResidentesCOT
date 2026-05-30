import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Library, Stethoscope, X, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const navItems = [
    { name: 'Pizarra de Rotaciones', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Sesiones Semanales', path: '/sessions', icon: CalendarDays },
    { name: 'Biblioteca', path: '/library', icon: Library },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Ajustes', path: '/settings', icon: Settings });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-800/50 z-20 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-30 bg-slate-900 text-slate-300 transform transition-all duration-300 ease-in-out flex flex-col overflow-hidden group shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "w-64 lg:w-16 lg:hover:w-64"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-slate-950 border-b border-slate-800 overflow-hidden shrink-0">
          <div className="flex items-center text-white min-w-0">
            <div className="bg-blue-500 p-1.5 rounded-lg flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-wide whitespace-nowrap transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-32 overflow-hidden ml-2 lg:ml-0 lg:group-hover:ml-2">
              COT Sync
            </span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={({ isActive }) =>
                clsx(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-300 px-3 py-2.5 gap-3 whitespace-nowrap",
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-40 overflow-hidden">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-auto lg:w-0 lg:group-hover:w-56 overflow-hidden whitespace-nowrap shrink-0">
          &copy; {new Date().getFullYear()} COT Internal App
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
