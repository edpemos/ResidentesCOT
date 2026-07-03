import React, { useEffect, useState } from 'react';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { useAuthStore } from '../../store/authStore';
import { useDutyStore } from '../../store/dutyStore';
import { getColor } from '../../utils/constants';
import { 
  Sparkles, 
  MapPin, 
  Palmtree, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Building, 
  Compass,
  Calendar,
  Users,
  X
} from 'lucide-react';
import clsx from 'clsx';

const FULL_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_OF_WEEK_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAYS_OF_WEEK_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const getPlanningMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = -1; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      label: `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    });
  }
  return months;
};

const formatDateFriendly = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${days[dateObj.getDay()]}, ${d} de ${months[dateObj.getMonth()]} de ${y}`;
};

const getDutyBadgeDetails = (type: string) => {
  switch (type) {
    case 'guardia':
      return { label: 'Guardia', style: 'bg-red-500 text-white border-red-600' };
    case 'saliente':
      return { label: 'Saliente', style: 'bg-teal-800 text-white border-teal-900' };
    case 'vacaciones-pendiente':
      return { label: 'Vacaciones Pendientes', style: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-400/50 border-dashed' };
    case 'tarde':
      return { label: 'Tarde', style: 'bg-orange-500 text-white border-orange-600' };
    case 'libre':
      return { label: 'Libre', style: 'bg-teal-600 text-white border-teal-750' };
    case 'manana':
      return { label: 'Mañana', style: 'bg-yellow-400 text-slate-900 border-yellow-500' };
    case 'vacaciones':
      return { label: 'Vacaciones', style: 'bg-teal-600 text-white border-teal-750' };
    case 'curso':
      return { label: 'Curso', style: 'bg-purple-400 text-white border-purple-500' };
    case 'rucot':
      return { label: 'RUCOT', style: 'bg-blue-600 text-white border-blue-700' };
    default:
      return { label: 'Desconocido', style: 'bg-slate-500 text-white' };
  }
};

const getLabelOverrides = (notes?: string): string[] => {
  if (!notes) return [];
  const matches = [...notes.matchAll(/\[(.*?)\]/g)];
  return matches.map(m => m[1].trim());
};

const Home: React.FC = () => {
  const { user, role } = useAuthStore();
  const { residents, rotations, initializeStore: initRotationStore } = useRotationStore();
  const { duties, liquidations, initializeStore: initDutyStore } = useDutyStore();
  const { units, loadUnits } = useUnitStore();

  const planningMonths = React.useMemo(() => {
    const raw = getPlanningMonths();
    const filtered = raw.filter(m => {
      const id = `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}`;
      return !liquidations.some(l => l.id === id);
    });
    return filtered.length > 0 ? filtered : [raw[0]];
  }, [liquidations]);

  const [selectedMonth, setSelectedMonth] = useState(planningMonths[0]);

  // Keep selectedMonth updated if it gets filtered out
  useEffect(() => {
    if (selectedMonth && !planningMonths.some(m => m.year === selectedMonth.year && m.monthIndex === selectedMonth.monthIndex)) {
      setSelectedMonth(planningMonths[0]);
    }
  }, [planningMonths, selectedMonth]);

  const [selectedResId, setSelectedResId] = useState<string>('');
  const [selectedDutyDetail, setSelectedDutyDetail] = useState<{
    date: string;
    type: string;
    notes?: string;
  } | null>(null);
  const [calendarView, setCalendarView] = useState<'individual' | 'global'>('individual');

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthName = FULL_MONTHS[currentMonthIndex];
  const hours = now.getHours();

  useEffect(() => {
    initRotationStore();
    initDutyStore();
    loadUnits();
  }, [initRotationStore, initDutyStore, loadUnits]);

  useEffect(() => {
    if (role === 'admin') {
      setCalendarView('global');
    }
  }, [role]);

  // Resolve user welcome name
  const welcomeName = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  // Filter out placeholder residents, graduated residents and any resident named "Futuro"
  const realResidents = residents.filter(
    r => !r.id.startsWith('temp-') && 
         !r.firstName.toLowerCase().includes('futuro') && 
         !r.lastName?.toLowerCase().includes('futuro') &&
         r.year !== 'Graduado'
  );

  // Sort residents by R-level descending (R5 down to R1)
  const sortedResidents = [...realResidents].sort((a, b) => {
    const levelA = parseInt(a.year.replace('R', ''), 10) || 0;
    const levelB = parseInt(b.year.replace('R', ''), 10) || 0;
    return levelB - levelA;
  });

  // Resolve current resident by email (case-insensitive)
  const currentRes = residents.find(
    r => r.email.toLowerCase() === user?.email?.toLowerCase()
  );

  // Set default selected resident ID once loaded
  useEffect(() => {
    if (currentRes) {
      setSelectedResId(currentRes.id);
    } else if (sortedResidents.length > 0 && !selectedResId) {
      setSelectedResId(sortedResidents[0].id);
    }
  }, [currentRes, sortedResidents, selectedResId]);

  // Active resident profile to display
  const activeResident = residents.find(r => r.id === selectedResId) || currentRes || sortedResidents[0];

  // Resolve greeting and banner gradient based on time of day
  let greeting = '¡Hola';
  let bannerGradient = 'from-teal-800 via-teal-900 to-indigo-955';
  let sparkleColor = 'text-emerald-400';

  if (hours >= 6 && hours < 12) {
    greeting = '¡Buenos días';
    bannerGradient = 'from-amber-600/90 via-teal-900 to-teal-950';
    sparkleColor = 'text-amber-300';
  } else if (hours >= 12 && hours < 20) {
    greeting = '¡Buenas tardes';
    bannerGradient = 'from-teal-800 via-teal-950 to-indigo-950';
    sparkleColor = 'text-emerald-300';
  } else {
    greeting = '¡Buenas noches';
    bannerGradient = 'from-teal-950 via-slate-900 to-slate-950';
    sparkleColor = 'text-indigo-300';
  }

  
  // Calculate details of calendar grid
  const calendarYear = selectedMonth.year;
  const calendarMonthIndex = selectedMonth.monthIndex;
  
  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1);
  const totalDays = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Number of empty prefix cells for starting on Monday (Lunes)
  const prefixDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  
  const cells: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
  
  // Previous month padding days
  const prevMonthTotalDays = new Date(calendarYear, calendarMonthIndex, 0).getDate();
  for (let i = prefixDays - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateStr: ''
    });
  }
  
  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    cells.push({
      day: i,
      isCurrentMonth: true,
      dateStr
    });
  }
  
  // Next month padding days to fill full grid rows
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }
  }

  // Helper to extract duty for a given cell
  const getDutyForDate = (dateStr: string) => {
    if (!dateStr || !activeResident) return null;
    
    // Check explicit duty first so we can check if it's no-saliente
    const explicit = duties.find(dt => dt.residentId === activeResident.id && dt.date === dateStr);
    if (explicit && explicit.type === 'no-saliente') {
      return null;
    }
    
    // Check Saliente: if yesterday was a Guardia
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    const prevDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    const yesterdayGuard = duties.find(
      dt => dt.residentId === activeResident.id && dt.date === prevDateStr && (dt.type === 'guardia' || dt.type === 'rucot-guardia')
    );
    
    if (yesterdayGuard) {
      return {
        type: 'saliente' as const,
        notes: `Saliente - Guardia el día anterior (${yesterdayGuard.notes || 'Sin observaciones'})`
      };
    }
    
    return explicit || null;
  };

  const getActiveResidentDutyBalance = () => {
    if (!activeResident) return 0;
    let worked = 0;
    const year = selectedMonth.year;
    const monthIndex = selectedMonth.monthIndex;
    const numDays = new Date(year, monthIndex + 1, 0).getDate();
    
    // Identify working days N (excluding weekends and dates that are holidays)
    let N = 0;
    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(year, monthIndex, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
      if (!isWeekend && !isHoliday) {
        N++;
      }
    }
    
    for (let day = 1; day <= numDays; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(year, monthIndex, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
      const isWeekendOrHoliday = isWeekend || isHoliday;
      
      const prevDateStr = (() => {
        const dObj = new Date(year, monthIndex, day);
        dObj.setDate(dObj.getDate() - 1);
        return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
      })();
      
      const yesterdayGuard = duties.find(
        d => d.residentId === activeResident.id && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
      );
      const explicitDuty = duties.find(
        d => d.residentId === activeResident.id && d.date === dateStr
      );
      
      const isSaliente = !!yesterdayGuard && (!explicitDuty || explicitDuty.type !== 'no-saliente');
      
      let cellType: string | null = null;
      if (isSaliente) {
        cellType = 'saliente';
      }
      if (explicitDuty && explicitDuty.type !== 'no-saliente') {
        cellType = explicitDuty.type;
      }
      
      const hasTarde = explicitDuty?.hasTarde === true;
      const hasTardeEspecial = explicitDuty?.hasTardeEspecial === true;
      
      let primaryWeight = 0;
      let tardeWeight = 0;
      
      if (cellType === 'guardia' || cellType === 'saliente' || cellType === 'manana' || cellType === 'curso' || cellType === 'vacaciones' || cellType === 'rucot') {
        primaryWeight = isWeekendOrHoliday ? 0 : 1;
      }
      
      if (cellType === 'tarde' || hasTarde) {
        tardeWeight = 0.5;
      } else if (cellType === 'tarde-especial' || hasTardeEspecial) {
        tardeWeight = 1.0;
      }
      
      worked += primaryWeight + tardeWeight;
    }
    
    return worked - N;
  };

  // Find active rotation and units for the selected active resident
  const activeRotation = activeResident ? rotations.find(
    r => r.residentId === activeResident.id && r.month === currentMonthIndex && r.year === currentYear
  ) : null;
  const activeUnit = activeRotation ? units.find(u => u.id === activeRotation.unitId) : null;
  const activeColor = getColor(activeUnit?.color ?? 'slate');
  const rotationName = activeRotation?.customName || (activeUnit ? activeUnit.name : 'Desconocida');

  // Filter peers
  const peerResidents = sortedResidents.filter(r => r.id !== (activeResident?.id ?? ''));

  // 1. ADMIN LANDING VIEW
  if (role === 'admin') {
    return (
      <div className="flex flex-col space-y-6 lg:space-y-4 px-4 pt-4 pb-8 lg:pb-4 lg:h-full lg:overflow-hidden">
        {/* 🌟 BANNER DE BIENVENIDA DINÁMICO */}
        <div className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-r p-3 lg:py-2 lg:px-4 text-white shadow-md transition-all duration-500 border border-white/5", bannerGradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className={clsx("w-4 h-4 animate-pulse", sparkleColor)} />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-black tracking-tight font-heading leading-tight">
                  {greeting}, {welcomeName}!
                </h2>
                <p className="text-[10px] text-teal-200/80 font-medium">
                  Panel de administración de COT Sync
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white/10 dark:bg-black/25 px-2.5 py-1 rounded-lg border border-white/10 shadow-xs shrink-0 self-start md:self-auto">
              <Calendar className="w-3.5 h-3.5 text-teal-200" />
              <span className="text-[10px] font-bold font-mono tracking-wide uppercase">
                {now.getDate()} {currentMonthName} {currentYear}
              </span>
            </div>
          </div>
        </div>

        {/* 📅 SECTION: MONTHLY CALENDAR GRID & RESIDENT LOCATIONS (Split on desktop) */}
        <div className="flex flex-col space-y-6 lg:flex-row lg:space-y-0 lg:gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          
          {/* Left Side: Calendar Grid */}
          <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col overflow-hidden lg:flex-1 lg:min-h-0">
            {/* Calendar Header with Month Selector */}
            <div className="px-6 py-4 lg:px-4 lg:py-2.5 border-b border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-2 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-heading truncate">
                      {calendarView === 'individual' ? 'Mi Calendario' : 'Guardias del Mes'}
                    </h3>
                    <div className="flex items-center gap-1 bg-slate-150 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[9px] font-black shrink-0">
                      <button
                        type="button"
                        onClick={() => setCalendarView('individual')}
                        className={clsx(
                          "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                          calendarView === 'individual'
                            ? "bg-teal-600 text-white shadow-2xs"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarView('global')}
                        className={clsx(
                          "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                          calendarView === 'global'
                            ? "bg-teal-600 text-white shadow-2xs"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        Global
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] lg:text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {calendarView === 'individual' 
                      ? 'Turnos y guardias del residente seleccionado.' 
                      : 'Personal asignado a guardia o R+G hoy.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                {/* Resident Profile Selector for Admin */}
                {calendarView === 'individual' && sortedResidents.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-150 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-250 dark:border-slate-700 shadow-2xs">
                    <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <select
                      value={selectedResId}
                      onChange={(e) => setSelectedResId(e.target.value)}
                      className="bg-transparent text-slate-700 dark:text-slate-300 font-extrabold text-[11px] outline-none border-none cursor-pointer focus:ring-0 p-0 pr-6 min-w-[120px]"
                    >
                      {sortedResidents.map(res => (
                        <option key={res.id} value={res.id} className="text-slate-800 bg-white">
                          [{res.year}] {res.firstName} {res.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Planning Months Selector Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-x-auto max-w-full">
                  {planningMonths.map((m, idx) => {
                    const isActive = selectedMonth.year === m.year && selectedMonth.monthIndex === m.monthIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedMonth(m)}
                        className={clsx(
                          "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                          isActive
                            ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-2xs"
                            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-white"
                        )}
                      >
                        {m.label.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="p-2 sm:p-4 md:p-6 lg:p-3 w-full lg:flex-1 lg:flex lg:flex-col lg:justify-between lg:min-h-0">
              <div className="w-full flex flex-col lg:flex-1 lg:min-h-0">
                {/* Weekdays Names */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 lg:mb-1">
                  {DAYS_OF_WEEK_LONG.map((d, index) => (
                    <div 
                      key={d} 
                      className={clsx(
                        "text-center py-1 sm:py-2 lg:py-0.5 text-xs sm:text-sm lg:text-xs font-black uppercase tracking-wider",
                        index >= 5 ? "text-red-500" : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      <span className="hidden sm:inline">{d}</span>
                      <span className="sm:hidden">{DAYS_OF_WEEK_SHORT[index]}</span>
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-1.5 lg:flex-1">
                  {cells.map((cell, idx) => {
                    const isToday = cell.isCurrentMonth && 
                      now.getDate() === cell.day && 
                      now.getMonth() === calendarMonthIndex && 
                      now.getFullYear() === calendarYear;
                      
                    const cellDayOfWeek = (idx % 7);
                    const isWeekend = cellDayOfWeek === 5 || cellDayOfWeek === 6;
                    const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === cell.dateStr);
                    const isRedDay = isWeekend || isHoliday;
                    const duty = cell.isCurrentMonth ? getDutyForDate(cell.dateStr) : null;

                    const hasTarde = duty && 'hasTarde' in duty ? (duty as any).hasTarde === true : false;
                    const hasTardeEspecial = duty && 'hasTardeEspecial' in duty ? (duty as any).hasTardeEspecial === true : false;
                    
                    const isSplit = (hasTarde || hasTardeEspecial) && duty && duty.type !== 'tarde' && duty.type !== 'tarde-especial' && duty.type !== 'no-saliente';
                    const isTardeOnly = duty && (
                      duty.type === 'tarde' || 
                      duty.type === 'tarde-especial' || 
                      ((hasTarde || hasTardeEspecial) && (!duty.type || duty.type === 'no-saliente'))
                    );
                    const isTardeEspecialOnlyOrSplit = duty && (duty.type === 'tarde-especial' || hasTardeEspecial);

                    const guardsToday = cell.isCurrentMonth
                      ? duties.filter(
                          d => d.date === cell.dateStr && 
                               (d.type === 'guardia' || d.type === 'rucot-guardia') && 
                               d.residentId !== 'mandatory-guard' && 
                               d.residentId !== 'mandatory-rucot' && 
                               d.residentId !== 'holiday'
                        )
                      : [];

                    const getPrimaryStyle = (type: string) => {
                      switch (type) {
                        case 'guardia': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', label: 'G', labelLong: 'UARDIA' };
                        case 'saliente': return { bg: 'bg-teal-800', text: 'text-white', border: 'border-teal-900', label: 'S', labelLong: 'ALIENTE' };
                        case 'libre': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-750', label: 'L', labelLong: 'IBRE' };
                        case 'manana': return { bg: 'bg-yellow-400', text: 'text-slate-900', border: 'border-yellow-500', label: 'M', labelLong: 'AÑANA' };
                        case 'vacaciones': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-750', label: 'V', labelLong: 'ACACIONES' };
                        case 'vacaciones-pendiente': return { bg: 'bg-teal-500/[0.15] dark:bg-teal-500/[0.25]', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-400/50 dark:border-teal-500/50 border-dashed', label: 'V?', labelLong: 'VAC. PENDIENTE' };
                        case 'curso': return { bg: 'bg-purple-400', text: 'text-white', border: 'border-purple-500', label: 'C', labelLong: 'URSO' };
                        case 'rucot': return { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', label: 'R', labelLong: 'UCOT' };
                        case 'tarde': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'T', labelLong: 'ARDE' };
                        case 'tarde-especial': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'TE', labelLong: 'ARDE ESP.' };
                        default: return { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600', label: '?', labelLong: '' };
                      }
                    };

                    return (
                      <div
                        key={idx}
                        onClick={calendarView === 'individual' && cell.isCurrentMonth && duty ? () => {
                          setSelectedDutyDetail({
                            date: cell.dateStr,
                            type: duty.type,
                            notes: duty.notes
                          });
                        } : undefined}
                        className={clsx(
                          "rounded-lg sm:rounded-xl p-1 sm:p-1.5 lg:p-1 min-h-[5rem] sm:min-h-[6rem] lg:min-h-[3.25rem] lg:h-[3.25rem] flex flex-col justify-between border transition-all duration-200 relative group",
                          cell.isCurrentMonth
                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            : "bg-slate-50/40 dark:bg-slate-950/10 border-slate-100 dark:border-slate-900/40 opacity-40 select-none",
                          isRedDay && cell.isCurrentMonth && "bg-red-50/10 dark:bg-red-950/5",
                          isToday && "ring-2 ring-teal-500 dark:ring-teal-400 border-transparent bg-teal-500/5 dark:bg-teal-950/10 shadow-sm",
                          calendarView === 'individual' && cell.isCurrentMonth && duty && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 hover:shadow-xs"
                        )}
                      >
                        {/* Day Number */}
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1">
                            <span 
                              className={clsx(
                                "text-xs sm:text-sm lg:text-xs font-black",
                                isToday 
                                  ? "w-6 h-6 sm:w-7 sm:h-7 lg:w-5 lg:h-5 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs" 
                                  : cell.isCurrentMonth 
                                    ? isRedDay 
                                      ? "text-red-500" 
                                      : "text-slate-800 dark:text-slate-200" 
                                    : "text-slate-400 dark:text-slate-655"
                              )}
                            >
                              {cell.day}
                            </span>
                            {cell.isCurrentMonth && duty?.notes && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" title="Tiene observaciones" />
                            )}
                          </div>
                          {isToday && (
                            <span className="text-[8px] uppercase tracking-wider font-extrabold text-teal-600 dark:text-teal-400 animate-pulse hidden sm:inline lg:hidden">Hoy</span>
                          )}
                        </div>

                        {/* Duty Badge / Label or Global Guards List */}
                        {cell.isCurrentMonth && (
                          calendarView === 'global' ? (
                            guardsToday.length > 0 ? (
                              <div className="flex flex-col gap-0.5 mt-1 overflow-hidden w-full flex-1 justify-center">
                                {guardsToday.map(g => {
                                  const res = residents.find(r => r.id === g.residentId);
                                  if (!res) return null;
                                  const shortName = `${res.firstName[0]}. ${res.lastName}`;
                                  return (
                                    <div 
                                      key={g.id} 
                                      title={`${res.firstName} ${res.lastName} - ${g.type === 'rucot-guardia' ? 'RUCOT + Guardia' : 'Guardia'}`}
                                      className="text-[9px] sm:text-[10px] lg:text-[7.5px] font-black leading-none py-0.5 px-1 bg-rose-50/80 dark:bg-rose-955/20 text-rose-600 dark:text-rose-455 rounded-sm truncate w-full text-center border border-rose-100 dark:border-rose-900/30 flex items-center justify-center gap-0.5"
                                    >
                                      {g.type === 'rucot-guardia' && (
                                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-600 shrink-0" title="RUCOT en la mañana" />
                                      )}
                                      <span className="truncate">{shortName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null
                          ) : duty ? (() => {
                            const overrides = getLabelOverrides(duty.notes);

                            if (duty.type === 'rucot-guardia') {
                              const primaryLabel = overrides[0] || 'R';
                              const secondaryLabel = overrides[1] || 'G';
                              
                              return (
                                <div 
                                  className="mt-1 w-full flex-1 lg:h-5 rounded-md sm:rounded-lg shadow-3xs relative overflow-hidden border border-slate-200 dark:border-slate-800 transition-transform group-hover:scale-[1.02] duration-200"
                                >
                                  <div 
                                    className={clsx(
                                      "absolute inset-0 flex items-start justify-start p-1 sm:p-1.5 lg:p-0.5 font-black leading-none text-[10px] sm:text-xs lg:text-[10px] bg-blue-600 text-white"
                                    )}
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                                  >
                                    <span>{primaryLabel}</span>
                                  </div>
                                  <div 
                                    className={clsx(
                                      "absolute inset-0 flex items-end justify-end p-1 sm:p-1.5 lg:p-0.5 bg-red-500 text-white font-black leading-none text-[10px] sm:text-xs lg:text-[10px]"
                                    )}
                                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                  >
                                    <span>{secondaryLabel}</span>
                                  </div>
                                  {duty.notes && (
                                    <span className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full z-10 lg:hidden" />
                                  )}
                                </div>
                              );
                            }

                            if (isSplit) {
                              const primaryLabel = overrides[0] || getPrimaryStyle(duty.type).label;
                              const secondaryLabel = overrides[1] || (hasTardeEspecial ? 'TE' : 'T');
                              
                              return (
                                <div 
                                  className="mt-1 w-full flex-1 lg:h-5 rounded-md sm:rounded-lg shadow-3xs relative overflow-hidden border border-slate-200 dark:border-slate-800 transition-transform group-hover:scale-[1.02] duration-200"
                                >
                                  <div 
                                    className={clsx(
                                      "absolute inset-0 flex items-start justify-start p-1 sm:p-1.5 lg:p-0.5 font-black leading-none",
                                      primaryLabel.length > 2 ? "text-[8px] sm:text-[9px] lg:text-[7px]" : "text-[10px] sm:text-xs lg:text-[10px]",
                                      getPrimaryStyle(duty.type).bg,
                                      getPrimaryStyle(duty.type).text
                                    )}
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                                  >
                                    <span>{primaryLabel}</span>
                                  </div>
                                  <div 
                                    className={clsx(
                                      "absolute inset-0 flex items-end justify-end p-1 sm:p-1.5 lg:p-0.5 bg-orange-500 text-white font-black leading-none",
                                      secondaryLabel.length > 2 ? "text-[8px] sm:text-[9px] lg:text-[7px]" : "text-[10px] sm:text-xs lg:text-[10px]"
                                    )}
                                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                  >
                                    <span>{secondaryLabel}</span>
                                  </div>
                                  {duty.notes && (
                                    <span className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full z-10 lg:hidden" />
                                  )}
                                </div>
                              );
                            } else if (isTardeOnly) {
                              const overrideLabel = overrides[0];
                              return (
                                <div className="mt-1 w-full flex-1 lg:h-5 lg:py-0 text-center rounded-md sm:rounded-lg shadow-3xs flex flex-col justify-center items-center border border-orange-650 bg-orange-500 text-white text-xs sm:text-sm lg:text-xs font-black tracking-wider transition-transform group-hover:scale-[1.02] duration-200">
                                  <span className="leading-none flex items-center">
                                    {overrideLabel ? (
                                      <span>{overrideLabel}</span>
                                    ) : (
                                      <>
                                        <span>{isTardeEspecialOnlyOrSplit ? 'TE' : 'T'}</span>
                                        <span className="hidden sm:inline lg:hidden">{isTardeEspecialOnlyOrSplit ? 'ARDE E.' : 'ARDE'}</span>
                                      </>
                                    )}
                                  </span>
                                  {duty.notes && (
                                    <span className="hidden md:inline lg:hidden text-[7px] sm:text-[8px] font-bold opacity-90 px-1 truncate max-w-full font-mono mt-0.5" title={duty.notes}>
                                      {duty.notes}
                                    </span>
                                  )}
                                </div>
                              );
                            } else {
                              const overrideLabel = overrides[0];
                              const style = getPrimaryStyle(duty.type);
                              return (
                                <div className={clsx(
                                  "mt-1 w-full flex-1 lg:h-5 lg:py-0 text-center rounded-md sm:rounded-lg shadow-3xs flex flex-col justify-center items-center border text-xs sm:text-sm lg:text-xs font-black tracking-wider transition-transform group-hover:scale-[1.02] duration-200",
                                  style.bg + " " + style.text + " " + style.border
                                )}>
                                  <span className="leading-none flex items-center">
                                    {overrideLabel ? (
                                      <span>{overrideLabel}</span>
                                    ) : (
                                      <>
                                        <span>{style.label}</span>
                                        <span className="hidden sm:inline lg:hidden">{style.labelLong}</span>
                                      </>
                                    )}
                                  </span>
                                  {duty.notes && (
                                    <span className="hidden md:inline lg:hidden text-[7px] sm:text-[8px] font-bold opacity-90 px-1 truncate max-w-full font-mono mt-0.5" title={duty.notes}>
                                      {duty.notes}
                                    </span>
                                  )}
                                </div>
                              );
                            }
                          })() : null
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 lg:px-4 lg:py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 lg:gap-3 lg:gap-y-1.5 shrink-0">
              <div className="flex flex-wrap items-center gap-5">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Leyenda turnos:</span>
                
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md bg-red-500 text-white flex items-center justify-center text-xs font-black border border-red-600 shadow-2xs">G</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Guardia</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md bg-teal-800 text-white flex items-center justify-center text-xs font-black border border-teal-900 shadow-2xs">S</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Saliente (Automático)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-black border border-orange-600 shadow-2xs">T</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Tarde</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side: Locations sidebar list */}
          <div className="lg:w-96 lg:shrink-0 flex flex-col space-y-4 lg:min-h-0 lg:overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2 font-heading">
                <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Ubicación de Residentes en {currentMonthName}
              </h3>
              <span className="text-[10px] font-black text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 px-3 py-1 rounded-full shadow-2xs uppercase tracking-wider">
                {realResidents.length} residentes activos
              </span>
            </div>

            {realResidents.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center text-slate-550 shadow-sm max-w-md mx-auto shrink-0 flex-1 flex flex-col justify-center items-center">
                <User className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-3 animate-pulse" />
                <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">No hay residentes registrados</p>
                <p className="text-xs text-slate-500 mt-1">Registra residentes desde la sección de Pizarra.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto lg:pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 pb-4">
                  {sortedResidents.map((resident) => {
                    const rotation = rotations.find(
                      r => r.residentId === resident.id && r.month === currentMonthIndex && r.year === currentYear
                    );
                    const unit = rotation ? units.find(u => u.id === rotation.unitId) : null;
                    const color = getColor(unit?.color ?? 'slate');
                    const displayName = rotation?.customName || (unit ? unit.name : 'Desconocida');
                    const initials = `${resident.firstName[0] || ''}${resident.lastName?.[0] || ''}`.toUpperCase();

                    return (
                      <div 
                        key={resident.id}
                        className="bg-white/85 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-800/70 rounded-xl shadow-xs hover:shadow-md hover:border-teal-500/25 dark:hover:border-teal-500/30 transition-all duration-300 p-3 flex flex-col justify-between relative overflow-hidden group backdrop-blur-md"
                      >
                        {rotation && !rotation.isVacation && (
                          <div className={clsx("absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-5 dark:opacity-10 group-hover:scale-130 transition-transform duration-500 pointer-events-none", color.bg)} />
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 flex items-center justify-center shrink-0 border border-teal-600/30 shadow-inner">
                              <span className="text-[10px] font-black text-white tracking-wider">{initials}</span>
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" title={`${resident.firstName} ${resident.lastName}`}>
                                {resident.firstName} {resident.lastName}
                              </p>
                              <p className="text-[9px] text-slate-455 dark:text-slate-500 font-medium truncate" title={resident.email}>
                                {resident.email}
                              </p>
                            </div>

                            <span className={clsx(
                              "text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-wider flex-shrink-0 uppercase border shadow-2xs font-mono",
                              resident.year === 'R1' ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/30'
                              : resident.year === 'R2' ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30'
                              : resident.year === 'R3' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30'
                              : resident.year === 'R4' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30'
                            )}>
                              {resident.year}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            {rotation ? (
                              rotation.isVacation ? (
                                <div className="flex items-center gap-2 p-2 bg-amber-500/5 dark:bg-amber-950/15 border border-amber-500/15 dark:border-amber-900/15 rounded-lg">
                                  <div className="bg-amber-100 dark:bg-amber-950/30 p-1.5 rounded-md shrink-0 shadow-2xs">
                                    <Palmtree className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                                  </div>
                                  <div>
                                    <p className="text-[7.5px] font-black text-amber-500/60 uppercase tracking-widest leading-none">Ubicación</p>
                                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 mt-0.5">Vacaciones</p>
                                  </div>
                                </div>
                              ) : (
                                <div className={clsx("flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-300", color.bg, color.border)}>
                                  <div className="bg-white/80 dark:bg-black/30 p-1.5 rounded-md shrink-0 shadow-3xs flex items-center justify-center">
                                    {unit?.type === 'externa' ? (
                                      <Compass className="w-3.5 h-3.5 text-slate-650 dark:text-slate-400" />
                                    ) : (
                                      <Building className="w-3.5 h-3.5 text-slate-650 dark:text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[7.5px] font-black opacity-60 uppercase tracking-widest leading-none">Ubicación</p>
                                    <p className="text-[10px] font-black truncate mt-0.5" title={displayName}>{displayName}</p>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/50 rounded-lg">
                                <div className="bg-slate-200/60 dark:bg-slate-800/60 p-1.5 rounded-md shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-slate-450" />
                                </div>
                                <div>
                                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">Ubicación</p>
                                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 italic mt-0.5">Libre / Sin planificar</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 lg:space-y-4 px-4 pt-4 pb-8 lg:pb-4 lg:h-full lg:overflow-hidden">
      {/* 🌟 BANNER DE BIENVENIDA DINÁMICO */}
      <div className={clsx("relative overflow-hidden rounded-xl bg-gradient-to-r p-3 lg:py-2 lg:px-4 text-white shadow-md transition-all duration-500 border border-white/5", bannerGradient)}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Sparkles className={clsx("w-4 h-4 animate-pulse", sparkleColor)} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black tracking-tight font-heading leading-tight">
                {greeting}, {activeResident ? activeResident.firstName : welcomeName}!
              </h2>
              <p className="text-[10px] text-teal-200/80 font-medium">
                Tu espacio personal en COT Sync
              </p>
            </div>
          </div>

          {/* FALLBACK PROFILE SELECTOR (If logged in via general credentials or to toggle view) */}
          {realResidents.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 bg-white/10 dark:bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
              <label className="text-[9px] uppercase font-black text-teal-255 tracking-wider">Ver Perfil:</label>
              <select
                value={selectedResId}
                onChange={(e) => setSelectedResId(e.target.value)}
                className="bg-transparent text-white font-extrabold text-[11px] outline-none border-none cursor-pointer focus:ring-0 p-0 pr-6 min-w-[120px]"
              >
                {sortedResidents.map(res => (
                  <option key={res.id} value={res.id} className="text-slate-800 bg-white">
                    [{res.year}] {res.firstName} {res.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 📅 SECTION: MONTHLY CALENDAR GRID & SIDEBAR (Split on desktop) */}
      <div className="flex flex-col space-y-6 lg:flex-row lg:space-y-0 lg:gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        
        {/* Left Side: Calendar Grid */}
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col overflow-hidden lg:flex-1 lg:min-h-0">
          {/* Calendar Header with Month Selector */}
          <div className="px-6 py-4 lg:px-4 lg:py-2.5 border-b border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-2 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-heading truncate">
                    {calendarView === 'individual' ? 'Mi Calendario' : 'Guardias del Mes'}
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-150 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[9px] font-black shrink-0">
                    <button
                      type="button"
                      onClick={() => setCalendarView('individual')}
                      className={clsx(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        calendarView === 'individual'
                          ? "bg-teal-600 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                      )}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView('global')}
                      className={clsx(
                        "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                        calendarView === 'global'
                          ? "bg-teal-600 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                      )}
                    >
                      Global
                    </button>
                  </div>
                </div>
                <p className="text-[10px] lg:text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {calendarView === 'individual' 
                    ? 'Tus turnos y guardias programados.' 
                    : 'Personal asignado a guardia o R+G hoy.'}
                </p>
              </div>
            </div>

            {/* Planning Months Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-x-auto max-w-full shrink-0">
              {planningMonths.map((m, idx) => {
                const isActive = selectedMonth.year === m.year && selectedMonth.monthIndex === m.monthIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedMonth(m)}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-white"
                    )}
                  >
                    {m.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div className="p-2 sm:p-4 md:p-6 lg:p-3 w-full lg:flex-1 lg:flex lg:flex-col lg:justify-between lg:min-h-0">
            <div className="w-full flex flex-col lg:flex-1 lg:min-h-0">
              {/* Weekdays Names */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 lg:mb-1">
                {DAYS_OF_WEEK_LONG.map((d, index) => (
                  <div 
                    key={d} 
                    className={clsx(
                      "text-center py-1 sm:py-2 lg:py-0.5 text-xs sm:text-sm lg:text-xs font-black uppercase tracking-wider",
                      index >= 5 ? "text-red-500" : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{DAYS_OF_WEEK_SHORT[index]}</span>
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-1.5 lg:flex-1">
                {cells.map((cell, idx) => {
                  const isToday = cell.isCurrentMonth && 
                    now.getDate() === cell.day && 
                    now.getMonth() === calendarMonthIndex && 
                    now.getFullYear() === calendarYear;
                    
                  const cellDayOfWeek = (idx % 7);
                  const isWeekend = cellDayOfWeek === 5 || cellDayOfWeek === 6; // Sábado o Domingo
                  const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === cell.dateStr);
                  const isRedDay = isWeekend || isHoliday;
                  const duty = cell.isCurrentMonth ? getDutyForDate(cell.dateStr) : null;

                  const hasTarde = duty && 'hasTarde' in duty ? (duty as any).hasTarde === true : false;
                  const hasTardeEspecial = duty && 'hasTardeEspecial' in duty ? (duty as any).hasTardeEspecial === true : false;
                  
                  const isSplit = (hasTarde || hasTardeEspecial) && duty && duty.type !== 'tarde' && duty.type !== 'tarde-especial' && duty.type !== 'no-saliente';
                  const isTardeOnly = duty && (
                    duty.type === 'tarde' || 
                    duty.type === 'tarde-especial' || 
                    ((hasTarde || hasTardeEspecial) && (!duty.type || duty.type === 'no-saliente'))
                  );
                  const isTardeEspecialOnlyOrSplit = duty && (duty.type === 'tarde-especial' || hasTardeEspecial);

                  const guardsToday = cell.isCurrentMonth
                    ? duties.filter(
                        d => d.date === cell.dateStr && 
                             (d.type === 'guardia' || d.type === 'rucot-guardia') && 
                             d.residentId !== 'mandatory-guard' && 
                             d.residentId !== 'mandatory-rucot' && 
                             d.residentId !== 'holiday'
                      )
                    : [];

                  const getPrimaryStyle = (type: string) => {
                    switch (type) {
                      case 'guardia': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', label: 'G', labelLong: 'UARDIA' };
                      case 'saliente': return { bg: 'bg-teal-800', text: 'text-white', border: 'border-teal-900', label: 'S', labelLong: 'ALIENTE' };
                      case 'libre': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-750', label: 'L', labelLong: 'IBRE' };
                      case 'manana': return { bg: 'bg-yellow-400', text: 'text-slate-900', border: 'border-yellow-500', label: 'M', labelLong: 'AÑANA' };
                      case 'vacaciones': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-750', label: 'V', labelLong: 'ACACIONES' };
                      case 'vacaciones-pendiente': return { bg: 'bg-teal-500/[0.15] dark:bg-teal-500/[0.25]', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-400/50 dark:border-teal-500/50 border-dashed', label: 'V?', labelLong: 'VAC. PENDIENTE' };
                      case 'curso': return { bg: 'bg-purple-400', text: 'text-white', border: 'border-purple-500', label: 'C', labelLong: 'URSO' };
                      case 'rucot': return { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', label: 'R', labelLong: 'UCOT' };
                      case 'tarde': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'T', labelLong: 'ARDE' };
                      case 'tarde-especial': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'TE', labelLong: 'ARDE ESP.' };
                      default: return { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600', label: '?', labelLong: '' };
                    }
                  };

                  return (
                    <div
                      key={idx}
                      onClick={calendarView === 'individual' && cell.isCurrentMonth && duty ? () => {
                        setSelectedDutyDetail({
                          date: cell.dateStr,
                          type: duty.type,
                          notes: duty.notes
                        });
                      } : undefined}
                      className={clsx(
                        "rounded-lg sm:rounded-xl p-1 sm:p-1.5 lg:p-1 min-h-[5rem] sm:min-h-[6rem] lg:min-h-[3.25rem] lg:h-[3.25rem] flex flex-col justify-between border transition-all duration-200 relative group",
                        cell.isCurrentMonth
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          : "bg-slate-50/40 dark:bg-slate-950/10 border-slate-100 dark:border-slate-900/40 opacity-40 select-none",
                        isRedDay && cell.isCurrentMonth && "bg-red-50/10 dark:bg-red-950/5",
                        isToday && "ring-2 ring-teal-500 dark:ring-teal-400 border-transparent bg-teal-500/5 dark:bg-teal-950/10 shadow-sm",
                        calendarView === 'individual' && cell.isCurrentMonth && duty && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 hover:shadow-xs"
                      )}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          <span 
                            className={clsx(
                              "text-xs sm:text-sm lg:text-xs font-black",
                              isToday 
                                ? "w-6 h-6 sm:w-7 sm:h-7 lg:w-5 lg:h-5 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs" 
                                : cell.isCurrentMonth 
                                  ? isRedDay 
                                    ? "text-red-500" 
                                    : "text-slate-800 dark:text-slate-200" 
                                  : "text-slate-400 dark:text-slate-650"
                            )}
                          >
                            {cell.day}
                          </span>
                          {cell.isCurrentMonth && duty?.notes && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" title="Tiene observaciones" />
                          )}
                        </div>
                        {isToday && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-teal-600 dark:text-teal-400 animate-pulse hidden sm:inline lg:hidden">Hoy</span>
                        )}
                      </div>
                      
                      {/* Duty Badge / Label or Global Guards List */}
                      {cell.isCurrentMonth && (
                        calendarView === 'global' ? (
                          guardsToday.length > 0 ? (
                            <div className="flex flex-col gap-0.5 mt-1 overflow-hidden w-full flex-1 justify-center">
                              {guardsToday.map(g => {
                                const res = residents.find(r => r.id === g.residentId);
                                if (!res) return null;
                                const shortName = `${res.firstName[0]}. ${res.lastName}`;
                                return (
                                  <div 
                                    key={g.id} 
                                    title={`${res.firstName} ${res.lastName} - ${g.type === 'rucot-guardia' ? 'RUCOT + Guardia' : 'Guardia'}`}
                                    className="text-[9px] sm:text-[10px] lg:text-[7.5px] font-black leading-none py-0.5 px-1 bg-rose-50/80 dark:bg-rose-955/20 text-rose-600 dark:text-rose-455 rounded-sm truncate w-full text-center border border-rose-100 dark:border-rose-900/30 flex items-center justify-center gap-0.5"
                                  >
                                    {g.type === 'rucot-guardia' && (
                                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-600 shrink-0" title="RUCOT en la mañana" />
                                    )}
                                    <span className="truncate">{shortName}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null
                        ) : duty ? (() => {
                          const overrides = getLabelOverrides(duty.notes);

                          if (duty.type === 'rucot-guardia') {
                            const primaryLabel = overrides[0] || 'R';
                            const secondaryLabel = overrides[1] || 'G';
                            
                            return (
                              <div 
                                className="mt-1 w-full flex-1 lg:h-5 rounded-md sm:rounded-lg shadow-3xs relative overflow-hidden border border-slate-200 dark:border-slate-800 transition-transform group-hover:scale-[1.02] duration-200"
                              >
                                <div 
                                  className={clsx(
                                    "absolute inset-0 flex items-start justify-start p-1 sm:p-1.5 lg:p-0.5 font-black leading-none text-[10px] sm:text-xs lg:text-[10px] bg-blue-600 text-white"
                                  )}
                                  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                                >
                                  <span>{primaryLabel}</span>
                                </div>
                                <div 
                                  className={clsx(
                                    "absolute inset-0 flex items-end justify-end p-1 sm:p-1.5 lg:p-0.5 bg-red-500 text-white font-black leading-none text-[10px] sm:text-xs lg:text-[10px]"
                                  )}
                                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                >
                                  <span>{secondaryLabel}</span>
                                </div>
                                {duty.notes && (
                                  <span className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full z-10 lg:hidden" />
                                )}
                              </div>
                            );
                          }

                          if (isSplit) {
                            const primaryLabel = overrides[0] || getPrimaryStyle(duty.type).label;
                            const secondaryLabel = overrides[1] || (hasTardeEspecial ? 'TE' : 'T');
                            
                            return (
                              <div 
                                className="mt-1 w-full flex-1 lg:h-5 rounded-md sm:rounded-lg shadow-3xs relative overflow-hidden border border-slate-200 dark:border-slate-800 transition-transform group-hover:scale-[1.02] duration-200"
                              >
                                <div 
                                  className={clsx(
                                    "absolute inset-0 flex items-start justify-start p-1 sm:p-1.5 lg:p-0.5 font-black leading-none",
                                    primaryLabel.length > 2 ? "text-[8px] sm:text-[9px] lg:text-[7px]" : "text-[10px] sm:text-xs lg:text-[10px]",
                                    getPrimaryStyle(duty.type).bg,
                                    getPrimaryStyle(duty.type).text
                                  )}
                                  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                                >
                                  <span>{primaryLabel}</span>
                                </div>
                                <div 
                                  className={clsx(
                                    "absolute inset-0 flex items-end justify-end p-1 sm:p-1.5 lg:p-0.5 bg-orange-500 text-white font-black leading-none",
                                    secondaryLabel.length > 2 ? "text-[8px] sm:text-[9px] lg:text-[7px]" : "text-[10px] sm:text-xs lg:text-[10px]"
                                  )}
                                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                >
                                  <span>{secondaryLabel}</span>
                                </div>
                                {duty.notes && (
                                  <span className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full z-10 lg:hidden" />
                                )}
                              </div>
                            );
                          } else if (isTardeOnly) {
                            const overrideLabel = overrides[0];
                            return (
                              <div className="mt-1 w-full flex-1 lg:h-5 lg:py-0 text-center rounded-md sm:rounded-lg shadow-3xs flex flex-col justify-center items-center border border-orange-600 bg-orange-500 text-white text-xs sm:text-sm lg:text-xs font-black tracking-wider transition-transform group-hover:scale-[1.02] duration-200">
                                <span className="leading-none flex items-center">
                                  {overrideLabel ? (
                                    <span>{overrideLabel}</span>
                                  ) : (
                                    <>
                                      <span>{isTardeEspecialOnlyOrSplit ? 'TE' : 'T'}</span>
                                      <span className="hidden sm:inline lg:hidden">{isTardeEspecialOnlyOrSplit ? 'ARDE E.' : 'ARDE'}</span>
                                    </>
                                  )}
                                </span>
                                {duty.notes && (
                                  <span className="hidden md:inline lg:hidden text-[7px] sm:text-[8px] font-bold opacity-90 px-1 truncate max-w-full font-mono mt-0.5" title={duty.notes}>
                                    {duty.notes}
                                  </span>
                                )}
                              </div>
                            );
                          } else {
                            const overrideLabel = overrides[0];
                            const style = getPrimaryStyle(duty.type);
                            return (
                              <div className={clsx(
                                "mt-1 w-full flex-1 lg:h-5 lg:py-0 text-center rounded-md sm:rounded-lg shadow-3xs flex flex-col justify-center items-center border text-xs sm:text-sm lg:text-xs font-black tracking-wider transition-transform group-hover:scale-[1.02] duration-200",
                                style.bg + " " + style.text + " " + style.border
                              )}>
                                <span className="leading-none flex items-center">
                                  {overrideLabel ? (
                                    <span>{overrideLabel}</span>
                                  ) : (
                                    <>
                                      <span>{style.label}</span>
                                      <span className="hidden sm:inline lg:hidden">{style.labelLong}</span>
                                    </>
                                  )}
                                </span>
                                {duty.notes && (
                                  <span className="hidden md:inline lg:hidden text-[7px] sm:text-[8px] font-bold opacity-90 px-1 truncate max-w-full font-mono mt-0.5" title={duty.notes}>
                                    {duty.notes}
                                  </span>
                                )}
                              </div>
                            );
                          }
                        })() : null
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-4 lg:px-4 lg:py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 lg:gap-3 lg:gap-y-1.5 shrink-0">
            <div className="flex flex-wrap items-center gap-5">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Leyenda turnos:</span>
              
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-red-500 text-white flex items-center justify-center text-xs font-black border border-red-600 shadow-2xs">G</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Guardia</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-teal-800 text-white flex items-center justify-center text-xs font-black border border-teal-900 shadow-2xs">S</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Saliente (Automático)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-black border border-orange-600 shadow-2xs">T</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Tarde</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-black border border-teal-750 shadow-2xs">L</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Libre</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-yellow-400 text-slate-900 flex items-center justify-center text-xs font-black border border-yellow-500 shadow-2xs">M</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Mañana</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-black border border-teal-750 shadow-2xs">V</span>
                <span className="text-xs text-slate-600 dark:text-slate-450 font-semibold">Vacaciones</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-black border border-teal-400/50 dark:border-teal-500/50 border-dashed shadow-2xs">V?</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Vacación Pendiente</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-purple-400 text-white flex items-center justify-center text-xs font-black border border-purple-500 shadow-2xs">C</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Curso</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-black border border-blue-700 shadow-2xs">R</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">RUCOT</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="absolute inset-0 flex items-start justify-start p-0.5 text-[8px] font-black leading-none bg-blue-600 text-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>R</div>
                  <div className="absolute inset-0 flex items-end justify-end p-0.5 text-[8px] font-black leading-none bg-red-500 text-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>G</div>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">RUCOT + Guardia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar */}
        <div className="flex flex-col space-y-6 lg:w-[380px] lg:space-y-4 lg:min-h-0 lg:overflow-hidden shrink-0">
          {/* Tu Rotación (Spotlight Card) */}
          <div className="flex flex-col space-y-4 shrink-0">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2 font-heading">
              <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Mi Rotación este Mes
            </h3>

            {activeResident ? (
              <div className="bg-white/80 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 lg:p-4 shadow-sm flex flex-col lg:flex-none justify-between relative overflow-hidden group backdrop-blur-md">
                {/* Decorative Background Accent */}
                {activeRotation && !activeRotation.isVacation && (
                  <div className={clsx("absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-10 dark:opacity-15 group-hover:scale-120 transition-transform duration-500 pointer-events-none", activeColor.bg)} />
                )}

                <div className="space-y-4 relative z-10">
                  {/* Header: User avatar and Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 flex items-center justify-center border border-teal-600/30 shadow-sm shrink-0">
                      <span className="text-sm font-black text-white uppercase">
                        {activeResident.firstName[0]}{activeResident.lastName?.[0] || ''}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 font-heading leading-tight">
                          {activeResident.firstName} {activeResident.lastName}
                        </h4>
                        {(() => {
                          const bal = getActiveResidentDutyBalance();
                          if (bal === 0) return null;
                          const isPositive = bal > 0;
                          const formatted = isPositive ? `+${bal}` : `${bal}`;
                          return (
                            <span className={clsx(
                              "text-[9px] font-black font-mono px-1 rounded-sm border",
                              isPositive 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40" 
                                : "bg-red-50 text-red-600 border-red-250 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40"
                            )}>
                              {formatted}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 font-bold tracking-wider uppercase mt-0.5">
                        Residente de Traumatología [{activeResident.year}]
                      </p>
                    </div>
                  </div>

                  {/* Location / Rotation Spotlight */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    {activeRotation ? (
                      activeRotation.isVacation ? (
                        <div className="bg-amber-500/5 dark:bg-amber-950/15 border border-amber-500/20 dark:border-amber-900/20 rounded-xl p-4 flex items-center gap-4">
                          <div className="bg-amber-100 dark:bg-amber-950/30 p-2.5 rounded-lg shrink-0 shadow-2xs text-amber-600 dark:text-amber-500">
                            <Palmtree className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest leading-none">Tu ubicación en {currentMonthName}</p>
                            <h5 className="text-base font-black text-amber-700 dark:text-amber-500 mt-1 leading-none">Vacaciones</h5>
                          </div>
                        </div>
                      ) : (
                        <div className={clsx("border rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-300", activeColor.bg, activeColor.border)}>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="bg-white/80 dark:bg-black/35 p-2.5 rounded-lg shrink-0 shadow-3xs text-slate-600 dark:text-slate-400">
                              {activeUnit?.type === 'externa' ? (
                                <Compass className="w-6 h-6" />
                              ) : (
                                <Building className="w-6 h-6" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={clsx("text-[9px] font-black uppercase tracking-widest opacity-70", activeColor.text)}>
                                {activeUnit?.type === 'externa' ? 'Rotación Externa' : 'Rotación Interna'}
                              </p>
                              <h5 className={clsx("text-base font-black truncate mt-1", activeColor.text)} title={rotationName}>
                                {rotationName}
                              </h5>
                            </div>
                          </div>

                          {/* Confirmation Tags */}
                          {activeRotation.status === 'confirmed' && (
                            <div title="Confirmado" className="shrink-0 flex items-center justify-center bg-white/90 dark:bg-slate-900 p-1.5 rounded-full shadow-3xs border border-emerald-500/20">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                          )}
                          {activeRotation.status === 'pending' && (
                            <div title="Pendiente de confirmación" className="shrink-0 flex items-center justify-center bg-white/90 dark:bg-slate-900 p-1.5 rounded-full shadow-3xs border border-amber-500/20">
                              <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/50 rounded-xl p-4 flex items-center gap-4">
                        <div className="bg-slate-200/60 dark:bg-slate-800/60 p-2.5 rounded-lg shrink-0 text-slate-400">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Tu ubicación en {currentMonthName}</p>
                          <h5 className="text-base font-black text-slate-500 dark:text-slate-400 italic mt-1 leading-none">Libre / Sin planificar</h5>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status details card footer */}
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-6 lg:mt-3 border-t border-slate-100 dark:border-slate-850/60 pt-3 font-semibold">
                  * Si necesitas cambiar de unidad, solicita una modificación al Coordinador de Docencia (Administrador).
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                Cargando perfil...
              </div>
            )}
          </div>

          {/* Compañeros de Rotación */}
          <div className="flex flex-col space-y-4 flex-1 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2 font-heading">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Ubicación de mis Compañeros
              </h3>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {peerResidents.length} compañeros activos
              </span>
            </div>

            {peerResidents.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center text-slate-550 flex-1 flex flex-col items-center justify-center backdrop-blur-md shrink-0">
                <User className="w-10 h-10 text-slate-300 mb-2" />
                <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">No hay otros residentes activos</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto lg:pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-3">
                  {peerResidents.map(peer => {
                    const rotation = rotations.find(
                      r => r.residentId === peer.id && r.month === currentMonthIndex && r.year === currentYear
                    );
                    const unit = rotation ? units.find(u => u.id === rotation.unitId) : null;
                    const color = getColor(unit?.color ?? 'slate');
                    const displayName = rotation?.customName || (unit ? unit.name : 'Desconocida');
                    const initials = `${peer.firstName[0] || ''}${peer.lastName?.[0] || ''}`.toUpperCase();

                    return (
                      <div 
                        key={peer.id}
                        className="bg-white/85 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-800/70 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group backdrop-blur-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-slate-800/50">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{initials}</span>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {peer.firstName} {peer.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase mt-0.5">
                              Nivel [{peer.year}]
                            </p>
                          </div>

                          {/* Small badge of their rotation */}
                          {rotation ? (
                            rotation.isVacation ? (
                              <span className="text-[9px] font-black px-2 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 border border-amber-200/50 dark:border-amber-900/30 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                                <Palmtree className="w-3 h-3 shrink-0" />
                                Vacas
                              </span>
                            ) : (
                              <span className={clsx(
                                "text-[9px] font-black px-2.5 py-1 rounded-lg border max-w-[120px] truncate uppercase tracking-wider",
                                color.bg, color.border, color.text
                              )} title={displayName}>
                                {displayName}
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] font-black px-2 py-1 bg-slate-50 dark:bg-slate-950/10 text-slate-400 border border-slate-200/30 rounded-lg italic">
                              Libre
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Observaciones del Turno Modal */}
      {selectedDutyDetail && (() => {
        const badge = getDutyBadgeDetails(selectedDutyDetail.type);
        return (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Detalle del Turno
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDutyDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={clsx(
                    "px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider shadow-3xs",
                    badge.style
                  )}>
                    {badge.label}
                  </span>
                  {selectedDutyDetail.type !== 'tarde' && duties.find(d => d.residentId === activeResident?.id && d.date === selectedDutyDetail.date)?.hasTarde && (
                    <span className="px-3 py-1.5 rounded-lg border border-orange-600 bg-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-3xs">
                      Tarde
                    </span>
                  )}
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-350">
                    {formatDateFriendly(selectedDutyDetail.date)}
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Observaciones / Detalles
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 min-h-[5rem] text-sm text-slate-850 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedDutyDetail.notes || (
                      <span className="text-slate-400 dark:text-slate-500 italic">Sin observaciones o notas registradas para este día.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDutyDetail(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Home;
