import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { useAuthStore } from '../../store/authStore';
import { getColor } from '../../utils/constants';
import { MONTHS } from '../../utils/constants';
import RotationCard from './RotationCard';
import clsx from 'clsx';
import { GripVertical, Calendar, User, Info, EyeOff, Filter, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Resident } from '../../types';

// Academic month order: June (5) to May (4)
const ACADEMIC_MONTH_INDICES = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

const Board: React.FC = () => {
  const { 
    residents, 
    rotations, 
    currentYear, 
    viewMode,
    selectedResidentId,
    moveRotation, 
    addRotation, 
    deleteRotation,
    setCurrentYear,
    setViewMode,
    setSelectedResidentId
  } = useRotationStore();
  
  const { units } = useUnitStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [bankExpanded, setBankExpanded] = useState(true);
  const [isDraggingRotation, setIsDraggingRotation] = useState(false);

  const handleDragStart = (start: any) => {
    if (start.source.droppableId !== 'unit-bank') {
      setIsDraggingRotation(true);
    }
  };

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

  // Available academic years (starting in 2021 up to 2028)
  const academicYears = Array.from({ length: 8 }, (_, i) => 2021 + i);

  const handleDragEnd = (result: DropResult) => {
    setIsDraggingRotation(false);
    if (!isAdmin) return;
    
    const { source, destination, draggableId } = result;

    // Drop in trash zone -> delete
    if (destination && destination.droppableId === 'delete-zone') {
      if (source.droppableId !== 'unit-bank') {
        deleteRotation(draggableId);
      }
      return;
    }

    // Drop outside board -> ignore (no action)
    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const [destResidentId, destMonthStr, destYearStr] = destination.droppableId.split('-');
    const destMonth = parseInt(destMonthStr, 10);
    
    // Resolve target year from custom year parameter in droppableId, otherwise compute
    const targetYear = destYearStr 
      ? parseInt(destYearStr, 10) 
      : (destMonth >= 5 ? currentYear : currentYear + 1);

    // If dragging from top bank -> clone and add
    if (source.droppableId === 'unit-bank') {
      const unitId = draggableId.replace('bank-', '');
      addRotation({
        residentId: destResidentId,
        month: destMonth,
        year: targetYear,
        unitId,
        isVacation: false
      });
      return;
    }

    // Normal movement between cells
    moveRotation(draggableId, destResidentId, destMonth, targetYear);
  };

  // Compile active residents or placeholders for the selected Academic Year
  const getAcademicYearResidents = (): Resident[] => {
    const list: Resident[] = [];
    
    // R5 down to R1
    for (let level = 5; level >= 1; level--) {
      const targetStartYear = currentYear - level + 1;
      
      const levelResidents = residents.filter(r => {
        const startYear = new Date(r.startDate).getFullYear();
        return startYear === targetStartYear;
      });

      if (levelResidents.length > 0) {
        levelResidents.forEach(r => {
          list.push({
            ...r,
            year: `R${level}` as any
          });
        });
      } else {
        // Placeholders if no actual resident is registered
        list.push({
          id: `temp-${level}-${targetStartYear}`,
          firstName: `EIR ${level}`,
          lastName: `(Sin asignar)`,
          email: `eir${level}@placeholder.com`,
          startDate: `${targetStartYear}-06-01`,
          endDate: `${targetStartYear + 5}-05-31`,
          year: `R${level}` as any
        });
      }
    }
    
    return list;
  };

  // Compile the 5 rows for a selected single resident
  const getSingleResidentRows = (): { id: string; label: string; year: number; level: string; }[] => {
    const selectedResident = residents.find(r => r.id === selectedResidentId);
    if (!selectedResident) return [];

    const startYear = new Date(selectedResident.startDate).getFullYear();
    const rows = [];

    for (let level = 1; level <= 5; level++) {
      const academicYear = startYear + level - 1;
      rows.push({
        id: `${selectedResident.id}-R${level}`,
        label: `Año R${level} (${academicYear}/${academicYear + 1})`,
        year: academicYear,
        level: `R${level}`
      });
    }

    return rows;
  };

  const activeRows = viewMode === 'academicYear' 
    ? getAcademicYearResidents() 
    : getSingleResidentRows();

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative h-full">
      
      {/* 💳 HEADER CON BOTÓN DE FILTRO */}
      <div className="px-5 py-4 border-b border-slate-150 bg-gradient-to-r from-slate-50/50 to-white flex flex-wrap gap-4 items-center justify-between">
        <h3 className="font-extrabold text-slate-800 tracking-wide text-base uppercase font-heading">
          {viewMode === 'academicYear' 
            ? `PIZARRA DE ROTACIONES ${currentYear}/${currentYear + 1}` 
            : `PIZARRA DE ROTACIONES — ${selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName || ''}` : ''}`}
        </h3>
        
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className={clsx(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-sm select-none",
            filtersExpanded 
              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15" 
              : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-850"
          )}
        >
          {filtersExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
          <span>{filtersExpanded ? "Ocultar Opciones" : "Mostrar Opciones"}</span>
        </button>
      </div>

      {/* 🛠️ FILTER CONTROL BAR PANEL */}
      <div 
        className={clsx(
          "transition-all duration-300 ease-in-out overflow-hidden bg-slate-50/50 space-y-4",
          filtersExpanded 
            ? "max-h-[500px] opacity-100 p-5 border-b border-slate-100" 
            : "max-h-0 opacity-0 p-0 border-b-0 pointer-events-none"
        )}
      >
        
        {/* Toggle Mode Buttons */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('academicYear')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer",
                viewMode === 'academicYear'
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Calendar className="w-4 h-4" />
              Vista por Año Académico
            </button>
            <button
              onClick={() => {
                setViewMode('resident');
                if (!selectedResidentId && residents.length > 0) {
                  setSelectedResidentId(residents[0].id);
                }
              }}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer",
                viewMode === 'resident'
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <User className="w-4 h-4" />
              Vista por Residente
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-lg">
            <Info className="w-4 h-4 text-slate-400" />
            Las rotaciones académicas comienzan en Junio y terminan en Mayo.
          </div>
        </div>

        {/* Dynamic Selectors depending on Active Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'academicYear' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar Curso:</span>
              <div className="flex flex-wrap gap-1.5">
                {academicYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setCurrentYear(year)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                      currentYear === year
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {year}/{year + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-md">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Residente:</span>
              <select
                value={selectedResidentId}
                onChange={(e) => setSelectedResidentId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.lastName ? `${r.lastName}, ` : ''}{r.firstName} (Iniciado en {new Date(r.startDate).getFullYear()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-auto flex-1 flex flex-col min-w-0">
          
          {/* 🗂️ BANK OF ROTATIONS (Admin template bank) */}
          {isAdmin && (
            <div className="p-4 bg-slate-50/50 border-b border-slate-200/60 min-w-[960px] shadow-xs">
              
              {/* Sleek Clickable Accordion Header */}
              <div 
                onClick={() => setBankExpanded(!bankExpanded)}
                className="flex items-center justify-between cursor-pointer select-none group/bank pb-1"
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider group-hover/bank:text-slate-700 transition-colors font-heading">
                    Banco de Especialidades (Arrastra las tarjetas a la pizarra para colocarlas)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold opacity-0 group-hover/bank:opacity-100 transition-opacity">
                    ({bankExpanded ? "haz clic para contraer" : "haz clic para desplegar"})
                  </span>
                </div>
                {bankExpanded 
                  ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover/bank:text-slate-600 transition-colors" /> 
                  : <ChevronDown className="w-4 h-4 text-slate-400 group-hover/bank:text-slate-600 transition-colors" />
                }
              </div>

              {/* Collapsible Content with Smooth Transitions */}
              <div 
                className={clsx(
                  "transition-all duration-300 ease-in-out overflow-hidden",
                  bankExpanded 
                    ? "max-h-[300px] opacity-100 mt-3" 
                    : "max-h-0 opacity-0 mt-0 pointer-events-none"
                )}
              >
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
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm transition-all cursor-grab",
                                getColor(unit.color).bg,
                                getColor(unit.color).text,
                                getColor(unit.color).border,
                                snapshot.isDragging 
                                  ? "shadow-2xl scale-[1.04] rotate-[2deg] z-50 ring-2 ring-blue-500/50" 
                                  : "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                              )}
                              style={provided.draggableProps.style}
                            >
                              <GripVertical className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                              {unit.name}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <p className="text-xs text-slate-400 mt-2">Arrastra una rotación al contenedor de basura que aparecerá abajo para eliminarla.</p>
              </div>

            </div>
          )}

          {/* 📅 THE BLACKBOARD TABLE GRID */}
          <div className="min-w-[960px] p-5 flex-1 relative">
            
            {/* Calendar Month Headers (June to May) */}
            <div className="flex mb-3 sticky top-0 bg-white/95 backdrop-blur-md z-20 py-3 border-b border-slate-100 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.03)] -mx-5 px-5">
              <div className="w-56 shrink-0 sticky left-0 bg-white/95 backdrop-blur-xs z-30 flex items-center -ml-5 pl-5">
                <span className="text-xs font-bold text-slate-450 uppercase tracking-widest pl-1">
                  Residente
                </span>
              </div>
              <div className="flex-1 grid grid-cols-12 gap-2 pl-3">
                {ACADEMIC_MONTH_INDICES.map((m) => (
                  <div key={m} className="text-center text-xs font-extrabold text-slate-550 uppercase tracking-widest font-heading">
                    {MONTHS[m]}
                  </div>
                ))}
              </div>
            </div>

            {/* Resident rows */}
            <div className="space-y-3">
              {viewMode === 'academicYear' ? (
                // View Mode: Academic Year
                (activeRows as Resident[]).map((resident) => {
                  const totalRotations = rotations.filter(r => r.residentId === resident.id).length;
                  const assignedPercentage = Math.min(100, Math.round((totalRotations / 12) * 100));
                  
                  return (
                    <div key={resident.id} className="flex items-center group py-1.5 hover:bg-slate-50/30 rounded-lg transition-colors">
                      <div className="w-56 shrink-0 pr-4 flex flex-col justify-center sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.03)] -ml-5 pl-5 select-none">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider shadow-xs flex-shrink-0 uppercase", 
                            resident.id.startsWith('temp-')
                              ? 'bg-slate-100 text-slate-450 border border-slate-200 border-dashed'
                              : resident.year === 'R1' ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : resident.year === 'R2' ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : resident.year === 'R3' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : resident.year === 'R4' ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          )}>
                            {resident.year}
                          </span>
                          <span className={clsx(
                            "text-xs font-bold truncate tracking-wide",
                            resident.id.startsWith('temp-') ? 'text-slate-400 italic font-medium' : 'text-slate-700'
                          )} title={`${resident.firstName} ${resident.lastName}`}>
                            {resident.firstName} {resident.lastName}
                          </span>
                        </div>
                        
                        {/* Progress Bar (ex. "9/12 meses") */}
                        {!resident.id.startsWith('temp-') && (
                          <div className="mt-1.5 pr-2 w-full flex items-center gap-1.5">
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className={clsx(
                                  "h-full rounded-full transition-all duration-500",
                                  assignedPercentage === 100 ? "bg-emerald-500" : "bg-blue-500"
                                )}
                                style={{ width: `${assignedPercentage}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-extrabold text-slate-400 tracking-tighter w-8 flex-shrink-0 text-right">
                              {totalRotations}/12m
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 grid grid-cols-12 gap-2 pl-3">
                        {ACADEMIC_MONTH_INDICES.map((monthIndex) => {
                          const calendarYear = monthIndex >= 5 ? currentYear : currentYear + 1;
                          const cellId = `${resident.id}-${monthIndex}-${calendarYear}`;
                          const rotation = rotations.find(
                            r => r.residentId === resident.id && r.month === monthIndex && r.year === calendarYear
                          );

                          return (
                            <Droppable key={cellId} droppableId={cellId} isDropDisabled={!isAdmin}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={clsx(
                                    "h-11 rounded-lg transition-all duration-200 relative flex items-center justify-center p-0.5",
                                    rotation
                                      ? "border-transparent bg-transparent"
                                      : clsx(
                                          "border-2 border-dashed",
                                          snapshot.isDraggingOver 
                                            ? "bg-blue-50/60 border-blue-400/75 scale-[1.02] shadow-sm" 
                                            : "border-slate-150 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/70"
                                        )
                                  )}
                                >
                                  {rotation ? (
                                    <RotationCard rotation={rotation} index={0} />
                                  ) : (
                                    <span className="text-[9px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider uppercase select-none italic">
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
                  );
                })
              ) : (
                // View Mode: Selected Resident Entire Residency (5 levels)
                selectedResident ? (
                  (activeRows as { id: string; label: string; year: number; level: string; }[]).map((row) => {
                    const totalRotations = rotations.filter(
                      r => r.residentId === selectedResident.id && r.year === row.year
                    ).length;
                    const assignedPercentage = Math.min(100, Math.round((totalRotations / 12) * 100));

                    return (
                      <div key={row.id} className="flex items-center group py-1.5 hover:bg-slate-50/30 rounded-lg transition-colors">
                        <div className="w-56 shrink-0 pr-4 flex flex-col justify-center sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.03)] -ml-5 pl-5 select-none">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider shadow-xs flex-shrink-0 uppercase",
                              row.level === 'R1' ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : row.level === 'R2' ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : row.level === 'R3' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : row.level === 'R4' ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                            )}>
                              {row.level}
                            </span>
                            <span className="text-xs font-bold truncate text-slate-700 tracking-wide font-heading" title={row.label}>
                              {row.label}
                            </span>
                          </div>

                          {/* Progress Bar (ex. "9/12 meses") */}
                          <div className="mt-1.5 pr-2 w-full flex items-center gap-1.5">
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className={clsx(
                                  "h-full rounded-full transition-all duration-500",
                                  assignedPercentage === 100 ? "bg-emerald-500" : "bg-blue-500"
                                )}
                                style={{ width: `${assignedPercentage}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-extrabold text-slate-400 tracking-tighter w-8 flex-shrink-0 text-right">
                              {totalRotations}/12m
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-12 gap-2 pl-3">
                          {ACADEMIC_MONTH_INDICES.map((monthIndex) => {
                            const calendarYear = monthIndex >= 5 ? row.year : row.year + 1;
                            const cellId = `${selectedResident.id}-${monthIndex}-${calendarYear}`;
                            const rotation = rotations.find(
                              r => r.residentId === selectedResident.id && r.month === monthIndex && r.year === calendarYear
                            );

                            return (
                              <Droppable key={cellId} droppableId={cellId} isDropDisabled={!isAdmin}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={clsx(
                                      "h-11 rounded-lg transition-all duration-200 relative flex items-center justify-center p-0.5",
                                      rotation
                                        ? "border-transparent bg-transparent"
                                        : clsx(
                                            "border-2 border-dashed",
                                            snapshot.isDraggingOver 
                                              ? "bg-blue-50/60 border-blue-400/75 scale-[1.02] shadow-sm" 
                                              : "border-slate-150 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/70"
                                          )
                                    )}
                                  >
                                    {rotation ? (
                                      <RotationCard rotation={rotation} index={0} />
                                    ) : (
                                      <span className="text-[9px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider uppercase select-none italic">
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
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-slate-500 py-6">Por favor, selecciona un residente.</p>
                )
              )}
            </div>
          </div>
        </div>

        {/* 🗑️ FLOATING TRASH CAN DROP ZONE (Always mounted to prevent DnD state-machine crashes, positioned offscreen when inactive) */}
        <Droppable droppableId="delete-zone">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={clsx(
                "fixed z-50 flex items-center gap-3 px-6 py-4 rounded-full border-2 border-dashed shadow-2xl transition-all duration-300 pointer-events-auto",
                isDraggingRotation
                  ? "bottom-6 left-6 lg:left-24 opacity-100 scale-100"
                  : "bottom-[-100px] left-6 lg:left-24 opacity-0 scale-75 pointer-events-none",
                snapshot.isDraggingOver
                  ? "bg-red-500 border-red-650 text-white scale-110 shadow-red-500/30 animate-pulse"
                  : "bg-red-50 border-red-250 text-red-700 hover:bg-red-100"
              )}
            >
              <Trash2 className={clsx(
                "w-6 h-6 transition-transform duration-300",
                snapshot.isDraggingOver ? "scale-125 rotate-12 text-white" : "text-red-500"
              )} />
              <span className="text-sm font-extrabold tracking-wide uppercase select-none">
                {snapshot.isDraggingOver ? "¡Suelta para eliminar!" : "Arrastra aquí para eliminar"}
              </span>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
};

export default Board;
