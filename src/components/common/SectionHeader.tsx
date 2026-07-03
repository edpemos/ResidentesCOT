import React from 'react';
import { useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, CalendarCheck, Megaphone, Mail, ClipboardList, Settings } from 'lucide-react';

const SECTION_MAP: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  '/home':         { label: 'Inicio',                 icon: Home,           description: 'Vista general del mes y rotaciones' },
  '/dashboard':    { label: 'Pizarra de Rotaciones',  icon: LayoutDashboard, description: 'Gestión del año académico' },
  '/duties':       { label: 'Guardias y Tardes',      icon: CalendarCheck,  description: 'Pizarra mensual de guardias' },
  '/sessions':     { label: 'Sesiones Semanales',     icon: Megaphone,      description: 'Sesiones clínicas y docentes' },
  '/vacations':    { label: 'Supervisión Vacaciones',  icon: Mail,           description: 'Gestión de solicitudes de vacaciones' },
  '/liquidations': { label: 'Liquidación Mensual',    icon: ClipboardList,  description: 'Historial y cierre de meses' },
  '/settings':     { label: 'Ajustes',                icon: Settings,       description: 'Configuración de residentes y unidades' },
};

const SectionHeader: React.FC = () => {
  const location = useLocation();
  const section = SECTION_MAP[location.pathname];

  if (!section) return null;

  const Icon = section.icon;

  return (
    <header className="hidden lg:flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 dark:bg-teal-400/10 border border-teal-500/20 dark:border-teal-400/20">
        <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {section.label}
        </h1>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight font-medium">
          {section.description}
        </p>
      </div>
    </header>
  );
};

export default SectionHeader;
