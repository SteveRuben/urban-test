import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaFileAlt,
  FaEye,
  FaPen,
  FaTrash,
  FaPlus,
  FaSearch,
  FaFilter,
  FaSort,
  FaRegCheckCircle,
  FaRegClock,
  FaDownload,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';
import type { Letter } from '../types';

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds?: number;
}

const firebaseTimeStamptoDate = (params:  FirebaseTimestamp | unknown) => {
  if (!params) return new Date();
  if (typeof params === 'object' && params !== null && '_seconds' in params) {
    const milliseconds = (params as FirebaseTimestamp)._seconds * 1000 + ((params as FirebaseTimestamp)._nanoseconds || 0) / 1000000;
    return new Date(milliseconds);
  }
  return new Date();
}

interface LetterWithJobTitle extends Letter {
  jobTitle?: string;
}

const LettersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'final'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [letters, setLetters] = useState<LetterWithJobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Vérification de l'authentification
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Récupération des lettres depuis l'API
  useEffect(() => {
    const fetchLetters = async () => {
      try {
        setIsLoading(true);
        setError(null);

        try {
          // Tentative de récupération des lettres depuis l'API
          const response = await api.get('/letters');
          setLetters(response.data.data.letters);
        } catch (apiError: unknown) {
          console.warn('Impossible de récupérer les lettres depuis l\'API, utilisation des données de démonstration', apiError);

        // Pour les erreurs d'authentification, ne pas afficher d'erreur à l'utilisateur
        if (apiError instanceof Error && 'response' in apiError) {
          const errorResponse = (apiError as { response?: { status?: number } }).response;
          if (errorResponse?.status !== 401 && errorResponse?.status !== 403) {
            setError('Impossible de charger vos lettres depuis le serveur. Affichage des données de démonstration.');
          }
        }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLetters();
  }, []);

  // Filtrage et tri des lettres
  const filteredAndSortedLetters = [...letters]
    .filter(letter =>
      (filterStatus === 'all' || letter.status === filterStatus) &&
      (letter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (letter.company && letter.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (letter.jobTitle && letter.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? firebaseTimeStamptoDate(a.updatedAt).getTime() - firebaseTimeStamptoDate(b.updatedAt).getTime()
          : firebaseTimeStamptoDate(b.updatedAt).getTime() - firebaseTimeStamptoDate(a.updatedAt).getTime();
      } else {
        return sortDirection === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    });


  // Formatage de la date
  const formatDate = (dateString: string) => {
    const date = firebaseTimeStamptoDate(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Fonction pour basculer le tri
  const toggleSort = (criteria: 'date' | 'title') => {
    if (sortBy === criteria) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortDirection('desc');
    }
  };

  // Fonction pour supprimer une lettre
  const handleDeleteLetter = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette lettre ?')) {
      return;
    }

    try {
      await api.delete(`/letters/${id}`);
      // Mettre à jour la liste après suppression
      setLetters(letters.filter(letter => letter.id !== id));
    } catch (err: unknown) {
      console.error('Erreur lors de la suppression de la lettre:', err);
      const errorMessage = err instanceof Error ? err.message : 'Impossible d\'exporter le CV';
      alert(errorMessage || 'Erreur lors de la suppression de la lettre');
    }

  };

  // Téléchargement d'une lettre (PDF)
  const handleDownload = async (id: string) => {
    try {
      const response = await api.get(`/letters/${id}/export`, {
        params: { format: 'pdf' },
      });
     
      // Créer un lien pour télécharger le fichier
      if (response.data.data.blob) {
        const binaryString = window.atob(response.data.data.blob);
        
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes.buffer], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lettre-de-motivation-${id}.pdf`);
        document.body.appendChild(link);
        link.click();

        // Nettoyer
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement de la lettre:', err);
      alert('Erreur lors du téléchargement de la lettre. Veuillez réessayer plus tard.');
    }
  };

  // Affichage d'un état de chargement
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Mes lettres de motivation
          </h1>
          <p className="text-gray-600">
            Gérez toutes vos lettres en un seul endroit.
          </p>
        </div>
        <Button
          as={Link}
          to="/dashboard/letters/new"
          variant="primary"
          size="lg"
          leftIcon={<FaPlus />}
        >
          Nouvelle lettre
        </Button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="relative w-full md:w-[300px]">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Rechercher une lettre..."
              className="px-3 pl-10 py-2 rounded-md border border-gray-300 w-full hover:border-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <button
                className="flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:border-gray-400"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <FaFilter className="mr-2" />
                Filtrer
              </button>

              {isFilterOpen && (
                <div className="absolute top-full right-0 mt-2 w-[200px] bg-white rounded-md shadow-lg border border-gray-200 z-10 py-2">
                  <div className="px-3 py-2 font-medium text-sm text-gray-700">
                    Statut
                  </div>
                  <button
                    className={`flex items-center w-full px-3 py-2 text-left text-sm ${filterStatus === 'all'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    onClick={() => setFilterStatus('all')}
                  >
                    Toutes les lettres
                  </button>
                  <button
                    className={`flex items-center w-full px-3 py-2 text-left text-sm ${filterStatus === 'draft'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    onClick={() => setFilterStatus('draft')}
                  >
                    <FaRegClock className="mr-2" />
                    Brouillons
                  </button>
                  <button
                    className={`flex items-center w-full px-3 py-2 text-left text-sm ${filterStatus === 'final'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    onClick={() => setFilterStatus('final')}
                  >
                    <FaRegCheckCircle className="mr-2" />
                    Finalisées
                  </button>
                </div>
              )}
            </div>

            <button
              className="flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:border-gray-400"
              onClick={() => toggleSort(sortBy === 'date' ? 'title' : 'date')}
            >
              <FaSort className="mr-2" />
              Trier par {sortBy === 'date' ? 'date' : 'titre'} ({sortDirection === 'asc' ? 'croissant' : 'décroissant'})
            </button>
          </div>
        </div>

        {/* Filters indicators */}
        {(searchTerm || filterStatus !== 'all') && (
          <div className="flex items-center flex-wrap gap-2">
            {searchTerm && (
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                Recherche: {searchTerm}
                <button
                  className="ml-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setSearchTerm('')}
                >
                  <FaTimes size={12} />
                </button>
              </div>
            )}

            {filterStatus !== 'all' && (
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                Statut: {filterStatus === 'draft' ? 'Brouillons' : 'Finalisées'}
                <button
                  className="ml-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setFilterStatus('all')}
                >
                  <FaTimes size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Letters List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredAndSortedLetters.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-4 px-6 text-left border-b border-gray-200 text-sm font-medium text-gray-600">
                      <button
                        className="flex items-center bg-transparent text-gray-600 font-medium"
                        onClick={() => toggleSort('title')}
                      >
                        Titre
                        {sortBy === 'title' && (
                          <span className="ml-1 text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="py-4 px-6 text-left border-b border-gray-200 text-sm font-medium text-gray-600 hidden md:table-cell">
                      Entreprise
                    </th>
                    <th className="py-4 px-6 text-left border-b border-gray-200 text-sm font-medium text-gray-600 hidden sm:table-cell">
                      Poste
                    </th>
                    <th className="py-4 px-6 text-center border-b border-gray-200 text-sm font-medium text-gray-600">
                      Statut
                    </th>
                    <th className="py-4 px-6 text-left border-b border-gray-200 text-sm font-medium text-gray-600 hidden md:table-cell">
                      <button
                        className="flex items-center bg-transparent text-gray-600 font-medium"
                        onClick={() => toggleSort('date')}
                      >
                        Dernière modification
                        {sortBy === 'date' && (
                          <span className="ml-1 text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="py-4 px-6 text-center border-b border-gray-200 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6 border-b border-gray-200 text-sm">
                        <div className="font-medium text-gray-800">{letter.title}</div>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-200 text-sm hidden md:table-cell">
                        {letter.company || 'Non spécifié'}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-200 text-sm hidden sm:table-cell">
                        {letter.jobTitle || 'Non spécifié'}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-200 text-sm text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${letter.status === 'final'
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
                      </td>
                      <td className="py-4 px-6 border-b border-gray-200 text-sm text-gray-600 hidden md:table-cell">
                        {formatDate(letter.updatedAt)}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-200 text-sm">
                        <div className="flex justify-center gap-2">
                          <Link
                            to={`/dashboard/letters/${letter.id}`}
                            className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                            title="Voir"
                          >
                            <FaEye size={14} />
                          </Link>
                          <Link
                            to={`/dashboard/letters/${letter.id}/edit`}
                            className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-purple-50 hover:text-purple-600"
                            title="Modifier"
                          >
                            <FaPen size={14} />
                          </Link>
                          {letter.status === 'final' && (
                            <button
                              className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-green-50 hover:text-green-500"
                              title="Télécharger"
                              onClick={() => handleDownload(letter.id)}
                            >
                              <FaDownload size={14} />
                            </button>
                          )}
                          <button
                            className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-red-50 hover:text-red-500"
                            title="Supprimer"
                            onClick={() => handleDeleteLetter(letter.id)}
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-6">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaFileAlt size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Aucune lettre trouvée
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-[400px] mx-auto">
              {searchTerm || filterStatus !== 'all'
                ? "Aucun résultat ne correspond à vos critères de recherche. Essayez d'autres filtres ou créez une nouvelle lettre."
                : "Vous n'avez pas encore créé de lettre de motivation. Commencez maintenant et gagnez du temps dans vos candidatures !"}
            </p>
            <Button
              as={Link}
              to="/dashboard/letters/new"
              variant="primary"
              size="md"
              leftIcon={<FaPlus />}
            >
              Créer une lettre
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LettersPage;