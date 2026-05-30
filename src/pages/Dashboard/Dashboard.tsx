import React, { useState } from 'react';
import Board from './Board';
import CounterPanel from './CounterPanel';
import ResidentConfigModal from './ResidentConfigModal';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { Settings2, AlertTriangle, BarChart3 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { residents, currentYear, viewMode, selectedResidentId } = useRotationStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showCounters, setShowCounters] = useState(false);

  const graduados = residents.filter(r => r.year === 'Graduado');
  const selectedResident = residents.find(r => r.id === selectedResidentId);

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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 uppercase">
            {viewMode === 'academicYear' 
              ? `Pizarra de Rotaciones ${currentYear}/${currentYear + 1}` 
              : `Pizarra de Rotaciones — ${selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName || ''}` : ''}`}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gestión visual del plan formativo anual
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCounters(!showCounters)}
            className={`flex items-center gap-2 border px-4 py-2 rounded-lg transition-all duration-200 shadow-sm text-sm font-medium whitespace-nowrap cursor-pointer ${
              showCounters 
                ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            {showCounters ? 'Ocultar Acumulado' : 'Ver Acumulado'}
          </button>

          {isAdmin && (
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              <Settings2 className="w-4 h-4 flex-shrink-0" />
              Configurar Residentes
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Pizarra Principal */}
        <div className="flex-1 min-h-0">
          <Board />
        </div>

        {/* Panel Lateral de Contadores */}
        {showCounters && (
          <div className="w-full lg:w-64 shrink-0 overflow-auto border-l border-slate-200 pl-4 transition-all duration-300">
            <CounterPanel />
          </div>
        )}
      </div>

      <ResidentConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
};

export default Dashboard;
