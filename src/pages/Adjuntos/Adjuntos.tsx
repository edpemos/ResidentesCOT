import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Users, Calendar, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Loader2, User } from 'lucide-react';
import clsx from 'clsx';

interface AttendingShift {
  name: string;
  shift: string;
  status: string;
  role?: string;
  identityId?: string;
  unit?: string;
}

interface AttendingDayDoc {
  date: string;
  year: number;
  month: number;
  day: number;
  schedule: AttendingShift[];
}

const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const getFriendlyDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${days[dateObj.getDay()]}, ${d} de ${MONTHS_SPANISH[m - 1]} de ${y}`;
};

const getShiftBadgeClasses = (status: string) => {
  switch (status) {
    case 'De Guardia':
      return 'bg-red-500/10 text-red-500 border border-red-500/20';
    case 'Localizado':
      return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    case 'Quirófano Mañana':
    case 'Diferida Mañana':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-450 border border-yellow-500/20';
    case 'Quirófano Tarde':
    case 'Diferida Tarde':
      return 'bg-orange-500/10 text-orange-550 dark:text-orange-400 border border-orange-500/20';
    case 'Consulta':
      return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    case 'Curso/Congreso':
      return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
    case 'Planta':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20';
    default:
      return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
  }
};

const Adjuntos: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed month
  });

  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<Record<string, AttendingDayDoc>>({});
  
  // Estados para filtros de resaltado
  const [highlightedNames, setHighlightedNames] = useState<Set<string>>(new Set());
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());

  // Estado para ver solo guardias
  const [showOnlyGuardias, setShowOnlyGuardias] = useState(false);

  // Cargar datos de Firestore para el mes seleccionado
  useEffect(() => {
    const fetchMonthSchedule = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'attendingSchedule'),
          where('year', '==', currentYearMonth.year),
          where('month', '==', currentYearMonth.month + 1) // En Firestore guardamos 1-indexed
        );
        
        const querySnapshot = await getDocs(q);
        const docs: Record<string, AttendingDayDoc> = {};
        
        querySnapshot.forEach((doc) => {
          docs[doc.id] = doc.data() as AttendingDayDoc;
        });

        setScheduleData(docs);
      } catch (err) {
        console.error('Error fetching attending schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthSchedule();
  }, [currentYearMonth]);

  // Extraer todos los nombres únicos de adjuntos de este mes para la lista de resaltado
  const uniqueNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(scheduleData).forEach(day => {
      day.schedule.forEach(s => {
        if (s.name) names.add(s.name);
      });
    });
    return Array.from(names).sort();
  }, [scheduleData]);

  // Extraer todas las especialidades / unidades únicas de este mes
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    Object.values(scheduleData).forEach(day => {
      day.schedule.forEach(s => {
        if (s.unit) units.add(s.unit);
      });
    });
    return Array.from(units).sort();
  }, [scheduleData]);

  // Alternar el resaltado de un profesional
  const toggleNameHighlight = (name: string) => {
    setHighlightedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Alternar el resaltado de una especialidad/unidad
  const toggleUnitHighlight = (unit: string) => {
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unit)) {
        next.delete(unit);
      } else {
        next.add(unit);
      }
      return next;
    });
  };

  // Limpiar todos los filtros activos
  const clearAllFilters = () => {
    setHighlightedNames(new Set());
    setSelectedUnits(new Set());
  };

  // Navegación de meses
  const handlePrevMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
    clearAllFilters(); // Limpiamos filtros al cambiar de mes
  };

  const handleNextMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
    clearAllFilters(); // Limpiamos filtros al cambiar de mes
  };

  // Obtener los días del mes actual para renderizar el calendario cuadrícula
  const calendarDays = useMemo(() => {
    const { year, month } = currentYearMonth;
    
    // Primer día del mes
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    // Convertir a indexación europea (0 = Lunes, 6 = Domingo)
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Número de días en el mes
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Rellenar días del mes anterior (vacíos)
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }

    // Rellenar días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateKey
      });
    }

    return days;
  }, [currentYearMonth]);

  // Planificación del día seleccionado actualmente, filtrada si "Solo Guardias" o filtros por médico/unidad están activos
  const selectedDayPlan = useMemo(() => {
    const rawPlan = scheduleData[currentDate]?.schedule || [];
    
    // Primero, filtrar por guardia si el modo "Solo Guardias" está activo
    let filtered = showOnlyGuardias 
      ? rawPlan.filter(s => s.status === 'De Guardia' || s.shift === 'GPF')
      : rawPlan;

    // Segundo, si hay filtros activos (médicos o especialidades), filtramos la lista detallada
    const hasActiveFilters = highlightedNames.size > 0 || selectedUnits.size > 0;
    if (hasActiveFilters) {
      filtered = filtered.filter(s => {
        const matchesName = highlightedNames.has(s.name);
        const matchesUnit = s.unit && selectedUnits.has(s.unit);
        return matchesName || matchesUnit;
      });
    }

    return filtered;
  }, [scheduleData, currentDate, showOnlyGuardias, highlightedNames, selectedUnits]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      {/* Banner / Info Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 border border-teal-900/35 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/5 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Sincronización Activa (Guardiscopio)
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-display">
              Planificación de Adjuntos
            </h2>
            <p className="text-slate-350 text-sm leading-relaxed">
              Consulta el cuadrante de cirujanos adjuntos del Servicio de COT. Utiliza los filtros inferiores para resaltar especialidades médicas específicas.
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-950 border border-teal-900/40 text-emerald-400 shadow-xl shadow-teal-950/50">
            <Users className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LADO IZQUIERDO: Calendario Mensual + Listado de Selección (8 columnas) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xl space-y-6">
          
          {/* Header del Calendario */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-500" />
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 font-display">
                Calendario de Guardias
              </h3>
            </div>
            
            {/* Controles: Solo Guardias + Navegación */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              
              {/* Botón Switch: Solo Guardias */}
              <button
                onClick={() => setShowOnlyGuardias(!showOnlyGuardias)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer select-none',
                  showOnlyGuardias
                    ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/10'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-900'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full', showOnlyGuardias ? 'bg-white animate-pulse' : 'bg-red-500')} />
                Ver Solo Guardias
              </button>

              {/* Navegación del mes */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                <button
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2 min-w-[100px] text-center">
                  {MONTHS_SPANISH[currentYearMonth.month]} {currentYearMonth.year}
                </span>

                <button
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">Cargando Planificación...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Cuadrícula del mes */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border border-transparent" />;
                  }

                  const hasData = !!scheduleData[day.dateKey];
                  const daySchedule = scheduleData[day.dateKey]?.schedule || [];
                  
                  // Médicos de guardia física (GPF)
                  const dayGuardias = daySchedule.filter(s => s.status === 'De Guardia' || s.shift === 'GPF');
                  const isSelected = day.dateKey === currentDate;

                  // Lógica de filtrado/resaltado personalizado
                  // Si "Solo Guardias" está activo, sólo comprobamos coincidencias sobre médicos de guardia
                  const activeShiftsForHighlight = showOnlyGuardias ? dayGuardias : daySchedule;
                  
                  const hasHighlightedPerson = activeShiftsForHighlight.some(s => highlightedNames.has(s.name));
                  const hasHighlightedUnit = activeShiftsForHighlight.some(s => s.unit && selectedUnits.has(s.unit));
                  
                  // Se ilumina si coincide con algún filtro activo
                  const isHighlighted = (highlightedNames.size > 0 && hasHighlightedPerson) || 
                                        (selectedUnits.size > 0 && hasHighlightedUnit);

                  const hasActiveFilters = highlightedNames.size > 0 || selectedUnits.size > 0;
                  const matchingShifts = hasActiveFilters
                    ? activeShiftsForHighlight.filter(s => highlightedNames.has(s.name) || (s.unit && selectedUnits.has(s.unit)))
                    : [];

                  return (
                    <button
                      key={day.dateKey}
                      onClick={() => setCurrentDate(day.dateKey)}
                      className={clsx(
                        'aspect-square p-1.5 rounded-xl border flex flex-col justify-between items-start transition-all cursor-pointer text-left relative overflow-hidden group',
                        isSelected
                          ? 'bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/60 dark:border-teal-500/50 ring-1 ring-teal-500/20'
                          : isHighlighted
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/60 dark:border-emerald-500/50 ring-2 ring-emerald-400 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-50/50 dark:bg-slate-950/45 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800/40'
                      )}
                    >
                      {/* Número de día */}
                      <span className={clsx(
                        'text-[10px] font-black leading-none px-1 py-0.5 rounded-md',
                        isSelected 
                          ? 'bg-teal-600 text-white' 
                          : isHighlighted
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      )}>
                        {day.dayNumber}
                      </span>

                      {/* Contenido Dinámico según filtros */}
                      {hasActiveFilters ? (
                        <div className="w-full flex flex-col gap-0.5 mt-1 overflow-hidden">
                          {matchingShifts.slice(0, 3).map((s, si) => {
                            const shortName = s.name.replace(/(Dr\.|Dra\.)\s*/g, '').split(' ').slice(0, 1).join('');
                            return (
                              <span
                                key={si}
                                className={clsx(
                                  "text-[7px] font-extrabold uppercase border rounded px-0.5 py-0.5 truncate w-full block leading-none text-center",
                                  getShiftBadgeClasses(s.status)
                                )}
                                title={`${s.name} - ${s.shift}`}
                              >
                                {shortName}: {s.shift}
                              </span>
                            );
                          })}
                          {matchingShifts.length > 3 && (
                            <span className="text-[6.5px] font-black text-slate-455 dark:text-slate-500 text-center block w-full mt-0.5 uppercase tracking-wide">
                              +{matchingShifts.length - 3} Más
                            </span>
                          )}
                        </div>
                      ) : (
                        dayGuardias.length > 0 && (
                          <div className="w-full flex flex-col gap-0.5 mt-1 overflow-hidden">
                            {dayGuardias.slice(0, 2).map((g, gi) => {
                              const shortName = g.name.replace(/(Dr\.|Dra\.)\s*/g, '').split(' ').slice(0, 2).join(' ');
                              return (
                                <span
                                  key={gi}
                                  className="text-[7.5px] font-extrabold uppercase bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded px-1 py-0.5 truncate w-full block leading-tight text-center"
                                  title={`${g.name} - Guardia`}
                                >
                                  {shortName}
                                </span>
                              );
                            })}
                            {dayGuardias.length > 2 && (
                              <span className="text-[6.5px] font-black text-slate-400 dark:text-slate-500 text-center block w-full mt-0.5 uppercase tracking-wide">
                                +{dayGuardias.length - 2} Guardias
                              </span>
                            )}
                          </div>
                        )
                      )}
                      
                      {/* Indicador de actividad si no hay guardias y no estamos en modo "Solo Guardias" */}
                      {!showOnlyGuardias && hasData && dayGuardias.length === 0 && (
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-400" title="Actividad planificada" />
                      )}

                      {/* Marcador superior de resaltado */}
                      {isHighlighted && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-slate-900 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* SECCIÓN DE FILTROS PERSONALIZADOS */}
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5 font-display">
                      <Users className="w-4 h-4 text-teal-500" />
                      Resaltar en Calendario
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Filtra por Unidad o por Médico para iluminar sus actividades. Si activas "Ver Solo Guardias" arriba, se resaltarán únicamente sus días de guardia.
                    </p>
                  </div>
                  
                  {/* Botón de limpiar filtros */}
                  {(highlightedNames.size > 0 || selectedUnits.size > 0) && (
                    <button
                      onClick={clearAllFilters}
                      className="px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
                
                {uniqueNames.length === 0 && uniqueUnits.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-550 italic">No hay profesionales disponibles en este mes.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
                    
                    {/* Filtro por Especialidades / Unidades (5 columnas) */}
                    <div className="md:col-span-5 space-y-2">
                      <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l-2 border-teal-500 pl-2">
                        Por Unidad / Especialidad
                      </h5>
                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {uniqueUnits.map(unit => {
                          const isHighlighted = selectedUnits.has(unit);
                          return (
                            <button
                              key={unit}
                              onClick={() => toggleUnitHighlight(unit)}
                              className={clsx(
                                'px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer select-none',
                                isHighlighted
                                  ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/10 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-900'
                              )}
                            >
                              {unit}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filtro por Médicos individuales (7 columnas) */}
                    <div className="md:col-span-7 space-y-2">
                      <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-l-2 border-emerald-500 pl-2">
                        Por Médico Adjunto
                      </h5>
                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {uniqueNames.map(name => {
                          const isHighlighted = highlightedNames.has(name);
                          return (
                            <button
                              key={name}
                              onClick={() => toggleNameHighlight(name)}
                              className={clsx(
                                'px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer select-none',
                                isHighlighted
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/10 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-900'
                              )}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* LADO DERECHO: Detalle del Día Seleccionado (4 columnas) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-teal-500 tracking-wider">Fecha Seleccionada</span>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-display">
                {getFriendlyDate(currentDate)}
              </h4>
            </div>
            
            {showOnlyGuardias && (
              <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-wider animate-pulse">
                Modo Guardias
              </span>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 space-y-3">
            <h5 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              {showOnlyGuardias ? 'Guardias del Día' : 'Planificación Detallada'}
            </h5>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
              </div>
            ) : selectedDayPlan.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                <AlertCircle className="w-8 h-8 text-slate-350 dark:text-slate-650" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">
                  {showOnlyGuardias ? 'No hay guardias físicas' : 'No hay guardias o turnos'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                  {showOnlyGuardias 
                    ? 'No hay especialistas de guardia física (GPF) programados para esta fecha.'
                    : 'No se han registrado asignaciones para el personal adjunto en esta fecha o el cuadrante no está publicado aún.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {selectedDayPlan.map((shift, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-teal-500/30 dark:hover:border-teal-500/20 transition-all group gap-2"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 dark:bg-teal-400/10 flex items-center justify-center shrink-0 border border-teal-500/15" aria-hidden="true">
                          <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate leading-tight">
                            {shift.name}
                          </p>
                          <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold truncate leading-none mt-0.5">
                            {shift.unit || 'Sin Unidad'}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider ${getShiftBadgeClasses(shift.status)}`}>
                        {shift.status}
                      </span>
                    </div>

                    {/* Turno específico */}
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-2 py-1 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg">
                      Turno: <span className="font-bold text-slate-700 dark:text-slate-300">{shift.shift}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Adjuntos;
