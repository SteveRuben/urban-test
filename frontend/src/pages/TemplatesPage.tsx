import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch, 
  FaFilter, 
  FaPlus, 
  FaEye, 
  FaTimes,
  FaRegFileAlt,
  FaChevronRight,
  FaChevronDown,
  FaStar,
  FaCrown,
  FaSpaceShuttle,
  FaExclamationTriangle,
  FaRobot,
  FaTag,
  FaBriefcase,
  FaGraduationCap,
  FaBuilding,
  FaHeart,
  FaShare,
  FaBookmark,
  FaClock,
  FaUsers,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { LazySection } from '../components/performance/LazySection';
import { VirtualList } from '../components/performance/VirtualList';
import { useToast } from '../store/toast.store';
import { analytics } from '../utils/analytics';
import { debounce } from '../utils/performance';
import MetaTags from '../components/SEO/MetaTags';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';
import { OptimizedImage } from '../components/layout/OptimizedImage';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useSubscriptionStore } from '../store/subscription.store';

// Types importés et améliorés
export const LetterType = {
  JOB_APPLICATION: "job",
  SCHOLARSHIP: "scholarship",
  INTERNSHIP: "internship",
  CUSTOM: "custom"
} as const;

export type LetterType = typeof LetterType[keyof typeof LetterType];

export interface LetterTemplate {
  id: string;
  type: LetterType;
  title: string;
  template: string;
  description?: string;
  previewImage?: string;
  isPublic: boolean;
  isPremium?: boolean;
  isAIGenerated?: boolean;
  isFeatured?: boolean;
  isBookmarked?: boolean;
  useCount?: number;
  rating?: number;
  reviewCount?: number;
  creatorId?: string;
  creatorName?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number; // en minutes
  successRate?: number; // pourcentage de succès
  industry?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateStats {
  totalTemplates: number;
  premiumTemplates: number;
  myTemplates: number;
  publicTemplates: number;
  aiGeneratedTemplates: number;
  featuredTemplates: number;
  bookmarkedTemplates: number;
}

interface FilterState {
  searchTerm: string;
  selectedType: string;
  selectedTags: string[];
  selectedIndustries: string[];
  selectedDifficulty: string;
  showPremiumOnly: boolean;
  showMyTemplatesOnly: boolean;
  showAIOnly: boolean;
  showFeaturedOnly: boolean;
  showBookmarkedOnly: boolean;
  minRating: number;
  maxEstimatedTime: number;
  sortBy: 'rating' | 'useCount' | 'recent' | 'popular' | 'alphabetical';
  viewMode: 'grid' | 'list' | 'compact';
}

// Données pour les catégories avec améliorations
const templateTypes = [
  { 
    id: 'all', 
    name: 'Tous les types',
    icon: FaRegFileAlt,
    description: 'Tous les modèles disponibles',
    color: 'gray',
    gradient: 'from-gray-500 to-gray-600'
  },
  { 
    id: LetterType.JOB_APPLICATION, 
    name: 'Candidatures d\'emploi',
    icon: FaBriefcase,
    description: 'Lettres pour postuler à un emploi',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600'
  },
  { 
    id: LetterType.SCHOLARSHIP, 
    name: 'Demandes de bourse',
    icon: FaGraduationCap,
    description: 'Lettres de motivation pour bourses d\'études',
    color: 'green',
    gradient: 'from-green-500 to-green-600'
  },
  { 
    id: LetterType.INTERNSHIP, 
    name: 'Demandes de stage',
    icon: FaBuilding,
    description: 'Lettres pour candidater à un stage',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600'
  },
  { 
    id: LetterType.CUSTOM, 
    name: 'Personnalisées',
    icon: FaSpaceShuttle,
    description: 'Modèles personnalisés et créatifs',
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600'
  },
];

const difficultyLevels = [
  { value: 'all', label: 'Tous niveaux', color: 'gray' },
  { value: 'beginner', label: 'Débutant', color: 'green' },
  { value: 'intermediate', label: 'Intermédiaire', color: 'yellow' },
  { value: 'advanced', label: 'Avancé', color: 'red' }
];

const sortOptions = [
  { value: 'rating', label: 'Mieux notés', icon: FaStar },
  { value: 'useCount', label: 'Plus populaires', icon: FaUsers },
  { value: 'recent', label: 'Plus récents', icon: FaClock },
  { value: 'popular', label: 'Tendances', icon: FaCheckCircle },
  { value: 'alphabetical', label: 'Alphabétique', icon: FaRegFileAlt }
];

const viewModes = [
  { value: 'grid', label: 'Grille', icon: FaRegFileAlt },
  { value: 'list', label: 'Liste', icon: FaRegFileAlt },
  { value: 'compact', label: 'Compact', icon: FaRegFileAlt }
];

// Component principal
const TemplatesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { subscription } = useSubscriptionStore();
  const toast = useToast();

