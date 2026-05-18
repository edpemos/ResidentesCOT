import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { useAuthStore } from '../../store/authStore';
import { MONTHS } from '../../utils/constants';
import RotationCard from './RotationCard';
import clsx from 'clsx';
import { GripVertical } from 'lucide-react';

const Board: React.FC = () => {
  const { residents, rotations, currentYear, moveRotation, addRotation, deleteRotation } = useRotationStore();
  const { units } = useUnitStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  // StrictMode workaround for @hello-pangea/dnd
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) return null;

  const handleDragEnd = (result: DropResult) => {
    if (!isAdmin) return;
    
    const { source, destination, draggableId } = result;

    // Si se suelta fuera del tablero, eliminar la rotación (si no viene del banco)
    if (!destination) {
      if (source.droppableId !== 'unit-bank') {
        deleteRotation(draggableId);
      }
      return;
    }

    // Si se soltó en el mismo lugar
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const [destResidentId, destMonthStr] = destination.droppableId.split('-');
    const destMonth = parseInt(destMonthStr, 10);

    // Si viene del banco de unidades, creamos una nueva
    if (source.droppableId === 'unit-bank') {
      const unitId = draggableId.replace('bank-', '');
      addRotation({
        residentId: destResidentId,
        month: destMonth,
        year: currentYear,
        unitId,
        isVacation: false
      });
      return;
    }

    // Movimiento normal entre celdas
    moveRotation(draggableId, destResidentId, destMonth);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Planificación {currentYear}</h3>
        {!isAdmin && (
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">Modo Solo Lectura</span>
        )}
      </div>

      <div className="overflow-x-auto flex-1 flex flex-col">
        <DragDropContext onDragEnd={handleDragEnd}>
          
          {/* Banco de Rotaciones (Solo Admin) */}
          {isAdmin && (
            <div className="p-4 bg-slate-50 border-b border-slate-200 min-w-[768px]">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Banco de Especialidades (Arrastrar a la pizarra)</h4>
              <Droppable droppableId="unit-bank" direction="horizontal" isDropDisabled={true}>
                {(provided) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="flex flex-wrap gap-2"
                  >
                    {units.map((unit, index) => (
                      <Draggable key={`bank-${unit.id}`} draggableId={`bank-${unit.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={clsx(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm transition-transform cursor-grab",
                              unit.color,
                              snapshot.isDragging ? "shadow-lg scale-105 z-50 ring-2 ring-blue-400" : "hover:-translate-y-0.5"
                            )}
                            style={provided.draggableProps.style}
                          >
                            <GripVertical className="w-3 h-3 opacity-50" />
                            {unit.name}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <p className="text-xs text-slate-400 mt-2">Arrastra una rotación existente fuera del tablero para eliminarla.</p>
            </div>
          )}

          <div className="min-w-[768px] p-4 flex-1">
            {/* Cabecera de meses */}
            <div className="flex mb-2">
              <div className="w-48 shrink-0"></div>
              <div className="flex-1 grid grid-cols-12 gap-2">
                {MONTHS.map((m, i) => (
                  <div key={i} className="text-center text-sm font-semibold text-slate-500">
                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* Filas de residentes */}
            <div className="space-y-1">
              {[...residents]
                .sort((a, b) => {
                  const yearOrder: Record<string, number> = {
                    'Graduado': 6,
                    'R5': 5,
                    'R4': 4,
                    'R3': 3,
                    'R2': 2,
                    'R1': 1
                  };
                  return (yearOrder[b.year] || 0) - (yearOrder[a.year] || 0);
                })
                .map((resident) => (
                <div key={resident.id} className="flex items-center group">
                  <div className="w-48 shrink-0 pr-4 flex items-center gap-2">
                    <span className={clsx("text-xs font-bold px-2 py-1 rounded", resident.year === 'Graduado' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800')}>
                      {resident.year}
                    </span>
                    <span className="text-sm font-medium text-slate-700 truncate" title={`${resident.firstName} ${resident.lastName}`}>
                      {resident.firstName} {resident.lastName}
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }).map((_, monthIndex) => {
                      const cellId = `${resident.id}-${monthIndex}`;
                      const rotation = rotations.find(
                        r => r.residentId === resident.id && r.month === monthIndex && r.year === currentYear
                      );

                      return (
                        <Droppable key={cellId} droppableId={cellId} isDropDisabled={!isAdmin}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={clsx(
                                "h-10 rounded-md border-2 border-dashed transition-colors relative flex items-center justify-center p-0.5",
                                snapshot.isDraggingOver 
                                  ? "bg-blue-50 border-blue-400" 
                                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                              )}
                            >
                              {rotation ? (
                                <RotationCard rotation={rotation} index={0} />
                              ) : (
                                <span className="text-xs text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                  Libre
                                </span>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default Board;
