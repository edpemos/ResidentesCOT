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
import { GripVertical, Calendar, User, Info, EyeOff, Filter, Trash2, ChevronUp, ChevronDown, Copy, Lock, LockOpen } from 'lucide-react';
import type { Resident, Rotation } from '../../types';

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
    setSelectedResidentId,
    copyRotationsRow,
    cloneAcademicYear,
    updateRotation
  } = useRotationStore();
  
  const { units } = useUnitStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [bankExpanded, setBankExpanded] = useState(true);
  const [isDraggingRotation, setIsDraggingRotation] = useState(false);
  const [copyingResident, setCopyingResident] = useState<Resident | null>(null);
  const [sourceYearOverride, setSourceYearOverride] = useState<number | null>(null);
  const [targetResidentId, setTargetResidentId] = useState<string>('');
  const [targetYear, setTargetYear] = useState<number>(currentYear + 1);

  // State for editing rotation
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [editingCustomName, setEditingCustomName] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<'confirmed' | 'pending' | null>(null);

  const handleOpenEdit = (rotation: Rotation) => {
    if (!isAdmin) return;
    setEditingRotation(rotation);
    setEditingCustomName(rotation.customName || '');
    setEditingStatus(rotation.status || null);
  };

  const handleSaveEdit = async () => {
    if (!editingRotation) return;
    
    const updates: Partial<Rotation> = {
      status: editingStatus === undefined ? null : editingStatus
    };
    
    const unit = units.find(u => u.id === editingRotation.unitId);
    if (unit?.type === 'externa') {
      updates.customName = editingCustomName.trim() || null;
    } else {
      updates.customName = null;
    }

    await updateRotation(editingRotation.id, updates);
    setEditingRotation(null);
  };

  const handleCloneAcademicYear = async () => {
    const nextYear = currentYear + 1;
    if (window.confirm(`¿Copiar toda la pizarra del curso académico actual ${currentYear}/${currentYear + 1} al curso siguiente ${nextYear}/${nextYear + 1}?\n\n¡CUIDADO! Esto sobrescribirá cualquier rotación ya planificada en el curso de destino.`)) {
      await cloneAcademicYear(currentYear, nextYear);
      setCurrentYear(nextYear);
      alert(`Pizarra copiada con éxito. Ahora estás viendo el curso académico ${nextYear}/${nextYear + 1}.`);
    }
  };

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

  // Available academic years (from 2026/2027 to 2033/2034)
  const academicYears = Array.from({ length: 8 }, (_, i) => 2026 + i);

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

    const parts = destination.droppableId.split('-');
    const destYearStr = parts.pop();
    const destMonthStr = parts.pop();
    const destResidentId = parts.join('-');
    const destMonth = parseInt(destMonthStr || '0', 10);
    
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
    const activeId = selectedResidentId;
    const selectedResident = residents.find(r => r.id === activeId);
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

  // Handle selected resident resolve for single view
  const getSelectedResidentResolved = () => {
    return residents.find(r => r.id === selectedResidentId) || null;
  };

  const selectedResident = getSelectedResidentResolved();

  return (
    <>
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800/80 overflow-hidden flex flex-col relative h-full backdrop-blur-md">
            {/* 💳 HEADER CON BOTÓN DE FILTRO */}
      <div className="px-3 py-2 border-b border-slate-150 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 dark:from-slate-950/20 to-white dark:to-slate-900/35 flex flex-wrap gap-2 items-center justify-between">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-200 tracking-wide text-xs uppercase font-heading">
          {viewMode === 'academicYear' 
            ? `PIZARRA DE ROTACIONES ${currentYear}/${currentYear + 1}` 
            : `PIZARRA DE ROTACIONES — ${selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName || ''}` : ''}`}
        </h3>
        <div className="flex gap-2 items-center">
          {isAdmin && (
            <button
              onClick={() => setIsEditingBoard(!isEditingBoard)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer shadow-sm select-none",
                isEditingBoard 
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/15 hover:bg-emerald-700" 
                  : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-slate-855 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
              )}
            >
              {isEditingBoard ? <LockOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isEditingBoard ? "Desbloqueado" : "Editar Pizarra"}</span>
            </button>
          )}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer shadow-sm select-none",
              filtersExpanded 
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15" 
                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-850 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
            )}
          >
            {filtersExpanded ? <EyeOff className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
            <span>{filtersExpanded ? "Ocultar Opciones" : "Mostrar Opciones"}</span>
          </button>
        </div>
      </div>

      {/* 🛠️ FILTER CONTROL BAR PANEL */}
      <div 
        className={clsx(
          "transition-all duration-300 ease-in-out overflow-hidden bg-slate-50/50 dark:bg-slate-950/40 space-y-2",
          filtersExpanded 
            ? "max-h-[300px] opacity-100 p-3 border-b border-slate-100 dark:border-slate-800" 
            : "max-h-0 opacity-0 p-0 border-b-0 pointer-events-none"
        )}
      >
        
        {/* Toggle Mode Buttons */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('academicYear')}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-all cursor-pointer",
                viewMode === 'academicYear'
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250"
              )}
            >
              <Calendar className="w-3 h-3" />
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
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-all cursor-pointer",
                viewMode === 'resident'
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250"
              )}
            >
              <User className="w-3 h-3" />
              Vista por Residente
            </button>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 px-2 py-1 rounded-lg">
            <Info className="w-3 h-3 text-slate-450" />
            Las rotaciones académicas comienzan en Junio y terminan en Mayo.
          </div>
        </div>

        {/* Dynamic Selectors depending on Active Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'academicYear' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Filtrar Curso:</span>
              <div className="flex flex-wrap gap-1">
                {academicYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setCurrentYear(year)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border",
                      currentYear === year
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
                    )}
                  >
                    {year}/{year + 1}
                  </button>
                ))}
                {isAdmin && isEditingBoard && (
                  <button
                    onClick={handleCloneAcademicYear}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-150 hover:from-blue-100 hover:to-indigo-100 text-blue-700 dark:from-blue-955/20 dark:to-indigo-955/20 dark:border-blue-900/40 dark:text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer active:translate-y-0 select-none ml-2"
                    title={`Copiar toda la pizarra del curso ${currentYear}/${currentYear + 1} al curso siguiente ${currentYear + 1}/${currentYear + 2}`}
                  >
                    <Copy className="w-3 h-3 flex-shrink-0" />
                    Copiar al Curso Siguiente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider shrink-0">Residente:</span>
              <select
                value={selectedResidentId}
                onChange={(e) => setSelectedResidentId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs font-medium px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {residents
                  .filter(r => !r.id.startsWith('temp-') && 
                               !r.firstName.toLowerCase().includes('futuro') && 
                               !r.lastName?.toLowerCase().includes('futuro') &&
                               r.year !== 'Graduado')
                  .map((r) => (
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
          {isAdmin && isEditingBoard && (
            <div className="p-2.5 bg-slate-50/50 border-b border-slate-200/60 min-w-[960px] shadow-xs shrink-0">
              
              {/* Sleek Clickable Accordion Header */}
              <div 
                onClick={() => setBankExpanded(!bankExpanded)}
                className="flex items-center justify-between cursor-pointer select-none group/bank pb-0.5"
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider group-hover/bank:text-slate-700 transition-colors font-heading">
                    Banco de Especialidades (Arrastra las tarjetas a la pizarra para colocarlas)
                  </h4>
                  <span className="text-[9px] text-slate-400 font-semibold opacity-0 group-hover/bank:opacity-100 transition-opacity">
                    ({bankExpanded ? "haz clic para contraer" : "haz clic para desplegar"})
                  </span>
                </div>
                {bankExpanded 
                  ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover/bank:text-slate-600 transition-colors" /> 
                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover/bank:text-slate-600 transition-colors" />
                }
              </div>

              {/* Collapsible Content with Smooth Transitions */}
              <div 
                className={clsx(
                  "transition-all duration-300 ease-in-out overflow-hidden",
                  bankExpanded 
                    ? "max-h-[200px] opacity-100 mt-2" 
                    : "max-h-0 opacity-0 mt-0 pointer-events-none"
                )}
              >
                <Droppable droppableId="unit-bank" direction="horizontal" isDropDisabled={true}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className="flex flex-wrap gap-1.5"
                    >
                      {units.map((unit, index) => (
                        <Draggable key={`bank-${unit.id}`} draggableId={`bank-${unit.id}`} index={index} isDragDisabled={!isEditingBoard}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={clsx(
                                "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-bold shadow-sm transition-all cursor-grab",
                                getColor(unit.color).bg,
                                getColor(unit.color).text,
                                getColor(unit.color).border,
                                snapshot.isDragging 
                                  ? "shadow-2xl scale-[1.04] rotate-[2deg] z-50 ring-2 ring-blue-500/50" 
                                  : "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                              )}
                              style={provided.draggableProps.style}
                            >
                              <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
                              {unit.name}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

            </div>
          )}

          {/* 📅 THE BLACKBOARD TABLE GRID */}
          <div className="w-full px-2 py-1 flex-1 relative min-w-[850px] lg:min-w-0">
            
            {/* Calendar Month Headers (June to May) */}
            <div className="flex mb-1 sticky top-0 bg-white/95 backdrop-blur-md z-20 py-1 border-b border-slate-100 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.03)] -mx-2 px-2">
              <div className="w-32 shrink-0 sticky left-0 bg-white/95 backdrop-blur-xs z-30 flex items-center -ml-2 pl-2">
                <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest pl-1">
                  Residente
                </span>
              </div>
              <div className="flex-1 grid grid-cols-12 gap-1 pl-2">
                {ACADEMIC_MONTH_INDICES.map((m) => (
                  <div key={m} className="text-center text-[10px] font-extrabold text-slate-550 uppercase tracking-widest font-heading">
                    {MONTHS[m]}
                  </div>
                ))}
              </div>
            </div>

            {/* Resident rows */}
            <div className="space-y-1">
              {viewMode === 'academicYear' ? (
                // View Mode: Academic Year
                (activeRows as Resident[]).map((resident) => {
                  const totalRotations = rotations.filter(r => r.residentId === resident.id).length;
                  const assignedPercentage = Math.min(100, Math.round((totalRotations / 12) * 100));
                  
                  return (
                    <div key={resident.id} className="flex items-center group py-0.5 hover:bg-slate-50/30 dark:hover:bg-slate-800/15 rounded-lg transition-colors">
                      <div className="w-32 shrink-0 pr-2 flex flex-col justify-center sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800/80 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)] -ml-2 pl-2 select-none">
                        <div className="flex items-center gap-1">
                          <span className={clsx(
                            "text-[8px] font-extrabold px-1 py-0.25 rounded-md tracking-wider shadow-xs flex-shrink-0 uppercase", 
                            resident.id.startsWith('temp-')
                              ? 'bg-slate-100 text-slate-450 border border-slate-200 border-dashed dark:bg-slate-950 dark:text-slate-500 dark:border-slate-800/60'
                              : resident.year === 'R1' ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/35 dark:text-teal-400 dark:border-teal-900/35'
                              : resident.year === 'R2' ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/35 dark:text-sky-400 dark:border-sky-900/35'
                              : resident.year === 'R3' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/35 dark:text-indigo-400 dark:border-indigo-900/35'
                              : resident.year === 'R4' ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/35 dark:text-purple-400 dark:border-purple-900/35'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/35 dark:text-rose-400 dark:border-rose-900/35'
                          )}>
                            {resident.year}
                          </span>
                          <span className={clsx(
                            "text-[11px] font-bold truncate tracking-wide",
                            resident.id.startsWith('temp-') ? 'text-slate-400 italic font-medium' : 'text-slate-700 dark:text-slate-300'
                          )} title={`${resident.firstName} ${resident.lastName}`}>
                            {resident.firstName} {resident.lastName}
                          </span>
                          {isAdmin && isEditingBoard && !resident.id.startsWith('temp-') && (
                            <button
                              onClick={() => {
                                setCopyingResident(resident);
                                setSourceYearOverride(null);
                                setTargetResidentId(resident.id);
                                setTargetYear(currentYear);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-all text-slate-450 hover:text-blue-500 cursor-pointer flex-shrink-0 ml-auto"
                              title="Copiar Fila de Rotaciones"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        
                        {/* Progress Bar (ex. "9/12 meses") */}
                        {!resident.id.startsWith('temp-') && (
                          <div className="mt-0.5 pr-1 w-full flex items-center gap-1">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-0.5 rounded-full overflow-hidden">
                              <div 
                                className={clsx(
                                  "h-full rounded-full transition-all duration-500",
                                  assignedPercentage === 100 ? "bg-emerald-500" : "bg-blue-500"
                                )}
                                style={{ width: `${assignedPercentage}%` }}
                              />
                            </div>
                            <span className="text-[7px] font-extrabold text-slate-400 dark:text-slate-500 tracking-tighter w-6 flex-shrink-0 text-right">
                              {totalRotations}/12m
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 grid grid-cols-12 gap-1 pl-2">
                        {ACADEMIC_MONTH_INDICES.map((monthIndex) => {
                          const calendarYear = monthIndex >= 5 ? currentYear : currentYear + 1;
                          const cellId = `${resident.id}-${monthIndex}-${calendarYear}`;
                          const rotation = rotations.find(
                            r => r.residentId === resident.id && r.month === monthIndex && r.year === calendarYear
                          );

                          return (
                            <Droppable key={cellId} droppableId={cellId} isDropDisabled={!isAdmin || !isEditingBoard}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={clsx(
                                    "h-[50px] w-full rounded-lg transition-all duration-200 relative flex items-center justify-center p-0.5",
                                    rotation
                                      ? "border-transparent bg-transparent"
                                      : clsx(
                                          "border border-dashed",
                                          snapshot.isDraggingOver 
                                            ? "bg-blue-50/60 border-blue-400/75 scale-[1.02] shadow-sm dark:bg-blue-950/20 dark:border-blue-700/50" 
                                            : "border-slate-150 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-950/20 dark:hover:border-slate-700 dark:hover:bg-slate-950/45"
                                        )
                                  )}
                                >
                                  {rotation ? (
                                    <RotationCard rotation={rotation} index={0} onClick={handleOpenEdit} isDragDisabled={!isEditingBoard} />
                                  ) : (
                                    <span className="text-[8px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider uppercase select-none italic">
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
                      <div key={row.id} className="flex items-center group py-0.5 hover:bg-slate-50/30 dark:hover:bg-slate-800/15 rounded-lg transition-colors">
                        <div className="w-32 shrink-0 pr-2 flex flex-col justify-center sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800/80 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)] -ml-2 pl-2 select-none">
                          <div className="flex items-center gap-1">
                            <span className={clsx(
                              "text-[8px] font-extrabold px-1 py-0.25 rounded-md tracking-wider shadow-xs flex-shrink-0 uppercase",
                              row.level === 'R1' ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/35 dark:text-teal-400 dark:border-teal-900/35'
                              : row.level === 'R2' ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/35 dark:text-sky-400 dark:border-sky-900/35'
                              : row.level === 'R3' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/35 dark:text-indigo-400 dark:border-indigo-900/35'
                              : row.level === 'R4' ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/35 dark:text-purple-400 dark:border-purple-900/35'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/35 dark:text-rose-400 dark:border-rose-900/35'
                            )}>
                              {row.level}
                            </span>
                            <span className="text-[10px] font-bold truncate text-slate-700 dark:text-slate-350 tracking-wide font-heading" title={row.label}>
                              {row.label}
                            </span>
                            {isAdmin && isEditingBoard && (
                              <button
                                onClick={() => {
                                  setCopyingResident({
                                    id: selectedResident!.id,
                                    firstName: selectedResident!.firstName,
                                    lastName: selectedResident!.lastName,
                                    email: selectedResident!.email,
                                    startDate: selectedResident!.startDate,
                                    endDate: selectedResident!.endDate,
                                    year: row.level as any
                                  });
                                  setSourceYearOverride(row.year);
                                  setTargetResidentId(selectedResident!.id);
                                  setTargetYear(row.year);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded transition-all text-slate-455 hover:text-blue-500 cursor-pointer flex-shrink-0 ml-auto"
                                title="Copiar Fila de Rotaciones"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Progress Bar (ex. "9/12 meses") */}
                          <div className="mt-0.5 pr-1 w-full flex items-center gap-1">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-0.5 rounded-full overflow-hidden">
                              <div 
                                className={clsx(
                                  "h-full rounded-full transition-all duration-500",
                                  assignedPercentage === 100 ? "bg-emerald-500" : "bg-blue-500"
                                )}
                                style={{ width: `${assignedPercentage}%` }}
                              />
                            </div>
                            <span className="text-[7px] font-extrabold text-slate-400 dark:text-slate-500 tracking-tighter w-6 flex-shrink-0 text-right">
                              {totalRotations}/12m
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-12 gap-1 pl-2">
                          {ACADEMIC_MONTH_INDICES.map((monthIndex) => {
                            const calendarYear = monthIndex >= 5 ? row.year : row.year + 1;
                            const cellId = `${selectedResident.id}-${monthIndex}-${calendarYear}`;
                            const rotation = rotations.find(
                              r => r.residentId === selectedResident.id && r.month === monthIndex && r.year === calendarYear
                            );

                            return (
                              <Droppable key={cellId} droppableId={cellId} isDropDisabled={!isAdmin || !isEditingBoard}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={clsx(
                                      "h-[50px] w-full rounded-lg transition-all duration-200 relative flex items-center justify-center p-0.5",
                                      rotation
                                        ? "border-transparent bg-transparent"
                                        : clsx(
                                            "border border-dashed",
                                            snapshot.isDraggingOver 
                                              ? "bg-blue-50/60 border-blue-400/75 scale-[1.02] shadow-sm dark:bg-blue-950/20 dark:border-blue-700/50" 
                                              : "border-slate-150 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-950/20 dark:hover:border-slate-700 dark:hover:bg-slate-950/45"
                                          )
                                    )}
                                  >
                                    {rotation ? (
                                      <RotationCard rotation={rotation} index={0} onClick={handleOpenEdit} isDragDisabled={!isEditingBoard} />
                                    ) : (
                                      <span className="text-[8px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider uppercase select-none italic">
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
                  ? "bg-red-500 border-red-600 text-white scale-110 shadow-red-500/30 animate-pulse"
                  : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
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

      {/* 📋 MODAL COPIAR ROTACIONES */}
      {copyingResident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-500" />
              Copiar Rotaciones
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Vas a copiar la secuencia de 12 meses de rotaciones de{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {copyingResident.firstName} {copyingResident.lastName}
              </span>{' '}
              ({sourceYearOverride !== null ? `Curso ${sourceYearOverride}/${sourceYearOverride + 1}` : `Curso ${currentYear}/${currentYear + 1}`}).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">
                  Residente Destino
                </label>
                <select
                  value={targetResidentId}
                  onChange={(e) => setTargetResidentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un residente...</option>
                  {residents
                    .filter(r => !r.id.startsWith('temp-'))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.firstName} {r.lastName} ({r.year}) {r.id === copyingResident.id ? '(Él mismo)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">
                  Año Académico Destino
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                  className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs font-semibold px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {academicYears.map(y => (
                    <option key={y} value={y}>
                      Curso {y}/{y + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setCopyingResident(null);
                  setSourceYearOverride(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!targetResidentId}
                onClick={async () => {
                  const srcYear = sourceYearOverride !== null ? sourceYearOverride : currentYear;
                  await copyRotationsRow(copyingResident.id, srcYear, targetResidentId, targetYear);
                  
                  setCopyingResident(null);
                  setSourceYearOverride(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copiar Rotaciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 MODAL EDITAR ROTACIÓN */}
      {editingRotation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              Editar Rotación
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configura la confirmación y detalles de esta rotación.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-2">
                  Estado de Confirmación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStatus(null)}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center",
                      editingStatus === null
                        ? "bg-slate-100 border-slate-350 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    Sin confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStatus('pending')}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
                      editingStatus === 'pending'
                        ? "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-955/35 dark:border-amber-900/30 dark:text-amber-400"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-3 h-3 rounded-full bg-amber-500 text-white font-extrabold text-[8px] flex items-center justify-center">✓</span>
                    Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStatus('confirmed')}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
                      editingStatus === 'confirmed'
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-955/35 dark:border-emerald-900/30 dark:text-emerald-400"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-3 h-3 rounded-full bg-emerald-500 text-white font-extrabold text-[8px] flex items-center justify-center">✓</span>
                    Confirmada
                  </button>
                </div>
              </div>

              {(() => {
                const unit = units.find(u => u.id === editingRotation.unitId);
                const isExternal = unit?.type === 'externa';
                if (!isExternal) return null;

                return (
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">
                      Nombre Personalizado (Rotación Externa)
                    </label>
                    <input
                      type="text"
                      value={editingCustomName}
                      onChange={(e) => setEditingCustomName(e.target.value)}
                      placeholder={unit?.name}
                      className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setEditingRotation(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 transition-all cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Board;
