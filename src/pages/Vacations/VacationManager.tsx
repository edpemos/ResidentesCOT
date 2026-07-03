import React, { useState } from 'react';
import { useDutyStore } from '../../store/dutyStore';
import { useRotationStore } from '../../store/rotationStore';
import type { Duty } from '../../types';
import { 
  Check, 
  X, 
  Clock, 
  CalendarDays, 
  MessageSquare, 
  User, 
  ThumbsUp, 
  ThumbsDown 
} from 'lucide-react';
import clsx from 'clsx';

interface GroupedVacationRequest {
  id: string; // residentId_startDate
  residentId: string;
  startDate: string;
  endDate: string;
  notes: string;
  days: string[];
}

const formatDateSpan = (startStr: string, endStr: string) => {
  const parseDate = (dStr: string) => {
    const [y, m, d] = dStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  
  const MONTHS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  
  if (startStr === endStr) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS[start.getMonth()]} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${start.getFullYear()}`;
  }
  
  return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
};

const VacationManager: React.FC = () => {
  const { duties, assignDutiesBulk, removeDutiesBulk } = useDutyStore();
  const { residents } = useRotationStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Group pending requests
  const groupPendingRequests = (allDuties: Duty[]): GroupedVacationRequest[] => {
    const pending = allDuties.filter(d => d.type === 'vacaciones-pendiente');
    const byResident: Record<string, Duty[]> = {};
    
    pending.forEach(d => {
      if (!byResident[d.residentId]) {
        byResident[d.residentId] = [];
      }
      byResident[d.residentId].push(d);
    });

    const groups: GroupedVacationRequest[] = [];

    Object.entries(byResident).forEach(([residentId, resDuties]) => {
      const sorted = [...resDuties].sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length === 0) return;

      let currentGroup: GroupedVacationRequest = {
        id: `${residentId}_${sorted[0].date}`,
        residentId,
        startDate: sorted[0].date,
        endDate: sorted[0].date,
        notes: sorted[0].notes || '',
        days: [sorted[0].date]
      };

      for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i - 1].date);
        const currDate = new Date(sorted[i].date);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentGroup.endDate = sorted[i].date;
          currentGroup.days.push(sorted[i].date);
          const currentNotes = sorted[i].notes;
          if (currentNotes && !currentGroup.notes.includes(currentNotes)) {
            currentGroup.notes += (currentGroup.notes ? '; ' : '') + currentNotes;
          }
        } else {
          groups.push(currentGroup);
          currentGroup = {
            id: `${residentId}_${sorted[i].date}`,
            residentId,
            startDate: sorted[i].date,
            endDate: sorted[i].date,
            notes: sorted[i].notes || '',
            days: [sorted[i].date]
          };
        }
      }
      groups.push(currentGroup);
    });

    return groups.sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  // Group approved requests
  const groupApprovedVacations = (allDuties: Duty[]): GroupedVacationRequest[] => {
    const approved = allDuties.filter(d => d.type === 'vacaciones');
    const byResident: Record<string, Duty[]> = {};
    
    approved.forEach(d => {
      if (!byResident[d.residentId]) {
        byResident[d.residentId] = [];
      }
      byResident[d.residentId].push(d);
    });

    const groups: GroupedVacationRequest[] = [];

    Object.entries(byResident).forEach(([residentId, resDuties]) => {
      const sorted = [...resDuties].sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length === 0) return;

      let currentGroup: GroupedVacationRequest = {
        id: `${residentId}_${sorted[0].date}`,
        residentId,
        startDate: sorted[0].date,
        endDate: sorted[0].date,
        notes: sorted[0].notes || '',
        days: [sorted[0].date]
      };

      for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i - 1].date);
        const currDate = new Date(sorted[i].date);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentGroup.endDate = sorted[i].date;
          currentGroup.days.push(sorted[i].date);
          const currentNotes = sorted[i].notes;
          if (currentNotes && !currentGroup.notes.includes(currentNotes)) {
            currentGroup.notes += (currentGroup.notes ? '; ' : '') + currentNotes;
          }
        } else {
          groups.push(currentGroup);
          currentGroup = {
            id: `${residentId}_${sorted[i].date}`,
            residentId,
            startDate: sorted[i].date,
            endDate: sorted[i].date,
            notes: sorted[i].notes || '',
            days: [sorted[i].date]
          };
        }
      }
      groups.push(currentGroup);
    });

    return groups.sort((a, b) => b.startDate.localeCompare(a.startDate)); // Descending for history
  };

  const pendingRequests = groupPendingRequests(duties);
  const approvedVacations = groupApprovedVacations(duties);

  const handleApprove = async (request: GroupedVacationRequest) => {
    setActioningId(request.id);
    try {
      const assignments = request.days.map(date => ({
        residentId: request.residentId,
        date,
        type: 'vacaciones' as const,
        notes: request.notes
      }));
      await assignDutiesBulk(assignments);
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleDeny = async (request: GroupedVacationRequest) => {
    const confirmDeny = window.confirm('¿Estás seguro de que deseas denegar esta solicitud de vacaciones?');
    if (!confirmDeny) return;
    
    setActioningId(request.id);
    try {
      const ids = request.days.map(date => `${request.residentId}_${date}`);
      await removeDutiesBulk(ids);
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleRevoke = async (request: GroupedVacationRequest) => {
    const confirmRevoke = window.confirm('¿Estás seguro de que deseas revocar estas vacaciones aprobadas? Se eliminarán de la pizarra.');
    if (!confirmRevoke) return;
    
    setActioningId(request.id);
    try {
      const ids = request.days.map(date => `${request.residentId}_${date}`);
      await removeDutiesBulk(ids);
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900/10 p-4 md:p-6 space-y-6 overflow-y-auto">
      
      {/* Banner / Header */}
      <div className="bg-gradient-to-tr from-teal-950 to-teal-850 dark:from-slate-950 dark:to-slate-900 text-white rounded-2xl p-6 border border-teal-900/20 dark:border-slate-800 shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative z-10 space-y-1">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider font-heading flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-400" />
            Supervisión de Vacaciones
          </h1>
          <p className="text-xs text-teal-200/80 max-w-xl font-medium">
            Administra, aprueba o deniega las solicitudes de vacaciones enviadas por los residentes. Las vacaciones aprobadas se actualizarán automáticamente en la pizarra.
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <div className="shrink-0 relative z-10 bg-teal-500/20 border border-teal-400/30 px-4 py-2 rounded-xl flex items-center gap-2.5 animate-pulse">
            <Clock className="w-5 h-5 text-teal-400" />
            <span className="text-sm font-black font-mono text-white">
              {pendingRequests.length} Solicitud{pendingRequests.length > 1 ? 'es' : ''} pendiente{pendingRequests.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={clsx(
            "pb-3 text-xs font-black uppercase tracking-wider transition-all duration-300 relative cursor-pointer",
            activeTab === 'pending'
              ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          )}
        >
          Solicitudes Pendientes ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={clsx(
            "pb-3 text-xs font-black uppercase tracking-wider transition-all duration-300 relative cursor-pointer",
            activeTab === 'approved'
              ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          )}
        >
          Historial / Aprobadas ({approvedVacations.length})
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 min-h-0">
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-500">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">¡Todo al día!</h3>
                <p className="text-xs text-slate-500">No hay solicitudes de vacaciones pendientes de aprobación en este momento.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pb-6">
              {pendingRequests.map(req => {
                const resident = residents.find(r => r.id === req.residentId);
                const isWorking = actioningId === req.id;
                
                return (
                  <div 
                    key={req.id} 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-5 relative hover:border-slate-300 dark:hover:border-slate-700 transition-all group overflow-hidden"
                  >
                    {/* Top Section */}
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-2xs shrink-0">
                        {resident ? `${resident.firstName[0]}${resident.lastName?.[0] || ''}` : <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase leading-none">
                            {resident ? `${resident.firstName} ${resident.lastName}` : 'Residente Desconocido'}
                          </h3>
                          {resident && (
                            <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50">
                              {resident.year}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-semibold uppercase">
                          Solicitado el: {req.startDate.split('-').reverse().join('/')}
                        </p>
                      </div>
                    </div>

                    {/* Period details */}
                    <div className="bg-teal-500/[0.04] dark:bg-teal-500/[0.08] border border-teal-500/10 dark:border-teal-500/20 p-4 rounded-xl space-y-1.5">
                      <p className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider">Periodo Solicitado</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {formatDateSpan(req.startDate, req.endDate)}
                        </p>
                        <span className="text-[10px] font-black bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 px-2 py-0.5 rounded-full border border-teal-200/50 dark:border-teal-900/60 font-mono">
                          {req.days.length} {req.days.length === 1 ? 'día' : 'días'}
                        </span>
                      </div>
                    </div>

                    {/* Notes Callout */}
                    {req.notes && (
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-3 rounded-xl flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-semibold italic">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>Observaciones: "{req.notes}"</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-auto">
                      <button
                        onClick={() => handleDeny(req)}
                        disabled={isWorking}
                        className={clsx(
                          "flex-1 py-2 px-3 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 hover:text-red-700 dark:text-red-400 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          isWorking && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Denegar
                      </button>
                      
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isWorking}
                        className={clsx(
                          "flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5",
                          isWorking && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          approvedVacations.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-400">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Sin aprobaciones</h3>
                <p className="text-xs text-slate-500">Aún no se han registrado o aprobado periodos de vacaciones en la aplicación.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pb-6">
              {approvedVacations.map(req => {
                const resident = residents.find(r => r.id === req.residentId);
                const isWorking = actioningId === req.id;
                
                return (
                  <div 
                    key={req.id} 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-5 relative opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-105 dark:bg-slate-800 flex items-center justify-center text-slate-655 dark:text-slate-350 text-xs font-black shrink-0">
                        {resident ? `${resident.firstName[0]}${resident.lastName?.[0] || ''}` : <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 space-y-1 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase leading-none">
                              {resident ? `${resident.firstName} ${resident.lastName}` : 'Residente Desconocido'}
                            </h3>
                            {resident && (
                              <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50">
                                {resident.year}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-900/40">
                            Confirmado
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                          {formatDateSpan(req.startDate, req.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-auto">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        Duración: {req.days.length} {req.days.length === 1 ? 'día' : 'días'}
                      </span>
                      
                      <button
                        onClick={() => handleRevoke(req)}
                        disabled={isWorking}
                        className={clsx(
                          "py-1.5 px-3 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1",
                          isWorking && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <X className="w-3 h-3" />
                        Revocar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
};

export default VacationManager;
