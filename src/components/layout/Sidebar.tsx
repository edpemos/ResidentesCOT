import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Library, Stethoscope, X, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, collapsed = false }) => {
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
          "fixed lg:static inset-y-0 left-0 z-30 bg-slate-900 text-slate-300 transform transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={clsx(
          "h-16 flex items-center bg-slate-950 border-b border-slate-800 transition-all duration-300",
          collapsed ? "justify-center" : "justify-between px-4"
        )}>
          <div className="flex items-center gap-2 text-white">
            <div className="bg-blue-500 p-1.5 rounded-lg flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-wide whitespace-nowrap transition-all duration-300">
                COT Sync
              </span>
            )}
          </div>
          {!collapsed && (
            <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                clsx(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate transition-all duration-300">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={clsx(
          "p-4 border-t border-slate-800 text-xs text-slate-500 text-center transition-opacity duration-300",
          collapsed ? "opacity-0 h-0 p-0 overflow-hidden border-t-0" : "opacity-100"
        )}>
          &copy; {new Date().getFullYear()} COT Internal App
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
