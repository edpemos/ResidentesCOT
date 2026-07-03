import React, { useState, useEffect } from 'react';
import { useRotationStore, calculateResidentYear } from '../../store/rotationStore';
import { useAuthStore } from '../../store/authStore';
import { X, UserPlus, Trash2, Edit2, Check, XCircle, Key } from 'lucide-react';
import clsx from 'clsx';

interface ResidentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResidentConfigModal: React.FC<ResidentConfigModalProps> = ({ isOpen, onClose }) => {
  const { residents, addResident, updateResident, deleteResident } = useRotationStore();
  const { readers, fetchReaders, addReader, removeReader } = useAuthStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [password, setPassword] = useState('');
  const [accessRole, setAccessRole] = useState<'reader' | 'coordinador'>('reader');

  useEffect(() => {
    if (isOpen) {
      fetchReaders();
    }
  }, [isOpen, fetchReaders]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setStartDate('');
    setEndDate('');
    setPassword('');
    setAccessRole('reader');
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
      
      const matchedReader = readers.find(r => r.username.toLowerCase() === res.email.toLowerCase());
      if (matchedReader) {
        setPassword(matchedReader.password || '');
        setAccessRole(matchedReader.role || 'reader');
      } else {
        setPassword('');
        setAccessRole('reader');
      }

      setEditingId(id);
      setIsAdding(false);
    }
  };

  const handleSave = async () => {
    if (!firstName || !startDate || !endDate || !email || !password) return;

    const emailNormalized = email.trim().toLowerCase();

    if (editingId) {
      const oldRes = residents.find(r => r.id === editingId);
      const oldEmail = oldRes ? oldRes.email.trim().toLowerCase() : '';

      // Si el correo cambió, eliminamos el perfil de acceso anterior
      if (oldEmail && oldEmail !== emailNormalized) {
        await removeReader(oldEmail);
      }

      // Creamos/actualizamos el perfil de acceso del residente
      await addReader(emailNormalized, password.trim(), accessRole);

      updateResident(editingId, { 
        firstName, 
        lastName, 
        email: emailNormalized, 
        startDate: new Date(startDate).toISOString(), 
        endDate: new Date(endDate).toISOString() 
      });
    } else {
      // Crear nuevo residente
      addResident({ 
        firstName, 
        lastName, 
        email: emailNormalized, 
        startDate: new Date(startDate).toISOString(), 
        endDate: new Date(endDate).toISOString() 
      });

      // Crear nuevo perfil de acceso
      await addReader(emailNormalized, password.trim(), accessRole);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-250">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-xl text-slate-800">Configuración de Residentes</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* ⚡ EDIT / ADD FORM PLACED AT THE TOP FOR IMMEDIATE VISIBILITY */}
          {(isAdding || editingId) && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner space-y-4 animate-in slide-in-from-top-4 duration-300">
              <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>{editingId ? '📝 Editar Residente' : '👤 Nuevo Residente'}</span>
                <span className="text-xs font-normal text-slate-500">Completa los datos a continuación</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre *</label>
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                    placeholder="Ej. Juan" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Apellidos (Opcional)</label>
                  <input 
                    type="text" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                    placeholder="Ej. Pérez Gómez" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico para Login *</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                    placeholder="juan.perez@hospital.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña de Acceso *</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                      placeholder="Establece una contraseña" 
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Perfil de Acceso *</label>
                  <select 
                    value={accessRole} 
                    onChange={e => setAccessRole(e.target.value as 'reader' | 'coordinador')}
                    className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-700"
                  >
                    <option value="reader">Residente (Solo Lectura)</option>
                    <option value="coordinador">Coordinador (Edita Guardias)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Inicio Residencia *</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Fin (Prevista) *</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="w-full border border-slate-300 bg-white text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                  />
                </div>
              </div>

              {startDate && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                  <span className="text-sm text-blue-800 font-semibold">Cálculo Automático:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getYearBadgeColor(calculateResidentYear(new Date(startDate).toISOString()))}`}>
                    {calculateResidentYear(new Date(startDate).toISOString())}
                  </span>
                  <span className="text-xs text-blue-600 ml-auto">Este valor se actualizará solo con el paso del tiempo.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button 
                  onClick={resetForm} 
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Cancelar
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={!firstName || !startDate || !endDate || !email || !password} 
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* LIST OF RESIDENTS */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800">Listado Actual ({residents.length})</h4>
              {!isAdding && !editingId && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3.5 py-2 rounded-lg hover:bg-blue-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Añadir Residente
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nombre Completo</th>
                    <th className="px-4 py-3 font-semibold">Correo Electrónico</th>
                    <th className="px-4 py-3 font-semibold text-center">Perfil / Rol</th>
                    <th className="px-4 py-3 font-semibold">Fechas (Inicio - Fin)</th>
                    <th className="px-4 py-3 font-semibold text-center">Año</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {residents.map(res => (
                    <tr key={res.id} className={clsx(
                      "hover:bg-slate-50 transition-colors",
                      editingId === res.id ? "bg-blue-50/40" : ""
                    )}>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {res.lastName ? `${res.lastName}, ` : ''}{res.firstName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{res.email}</td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const matchedReader = readers.find(r => r.username.toLowerCase() === res.email.toLowerCase());
                          const label = matchedReader 
                            ? (matchedReader.role === 'coordinador' ? 'Coordinador' : 'Residente')
                            : 'Sin Acceso';
                          const colorClass = matchedReader 
                            ? (matchedReader.role === 'coordinador' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200')
                            : 'bg-slate-50 text-slate-400 border-slate-200';
                          return (
                            <span className={clsx("inline-block px-2 py-0.5 rounded text-xs font-bold border select-none", colorClass)}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                        {new Date(res.startDate).toLocaleDateString()} a {new Date(res.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${getYearBadgeColor(res.year)}`}>
                          {res.year}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleEdit(res.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Editar Datos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if(window.confirm('¿Estás seguro de borrar este residente? Se eliminarán todas sus rotaciones históricas.')) {
                                await removeReader(res.email.toLowerCase());
                                deleteResident(res.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Borrar Residente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {residents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-550 italic font-medium">
                        No hay residentes registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResidentConfigModal;
