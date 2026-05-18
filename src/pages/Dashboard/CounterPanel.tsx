import React from 'react';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';

const CounterPanel: React.FC = () => {
  const { residents, rotations } = useRotationStore();
  const { units } = useUnitStore();

  // Calcular meses por unidad por residente
  const calculateStats = () => {
    const stats: Record<string, Record<string, number>> = {};
    
    residents.forEach(r => {
      stats[r.id] = {};
    });

    rotations.forEach(rot => {
      if (!stats[rot.residentId]) return;
      const unit = units.find(u => u.id === rot.unitId);
      const unitName = unit ? unit.name : 'Desconocida';
      
      if (!stats[rot.residentId][unitName]) {
        stats[rot.residentId][unitName] = 0;
      }
      stats[rot.residentId][unitName] += 1;
    });

    return stats;
  };

  const stats = calculateStats();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[800px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <h3 className="font-semibold text-slate-800">Acumulado Anual</h3>
        <p className="text-xs text-slate-500">Meses por especialidad</p>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {residents.map(resident => {
          const residentStats = stats[resident.id] || {};
          const activeUnits = Object.entries(residentStats).filter(([_, count]) => count > 0);
          
          if (activeUnits.length === 0) return null;

          return (
            <div key={resident.id} className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
                {resident.year !== 'Graduado' ? `${resident.year} - ` : ''}{resident.lastName}, {resident.firstName}
              </h4>
              <ul className="space-y-1.5">
                {activeUnits.map(([unitName, count]) => (
                  <li key={unitName} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 truncate pr-2">{unitName}</span>
                    <span className="font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {count} {count === 1 ? 'mes' : 'meses'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {rotations.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No hay datos</p>
        )}
      </div>
    </div>
  );
};

export default CounterPanel;
