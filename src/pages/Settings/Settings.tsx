import React, { useState } from 'react';
import { useUnitStore } from '../../store/unitStore';
import { useAuthStore } from '../../store/authStore';
import { AVAILABLE_COLORS } from '../../utils/constants';
import { Trash2, Plus, Edit2, X, Check } from 'lucide-react';
import clsx from 'clsx';

const Settings: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { units, addUnit, updateUnit, deleteUnit } = useUnitStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState(AVAILABLE_COLORS[0]);

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setColor(AVAILABLE_COLORS[0]);
  };

  const handleEdit = (id: string) => {
    const unit = units.find(u => u.id === id);
    if (unit) {
      setName(unit.name);
      setColor(unit.color);
      setEditingId(id);
      setIsAdding(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateUnit(editingId, { name, color });
    } else {
      addUnit({ name, color });
    }
    resetForm();
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Ajustes</h2>
        <p className="text-slate-500 text-sm mt-1">
          Configuración de las especialidades médicas y rotaciones del sistema.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Unidades Médicas</h3>
          {!isAdding && !editingId && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Añadir Unidad
            </button>
          )}
        </div>

        <div className="p-6">
          {(isAdding || editingId) && (
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-8">
              <h4 className="font-semibold text-slate-800 mb-4">
                {editingId ? 'Editar Unidad' : 'Nueva Unidad'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Unidad</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    placeholder="Ej. Traumatología Deportiva" 
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color Identificativo</label>
                  <div className="flex flex-wrap gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                    {AVAILABLE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={clsx(
                          "w-6 h-6 rounded-full border transition-transform", 
                          c.split(' ')[0], 
                          c.split(' ')[2],
                          color === c ? 'scale-125 ring-2 ring-offset-1 ring-blue-400' : 'hover:scale-110'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={handleSave} disabled={!name.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className={clsx("w-6 h-6 rounded-full border", unit.color.split(' ')[0], unit.color.split(' ')[2])}></span>
                  <span className="font-medium text-slate-800">{unit.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      handleEdit(unit.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-md"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('¿Borrar esta unidad? Se eliminará la posibilidad de añadirla, pero no borrará las existentes en la pizarra.')) {
                        deleteUnit(unit.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
