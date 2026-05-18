import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Rotation } from '../../types';
import { useUnitStore } from '../../store/unitStore';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { Plane } from 'lucide-react';

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
  const colorClass = unit ? unit.color : 'bg-slate-100 text-slate-800 border-slate-200';
  const name = unit ? unit.name : 'Desconocida';

  return (
    <Draggable draggableId={rotation.id} index={index} isDragDisabled={!isAdmin}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onDoubleClick={handleDoubleClick}
          className={clsx(
            'relative w-full h-full min-h-[2.5rem] rounded-md border text-[10px] leading-tight font-semibold flex items-center justify-center p-0.5 text-center transition-shadow shadow-sm',
            colorClass,
            snapshot.isDragging && 'shadow-lg ring-2 ring-blue-400 z-50',
            !isAdmin && 'cursor-default'
          )}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          {rotation.isVacation && (
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwbDggOHptOCAwTDAgOHoiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] opacity-50 rounded-md pointer-events-none" />
          )}
          
          <span className="relative z-10 break-words line-clamp-2 w-full">
            {name}
          </span>
          
          {rotation.isVacation && (
            <Plane className="absolute bottom-1 right-1 w-3 h-3 text-slate-500 opacity-70" />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default RotationCard;
