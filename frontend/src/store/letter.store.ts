import { create } from 'zustand';
import letterService from '../services/letter.service';
import type { Letter, LetterTemplate } from '../types';

interface LetterState {
  letters: Letter[];
  letter: Letter | null;
  templates: LetterTemplate[];
  isLoading: boolean;
  error: string | null;
  
  fetchLetters: () => Promise<void>;
  fetchLetter: (id: string) => Promise<void>;
  createLetter: (data: { title: string; content: string } & Partial<Omit<Letter, 'title' | 'content'>>) => Promise<Letter>;
  updateLetter: (id: string, data: Partial<Letter>) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;
  
  fetchTemplates: () => Promise<void>;
  generateFromTemplate: (templateId: string, data: any) => Promise<string>;
  
  clearError: () => void;
}

export const useLetterStore = create<LetterState>((set, get) => ({
  letters: [],
  letter: null,
  templates: [],
  isLoading: false,
  error: null,
  
  fetchLetters: async () => {
    set({ isLoading: true, error: null });
    try {
      const letters = await letterService.getLetters();
      set({ letters, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors du chargement des lettres', isLoading: false });
    }
  },
  
  fetchLetter: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const letter = await letterService.getLetter(id);
      set({ letter, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors du chargement de la lettre', isLoading: false });
    }
  },
  
  createLetter: async (data: { title: string; content: string } & Partial<Omit<Letter, 'title' | 'content'>>) => {
    set({ isLoading: true, error: null });
    try {
      const id = await letterService.createLetter(data);
      // Rafraîchir la liste des lettres
      await get().fetchLetters();
      set({ isLoading: false });
      return id;
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la création de la lettre', isLoading: false });
      throw error;
    }
  },
  
  updateLetter: async (id: string, data: Partial<Letter>) => {
    set({ isLoading: true, error: null });
    try {
      await letterService.updateLetter(id, data);
      
      // Mise à jour de la lettre locale si elle est actuellement chargée
      const currentLetter = get().letter;
      if (currentLetter && currentLetter.id === id) {
        set({ letter: { ...currentLetter, ...data } });
      }
      
      // Rafraîchir la liste des lettres
      await get().fetchLetters();
      
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la mise à jour de la lettre', isLoading: false });
    }
  },
  
  deleteLetter: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await letterService.deleteLetter(id);
      
      // Supprimer la lettre de la liste locale
      const letters = get().letters.filter(letter => letter.id !== id);
      set({ letters, letter: null, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la suppression de la lettre', isLoading: false });
    }
  },
  
  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await letterService.getLetterTemplates();
      set({ templates, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors du chargement des modèles', isLoading: false });
    }
  },
  
  generateFromTemplate: async (templateId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const letterId = await letterService.generateLetterFromTemplate(templateId, data);
      // Rafraîchir la liste des lettres
      await get().fetchLetters();
      set({ isLoading: false });
      return letterId;
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la génération de la lettre', isLoading: false });
      throw error;
    }
  },
  
  clearError: () => set({ error: null })
}));