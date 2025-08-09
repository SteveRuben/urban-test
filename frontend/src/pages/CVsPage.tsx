import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { useCVStore } from '../store/cv.store';
import {  CVRegion } from '../types/cv.types';
import { useToastStore } from '../store/toast.store';
import DashboardLayout from '../components/layout/DashboardLayout';

const CVsPage: React.FC = () => {
  // const navigate = useNavigate();
  const { addToast } = useToastStore();
  const {
    cvs,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCVs,
    filters,
    loadUserCVs,
    deleteCV,
    duplicateCV,
    exportCV,
    setFilters,
    clearError
  } = useCVStore();

  // const [selectedCVs, setSelectedCVs] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    loadUserCVs();
  }, [loadUserCVs]);

  useEffect(() => {
    if (error) {
      addToast(error, 'error');
      clearError();
    }
  }, [error, addToast, clearError]);

  const handleDeleteCV = async (cvId: string) => {
    try {
      await deleteCV(cvId);
      addToast('CV supprimé avec succès', 'success');
      setShowDeleteModal(null);
    } catch (error) {
      console.log('Erreur lors de la suppression',error)
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleDuplicateCV = async (cvId: string, title: string) => {
    try {
      await duplicateCV(cvId, `${title} - Copie`);
      addToast('CV dupliqué avec succès', 'success');
    } catch (error) {
      console.log('Erreur lors de la duplication',error)
      addToast('Erreur lors de la duplication', 'error');
    }
  };

  const handleExportCV = async (cvId: string, format: string) => {
    try {
      const downloadUrl = await exportCV(cvId, format);
      window.open(downloadUrl, '_blank');
      addToast('Export généré avec succès', 'success');
    } catch (error) {
      console.log('Erreur lors de l\'export',error)
      addToast('Erreur lors de l\'export', 'error');
    }
  };

  const handleFilterChange = (key: string, value: string | Date | undefined) => {
    setFilters({ ...filters, [key]: value });
    loadUserCVs(1);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      published: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      draft: 'Brouillon',
      completed: 'Terminé',
      published: 'Publié'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getRegionFlag = (region: CVRegion) => {
    const flags = {
      [CVRegion.FRANCE]: '🇫🇷',
      [CVRegion.USA]: '🇺🇸',
      [CVRegion.UK]: '🇬🇧',
      [CVRegion.GERMANY]: '🇩🇪',
      [CVRegion.CANADA]: '🇨🇦',
      [CVRegion.SPAIN]: '🇪🇸',
      [CVRegion.ITALY]: '🇮🇹',
      [CVRegion.INTERNATIONAL]: '🌍'
    };
    return flags[region] || '🌍';
  };

  if (isLoading && cvs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos CV...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes CV</h1>
              <p className="mt-2 text-gray-600">
                Gérez et optimisez vos CV professionnels ({totalCVs} CV)
              </p>
            </div>
            <Link
              to="/dashboard/cv/new"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Nouveau CV
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
              </label>
              <input
                type="text"
                placeholder="Titre du CV..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="completed">Terminé</option>
                <option value="published">Publié</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Région
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.region || ''}
                onChange={(e) => handleFilterChange('region', e.target.value)}
              >
                <option value="">Toutes les régions</option>
                <option value={CVRegion.FRANCE}>🇫🇷 France</option>
                <option value={CVRegion.USA}>🇺🇸 États-Unis</option>
                <option value={CVRegion.UK}>🇬🇧 Royaume-Uni</option>
                <option value={CVRegion.GERMANY}>🇩🇪 Allemagne</option>
                <option value={CVRegion.CANADA}>🇨🇦 Canada</option>
                <option value={CVRegion.INTERNATIONAL}>🌍 International</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({});
                  loadUserCVs(1);
                }}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des CV */}
        {cvs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun CV trouvé
            </h3>
            <p className="text-gray-600 mb-6">
              Commencez par créer votre premier CV professionnel
            </p>
            <Link
              to="/dashboard/cv/new"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Créer mon premier CV
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cvs.map((cv) => (
              <div key={cv.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* En-tête de la carte */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {cv.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{getRegionFlag(cv.region)}</span>
                        <span>{cv.region.toUpperCase()}</span>
                      </div>
                    </div>
                    {getStatusBadge(cv.status)}
                  </div>

                  {/* Informations */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Dernière modification</span>
                      <span className="text-gray-900">
                        {new Date(cv.updatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {cv.lastAnalysis && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Score d'analyse</span>
                        <span className={`font-medium ${cv.lastAnalysis.overallScore >= 80 ? 'text-green-600' :
                          cv.lastAnalysis.overallScore >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                          {cv.lastAnalysis.overallScore}/100
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sections</span>
                      <span className="text-gray-900">{cv.sections.length}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/dashboard/cv/${cv.id}`}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors text-center text-sm font-medium"
                    >
                      <EyeIcon className="h-4 w-4 inline mr-1" />
                      Voir
                    </Link>

                    <Link
                      to={`/dashboard/cv/${cv.id}/edit`}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                    >
                      <PencilIcon className="h-4 w-4 inline mr-1" />
                      Modifier
                    </Link>
                  </div>

                  {/* Menu d'actions secondaires */}
                  <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleDuplicateCV(cv.id, cv.title)}
                      className="flex-1 text-gray-600 hover:text-blue-600 px-2 py-1 rounded text-xs font-medium transition-colors"
                      title="Dupliquer"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 inline mr-1" />
                      Dupliquer
                    </button>

                    <Link
                      to={`/dashboard/cv/${cv.id}/analyze`}
                      className="flex-1 text-gray-600 hover:text-emerald-600 px-2 py-1 rounded text-xs font-medium transition-colors"
                      title="Analyser"
                    >
                      <ChartBarIcon className="h-4 w-4 inline mr-1" />
                      Analyser
                    </Link>

                    <button
                      onClick={() => handleExportCV(cv.id, 'pdf')}
                      className="flex-1 text-gray-600 hover:text-purple-600 px-2 py-1 rounded text-xs font-medium transition-colors"
                      title="Exporter"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
                      Export
                    </button>

                    <button
                      onClick={() => setShowDeleteModal(cv.id)}
                      className="flex-1 text-gray-600 hover:text-red-600 px-2 py-1 rounded text-xs font-medium transition-colors"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-4 w-4 inline mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => loadUserCVs(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce CV ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteCV(showDeleteModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout >
  );
};

export default CVsPage;