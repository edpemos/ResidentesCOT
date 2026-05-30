import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Rotation } from '../../types';
import { useUnitStore } from '../../store/unitStore';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { getColor } from '../../utils/constants';
import { Palmtree } from 'lucide-react';

interface RotationCardProps {
  rotation: Rotation;
  index: number;
}

const RotationCard: React.FC<RotationCardProps> = ({ rotation, index }) => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { toggleVacation } = useRotationStore();
  const { units } = useUnitStore();

  const handleDoubleClick = () => {
    if (isAdmin) {
      toggleVacation(rotation.id);
    }
  };

  const unit = units.find(u => u.id === rotation.unitId);
  const color = getColor(unit?.color ?? 'slate');
  const name = unit ? unit.name : 'Desconocida';
  const unitType = unit?.type ?? 'interna';

  return (
    <Draggable draggableId={rotation.id} index={index} isDragDisabled={!isAdmin}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onDoubleClick={handleDoubleClick}
          className={clsx(
            `relative w-full h-full min-h-[2.5rem] rounded-md border text-[10px] leading-tight font-extrabold flex items-center justify-center p-1 text-center select-none transition-all duration-200`,
            color.bg, color.text,
            unitType === 'interna' && clsx('border-2 border-solid', color.border),
            unitType === 'interna-hjsd' && clsx('border-[4px] border-double', color.border),
            unitType === 'externa' && clsx('border-2 border-dashed', color.border),
            snapshot.isDragging 
              ? 'shadow-2xl scale-[1.04] rotate-[2deg] z-50 ring-2 ring-blue-500/50 cursor-grabbing' 
              : 'hover:-translate-y-0.5 hover:shadow-md cursor-grab',
            !isAdmin && 'cursor-default'
          )}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          {rotation.isVacation && (
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwbDggOHptOCAwTDAgOHoiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-50 rounded-md pointer-events-none animate-pulse" />
          )}
          
          <span className="relative z-10 break-words line-clamp-2 w-full px-1">
            {name}
          </span>
          
          {rotation.isVacation && (
            <Palmtree className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 text-slate-700/80 opacity-90 animate-[bounce_1.5s_infinite_ease-in-out] hover:scale-110 transition-transform duration-300" />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default RotationCard;
