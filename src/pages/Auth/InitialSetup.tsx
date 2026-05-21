import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Settings, Loader2 } from 'lucide-react';

const InitialSetup: React.FC = () => {
  const { user, initializeAsAdmin, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleInit = async () => {
    setIsLoading(true);
    await initializeAsAdmin();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración Inicial</h2>
          <p className="text-slate-500 mt-2 text-sm">
            La aplicación aún no está configurada. Como primer usuario, puedes convertirte en administrador.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Sesión iniciada como:</p>
          <p className="font-semibold text-slate-800">{user?.email}</p>
        </div>

        <button
          onClick={handleInit}
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors"
        >
          {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
          Inicializarme como Administrador
        </button>

        <button
          onClick={logout}
          className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default InitialSetup;
