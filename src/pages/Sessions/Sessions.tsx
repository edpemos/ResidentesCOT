import React from 'react';
import SessionList from './SessionList';
import SessionForm from './SessionForm';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import type { Session } from '../../types';

const Sessions: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { initializeStore } = useSessionStore();
  const [editingSession, setEditingSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Sesiones Semanales</h2>
        <p className="text-slate-500 text-sm mt-1">
          Programación y control de sesiones clínicas del servicio
        </p>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0 overflow-visible xl:overflow-hidden">
        <div className="flex-1 overflow-visible xl:overflow-hidden">
          <SessionList onEditSession={setEditingSession} />
        </div>
        
        {isAdmin && (
          <div className="w-full xl:w-96 shrink-0 overflow-visible xl:overflow-y-auto">
            <SessionForm editingSession={editingSession} clearEditing={() => setEditingSession(null)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
