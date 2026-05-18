import React from 'react';
import SessionList from './SessionList';
import SessionForm from './SessionForm';
import { useAuthStore } from '../../store/authStore';

const Sessions: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Sesiones Semanales</h2>
        <p className="text-slate-500 text-sm mt-1">
          Programación y control de sesiones clínicas del servicio
        </p>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        <div className="flex-1 overflow-hidden">
          <SessionList />
        </div>
        
        {isAdmin && (
          <div className="w-full xl:w-96 shrink-0 overflow-y-auto">
            <SessionForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
