import React, { useState, useEffect } from 'react';
import { useRotationStore } from '../../store/rotationStore';
import { useAuthStore } from '../../store/authStore';
import { useDutyStore } from '../../store/dutyStore';
import { useUnitStore } from '../../store/unitStore';
import { getColor } from '../../utils/constants';
import type { DutyType } from '../../types';
import { sendTelegramMessage } from '../../services/notifications';
import { 
  CalendarCheck, 
  Plus, 
  Trash2, 
  X,
  AlertTriangle,
  Check,
  Clock,
  Lock
} from 'lucide-react';
import clsx from 'clsx';

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTHS_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getPlanningMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = -1; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      label: `${MONTHS_SPANISH[d.getMonth()]} ${d.getFullYear()}`
    });
  }
  return months;
};

const getPreviousDateStr = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const prevY = date.getFullYear();
  const prevM = String(date.getMonth() + 1).padStart(2, '0');
  const prevD = String(date.getDate()).padStart(2, '0');
  return `${prevY}-${prevM}-${prevD}`;
};

const getLabelOverrides = (notes?: string): string[] => {
  if (!notes) return [];
  const matches = [...notes.matchAll(/\[(.*?)\]/g)];
  return matches.map(m => m[1].trim());
};

const DutiesPlanner: React.FC = () => {
  const { role, user } = useAuthStore();
  const { residents, rotations, initializeStore: initRotationStore } = useRotationStore();
  const { units, loadUnits } = useUnitStore();
  const { 
    duties, 
    liquidations,
    initializeStore: initDutyStore, 
    assignDuty, 
    removeDuty,
    assignDutiesBulk,
    removeDutiesBulk,
    clearDutiesForMonth,
    liquidateMonth
  } = useDutyStore();

  const planningMonths = React.useMemo(() => {
    const raw = getPlanningMonths();
    const filtered = raw.filter(m => {
      const id = `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}`;
      return !liquidations.some(l => l.id === id);
    });
    return filtered.length > 0 ? filtered : [raw[0]];
  }, [liquidations]);

  const [selectedMonth, setSelectedMonth] = useState(planningMonths[0]);
  const [activeCell, setActiveCell] = useState<{ residentId: string; date: string } | null>(null);

  // Estados Responsivos e Interfaz Móvil de Guardias
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [mobileTab, setMobileTab] = useState<'mis-turnos' | 'quien-esta'>('mis-turnos');
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Detector híbrido de dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isMobileUA = /mobi|android|iphone|ipad|ipod/.test(ua);
      const isNarrow = window.innerWidth < 768;
      setIsMobileDevice(isMobileUA || isNarrow);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Inicializar residente seleccionado en móvil según localStorage o usuario actual
  useEffect(() => {
    if (residents.length > 0 && !selectedResidentId) {
      const cached = localStorage.getItem('mobile_duties_selected_resident');
      if (cached && residents.some(r => r.id === cached)) {
        setSelectedResidentId(cached);
      } else {
        const matching = residents.find(r => r.email?.toLowerCase() === user?.email?.toLowerCase());
        setSelectedResidentId(matching ? matching.id : residents[0].id);
      }
    }
  }, [residents, user, selectedResidentId]);

  // Sincronizar selección de residente con localStorage
  const handleSelectResidentMobile = (id: string) => {
    setSelectedResidentId(id);
    localStorage.setItem('mobile_duties_selected_resident', id);
  };

  // Inicializar día seleccionado por defecto (el de hoy si el mes coincide, o el día 1)
  useEffect(() => {
    const today = new Date();
    if (selectedMonth && today.getFullYear() === selectedMonth.year && today.getMonth() === selectedMonth.monthIndex) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [selectedMonth]);

  // Keep selectedMonth updated if it gets filtered out
  useEffect(() => {
    if (selectedMonth && !planningMonths.some(m => m.year === selectedMonth.year && m.monthIndex === selectedMonth.monthIndex)) {
      setSelectedMonth(planningMonths[0]);
    }
  }, [planningMonths, selectedMonth]);
  
  // Modal Edit State
  const [editType, setEditType] = useState<DutyType | ''>('');
  const [editNotes, setEditNotes] = useState('');
  const [editHasTarde, setEditHasTarde] = useState(false);
  const [editHasTardeEspecial, setEditHasTardeEspecial] = useState(false);
  const [vacationStartDate, setVacationStartDate] = useState('');
  const [vacationEndDate, setVacationEndDate] = useState('');

  const canEdit = role === 'admin' || role === 'coordinador';

  const [showLiquidateConfirm, setShowLiquidateConfirm] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);

  const handleConfirmLiquidate = async () => {
    if (!selectedMonth || !user?.email) return;
    setIsLiquidating(true);
    try {
      const year = selectedMonth.year;
      const monthIndex = selectedMonth.monthIndex;
      const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
      const monthDuties = duties.filter(d => d.date.startsWith(prefix));
      
      const summary = realResidents.map(res => {
        const resDuties = monthDuties.filter(d => d.residentId === res.id);
        const guardsCount = resDuties.filter(d => d.type === 'guardia' || d.type === 'rucot-guardia').length;
        const afternoonsCount = resDuties.filter(d => 
          d.type === 'tarde' || d.type === 'tarde-especial' || d.hasTarde === true || d.hasTardeEspecial === true
        ).length;
        const freeDaysCount = resDuties.filter(d => d.type === 'libre').length;
        const vacationsCount = resDuties.filter(d => d.type === 'vacaciones').length;
        const rucotCount = resDuties.filter(d => d.type === 'rucot' || d.type === 'rucot-guardia').length;

        return {
          residentId: res.id,
          residentName: `${res.firstName} ${res.lastName}`,
          guardsCount,
          afternoonsCount,
          freeDaysCount,
          vacationsCount,
          rucotCount
        };
      });

      await liquidateMonth(
        year,
        monthIndex,
        user.email,
        summary,
        monthDuties
      );
      
      setShowLiquidateConfirm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLiquidating(false);
    }
  };

  const currentResident = residents.find(
    r => r.email.toLowerCase() === user?.email?.toLowerCase()
  );

  useEffect(() => {
    initRotationStore();
    initDutyStore();
    loadUnits();
  }, [initRotationStore, initDutyStore, loadUnits]);

  useEffect(() => {
    const today = new Date();
    const isCurrentMonth = selectedMonth.year === today.getFullYear() && selectedMonth.monthIndex === today.getMonth();
    
    if (isCurrentMonth) {
      const todayDay = today.getDate();
      const timer = setTimeout(() => {
        const element = document.getElementById(`day-col-${todayDay}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMonth]);

  const daysInMonth = new Date(selectedMonth.year, selectedMonth.monthIndex + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const realResidents = residents.filter(
    r => !r.id.startsWith('temp-') && 
         !r.firstName.toLowerCase().includes('futuro') && 
         !r.lastName?.toLowerCase().includes('futuro') &&
         r.year !== 'Graduado'
  );

  const sortedResidents = [...realResidents].sort((a, b) => {
    const levelA = parseInt(a.year.replace('R', ''), 10) || 0;
    const levelB = parseInt(b.year.replace('R', ''), 10) || 0;
    return levelB - levelA;
  });

  const getMonthlyGuardsCount = (residentId: string) => {
    const prefix = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-`;
    return duties.filter(
      d => d.residentId === residentId && d.date.startsWith(prefix) && (d.type === 'guardia' || d.type === 'rucot-guardia')
    ).length;
  };

  const getAnnualFreeDaysRemaining = (residentId: string) => {
    const academicYear = selectedMonth.monthIndex < 4 ? selectedMonth.year - 1 : selectedMonth.year;
    const count = duties.filter(d => {
      if (d.residentId !== residentId || d.type !== 'libre') return false;
      const [y, m] = d.date.split('-').map(Number);
      const dAcademicYear = m <= 4 ? y - 1 : y;
      return dAcademicYear === academicYear;
    }).length;
    return Math.max(0, 4 - count);
  };

  const handleHeaderClick = async (dayNum: number) => {
    if (!canEdit) return;
    const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const holidayDuty = duties.find(d => d.residentId === 'holiday' && d.date === dateStr);
    if (holidayDuty) {
      await removeDuty('holiday', dateStr);
    } else {
      await assignDuty('holiday', dateStr, 'libre');
    }
  };

  const handleWeekdayClick = async (dayNum: number) => {
    if (!canEdit) return;
    const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const mandatoryGuard = duties.find(d => d.residentId === 'mandatory-guard' && d.date === dateStr);
    const mandatoryRucot = duties.find(d => d.residentId === 'mandatory-rucot' && d.date === dateStr);

    if (mandatoryGuard && !mandatoryRucot) {
      // Transition from Guardia Only -> RUCOT Only
      await removeDuty('mandatory-guard', dateStr);
      await assignDuty('mandatory-rucot', dateStr, 'rucot');
    } else if (!mandatoryGuard && mandatoryRucot) {
      // Transition from RUCOT Only -> Both Guardia and RUCOT
      await assignDuty('mandatory-guard', dateStr, 'guardia');
    } else if (mandatoryGuard && mandatoryRucot) {
      // Transition from Both -> None
      await removeDuty('mandatory-guard', dateStr);
      await removeDuty('mandatory-rucot', dateStr);
    } else {
      // Transition from None -> Guardia Only
      await assignDuty('mandatory-guard', dateStr, 'guardia');
    }
  };

  const getResidentDutyBalance = (residentId: string) => {
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
      
      const explicitDuty = duties.find(
        d => d.residentId === residentId && d.date === dateStr
      );
      
      let hasAutoSalienteTrigger = false;
      if (dayOfWeek === 0) {
        hasAutoSalienteTrigger = false;
      } else if (dayOfWeek === 1) {
        const prevDateStr = getPreviousDateStr(dateStr);
        const sundayGuard = duties.find(
          d => d.residentId === residentId && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
        );
        const twoDaysAgoDateStr = getPreviousDateStr(prevDateStr);
        const saturdayGuard = duties.find(
          d => d.residentId === residentId && d.date === twoDaysAgoDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
        );
        hasAutoSalienteTrigger = !!sundayGuard || !!saturdayGuard;
      } else {
        const prevDateStr = getPreviousDateStr(dateStr);
        const yesterdayGuard = duties.find(
          d => d.residentId === residentId && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
        );
        hasAutoSalienteTrigger = !!yesterdayGuard;
      }
      
      const isSaliente = hasAutoSalienteTrigger && (!explicitDuty || explicitDuty.type !== 'no-saliente');
      
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
      
      if (cellType === 'guardia' || cellType === 'saliente' || cellType === 'saliente-manual' || cellType === 'manana' || cellType === 'curso' || cellType === 'vacaciones' || cellType === 'rucot') {
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

  const handleFillMornings = async () => {
    if (!canEdit) return;
    
    const year = selectedMonth.year;
    const monthIndex = selectedMonth.monthIndex;
    const assignments: { residentId: string; date: string; type: DutyType }[] = [];
    
    for (const res of sortedResidents) {
      for (const day of daysArray) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const date = new Date(year, monthIndex, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
        
        if (isWeekend || isHoliday) continue;
        
        const explicitDuty = duties.find(
          d => d.residentId === res.id && d.date === dateStr
        );
        
        let hasAutoSalienteTrigger = false;
        if (dayOfWeek === 0) {
          hasAutoSalienteTrigger = false;
        } else if (dayOfWeek === 1) {
          const prevDateStr = getPreviousDateStr(dateStr);
          const sundayGuard = duties.find(
            d => d.residentId === res.id && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
          );
          const twoDaysAgoDateStr = getPreviousDateStr(prevDateStr);
          const saturdayGuard = duties.find(
            d => d.residentId === res.id && d.date === twoDaysAgoDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
          );
          hasAutoSalienteTrigger = !!sundayGuard || !!saturdayGuard;
        } else {
          const prevDateStr = getPreviousDateStr(dateStr);
          const yesterdayGuard = duties.find(
            d => d.residentId === res.id && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
          );
          hasAutoSalienteTrigger = !!yesterdayGuard;
        }
        
        const isSaliente = hasAutoSalienteTrigger && (!explicitDuty || explicitDuty.type !== 'no-saliente');
        
        let cellType: DutyType | null = null;
        if (isSaliente) {
          cellType = 'saliente';
        }
        if (explicitDuty && explicitDuty.type !== 'no-saliente') {
          cellType = explicitDuty.type;
        }
        
        const hasTarde = explicitDuty?.hasTarde === true;
        
        if (!cellType && !hasTarde) {
          assignments.push({
            residentId: res.id,
            date: dateStr,
            type: 'manana'
          });
        }
      }
    }
    
    if (assignments.length > 0) {
      await assignDutiesBulk(assignments);
    }
  };

  const handleClearBoard = async () => {
    if (!canEdit) return;
    const confirmClear = window.confirm(
      '¿Estás seguro de que deseas borrar toda la pizarra para este mes? Se eliminarán todos los turnos asignados y los días festivos.'
    );
    if (confirmClear) {
      await clearDutiesForMonth(selectedMonth.year, selectedMonth.monthIndex);
    }
  };

  const handleCellClick = (residentId: string, day: number, isSaliente: boolean) => {
    const isOwnRow = role === 'reader' && currentResident && residentId === currentResident.id;
    if (!canEdit && !isOwnRow) return;
    const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = duties.find(d => d.residentId === residentId && d.date === dateStr);
    
    if (existing) {
      const typeToEdit = existing.type === 'vacaciones-pendiente' ? 'vacaciones' : existing.type;
      setEditType(typeToEdit === 'no-saliente' ? '' : (typeToEdit === 'tarde' || typeToEdit === 'tarde-especial' ? '' : typeToEdit));
      setEditNotes(existing.notes || '');
      setEditHasTarde(existing.hasTarde === true || existing.type === 'tarde');
      setEditHasTardeEspecial(existing.hasTardeEspecial === true || existing.type === 'tarde-especial');
    } else if (isSaliente) {
      setEditType('saliente');
      setEditNotes('');
      setEditHasTarde(false);
      setEditHasTardeEspecial(false);
    } else {
      setEditType('');
      setEditNotes('');
      setEditHasTarde(false);
      setEditHasTardeEspecial(false);
    }
    
    let startRange = dateStr;
    let endRange = dateStr;
    if (existing?.type === 'vacaciones' || existing?.type === 'vacaciones-pendiente' || existing?.type === 'curso') {
      const typeToCheck = existing.type;
      let curr = new Date(dateStr);
      for (let i = 0; i < 60; i++) {
        const check = new Date(curr);
        check.setDate(check.getDate() - 1);
        const checkStr = check.toISOString().split('T')[0];
        if (duties.some(d => d.residentId === residentId && d.date === checkStr && d.type === typeToCheck)) {
          startRange = checkStr;
          curr = check;
        } else {
          break;
        }
      }
      curr = new Date(dateStr);
      for (let i = 0; i < 60; i++) {
        const check = new Date(curr);
        check.setDate(check.getDate() + 1);
        const checkStr = check.toISOString().split('T')[0];
        if (duties.some(d => d.residentId === residentId && d.date === checkStr && d.type === typeToCheck)) {
          endRange = checkStr;
          curr = check;
        } else {
          break;
        }
      }
    }
    
    setVacationStartDate(startRange);
    setVacationEndDate(endRange);
    setActiveCell({ residentId, date: dateStr });
  };

  const handleSave = async () => {
    if (!activeCell) return;
    if (editType === '') {
      if (editHasTarde) {
        await assignDuty(activeCell.residentId, activeCell.date, 'tarde', editNotes, false, false);
      } else if (editHasTardeEspecial) {
        await assignDuty(activeCell.residentId, activeCell.date, 'tarde-especial', editNotes, false, false);
      } else {
        const dateObj = new Date(activeCell.date);
        const dayOfWeek = dateObj.getDay();
        
        let hasAutoSalienteTrigger = false;
        if (dayOfWeek === 0) {
          hasAutoSalienteTrigger = false;
        } else if (dayOfWeek === 1) {
          const prevDateStr = getPreviousDateStr(activeCell.date);
          const sundayGuard = duties.find(
            d => d.residentId === activeCell.residentId && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
          );
          const twoDaysAgoDateStr = getPreviousDateStr(prevDateStr);
          const saturdayGuard = duties.find(
            d => d.residentId === activeCell.residentId && d.date === twoDaysAgoDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
          );
          hasAutoSalienteTrigger = !!sundayGuard || !!saturdayGuard;
        } else {
          const prevDateStr = getPreviousDateStr(activeCell.date);
          const yesterdayGuard = duties.find(
            d => d.residentId === activeCell.residentId && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
          );
          hasAutoSalienteTrigger = !!yesterdayGuard;
        }

        if (hasAutoSalienteTrigger) {
          await assignDuty(activeCell.residentId, activeCell.date, 'no-saliente');
        } else {
          await removeDuty(activeCell.residentId, activeCell.date);
        }
      }
    } else if (editType === 'vacaciones' || editType === 'curso') {
      const start = new Date(vacationStartDate);
      const end = new Date(vacationEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        alert('Por favor, introduce un rango de fechas válido (Inicio menor o igual a Fin).');
        return;
      }
      
      const existing = duties.find(d => d.residentId === activeCell.residentId && d.date === activeCell.date);
      const isVacationType = (t?: string) => t === 'vacaciones' || t === 'vacaciones-pendiente';
      
      if (editType === 'vacaciones' && existing && isVacationType(existing.type)) {
        let curr = new Date(activeCell.date);
        const daysToDelete: string[] = [activeCell.date];
        
        for (let i = 0; i < 60; i++) {
          const check = new Date(curr);
          check.setDate(check.getDate() - 1);
          const checkStr = check.toISOString().split('T')[0];
          const match = duties.find(d => d.residentId === activeCell.residentId && d.date === checkStr);
          if (match && isVacationType(match.type)) {
            daysToDelete.push(checkStr);
            curr = check;
          } else {
            break;
          }
        }
        curr = new Date(activeCell.date);
        for (let i = 0; i < 60; i++) {
          const check = new Date(curr);
          check.setDate(check.getDate() + 1);
          const checkStr = check.toISOString().split('T')[0];
          const match = duties.find(d => d.residentId === activeCell.residentId && d.date === checkStr);
          if (match && isVacationType(match.type)) {
            daysToDelete.push(checkStr);
            curr = check;
          } else {
            break;
          }
        }
        
        for (const dateStr of daysToDelete) {
          await removeDuty(activeCell.residentId, dateStr);
        }
      } else if (existing?.type === editType) {
        let curr = new Date(activeCell.date);
        const daysToDelete: string[] = [activeCell.date];
        
        for (let i = 0; i < 60; i++) {
          const check = new Date(curr);
          check.setDate(check.getDate() - 1);
          const checkStr = check.toISOString().split('T')[0];
          if (duties.some(d => d.residentId === activeCell.residentId && d.date === checkStr && d.type === editType)) {
            daysToDelete.push(checkStr);
            curr = check;
          } else {
            break;
          }
        }
        curr = new Date(activeCell.date);
        for (let i = 0; i < 60; i++) {
          const check = new Date(curr);
          check.setDate(check.getDate() + 1);
          const checkStr = check.toISOString().split('T')[0];
          if (duties.some(d => d.residentId === activeCell.residentId && d.date === checkStr && d.type === editType)) {
            daysToDelete.push(checkStr);
            curr = check;
          } else {
            break;
          }
        }
        
        for (const dateStr of daysToDelete) {
          await removeDuty(activeCell.residentId, dateStr);
        }
      }
      
      const targetType = (editType === 'vacaciones' && role === 'coordinador') ? 'vacaciones-pendiente' : editType;
      
      let currDate = new Date(start);
      while (currDate <= end) {
        const dateStr = currDate.toISOString().split('T')[0];
        await assignDuty(activeCell.residentId, dateStr, targetType, editNotes, editHasTarde, editHasTardeEspecial);
        currDate.setDate(currDate.getDate() + 1);
      }
      
      if (targetType === 'vacaciones-pendiente') {
        const res = residents.find(r => r.id === activeCell.residentId);
        const resName = res ? `${res.firstName} ${res.lastName}` : 'Residente';
        const startFormatted = vacationStartDate.split('-').reverse().join('/');
        const endFormatted = vacationEndDate.split('-').reverse().join('/');
        const periodStr = startFormatted === endFormatted ? startFormatted : `${startFormatted} al ${endFormatted}`;
        const notesStr = editNotes.trim() ? `\n<b>Notas:</b> ${editNotes.trim()}` : '';
        
        const msg = `🔔 <b>Nueva solicitud de vacaciones</b>\n<b>Residente:</b> ${resName}\n<b>Periodo:</b> ${periodStr}${notesStr}`;
        sendTelegramMessage(msg).catch(err => console.error('Error sending telegram notification:', err));

        alert('Tu solicitud de vacaciones ha sido registrada y queda pendiente de aprobación por el administrador.');
      }
    } else if (editType === 'saliente') {
      if (editHasTarde) {
        await assignDuty(activeCell.residentId, activeCell.date, 'saliente', editNotes, true, false);
      } else if (editHasTardeEspecial) {
        await assignDuty(activeCell.residentId, activeCell.date, 'saliente', editNotes, false, true);
      } else {
        await removeDuty(activeCell.residentId, activeCell.date);
      }
    } else {
      if (editType === 'libre') {
        const existing = duties.find(d => d.residentId === activeCell.residentId && d.date === activeCell.date);
        if (!existing || existing.type !== 'libre') {
          const remaining = getAnnualFreeDaysRemaining(activeCell.residentId);
          if (remaining <= 0) {
            const confirmSave = window.confirm(
              'Este residente ya ha consumido sus 4 días libres anuales. ¿Estás seguro de que deseas asignar otro día libre?'
            );
            if (!confirmSave) return;
          }
        }
      }
      await assignDuty(activeCell.residentId, activeCell.date, editType, editNotes, editHasTarde, editHasTardeEspecial);
    }
    setActiveCell(null);
  };

  const handleDelete = async () => {
    if (!activeCell) return;
    const existing = duties.find(d => d.residentId === activeCell.residentId && d.date === activeCell.date);
    
    const dateObj = new Date(activeCell.date);
    const dayOfWeek = dateObj.getDay();
    
    let hasAutoSalienteTrigger = false;
    if (dayOfWeek === 0) {
      hasAutoSalienteTrigger = false;
    } else if (dayOfWeek === 1) {
      const prevDateStr = getPreviousDateStr(activeCell.date);
      const sundayGuard = duties.find(
        d => d.residentId === activeCell.residentId && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
      );
      const twoDaysAgoDateStr = getPreviousDateStr(prevDateStr);
      const saturdayGuard = duties.find(
        d => d.residentId === activeCell.residentId && d.date === twoDaysAgoDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
      );
      hasAutoSalienteTrigger = !!sundayGuard || !!saturdayGuard;
    } else {
      const prevDateStr = getPreviousDateStr(activeCell.date);
      const yesterdayGuard = duties.find(
        d => d.residentId === activeCell.residentId && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
      );
      hasAutoSalienteTrigger = !!yesterdayGuard;
    }
    const isAutoSaliente = hasAutoSalienteTrigger && (!existing || existing.type !== 'no-saliente');
    
    if (isAutoSaliente || editType === 'saliente') {
      await assignDuty(activeCell.residentId, activeCell.date, 'no-saliente');
    } else if (existing?.type === 'no-saliente') {
      await removeDuty(activeCell.residentId, activeCell.date);
    } else if (existing?.type === 'vacaciones' || existing?.type === 'curso') {
      const typeLabel = existing.type === 'vacaciones' ? 'vacaciones' : 'curso';
      if (window.confirm(`¿Deseas eliminar TODO el periodo de ${typeLabel} contiguo?`)) {
        let curr = new Date(activeCell.date);
        const daysToDelete: string[] = [activeCell.date];
        
        for (let i = 0; i < 60; i++) {
          const check = new Date(curr);
          check.setDate(check.getDate() - 1);
          const checkStr = check.toISOString().split('T')[0];
          if (duties.some(d => d.residentId === activeCell.residentId && d.date === checkStr && d.type === existing.type)) {
            daysToDelete.push(checkStr);
            curr = check;
          } else {
            break;
          }
        }
        curr = new Date(activeCell.date);
        for (let i = 0; i < 60; i++) {
          const check = new Date(curr);
          check.setDate(check.getDate() + 1);
          const checkStr = check.toISOString().split('T')[0];
          if (duties.some(d => d.residentId === activeCell.residentId && d.date === checkStr && d.type === existing.type)) {
            daysToDelete.push(checkStr);
            curr = check;
          } else {
            break;
          }
        }
        
        for (const dateStr of daysToDelete) {
          await removeDuty(activeCell.residentId, dateStr);
        }
      } else {
        await removeDuty(activeCell.residentId, activeCell.date);
      }
    } else {
      await removeDuty(activeCell.residentId, activeCell.date);
    }
    setActiveCell(null);
  };

  const WEEKDAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

  // Renderizar la vista de mis turnos para el residente seleccionado
  const renderMisTurnosMobile = () => {
    const resId = selectedResidentId || (sortedResidents[0]?.id);
    if (!resId) return <div className="text-center text-xs text-slate-400 py-8">Cargando residentes...</div>;

    const res = sortedResidents.find(r => r.id === resId);
    if (!res) return null;

    // Turnos de este residente en este mes
    const monthPrefix = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-`;
    const resDuties = duties.filter(d => d.residentId === resId && d.date.startsWith(monthPrefix));

    return (
      <div className="flex flex-col space-y-3.5">
        {/* Selector de Residente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-3 rounded-2xl shadow-xs">
          <label className="block text-[9.5px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5">Consultar Residente</label>
          <select
            value={resId}
            onChange={(e) => handleSelectResidentMobile(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
          >
            {sortedResidents.map(r => (
              <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.year})</option>
            ))}
          </select>
        </div>

        {/* Timeline List */}
        <div className="flex flex-col space-y-2">
          {daysArray.map((dayNum) => {
            const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const duty = resDuties.find(d => d.date === dateStr);
            const dateObj = new Date(selectedMonth.year, selectedMonth.monthIndex, dayNum);
            const dayOfWeek = dateObj.getDay();
            const weekdayName = WEEKDAYS_SHORT[dayOfWeek];
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
            const isRedDay = isWeekend || isHoliday;

            // Determinar estilo y contenido del turno
            let badgeBg = "bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-350";
            let label = "Mañana";
            let desc = "Jornada habitual de mañana";

            if (duty) {
              if (duty.type === 'guardia') {
                badgeBg = "bg-red-500 text-white shadow-xs";
                label = "Guardia (G)";
                desc = duty.notes ? `Guardia de 24h — Obs: ${duty.notes}` : "Guardia de 24 horas";
              } else if (duty.type === 'rucot') {
                badgeBg = "bg-blue-600 text-white shadow-xs";
                label = "RUCOT (R)";
                desc = duty.notes ? `Guardia obligatoria reducida — Obs: ${duty.notes}` : "Guardia RUCOT";
              } else if (duty.type === 'rucot-guardia') {
                badgeBg = "bg-gradient-to-r from-blue-600 to-red-500 text-white shadow-xs";
                label = "RUCOT + Guardia (R+G)";
                desc = duty.notes ? `RUCOT y Guardia el mismo día — Obs: ${duty.notes}` : "RUCOT + Guardia combinada";
              } else if (duty.type === 'tarde' || duty.type === 'tarde-especial') {
                badgeBg = "bg-orange-500 text-white shadow-xs";
                label = duty.type === 'tarde-especial' ? "Tarde Especial (TE)" : "Tarde (T)";
                desc = duty.notes ? `Actividad de tarde — Obs: ${duty.notes}` : "Jornada de tarde";
              } else if (duty.type === 'saliente' || duty.type === 'saliente-manual') {
                badgeBg = "bg-emerald-600 text-white shadow-xs";
                label = "Saliente (S)";
                desc = duty.notes ? `Descanso posguardia — Obs: ${duty.notes}` : "Saliente de guardia";
              } else if (duty.type === 'curso') {
                badgeBg = "bg-purple-500 text-white shadow-xs";
                label = "Curso (C)";
                desc = duty.notes ? `Formación/Curso — Obs: ${duty.notes}` : "Jornada formativa";
              } else if (duty.type === 'vacaciones') {
                badgeBg = "bg-teal-600 text-white shadow-xs";
                label = "Vacaciones (V)";
                desc = duty.notes ? `Vacaciones aprobadas — Obs: ${duty.notes}` : "Vacaciones";
              } else if (duty.type === 'libre') {
                badgeBg = "bg-slate-555 text-white shadow-xs";
                label = "Libre (L)";
                desc = duty.notes ? `Día libre — Obs: ${duty.notes}` : "Día libre";
              }
            } else {
              // Si no tiene nada asignado explícitamente
              if (isRedDay) {
                badgeBg = "bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400/80 border border-red-200/50 dark:border-red-900/20";
                label = "Libre";
                desc = isHoliday ? "Día festivo nacional o local" : "Fin de semana";
              }
            }

            return (
              <div 
                key={dayNum}
                className={clsx(
                  "flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl shadow-2xs hover:border-slate-350 dark:hover:border-slate-700 transition-all",
                  duty?.type === 'guardia' && "ring-1 ring-red-500/20 bg-red-50/[0.02] dark:bg-red-950/[0.02]",
                  duty?.type === 'rucot' && "ring-1 ring-blue-500/20 bg-blue-50/[0.02] dark:bg-blue-950/[0.02]"
                )}
              >
                {/* Date bubble */}
                <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-slate-105 dark:bg-slate-950 shrink-0 select-none">
                  <span className={clsx(
                    "text-[8px] font-black uppercase tracking-wider leading-none mb-0.5",
                    isRedDay ? "text-red-500" : "text-slate-450 dark:text-slate-500"
                  )}>
                    {weekdayName}
                  </span>
                  <span className={clsx(
                    "text-sm font-black leading-none",
                    isRedDay ? "text-red-500 font-extrabold" : "text-slate-700 dark:text-slate-200"
                  )}>
                    {dayNum}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={clsx(
                      "text-[8.5px] font-black px-1.5 py-0.5 rounded leading-none uppercase tracking-wider",
                      badgeBg
                    )}>
                      {label}
                    </span>
                    {duty?.notes && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Contiene observaciones" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar el carrusel de días horizontal
  const renderCarruselDias = () => {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory mb-4">
        {daysArray.map((dayNum) => {
          const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isSelected = selectedDay === dayNum;
          const today = new Date();
          const isToday = today.getFullYear() === selectedMonth.year && today.getMonth() === selectedMonth.monthIndex && today.getDate() === dayNum;
          
          const dateObj = new Date(selectedMonth.year, selectedMonth.monthIndex, dayNum);
          const dayOfWeek = dateObj.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
          const isRedDay = isWeekend || isHoliday;
          
          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={clsx(
                "flex flex-col items-center justify-center min-w-[3.25rem] w-[3.25rem] h-14 rounded-2xl border transition-all cursor-pointer snap-start shrink-0 select-none",
                isSelected
                  ? "bg-gradient-to-br from-teal-600 to-emerald-500 text-white border-teal-600 shadow-md scale-105"
                  : isToday
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-teal-500 dark:border-teal-500/80 font-black"
                    : isRedDay
                      ? "bg-red-50/50 dark:bg-red-950/10 text-red-500 border-red-200/40 dark:border-red-900/10"
                      : "bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-400 border-slate-200/80 dark:border-slate-800"
              )}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider leading-none mb-1">
                {WEEKDAYS_SHORT[dayOfWeek]}
              </span>
              <span className="text-sm font-black leading-none">
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderQuienEstaHoyMobile = () => {
    const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    // Obtener los turnos del día para residentes reales
    const dayDuties = duties.filter(d => d.date === dateStr && d.residentId !== 'holiday' && d.residentId !== 'mandatory-guard' && d.residentId !== 'mandatory-rucot');
    
    // Agrupación
    const guardias: string[] = [];
    const rucots: string[] = [];
    const tardes: string[] = [];
    const salientes: string[] = [];
    const otros: { name: string; label: string; bg: string }[] = [];

    sortedResidents.forEach(res => {
      const duty = dayDuties.find(d => d.residentId === res.id);
      const fullName = `${res.firstName} ${res.lastName}`;
      if (duty) {
        if (duty.type === 'guardia') {
          guardias.push(fullName);
        } else if (duty.type === 'rucot') {
          rucots.push(fullName);
        } else if (duty.type === 'rucot-guardia') {
          guardias.push(fullName);
          rucots.push(fullName);
        } else if (duty.type === 'tarde' || duty.type === 'tarde-especial') {
          tardes.push(fullName);
        } else if (duty.type === 'saliente' || duty.type === 'saliente-manual') {
          salientes.push(fullName);
        } else if (duty.type === 'curso') {
          otros.push({ name: fullName, label: 'Curso (C)', bg: 'bg-purple-500' });
        } else if (duty.type === 'vacaciones') {
          otros.push({ name: fullName, label: 'Vacaciones (V)', bg: 'bg-teal-600' });
        } else if (duty.type === 'libre') {
          otros.push({ name: fullName, label: 'Libre (L)', bg: 'bg-slate-500' });
        }
      }
    });

    const isGroupEmpty = guardias.length === 0 && rucots.length === 0 && tardes.length === 0 && salientes.length === 0 && otros.length === 0;

    return (
      <div className="flex flex-col space-y-3.5">
        {/* Carrusel de días */}
        {renderCarruselDias()}

        {/* Tarjetas de Grupos */}
        <div className="flex flex-col space-y-3">
          {isGroupEmpty ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 text-center">
              <CalendarCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-455 font-bold uppercase tracking-wider">Sin turnos asignados</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">Todos los residentes realizan jornada de mañana o están libres.</p>
            </div>
          ) : (
            <>
              {/* Guardia */}
              {guardias.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Guardias ({guardias.length})</h3>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {guardias.map(name => (
                      <li key={name} className="text-xs font-bold text-slate-655 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RUCOT */}
              {rucots.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">RUCOTs ({rucots.length})</h3>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {rucots.map(name => (
                      <li key={name} className="text-xs font-bold text-slate-655 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tardes */}
              {tardes.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Tardes ({tardes.length})</h3>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {tardes.map(name => (
                      <li key={name} className="text-xs font-bold text-slate-655 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Salientes */}
              {salientes.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Salientes ({salientes.length})</h3>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {salientes.map(name => (
                      <li key={name} className="text-xs font-bold text-slate-655 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Otros turnos */}
              {otros.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Otros Turnos ({otros.length})</h3>
                  </div>
                  <ul className="flex flex-col space-y-2">
                    {otros.map(item => (
                      <li key={item.name} className="flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                        <span>{item.name}</span>
                        <span className={clsx("text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase leading-none tracking-wider shadow-3xs", item.bg)}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2 lg:space-y-2.5 overflow-hidden px-0 pb-0 lg:px-4 lg:pb-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-1.5 md:pb-2 pt-0.5 md:pt-1 px-3 md:px-0 shrink-0">
        <div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1.5 md:gap-2 font-heading">
            <CalendarCheck className="w-4.5 h-4.5 md:w-6 md:h-6 text-teal-600 dark:text-teal-400" />
            Planificador de Guardias y Tardes
          </h2>
          
        </div>

        {/* Actions & Month Selector */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
          {/* Dynamic Month Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xs overflow-x-auto max-w-full">
            {planningMonths.map((m, idx) => {
              const isActive = selectedMonth.year === m.year && selectedMonth.monthIndex === m.monthIndex;
              const shortLabel = m.label.split(' ')[0];
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedMonth(m)}
                  className={clsx(
                    "px-2.5 py-1.5 text-xs sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-white"
                  )}
                >
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {canEdit && (
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={handleFillMornings}
                title="Rellenar huecos de días laborables con Mañana"
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-xs font-black text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <span className="w-4.5 h-4.5 rounded-md bg-yellow-400 text-slate-900 flex items-center justify-center text-[10px] font-black border border-yellow-500 shadow-2xs">M</span>
                <span className="hidden sm:inline">Rellenar resto</span>
              </button>

              <button
                onClick={handleClearBoard}
                title="Borrar toda la pizarra"
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200/80 dark:border-red-900/40 text-xs sm:text-xs font-black text-red-600 dark:text-red-400 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Borrar pizarra</span>
              </button>

              <button
                onClick={() => setShowLiquidateConfirm(true)}
                title="Liquidar y cerrar este mes de forma permanente"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/40 text-xs sm:text-xs font-black text-emerald-600 dark:text-emerald-400 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Liquidar mes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PIZARRA BOARD LAYOUT */}
      {isMobileDevice ? (
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 flex flex-col overflow-hidden rounded-none md:rounded-2xl border-y md:border border-slate-200 dark:border-slate-800/80 shadow-xs">
          {/* Pestañas superiores */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/10">
            <button
              onClick={() => setMobileTab('mis-turnos')}
              className={clsx(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer",
                mobileTab === 'mis-turnos'
                  ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-750 dark:text-slate-400"
              )}
            >
              Mis Turnos
            </button>
            <button
              onClick={() => setMobileTab('quien-esta')}
              className={clsx(
                "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer",
                mobileTab === 'quien-esta'
                  ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-750 dark:text-slate-400"
              )}
            >
              ¿Quién está hoy?
            </button>
          </div>

          {/* Contenido de la pestaña */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-slate-50/30 dark:bg-slate-950/10">
            {mobileTab === 'mis-turnos' ? renderMisTurnosMobile() : renderQuienEstaHoyMobile()}
          </div>

          {/* Botón discreto para forzar modo Excel */}
          <div className="px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 text-center shrink-0">
            <button
              onClick={() => setIsMobileDevice(false)}
              className="text-[9.5px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-widest hover:underline cursor-pointer"
            >
              Ver Tabla Completa (Modo Excel)
            </button>
          </div>
        </div>
      ) : (
        /* VISTA DESKTOP CLÁSICA */
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900/40 rounded-none md:rounded-2xl border-y md:border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col overflow-hidden">
        
        {/* Table container with horizontal scroll */}
        <div className="flex-1 min-h-0 overflow-auto max-w-full">
          <table 
            className="w-full border-separate text-left table-fixed mobile-duties-table lg:min-w-[1680px] min-h-full"
            style={{ '--days-count': daysInMonth, borderSpacing: 0 } as React.CSSProperties}
          >
            <thead>
              {/* Day numbers row */}
              <tr className="bg-slate-50 dark:bg-slate-950 h-9 lg:h-7">
                <th className="sticky top-0 left-0 z-30 bg-slate-50 dark:bg-slate-950 mobile-duties-name-col lg:w-72 lg:min-w-[18rem] px-2 py-1 lg:py-1 sm:px-4 border-r border-b border-slate-200/80 dark:border-slate-850/60">
                  <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Residente</span>
                </th>
                {daysArray.map((day) => {
                  const date = new Date(selectedMonth.year, selectedMonth.monthIndex, day);
                  const dayOfWeek = date.getDay();
                  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
                  const isRedDay = weekend || isHoliday;
                  const isMandatory = duties.some(d => d.residentId === 'mandatory-guard' && d.date === dateStr);
                  const isMandatoryRucot = duties.some(d => d.residentId === 'mandatory-rucot' && d.date === dateStr);
                  return (
                    <th 
                      key={day}
                      id={`day-col-${day}`}
                      onClick={() => handleHeaderClick(day)}
                      title={canEdit ? "Haz clic para alternar día festivo global" : undefined}
                      className={clsx(
                        "sticky top-0 z-20 mobile-duties-day-col lg:w-12 text-center py-1 lg:py-1 border-r border-b border-slate-200/80 dark:border-slate-850/60 text-[11px] lg:text-[10px] font-black",
                        isRedDay ? "bg-red-50 dark:bg-red-950 text-red-500" : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400",
                        isMandatory && "bg-red-500/[0.06] dark:bg-red-500/[0.12]",
                        isMandatoryRucot && "bg-blue-600/[0.06] dark:bg-blue-600/[0.12]",
                        canEdit && "cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-850/60 select-none"
                      )}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>

              {/* Day name abbreviation row */}
              <tr className="bg-slate-50 dark:bg-slate-950 h-9 lg:h-8">
                <th className="sticky top-9 lg:top-8 left-0 z-30 bg-slate-50 dark:bg-slate-950 mobile-duties-name-col lg:w-72 lg:min-w-[18rem] px-2 py-1 lg:py-1 sm:px-4 border-r border-b border-slate-200 dark:border-slate-850">
                  <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Turno / Día</span>
                </th>
                {daysArray.map((day) => {
                  const date = new Date(selectedMonth.year, selectedMonth.monthIndex, day);
                  const dayOfWeek = date.getDay();
                  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
                  const isRedDay = weekend || isHoliday;
                  const weekdayName = WEEKDAYS[dayOfWeek];
                  const isMandatory = duties.some(d => d.residentId === 'mandatory-guard' && d.date === dateStr);
                  const isMandatoryRucot = duties.some(d => d.residentId === 'mandatory-rucot' && d.date === dateStr);
                  const hasGuardiaAssigned = duties.some(
                    d => d.residentId !== 'holiday' && d.residentId !== 'mandatory-guard' && d.residentId !== 'mandatory-rucot' && d.date === dateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
                  );
                  const hasRucotAssigned = duties.some(
                    d => d.residentId !== 'holiday' && d.residentId !== 'mandatory-guard' && d.residentId !== 'mandatory-rucot' && d.date === dateStr && (d.type === 'rucot' || d.type === 'rucot-guardia')
                  );
                  return (
                    <th 
                      key={day}
                      onClick={() => handleWeekdayClick(day)}
                      title={canEdit ? "Haz clic para alternar obligatoriedad (Guardia / RUCOT / Ninguna)" : undefined}
                      className={clsx(
                        "sticky top-9 lg:top-7 z-20 mobile-duties-day-col lg:w-12 text-center py-0.5 lg:py-0.5 border-r border-b border-slate-200/80 dark:border-slate-850/60 text-[10px] font-black relative",
                        isRedDay ? "bg-red-50 dark:bg-red-950 text-red-500" : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400",
                        isMandatory && "bg-red-500/[0.06] dark:bg-red-500/[0.12]",
                        isMandatoryRucot && "bg-blue-600/[0.06] dark:bg-blue-600/[0.12]",
                        canEdit && "cursor-pointer hover:bg-slate-200/45 dark:hover:bg-slate-850/45 select-none"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span>{weekdayName}</span>
                        {isMandatory && (
                          hasGuardiaAssigned ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Guardia obligatoria cubierta" />
                          ) : (
                            <span title="¡Alerta! Guardia obligatoria sin cubrir">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                            </span>
                          )
                        )}
                        {isMandatoryRucot && (
                          hasRucotAssigned ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="RUCOT obligatoria cubierta" />
                          ) : (
                            <span title="¡Alerta! RUCOT obligatoria sin cubrir">
                              <AlertTriangle className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
                            </span>
                          )
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            
            <tbody>
              {sortedResidents.length === 0 ? (
                <tr>
                  <td 
                    colSpan={daysInMonth + 1} 
                    className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm font-semibold"
                  >
                    No hay residentes activos cargados.
                  </td>
                </tr>
              ) : (
                sortedResidents.map((res) => {
                  return (
                    <tr 
                      key={res.id} 
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      {/* Resident Info Block */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 mobile-duties-name-col lg:w-72 lg:min-w-[18rem] px-2 py-2 sm:px-3 sm:py-2.5 lg:py-0.5 lg:px-1.5 border-r border-b border-slate-200 border-b-slate-150 dark:border-slate-800 dark:border-b-slate-800/80">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full h-full bg-white dark:bg-slate-900">
                          <div className="w-14 h-14 lg:w-7 lg:h-7 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 flex items-center justify-center shrink-0 border border-teal-600/20 shadow-2xs">
                            <span className="text-[36px] lg:text-[10px] font-black text-white">{res.firstName[0]}{res.lastName?.[0] || ''}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[32px] lg:text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-tight" title={`${res.firstName} ${res.lastName}`}>
                              {res.firstName} {res.lastName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className="inline-block text-[24px] lg:text-[8px] font-extrabold px-0.5 sm:px-1 rounded-sm bg-slate-100 text-slate-655 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/30 font-mono">
                                {res.year}
                              </span>
                              {/* Shift count balance badge */}
                              {(() => {
                                const bal = getResidentDutyBalance(res.id);
                                if (bal === 0) return null;
                                const isPositive = bal > 0;
                                const formatted = isPositive ? `+${bal}` : `${bal}`;
                                return (
                                  <span className={clsx(
                                    "text-[24px] lg:text-[8px] font-black font-mono px-0.5 sm:px-1 rounded-sm border",
                                    isPositive 
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40" 
                                      : "bg-red-50 text-red-600 border-red-250 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40"
                                  )} title="Balance de turnos">
                                    {formatted}
                                  </span>
                                );
                              })()}

                              {/* Monthly guards count badge */}
                              {(() => {
                                const guardsCount = getMonthlyGuardsCount(res.id);
                                return (
                                  <span className="text-[24px] lg:text-[8px] font-black font-mono px-0.5 sm:px-1 rounded-sm border bg-red-50 text-red-600 border-red-250 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40" title="Guardias este mes">
                                    G: {guardsCount}
                                  </span>
                                );
                              })()}

                              {/* Annual remaining free days badge */}
                              {(() => {
                                const remainingFreeDays = getAnnualFreeDaysRemaining(res.id);
                                return (
                                  <span className={clsx(
                                    "text-[24px] lg:text-[8px] font-black font-mono px-0.5 sm:px-1 rounded-sm border",
                                    remainingFreeDays === 0
                                      ? "bg-slate-150 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                      : "bg-teal-50 text-teal-600 border-teal-250 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/40"
                                  )} title="Días libres anuales restantes (Máx 4/año)">
                                    L: {remainingFreeDays}
                                  </span>
                                );
                              })()}

                              {/* Rotation badge (inline next to the others!) */}
                              {(() => {
                                const rot = rotations.find(
                                  r => r.residentId === res.id && r.month === selectedMonth.monthIndex && r.year === selectedMonth.year
                                );
                                if (!rot) return null;
                                const unit = units.find(u => u.id === rot.unitId);
                                const color = getColor(unit?.color ?? 'slate');
                                const rotName = rot.customName || (unit ? unit.name : 'Desconocida');
                                return (
                                  <span className={clsx(
                                    "inline-flex items-center gap-1 text-[24px] lg:text-[8px] font-black px-1 rounded-sm border border-solid",
                                    color.bg, color.text, color.border
                                  )} title={`Rotación: ${rotName}`}>
                                    <span className="inline-block w-1.5 h-1.5 lg:w-1 lg:h-1 rounded-full bg-white dark:bg-slate-900 shrink-0" />
                                    <span className="truncate max-w-[50px] sm:max-w-[80px]">{rotName}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysArray.map((day) => {
                        const dateStr = `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        
                        const date = new Date(selectedMonth.year, selectedMonth.monthIndex, day);
                        const dayOfWeek = date.getDay();
                        
                        // Check if yesterday was a Guardia (Saliente trigger)
                        let hasAutoSalienteTrigger = false;
                        let guardOrigin: any = null;
                        if (dayOfWeek === 0) {
                          hasAutoSalienteTrigger = false;
                        } else if (dayOfWeek === 1) {
                          const prevDateStr = getPreviousDateStr(dateStr);
                          const sundayGuard = duties.find(
                            d => d.residentId === res.id && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
                          );
                          const twoDaysAgoDateStr = getPreviousDateStr(prevDateStr);
                          const saturdayGuard = duties.find(
                            d => d.residentId === res.id && d.date === twoDaysAgoDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
                          );
                          hasAutoSalienteTrigger = !!sundayGuard || !!saturdayGuard;
                          guardOrigin = sundayGuard || saturdayGuard;
                        } else {
                          const prevDateStr = getPreviousDateStr(dateStr);
                          const yesterdayGuard = duties.find(
                            d => d.residentId === res.id && d.date === prevDateStr && (d.type === 'guardia' || d.type === 'rucot-guardia')
                          );
                          hasAutoSalienteTrigger = !!yesterdayGuard;
                          guardOrigin = yesterdayGuard;
                        }
                        
                        // Find explicit assignment
                        const explicitDuty = duties.find(
                          d => d.residentId === res.id && d.date === dateStr
                        );
                        
                        const isSaliente = hasAutoSalienteTrigger && (!explicitDuty || explicitDuty.type !== 'no-saliente');
                        
                        let cellType: DutyType | null = null;
                        let cellNotes = '';
                        
                        if (isSaliente) {
                          cellType = 'saliente';
                        }
                        
                        if (explicitDuty && explicitDuty.type !== 'no-saliente') {
                          cellType = explicitDuty.type;
                          cellNotes = explicitDuty.notes || '';
                        }
                        
                        const weekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isHoliday = duties.some(d => d.residentId === 'holiday' && d.date === dateStr);
                        const isWeekendOrHoliday = weekend || isHoliday;
                        const isMandatory = duties.some(d => d.residentId === 'mandatory-guard' && d.date === dateStr);
                        const isMandatoryRucot = duties.some(d => d.residentId === 'mandatory-rucot' && d.date === dateStr);

                        const hasTarde = explicitDuty?.hasTarde === true;
                        const hasTardeEspecial = explicitDuty?.hasTardeEspecial === true;
                        
                        const isSplit = (hasTarde || hasTardeEspecial) && cellType && cellType !== 'tarde' && (cellType as string) !== 'tarde-especial';

                        const getPrimaryStyle = (type: string) => {
                          switch (type) {
                            case 'guardia': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', label: 'G' };
                            case 'saliente':
                            case 'saliente-manual': return { bg: 'bg-teal-800', text: 'text-white', border: 'border-teal-900', label: 'S' };
                            case 'libre': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-700', label: 'L' };
                            case 'manana': return { bg: 'bg-yellow-400', text: 'text-slate-900', border: 'border-yellow-500', label: 'M' };
                            case 'vacaciones': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-700', label: 'V' };
                            case 'vacaciones-pendiente': return { bg: 'bg-teal-500/[0.15] dark:bg-teal-500/[0.25]', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-400/50 dark:border-teal-500/50 border-dashed', label: 'V?' };
                            case 'curso': return { bg: 'bg-purple-400', text: 'text-white', border: 'border-purple-500', label: 'C' };
                            case 'rucot': return { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', label: 'R' };
                            case 'tarde': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'T' };
                            case 'tarde-especial': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'TE' };
                            default: return { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600', label: '?' };
                          }
                        };

                        return (
                          <td 
                            key={day}
                            onClick={() => handleCellClick(res.id, day, isSaliente)}
                            className={clsx(
                              "mobile-duties-day-col h-11 lg:w-12 lg:h-9 text-center p-0.5 border-r border-b border-slate-200/80 border-b-slate-150 dark:border-slate-850/60 dark:border-b-slate-800/80 relative group",
                              isWeekendOrHoliday && "bg-red-50/10 dark:bg-red-950/5",
                              isMandatory && "bg-red-500/[0.04] dark:bg-red-500/[0.08]",
                              isMandatoryRucot && "bg-blue-600/[0.04] dark:bg-blue-600/[0.08]",
                              (canEdit || (role === 'reader' && currentResident && res.id === currentResident.id)) 
                                ? "cursor-pointer hover:bg-teal-50/20 dark:hover:bg-teal-950/10" 
                                : "cursor-default"
                            )}
                          >
                            {/* Render Badges */}
                            {cellType === 'rucot-guardia' ? (() => {
                              const overrides = getLabelOverrides(cellNotes);
                              const primaryLabel = overrides[0] || 'R';
                              const secondaryLabel = overrides[1] || 'G';
                              return (
                                <div 
                                  title={cellNotes ? `RUCOT + Guardia - Obs: ${cellNotes}` : `RUCOT + Guardia`}
                                  className="w-full h-full rounded-md relative overflow-hidden border border-slate-200 dark:border-slate-850 shadow-2xs transition-all active:scale-95"
                                >
                                  <div 
                                    className="absolute inset-0 flex items-start justify-start p-1 font-black leading-none text-[9px] bg-blue-600 text-white"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                                  >
                                    {primaryLabel}
                                  </div>
                                  <div 
                                    className="absolute inset-0 flex items-end justify-end p-1 bg-red-500 text-white font-black leading-none text-[9px]"
                                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                  >
                                    {secondaryLabel}
                                  </div>
                                  {cellNotes && (
                                    <span className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-white rounded-full z-10" />
                                  )}
                                </div>
                              );
                            })() : isSplit && cellType ? (() => {
                              const overrides = getLabelOverrides(cellNotes);
                              const primaryLabel = overrides[0] || getPrimaryStyle(cellType).label;
                              const secondaryLabel = overrides[1] || (hasTardeEspecial ? 'TE' : 'T');
                              const primStyle = getPrimaryStyle(cellType);
                              
                              return (
                                <div 
                                  title={cellNotes ? `${primStyle.label} + ${hasTardeEspecial ? 'Tarde Especial' : 'Tarde'} - Obs: ${cellNotes}` : `${primStyle.label} + ${hasTardeEspecial ? 'Tarde Especial' : 'Tarde'}`}
                                  className="w-full h-full rounded-md relative overflow-hidden border border-slate-200 dark:border-slate-850 shadow-2xs transition-all active:scale-95"
                                >
                                  <div 
                                    className={clsx(
                                      "absolute inset-0 flex items-start justify-start p-1 font-black leading-none",
                                      primaryLabel.length > 2 ? "text-[8px] lg:text-[7px]" : "text-[9px]",
                                      primStyle.bg,
                                      primStyle.text
                                    )}
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                                  >
                                    {primaryLabel}
                                  </div>
                                  <div 
                                    className={clsx(
                                      "absolute inset-0 flex items-end justify-end p-1 bg-orange-500 text-white font-black leading-none",
                                      secondaryLabel.length > 2 ? "text-[8px] lg:text-[7px]" : "text-[9px]"
                                    )}
                                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                  >
                                    {secondaryLabel}
                                  </div>
                                  {cellNotes && (
                                    <span className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-white rounded-full z-10" />
                                  )}
                                </div>
                              );
                            })() : (() => {
                              let effectiveType = cellType;
                              if (!effectiveType) {
                                if (hasTardeEspecial) {
                                  effectiveType = 'tarde-especial';
                                } else if (hasTarde) {
                                  effectiveType = 'tarde';
                                }
                              }
                              if (!effectiveType) return null;

                              const overrides = getLabelOverrides(cellNotes);
                              const displayLabel = overrides[0] || getPrimaryStyle(effectiveType).label;
                              const style = getPrimaryStyle(effectiveType);
                              const isSalienteType = effectiveType === 'saliente' || effectiveType === 'saliente-manual';
                              
                              let cellTitle = cellNotes ? `${style.label} - Obs: ${cellNotes}` : style.label;
                              if (effectiveType === 'saliente') {
                                cellTitle = `Saliente - Guardia el día anterior (${guardOrigin?.notes || 'Sin observaciones'})`;
                              } else if (effectiveType === 'saliente-manual') {
                                cellTitle = cellNotes ? `Saliente Manual - Obs: ${cellNotes}` : 'Saliente Manual';
                              }

                              return (
                                <div 
                                  title={cellTitle}
                                  className={clsx(
                                    "w-full h-full rounded-md flex flex-col items-center justify-center font-black tracking-wider shadow-2xs border transition-all active:scale-95 relative",
                                    displayLabel.length > 2 ? "text-[9px] lg:text-[8px]" : "text-[11px] lg:text-[10px]",
                                    style.bg,
                                    style.text,
                                    style.border,
                                    isSalienteType && "opacity-90 cursor-pointer select-none"
                                  )}
                                >
                                  <span>{displayLabel}</span>
                                  {cellNotes && (
                                    <span className={clsx(
                                      "absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full",
                                      style.text.includes("slate-900") ? "bg-slate-900" : "bg-white"
                                    )} />
                                  )}
                                </div>
                              );
                            })()}

                            {/* Hover Plus Button for Admins or Resident on own cell when empty */}
                            {!cellType && !hasTarde && !hasTardeEspecial && (canEdit || (role === 'reader' && currentResident && res.id === currentResident.id)) && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PANEL / LEGEND */}
        <div className="px-3 py-2 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 md:gap-6">
            <span className="text-[10px] md:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Leyenda:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-red-500 text-white flex items-center justify-center text-xs font-black border border-red-600 shadow-2xs">G</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Guardia</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-teal-800 text-white flex items-center justify-center text-xs font-black border border-teal-900 shadow-2xs">S</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Saliente</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-black border border-orange-600 shadow-2xs">T</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Tarde</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-black border border-teal-755 shadow-2xs">L</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Libre</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-yellow-400 text-slate-900 flex items-center justify-center text-xs font-black border border-yellow-500 shadow-2xs">M</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Mañana</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-black border border-teal-755 shadow-2xs">V</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Vacaciones</span>
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
              <div className="w-6 h-6 rounded-md relative overflow-hidden border border-slate-200 dark:border-slate-850 shadow-2xs">
                <div className="absolute inset-0 flex items-start justify-start p-0.5 text-[8px] font-black leading-none bg-blue-600 text-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>R</div>
                <div className="absolute inset-0 flex items-end justify-end p-0.5 text-[8px] font-black leading-none bg-red-500 text-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>G</div>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">RUCOT + Guardia</span>
            </div>
          </div>

          <div className="text-[10px] md:text-[10px] font-medium text-slate-400 dark:text-slate-500">
            * Celdas con punto blanco contienen observaciones.
          </div>
        </div>
      </div>
      )}

      {/* EDIT DUTY MODAL */}
      {activeCell && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-heading">
                  Asignar Turno / Día
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium font-mono">
                  Fecha: {activeCell.date}
                </p>
              </div>
              <button 
                onClick={() => setActiveCell(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
               {/* Type Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Tipo de Guardia / Turno Principal</span>
                  {editType === 'saliente' && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-extrabold uppercase bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-900/40 animate-pulse">Saliente Automático</span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  
                  {/* Ninguno */}
                  <button
                    type="button"
                    onClick={() => setEditType('')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === '' 
                        ? "bg-slate-100 border-slate-400 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 ring-2 ring-slate-400/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-305 flex items-center justify-center text-[10px] font-black border border-slate-300">Ø</span>
                    Ninguno
                  </button>

                  {/* Guardia */}
                  <button
                    type="button"
                    onClick={() => setEditType('guardia')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'guardia' 
                        ? "bg-red-50 border-red-500 text-red-700 dark:bg-red-950/40 dark:border-red-500 dark:text-red-400 ring-2 ring-red-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-red-500 text-white flex items-center justify-center text-[10px] font-black border border-red-600">G</span>
                    Guardia
                  </button>

                  {/* Libre */}
                  <button
                    type="button"
                    onClick={() => setEditType('libre')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'libre' 
                        ? "bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-400 ring-2 ring-teal-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-[10px] font-black border border-teal-700">L</span>
                    Libre ({getAnnualFreeDaysRemaining(activeCell.residentId)} disp.)
                  </button>

                  {/* Mañana */}
                  <button
                    type="button"
                    onClick={() => setEditType('manana')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'manana' 
                        ? "bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-950/40 dark:border-yellow-500 dark:text-yellow-400 ring-2 ring-yellow-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-yellow-400 text-slate-900 flex items-center justify-center text-[10px] font-black border border-yellow-500">M</span>
                    Mañana
                  </button>

                  {/* Vacaciones */}
                  <button
                    type="button"
                    onClick={() => setEditType('vacaciones')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'vacaciones' 
                        ? "bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-400 ring-2 ring-teal-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-[10px] font-black border border-teal-700">V</span>
                    Vacaciones
                  </button>

                  {/* Curso */}
                  <button
                    type="button"
                    onClick={() => setEditType('curso')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'curso' 
                        ? "bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/40 dark:border-purple-500 dark:text-purple-400 ring-2 ring-purple-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-purple-400 text-white flex items-center justify-center text-[10px] font-black border border-purple-500">C</span>
                    Curso
                  </button>

                  {/* RUCOT */}
                  <button
                    type="button"
                    onClick={() => setEditType('rucot')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'rucot' 
                        ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-400 ring-2 ring-blue-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black border border-blue-700">R</span>
                    RUCOT
                  </button>

                  {/* RUCOT + Guardia */}
                  <button
                    type="button"
                    onClick={() => setEditType('rucot-guardia')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'rucot-guardia' 
                        ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500 dark:text-rose-400 ring-2 ring-rose-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="w-6 h-6 rounded-md relative overflow-hidden border border-slate-200 dark:border-slate-850 shadow-2xs">
                      <div className="absolute inset-0 flex items-start justify-start p-0.5 text-[8px] font-black leading-none bg-blue-600 text-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>R</div>
                      <div className="absolute inset-0 flex items-end justify-end p-0.5 text-[8px] font-black leading-none bg-red-500 text-white" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>G</div>
                    </div>
                    R + G
                  </button>

                  {/* Saliente Manual */}
                  <button
                    type="button"
                    onClick={() => setEditType('saliente-manual')}
                    className={clsx(
                      "py-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all",
                      editType === 'saliente-manual' 
                        ? "bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-400 ring-2 ring-teal-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-teal-800 text-white flex items-center justify-center text-[10px] font-black border border-teal-900">S</span>
                    Saliente M.
                  </button>

                </div>
              </div>

              {/* Tarde Option Selector */}
              <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Turno de Tarde</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Selecciona el tipo de tarde para este día.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditHasTarde(false); setEditHasTardeEspecial(false); }}
                    className={clsx(
                      "py-2 px-3 rounded-lg border font-bold text-[10px] sm:text-xs text-center cursor-pointer transition-all",
                      (!editHasTarde && !editHasTardeEspecial)
                        ? "bg-slate-100 border-slate-450 text-slate-800 dark:bg-slate-800 dark:border-slate-650 dark:text-slate-200 ring-2 ring-slate-400/25"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    Ninguna
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditHasTarde(true); setEditHasTardeEspecial(false); }}
                    className={clsx(
                      "py-2 px-3 rounded-lg border font-bold text-[10px] sm:text-xs text-center cursor-pointer transition-all",
                      (editHasTarde && !editHasTardeEspecial)
                        ? "bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/40 dark:border-orange-500 dark:text-orange-400 ring-2 ring-orange-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    Normal (+0.5)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditHasTarde(false); setEditHasTardeEspecial(true); }}
                    className={clsx(
                      "py-2 px-3 rounded-lg border font-bold text-[10px] sm:text-xs text-center cursor-pointer transition-all",
                      (!editHasTarde && editHasTardeEspecial)
                        ? "bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/40 dark:border-orange-500 dark:text-orange-400 ring-2 ring-orange-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    Especial (+1.0)
                  </button>
                </div>
              </div>

              {/* If type is Vacaciones or Curso, show date range inputs */}
              {(editType === 'vacaciones' || editType === 'curso') && (
                <div className={clsx(
                  "space-y-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-200",
                  editType === 'vacaciones'
                    ? "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/40"
                    : "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40"
                )}>
                  <label className={clsx(
                    "block text-xs font-black uppercase tracking-wider",
                    editType === 'vacaciones' ? "text-teal-800 dark:text-teal-400" : "text-blue-800 dark:text-blue-400"
                  )}>
                    {editType === 'vacaciones' ? 'Periodo de Vacaciones' : 'Periodo de Curso'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Inicio</label>
                      <input 
                        type="date"
                        required
                        value={vacationStartDate}
                        onChange={(e) => setVacationStartDate(e.target.value)}
                        className={clsx(
                          "w-full border border-slate-300 dark:border-slate-850 rounded-lg px-2 py-1.5 text-xs outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-offset-0 focus:outline-none",
                          editType === 'vacaciones' ? "focus:ring-teal-500" : "focus:ring-blue-500"
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fin</label>
                      <input 
                        type="date"
                        required
                        value={vacationEndDate}
                        onChange={(e) => setVacationEndDate(e.target.value)}
                        className={clsx(
                          "w-full border border-slate-300 dark:border-slate-850 rounded-lg px-2 py-1.5 text-xs outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-offset-0 focus:outline-none",
                          editType === 'vacaciones' ? "focus:ring-teal-500" : "focus:ring-blue-500"
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Input for Tarde / Libre / Mañana / Vacaciones */}
              {(editType !== '' || editHasTarde || editHasTardeEspecial) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Observaciones / Detalles</span>
                    <span className="text-[10px] font-normal lowercase text-slate-400">Opcional</span>
                  </label>
                  <textarea
                    rows={3}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-850 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-250 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                    placeholder={
                      editType === 'libre'
                        ? 'Ej: Asuntos propios, compensatorio, congreso...'
                        : editType === 'manana'
                        ? 'Ej: Turno de mañana ordinario...'
                        : editType === 'vacaciones'
                        ? 'Ej: Vacaciones de Navidad, vacaciones de verano...'
                        : editType === 'curso'
                        ? 'Ej: Curso AO, congreso SECOT, formación...'
                        : editType === 'guardia'
                        ? 'Ej: Guardia de traumatología general...'
                        : editHasTarde || editHasTardeEspecial
                        ? 'Ej: Quirófano de tarde, consulta, urgencias...'
                        : 'Ej: Observaciones del día...'
                    }
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-850 flex items-center justify-between gap-3">
              {(duties.some(d => d.residentId === activeCell.residentId && d.date === activeCell.date && d.type !== 'no-saliente') || editType === 'saliente') ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Asignación
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/50 dark:text-slate-450 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-teal-600 to-emerald-500 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RESIDENT VACATION REQUEST MODAL */}
      {activeCell && !canEdit && (role === 'reader' && currentResident && activeCell.residentId === currentResident.id) && (() => {
        const dateStr = activeCell.date;
        const existing = duties.find(d => d.residentId === activeCell.residentId && d.date === dateStr);
        
        const isPending = existing?.type === 'vacaciones-pendiente';
        const isConfirmed = existing?.type === 'vacaciones';
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-heading">
                    Solicitud de Vacaciones
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium font-mono">
                    Fecha: {dateStr}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveCell(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {isConfirmed ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Vacaciones Confirmadas
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Este periodo de vacaciones ya ha sido aprobado por un administrador. No puedes modificarlo ni cancelarlo. Ponte en contacto con la dirección si necesitas realizar cambios.
                    </p>
                  </div>
                ) : isPending ? (
                  <div className="space-y-4">
                    <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-150 dark:border-teal-900/40 p-4 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                      <p className="text-xs font-bold text-teal-800 dark:text-teal-400 flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-4 h-4" /> Solicitud Pendiente de Aprobación
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Has solicitado vacaciones para este día. La solicitud está siendo revisada por un administrador.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        let curr = new Date(dateStr);
                        const daysToDelete: string[] = [dateStr];
                        
                        for (let i = 0; i < 60; i++) {
                          const check = new Date(curr);
                          check.setDate(check.getDate() - 1);
                          const checkStr = check.toISOString().split('T')[0];
                          if (duties.some(d => d.residentId === activeCell.residentId && d.date === checkStr && d.type === 'vacaciones-pendiente')) {
                            daysToDelete.push(checkStr);
                            curr = check;
                          } else {
                            break;
                          }
                        }
                        curr = new Date(dateStr);
                        for (let i = 0; i < 60; i++) {
                          const check = new Date(curr);
                          check.setDate(check.getDate() + 1);
                          const checkStr = check.toISOString().split('T')[0];
                          if (duties.some(d => d.residentId === activeCell.residentId && d.date === checkStr && d.type === 'vacaciones-pendiente')) {
                            daysToDelete.push(checkStr);
                            curr = check;
                          } else {
                            break;
                          }
                        }
                        
                        const idsToDelete = daysToDelete.map(dStr => `${activeCell.residentId}_${dStr}`);
                        await removeDutiesBulk(idsToDelete);
                        setActiveCell(null);
                      }}
                      className="w-full bg-red-650 hover:bg-red-750 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer text-center"
                    >
                      Cancelar Solicitud de Vacaciones
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1">
                      <label className="block text-xs font-black text-teal-800 dark:text-teal-400 uppercase tracking-wider">
                        Seleccionar Periodo de Vacaciones
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Inicio</label>
                          <input 
                            type="date"
                            required
                            value={vacationStartDate}
                            onChange={(e) => setVacationStartDate(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-850 rounded-lg px-2 py-1.5 text-xs outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fin</label>
                          <input 
                            type="date"
                            required
                            value={vacationEndDate}
                            onChange={(e) => setVacationEndDate(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-850 rounded-lg px-2 py-1.5 text-xs outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Observaciones / Detalles</span>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Ej: Vacaciones de verano..."
                        className="w-full border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none h-20 resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        const start = new Date(vacationStartDate);
                        const end = new Date(vacationEndDate);
                        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                          alert('Por favor, introduce un rango de fechas válido (Inicio menor o igual a Fin).');
                          return;
                        }
                        let currDate = new Date(start);
                        const assignments = [];
                        while (currDate <= end) {
                          const dStr = currDate.toISOString().split('T')[0];
                          assignments.push({
                            residentId: activeCell.residentId,
                            date: dStr,
                            type: 'vacaciones-pendiente' as const,
                            notes: editNotes
                          });
                          currDate.setDate(currDate.getDate() + 1);
                        }
                        await assignDutiesBulk(assignments);

                        const res = residents.find(r => r.id === activeCell.residentId);
                        const resName = res ? `${res.firstName} ${res.lastName}` : 'Residente';
                        const startFormatted = vacationStartDate.split('-').reverse().join('/');
                        const endFormatted = vacationEndDate.split('-').reverse().join('/');
                        const periodStr = startFormatted === endFormatted ? startFormatted : `${startFormatted} al ${endFormatted}`;
                        const notesStr = editNotes.trim() ? `\n<b>Notas:</b> ${editNotes.trim()}` : '';
                        
                        const msg = `🔔 <b>Nueva solicitud de vacaciones</b>\n<b>Residente:</b> ${resName}\n<b>Periodo:</b> ${periodStr}${notesStr}`;
                        sendTelegramMessage(msg).catch(err => console.error('Error sending telegram notification:', err));

                        alert('Tu solicitud de vacaciones ha sido registrada y queda pendiente de aprobación por el administrador.');
                        setActiveCell(null);
                      }}
                      className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer text-center"
                    >
                      Enviar Solicitud de Vacaciones
                    </button>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-850 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-655 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Liquidation Confirmation Modal */}
      {showLiquidateConfirm && selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-heading">
                  Liquidar Mes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLiquidateConfirm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                ¿Estás seguro de que deseas liquidar el mes de <strong className="text-slate-800 dark:text-slate-200 font-black">{selectedMonth.label}</strong>?
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-xl space-y-2">
                <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Información Importante
                </h4>
                <ul className="text-[10px] text-amber-700 dark:text-amber-300 font-medium list-disc list-inside space-y-1">
                  <li>Se cerrará y sellará el mes de forma inmutable.</li>
                  <li><strong>Ya no se permitirán modificaciones</strong> en las guardias ni turnos de este mes.</li>
                  <li>Desaparecerá de la pizarra activa de guardias y turnos.</li>
                  <li>Quedará guardado permanentemente en el historial de liquidaciones del administrador.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-850 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLiquidateConfirm(false)}
                disabled={isLiquidating}
                className="px-4 py-2 text-xs font-bold text-slate-655 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLiquidate}
                disabled={isLiquidating}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/55 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                {isLiquidating ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Liquidando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Sí, Liquidar Mes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DutiesPlanner;
