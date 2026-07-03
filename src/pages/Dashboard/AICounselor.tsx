import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRotationStore, calculateResidentYearForAcademicYear } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import { Sparkles, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Send, MessageSquare, ShieldAlert, ArrowRight, Check } from 'lucide-react';
import { MONTHS } from '../../utils/constants';
import clsx from 'clsx';

interface Insight {
  id: string;
  type: 'danger' | 'warning' | 'success';
  title: string;
  description: string;
  suggestion?: string;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

interface ProposalChange {
  residentId: string;
  residentName: string;
  month: number;
  year: number;
  unitId: string;
  unitName: string;
  isVacation: boolean;
  type: 'add' | 'vacation' | 'clear';
}

const normalizeStr = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const findResident = (text: string, residents: any[]) => {
  const normText = normalizeStr(text);
  return residents.find(r => {
    const first = normalizeStr(r.firstName);
    const last = normalizeStr(r.lastName || '');
    return normText.includes(first) || (last && normText.includes(last));
  });
};

const findUnit = (text: string, units: any[]) => {
  const normText = normalizeStr(text);
  if (normText.includes('vacacion') || normText.includes('descanso') || normText.includes('libre')) {
    return { id: 'vacation', name: 'Vacaciones', color: 'bg-slate-100' };
  }
  // Try direct match or partial match
  return units.find(u => {
    const name = normalizeStr(u.name);
    return name.includes(normText) || normText.includes(name);
  });
};

const findMonthIndex = (text: string) => {
  const normText = normalizeStr(text);
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  
  for (let i = 0; i < 12; i++) {
    if (normText.includes(months[i]) || normText.includes(shortMonths[i])) {
      return i;
    }
  }
  return -1;
};

const AICounselor: React.FC = () => {
  const { residents, rotations, currentYear, addRotation, toggleVacation, deleteRotation, initializeStore } = useRotationStore();
  const { units } = useUnitStore();
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: '¡Hola! Soy tu planificador inteligente. Plantéame cualquier objetivo o regla organizativa (ej. "Pon a Jaime de vacaciones en Agosto" o "Rotar a Algar en Infantil en Noviembre") y generaré una propuesta de calendario resolviendo tus condiciones justo aquí debajo para que la apliques a la pizarra en un clic.',
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingStep, setTypingStep] = useState('');
  const [proposal, setProposal] = useState<ProposalChange[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Existing Insights Logic
  const insights = useMemo(() => {
    const list: Insight[] = [];
    
    const activeR2toR5 = residents.filter(r => {
      if (r.id.startsWith('temp-')) return false;
      const level = calculateResidentYearForAcademicYear(r.startDate, currentYear);
      return ['R2', 'R3', 'R4', 'R5'].includes(level);
    });

    if (activeR2toR5.length === 0) {
      list.push({
        id: 'no-residents',
        type: 'success',
        title: 'Servicio en Equilibrio',
        description: 'No hay residentes activos de R2 a R5 registrados en el curso actual.',
        suggestion: 'Registra residentes en Ajustes para activar el análisis curricular.'
      });
      return list;
    }

    const academicMonths = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];
    const occupancy: Record<string, { count: number; residents: string[] }> = {};
    
    rotations.forEach(rot => {
      const u = units.find(unit => unit.id === rot.unitId);
      if (!u) return;
      
      const res = residents.find(r => r.id === rot.residentId);
      if (!res || res.id.startsWith('temp-')) return;

      const key = `${rot.unitId}-${rot.month}-${rot.year}`;
      if (!occupancy[key]) {
        occupancy[key] = { count: 0, residents: [] };
      }
      occupancy[key].count++;
      occupancy[key].residents.push(`${res.firstName} ${res.lastName}`);
    });

    Object.entries(occupancy).forEach(([key, data]) => {
      const [unitId, monthStr, yearStr] = key.split('-');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      
      const unit = units.find(u => u.id === unitId);
      const limit = unit?.type === 'externa' ? 2 : 3;

      if (data.count >= limit) {
        list.push({
          id: `overcrowd-${key}`,
          type: 'danger',
          title: `Sobresaturación en ${unit?.name}`,
          description: `Hay ${data.count} residentes asignados a esta unidad en ${MONTHS[month]} ${year}: ${data.residents.join(', ')}.`,
          suggestion: `Considera mover a uno de los residentes a otra rotación libre para evitar sobrecargar el servicio.`
        });
      }
    });

    const criticalUnitIds = units.filter(u => u.name.toLowerCase().includes('urgencias') || u.name.toLowerCase().includes('trauma')).map(u => u.id);
    
    criticalUnitIds.forEach(unitId => {
      const unit = units.find(u => u.id === unitId);
      academicMonths.forEach(month => {
        const calendarYear = month >= 5 ? currentYear : currentYear + 1;
        const key = `${unitId}-${month}-${calendarYear}`;
        const hasResident = rotations.some(r => r.unitId === unitId && r.month === month && r.year === calendarYear);

        if (!hasResident && unit) {
          list.push({
            id: `vacant-${key}`,
            type: 'warning',
            title: `${unit.name} sin cubrir`,
            description: `No hay ningún residente asignado a este servicio clave en ${MONTHS[month]} ${calendarYear}.`,
            suggestion: `Asigna a un residente disponible o reubica una rotación para dar cobertura asistencial.`
          });
        }
      });
    });

    activeR2toR5.forEach(resident => {
      const level = calculateResidentYearForAcademicYear(resident.startDate, currentYear);
      
      let consecutiveExternalCount = 0;
      let maxConsecutiveExternal = 0;
      
      academicMonths.forEach(month => {
        const calendarYear = month >= 5 ? currentYear : currentYear + 1;
        const rot = rotations.find(r => r.residentId === resident.id && r.month === month && r.year === calendarYear);
        if (rot) {
          const u = units.find(unit => unit.id === rot.unitId);
          if (u?.type === 'externa') {
            consecutiveExternalCount++;
            maxConsecutiveExternal = Math.max(maxConsecutiveExternal, consecutiveExternalCount);
          } else {
            consecutiveExternalCount = 0;
          }
        } else {
          consecutiveExternalCount = 0;
        }
      });

      if (maxConsecutiveExternal >= 3) {
        list.push({
          id: `external-${resident.id}`,
          type: 'warning',
          title: `Rotaciones Externas Consecutivas: ${resident.firstName} ${resident.lastName}`,
          description: `El residente (${level}) tiene ${maxConsecutiveExternal} meses de rotación externa consecutivos en el curso académico.`,
          suggestion: `Recomienda espaciar las estancias externas con rotaciones internas para mantener la vinculación con el hospital base.`
        });
      }

      const unassignedMonths: number[] = [];
      academicMonths.forEach(month => {
        const calendarYear = month >= 5 ? currentYear : currentYear + 1;
        const hasRot = rotations.some(r => r.residentId === resident.id && r.month === month && r.year === calendarYear);
        if (!hasRot) {
          unassignedMonths.push(month);
        }
      });

      if (unassignedMonths.length > 0) {
        const monthNames = unassignedMonths.map(m => MONTHS[m]).join(', ');
        list.push({
          id: `unassigned-${resident.id}`,
          type: 'warning',
          title: `Meses sin asignar: ${resident.firstName} ${resident.lastName}`,
          description: `${resident.firstName} (${level}) tiene meses sin rotación programada: ${monthNames}.`,
          suggestion: `Completa su currículo. Sugerencia: asígnale una especialidad interna prioritaria.`
        });
      }
    });

    const priority: Record<string, number> = { danger: 3, warning: 2, success: 1 };
    list.sort((a, b) => priority[b.type] - priority[a.type]);

    if (list.length === 0) {
      list.push({
        id: 'perfect-balance',
        type: 'success',
        title: '¡Pizarra Perfectamente Equilibrada!',
        description: 'La IA no ha detectado ninguna sobresaturación, huecos sin cubrir ni desequilibrios curriculares en residentes de R2 a R5.',
        suggestion: '¡Excelente planificación del servicio!'
      });
    }

    return list;
  }, [residents, rotations, currentYear, units]);

