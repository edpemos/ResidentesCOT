import React from 'react';
import { useRotationStore } from '../../store/rotationStore';
import { useUnitStore } from '../../store/unitStore';
import type { Resident } from '../../types';

const CounterPanel: React.FC = () => {
  const { residents, rotations, currentYear, viewMode, selectedResidentId } = useRotationStore();
  const { units } = useUnitStore();

  // Filter residents and rotations based on the active Dashboard filters
  const getFilteredData = () => {
    let filteredResidents: Resident[] = [];
    let filteredRotations = rotations;

    if (viewMode === 'academicYear') {
      // Get actual active residents in this academic year
      for (let level = 5; level >= 1; level--) {
        const targetStartYear = currentYear - level + 1;
        const levelResidents = residents.filter(r => {
          const startYear = new Date(r.startDate).getFullYear();
          return startYear === targetStartYear;
        });

        levelResidents.forEach(r => {
          filteredResidents.push({
            ...r,
            year: `R${level}` as any
          });
        });
      }

      // Filter rotations for these active residents over their entire residency
      filteredRotations = rotations.filter(rot => {
        return filteredResidents.some(res => res.id === rot.residentId);
      });

    } else {
      // Single resident view
      const selected = residents.find(r => r.id === selectedResidentId);
      if (selected) {
        filteredResidents = [selected];
        // Filter rotations for this resident only (all years)
        filteredRotations = rotations.filter(rot => rot.residentId === selectedResidentId);
      }
    }

    return { filteredResidents, filteredRotations };
  };

  const { filteredResidents, filteredRotations } = getFilteredData();

  // Compute months count per dynamic unit for each resident
  const calculateStats = () => {
    const stats: Record<string, Record<string, number>> = {};
    
    filteredResidents.forEach(r => {
      stats[r.id] = {};
    });

    filteredRotations.forEach(rot => {
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
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl shrink-0">
        <h3 className="font-semibold text-slate-800">
          Acumulado Residencia
        </h3>
        <p className="text-xs text-slate-500">
          Total de rotaciones realizadas en la totalidad de su residencia
        </p>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {filteredResidents.map(resident => {
          const residentStats = stats[resident.id] || {};
          const activeUnits = Object.entries(residentStats).filter(([_, count]) => count > 0);
          
          if (activeUnits.length === 0) {
            return (
              <div key={resident.id} className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
                  {viewMode === 'academicYear' && resident.year ? `${resident.year} - ` : ''}
                  {resident.lastName ? `${resident.lastName}, ` : ''}{resident.firstName}
                </h4>
                <p className="text-xs text-slate-400 italic py-1">Sin rotaciones registradas</p>
              </div>
            );
          }

          return (
            <div key={resident.id} className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
                {viewMode === 'academicYear' && resident.year ? `${resident.year} - ` : ''}
                {resident.lastName ? `${resident.lastName}, ` : ''}{resident.firstName}
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
        {filteredResidents.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No hay datos</p>
        )}
      </div>
    </div>
  );
};

export default CounterPanel;
