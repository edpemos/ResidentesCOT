import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, Menu } from 'lucide-react';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { user, role, logout } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="p-2 mr-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
          Gestión COT
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <User className="w-4 h-4 text-slate-400" />
          <span className="font-medium truncate max-w-[150px]">{user?.email}</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ml-2">
            {role === 'admin' ? 'Admin' : 'Lector'}
          </span>
        </div>
        
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50"
          title="Cerrar Sesión"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:block">Salir</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
