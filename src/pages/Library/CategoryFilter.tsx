import React from 'react';
import { useLibraryStore } from '../../store/libraryStore';
import { useUnitStore } from '../../store/unitStore';
import clsx from 'clsx';

const CategoryFilter: React.FC = () => {
  const { selectedCategory, setCategory } = useLibraryStore();
  const { units } = useUnitStore();

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setCategory(null)}
        className={clsx(
          "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
          selectedCategory === null 
            ? "bg-slate-800 text-white border-slate-800" 
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
        )}
      >
        Todas
      </button>
      {units.map(unit => (
        <button
          key={unit.id}
          onClick={() => setCategory(unit.name)}
          className={clsx(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
            selectedCategory === unit.name 
              ? unit.color.replace('border-', 'border-').replace('text-', 'text-').replace('bg-', 'bg-').split(' ')[0] + ' text-slate-900 border-2'
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
          style={{
            borderColor: selectedCategory === unit.name ? 'currentColor' : undefined
          }}
        >
          {unit.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
