import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { Menu } from 'lucide-react';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const { initializeStore } = useRotationStore();
  const { loadUnits } = useUnitStore();

  useEffect(() => {
    if (user) {
      loadUnits();
      initializeStore();
    }
  }, [user, loadUnits, initializeStore]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      {/* Botón flotante del menú de navegación (FAB) en móviles */}
      <button 
        onClick={toggleSidebar}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full lg:hidden shadow-lg shadow-blue-500/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        title="Menú de Navegación"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
