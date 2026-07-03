import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Rotation } from '../../types';
import { useUnitStore } from '../../store/unitStore';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { getColor } from '../../utils/constants';
import { Palmtree, X } from 'lucide-react';

interface RotationCardProps {
  rotation: Rotation;
  index: number;
  onClick?: (rotation: Rotation) => void;
  isDragDisabled?: boolean;
}

const RotationCard: React.FC<RotationCardProps> = ({ rotation, index, onClick, isDragDisabled = false }) => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { toggleVacation, deleteRotation } = useRotationStore();
  const { units } = useUnitStore();

  const handleDoubleClick = () => {
    if (isAdmin && !isDragDisabled) {
      toggleVacation(rotation.id);
    }
  };

  const unit = units.find(u => u.id === rotation.unitId);
  const color = getColor(unit?.color ?? 'slate');
  const name = rotation.customName || (unit ? unit.name : 'Desconocida');
  const unitType = unit?.type ?? 'interna';

  return (
    <Draggable draggableId={rotation.id} index={index} isDragDisabled={!isAdmin || isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onDoubleClick={handleDoubleClick}
          onClick={() => {
            if (isAdmin && !isDragDisabled && onClick) {
              onClick(rotation);
            }
          }}
          className={clsx(
            `relative w-full h-full min-h-[2rem] rounded-md border text-[11px] sm:text-[10px] leading-tight font-extrabold flex items-center justify-center p-1 text-center select-none transition-all duration-200 group`,
            color.bg, color.text,
            unitType === 'interna' && clsx('border border-solid', color.border),
            unitType === 'interna-hjsd' && clsx('border-[3px] border-double', color.border),
            unitType === 'externa' && clsx('border border-dashed', color.border),
            snapshot.isDragging 
              ? 'shadow-2xl scale-[1.04] rotate-[2deg] z-50 ring-2 ring-blue-500/50 cursor-grabbing' 
              : (!isAdmin || isDragDisabled)
                ? 'cursor-default'
                : 'hover:-translate-y-0.5 hover:shadow-md cursor-grab'
          )}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          {rotation.status === 'confirmed' && (
            <span className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-[9px] text-white font-extrabold z-20" title="Confirmada">
              ✓
            </span>
          )}
          {rotation.status === 'pending' && (
            <span className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-amber-500 border border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-[9px] text-white font-extrabold z-20" title="Pendiente">
              ✓
            </span>
          )}

          {rotation.isVacation && (
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwbDggOHptOCAwTDAgOHoiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-50 rounded-md pointer-events-none animate-pulse" />
          )}
          
          <span className="relative z-10 break-words line-clamp-2 w-full px-0.5 leading-[1.15]">
            {name}
          </span>
          
          {rotation.isVacation && (
            <Palmtree className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 text-slate-700/80 opacity-90 transition-transform duration-300" />
          )}

          {isAdmin && !isDragDisabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteRotation(rotation.id);
              }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-md shadow-red-500/30 cursor-pointer border border-white"
              title="Eliminar Rotación"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default RotationCard;
