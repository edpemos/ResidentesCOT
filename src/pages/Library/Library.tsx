import React, { useState } from 'react';
import CategoryFilter from './CategoryFilter';
import ArticleList from './ArticleList';
import UploadModal from './UploadModal';
import { useAuthStore } from '../../store/authStore';
import { Plus } from 'lucide-react';

const Library: React.FC = () => {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Biblioteca de Artículos</h2>
          <p className="text-slate-500 text-sm mt-1">
            Repositorio científico y protocolos del servicio
          </p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Subir PDF</span>
          </button>
        )}
      </div>

      <CategoryFilter />
      
      <div className="flex-1 overflow-y-auto pb-8">
        <ArticleList />
      </div>

      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Library;
