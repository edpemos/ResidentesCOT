import React from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useRotationStore } from '../../store/rotationStore';
import { useAuthStore } from '../../store/authStore';
import { Calendar as CalendarIcon, Clock, User as UserIcon, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const SessionList: React.FC = () => {
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
      case 'Impartida': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Aplazada': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Impartida': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Aplazada': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  // Ordenar por fecha más cercana
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Calendario de Sesiones</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedSessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>No hay sesiones programadas.</p>
          </div>
        ) : (
          sortedSessions.map((session) => (
            <div key={session.id} className="border border-slate-100 rounded-lg p-4 hover:border-blue-100 hover:shadow-sm transition-all group">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                
                {/* Info Principal */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 w-fit", getStatusColor(session.status))}>
                      {getStatusIcon(session.status)}
                      {session.status}
                    </span>
                    <div className="flex items-center text-slate-500 text-sm">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {format(new Date(session.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      <Clock className="w-4 h-4 ml-3 mr-1" />
                      {format(new Date(session.date), "HH:mm")}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">{session.topic}</h4>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Ponente:</span> {getResidentName(session.residentId)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">Tutor:</span> {session.tutorId}
                    </div>
                  </div>
                </div>

                {/* Acciones Admin */}
                {isAdmin && (
                  <div className="flex sm:flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={session.status}
                      onChange={(e) => updateSession(session.id, { status: e.target.value as any })}
                      className="text-xs border-slate-200 rounded-md py-1 px-2 cursor-pointer focus:ring-0 focus:border-blue-400"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Impartida">Impartida</option>
                      <option value="Aplazada">Aplazada</option>
                    </select>
                    <button 
                      onClick={() => {
                        if(window.confirm('¿Eliminar sesión?')) deleteSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
