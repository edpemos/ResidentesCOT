import React, { useState } from 'react';
import { useRotationStore, calculateResidentYear } from '../../store/rotationStore';
import { X, UserPlus, Trash2, Edit2, Check, XCircle } from 'lucide-react';

interface ResidentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResidentConfigModal: React.FC<ResidentConfigModalProps> = ({ isOpen, onClose }) => {
  const { residents, addResident, updateResident, deleteResident } = useRotationStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setStartDate('');
    setEndDate('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (id: string) => {
    const res = residents.find(r => r.id === id);
    if (res) {
      setFirstName(res.firstName);
      setLastName(res.lastName);
      setEmail(res.email);
      setStartDate(res.startDate.split('T')[0]); // get YYYY-MM-DD
      setEndDate(res.endDate.split('T')[0]);
      setEditingId(id);
      setIsAdding(false);
    }
  };

  const handleSave = () => {
    if (!firstName || !startDate || !endDate || !email) return;

    if (editingId) {
      updateResident(editingId, { 
        firstName, 
        lastName, 
        email, 
        startDate: new Date(startDate).toISOString(), 
        endDate: new Date(endDate).toISOString() 
      });
    } else {
      addResident({ 
        firstName, 
        lastName, 
        email, 
        startDate: new Date(startDate).toISOString(), 
        endDate: new Date(endDate).toISOString() 
      });
    }
    resetForm();
  };

  const getYearBadgeColor = (year: string) => {
    switch(year) {
      case 'R1': return 'bg-blue-100 text-blue-800';
      case 'R2': return 'bg-teal-100 text-teal-800';
      case 'R3': return 'bg-emerald-100 text-emerald-800';
      case 'R4': return 'bg-orange-100 text-orange-800';
      case 'R5': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-200 text-slate-700'; // Graduado
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="font-bold text-xl text-slate-800">Configuración de Residentes</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-slate-700">Listado Actual</h4>
            {!isAdding && !editingId && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Añadir Residente
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre Completo</th>
                  <th className="px-4 py-3 font-medium">Correo Electrónico</th>
                  <th className="px-4 py-3 font-medium">Fechas (Inicio - Fin)</th>
                  <th className="px-4 py-3 font-medium text-center">Año</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {residents.map(res => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {res.lastName}, {res.firstName}
                    </td>
                    <td className="px-4 py-3">{res.email}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(res.startDate).toLocaleDateString()} a {new Date(res.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${getYearBadgeColor(res.year)}`}>
                        {res.year}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(res.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm('¿Borrar este residente y todas sus rotaciones?')) deleteResident(res.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {residents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No hay residentes registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(isAdding || editingId) && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                {editingId ? 'Editar Residente' : 'Nuevo Residente'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" placeholder="Ej. Juan" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" placeholder="Ej. Pérez Gómez" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Correo para Login</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" placeholder="juan.perez@hospital.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Inicio Residencia</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Fin (Prevista)</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500" />
                </div>
              </div>

              {startDate && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                  <span className="text-sm text-blue-800 font-medium">Cálculo Automático:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getYearBadgeColor(calculateResidentYear(new Date(startDate).toISOString()))}`}>
                    {calculateResidentYear(new Date(startDate).toISOString())}
                  </span>
                  <span className="text-xs text-blue-600 ml-auto">Este valor se actualizará solo con el paso del tiempo.</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <XCircle className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={handleSave} disabled={!firstName || !startDate || !endDate || !email} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResidentConfigModal;
