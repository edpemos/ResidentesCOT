import React, { useState } from 'react';
import { useUnitStore } from '../../store/unitStore';
import { useAuthStore } from '../../store/authStore';
import { AVAILABLE_COLORS, getColor } from '../../utils/constants';
import { Trash2, Plus, Edit2, X, Check } from 'lucide-react';
import clsx from 'clsx';

const Settings: React.FC = () => {
  const { role, adminEmails, addAdmin, removeAdmin } = useAuthStore();
  const isAdmin = role === 'admin';
  const { units, addUnit, updateUnit, deleteUnit } = useUnitStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState(AVAILABLE_COLORS[0].id);
  const [type, setType] = useState<'interna' | 'interna-hjsd' | 'externa'>('interna');
  const [newAdminEmail, setNewAdminEmail] = useState('');

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
    setColor(AVAILABLE_COLORS[0].id);
    setType('interna');
  };

  const handleEdit = (id: string) => {
    const unit = units.find(u => u.id === id);
    if (unit) {
      setName(unit.name);
      setColor(unit.color); // unit.color is now a colorId string
      setType(unit.type ?? 'interna');
      setEditingId(id);
      setIsAdding(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateUnit(editingId, { name, color, type });
    } else {
      addUnit({ name, color, type });
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
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Unidad</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                      placeholder="Ej. Traumatología Deportiva" 
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Rotación</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setType('interna')}
                        className={clsx(
                          "flex-1 py-2 px-3 border rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          type === 'interna'
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        Interna
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('interna-hjsd')}
                        className={clsx(
                          "flex-1 py-2 px-3 border rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          type === 'interna-hjsd'
                            ? "bg-slate-700 border-slate-700 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        Interna HJSD
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('externa')}
                        className={clsx(
                          "flex-1 py-2 px-3 border rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                          type === 'externa'
                            ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        Externa
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color Identificativo</label>
                  <div className="grid grid-cols-10 gap-1 bg-white p-2.5 border border-slate-200 rounded-lg max-w-sm">
                    {Array.from({ length: 6 }).map((_, shadeIdx) => {
                      const colorFamilies = [
                        AVAILABLE_COLORS.slice(0, 6),   // Rojo
                        AVAILABLE_COLORS.slice(6, 12),  // Naranja
                        AVAILABLE_COLORS.slice(12, 18), // Amarillo
                        AVAILABLE_COLORS.slice(18, 24), // Verde
                        AVAILABLE_COLORS.slice(24, 30), // Cian
                        AVAILABLE_COLORS.slice(30, 36), // Aciano
                        AVAILABLE_COLORS.slice(36, 42), // Azul
                        AVAILABLE_COLORS.slice(42, 48), // Púrpura
                        AVAILABLE_COLORS.slice(48, 54), // Magenta
                        AVAILABLE_COLORS.slice(54, 60), // Gris
                      ];

                      return (
                        <React.Fragment key={shadeIdx}>
                          {colorFamilies.map((familyColors) => {
                            const c = familyColors[shadeIdx];
                            return (
                              <button
                                key={c.id}
                                type="button"
                                title={c.label}
                                onClick={() => setColor(c.id)}
                                className={clsx(
                                  "w-6 h-6 rounded-md border transition-transform cursor-pointer",
                                  c.bg,
                                  c.border,
                                  color === c.id ? 'scale-110 ring-2 ring-offset-1 ring-blue-500 z-10 border-white shadow-md' : 'hover:scale-110'
                                )}
                              />
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Gama cromática de Google Sheets: Columnas por familias de color, filas por niveles de intensidad.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={handleSave} disabled={!name.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className={clsx("w-6 h-6 rounded-full border-2", getColor(unit.color).bg, getColor(unit.color).border)}></span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-800 text-sm">{unit.name}</span>
                    <span className={clsx(
                      "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider select-none",
                      unit.type === 'interna-hjsd' && "bg-slate-100 text-slate-700 border-slate-350",
                      unit.type === 'externa' && "bg-amber-50 text-amber-700 border-amber-250",
                      (!unit.type || unit.type === 'interna') && "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {unit.type === 'interna-hjsd' ? 'Interna HJSD' : unit.type === 'externa' ? 'Externa' : 'Interna'}
                    </span>
                  </div>
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

      {/* ADMINS MANAGEMENT SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Administradores del Sistema</h3>
        </div>
        
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <input 
              type="email" 
              value={newAdminEmail} 
              onChange={e => setNewAdminEmail(e.target.value)} 
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" 
              placeholder="nuevo.admin@hospital.com" 
            />
            <button 
              onClick={() => {
                if (newAdminEmail.trim() && !adminEmails.includes(newAdminEmail.trim())) {
                  addAdmin(newAdminEmail.trim());
                  setNewAdminEmail('');
                }
              }}
              disabled={!newAdminEmail.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Añadir Admin
            </button>
          </div>

          <div className="space-y-3">
            {adminEmails.map((adminEmail: string) => (
              <div key={adminEmail} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-medium text-slate-800">{adminEmail}</span>
                {adminEmails.length > 1 && (
                  <button 
                    onClick={() => {
                      if(window.confirm(`¿Quitar permisos de administrador a ${adminEmail}?`)) {
                        removeAdmin(adminEmail);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
