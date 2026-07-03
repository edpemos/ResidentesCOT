import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import type { Session } from '../../types';
import clsx from 'clsx';

interface SessionFormProps {
  editingSession: Session | null;
  clearEditing: () => void;
}

const SessionForm: React.FC<SessionFormProps> = ({ editingSession, clearEditing }) => {
  const { addSession, updateSession } = useSessionStore();
  const { residents, rotations } = useRotationStore();
  const { units } = useUnitStore();

  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [residentId, setResidentId] = useState('');
  const [tutorId, setTutorId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Populate form when editingSession changes
  useEffect(() => {
    if (editingSession) {
      try {
        const d = new Date(editingSession.date);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        setDate(localISOTime);
      } catch (e) {
        setDate('');
      }
      setTopic(editingSession.topic);
      setResidentId(editingSession.residentId);
      setTutorId(editingSession.tutorId);
      setSelectedUnitId('');
    } else {
      setDate('');
      setTopic('');
      setResidentId('');
      setTutorId('');
      setSelectedUnitId('');
    }
  }, [editingSession]);

  // Auto-sugerencia de residente basado en la unidad y fecha
  useEffect(() => {
    if (date && selectedUnitId && !editingSession) {
      const selectedDate = new Date(date);
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();

      // Buscar si algún residente está rotando en esta unidad en ese mes
      const rotationMatch = rotations.find(
        r => r.unitId === selectedUnitId && r.month === month && r.year === year && !r.isVacation
      );

      if (rotationMatch) {
        setResidentId(rotationMatch.residentId);
      }
    }
  }, [date, selectedUnitId, rotations, editingSession]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !topic || !residentId || !tutorId) return;

    const sessionData = {
      date: new Date(date).toISOString(),
      topic,
      residentId,
      tutorId,
      status: editingSession ? editingSession.status : 'Pendiente' as any
    };

    if (editingSession) {
      updateSession(editingSession.id, sessionData);
      clearEditing();
    } else {
      addSession(sessionData);
    }

    setDate('');
    setTopic('');
    setResidentId('');
    setTutorId('');
    setSelectedUnitId('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">
        {editingSession ? 'Editar Sesión Clínica' : 'Programar Nueva Sesión'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y Hora</label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unidad Temática</label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Selecciona una unidad...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tema / Título</label>
          <input
            type="text"
            required
            placeholder="Ej. Abordajes Quirúrgicos de Rodilla"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Residente Ponente</label>
            <select
              required
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Selecciona un Residente...</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.year !== 'Graduado' ? `${r.year} - ` : ''}{r.firstName} {r.lastName}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Sugerido automáticamente según la pizarra</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adjunto Tutor</label>
            <input
              type="text"
              required
              placeholder="Ej. Dr. Pérez"
              value={tutorId}
              onChange={(e) => setTutorId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="pt-4 flex gap-2">
          {editingSession && (
            <button
              type="button"
              onClick={clearEditing}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer border border-slate-200"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className={clsx(
              "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer",
              editingSession ? "flex-1" : "w-full"
            )}
          >
            {editingSession ? 'Actualizar Sesión' : 'Guardar Sesión'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionForm;
