import React, { useState } from 'react';
import Board from './Board';
import CounterPanel from './CounterPanel';
import ResidentConfigModal from './ResidentConfigModal';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore, calculateResidentYearForAcademicYear } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { Settings2, AlertTriangle, BarChart3, Download, FileSpreadsheet, RotateCcw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { role, user } = useAuthStore();
  const isAdmin = role === 'admin';
  const { residents, currentYear, viewMode, selectedResidentId, undo, history, setSelectedResidentId, setViewMode } = useRotationStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showCounters, setShowCounters] = useState(false);
  const [hasInitializedView, setHasInitializedView] = useState(false);

  React.useEffect(() => {
    if (localStorage.getItem('trigger-print') === 'true') {
      localStorage.removeItem('trigger-print');
      setTimeout(() => {
        window.print();
      }, 600);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin && user?.email && residents.length > 0 && !hasInitializedView) {
      const clientEmail = user.email.toLowerCase();
      const currentRes = residents.find(r => r.email.toLowerCase() === clientEmail);
      if (currentRes) {
        setSelectedResidentId(currentRes.id);
        setViewMode('resident');
        setHasInitializedView(true);
      }
    }
  }, [isAdmin, user, residents, hasInitializedView, setSelectedResidentId, setViewMode]);

  const graduados = residents.filter(r => r.year === 'Graduado');
  
  // Resolve selected resident from global state
  const getSelectedResidentResolved = () => {
    return residents.find(r => r.id === selectedResidentId) || null;
  };

  const selectedResident = getSelectedResidentResolved();

  const handleExportExcel = () => {
    const csvRows: string[] = [];
    csvRows.push(`PIZARRA DE ROTACIONES - CURSO ${currentYear}/${currentYear + 1};;;;;;;;;;;;;`);
    csvRows.push([
      'Residente',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo'
    ].join(';'));

    // Group residents
    const residentRowsWithLevels = residents
      .filter(r => !r.id.startsWith('temp-'))
      .map(resident => {
        const level = calculateResidentYearForAcademicYear(resident.startDate, currentYear);
        return { resident, level };
      });

    const levelRank: Record<string, number> = { 'R5': 5, 'R4': 4, 'R3': 3, 'R2': 2, 'R1': 1, 'Graduado': 0 };
    residentRowsWithLevels.sort((a, b) => (levelRank[b.level] || 0) - (levelRank[a.level] || 0));

    const { rotations } = useRotationStore.getState();
    const { units } = useUnitStore.getState();

    residentRowsWithLevels.forEach(({ resident, level }) => {
      const levelPrefix = level !== 'Graduado' ? `[${level}] ` : '';
      const residentLabel = `${levelPrefix}${resident.firstName} ${resident.lastName}`;
      const rowData = [residentLabel];

      const academicMonthIndices = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];
      academicMonthIndices.forEach(monthIndex => {
        const calendarYear = monthIndex >= 5 ? currentYear : currentYear + 1;
        const rot = rotations.find(
          r => r.residentId === resident.id && r.month === monthIndex && r.year === calendarYear
        );

        if (rot) {
          const u = units.find(unit => unit.id === rot.unitId);
          let unitName = u ? u.name : 'Desconocida';
          if (rot.customName) {
            unitName = rot.customName;
          }
          if (rot.isVacation) {
            unitName += ' (Vacaciones)';
          }
          if (rot.status === 'confirmed') {
            unitName += ' [Confirmada]';
          } else if (rot.status === 'pending') {
            unitName += ' [Pendiente]';
          }
          rowData.push(unitName);
        } else {
          rowData.push('-');
        }
      });

      csvRows.push(rowData.join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pizarra_Rotaciones_${currentYear}_${currentYear + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase font-heading">
            {viewMode === 'academicYear' 
              ? `Pizarra de Rotaciones ${currentYear}/${currentYear + 1}` 
              : `Pizarra de Rotaciones — ${selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName || ''}` : ''}`}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            {isAdmin ? 'Gestión visual del plan formativo anual' : 'Consulta visual de tu plan formativo'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 animate-fade-in shrink-0 no-print">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg hover:shadow-md transition-all duration-200 text-xs font-bold whitespace-nowrap cursor-pointer select-none border border-transparent shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
            Exportar Excel
          </button>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg hover:shadow-md transition-all duration-200 text-xs font-bold whitespace-nowrap cursor-pointer select-none border border-transparent shadow-sm"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            Exportar PDF
          </button>

          <button 
            onClick={() => setShowCounters(!showCounters)}
            className={`flex items-center gap-1.5 border px-3 py-1 rounded-lg transition-all duration-200 shadow-sm text-xs font-medium whitespace-nowrap cursor-pointer select-none ${
              showCounters 
                ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-450" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
            {showCounters ? 'Ocultar' : 'Ver Acumulado'}
          </button>

          {isAdmin && (
            <button 
              onClick={() => undo()}
              disabled={history.length === 0}
              className={`flex items-center gap-1.5 border px-3 py-1 rounded-lg transition-all duration-200 shadow-sm text-xs font-bold whitespace-nowrap cursor-pointer select-none ${
                history.length === 0
                  ? "bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-750 cursor-not-allowed opacity-50"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800 hover:shadow-xs"
              }`}
              title="Deshacer el último cambio en la pizarra"
            >
              <RotateCcw className={`w-3.5 h-3.5 flex-shrink-0 ${history.length > 0 ? "text-amber-500 animate-pulse" : ""}`} />
              Deshacer
            </button>
          )}

          {isAdmin && (
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800 transition-colors shadow-sm text-xs font-medium whitespace-nowrap cursor-pointer select-none"
            >
              <Settings2 className="w-3.5 h-3.5 flex-shrink-0" />
              Residentes
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-y-auto">
        {/* Pizarra Principal */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-[480px]">
            <Board />
          </div>
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
