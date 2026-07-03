import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Calendar, AlertCircle, Loader2, User, X, Download } from 'lucide-react';
import clsx from 'clsx';

const PREFIXES_TO_REMOVE = ['dr.', 'dra.', 'dr', 'dra'];

const normalizeName = (name: string | undefined | null): string => {
  if (!name) return '';
  
  let clean = name.trim();
  const lower = clean.toLowerCase();
  for (const prefix of PREFIXES_TO_REMOVE) {
    if (lower.startsWith(prefix)) {
      clean = clean.slice(prefix.length).trim();
      break;
    }
  }
  
  // Quitar puntos
  clean = clean.split('.').join('');
  
  // Separar y volver a unir para quitar múltiples espacios
  clean = clean.split(/\s+/).join(' ');
  
  return clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const mapNormalizedToFriendlyName = (normName: string, originalName: string | undefined | null): string => {
  if (!originalName) return '';
  
  // 1. Coincidencias específicas por prefijo más largo
  if (normName.startsWith('alejandro lin')) return 'Liñán';
  if (normName.startsWith('alejandro mon')) return 'Monge';
  if (normName.startsWith('antonio alg')) return 'Algar';
  if (normName.startsWith('antonio ort')) return 'Ortiz';
  if (normName.startsWith('antonio sol')) return 'Soler';
  if (normName.startsWith('jose m per')) return 'Pérez';
  if (normName.startsWith('jose ramon')) return 'Pepe';
  if (normName.startsWith('jose maria per')) return 'Pérez';
  if (normName.startsWith('laura piedad')) return 'Laura';
  if (normName.startsWith('libertad cac')) return 'Liber';
  
  // 2. Coincidencias por el primer nombre (si es único)
  if (normName.startsWith('manolo')) return 'Centeno';
  if (normName.startsWith('beatriz')) return 'Grijalvo';
  if (normName.startsWith('bosco')) return 'Bosco';
  if (normName.startsWith('cesar')) return 'César';
  if (normName.startsWith('eduardo')) return 'Pereira';
  if (normName.startsWith('francisco')) return 'Barrionuevo';
  if (normName.startsWith('guillermo')) return 'Estrada';
  if (normName.startsWith('jaime')) return 'Jaime';
  if (normName.startsWith('jairo')) return 'Jairo';
  if (normName.startsWith('javier')) return 'Canario';
  if (normName.startsWith('laura')) return 'Laura';
  if (normName.startsWith('libertad')) return 'Liber';
  if (normName.startsWith('lorena')) return 'Rial';
  if (normName.startsWith('manuel')) return 'Cintado';
  if (normName.startsWith('miguel')) return 'Villa';
  if (normName.startsWith('miriam')) return 'Barcia';
  if (normName.startsWith('monica')) return 'Mónica';
  if (normName.startsWith('sara')) return 'González';
  if (normName.startsWith('veronica')) return 'Delgado';
  if (normName.startsWith('fernando')) return 'Baquero';
  if (normName.startsWith('silvia')) return 'Expósito';

  // Si no hay regla, devolvemos el nombre original sin Dr./Dra.
  let cleanOriginal = originalName.trim();
  const lowerOriginal = cleanOriginal.toLowerCase();
  for (const prefix of PREFIXES_TO_REMOVE) {
    if (lowerOriginal.startsWith(prefix)) {
      cleanOriginal = cleanOriginal.slice(prefix.length).trim();
      break;
    }
  }
  return cleanOriginal;
};

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PALETA DE COLORES (Google Drive) — Reglas del servicio:
//  🟥 Guardia GPF       → Rojo      #D93025
//  🌸 Localizado GLO    → Rosa      #E52592
//  🟨 Quiróf. Mañana / Diferida Mañana → Amarillo #F9AB00
//  🟧 Quiróf. Tarde  / Diferida Tarde  → Naranja  #E37400
//  🟦 Consulta          → Azul      #1A73E8
//  🟪 Curso/Congreso    → Morado    #8430CE
//  🟩 Planta            → Verde     #0F9D58
//  ⬜ Gestión / otros   → Gris      #5F6368
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Badges sólidos — cuadrícula del calendario
const getShiftBadgeStyle = (status: string, shiftCode: string) => {
  let label = shiftCode;

  if (shiftCode === 'QMU') label = 'Diferida M';
  else if (shiftCode === 'QTU') label = 'Diferida T';
  else if (shiftCode.startsWith('QM')) label = 'Quirof M';
  else if (shiftCode.startsWith('QT')) label = 'Quirof T';
  else if (shiftCode === 'CM' || shiftCode.startsWith('CM')) label = 'Cons M';
  else if (shiftCode === 'CT' || shiftCode.startsWith('CT')) label = 'Cons T';
  else if (shiftCode === 'PLA') label = 'Planta';
  else if (shiftCode === 'Ges') label = 'Gestión';
  else if (shiftCode === 'Cur' || shiftCode === 'C') label = 'Curso';
  else if (shiftCode === 'GLO') label = 'Localiz';
  else if (shiftCode === 'GPF' || shiftCode === 'G') label = 'Guardia';
  else if (shiftCode === 'S' || shiftCode === 'Saliente') label = 'Saliente';

  switch (status) {
    case 'De Guardia':
      return { bg: 'bg-[#D93025] text-white', label };         // 🟥 Rojo
    case 'Localizado':
      return { bg: 'bg-[#E52592] text-white', label };         // 🌸 Rosa
    case 'Quirófano Mañana':
    case 'Diferida Mañana':
      return { bg: 'bg-[#F9AB00] text-slate-900', label };     // 🟨 Amarillo
    case 'Quirófano Tarde':
    case 'Diferida Tarde':
      return { bg: 'bg-[#E37400] text-white', label };         // 🟧 Naranja
    case 'Consulta Mañana':
      return { bg: 'bg-[#1A73E8] text-white', label };         // 🟦 Azul
    case 'Consulta Tarde':
      return { bg: 'bg-[#E37400] text-white', label };         // 🟧 Naranja (igual que Quiróf. Tarde)
    case 'Curso/Congreso':
      return { bg: 'bg-[#8430CE] text-white', label };         // 🟪 Morado
    case 'Planta':
      return { bg: 'bg-[#0F9D58] text-white', label };         // 🟩 Verde
    case 'Gestión':
      return { bg: 'bg-[#5F6368] text-white', label };         // ⬜ Gris
    case 'Saliente':
      return { bg: 'bg-[#E37400] text-white', label };         // Saliente → naranja oscuro
    default:
      return { bg: 'bg-[#5F6368] text-white', label };         // ⬜ Gris
  }
};

// Badges con tinte — modal de detalle de día
const getShiftBadgeClasses = (status: string) => {
  switch (status) {
    case 'De Guardia':
      return 'bg-[#D93025]/15 text-[#D93025] border border-[#D93025]/30';    // 🟥 Rojo
    case 'Localizado':
      return 'bg-[#E52592]/15 text-[#E52592] border border-[#E52592]/30';    // 🌸 Rosa
    case 'Quirófano Mañana':
    case 'Diferida Mañana':
      return 'bg-[#F9AB00]/20 text-[#b87800] dark:text-[#fbbf24] border border-[#F9AB00]/35'; // 🟨 Amarillo
    case 'Quirófano Tarde':
    case 'Diferida Tarde':
      return 'bg-[#E37400]/15 text-[#E37400] border border-[#E37400]/30';    // 🟧 Naranja
    case 'Consulta Mañana':
      return 'bg-[#1A73E8]/15 text-[#1A73E8] border border-[#1A73E8]/30';   // 🟦 Azul
    case 'Consulta Tarde':
      return 'bg-[#E37400]/15 text-[#E37400] border border-[#E37400]/30';   // 🟧 Naranja
    case 'Curso/Congreso':
      return 'bg-[#8430CE]/15 text-[#8430CE] border border-[#8430CE]/30';   // 🟪 Morado
    case 'Planta':
      return 'bg-[#0F9D58]/15 text-[#0F9D58] border border-[#0F9D58]/30';   // 🟩 Verde
    case 'Gestión':
      return 'bg-[#5F6368]/10 text-[#5F6368] border border-[#5F6368]/25';   // ⬜ Gris
    default:
      return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
  }
};

// Orden de prioridad dentro de cada día:
//   0  → Guardia         (GPF / De Guardia)
//   1  → Planta          (PLA / Planta)
//   ── Actividad de mañana ──
//   2  → Diferida Mañana (QMU)
//   3  → Quirófano Mañana (QM1, QM2…)
//   4  → Consulta Mañana (CM)
//   ── Actividad de tarde ──
//   5  → Diferida Tarde  (QTU)
//   6  → Quirófano Tarde (QT1, QT2…)
//   7  → Consulta Tarde  (CT)
//   ── Resto ──
//   8  → Curso / Congreso
//   9  → Gestión
//   10 → Localizado      (GLO) ← siempre al final
const shiftPriority = (s: AttendingShift): number => {
  const st = s.status;
  const sh = s.shift ?? '';

  if (st === 'De Guardia'      || sh === 'GPF')                    return 0;
  if (st === 'Planta'          || sh === 'PLA')                    return 1;
  if (st === 'Diferida Mañana' || sh === 'QMU')                    return 2;
  if (st === 'Quirófano Mañana'|| sh.startsWith('QM'))             return 3;
  if (st === 'Consulta Mañana' || sh === 'CM' || sh.startsWith('CM')) return 4;
  if (st === 'Diferida Tarde'  || sh === 'QTU')                    return 5;
  if (st === 'Quirófano Tarde' || sh.startsWith('QT'))             return 6;
  if (st === 'Consulta Tarde'  || sh === 'CT' || sh.startsWith('CT')) return 7;
  if (st === 'Curso/Congreso'  || sh === 'Cur' || sh === 'C')      return 8;
  if (st === 'Gestión'         || sh === 'Ges')                    return 9;
  if (st === 'Localizado'      || sh === 'GLO')                    return 10;
  return 5; // desconocido → en el bloque de tarde
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
  const now = new Date();
  
  // Estados para filtros de resaltado
  const [highlightedNames, setHighlightedNames] = useState<Set<string>>(new Set());
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());

  // Estado para ver solo guardias
  const [showOnlyGuardias, setShowOnlyGuardias] = useState(false);

  // Estado para ver Diferida (Guardia + Planta + Diferida Mañana + Diferida Tarde)
  const [showDiferida, setShowDiferida] = useState(false);

  // Estado para controlar apertura de modal de detalle
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de apertura de desplegables de filtros
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

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
          const rawData = doc.data() as AttendingDayDoc;
          const mappedSchedule = (rawData.schedule || []).map(s => {
            const norm = normalizeName(s.name);
            const finalName = mapNormalizedToFriendlyName(norm, s.name);

            let newUnit = (s.unit || '').trim();
            
            // Unificar las unidades relacionadas con Miembro Superior
            const lowerUnit = newUnit.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (
              lowerUnit === 'mano' || 
              lowerUnit === 'hombro' || 
              lowerUnit === 'mano y codo' || 
              lowerUnit === 'mano y hombro' ||
              lowerUnit === 'miembro superior' ||
              lowerUnit === 'miembros superiores'
            ) {
              newUnit = 'Miembros Superiores';
            }

            const lowerName = finalName.toLowerCase();
            if ((lowerName.includes('perez') || lowerName.includes('pérez')) && 
                (lowerName.includes('jose') || lowerName.includes('josé')) && 
                (lowerName.includes('maria') || lowerName.includes('maría'))) {
              newUnit = 'Trauma';
            } else if (lowerName.includes('veronica') || lowerName.includes('verónica')) {
              newUnit = 'Trauma';
            }
            return { ...s, name: finalName, unit: newUnit };
          });

          docs[doc.id] = {
            ...rawData,
            schedule: mappedSchedule
          };
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
    setShowDiferida(false);
    setShowOnlyGuardias(false);
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
    
    // Aplicar filtros de tipo de turno
    let filtered = rawPlan;
    if (showOnlyGuardias) {
      filtered = rawPlan.filter(s => s.status === 'De Guardia' || s.shift === 'GPF');
    } else if (showDiferida) {
      filtered = rawPlan.filter(s =>
        s.status === 'De Guardia' ||
        s.shift === 'GPF' ||
        s.status === 'Planta' ||
        s.shift === 'PLA' ||
        s.status === 'Diferida Mañana' ||
        s.shift === 'QMU' ||
        s.status === 'Diferida Tarde' ||
        s.shift === 'QTU'
      );
    }

    // Filtrar por médicos o unidades seleccionadas
    const hasActiveFilters = highlightedNames.size > 0 || selectedUnits.size > 0;
    if (hasActiveFilters) {
      filtered = filtered.filter(s => {
        const matchesName = highlightedNames.has(s.name);
        const matchesUnit = s.unit && selectedUnits.has(s.unit);
        return matchesName || matchesUnit;
      });
    }

    return [...filtered].sort((a, b) => shiftPriority(a) - shiftPriority(b));
  }, [scheduleData, currentDate, showOnlyGuardias, showDiferida, highlightedNames, selectedUnits]);

  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    const element = document.getElementById('calendar-to-pdf');
    if (!element) return;
    
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const originalStyle = element.style.overflow;
      element.style.overflow = 'visible';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0b1329' : '#ffffff',
        windowWidth: 1400
      });
      
      element.style.overflow = originalStyle;
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgWidthPdf = imgWidth * ratio;
      const imgHeightPdf = imgHeight * ratio;
      const imgX = (pdfWidth - imgWidthPdf) / 2;
      const imgY = (pdfHeight - imgHeightPdf) / 2;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidthPdf, imgHeightPdf);
      
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthLabel = monthNames[currentYearMonth.month] || 'Mes';
      pdf.save(`Planificacion_Adjuntos_${monthLabel}_${currentYearMonth.year}.pdf`);
    } catch (error) {
      console.error('Error generando el PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 w-full max-w-[98%] xl:max-w-[96%] mx-auto px-2 sm:px-4 pb-10">
      
      {/* BLOQUE DE FILTROS COLAPSABLE */}
      <div className="bg-white dark:bg-slate-900/55 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase text-teal-650 dark:text-teal-400 bg-teal-555/10 dark:bg-teal-400/5 border border-teal-500/20 hover:bg-teal-500/15 dark:hover:bg-teal-400/10 transition-all cursor-pointer select-none"
            >
              <span>Filtros de Búsqueda</span>
              <span>{isFiltersExpanded ? '▲ Colapsar' : '▼ Expandir'}</span>
            </button>

            {/* Resumen de filtros activos cuando está colapsado */}
            {!isFiltersExpanded && (highlightedNames.size > 0 || selectedUnits.size > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Activos:</span>
                {Array.from(selectedUnits).map(u => (
                  <span key={u} className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-655 dark:text-teal-400 text-[9px] font-black border border-teal-500/20">{u}</span>
                ))}
                {Array.from(highlightedNames).map(n => (
                  <span key={n} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-655 dark:text-emerald-450 text-[9px] font-black border border-emerald-500/20">{n.replace(/(Dr.|Dra.)\s*/g, '')}</span>
                ))}
              </div>
            )}
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

        {isFiltersExpanded && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in duration-200">

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
      )}
      </div>

      {/* BLOQUE DE CALENDARIO (ABAJO - ANCHO COMPLETO) */}
      <div id="calendar-to-pdf" className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col overflow-hidden">
        
        {/* Cabecera del calendario */}
        <div className="px-6 py-4 lg:px-4 lg:py-2.5 border-b border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-2 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30 text-teal-650 dark:text-teal-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-heading truncate">
                Calendario del Servicio
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] lg:text-[9px] text-slate-505 dark:text-slate-400 font-medium">
                  Turnos, guardias y actividades programadas.
                </p>
                <span className="text-[7.5px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350 font-black px-1.5 py-0.5 rounded uppercase leading-none">
                  Build v2.5 (Remap Activo)
                </span>
              </div>
            </div>
          </div>

          <div data-html2canvas-ignore="true" className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
            {/* Botón Descargar PDF */}
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border cursor-pointer select-none bg-teal-655 hover:bg-teal-700 text-white border-teal-750 shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            {/* Solo Guardias Toggle */}
            <button
              onClick={() => {
                setShowOnlyGuardias(!showOnlyGuardias);
                if (!showOnlyGuardias) setShowDiferida(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer select-none',
                showOnlyGuardias
                  ? 'bg-[#D93025] text-white border-red-700 shadow-md shadow-red-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-400 border-slate-250/50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full', showOnlyGuardias ? 'bg-white animate-pulse' : 'bg-[#D93025]')} />
              Solo Guardias
            </button>

            {/* Marcar Diferida Toggle */}
            <button
              onClick={() => {
                setShowDiferida(!showDiferida);
                if (!showDiferida) setShowOnlyGuardias(false);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer select-none',
                showDiferida
                  ? 'bg-[#8430CE] text-white border-purple-800 shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-400 border-slate-250/50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full', showDiferida ? 'bg-white animate-pulse' : 'bg-[#8430CE]')} />
              Marcar Diferida
            </button>

            {/* Pestañas de Meses en cabecera */}
            <div className="flex items-center gap-1 bg-slate-150 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-x-auto max-w-full">
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
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-teal-650 to-emerald-500 text-white shadow-2xs"
                        : "text-slate-655 hover:bg-slate-250/50 hover:text-slate-850 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-white"
                    )}
                  >
                    {tab.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 bg-slate-50/10">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">Cargando Cuadrante...</p>
          </div>
        ) : (
          <>
            {/* VISTA MÓVIL (Nativa CSS - visible en móvil y oculta en pantallas md o más grandes) */}
            <div className="flex-grow flex flex-col min-h-0 bg-white dark:bg-slate-900 md:hidden">
            {/* Carrusel Deslizable Horizontalmente */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
                {calendarDays.filter(Boolean).map((day) => {
                  const dayObj = day!;
                  const isSelected = dayObj.dateKey === currentDate;
                  const isToday = dayObj.dateKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  
                  // Calcular día de la semana para la cabecera
                  const dateObj = new Date(currentYearMonth.year, currentYearMonth.month, dayObj.dayNumber);
                  const dayOfWeekIdx = (dateObj.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0, domingo=6
                  const dayOfWeekName = DAYS_SHORT[dayOfWeekIdx];
                  const isWeekend = dayOfWeekIdx === 5 || dayOfWeekIdx === 6;
                  
                  return (
                    <button
                      key={dayObj.dateKey}
                      onClick={() => setCurrentDate(dayObj.dateKey)}
                      className={clsx(
                        "flex flex-col items-center justify-center min-w-[50px] py-2 rounded-xl transition-all duration-200 snap-center select-none cursor-pointer border",
                        isSelected
                          ? "bg-[#1a73e8] text-white border-[#1a73e8] shadow-sm font-extrabold"
                          : isToday
                            ? "bg-teal-50 dark:bg-teal-950/20 text-teal-650 dark:text-teal-400 border-teal-200 dark:border-teal-900/40"
                            : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900",
                        isWeekend && !isSelected && "text-red-500"
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider leading-none opacity-80">{dayOfWeekName}</span>
                      <span className="text-sm font-extrabold leading-none mt-1.5">{dayObj.dayNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Listado de Actividades del Día Seleccionado */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-955/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Planificación: {getFriendlyDate(currentDate)}
                </span>
              </div>

              {(() => {
                const daySchedule = scheduleData[currentDate]?.schedule || [];
                const dayGuardias = daySchedule.filter(s => s.status === 'De Guardia' || s.shift === 'GPF');
                
                // Calcular activeShifts según filtros
                const hasActiveFilters = highlightedNames.size > 0 || selectedUnits.size > 0;
                let activeShifts = daySchedule;
                if (showOnlyGuardias) {
                  activeShifts = dayGuardias;
                } else if (showDiferida) {
                  activeShifts = daySchedule.filter(s =>
                    s.status === 'De Guardia' || s.shift === 'GPF' ||
                    s.status === 'Planta'     || s.shift === 'PLA' ||
                    s.status === 'Diferida Mañana' || s.shift === 'QMU' ||
                    s.status === 'Diferida Tarde'  || s.shift === 'QTU'
                  );
                }
                
                const filteredShifts = hasActiveFilters
                  ? activeShifts.filter(s => highlightedNames.has(s.name) || (s.unit && selectedUnits.has(s.unit)))
                  : activeShifts;

                const matchingShifts = [...filteredShifts].sort((a, b) => shiftPriority(a) - shiftPriority(b));

                if (matchingShifts.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs">
                      <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">Sin Asignaciones</p>
                      <p className="text-[9.5px] text-slate-450 dark:text-slate-500 mt-0.5 max-w-[200px] leading-relaxed">
                        No se han registrado turnos o no coinciden con los filtros aplicados para este día.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {matchingShifts.map((s, idx) => {
                      const { bg, label } = getShiftBadgeStyle(s.status, s.shift);
                      
                      return (
                        <div
                          key={idx}
                          className="flex flex-col p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs transition-all hover:border-teal-500/20 gap-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-400/10 flex items-center justify-center border border-teal-500/20 shrink-0">
                                <User className="w-4 h-4 text-teal-650 dark:text-teal-450" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-150 leading-tight">
                                  {s.name}
                                </h4>
                                <p className="text-[9.5px] text-slate-450 dark:text-slate-500 font-bold leading-none mt-1">
                                  {s.unit || 'Sin Unidad'}
                                </p>
                              </div>
                            </div>
                            
                            <span className={clsx(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wide shadow-2xs border border-black/5",
                              bg
                            )}>
                              {label}
                            </span>
                          </div>

                          <div className="text-[9.5px] text-slate-500 dark:text-slate-450 font-semibold px-2.5 py-1.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl flex justify-between items-center border border-slate-100/50 dark:border-slate-850/50">
                            <span>Turno: <span className="font-bold text-slate-700 dark:text-slate-200">{s.shift}</span></span>
                            <span>Estado: <span className="font-bold text-slate-750 dark:text-slate-250">{s.status}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            </div>

            {/* VISTA DESKTOP (Nativa CSS - visible en 768px o más, oculta en móvil) */}
            <div className="hidden md:flex p-3 w-full flex-1 flex flex-col justify-between min-h-0 bg-slate-50/50 dark:bg-slate-950/20">
            <div className="w-full flex flex-col flex-1 min-h-0">
              
              {/* Cabecera de Días (L, M, X, J, V, S, D) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {DAYS_SHORT.map((d, index) => (
                  <div 
                    key={d} 
                    className={clsx(
                      "text-center py-1 text-xs font-black uppercase tracking-wider",
                      index >= 5 ? "text-red-500" : "text-slate-450 dark:text-slate-500"
                    )}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Cuadrícula de Calendario Completa */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="h-[7.5rem] bg-slate-100/30 dark:bg-slate-900/10 rounded-xl border border-transparent opacity-40" />;
                  }

                  const hasData = !!scheduleData[day.dateKey];
                  const daySchedule = scheduleData[day.dateKey]?.schedule || [];
                  const dayGuardias = daySchedule.filter(s => s.status === 'De Guardia' || s.shift === 'GPF');
                  
                  const isSelected = day.dateKey === currentDate;
                  const isToday = day.dateKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  
                  const cellDayOfWeek = (idx % 7);
                  const isWeekend = cellDayOfWeek === 5 || cellDayOfWeek === 6;
                  const isRedDay = isWeekend;

                  // Calcular activeShifts según el filtro de tipo de turno activo
                  const hasActiveFilters = highlightedNames.size > 0 || selectedUnits.size > 0;
                  let activeShifts = daySchedule;
                  if (showOnlyGuardias) {
                    activeShifts = dayGuardias;
                  } else if (showDiferida) {
                    activeShifts = daySchedule.filter(s =>
                      s.status === 'De Guardia' || s.shift === 'GPF' ||
                      s.status === 'Planta'     || s.shift === 'PLA' ||
                      s.status === 'Diferida Mañana' || s.shift === 'QMU' ||
                      s.status === 'Diferida Tarde'  || s.shift === 'QTU'
                    );
                  }
                  
                  const filteredShifts = hasActiveFilters
                    ? activeShifts.filter(s => highlightedNames.has(s.name) || (s.unit && selectedUnits.has(s.unit)))
                    : activeShifts;

                  // Ordenar: 1º Guardia, 2º Planta, 3º resto, 4º Localizado
                  const matchingShifts = [...filteredShifts].sort((a, b) => shiftPriority(a) - shiftPriority(b));

                  const isCellEmpty = matchingShifts.length === 0;

                  return (
                    <button
                      key={day.dateKey}
                      onClick={() => {
                        setCurrentDate(day.dateKey);
                        setIsModalOpen(true);
                      }}
                      className={clsx(
                        "rounded-xl p-1 h-[7.5rem] overflow-hidden flex flex-col justify-start items-stretch border transition-all duration-200 relative group text-left select-none shadow-xs",
                        isCellEmpty
                          ? "bg-[#f1f5f9]/20 dark:bg-slate-955/5 border-slate-200/30 dark:border-slate-800/20 opacity-70"
                          : "bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:shadow-xs",
                        isRedDay && !isCellEmpty && "bg-red-50/5 dark:bg-red-950/5",
                        isToday && "ring-2 ring-teal-500 dark:ring-teal-400 border-transparent bg-teal-500/5 dark:bg-teal-950/10 shadow-sm",
                        isSelected && "ring-2 ring-orange-500 dark:ring-orange-400 border-transparent bg-orange-500/5 dark:bg-orange-950/10 shadow-sm"
                      )}
                    >
                      {/* Número del día */}
                      <div className="flex justify-between items-center w-full">
                        <span className={clsx(
                          "text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none text-center min-w-[18px] flex items-center justify-center",
                          isToday 
                            ? "bg-gradient-to-tr from-teal-650 to-emerald-505 text-white shadow-xs font-extrabold" 
                            : isRedDay 
                              ? "text-red-505" 
                              : "text-slate-800 dark:text-slate-200"
                        )}>
                          {day.dayNumber}
                        </span>
                      </div>

                      {/* Lista de Badges de Actividades */}
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden pr-0.5 mt-1">
                        {matchingShifts.slice(0, 4).map((s, si) => {
                          const { bg, label } = getShiftBadgeStyle(s.status, s.shift);
                          const shortName = s.name.replace(/(Dr\.|Dra\.)\s*/g, '').split(' ').slice(0, 1).join('');
                          const badgeText = s.name ? `${label}: ${shortName}` : label;
                          
                          return (
                            <span
                              key={si}
                              className={clsx(
                                "text-[8.5px] font-black uppercase rounded py-[3px] px-1.5 text-center truncate leading-normal shadow-2xs border border-black/55",
                                bg
                              )}
                            >
                              {badgeText}
                            </span>
                          );
                        })}
                        {matchingShifts.length > 4 && (
                          <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-550 text-center block w-full uppercase tracking-wider py-0.5 bg-slate-100 dark:bg-slate-850 rounded leading-none">
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
          </div>
        </>
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
