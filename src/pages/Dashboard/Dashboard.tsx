import React, { useState } from 'react';
import Board from './Board';
import CounterPanel from './CounterPanel';
import ResidentConfigModal from './ResidentConfigModal';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { Settings2, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { residents } = useRotationStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const graduados = residents.filter(r => r.year === 'Graduado');

  return (
    <div className="h-full flex flex-col">
      {isAdmin && graduados.length > 0 && (
        <div className="mb-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-orange-500 mr-3 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-orange-800 font-medium">Aviso de Graduación</h4>
            <p className="text-sm text-orange-700 mt-1">
              Hay {graduados.length} residente(s) ({graduados.map(g => g.lastName).join(', ')}) que ha(n) superado los 5 años en el programa. 
              Por favor, revísalos en la Configuración de Residentes y elimínalos de la plataforma si ya finalizaron.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pizarra de Rotaciones</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gestión visual del plan formativo anual
          </p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
          >
            <Settings2 className="w-4 h-4" />
            Configurar Residentes
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Pizarra Principal */}
        <div className="flex-1 overflow-auto">
          <Board />
        </div>

        {/* Panel Lateral de Contadores */}
        <div className="w-full lg:w-64 shrink-0 overflow-auto">
          <CounterPanel />
        </div>
      </div>

      <ResidentConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
};

export default Dashboard;
