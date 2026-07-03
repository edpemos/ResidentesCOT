import React, { useState, useEffect } from 'react';
import { useDutyStore } from '../../store/dutyStore';
import { useRotationStore } from '../../store/rotationStore';
import { useAuthStore } from '../../store/authStore';
import type { Duty, Liquidation, LiquidationSummaryItem } from '../../types';
import { 
  Calculator, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  User, 
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import clsx from 'clsx';

const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getCompactPrimaryStyle = (type: string) => {
  switch (type) {
    case 'guardia': return { bg: 'bg-red-500 text-white', label: 'G' };
    case 'saliente':
    case 'saliente-manual': return { bg: 'bg-teal-800 text-white', label: 'S' };
    case 'libre': return { bg: 'bg-teal-600 text-white', label: 'L' };
    case 'manana': return { bg: 'bg-yellow-400 text-slate-900 border border-yellow-500', label: 'M' };
    case 'vacaciones': return { bg: 'bg-teal-600 text-white', label: 'V' };
    case 'vacaciones-pendiente': return { bg: 'bg-teal-500/15 text-teal-600 border border-dashed border-teal-400/50', label: 'V?' };
    case 'curso': return { bg: 'bg-purple-400 text-white', label: 'C' };
    case 'rucot': return { bg: 'bg-blue-600 text-white', label: 'R' };
    case 'tarde': return { bg: 'bg-orange-500 text-white', label: 'T' };
    case 'tarde-especial': return { bg: 'bg-orange-500 text-white', label: 'TE' };
    default: return { bg: 'bg-slate-500 text-white', label: '?' };
  }
};

const renderCompactCell = (duty: any) => {
  if (!duty) return null;

  if (duty.type === 'rucot-guardia') {
    return (
      <div className="w-5 h-5 rounded-xs relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-3xs text-[7px] font-black">
        <div className="absolute inset-0 flex items-start justify-start p-0.5 bg-blue-600 text-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>R</div>
        <div className="absolute inset-0 flex items-end justify-end p-0.5 bg-red-500 text-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>G</div>
      </div>
    );
  }

  const hasTarde = duty.hasTarde === true;
  const hasTardeEspecial = duty.hasTardeEspecial === true;
  const isSplit = (hasTarde || hasTardeEspecial) && duty.type !== 'tarde' && duty.type !== 'tarde-especial' && duty.type !== 'no-saliente';
  
  if (isSplit) {
    const style = getCompactPrimaryStyle(duty.type);
    const secLabel = hasTardeEspecial ? 'TE' : 'T';
    return (
      <div className="w-5 h-5 rounded-xs relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-3xs text-[7px] font-black">
        <div className={`absolute inset-0 flex items-start justify-start p-0.5 ${style.bg}`} style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>{style.label}</div>
        <div className="absolute inset-0 flex items-end justify-end p-0.5 bg-orange-500 text-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>{secLabel}</div>
      </div>
    );
  }

  let effectiveType = duty.type;
  if (!effectiveType) {
    if (hasTardeEspecial) effectiveType = 'tarde-especial';
    else if (hasTarde) effectiveType = 'tarde';
  }

  if (!effectiveType) return null;
  const style = getCompactPrimaryStyle(effectiveType);

  return (
    <div className={`w-5 h-5 rounded-xs flex items-center justify-center text-[8px] font-black shadow-3xs border border-slate-200/50 dark:border-slate-800 ${style.bg}`}>
      {style.label}
    </div>
  );
};

const MonthlyLiquidations: React.FC = () => {
  const { user } = useAuthStore();
  const { duties, liquidations, initializeStore: initDutyStore, liquidateMonth } = useDutyStore();
  const { residents, initializeStore: initRotationStore } = useRotationStore();
  
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; monthIndex: number; id: string; label: string } | null>(null);
  const [previewSummary, setPreviewSummary] = useState<LiquidationSummaryItem[]>([]);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [expandedLiquidationId, setExpandedLiquidationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, 'summary' | 'grid'>>({});

  useEffect(() => {
    initDutyStore();
    initRotationStore();
  }, [initDutyStore, initRotationStore]);

  // Generate list of completed months (e.g. preceding the current month)
  const getPastMonths = () => {
    const months = [];
    const now = new Date();
    // Generate months from 12 months ago up to the previous month
    const start = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    let curr = new Date(start);
    while (curr <= end) {
      months.push({
        year: curr.getFullYear(),
        monthIndex: curr.getMonth(),
        label: `${MONTHS_SPANISH[curr.getMonth()]} ${curr.getFullYear()}`,
        id: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`
      });
      curr.setMonth(curr.getMonth() + 1);
    }
    return months.reverse(); // Newest first
  };

  const pastMonths = getPastMonths();

  // Get subset of duties for a given month
  const getMonthDuties = (year: number, monthIndex: number): Duty[] => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    return duties.filter(d => d.date.startsWith(prefix));
  };

  // Generate the monthly summary counts for each resident
  const calculateMonthSummary = (year: number, monthIndex: number): LiquidationSummaryItem[] => {
    const monthDuties = getMonthDuties(year, monthIndex);
    const realResidents = residents.filter(r => !r.id.startsWith('temp-') && r.year !== 'Graduado');

    return realResidents.map(res => {
      const resDuties = monthDuties.filter(d => d.residentId === res.id);
      
      const guardsCount = resDuties.filter(d => d.type === 'guardia' || d.type === 'rucot-guardia').length;
      const afternoonsCount = resDuties.filter(d => 
        d.type === 'tarde' || d.type === 'tarde-especial' || d.hasTarde === true || d.hasTardeEspecial === true
      ).length;
      const freeDaysCount = resDuties.filter(d => d.type === 'libre').length;
      const vacationsCount = resDuties.filter(d => d.type === 'vacaciones').length;
      const rucotCount = resDuties.filter(d => d.type === 'rucot' || d.type === 'rucot-guardia').length;

      return {
        residentId: res.id,
        residentName: `${res.firstName} ${res.lastName}`,
        guardsCount,
        afternoonsCount,
        freeDaysCount,
        vacationsCount,
        rucotCount
      };
    });
  };

  const handleOpenLiquidate = (month: typeof pastMonths[0]) => {
    const summary = calculateMonthSummary(month.year, month.monthIndex);
    setPreviewSummary(summary);
    setSelectedMonth(month);
  };

  const handleConfirmLiquidate = async () => {
    if (!selectedMonth || !user?.email) return;
    setIsLiquidating(true);
    
    const snapshot = getMonthDuties(selectedMonth.year, selectedMonth.monthIndex);
    
    await liquidateMonth(
      selectedMonth.year,
      selectedMonth.monthIndex,
      user.email,
      previewSummary,
      snapshot
    );
    
    setIsLiquidating(false);
    setSelectedMonth(null);
    setPreviewSummary([]);
  };

  const exportLiquidationToCSV = (liq: Liquidation) => {
    const csvRows = [];
    const monthName = MONTHS_SPANISH[liq.monthIndex];
    csvRows.push(`REGISTRO OFICIAL DE LIQUIDACIÓN MENSUAL - ${monthName.toUpperCase()} ${liq.year}`);
    csvRows.push(`Fecha de cierre: ${new Date(liq.liquidatedAt).toLocaleString()}`);
    csvRows.push(`Liquidado por: ${liq.liquidatedBy}`);
    csvRows.push('');
    csvRows.push('Residente;Guardias (G);Tardes (T/TE);Días Libres (L);Vacaciones (V);RUCOT (R)');

    liq.summary.forEach(item => {
      csvRows.push([
        item.residentName,
        item.guardsCount,
        item.afternoonsCount,
        item.freeDaysCount,
        item.vacationsCount,
        item.rucotCount
      ].join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Liquidacion_${liq.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase font-heading flex items-center gap-2">
          <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Liquidación Mensual de Guardias
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Cierre oficial de turnos y guardias de meses completados. Las liquidaciones se archivan de manera inmutable.
        </p>
      </div>

      {/* Info Warning */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-450 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-655 dark:text-slate-400 space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">¿Cómo funciona el cierre mensual?</p>
          <p>
            Al finalizar un mes de guardias, este desaparece del planificador de turnos del personal y queda disponible para su **liquidación**. 
            Liquidar un mes guarda una captura fotográfica inmutable de todos los turnos realizados y calcula los acumulados oficiales para nóminas.
          </p>
        </div>
      </div>

      {/* Month Selection List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Months */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Cierres Pendientes
          </h3>
          
          <div className="space-y-2">
            {pastMonths.filter(m => !liquidations.some(l => l.id === m.id)).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay meses pasados pendientes de liquidación.</p>
            ) : (
              pastMonths
                .filter(m => !liquidations.some(l => l.id === m.id))
                .map(month => {
                  const monthDutiesCount = getMonthDuties(month.year, month.monthIndex).length;
                  return (
                    <div 
                      key={month.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 hover:border-amber-400/40 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-250 font-heading uppercase">{month.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{monthDutiesCount} registros de turnos encontrados</p>
                      </div>
                      <button
                        onClick={() => handleOpenLiquidate(month)}
                        disabled={monthDutiesCount === 0}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer",
                          monthDutiesCount === 0 
                            ? "bg-slate-100 text-slate-350 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 cursor-not-allowed" 
                            : "bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow-md"
                        )}
                      >
                        Liquidar Mes
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Liquidated Months History */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            Historial de Liquidaciones
          </h3>
          
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {liquidations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Aún no se ha liquidado ningún mes.</p>
            ) : (
              [...liquidations]
                .sort((a, b) => b.id.localeCompare(a.id))
                .map(liq => {
                  const isExpanded = expandedLiquidationId === liq.id;
                  const monthName = MONTHS_SPANISH[liq.monthIndex];
                  return (
                    <div 
                      key={liq.id} 
                      className="border border-slate-150 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 overflow-hidden transition-all duration-200"
                    >
                      <div 
                        onClick={() => setExpandedLiquidationId(isExpanded ? null : liq.id)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900"
                      >
                        <div>
                          <p className="text-xs font-bold text-teal-700 dark:text-teal-400 font-heading uppercase">{monthName} {liq.year}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Cerrado por: {liq.liquidatedBy.split('@')[0]}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportLiquidationToCSV(liq);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="Exportar a Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-150 dark:border-slate-850 p-3 bg-white dark:bg-slate-900 text-xs space-y-3 animate-slide-down">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                            <span>F. Cierre: {new Date(liq.liquidatedAt).toLocaleString()}</span>
                            <span>{liq.dutiesSnapshot.length} Turnos Archivados</span>
                          </div>
                                          <div className="flex gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <button
                              type="button"
                              onClick={() => setViewMode(prev => ({ ...prev, [liq.id]: 'summary' }))}
                              className={clsx(
                                "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                                (viewMode[liq.id] || 'summary') === 'summary'
                                  ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                              )}
                            >
                              Resumen de Contaje
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewMode(prev => ({ ...prev, [liq.id]: 'grid' }))}
                              className={clsx(
                                "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                                viewMode[liq.id] === 'grid'
                                  ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                              )}
                            >
                              Ver Cuadrante Completo
                            </button>
                          </div>

                          {(viewMode[liq.id] || 'summary') === 'summary' ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[10px]">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400">
                                    <th className="py-1 font-bold">Residente</th>
                                    <th className="py-1 font-bold text-center">G</th>
                                    <th className="py-1 font-bold text-center">T/TE</th>
                                    <th className="py-1 font-bold text-center">L</th>
                                    <th className="py-1 font-bold text-center">V</th>
                                    <th className="py-1 font-bold text-center">R</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {liq.summary.map(item => (
                                    <tr key={item.residentId} className="border-b border-slate-50 dark:border-slate-850/50 text-slate-700 dark:text-slate-300">
                                      <td className="py-1.5 font-medium">{item.residentName}</td>
                                      <td className="py-1.5 text-center font-bold text-red-600 dark:text-red-400">{item.guardsCount}</td>
                                      <td className="py-1.5 text-center font-bold text-yellow-600 dark:text-yellow-450">{item.afternoonsCount}</td>
                                      <td className="py-1.5 text-center text-teal-600 dark:text-teal-400">{item.freeDaysCount}</td>
                                      <td className="py-1.5 text-center">{item.vacationsCount}</td>
                                      <td className="py-1.5 text-center text-blue-600 dark:text-blue-400">{item.rucotCount}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (() => {
                            const daysInMonth = new Date(liq.year, liq.monthIndex + 1, 0).getDate();
                            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                            
                            return (
                              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-lg max-w-full">
                                <table className="border-collapse text-left text-[9px] min-w-max">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 text-slate-400">
                                      <th className="p-2 font-bold sticky left-0 bg-slate-50 dark:bg-slate-950 z-10 border-r border-slate-150 dark:border-slate-850 min-w-[120px]">Residente</th>
                                      {days.map(d => (
                                        <th key={d} className="p-1 font-bold text-center border-r border-slate-150 dark:border-slate-850 w-7 text-[8px]">{d}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {liq.summary.map(res => {
                                      return (
                                        <tr key={res.residentId} className="border-b border-slate-50 dark:border-slate-850/50 text-slate-700 dark:text-slate-300">
                                          <td className="p-2 font-medium sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-150 dark:border-slate-850 shadow-xs">{res.residentName}</td>
                                          {days.map(d => {
                                            const dateStr = `${liq.year}-${String(liq.monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                            const duty = liq.dutiesSnapshot.find(
                                              (dt: any) => dt.residentId === res.residentId && dt.date === dateStr
                                            );
                                            return (
                                              <td key={d} className="p-1 text-center border-r border-slate-150 dark:border-slate-850/40 w-7 h-7 align-middle">
                                                <div className="flex items-center justify-center">
                                                  {renderCompactCell(duty)}
                                                </div>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* LIQUIDATE CONFIRMATION MODAL */}
      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-heading flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  Liquidar Mes: {selectedMonth.label}
                </h4>
                <p className="text-[10px] text-slate-400">
                  Verifica el balance total de guardias y tardes del mes antes de realizar el cierre.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 p-4 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800 dark:text-amber-400 space-y-1">
                  <p className="font-bold">Esta acción es irreversible y archivará los registros del mes.</p>
                  <p>
                    Una vez liquidado, el mes se mantendrá guardado de forma permanente en el historial del administrador. 
                    Asegúrate de que no queden guardias o ausencias pendientes de ingresar.
                  </p>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850">
                    <tr className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="px-4 py-2.5">Residente</th>
                      <th className="px-3 py-2.5 text-center">Guardias (G)</th>
                      <th className="px-3 py-2.5 text-center">Tardes (T/TE)</th>
                      <th className="px-3 py-2.5 text-center">Libres (L)</th>
                      <th className="px-3 py-2.5 text-center">Vacaciones (V)</th>
                      <th className="px-3 py-2.5 text-center">RUCOT (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {previewSummary.map(item => (
                      <tr key={item.residentId} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                          {item.residentName}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-red-600 dark:text-red-400 bg-red-500/[0.02]">
                          {item.guardsCount}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-yellow-600 dark:text-yellow-450 bg-yellow-500/[0.02]">
                          {item.afternoonsCount}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-teal-600 dark:text-teal-400">
                          {item.freeDaysCount}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">
                          {item.vacationsCount}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/[0.02]">
                          {item.rucotCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-850 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(null);
                  setPreviewSummary([]);
                }}
                disabled={isLiquidating}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLiquidate}
                disabled={isLiquidating}
                className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLiquidating ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Cierre y Liquidar
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MonthlyLiquidations;