  // État initial optimisé
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    selectedType: 'all',
    selectedTags: [],
    selectedIndustries: [],
    selectedDifficulty: 'all',
    showPremiumOnly: false,
    showMyTemplatesOnly: false,
    showAIOnly: false,
    showFeaturedOnly: false,
    showBookmarkedOnly: false,
    minRating: 0,
    maxEstimatedTime: 120,
    sortBy: 'rating',
    viewMode: 'grid'
  });

  const [uiState, setUiState] = useState({
    isFilterOpen: false,
    isMobileFiltersOpen: false,
    selectedTemplateId: null as string | null,
    showPreviewModal: false,
    isBookmarking: false
  });
  
  // État des données avec optimisations
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [bookmarkedTemplates, setBookmarkedTemplates] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<TemplateStats>({
    totalTemplates: 0,
    premiumTemplates: 0,
    myTemplates: 0,
    publicTemplates: 0,
    aiGeneratedTemplates: 0,
    featuredTemplates: 0,
    bookmarkedTemplates: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics tracking
  useEffect(() => {
    analytics.pageView('/dashboard/templates');
    analytics.track({
      action: 'templates_page_visited',
      category: 'engagement'
    });
  }, []);

  // Debounced search pour optimiser les performances
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      analytics.track({
        action: 'template_search',
        category: 'engagement',
        label: searchTerm
      });
    }, 500),
    []
  );

  // Filtres avec mise à jour optimisée
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K, 
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    if (key === 'searchTerm') {
      debouncedSearch(value as string);
    }
  }, [debouncedSearch]);

  const updateUIState = useCallback(<K extends keyof typeof uiState>(
    key: K, 
    value: typeof uiState[K]
  ) => {
    setUiState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Récupération des données optimisée avec cache
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [templatesResponse, bookmarksResponse] = await Promise.all([
        api.get('/templates'),
        api.get('/templates/bookmarks').catch(() => ({ data: [] }))
      ]);
      
      const templatesData = templatesResponse.data.data?.templates || templatesResponse.data.templates || [];
      const bookmarksData = bookmarksResponse.data.bookmarks || [];
      
      const processedTemplates = templatesData.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
        isBookmarked: bookmarksData.includes(template.id)
      }));
      
      setTemplates(processedTemplates);
      setBookmarkedTemplates(new Set(bookmarksData));

      // Extraction des métadonnées
      const allTags = [...new Set(
          processedTemplates
            .flatMap((t: LetterTemplate) => t.tags || [])
            .filter((tag:any): tag is string => Boolean(tag) && typeof tag === 'string')
        )].sort() as string[];
      
      const allIndustries = [...new Set(
          processedTemplates
            .flatMap((t: LetterTemplate) => t.industry || [])
            .filter((industry:any): industry is string => Boolean(industry) && typeof industry === 'string')
      )].sort() as string[];
      
      setAvailableTags(allTags);
      setAvailableIndustries(allIndustries);

      // Calcul des statistiques améliorées
      const stats: TemplateStats = {
        totalTemplates: processedTemplates.length,
        premiumTemplates: processedTemplates.filter((t: LetterTemplate) => t.isPremium).length,
        publicTemplates: processedTemplates.filter((t: LetterTemplate) => t.isPublic).length,
        myTemplates: processedTemplates.filter((t: LetterTemplate) => t.creatorId === user?.id).length,
        aiGeneratedTemplates: processedTemplates.filter((t: LetterTemplate) => t.isAIGenerated).length,
        featuredTemplates: processedTemplates.filter((t: LetterTemplate) => t.isFeatured).length,
        bookmarkedTemplates: bookmarksData.length
      };
      
      setStats(stats);
      
      analytics.track({
        action: 'templates_loaded',
        category: 'performance',
        value: processedTemplates.length
      });
      
    } catch (err: any) {
      console.error('Erreur lors de la récupération des templates:', err);
      setError(err.message || 'Erreur lors du chargement des modèles');
      
      analytics.track({
        action: 'templates_load_error',
        category: 'error',
        label: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Gestion des bookmarks optimisée
  const toggleBookmark = useCallback(async (templateId: string) => {
    if (uiState.isBookmarking) return;
    
    updateUIState('isBookmarking', true);
    
    try {
      const isBookmarked = bookmarkedTemplates.has(templateId);
      
      if (isBookmarked) {
        await api.delete(`/templates/${templateId}/bookmark`);
        setBookmarkedTemplates(prev => {
          const newSet = new Set(prev);
          newSet.delete(templateId);
          return newSet;
        });
        toast.info('Signet retiré', 'Le modèle a été retiré de vos favoris');
      } else {
        await api.post(`/templates/${templateId}/bookmark`);
        setBookmarkedTemplates(prev => new Set([...prev, templateId]));
        toast.success('Signet ajouté', 'Le modèle a été ajouté à vos favoris');
      }
      
      // Mettre à jour le template dans la liste
      setTemplates(prev => prev.map(t => 
        t.id === templateId 
          ? { ...t, isBookmarked: !isBookmarked }
          : t
      ));
      
      analytics.track({
        action: isBookmarked ? 'template_unbookmarked' : 'template_bookmarked',
        category: 'engagement',
        label: templateId
      });
      
    } catch (error) {
      console.error('Erreur lors de la gestion du signet:', error);
      toast.error('Erreur', 'Impossible de mettre à jour le signet');
    } finally {
      updateUIState('isBookmarking', false);
    }
  }, [bookmarkedTemplates, uiState.isBookmarking, toast, updateUIState]);

  // Filtrage et tri optimisés avec useMemo
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates.filter(template => {
      // Recherche textuelle avancée
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch = !filters.searchTerm || 
        template.title.toLowerCase().includes(searchLower) || 
        template.template.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.creatorName?.toLowerCase().includes(searchLower) ||
        (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
        (template.industry && template.industry.some(ind => ind.toLowerCase().includes(searchLower)));
      
      // Filtres de type et catégorie
      const matchesType = filters.selectedType === 'all' || template.type === filters.selectedType;
      const matchesTags = filters.selectedTags.length === 0 || 
        (template.tags && filters.selectedTags.every(tag => template.tags!.includes(tag)));
      const matchesIndustries = filters.selectedIndustries.length === 0 ||
        (template.industry && filters.selectedIndustries.some(ind => template.industry!.includes(ind)));
      const matchesDifficulty = filters.selectedDifficulty === 'all' || template.difficulty === filters.selectedDifficulty;
      
      // Filtres de statut
      const matchesPremium = !filters.showPremiumOnly || template.isPremium;
      const matchesMyTemplates = !filters.showMyTemplatesOnly || template.creatorId === user?.id;
      const matchesAI = !filters.showAIOnly || template.isAIGenerated;
      const matchesFeatured = !filters.showFeaturedOnly || template.isFeatured;
      const matchesBookmarked = !filters.showBookmarkedOnly || template.isBookmarked;
      
      // Filtres de qualité
      const matchesRating = (template.rating || 0) >= filters.minRating;
      const matchesTime = !filters.maxEstimatedTime || (template.estimatedTime || 0) <= filters.maxEstimatedTime;
      
      // Accessibilité
      const isAccessible = template.isPublic || template.creatorId === user?.id;
      const hasPermission = !template.isPremium || subscription?.status === 'active';
      
      return matchesSearch && matchesType && matchesTags && matchesIndustries && 
             matchesDifficulty && matchesPremium && matchesMyTemplates && 
             matchesAI && matchesFeatured && matchesBookmarked && matchesRating && 
             matchesTime && isAccessible && hasPermission;
    });

    // Tri avancé
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          return ratingDiff !== 0 ? ratingDiff : (b.reviewCount || 0) - (a.reviewCount || 0);
        
        case 'useCount':
          return (b.useCount || 0) - (a.useCount || 0);
        
        case 'recent':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        
        case 'popular':
          // Score de popularité combiné
          const scoreA = (a.useCount || 0) * 0.7 + (a.rating || 0) * 0.3;
          const scoreB = (b.useCount || 0) * 0.7 + (b.rating || 0) * 0.3;
          return scoreB - scoreA;
        
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, filters, user?.id, subscription?.status]);

  // Utilitaires pour les filtres
  const clearAllFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      selectedType: 'all',
      selectedTags: [],
      selectedIndustries: [],
      selectedDifficulty: 'all',
      showPremiumOnly: false,
      showMyTemplatesOnly: false,
      showAIOnly: false,
      showFeaturedOnly: false,
      showBookmarkedOnly: false,
      minRating: 0,
      maxEstimatedTime: 120,
      sortBy: 'rating',
      viewMode: filters.viewMode // Garder le mode de vue
    });
    
    analytics.track({
      action: 'filters_cleared',
      category: 'interaction'
    });
  }, [filters.viewMode]);

  const hasActiveFilters = useMemo(() => {
    return filters.searchTerm || 
           filters.selectedType !== 'all' || 
           filters.selectedTags.length > 0 || 
           filters.selectedIndustries.length > 0 ||
           filters.selectedDifficulty !== 'all' ||
           filters.showPremiumOnly || 
           filters.showMyTemplatesOnly || 
           filters.showAIOnly ||
           filters.showFeaturedOnly ||
           filters.showBookmarkedOnly ||
           filters.minRating > 0 ||
           filters.maxEstimatedTime < 120;
  }, [filters]);

  const toggleTag = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  }, []);

  const toggleIndustry = useCallback((industry: string) => {
    setFilters(prev => ({
      ...prev,
      selectedIndustries: prev.selectedIndustries.includes(industry)
        ? prev.selectedIndustries.filter(i => i !== industry)
        : [...prev.selectedIndustries, industry]
    }));
  }, []);

  // Utilitaires d'affichage
  const getTypeInfo = useCallback((type: LetterType | string) => {
    return templateTypes.find(t => t.id === type) || templateTypes[0];
  }, []);

  const getDifficultyInfo = useCallback((difficulty: string) => {
    return difficultyLevels.find(d => d.value === difficulty) || difficultyLevels[0];
  }, []);

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }, []);

  const formatEstimatedTime = useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }, []);

  // Gestion des erreurs avec retry
  const handleRetry = useCallback(() => {
    setError(null);
    fetchTemplates();
  }, [fetchTemplates]);

  // Composants d'interface optimisés
  const LoadingComponent = () => (
    <LazySection animationType="fade">
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-purple-600 animate-spin" style={{animationDuration: '0.8s', animationDirection: 'reverse'}}></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Chargement des modèles...</p>
        <p className="text-sm text-gray-500">Préparation de votre bibliothèque</p>
      </div>
    </LazySection>
  );

  const ErrorComponent = () => (
    <LazySection animationType="slideUp">
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-6 mb-8 rounded-xl shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FaExclamationTriangle className="text-red-600 text-lg" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                leftIcon={<FaSpinner />}
              >
                Réessayer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Rafraîchir la page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </LazySection>
  );

  const StatsCards = () => (
    <LazySection animationType="slideUp">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.totalTemplates, icon: FaRegFileAlt, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
          { label: 'Premium', value: stats.premiumTemplates, icon: FaCrown, color: 'yellow', gradient: 'from-yellow-500 to-yellow-600' },
          { label: 'Publics', value: stats.publicTemplates, icon: FaUsers, color: 'green', gradient: 'from-green-500 to-green-600' },
          { label: 'Mes modèles', value: stats.myTemplates, icon: FaHeart, color: 'purple', gradient: 'from-purple-500 to-purple-600' },
          { label: 'IA', value: stats.aiGeneratedTemplates, icon: FaRobot, color: 'indigo', gradient: 'from-indigo-500 to-indigo-600' },
          { label: 'En vedette', value: stats.featuredTemplates, icon: FaStar, color: 'orange', gradient: 'from-orange-500 to-orange-600' },
          { label: 'Favoris', value: stats.bookmarkedTemplates, icon: FaBookmark, color: 'pink', gradient: 'from-pink-500 to-pink-600' }
        ].map((stat, index) => (
          <div 
            key={stat.label}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow card-hover-premium"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 animate-count" 
                   style={{animationDelay: `${index * 0.1}s`}}>
                  {stat.value}
                </p>
              </div>
              <div className={`bg-gradient-to-r ${stat.gradient} p-3 rounded-lg shadow-lg`}>
                <stat.icon className="text-white h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </LazySection>
  );

  const SearchAndFilters = () => (
    <LazySection animationType="slideUp">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Barre de recherche principale */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un modèle, un tag, une industrie..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
            />
            {filters.searchTerm && (
              <button
                onClick={() => updateFilter('searchTerm', '')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mode de vue */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {viewModes.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => updateFilter('viewMode', mode.value as any)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    filters.viewMode === mode.value
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={mode.label}
                >
                  <mode.icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* Tri */}
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Bouton filtres mobile */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="md"
                leftIcon={<FaFilter />}
                onClick={() => updateUIState('isMobileFiltersOpen', !uiState.isMobileFiltersOpen)}
                rightIcon={uiState.isMobileFiltersOpen ? <FaChevronDown /> : <FaChevronRight />}
              >
                Filtres
                {hasActiveFilters && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </div>

            {/* Filtres desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <select
                value={filters.selectedType}
                onChange={(e) => updateFilter('selectedType', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                {templateTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <button
                  onClick={() => updateUIState('isFilterOpen', !uiState.isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${
                    hasActiveFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  <FaFilter className={hasActiveFilters ? 'text-blue-500' : ''} />
                  Filtres avancés
                  {hasActiveFilters && (
                    <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {Object.values(filters).filter(Boolean).length - 2} {/* -2 pour viewMode et sortBy */}
                    </span>
                  )}
                </button>
                
                {uiState.isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-6">
                    <div className="space-y-6">
                      {/* Options de base */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <FaCheckCircle className="mr-2 text-blue-500" />
                          Options
                        </h4>
                        <div className="space-y-3">
                          {[
                            { key: 'showPremiumOnly', label: 'Modèles premium uniquement', icon: FaCrown },
                            { key: 'showMyTemplatesOnly', label: 'Mes modèles uniquement', icon: FaHeart },
                            { key: 'showAIOnly', label: 'Générés par IA uniquement', icon: FaRobot },
                            { key: 'showFeaturedOnly', label: 'En vedette uniquement', icon: FaStar },
                            { key: 'showBookmarkedOnly', label: 'Favoris uniquement', icon: FaBookmark }
                          ].map(option => (
                            <label key={option.key} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={filters[option.key as keyof FilterState] as boolean}
                                onChange={(e) => updateFilter(option.key as keyof FilterState, e.target.checked as any)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <option.icon className="text-gray-400 h-4 w-4" />
                              <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Niveau de difficulté */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Niveau de difficulté</h4>
                        <select
                          value={filters.selectedDifficulty}
                          onChange={(e) => updateFilter('selectedDifficulty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {difficultyLevels.map(level => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Note minimale */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Note minimale</h4>
                        <div className="flex items-center space-x-3">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={filters.minRating}
                            onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                            className="flex-1"
                          />
                          <div className="flex items-center text-yellow-500">
                            <FaStar className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium text-gray-700">
                              {filters.minRating > 0 ? filters.minRating : 'Toutes'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Temps estimé */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Temps maximum</h4>
                        <div className="flex items-center space-x-3">
                          <input
                            type="range"
                            min="5"
                            max="120"
                            step="5"
                            value={filters.maxEstimatedTime}
                            onChange={(e) => updateFilter('maxEstimatedTime', parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <div className="flex items-center">
                            <FaClock className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {formatEstimatedTime(filters.maxEstimatedTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {availableTags.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {availableTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                  filters.selectedTags.includes(tag)
                                    ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Industries */}
                      {availableIndustries.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Industries</h4>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {availableIndustries.map(industry => (
                              <button
                                key={industry}
                                onClick={() => toggleIndustry(industry)}
                                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                  filters.selectedIndustries.includes(industry)
                                    ? 'bg-green-100 border-green-300 text-green-700 shadow-sm'
                                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {industry}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between pt-4 border-t border-gray-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          leftIcon={<FaTimes />}
                        >
                          Réinitialiser
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateUIState('isFilterOpen', false)}
                        >
                          Appliquer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filtres mobile */}
        {uiState.isMobileFiltersOpen && (
          <div className="lg:hidden bg-gray-50 rounded-xl p-4 space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de lettre
              </label>
              <select
                value={filters.selectedType}
                onChange={(e) => updateFilter('selectedType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templateTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options mobile condensées */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'showPremiumOnly', label: 'Premium' },
                { key: 'showMyTemplatesOnly', label: 'Mes modèles' },
                { key: 'showAIOnly', label: 'IA' },
                { key: 'showFeaturedOnly', label: 'Vedette' }
              ].map(option => (
                <label key={option.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters[option.key as keyof FilterState] as boolean}
                    onChange={(e) => updateFilter(option.key as keyof FilterState, e.target.checked as any)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>

            {/* Tags mobile */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags populaires
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        filters.selectedTags.includes(tag)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="flex items-center flex-wrap gap-2 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600 mr-2 font-medium">Filtres actifs:</span>
            
            {filters.searchTerm && (
              <span className="inline-flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                <FaSearch className="mr-1 h-3 w-3" />
                {filters.searchTerm}
                <button
                  onClick={() => updateFilter('searchTerm', '')}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <FaTimes size={12} />
                </button>
              </span>
            )}
            
            {filters.selectedType !== 'all' && (
              <span className="inline-flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                <FaBriefcase className="mr-1 h-3 w-3" />
                {getTypeInfo(filters.selectedType as LetterType).name}
                <button
                  onClick={() => updateFilter('selectedType', 'all')}
                  className="ml-2 text-green-500 hover:text-green-700"
                >
                  <FaTimes size={12} />
                </button>
              </span>
            )}

            {filters.selectedTags.map(tag => (
              <span key={tag} className="inline-flex items-center bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                <FaTag className="mr-1 h-3 w-3" />
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-2 text-purple-500 hover:text-purple-700"
                >
                  <FaTimes size={12} />
                </button>
              </span>
            ))}

            {filters.selectedIndustries.map(industry => (
              <span key={industry} className="inline-flex items-center bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                <FaBuilding className="mr-1 h-3 w-3" />
                {industry}
                <button
                  onClick={() => toggleIndustry(industry)}
                  className="ml-2 text-yellow-500 hover:text-yellow-700"
                >
                  <FaTimes size={12} />
                </button>
              </span>
            ))}
            
            <button
              onClick={clearAllFilters}
              className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
            >
              <FaTimes className="mr-1 h-3 w-3" />
              Tout effacer
            </button>
          </div>
        )}
      </div>
    </LazySection>
  );
  // Composant Template Card optimisé
  const TemplateCard = React.memo(({ template }: { template: LetterTemplate }) => {
    const TypeIcon = getTypeInfo(template.type).icon;
    const typeInfo = getTypeInfo(template.type);
    const difficultyInfo = getDifficultyInfo(template.difficulty || 'beginner');
    
    return (
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-blue-200 card-hover-premium">
        {/* Header avec image de preview */}
        <div className="relative">
          {template.previewImage ? (
            <OptimizedImage
              src={template.previewImage}
              alt={template.title}
              className="h-32 w-full object-cover group-hover:scale-105 transition-transform duration-300"
              lazy={true}
            />
          ) : (
            <div className={`h-32 bg-gradient-to-br ${typeInfo.gradient} flex items-center justify-center`}>
              <TypeIcon className="text-white text-2xl opacity-80" />
            </div>
          )}
          
          {/* Overlay avec actions rapides */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<FaEye />}
                onClick={() => updateUIState('selectedTemplateId', template.id)}
              >
                Aperçu
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={template.isBookmarked ? <FaBookmark /> : <FaHeart />}
                onClick={() => toggleBookmark(template.id)}
                disabled={uiState.isBookmarking}
                className="bg-white bg-opacity-90"
              >
                {template.isBookmarked ? 'Retiré' : 'Favori'}
              </Button>
            </div>
          </div>

          {/* Badges en overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {template.isPremium && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white shadow-lg">
                <FaCrown className="w-3 h-3 mr-1" />
                Premium
              </span>
            )}
            {template.isFeatured && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white shadow-lg">
                <FaStar className="w-3 h-3 mr-1" />
                Vedette
              </span>
            )}
            {template.isAIGenerated && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-500 text-white shadow-lg">
                <FaRobot className="w-3 h-3 mr-1" />
                IA
              </span>
            )}
          </div>

          {/* Badge de difficulté */}
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${difficultyInfo.color}-100 text-${difficultyInfo.color}-800 shadow-lg`}>
              {difficultyInfo.label}
            </span>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-5">
          {/* Titre et rating */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-lg truncate pr-2 group-hover:text-blue-600 transition-colors">
              {template.title}
            </h3>
            {template.rating && (
              <div className="flex items-center flex-shrink-0">
                <div className="flex items-center text-yellow-500">
                  <FaStar className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700 ml-1">
                    {template.rating.toFixed(1)}
                  </span>
                </div>
                {template.reviewCount && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({template.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Métadonnées */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <div className="flex items-center">
              <TypeIcon className="w-4 h-4 mr-1" />
              <span className="capitalize">{typeInfo.name}</span>
            </div>
            <span>•</span>
            <div className="flex items-center">
              <FaClock className="w-4 h-4 mr-1" />
              {template.estimatedTime ? formatEstimatedTime(template.estimatedTime) : '15 min'}
            </div>
            <span>•</span>
            <span>{formatDate(template.updatedAt)}</span>
          </div>

          {/* Description */}
          {template.description ? (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
              {template.description}
            </p>
          ) : (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
              {template.template.substring(0, 120)}...
            </p>
          )}

          {/* Statistiques et créateur */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-3">
              {template.useCount && (
                <div className="flex items-center">
                  <FaUsers className="w-4 h-4 mr-1" />
                  <span>{template.useCount}</span>
                </div>
              )}
              {template.successRate && (
                <div className="flex items-center">
                  <FaCheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  <span>{template.successRate}% succès</span>
                </div>
              )}
            </div>
            
            {template.creatorName && template.creatorId !== user?.id && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                par {template.creatorName}
              </span>
            )}
            
            {template.creatorId === user?.id && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Mon modèle
              </span>
            )}
          </div>

          {/* Tags et industries */}
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags?.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200"
              >
                <FaTag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {template.industry?.slice(0, 1).map(industry => (
              <span
                key={industry}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-50 text-green-700 border border-green-200"
              >
                <FaBuilding className="w-3 h-3 mr-1" />
                {industry}
              </span>
            ))}
            {(template.tags?.length || 0) + (template.industry?.length || 0) > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-50 text-gray-600 border border-gray-200">
                +{((template.tags?.length || 0) + (template.industry?.length || 0)) - 3}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              as={Link}
              to={`/dashboard/letters/new?template=${template.id}`}
              variant="primary"
              size="sm"
              leftIcon={<FaPlus />}
              className="flex-1"
              onClick={() => analytics.track({
                action: 'template_used',
                category: 'conversion',
                label: template.id
              })}
            >
              Utiliser
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FaEye />}
              onClick={() => updateUIState('selectedTemplateId', template.id)}
            >
              Aperçu
            </Button>

            <Button
              variant="ghost"
              size="sm"
              leftIcon={<FaShare />}
              onClick={() => {
                navigator.share?.({
                  title: template.title,
                  url: window.location.href + `?template=${template.id}`
                });
              }}
            >
              <FaShare />
            </Button>
          </div>
        </div>
      </div>
    );
  });

  // Affichage des templates selon le mode de vue
  const TemplatesDisplay = () => {
    if (filteredAndSortedTemplates.length === 0) {
      return (
        <LazySection animationType="fade">
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaRegFileAlt size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">
              Aucun modèle trouvé
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {hasActiveFilters
                ? "Aucun résultat ne correspond à vos critères. Essayez d'ajuster vos filtres ou explorez d'autres catégories."
                : "Nous n'avons pas trouvé de modèles. Veuillez réessayer ultérieurement."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={clearAllFilters}
                  leftIcon={<FaTimes />}
                >
                  Réinitialiser les filtres
                </Button>
              )}
              <Button
                as={Link}
                to="/dashboard/letters/new"
                variant="primary"
                size="md"
                leftIcon={<FaPlus />}
              >
                Créer une nouvelle lettre
              </Button>
            </div>
          </div>
        </LazySection>
      );
    }

    const gridClasses = {
      grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
      list: 'space-y-4',
      compact: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4'
    };

    return (
      <LazySection animationType="slideUp">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{filteredAndSortedTemplates.length}</span> modèle{filteredAndSortedTemplates.length !== 1 ? 's' : ''} trouvé{filteredAndSortedTemplates.length !== 1 ? 's' : ''}
          </p>
          
          {filteredAndSortedTemplates.length > 12 && (
            <div className="text-sm text-gray-500">
              Affichage des {Math.min(filteredAndSortedTemplates.length, 50)} premiers résultats
            </div>
          )}
        </div>

        {filters.viewMode === 'list' ? (
          <VirtualList
            items={filteredAndSortedTemplates.slice(0, 50)}
            renderItem={(template) => <TemplateCard key={template.id} template={template} />}
            itemHeight={200}
            className="space-y-4" height={30}          />
        ) : (
          <div className={gridClasses[filters.viewMode]}>
            {filteredAndSortedTemplates.slice(0, 50).map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </LazySection>
    );
  };

  // Sections spéciales pour l'engagement
  const CategoryBrowser = () => (
    <LazySection animationType="slideUp">
      <div className="mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Parcourir par catégorie
            </h2>
            <p className="text-gray-600">
              Découvrez nos modèles organisés par type de lettre
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templateTypes.slice(1).map(type => {
            const TypeIcon = type.icon;
            const typeTemplates = templates.filter(t => t.type === type.id && t.isPublic);
            const averageRating = typeTemplates.reduce((acc, t) => acc + (t.rating || 0), 0) / typeTemplates.length;
            
            return (
              <button
                key={type.id}
                onClick={() => {
                  updateFilter('selectedType', type.id);
                  analytics.track({
                    action: 'category_selected',
                    category: 'navigation',
                    label: type.id
                  });
                }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 text-left group border border-gray-100 hover:border-blue-200 card-hover-premium"
              >
                <div className="flex flex-col items-center justify-center mb-1 ">
                  <div className={`bg-gradient-to-br ${type.gradient} p-4 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <TypeIcon className="text-white w-6 h-6" />
                  </div>
                  <div className="flex-1 ">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                      {type.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{typeTemplates.length} modèle{typeTemplates.length !== 1 ? 's' : ''}</span>
                      {averageRating > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center text-yellow-500">
                            <FaStar className="w-3 h-3 mr-1" />
                            <span>{averageRating.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {type.description}
                </p>
                
                {/* Preview des templates populaires de cette catégorie */}
                <div className="flex items-center justify-around text-xs text-gray-500">
                  <span>Plus populaires:</span>
                  <div className="flex gap-1">
                    {typeTemplates
                      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
                      .slice(0, 3)
                      .map((template, index) => (
                        <div 
                          key={template.id}
                          className="w-2 h-2 bg-blue-200 rounded-full"
                          style={{ opacity: 1 - (index * 0.3) }}
                        />
                      ))
                    }
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </LazySection>
  );

  const FeaturedTemplates = () => {
    const featuredTemplates = templates
      .filter(t => t.isFeatured && t.isPublic)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    if (featuredTemplates.length === 0) return null;

    return (
      <LazySection animationType="slideUp">
        <div className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <FaStar className="text-yellow-500 mr-3" />
                Modèles en vedette
              </h2>
              <p className="text-gray-600">
                Nos modèles les plus performants, sélectionnés par notre équipe
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilter('showFeaturedOnly', true)}
            >
              Voir tous les modèles vedettes
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredTemplates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </LazySection>
    );
  };

  const PopularTemplates = () => {
    const popularTemplates = templates
      .filter(t => t.isPublic && (t.useCount || 0) > 5)
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, 6);

    if (popularTemplates.length === 0 || hasActiveFilters) return null;

    return (
      <LazySection animationType="slideUp">
        <div className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <FaUsers className="text-blue-500 mr-3" />
                Modèles populaires
              </h2>
              <p className="text-gray-600">
                Les modèles les plus utilisés par notre communauté
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilter('sortBy', 'useCount')}
            >
              Voir tous les populaires
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularTemplates.map((template, index) => (
              <div key={template.id} className="relative">
                {index < 3 && (
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                )}
                <TemplateCard template={template} />
              </div>
            ))}
          </div>
        </div>
      </LazySection>
    );
  };

  // Render principal
  if (isLoading) {
    return (
      <DashboardLayout>
        <MetaTags 
          title="Modèles de lettres de motivation | TactiqCV"
          description="Découvrez notre collection de modèles professionnels pour créer des lettres de motivation percutantes"
        />
        <LoadingComponent />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <MetaTags 
          title="Erreur - Modèles de lettres | TactiqCV"
          description="Une erreur s'est produite lors du chargement des modèles"
        />
        <ErrorComponent />
      </DashboardLayout>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <MetaTags 
          title={`Modèles de lettres de motivation (${stats.totalTemplates}) | TactiqCV`}
          description={`Explorez ${stats.totalTemplates} modèles professionnels de lettres de motivation. Templates gratuits et premium pour candidatures d'emploi, bourses et stages.`}
          keywords="modèles lettre motivation, templates CV, candidature emploi, lettre bourse, stage"
        />

        {/* Header */}
        <LazySection animationType="slideUp">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modèles de lettres de motivation
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Explorez notre collection de <span className="font-semibold text-blue-600">{stats.totalTemplates} modèles</span> professionnels 
                pour créer des lettres de motivation qui font la différence
              </p>
              
              {/* Quick stats */}
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <FaCrown className="text-yellow-500 mr-1" />
                  <span>{stats.premiumTemplates} premium</span>
                </div>
                <div className="flex items-center">
                  <FaRobot className="text-indigo-500 mr-1" />
                  <span>{stats.aiGeneratedTemplates} par IA</span>
                </div>
                <div className="flex items-center">
                  <FaStar className="text-orange-500 mr-1" />
                  <span>{stats.featuredTemplates} vedettes</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                as={Link}
                to="/dashboard/letters/new"
                variant="primary"
                size="lg"
                leftIcon={<FaPlus />}
                className="shadow-lg hover:shadow-xl"
              >
                Nouvelle lettre
              </Button>
              <Button
                variant="outline"
                size="lg"
                leftIcon={<FaRobot />}
                onClick={() => {
                  // Redirection vers l'IA
                  analytics.track({
                    action: 'ai_generator_clicked',
                    category: 'conversion'
                  });
                }}
              >
                Générer avec IA
              </Button>
            </div>
          </div>
        </LazySection>

        {/* Stats Cards */}
        <StatsCards />

        {/* Search and Filters */}
        <SearchAndFilters />

        {/* Templates Display */}
        <TemplatesDisplay />

        {/* Special Sections - uniquement si pas de filtres actifs */}
        {!hasActiveFilters && (
          <>
            <FeaturedTemplates />
            <PopularTemplates />
            <CategoryBrowser />
          </>
        )}

        {/* Call to Action final */}
        {!hasActiveFilters && (
          <LazySection animationType="fade">
            <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-4">
                Vous ne trouvez pas ce que vous cherchez ?
              </h2>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Notre IA peut créer un modèle personnalisé en fonction de votre secteur d'activité, 
                de votre expérience et du poste visé.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<FaRobot />}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Générer avec IA
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<FaPlus />}
                  className="bg-fuchsia-950 border-white text-white hover:bg-white hover:text-blue-600"
                >
                  Créer un modèle
                </Button>
              </div>
            </div>
          </LazySection>
        )}
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default TemplatesPage;