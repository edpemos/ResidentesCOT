import { create } from 'zustand';
import type { Article } from '../types';

const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'Manejo actual de la displasia del desarrollo de la cadera',
    specialty: 'Infantil',
    fileUrl: '#',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Dr. Admin'
  },
  {
    id: 'a2',
    title: 'Clasificación AO para fracturas de radio distal',
    specialty: 'Mano/Muñeca',
    fileUrl: '#',
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    uploadedBy: 'Dr. Admin'
  }
];

interface LibraryState {
  articles: Article[];
  selectedCategory: string | null;
  addArticle: (article: Omit<Article, 'id'>) => void;
  deleteArticle: (id: string) => void;
  setCategory: (category: string | null) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  articles: MOCK_ARTICLES,
  selectedCategory: null,
  addArticle: (article) => set((state) => ({
    articles: [{ ...article, id: Math.random().toString(36).substr(2, 9) }, ...state.articles]
  })),
  deleteArticle: (id) => set((state) => ({
    articles: state.articles.filter(a => a.id !== id)
  })),
  setCategory: (category) => set({ selectedCategory: category })
}));
