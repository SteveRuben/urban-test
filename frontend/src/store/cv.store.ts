import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CV,
  type CVListResponse,
  type CreateCVRequest,
  type UpdateCVRequest,
  type CVAnalysis,
  type JobMatching,
  type CVTemplate,
  CVRegion,
  CVStyle,
  CVSectionType
} from '../types/cv.types';
import CVService from '../services/cv.service';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Interface pour les filtres de templates
interface TemplateFilters {
  region?: CVRegion;
  style?: string;
  industry?: string;
  experienceLevel?: string;
  
}

// Interface pour les filtres de CV
interface CVFilters {
  status?: string;
  region?: CVRegion;
  search?: string;
}

// Type guard pour vérifier si c'est une erreur API
function isApiError(error: unknown): error is ApiError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error
  );
}

// Fonction utilitaire pour extraire le message d'erreur
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (isApiError(error)) {
    return error.response?.data?.message || defaultMessage;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return defaultMessage;
}

enum ExperienceLevel { ENTRY = 'entry',MID =  'mid', SENIOR = 'senior' , EXECUTIVE =  'executive'}

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
  optimizeCV: (cvId: string, targetJob?: string, targetRegion?: CVRegion) => Promise<unknown>;
  adaptCVForRegion: (cvId: string, targetRegion: CVRegion) => Promise<unknown>;
  
  // Actions templates
  loadTemplates: (filters?: TemplateFilters) => Promise<void>;
  
  // Actions export
  exportCV: (cvId: string, format: string) => Promise<string>;
  
  // Actions utilitaires
  setCurrentCV: (cv: CV | null) => void;
  setFilters: (filters: CVFilters) => void;
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de la creation de CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors du chargement du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors du chaargement du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de la mise a jour du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de la suppression du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de la dupplication du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de l\'analyse du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de l\'analyse de correspondance');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de l\'optimisationdu CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors del\'adaptation originale du CV');
          set({
            error: errorMessage,
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
        } catch (error: unknown) {
          console.warn('Impossible de charger les templates depuis l\'API, utilisation des templates par défaut',error);
          
          // Templates par défaut si l'API ne fonctionne pas
          const defaultTemplates = [
            {
              id: 'modern-template',
              name: 'Moderne',
              description: 'Template moderne et épuré, parfait pour les secteurs technologiques',
              region: CVRegion.INTERNATIONAL,
              style: CVStyle.MODERN,
              industry: ['tech', 'marketing', 'design'],
              experienceLevel: ExperienceLevel.MID,
              isPublic: true,
              isPremium: false,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.8,
              tags: ['moderne', 'tech', 'épuré'],
              culturalNotes: ['Format international', 'Design contemporain'],
              requiredSections: [CVSectionType.PERSONAL_INFO, CVSectionType.WORK_EXPERIENCE, CVSectionType.EDUCATION, CVSectionType.SKILLS],
              optionalSections: [CVSectionType.PROJECTS, CVSectionType.LANGUAGES, CVSectionType.CERTIFICATIONS],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'classic-template',
              name: 'Classique',
              description: 'Template traditionnel et professionnel, adapté à tous les secteurs',
              region: CVRegion.FRANCE,
              style: CVStyle.CLASSIC,
              industry: ['finance', 'legal', 'consulting'],
              experienceLevel: ExperienceLevel.SENIOR,
              isPublic: true,
              isPremium: false,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.6,
              tags: ['classique', 'professionnel', 'traditionnel'],
              culturalNotes: ['Format français standard', 'Présentation formelle'],
              requiredSections: [CVSectionType.PERSONAL_INFO, CVSectionType.WORK_EXPERIENCE, CVSectionType.EDUCATION],
              optionalSections: [CVSectionType.SKILLS, CVSectionType.LANGUAGES, CVSectionType.HOBBIES],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'creative-template',
              name: 'Créatif',
              description: 'Template créatif et coloré, idéal pour les métiers artistiques',
              region: CVRegion.INTERNATIONAL,
              style: CVStyle.CREATIVE,
              industry: ['design', 'marketing', 'media'],
              experienceLevel: ExperienceLevel.ENTRY,
              isPublic: true,
              isPremium: true,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.9,
              tags: ['créatif', 'coloré', 'artistique'],
              culturalNotes: ['Design innovant', 'Mise en page créative'],
              requiredSections: [CVSectionType.PERSONAL_INFO, CVSectionType.WORK_EXPERIENCE, CVSectionType.SKILLS],
              optionalSections: [CVSectionType.PROJECTS, CVSectionType.PROFESSIONAL_SUMMARY, CVSectionType.CERTIFICATIONS],
              prohibitedElements: [],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'minimal-template',
              name: 'Minimaliste',
              description: 'Template épuré et minimaliste, focus sur le contenu',
              region: CVRegion.INTERNATIONAL,
              style: CVStyle.MINIMAL,
              industry: ['tech', 'consulting', 'research'],
              experienceLevel: ExperienceLevel.MID,
              isPublic: true,
              isPremium: false,
              creatorId: 'system',
              usageCount: 0,
              rating: 4.7,
              tags: ['minimaliste', 'épuré', 'simple'],
              culturalNotes: ['Design épuré', 'Focus sur le contenu'],
              requiredSections: [CVSectionType.PERSONAL_INFO, CVSectionType.WORK_EXPERIENCE, CVSectionType.EDUCATION, CVSectionType.SKILLS],
              optionalSections: [CVSectionType.LANGUAGES, CVSectionType.CERTIFICATIONS],
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
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, 'Erreur lors de l\'exportation du CV');
          set({
            error: errorMessage,
            isLoading: false
          });
          throw error;
        }
      },

      // Actions utilitaires
      setCurrentCV: (cv: CV | null) => {
        set({ currentCV: cv });
      },

      setFilters: (filters: CVFilters) => {
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