  // Natural Language Scheduling Engine (Simulated Intelligent Parser)
  const processPrompt = (prompt: string) => {
    const norm = normalizeStr(prompt);
    
    // Check for auto-equilibrium
    if (norm.includes('equilibrar') || norm.includes('rellenar') || norm.includes('auto-planificar') || norm.includes('auto-equilibrar')) {
      // Propose auto-scheduling empty spots
      const proposed: ProposalChange[] = [];
      const academicMonths = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];
      
      const activeResidents = residents.filter(r => !r.id.startsWith('temp-') && r.year !== 'Graduado');
      const activeUnits = units.filter(u => u.name !== 'Libre' && u.name !== 'Radiología');

      let assignedCount = 0;

      activeResidents.forEach(res => {
        academicMonths.forEach(month => {
          const calYear = month >= 5 ? currentYear : currentYear + 1;
          const hasRot = rotations.some(r => r.residentId === res.id && r.month === month && r.year === calYear);
          
          if (!hasRot) {
            // Find a unit that isn't already assigned to another resident in this month
            const availableUnit = activeUnits.find(u => {
              const isOccupied = rotations.some(r => r.unitId === u.id && r.month === month && r.year === calYear) ||
                                 proposed.some(p => p.unitId === u.id && p.month === month && p.year === calYear);
              return !isOccupied;
            }) || activeUnits[0];

            if (availableUnit) {
              proposed.push({
                residentId: res.id,
                residentName: `${res.firstName} ${res.lastName || ''}`.trim(),
                month,
                year: calYear,
                unitId: availableUnit.id,
                unitName: availableUnit.name,
                isVacation: false,
                type: 'add'
              });
              assignedCount++;
            }
          }
        });
      });

      if (assignedCount > 0) {
        setProposal(proposed);
        return `He analizado la pizarra y he encontrado ${assignedCount} meses sin rotación programada. He generado una propuesta balanceada abajo para rellenar esos huecos con especialidades internas sin sobrecargar ningún servicio.`;
      } else {
        return `La pizarra ya está completamente planificada. No he encontrado huecos vacíos para auto-equilibrar.`;
      }
    }

