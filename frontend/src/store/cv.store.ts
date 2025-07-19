import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CV,
  CVListResponse,
  CreateCVRequest,
  UpdateCVRequest,
  CVAnalysis,
  JobMatching,
  CVTemplate,
  CVRegion
} from '../types/cv.types';
import CVService from '../services/cv.service';

interface CVState {
  // État des données
  cvs: CV[];
  currentCV: CV | null;
  templates: CVTemplate[];
  isLoading: boolean;
  error: string | null;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCVs: number;
  
  // Filtres
  filters: {
    status?: string;
    region?: CVRegion;
    search?: string;
  };
  
  // Actions CRUD
  createCV: (data: CreateCVRequest) => Promise<CV>;
  loadUserCVs: (page?: number, limit?: number) => Promise<void>;
  loadCVById: (cvId: string) => Promise<CV>;
  updateCV: (cvId: string, data: UpdateCVRequest) => Promise<CV>;
  deleteCV: (cvId: string) => Promise<void>;
  duplicateCV: (cvId: string, title?: string) => Promise<CV>;
  
  // Actions IA
  analyzeCV: (cvId: string, targetRegion?: CVRegion) => Promise<CVAnalysis>;
  analyzeJobMatching: (cvId: string, jobData: {
    jobDescription: string;
    jobTitle: string;
    company?: string;
  }) => Promise<JobMatching>;
  optimizeCV: (cvId: string, targetJob?: string, targetRegion?: CVRegion) => Promise<any>;
  adaptCVForRegion: (cvId: string, targetRegion: CVRegion) => Promise<any>;
  
  // Actions templates
  loadTemplates: (filters?: any) => Promise<void>;
  
  // Actions export
  exportCV: (cvId: string, format: string) => Promise<string>;
  
  // Actions utilitaires
  setCurrentCV: (cv: CV | null) => void;
  setFilters: (filters: any) => void;
  clearError: () => void;
  resetStore: () => void;
}

