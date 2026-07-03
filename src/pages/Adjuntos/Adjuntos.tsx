import React from 'react';
import { Users, FileSpreadsheet, Calendar, Sparkles, AlertCircle } from 'lucide-react';

const MOCK_ADJUNTOS_PLANNING = [
  { name: 'Dr. Martín Gómez (Jefe Servicio)', role: 'Jefe Servicio', shift: 'Quirófano A', status: 'De Guardia' },
  { name: 'Dra. Laura Ortiz', role: 'Adjunto Senior', shift: 'Consultas Externas', status: 'Mañana' },
  { name: 'Dr. Carlos Ruiz', role: 'Adjunto', shift: 'Planta de Hospitalización', status: 'Mañana' },
  { name: 'Dra. Sofia Varela', role: 'Adjunto', shift: 'Urgencias COT', status: 'Tarde' },
  { name: 'Dr. Javier Méndez', role: 'Adjunto', shift: 'Quirófano B', status: 'De Guardia' },
];

const Adjuntos: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      {/* Top Banner / Welcome card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 border border-teal-900/35 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/5 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Sincronización Activa
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Planificación de Adjuntos
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Planificación del servicio de cirujanos adjuntos del Servicio de COT. Los datos se actualizan diariamente a las 4:00 AM conectándose de forma segura a Guardiscopio.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 shadow-lg text-emerald-400">
              <Users className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-md border border-teal-900/20 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-wider">Estado de integración</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Actualmente el script de GitHub Actions está listo y configurado. En la siguiente fase, conectaremos la base de datos para renderizar la tabla interactiva de todos los cirujanos del mes actual y próximos.
          </p>
        </div>
      </div>

      {/* Placeholder table container */}
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-500" />
              Vista Previa de la Planificación (Simulada)
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Estructura visual propuesta para mostrar la asignación del día de hoy.
            </p>
          </div>
          <button
            disabled
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 rounded-xl text-xs font-bold cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <th className="py-3 px-4">Cirujano Adjunto</th>
                <th className="py-3 px-4">Cargo/Rol</th>
                <th className="py-3 px-4">Ubicación/Turno Hoy</th>
                <th className="py-3 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {MOCK_ADJUNTOS_PLANNING.map((adjunto, index) => (
                <tr key={index} className="text-sm font-medium hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-4 text-slate-850 dark:text-slate-100">{adjunto.name}</td>
                  <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-xs">{adjunto.role}</td>
                  <td className="py-4 px-4 text-slate-800 dark:text-slate-350">{adjunto.shift}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      adjunto.status === 'De Guardia'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : adjunto.status === 'Tarde'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {adjunto.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default Adjuntos;