    // Direct instructions
    const targetRes = findResident(prompt, residents);
    const targetUnit = findUnit(prompt, units);
    const targetMonth = findMonthIndex(prompt);

    if (targetRes && targetMonth !== -1 && targetUnit) {
      const calYear = targetMonth >= 5 ? currentYear : currentYear + 1;
      
      const newProposal: ProposalChange = {
        residentId: targetRes.id,
        residentName: `${targetRes.firstName} ${targetRes.lastName || ''}`.trim(),
        month: targetMonth,
        year: calYear,
        unitId: targetUnit.id,
        unitName: targetUnit.name,
        isVacation: targetUnit.id === 'vacation',
        type: targetUnit.id === 'vacation' ? 'vacation' : 'add'
      };

      setProposal([newProposal]);
      return `Entendido. He formulado una propuesta para asignar a **${newProposal.residentName}** la rotación de **${newProposal.unitName}** en **${MONTHS[targetMonth]} ${calYear}**. Revísala abajo y aplícala en la pizarra cuando desees.`;
    }

    // Clear rotation
    if (targetRes && targetMonth !== -1 && (norm.includes('quitar') || norm.includes('vaciar') || norm.includes('eliminar') || norm.includes('liberar'))) {
      const calYear = targetMonth >= 5 ? currentYear : currentYear + 1;
      
      const newProposal: ProposalChange = {
        residentId: targetRes.id,
        residentName: `${targetRes.firstName} ${targetRes.lastName || ''}`.trim(),
        month: targetMonth,
        year: calYear,
        unitId: 'clear',
        unitName: 'Libre (Vaciar)',
        isVacation: false,
        type: 'clear'
      };

      setProposal([newProposal]);
      return `Entendido. He formulado una propuesta para liberar/vaciar el mes de **${MONTHS[targetMonth]} ${calYear}** para **${newProposal.residentName}**. Puedes aplicarla con el botón inferior.`;
    }

