import React from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useRotationStore } from '../../store/rotationStore';
import { useAuthStore } from '../../store/authStore';
import { Calendar as CalendarIcon, Clock, User as UserIcon, CheckCircle2, XCircle, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import clsx from 'clsx';
import type { Session } from '../../types';

interface SessionListProps {
  onEditSession?: (session: Session) => void;
}

const SessionList: React.FC<SessionListProps> = ({ onEditSession }) => {
  const { sessions, updateSession, deleteSession } = useSessionStore();
  const { residents } = useRotationStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const getResidentName = (id: string) => {
    const res = residents.find(r => r.id === id);
    return res ? `${res.year !== 'Graduado' ? res.year + ' - ' : ''}${res.firstName} ${res.lastName}` : 'Desconocido';
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Impartida': return <CheckCircle2 className="w-5.5 h-5.5 lg:w-4 lg:h-4 text-emerald-500" />;
      case 'Aplazada': return <XCircle className="w-5.5 h-5.5 lg:w-4 lg:h-4 text-red-500" />;
      default: return <AlertCircle className="w-5.5 h-5.5 lg:w-4 lg:h-4 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Impartida': return 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
      case 'Aplazada': return 'bg-red-50 text-red-700 border-red-250 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40';
      default: return 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40';
    }
  };

  // Ordenar por fecha más cercana
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800/80 overflow-hidden h-auto xl:h-full flex flex-col">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">Calendario de Sesiones</h3>
      </div>
      
      <div className="flex-1 overflow-y-visible xl:overflow-y-auto p-4 space-y-4">
        {sortedSessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>No hay sesiones programadas.</p>
          </div>
        ) : (
          sortedSessions.map((session) => (
            <div key={session.id} className="border border-slate-150 dark:border-slate-800/80 rounded-2xl p-6 lg:p-4 hover:border-teal-200 dark:hover:border-teal-900/60 hover:shadow-xs transition-all group bg-white dark:bg-slate-900/40">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                
                {/* Info Principal */}
                <div className="flex-1">
                  <div className="flex flex-col gap-3.5 mb-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={clsx("text-base lg:text-xs font-black px-3.5 py-1.5 lg:px-2 lg:py-0.5 rounded-xl border flex items-center gap-2 lg:gap-1.5 w-fit shadow-xs", getStatusColor(session.status))}>
                        {getStatusIcon(session.status)}
                        {session.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2 text-slate-500 dark:text-slate-400 text-lg lg:text-sm font-bold">
                      <div className="flex items-center">
                        <CalendarIcon className="w-5.5 h-5.5 lg:w-4 lg:h-4 mr-2 lg:mr-1.5 text-slate-400" />
                        <span className="capitalize">{format(new Date(session.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-5.5 h-5.5 lg:w-4 lg:h-4 mr-2 lg:mr-1.5 text-slate-400" />
                        <span>{format(new Date(session.date), "HH:mm")}h</span>
                      </div>
                    </div>
                  </div>
                  <h4 className="text-2xl lg:text-lg font-black text-slate-800 dark:text-slate-100 mb-4 lg:mb-2 leading-snug">{session.topic}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3.5 text-lg lg:text-sm text-slate-650 dark:text-slate-400">
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="w-5.5 h-5.5 lg:w-4 lg:h-4 text-teal-650 dark:text-teal-400" />
                      <span><span className="font-extrabold text-slate-700 dark:text-slate-350">Ponente:</span> {getResidentName(session.residentId)}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="w-5.5 h-5.5 lg:w-4 lg:h-4 text-teal-650 dark:text-teal-400" />
                      <span><span className="font-extrabold text-slate-700 dark:text-slate-355">Tutor:</span> {session.tutorId}</span>
                    </div>
                  </div>
                </div>
                {/* Acciones Admin */}
                {isAdmin && (
                  <div className="flex flex-row sm:flex-col items-center gap-3.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity mt-5 sm:mt-0 self-end sm:self-start border-t sm:border-t-0 border-slate-100 dark:border-slate-850 pt-4 sm:pt-0 w-full sm:w-auto justify-end sm:justify-start">
                    <select
                      value={session.status}
                      onChange={(e) => updateSession(session.id, { status: e.target.value as any })}
                      className="text-base lg:text-xs border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 cursor-pointer focus:ring-2 focus:ring-teal-500/25 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Impartida">Impartida</option>
                      <option value="Aplazada">Aplazada</option>
                    </select>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          if (onEditSession) {
                            onEditSession(session);
                            const formElement = document.querySelector('form');
                            if (formElement) {
                              formElement.scrollIntoView({ behavior: 'smooth' });
                            }
                          }
                        }}
                        className="p-3 lg:p-1 text-slate-400 hover:text-teal-650 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl lg:rounded-lg transition-colors cursor-pointer border border-slate-150 lg:border-none dark:border-slate-800"
                        title="Editar sesión"
                      >
                        <Edit2 className="w-6 h-6 lg:w-4 lg:h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if(window.confirm('¿Eliminar sesión?')) deleteSession(session.id);
                        }}
                        className="p-3 lg:p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl lg:rounded-lg transition-colors cursor-pointer border border-slate-150 lg:border-none dark:border-slate-800"
                        title="Eliminar sesión"
                      >
                        <Trash2 className="w-6 h-6 lg:w-4 lg:h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionList;
