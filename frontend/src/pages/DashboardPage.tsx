import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaFileAlt, 
  FaEye, 
  FaPen, 
  FaTrash, 
  FaPlus, 
  FaSearch,
  FaChartLine,
  FaRegClock,
  FaRegFileAlt,
  FaRegCheckCircle,
  FaExclamationTriangle,
  FaRocket,
  FaTrophy,
  FaCalendarAlt,
  FaStar
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../store/toast.store';
import { LazySection } from '../components/performance/LazySection';
import { useOptimizedFetch, debounce } from '../utils/performance';
import { analytics } from '../utils/analytics';
import MetaTags from '../components/SEO/MetaTags';
import api from '../services/api';
import type { Letter } from '../types';
import LoadingSpinner from '../components/layout/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [stats, setStats] = useState({
    lettersCreated: 0,
    lettersViewed: 0,
    completionRate: 0,
    thisWeekLetters: 0,
    avgResponseTime: 0
  });

  // Analytics tracking
  useEffect(() => {
    analytics.pageView('/dashboard');
    analytics.track({
      action: 'dashboard_visited',
      category: 'engagement'
    });
  }, []);

  // Fetch des données avec cache optimisé
  const { data: dashboardData, loading: isLoading, error } = useOptimizedFetch(
    async () => {
      if (!isAuthenticated || authLoading) return null;
      
      const response = await api.get('/letters');
      const userLetters: Letter[] = response.data.data?.letters || response.data.letters || [];
      
      // Calculer les statistiques avancées
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const finalLetters = userLetters.filter(letter => letter.status === 'final');
      const thisWeekLetters = userLetters.filter(letter => 
        new Date(letter.createdAt) >= oneWeekAgo
      );
      
      const completionRate = userLetters.length > 0 
        ? Math.round((finalLetters.length / userLetters.length) * 100)
        : 0;
      
      const viewEstimate = Math.floor(finalLetters.length * 2.5);
      const avgResponseTime = finalLetters.length > 0 ? 3.2 : 0; // Mock data
      
      return {
        letters: userLetters,
        stats: {
          lettersCreated: userLetters.length,
          lettersViewed: viewEstimate,
          completionRate,
          thisWeekLetters: thisWeekLetters.length,
          avgResponseTime
        }
      };
    },
    [isAuthenticated, authLoading],
    { retries: 2, cache: true }
  );

  // Mettre à jour les états locaux quand les données arrivent
  useEffect(() => {
    if (dashboardData) {
      setLetters(dashboardData.letters);
      setStats(dashboardData.stats);
    }
  }, [dashboardData]);

  // Recherche optimisée avec debounce
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      analytics.track({
        action: 'dashboard_search',
        category: 'engagement',
        label: term
      });
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) debouncedSearch(term);
  };

  // Filtrage optimisé des lettres
  const filteredLetters = React.useMemo(() => {
    if (!searchTerm) return letters;
    
    const term = searchTerm.toLowerCase();
    return letters.filter(letter => 
      letter.title?.toLowerCase().includes(term) ||
      letter.company?.toLowerCase().includes(term) ||
      letter.jobTitle?.toLowerCase().includes(term)
    );
  }, [letters, searchTerm]);

  // Suppression optimisée avec feedback
  const handleDeleteLetter = async (id: string, title: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${title}" ?`)) {
      return;
    }
    
    setIsDeleting(id);
    
    try {
      await api.delete(`/letters/${id}`);
      
      // Mise à jour optimiste
      const updatedLetters = letters.filter(letter => letter.id !== id);
      setLetters(updatedLetters);
      
      // Recalculer les stats
      const finalLetters = updatedLetters.filter(letter => letter.status === 'final');
      const completionRate = updatedLetters.length > 0 
        ? Math.round((finalLetters.length / updatedLetters.length) * 100)
        : 0;
      
      setStats(prev => ({
        ...prev,
        lettersCreated: updatedLetters.length,
        lettersViewed: Math.floor(finalLetters.length * 2.5),
        completionRate
      }));
      
      toast.success('Lettre supprimée', 'La lettre a été supprimée avec succès');
      
      analytics.track({
        action: 'letter_deleted',
        category: 'engagement'
      });
      
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Erreur', 'Impossible de supprimer la lettre');
    } finally {
      setIsDeleting(null);
    }
  };

  // Actions rapides avec tracking
  const handleQuickAction = (action: string, path: string) => {
    analytics.track({
      action: `quick_action_${action}`,
      category: 'conversion'
    });
    navigate(path);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" text="Chargement du tableau de bord..." />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-lg">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-3 text-xl" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold">Erreur de chargement</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <MetaTags 
        title="Tableau de Bord - Motivation Letter AI"
        description="Gérez vos lettres de motivation, consultez vos statistiques et créez de nouvelles lettres."
      />
      
      <DashboardLayout>
        {/* Welcome Section avec animations */}
        <LazySection animationType="slideUp">
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                  {getGreeting()} {user?.displayName ? user.displayName : '👋'}
                </h1>
                <p className="text-gray-600">
                  Voici un aperçu de votre activité récente et de vos lettres de motivation.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleQuickAction('new_letter', '/dashboard/letters/new')}
                  variant="primary"
                  leftIcon={<FaRocket />}
                  className="btn-premium pulse-cta"
                >
                  Nouvelle lettre
                </Button>
                <Button
                  as={Link}
                  to="/dashboard/templates"
                  variant="outline"
                  leftIcon={<FaFileAlt />}
                >
                  Templates
                </Button>
              </div>
            </div>
          </div>
        </LazySection>

        {/* Stats Cards avec animations améliorées */}
        <LazySection animationType="slideUp">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Lettres créées */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 card-hover-premium">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <FaRegFileAlt className="text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800 animate-count">
                    {stats.lettersCreated}
                  </div>
                  <div className="text-xs text-gray-500">
                    +{stats.thisWeekLetters} cette semaine
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Lettres créées
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total de vos lettres
              </div>
            </div>

            {/* Visualisations */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 card-hover-premium">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <FaEye className="text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800 animate-count">
                    {stats.lettersViewed}
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    ↗ +23% ce mois
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Vues estimées
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Par les recruteurs
              </div>
            </div>

            {/* Taux de complétion */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 card-hover-premium">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 text-green-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <FaChartLine className="text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800 animate-count">
                    {stats.completionRate}%
                  </div>
                  <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                    <div 
                      className="h-1 bg-green-500 rounded-full transition-all duration-1000"
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Taux de complétion
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Lettres finalisées
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 card-hover-premium">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <FaTrophy className="text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800 animate-count">
                    {stats.avgResponseTime}j
                  </div>
                  <div className="flex items-center text-xs text-yellow-600">
                    <FaStar className="mr-1" />
                    Excellent
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Temps de réponse
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Moyenne estimée
              </div>
            </div>
          </div>
        </LazySection>

        {/* Quick Actions améliorées */}
        <LazySection animationType="slideLeft">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <FaRocket className="mr-3 text-blue-600" />
                Actions rapides
              </h2>
              <div className="text-sm text-gray-500">
                Accès direct à vos outils favoris
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleQuickAction('new_letter', '/dashboard/letters/new')}
                className="group p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-300 text-left card-hover-premium flex flex-col items-center justify-center"
              >
                <div className="bg-blue-600  text-white w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FaPlus />
                </div>
                <div className="font-semibold text-gray-800 mb-1">Nouvelle lettre</div>
                <div className="text-sm text-gray-600">Créer depuis zéro</div>
              </button>

              <button
                onClick={() => handleQuickAction('templates', '/dashboard/templates')}
                className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all duration-300 text-left card-hover-premium flex flex-col items-center justify-center"
              >
                <div className="bg-purple-600 text-white w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FaFileAlt />
                </div>
                <div className="font-semibold text-gray-800 mb-1">Templates</div>
                <div className="text-sm text-gray-600">Modèles premium</div>
              </button>

              <button
                onClick={() => handleQuickAction('letters', '/dashboard/letters')}
                className="group p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all duration-300 text-left card-hover-premium flex flex-col items-center justify-center"
              >
                <div className="bg-green-600 text-white w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FaRegFileAlt />
                </div>
                <div className="font-semibold text-gray-800 mb-1">Mes lettres</div>
                <div className="text-sm text-gray-600">{letters.length} lettres</div>
              </button>

              <button
                onClick={() => handleQuickAction('upgrade', '/dashboard/subscription')}
                className="group p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 transition-all duration-300 text-left card-hover-premium flex flex-col items-center justify-center"
              >
                <div className="bg-yellow-600 text-white w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FaTrophy />
                </div>
                <div className="font-semibold text-gray-800 mb-1">Upgrade</div>
                <div className="text-sm text-gray-600">Plan Premium</div>
              </button>
            </div>
          </div>
        </LazySection>

        {/* Recent Letters avec design amélioré */}
        <LazySection animationType="slideUp">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center flex-col sm:flex-row gap-4 sm:gap-0">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold text-gray-800 mr-4">
                    Lettres récentes
                  </h2>
                  {letters.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {letters.length} total
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors w-64"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {filteredLetters.length > 0 ? (
                <div className="space-y-4">
                  {filteredLetters.slice(0, 5).map((letter, index) => (
                    <div 
                      key={letter.id} 
                      className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 card-hover-premium"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${
                              letter.status === 'final' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                            <h3 className="font-semibold text-gray-800 truncate">
                              {letter.title || 'Sans titre'}
                            </h3>
                            {letter.company && (
                              <span className="text-sm text-gray-500 hidden sm:inline">
                                • {letter.company}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <FaCalendarAlt className="mr-1" />
                              {formatDate(letter.updatedAt)}
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              letter.status === 'final' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {letter.status === 'final' ? (
                                <>
                                  <FaRegCheckCircle className="mr-1" />
                                  Finalisée
                                </>
                              ) : (
                                <>
                                  <FaRegClock className="mr-1" />
                                  Brouillon
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            to={`/dashboard/letters/${letter.id}`}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Voir"
                          >
                            <FaEye size={14} />
                          </Link>
                          <Link
                            to={`/dashboard/letters/${letter.id}/edit`}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                            title="Modifier"
                          >
                            <FaPen size={14} />
                          </Link>
                          <button
                            onClick={() => handleDeleteLetter(letter.id, letter.title || 'Sans titre')}
                            disabled={isDeleting === letter.id}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Supprimer"
                          >
                            {isDeleting === letter.id ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <FaTrash size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {letters.length > 5 && (
                    <div className="pt-4 text-center border-t border-gray-100">
                      <Button
                        as={Link}
                        to="/dashboard/letters"
                        variant="outline"
                        leftIcon={<FaRegFileAlt />}
                      >
                        Voir toutes mes lettres ({letters.length})
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FaFileAlt size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {searchTerm ? 'Aucune lettre trouvée' : 'Prêt à commencer ?'}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {searchTerm 
                      ? `Aucun résultat pour "${searchTerm}". Essayez d'autres mots-clés.`
                      : "Créez votre première lettre de motivation professionnelle en quelques minutes avec notre IA avancée."}
                  </p>
                  {!searchTerm && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => handleQuickAction('new_letter', '/dashboard/letters/new')}
                        variant="primary"
                        leftIcon={<FaRocket />}
                        className="btn-premium"
                      >
                        Créer ma première lettre
                      </Button>
                      <Button
                        as={Link}
                        to="/dashboard/templates"
                        variant="outline"
                        leftIcon={<FaFileAlt />}
                      >
                        Parcourir les templates
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </LazySection>
      </DashboardLayout>
    </>
  );
};

export default DashboardPage;