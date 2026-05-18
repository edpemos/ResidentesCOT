import React from 'react';
import { useLibraryStore } from '../../store/libraryStore';
import { useAuthStore } from '../../store/authStore';
import { FileText, Download, Trash2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ArticleList: React.FC = () => {
  const { articles, selectedCategory, deleteArticle } = useLibraryStore();
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  const filteredArticles = selectedCategory 
    ? articles.filter(a => a.specialty === selectedCategory)
    : articles;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredArticles.length === 0 ? (
        <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p>No hay artículos en esta categoría.</p>
        </div>
      ) : (
        filteredArticles.map(article => (
          <div key={article.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-red-50 rounded-lg text-red-500">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                {article.specialty}
              </span>
            </div>
            
            <h4 className="font-bold text-slate-800 mb-2 line-clamp-3" title={article.title}>
              {article.title}
            </h4>
            
            <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center text-xs text-slate-500 gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(article.uploadedAt), "d MMM yyyy", { locale: es })}
              </div>
              <div className="flex items-center text-xs text-slate-500 gap-1.5">
                <User className="w-3.5 h-3.5" />
                {article.uploadedBy}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a 
                href={article.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Abrir
              </a>
              {isAdmin && (
                <button 
                  onClick={() => {
                    if(window.confirm('¿Borrar este artículo?')) deleteArticle(article.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar PDF"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ArticleList;
