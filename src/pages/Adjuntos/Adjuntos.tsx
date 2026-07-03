import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Users, Calendar, Sparkles, AlertCircle, Loader2, User, X } from 'lucide-react';
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

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const getFriendlyDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${days[dateObj.getDay()]}, ${d} de ${MONTHS_SPANISH[m - 1]} de ${y}`;
};

// Mapeador exacto de colores y etiquetas según la captura y peticiones del usuario
const getShiftBadgeStyle = (status: string, shiftCode: string) => {
  let label = shiftCode;

  // Limpiar etiquetas para hacerlas compactas como en la captura
  if (shiftCode === 'QMU') label = 'Diferida M';
  else if (shiftCode === 'QTU') label = 'Diferida T';
  else if (shiftCode.startsWith('QM')) label = 'Quirof M';
  else if (shiftCode.startsWith('QT')) label = 'Quirof T';
  else if (shiftCode === 'CM') label = 'Cons M';
  else if (shiftCode === 'CT') label = 'Cons T';
  else if (shiftCode === 'PLA') label = 'Planta';
  else if (shiftCode === 'Ges') label = 'Gestion';
  else if (shiftCode === 'Cur') label = 'Curso';
  else if (shiftCode === 'GLO') label = 'Localiz';
  else if (shiftCode === 'GPF' || shiftCode === 'G') label = 'Guardia';
  else if (shiftCode === 'S' || shiftCode === 'Saliente') label = 'Saliente';

  switch (status) {
    case 'De Guardia':
      return { bg: 'bg-[#b91c1c] text-white border-transparent', label }; // Rojo Guardia
    case 'Localizado':
      return { bg: 'bg-[#6d28d9] text-white border-transparent', label }; // Morado/Violeta Localiz
    case 'Quirófano Mañana':
    case 'Diferida Mañana':
      return { bg: 'bg-[#0f172a] text-white border-transparent', label }; // Azul Oscuro Quirof M
    case 'Quirófano Tarde':
    case 'Diferida Tarde':
      return { bg: 'bg-[#2563eb] text-white border-transparent', label }; // Azul Quirof T
    case 'Consulta':
      return { bg: 'bg-[#047857] text-white border-transparent', label }; // Verde Cons M / Cons T
    case 'Curso/Congreso':
      return { bg: 'bg-[#7c3aed] text-white border-transparent', label }; // Morado Curso
    case 'Planta':
      return { bg: 'bg-[#475569] text-white border-transparent', label }; // Gris Diferida/Planta
    case 'Gestión':
      return { bg: 'bg-[#b45309] text-white border-transparent', label }; // Marrón/Oro Gestion
    case 'Saliente':
      return { bg: 'bg-[#f97316] text-white border-transparent', label }; // Naranja Saliente
    default:
      return { bg: 'bg-[#64748b] text-white border-transparent', label }; // Gris general
  }
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

  // Estado para controlar apertura de modal de detalle
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de apertura de desplegables de filtros
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);

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
          const data = doc.data() as AttendingDayDoc;
          // Aplicar remapeo de unidades del lado del cliente para cambios inmediatos
          if (data.schedule) {
            data.schedule = data.schedule.map(s => {
              const lowerName = s.name.toLowerCase();
              let newUnit = s.unit || '';
              if ((lowerName.includes('perez') || lowerName.includes('pérez')) && 
                  (lowerName.includes('jose') || lowerName.includes('josé')) && 
                  (lowerName.includes('maria') || lowerName.includes('maría'))) {
                newUnit = 'Trauma';
              } else if (lowerName.includes('veronica') || lowerName.includes('verónica')) {
                newUnit = 'Trauma';
              } else if (newUnit === 'Miembro Superior') {
                newUnit = '';
              }
              return { ...s, unit: newUnit };
            });
          }
          docs[doc.id] = data;
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

  // Generar pestañas de meses alrededor de la selección actual (3 meses antes, 3 después)
  const monthTabs = useMemo(() => {
    const tabs = [];
    const baseDate = new Date(currentYearMonth.year, currentYearMonth.month, 1);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      tabs.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTHS_SPANISH[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
      });
    }
    return tabs;
  }, [currentYearMonth.year, currentYearMonth.month]);

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

  // Planificación del día seleccionado actualmente, filtrada por "Solo Guardias" o filtros activos
  const selectedDayPlan = useMemo(() => {
    const rawPlan = scheduleData[currentDate]?.schedule || [];
    
    // Filtrar por guardias si está activo
    let filtered = showOnlyGuardias 
      ? rawPlan.filter(s => s.status === 'De Guardia' || s.shift === 'GPF')
      : rawPlan;

    // Filtrar por médicos o unidades seleccionadas
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-[1400px] mx-auto pb-10">
      
      {/* Banner de Bienvenida */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 border border-teal-900/35 rounded-3xl p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/5 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Sincronización Guardiscopio
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight font-display">
              Planificación de Adjuntos
            </h2>
            <p className="text-slate-350 text-xs leading-relaxed max-w-xl">
              Filtra por Unidad o Médico para auditar y consultar las actividades. El calendario inferior se actualizará instantáneamente.
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-teal-950 border border-teal-900/40 text-emerald-400 shadow-xl shadow-teal-950/50">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BLOQUE DE FILTROS (ARRIBA) */}
      <div className="bg-white dark:bg-slate-900/55 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <div>
            <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 font-display">
              <Users className="w-4 h-4 text-teal-500" />
              Filtros Desplegables
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Filtra por Unidad o por Médico para aislar su planificación del mes directamente en el calendario.
            </p>
          </div>
          
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
          <div className="flex flex-col sm:flex-row gap-4 relative">
            
            {/* Desplegable 1: Especialidades / Unidades */}
            <div className="relative w-full sm:w-64">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 pl-1">
                Unidad / Especialidad
              </label>
              <button
                onClick={() => {
                  setUnitsOpen(!unitsOpen);
                  setNamesOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer select-none"
              >
                <span>
                  {selectedUnits.size === 0 
                    ? "Todas las unidades" 
                    : selectedUnits.size === 1 
                      ? Array.from(selectedUnits)[0] 
                      : `${selectedUnits.size} unidades seleccionadas`}
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {unitsOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setUnitsOpen(false)} />
                  <div className="absolute top-full left-0 z-30 mt-1 w-full max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {uniqueUnits.map(unit => {
                      const isSelected = selectedUnits.has(unit);
                      return (
                        <button
                          key={unit}
                          onClick={() => toggleUnitHighlight(unit)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-955 rounded-lg transition-all cursor-pointer text-left"
                        >
                          <span>{unit}</span>
                          <div className={clsx(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                            isSelected 
                              ? "bg-teal-500 border-teal-650 text-white" 
                              : "border-slate-300 dark:border-slate-700"
                          )}>
                            {isSelected && <span className="text-[9px] font-black">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Desplegable 2: Médicos */}
            <div className="relative w-full sm:w-72">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 pl-1">
                Médico Adjunto
              </label>
              <button
                onClick={() => {
                  setNamesOpen(!namesOpen);
                  setUnitsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-800/40 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer select-none"
              >
                <span>
                  {highlightedNames.size === 0 
                    ? "Todos los médicos" 
                    : highlightedNames.size === 1 
                      ? Array.from(highlightedNames)[0] 
                      : `${highlightedNames.size} médicos seleccionados`}
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {namesOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setNamesOpen(false)} />
                  <div className="absolute top-full left-0 z-30 mt-1 w-full max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {uniqueNames.map(name => {
                      const isSelected = highlightedNames.has(name);
                      return (
                        <button
                          key={name}
                          onClick={() => toggleNameHighlight(name)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-lg transition-all cursor-pointer text-left"
                        >
                          <span>{name}</span>
                          <div className={clsx(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                            isSelected 
                              ? "bg-emerald-500 border-emerald-650 text-white" 
                              : "border-slate-300 dark:border-slate-700"
                          )}>
                            {isSelected && <span className="text-[9px] font-black">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* BLOQUE DE CALENDARIO (ABAJO - ANCHO COMPLETO) */}
      <div className="bg-[#f8fafc] dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-lg space-y-5">
        
        {/* Cabecera del calendario */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display uppercase tracking-widest">
              Calendario del Servicio
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Solo Guardias Toggle */}
            <button
              onClick={() => setShowOnlyGuardias(!showOnlyGuardias)}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer select-none',
                showOnlyGuardias
                  ? 'bg-red-500 text-white border-red-650 shadow-md shadow-red-500/10'
                  : 'bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400 border-slate-250/50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full', showOnlyGuardias ? 'bg-white animate-pulse' : 'bg-red-500')} />
              Ver Solo Guardias
            </button>
          </div>
        </div>

        {/* Tabulación de Meses Premium como en la captura */}
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2 pt-1 border-b border-slate-200/50 dark:border-slate-800/30 no-scrollbar">
          {monthTabs.map((tab, idx) => {
            const isActive = tab.year === currentYearMonth.year && tab.month === currentYearMonth.month;
            return (
              <button
                key={idx}
                onClick={() => {
                  setCurrentYearMonth({ year: tab.year, month: tab.month });
                  setCurrentDate(`${tab.year}-${String(tab.month + 1).padStart(2, '0')}-01`);
                }}
                className={clsx(
                  'px-3.5 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap cursor-pointer select-none border',
                  isActive
                    ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-md shadow-blue-500/15'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-transparent bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">Cargando Cuadrante...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Cabecera de Días (L, M, X, J, V, S, D) */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {DAYS_SHORT.map(d => (
                <div key={d} className="text-xs font-black text-slate-400 dark:text-slate-500 py-1 uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>

            {/* Cuadrícula de Calendario Completa */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-[4/5] bg-slate-100/30 dark:bg-slate-900/10 rounded-2xl border border-transparent" />;
                }

                const hasData = !!scheduleData[day.dateKey];
                const daySchedule = scheduleData[day.dateKey]?.schedule || [];
                const dayGuardias = daySchedule.filter(s => s.status === 'De Guardia' || s.shift === 'GPF');
                
                const isSelected = day.dateKey === currentDate;

                // Si hay filtros, mostramos solo lo que coincide
                const hasActiveFilters = highlightedNames.size > 0 || selectedUnits.size > 0;
                const activeShifts = showOnlyGuardias ? dayGuardias : daySchedule;
                
                const matchingShifts = hasActiveFilters
                  ? activeShifts.filter(s => highlightedNames.has(s.name) || (s.unit && selectedUnits.has(s.unit)))
                  : activeShifts;

                // El fondo de la celda es grisáceo si no tiene turnos cargados
                const isCellEmpty = matchingShifts.length === 0;

                return (
                  <button
                    key={day.dateKey}
                    onClick={() => {
                      setCurrentDate(day.dateKey);
                      setIsModalOpen(true);
                    }}
                    className={clsx(
                      'aspect-[4/5] p-2 rounded-2xl border flex flex-col justify-start items-stretch transition-all cursor-pointer text-left relative overflow-hidden group select-none',
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-orange-550 ring-2 ring-orange-550 shadow-lg shadow-orange-550/10'
                        : isCellEmpty
                          ? 'bg-[#f1f5f9]/40 dark:bg-slate-950/10 border-slate-200/40 dark:border-slate-800/20 opacity-60'
                          : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/40 shadow-sm hover:shadow-md'
                    )}
                  >
                    {/* Número del día */}
                    <div className="flex justify-center pb-1">
                      <span className={clsx(
                        'text-xs font-black px-1.5 py-0.5 rounded-full leading-none text-center min-w-[20px]',
                        isSelected 
                          ? 'bg-red-650 text-white font-extrabold' 
                          : 'text-slate-800 dark:text-slate-200'
                      )}>
                        {day.dayNumber}
                      </span>
                    </div>

                    {/* Lista de Badges de Actividades */}
                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5 no-scrollbar mt-1">
                      {matchingShifts.slice(0, 4).map((s, si) => {
                        const { bg, label } = getShiftBadgeStyle(s.status, s.shift);
                        const shortName = s.name.replace(/(Dr\.|Dra\.)\s*/g, '').split(' ').slice(0, 1).join('');
                        
                        return (
                          <div key={si} className="flex flex-col items-stretch">
                            {/* Badge del Turno */}
                            <span className={clsx(
                              "text-[8.5px] font-black uppercase rounded py-0.5 text-center truncate leading-none shadow-sm",
                              bg
                            )}>
                              {label}
                            </span>
                            {/* Nombre del Cirujano (bajo el badge) */}
                            {s.name && (
                              <span className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400 text-center block mt-0.5 leading-none truncate">
                                ↳ {shortName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {matchingShifts.length > 4 && (
                        <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 text-center block w-full uppercase tracking-wider py-0.5 bg-slate-100 dark:bg-slate-850 rounded leading-none">
                          +{matchingShifts.length - 4} más
                        </span>
                      )}
                    </div>

                    {/* Indicador de actividad general */}
                    {!showOnlyGuardias && !hasActiveFilters && hasData && dayGuardias.length === 0 && (
                      <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-orange-400" />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* MODAL DETALLADO DEL DÍA SELECCIONADO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[9px] font-black uppercase text-teal-500 tracking-wider">Fecha Seleccionada</span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-display">
                  {getFriendlyDate(currentDate)}
                </h4>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-5 space-y-4 max-h-[450px] overflow-y-auto">
              <h5 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                Planificación Detallada del Día
              </h5>

              {selectedDayPlan.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                  <AlertCircle className="w-8 h-8 text-slate-350 dark:text-slate-650" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">
                    Sin Asignaciones
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                    No se han registrado asignaciones para el personal adjunto o el modo de filtro activo no arroja resultados para este día.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayPlan.map((shift, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-teal-500/30 dark:hover:border-teal-500/20 transition-all group gap-2"
                    >
                      <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-teal-500/10 dark:bg-teal-400/10 flex items-center justify-center shrink-0 border border-teal-500/15">
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

            {/* Footer del Modal */}
            <div className="flex items-center justify-end p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Adjuntos;
