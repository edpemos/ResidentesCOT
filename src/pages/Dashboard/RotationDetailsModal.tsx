import React, { useState } from 'react';
import type { Rotation, RotationType } from '../../types';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { X, Plane, Trash2, Check, Globe, Building2 } from 'lucide-react';
import clsx from 'clsx';

interface RotationDetailsModalProps {
  rotation: Rotation;
  residentName: string;
  monthName: string;
  onClose: () => void;
}

const RotationDetailsModal: React.FC<RotationDetailsModalProps> = ({
  rotation,
  residentName,
  monthName,
  onClose,
}) => {
  const { updateRotation, deleteRotation } = useRotationStore();
  const { units } = useUnitStore();

  const [type, setType] = useState<RotationType>(rotation.type ?? 'interna-cot');
  const [isVacation, setIsVacation] = useState(rotation.isVacation);

  const unit = units.find((u) => u.id === rotation.unitId);
  const unitName = unit ? unit.name : 'Especialidad Desconocida';

  const handleSave = async () => {
    await updateRotation(rotation.id, { type, isVacation });
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta rotación de la pizarra?')) {
      await deleteRotation(rotation.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Detalles de la Rotación</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {residentName} • {monthName} {rotation.year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Unit Name Info */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Especialidad</span>
              <span className="text-sm font-bold text-slate-700">{unitName}</span>
            </div>
          </div>

          {/* Rotation Type (COT, Hospital, Externa) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Tipo de Rotación</label>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Opción 1: Interna COT */}
              <button
                type="button"
                onClick={() => setType('interna-cot')}
                className={clsx(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  type === 'interna-cot'
                    ? "border-blue-650 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg shrink-0",
                    type === 'interna-cot' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">Interna COT</span>
                    <span className="text-xs text-slate-500">Rotación del servicio en el hospital de origen</span>
                  </div>
                </div>
                {type === 'interna-cot' && (
                  <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Opción 2: Interna Hospital */}
              <button
                type="button"
                onClick={() => setType('interna-hospital')}
                className={clsx(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  type === 'interna-hospital'
                    ? "border-emerald-600 bg-emerald-50/30 shadow-sm ring-1 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg shrink-0",
                    type === 'interna-hospital' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">Interna Hospital</span>
                    <span className="text-xs text-slate-500">Rotación en otras especialidades del hospital</span>
                  </div>
                </div>
                {type === 'interna-hospital' && (
                  <div className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Opción 3: Externa */}
              <button
                type="button"
                onClick={() => setType('externa')}
                className={clsx(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  type === 'externa'
                    ? "border-amber-600 bg-amber-50/30 shadow-sm ring-1 ring-amber-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg shrink-0",
                    type === 'externa' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">Externa (Rotex)</span>
                    <span className="text-xs text-slate-500">Rotación formativa fuera del hospital de origen</span>
                  </div>
                </div>
                {type === 'externa' && (
                  <div className="w-5 h-5 bg-amber-600 text-white rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Vacation Toggle Card */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Ausencia / Vacaciones</label>
            <div 
              onClick={() => setIsVacation(!isVacation)}
              className={clsx(
                "p-3.5 border rounded-xl flex items-center justify-between transition-all cursor-pointer select-none",
                isVacation 
                  ? "border-sky-300 bg-sky-50/50 shadow-sm" 
                  : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2 rounded-lg shrink-0",
                  isVacation ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500"
                )}>
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">Periodo de Vacaciones</span>
                  <span className="text-xs text-slate-500">Marcar esta rotación con ausencia justificada</span>
                </div>
              </div>

              {/* iOS Switch Toggle style */}
              <div className={clsx(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-250 cursor-pointer shrink-0",
                isVacation ? "bg-sky-500" : "bg-slate-250"
              )}>
                <div className={clsx(
                  "bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-250",
                  isVacation ? "translate-x-5" : "translate-x-0"
                )} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-650 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Quitar rotación de la pizarra"
          >
            <Trash2 className="w-4 h-4" />
            Quitar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-250 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-650 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotationDetailsModal;