export const useCVStore = create<CVState>()(
  persist(
    (set, get) => ({
      // État initial
      cvs: [],
      currentCV: null,
      templates: [],
      isLoading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalCVs: 0,
      filters: {},

      // Actions CRUD
      createCV: async (data: CreateCVRequest) => {
        set({ isLoading: true, error: null });
        try {
          const newCV = await CVService.createCV(data);
          set(state => ({
            cvs: [newCV, ...state.cvs],
            currentCV: newCV,
            totalCVs: state.totalCVs + 1,
            isLoading: false
          }));
          return newCV;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de la création du CV',
            isLoading: false
          });
          throw error;
        }
      },

      loadUserCVs: async (page = 1, limit = 10) => {
        set({ isLoading: true, error: null });
        try {
          const { filters } = get();
          const response: CVListResponse = await CVService.getUserCVs({
            page,
            limit,
            ...filters
          });
          
          set({
            cvs: response.cvs,
            currentPage: response.page,
            totalPages: response.totalPages,
            totalCVs: response.total,
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors du chargement des CV',
            isLoading: false
          });
        }
      },

      loadCVById: async (cvId: string) => {
        set({ isLoading: true, error: null });
        try {
          const cv = await CVService.getCVById(cvId);
          set({
            currentCV: cv,
            isLoading: false
          });
          return cv;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors du chargement du CV',
            isLoading: false
          });
          throw error;
        }
      },

      updateCV: async (cvId: string, data: UpdateCVRequest) => {
        set({ isLoading: true, error: null });
        try {
          const updatedCV = await CVService.updateCV(cvId, data);
          
          set(state => ({
            cvs: state.cvs.map(cv => cv.id === cvId ? updatedCV : cv),
            currentCV: state.currentCV?.id === cvId ? updatedCV : state.currentCV,
            isLoading: false
          }));
          
          return updatedCV;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de la mise à jour du CV',
            isLoading: false
          });
          throw error;
        }
      },

      deleteCV: async (cvId: string) => {
        set({ isLoading: true, error: null });
        try {
          await CVService.deleteCV(cvId);
          
          set(state => ({
            cvs: state.cvs.filter(cv => cv.id !== cvId),
            currentCV: state.currentCV?.id === cvId ? null : state.currentCV,
            totalCVs: state.totalCVs - 1,
            isLoading: false
          }));
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de la suppression du CV',
            isLoading: false
          });
          throw error;
        }
      },

      duplicateCV: async (cvId: string, title?: string) => {
        set({ isLoading: true, error: null });
        try {
          const duplicatedCV = await CVService.duplicateCV(cvId, title);
          
          set(state => ({
            cvs: [duplicatedCV, ...state.cvs],
            totalCVs: state.totalCVs + 1,
            isLoading: false
          }));
          
          return duplicatedCV;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de la duplication du CV',
            isLoading: false
          });
          throw error;
        }
      },

      // Actions IA
      analyzeCV: async (cvId: string, targetRegion?: CVRegion) => {
        set({ isLoading: true, error: null });
        try {
          const { analysis } = await CVService.analyzeCV(cvId, { targetRegion });
          
          // Mettre à jour le CV avec l'analyse
          set(state => ({
            cvs: state.cvs.map(cv => 
              cv.id === cvId ? { ...cv, lastAnalysis: analysis } : cv
            ),
            currentCV: state.currentCV?.id === cvId 
              ? { ...state.currentCV, lastAnalysis: analysis }
              : state.currentCV,
            isLoading: false
          }));
          
          return analysis;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de l\'analyse du CV',
            isLoading: false
          });
          throw error;
        }
      },

      analyzeJobMatching: async (cvId: string, jobData) => {
        set({ isLoading: true, error: null });
        try {
          const { matching } = await CVService.analyzeJobMatching(cvId, jobData);
          
          // Ajouter le matching au CV
          set(state => ({
            cvs: state.cvs.map(cv => 
              cv.id === cvId 
                ? { ...cv, jobMatchings: [...cv.jobMatchings, matching] }
                : cv
            ),
            currentCV: state.currentCV?.id === cvId 
              ? { 
                  ...state.currentCV, 
                  jobMatchings: [...state.currentCV.jobMatchings, matching] 
                }
              : state.currentCV,
            isLoading: false
          }));
          
          return matching;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de l\'analyse de correspondance',
            isLoading: false
          });
          throw error;
        }
      },

      optimizeCV: async (cvId: string, targetJob?: string, targetRegion?: CVRegion) => {
        set({ isLoading: true, error: null });
        try {
          const result = await CVService.optimizeCV(cvId, { targetJob, targetRegion });
          set({ isLoading: false });
          return result;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de l\'optimisation du CV',
            isLoading: false
          });
          throw error;
        }
      },

      adaptCVForRegion: async (cvId: string, targetRegion: CVRegion) => {
        set({ isLoading: true, error: null });
        try {
          const result = await CVService.adaptCVForRegion(cvId, { targetRegion });
          set({ isLoading: false });
          return result;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de l\'adaptation régionale',
            isLoading: false
          });
          throw error;
        }
      },

      // Actions templates
      loadTemplates: async (filters = {}) => {
        set({ isLoading: true, error: null });
        try {
          // Essayer de charger les templates depuis l'API
          const templates = await CVService.getCVTemplates(filters);
          set({
            templates,
            isLoading: false
          });
        } catch (error: any) {
          console.warn('Impossible de charger les templates depuis l\'API, utilisation des templates par défaut');
          
          // Templates par défaut si l'API ne fonctionne pas
          const defaultTemplates = [
            {
              id: 'modern-template',
              name: 'Moderne',
              description: 'Template moderne et épuré, parfait pour les secteurs technologiques',
              region: 'international',
              style: 'modern',
              industry: ['tech', 'marketing', 'design'],
              experienceLevel: 'mid',
              isPublic: true,
              isPremium: false,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.8,
              tags: ['moderne', 'tech', 'épuré'],
              culturalNotes: ['Format international', 'Design contemporain'],
              requiredSections: ['personal_info', 'work_experience', 'education', 'skills'],
              optionalSections: ['projects', 'languages', 'certifications'],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'classic-template',
              name: 'Classique',
              description: 'Template traditionnel et professionnel, adapté à tous les secteurs',
              region: 'france',
              style: 'classic',
              industry: ['finance', 'legal', 'consulting'],
              experienceLevel: 'senior',
              isPublic: true,
              isPremium: false,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.6,
              tags: ['classique', 'professionnel', 'traditionnel'],
              culturalNotes: ['Format français standard', 'Présentation formelle'],
              requiredSections: ['personal_info', 'work_experience', 'education'],
              optionalSections: ['skills', 'languages', 'hobbies'],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'creative-template',
              name: 'Créatif',
              description: 'Template créatif et coloré, idéal pour les métiers artistiques',
              region: 'international',
              style: 'creative',
              industry: ['design', 'marketing', 'media'],
              experienceLevel: 'entry',
              isPublic: true,
              isPremium: true,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.9,
              tags: ['créatif', 'coloré', 'artistique'],
              culturalNotes: ['Design innovant', 'Mise en page créative'],
              requiredSections: ['personal_info', 'work_experience', 'skills'],
              optionalSections: ['projects', 'portfolio', 'certifications'],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'minimal-template',
              name: 'Minimaliste',
              description: 'Template épuré et minimaliste, focus sur le contenu',
              region: 'international',
              style: 'minimal',
              industry: ['tech', 'consulting', 'research'],
              experienceLevel: 'mid',
              isPublic: true,
              isPremium: false,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.7,
              tags: ['minimaliste', 'épuré', 'simple'],
              culturalNotes: ['Design épuré', 'Focus sur le contenu'],
              requiredSections: ['personal_info', 'work_experience', 'education', 'skills'],
              optionalSections: ['languages', 'certifications'],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
          
          set({
            templates: defaultTemplates,
            isLoading: false,
            error: null
          });
        }
      },

      // Actions export
      exportCV: async (cvId: string, format: string) => {
        set({ isLoading: true, error: null });
        try {
          const exportResult = await CVService.exportCV(cvId, format);
          set({ isLoading: false });
          return exportResult.downloadUrl;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Erreur lors de l\'export du CV',
            isLoading: false
          });
          throw error;
        }
      },

      // Actions utilitaires
      setCurrentCV: (cv: CV | null) => {
        set({ currentCV: cv });
      },

      setFilters: (filters: any) => {
        set({ filters });
      },

      clearError: () => {
        set({ error: null });
      },

      resetStore: () => {
        set({
          cvs: [],
          currentCV: null,
          templates: [],
          isLoading: false,
          error: null,
          currentPage: 1,
          totalPages: 1,
          totalCVs: 0,
          filters: {}
        });
      }
    }),
    {
      name: 'cv-storage',
      partialize: (state) => ({
        currentCV: state.currentCV,
        filters: state.filters
      })
    }
  )
);

export default useCVStore;