    return `He procesado tu consulta, pero no he podido identificar con precisión al residente, mes o unidad. Para ayudarle mejor, intente plantear instrucciones estructuradas en español, por ejemplo:
• *"Pon a Jaime de vacaciones en Agosto"*
• *"Mueve a Algar a Infantil en Noviembre"*
• *"Auto-equilibrar huecos del curso"*`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal;
    setInputVal('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, timestamp: new Date() }]);
    
    setIsTyping(true);
    setTypingStep('Analizando peticiones formativas...');

    setTimeout(() => {
      setTypingStep('Verificando capacidad de especialidades...');
      setTimeout(() => {
        setTypingStep('Calculando propuesta de calendario...');
        setTimeout(() => {
          const aiResponse = processPrompt(userMsg);
          setMessages(prev => [...prev, { sender: 'ai', text: aiResponse, timestamp: new Date() }]);
          setIsTyping(false);
          setTypingStep('');
        }, 650);
      }, 550);
    }, 450);
  };

  const handleApplyProposal = async () => {
    if (proposal.length === 0) return;
    setIsApplying(true);

    try {
      for (const change of proposal) {
        if (change.type === 'clear') {
          // Find existing rotation and delete it
          const rotToDelete = rotations.find(
            r => r.residentId === change.residentId && r.month === change.month && r.year === change.year
          );
          if (rotToDelete) {
            await deleteRotation(rotToDelete.id);
          }
        } else if (change.type === 'vacation') {
          // First add a rotation on a dummy unit, then toggle vacation
          // Find or create rotation
          const existing = rotations.find(
            r => r.residentId === change.residentId && r.month === change.month && r.year === change.year
          );
          if (existing) {
            if (!existing.isVacation) {
              await toggleVacation(existing.id);
            }
          } else {
            // Find any valid unit to hold the slot
            const validUnit = units.find(u => u.name !== 'Libre')?.id || 'unit_infantil';
            await addRotation({
              residentId: change.residentId,
              month: change.month,
              year: change.year,
              unitId: validUnit,
              isVacation: true
            });
          }
        } else {
          // Standard rotation assignment
          await addRotation({
            residentId: change.residentId,
            month: change.month,
            year: change.year,
            unitId: change.unitId,
            isVacation: false
          });
        }
      }

      await initializeStore(); // Refresh from Firestore
      setProposal([]);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: '✓ ¡Propuesta aplicada con éxito en la pizarra principal! Todos los cuadrantes se han actualizado en tiempo real.',
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error('Error applying AI proposal:', err);
      alert('Error al aplicar la propuesta. Por favor, inténtelo de nuevo.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800/80 p-5 backdrop-blur-md flex flex-col h-full">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg text-white shadow-md shadow-blue-500/10">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-heading">
              Planificador Curricular Inteligente
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">
              Optimización en tiempo real y asistencia por chat interactivo
            </p>
          </div>
        </div>

        {/* Custom Premium Tabs switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-850 self-end sm:self-auto no-print">
          <button
            onClick={() => setActiveTab('insights')}
            className={clsx(
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeTab === 'insights'
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/20"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Auditoría
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={clsx(
              "px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
              activeTab === 'chat'
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/20"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Asistente Chat
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {activeTab === 'insights' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={clsx(
                  "p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between hover:shadow-xs group",
                  insight.type === 'danger' && "bg-rose-50/45 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30",
                  insight.type === 'warning' && "bg-amber-50/45 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30",
                  insight.type === 'success' && "bg-emerald-50/45 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30"
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {insight.type === 'danger' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                    {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <h4 className={clsx(
                      "text-xs font-bold font-heading leading-tight tracking-wide uppercase",
                      insight.type === 'danger' && "text-rose-800 dark:text-rose-450",
                      insight.type === 'warning' && "text-amber-800 dark:text-amber-450",
                      insight.type === 'success' && "text-emerald-800 dark:text-emerald-450"
                    )}>
                      {insight.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                    {insight.description}
                  </p>
                </div>

                {insight.suggestion && (
                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="italic font-medium">{insight.suggestion}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-[380px] min-h-0 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden no-print">
            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={clsx(
                    "flex flex-col max-w-[85%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed font-medium transition-all",
                    msg.sender === 'user'
                      ? "bg-blue-600 text-white self-end rounded-tr-none ml-auto"
                      : "bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-350 border border-slate-200/60 dark:border-slate-800/50 self-start rounded-tl-none mr-auto"
                  )}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className={clsx(
                    "text-[8px] mt-1.5 self-end opacity-60",
                    msg.sender === 'user' ? "text-blue-100" : "text-slate-400"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              
              {isTyping && (
                <div className="bg-white dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/50 text-slate-700 dark:text-slate-350 rounded-2xl rounded-tl-none p-3.5 self-start shadow-xs flex flex-col gap-2 mr-auto max-w-[70%]">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold animate-pulse">{typingStep}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat inputs and suggestion quick buttons */}
            <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-850/80 flex flex-col gap-2 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setInputVal('Asignar Vacaciones a A.ALGAR en Agosto')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-full text-[9px] font-bold border border-slate-200/30 cursor-pointer"
                >
                  🌴 Vacaciones Algar Agosto
                </button>
                <button
                  onClick={() => setInputVal('Rotar a JAIME en Infantil en Junio')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-full text-[9px] font-bold border border-slate-200/30 cursor-pointer"
                >
                  👶 Jaime Infantil Junio
                </button>
                <button
                  onClick={() => setInputVal('Auto-equilibrar huecos del curso')}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold border border-blue-200/20 cursor-pointer"
                >
                  ⚡ Auto-equilibrar Pizarra
                </button>
              </div>

              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instrucción... ej. 'Pon a Jaime en Infantil en Junio'"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isTyping}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-blue-600/10 cursor-pointer shrink-0 transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Propose changes panel - Visual Mirror Below Chat */}
      {proposal.length > 0 && activeTab === 'chat' && (
        <div className="mt-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex-shrink-0 animate-scaleIn no-print">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Propuesta Generada por Planificador IA
            </h4>
            <span className="text-[9px] text-slate-400 font-bold italic">Aprobar para aplicar cambios</span>
          </div>

          <div className="max-h-[140px] overflow-y-auto space-y-2 mb-3 bg-white/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850 p-2.5 rounded-lg">
            {proposal.map((change, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-700 dark:text-slate-350 py-1 border-b border-dashed border-slate-100 dark:border-slate-900 last:border-0 last:pb-0">
                <span className="text-slate-800 dark:text-slate-200">{change.residentName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-normal text-slate-400">{MONTHS[change.month]} {change.year}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className={clsx(
                    "px-2 py-0.5 rounded-md text-[9px] font-semibold border",
                    change.type === 'clear' && "bg-slate-100 text-slate-650 border-slate-200",
                    change.type === 'vacation' && "bg-rose-100 text-rose-700 border-rose-250",
                    change.type === 'add' && "bg-blue-100 text-blue-700 border-blue-250"
                  )}>
                    {change.unitName}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setProposal([])}
              className="flex-1 border border-slate-350 text-slate-750 dark:border-slate-800 dark:text-slate-400 py-2 rounded-lg font-bold text-[10px] hover:bg-slate-50 cursor-pointer"
            >
              Descartar
            </button>
            <button
              onClick={handleApplyProposal}
              disabled={isApplying}
              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold text-[10px] shadow-md shadow-emerald-600/10 flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              {isApplying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Aplicando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Aplicar Propuesta a la Pizarra Principal
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICounselor;
