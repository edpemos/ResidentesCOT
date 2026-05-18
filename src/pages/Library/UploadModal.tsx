import React, { useState } from 'react';
import { useLibraryStore } from '../../store/libraryStore';
import { useAuthStore } from '../../store/authStore';
import { useUnitStore } from '../../store/unitStore';
import { X, UploadCloud, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { addArticle } = useLibraryStore();
  const { user } = useAuthStore();
  const { units } = useUnitStore();
  
  const [title, setTitle] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !specialtyId || !file) return;

    setIsUploading(true);

    const specialtyName = units.find(u => u.id === specialtyId)?.name || 'General';

    // Simular subida a Firebase Storage
    setTimeout(() => {
      addArticle({
        title,
        specialty: specialtyName, // Podría guardarse ID y resolver al renderizar, pero guardamos string por simplicidad en MOCK
        fileUrl: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.email || 'Admin'
      });
      setIsUploading(false);
      onClose();
      setTitle('');
      setSpecialtyId('');
      setFile(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Subir Artículo PDF</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título del Artículo</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej. Guía clínica..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
            <select
              required
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Archivo PDF</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-slate-700">
                  {file ? file.name : 'Haz clic para seleccionar o arrastra aquí'}
                </span>
                {!file && <span className="text-xs text-slate-500 mt-1">Solo archivos PDF (Max 10MB)</span>}
              </label>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subir Archivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
