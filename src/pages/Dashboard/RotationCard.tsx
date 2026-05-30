import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Rotation } from '../../types';
import { useUnitStore } from '../../store/unitStore';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore } from '../../store/rotationStore';
import { getColor, MONTHS } from '../../utils/constants';
import { Plane } from 'lucide-react';
import RotationDetailsModal from './RotationDetailsModal';

interface RotationCardProps {
  rotation: Rotation;
  index: number;
}

const RotationCard: React.FC<RotationCardProps> = ({ rotation, index }) => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const { residents } = useRotationStore();
  const { units } = useUnitStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDoubleClick = () => {
    if (isAdmin) {
      setIsModalOpen(true);
    }
  };

  const unit = units.find(u => u.id === rotation.unitId);
  const color = getColor(unit?.color ?? 'slate');
  const name = unit ? unit.name : 'Desconocida';

  const resident = residents.find(r => r.id === rotation.residentId);
  const residentName = resident ? `${resident.firstName} ${resident.lastName}` : 'EIR';
  const type = rotation.type ?? 'interna-cot';

  return (
    <>
      <Draggable draggableId={rotation.id} index={index} isDragDisabled={!isAdmin}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onDoubleClick={handleDoubleClick}
            className={clsx(
              `relative w-full h-full min-h-[2.75rem] rounded-md border text-[10px] leading-tight font-semibold flex items-center justify-center p-0.5 text-center transition-shadow shadow-sm select-none`,
              color.bg, color.text, color.border,
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
            
            <span className="relative z-10 break-words line-clamp-2 w-full px-1 pb-2">
              {name}
            </span>
            
            {/* Category Indicator Badge (Bottom-Left) */}
            <span className={clsx(
              "absolute bottom-0.5 left-1 text-[7px] font-extrabold uppercase px-1 rounded-sm tracking-wider select-none",
              type === 'interna-hospital' && "bg-emerald-100/90 text-emerald-800 border border-emerald-250",
              type === 'externa' && "bg-amber-100/90 text-amber-800 border border-amber-250",
              type === 'interna-cot' && "bg-blue-100/90 text-blue-800 border border-blue-250"
            )}>
              {type === 'interna-hospital' ? 'Hosp' : type === 'externa' ? 'Ext' : 'COT'}
            </span>
            
            {rotation.isVacation && (
              <Plane className="absolute bottom-0.5 right-1 w-2.5 h-2.5 text-slate-500 opacity-75" />
            )}
          </div>
        )}
      </Draggable>

      {isModalOpen && (
        <RotationDetailsModal
          rotation={rotation}
          residentName={residentName}
          monthName={MONTHS[rotation.month]}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default RotationCard;
