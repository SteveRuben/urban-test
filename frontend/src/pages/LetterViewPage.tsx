// LetterViewPage.tsx - Partie 1/4 : Imports et Types Premium
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaDownload,
  FaEdit,
  FaTrash,
  FaShare,
  FaArrowLeft,
  FaSpinner,
  FaExclamationTriangle,
  FaEye,
  FaClock,
  FaBuilding,
  FaFileAlt,
  FaBookmark,
  FaHeart,
  FaCopy,
  FaEnvelope,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaWhatsapp,
  FaTelegram,
  FaCode,
  FaExpand,
  FaCompress,
  FaPrint,
  FaRedo,
  FaChartLine,
  FaSearch,
  FaHistory,
  FaClone,
  FaTimes,
  FaCheckCircle,
  FaExclamation,
  FaGraduationCap,
  FaCrown,
  FaLightbulb,
  FaBrain,
  FaUserCheck,
  FaMagic,
  FaEllipsisV,
  FaTag,
  FaTags,
  FaBriefcase,
  FaFilePdf,
  FaFileWord,
  FaAlignLeft,
  FaLink,
  FaFont,
  FaAudible
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { LazySection } from '../components/performance/LazySection';
import { useLetterStore } from '../store/letter.store';
import { useAuthStore } from '../store/auth.store';
import { useSubscriptionStore } from '../store/subscription.store';
import { useToast } from '../store/toast.store';
import { analytics } from '../utils/analytics';
import { debounce } from '../utils/performance';
import MetaTags from '../components/SEO/MetaTags';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';
import { letterService } from '../services';
import type { AIAnalysis, ExportOptions, LetterMetadata, LetterStats, ShareOptions, UIState, VersionHistory } from '../types';

const firebaseTimeStamptoDate = (params: any) => {
  if(!params) return new Date();
  if (params.hasOwnProperty("_seconds")) {
    const milliseconds = params._seconds * 1000 + params._nanoseconds / 1000000;
    return new Date(milliseconds);
  }
  return new Date();
}

// Utilitaires de formatage améliorés
const formatDate = (dateString: string | Date): string => {
  const date = firebaseTimeStamptoDate(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatRelativeTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`;

  return formatDate(dateString);
};

const calculateMetadata = (content: string): LetterMetadata => {
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const avgWordsPerMinute = 200; // Vitesse de lecture moyenne

  return {
    wordCount: words.length,
    characterCount: content.length,
    paragraphCount: paragraphs.length,
    estimatedReadingTime: Math.ceil(words.length / avgWordsPerMinute),
    keywordsCount: new Set(words.map(w => w.toLowerCase())).size,
    views: 0,
    shares: 0,
    downloads: 0
  };
};

const getLetterTypeIcon = (type?: string) => {
  switch (type) {
    case 'job_application': return FaBriefcase;
    case 'scholarship': return FaGraduationCap;
    case 'internship': return FaUserCheck;
    case 'motivation': return FaAudible;
    case 'cover': return FaFileAlt;
    default: return FaFileAlt;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'yellow';
    case 'final': return 'green';
    case 'archived': return 'gray';
    case 'template': return 'blue';
    case 'shared': return 'purple';
    default: return 'gray';
  }
};

const getToneColor = (tone?: string) => {
  switch (tone) {
    case 'professional': return 'blue';
    case 'friendly': return 'green';
    case 'formal': return 'indigo';
    case 'casual': return 'orange';
    case 'persuasive': return 'red';
    default: return 'gray';
  }
};
// LetterViewPage.tsx - Partie 2/4 : Composants Modaux Premium

// Modal d'Export Avancé
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  isLoading: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, isLoading }) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    quality: 'standard',
    includeMetadata: true,
    includeWatermark: false,
    fontSize: 12,
    fontFamily: 'Times New Roman',
    margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 }
  });

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(options);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 p-6">
          <div className="flex items-center">
            <FaDownload className="text-blue-600 mr-3" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Exporter la lettre</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Format de fichier</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { format: 'pdf' as const, icon: FaFilePdf, label: 'PDF', color: 'red' },
                { format: 'docx' as const, icon: FaFileWord, label: 'Word', color: 'blue' },
                { format: 'txt' as const, icon: FaFileAlt, label: 'Texte', color: 'gray' },
                { format: 'html' as const, icon: FaCode, label: 'HTML', color: 'orange' }
              ].map(({ format, icon: Icon, label, color }) => (
                <button
                  key={format}
                  onClick={() => setOptions(prev => ({ ...prev, format }))}
                  className={`p-4 border-2 rounded-lg transition-all text-center ${options.format === format
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                >
                  <Icon className="mx-auto mb-2" size={24} />
                  <div className="text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Settings */}
          {(options.format === 'pdf' || options.format === 'docx') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Qualité</label>
              <div className="flex space-x-4">
                {[
                  { value: 'standard' as const, label: 'Standard', desc: 'Taille réduite' },
                  { value: 'high' as const, label: 'Haute', desc: 'Qualité optimale' },
                  { value: 'ultra' as const, label: 'Ultra', desc: 'Maximum de détails' }
                ].map(({ value, label, desc }) => (
                  <label key={value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="quality"
                      value={value}
                      checked={options.quality === value}
                      onChange={(e) => setOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-800">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Typography Settings */}
          {options.format !== 'txt' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Police</label>
                <select
                  value={options.fontFamily}
                  onChange={(e) => setOptions(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Taille de police</label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={options.fontSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Options avancées</h4>

            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeMetadata}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">Inclure les métadonnées</div>
                  <div className="text-xs text-gray-500">Date de création, modification, statistiques</div>
                </div>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeWatermark}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeWatermark: e.target.checked }))}
                  className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-800">Filigrane TactiqCV</div>
                  <div className="text-xs text-gray-500">Ajouter un filigrane discret</div>
                </div>
              </label>
            </div>
          </div>

          {/* Margins Settings for PDF */}
          {options.format === 'pdf' && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Marges (cm)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(options.margins || {}).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-600 mb-1 capitalize">{key}</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={value}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        margins: { ...prev.margins!, [key]: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <FaEye className="text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Aperçu des paramètres</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>Format: <span className="font-medium">{options.format.toUpperCase()}</span></div>
              <div>Qualité: <span className="font-medium">{options.quality}</span></div>
              <div>Police: <span className="font-medium">{options.fontFamily} {options.fontSize}pt</span></div>
              <div>Métadonnées: <span className="font-medium">{options.includeMetadata ? 'Oui' : 'Non'}</span></div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExport}
            loading={isLoading}
            leftIcon={<FaDownload />}
          >
            {isLoading ? 'Export en cours...' : 'Exporter'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Modal de Partage Avancé
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (options: ShareOptions) => void;
  isLoading: boolean;
  letter: any;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, onShare, isLoading, letter }) => {
  const [options, setOptions] = useState<ShareOptions>({
    platform: 'copy',
    message: '',
    includePreview: true,
    publicAccess: false
  });

  if (!isOpen) return null;

  const platforms = [
    { id: 'email' as const, name: 'Email', icon: FaEnvelope, color: 'blue' },
    { id: 'linkedin' as const, name: 'LinkedIn', icon: FaLinkedin, color: 'blue' },
    { id: 'twitter' as const, name: 'Twitter', icon: FaTwitter, color: 'sky' },
    { id: 'facebook' as const, name: 'Facebook', icon: FaFacebook, color: 'blue' },
    { id: 'whatsapp' as const, name: 'WhatsApp', icon: FaWhatsapp, color: 'green' },
    { id: 'telegram' as const, name: 'Telegram', icon: FaTelegram, color: 'blue' },
    { id: 'copy' as const, name: 'Copier le lien', icon: FaCopy, color: 'gray' }
  ];

  const handleShare = () => {
    onShare(options);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex justify-between items-center border-b border-gray-200 p-6">
          <div className="flex items-center">
            <FaShare className="text-blue-600 mr-3" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Partager la lettre</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Plateforme</label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map(({ id, name, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setOptions(prev => ({ ...prev, platform: id }))}
                  className={`p-3 border-2 rounded-lg transition-all text-left flex items-center ${options.platform === id
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                >
                  <Icon className="mr-3" size={20} />
                  <span className="text-sm font-medium">{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message personnalisé */}
          {options.platform !== 'copy' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message personnalisé (optionnel)
              </label>
              <textarea
                value={options.message}
                onChange={(e) => setOptions(prev => ({ ...prev, message: e.target.value }))}
                placeholder={`Découvrez ma lettre de motivation pour ${letter?.jobTitle || 'ce poste'} chez ${letter?.company || 'cette entreprise'}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Options avancées */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Options de partage</h4>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.includePreview}
                onChange={(e) => setOptions(prev => ({ ...prev, includePreview: e.target.checked }))}
                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-800">Inclure un aperçu</div>
                <div className="text-xs text-gray-500">Afficher un extrait du contenu</div>
              </div>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.publicAccess}
                onChange={(e) => setOptions(prev => ({ ...prev, publicAccess: e.target.checked }))}
                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-800">Accès public</div>
                <div className="text-xs text-gray-500">Permettre la consultation sans connexion</div>
              </div>
            </label>
          </div>

          {/* Preview du lien */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FaLink className="text-gray-600 mr-2" size={14} />
              <span className="text-sm font-medium text-gray-700">Aperçu du lien</span>
            </div>
            <div className="text-xs text-gray-600 break-all font-mono bg-white p-2 rounded border">
              https://tactiqcv.com/letters/shared/{letter?.id || 'xxx'}?preview={options.includePreview ? 'true' : 'false'}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleShare}
            loading={isLoading}
            leftIcon={<FaShare />}
          >
            {isLoading ? 'Partage en cours...' : 'Partager'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Modal de Confirmation de Suppression
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  letter: any;
  isLoading: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  letter,
  isLoading
}) => {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'SUPPRIMER';

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmText === requiredText) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center border-b border-gray-200 p-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-600 mr-3" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Supprimer la lettre</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-red-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800 mb-2">Action irréversible</h4>
                <p className="text-red-700 text-sm">
                  Cette action supprimera définitivement la lettre "{letter?.title}" et toutes ses données associées.
                  Cette action ne peut pas être annulée.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Pour confirmer, tapez <span className="font-bold text-red-600">{requiredText}</span> :
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={requiredText}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={isLoading}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-800 mb-2">Données qui seront supprimées :</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Contenu de la lettre</li>
              <li>• Historique des versions</li>
              <li>• Métadonnées et statistiques</li>
              <li>• Analyses IA associées</li>
              <li>• Liens de partage existants</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={handleConfirm}
            disabled={confirmText !== requiredText || isLoading}
            loading={isLoading}
            leftIcon={<FaTrash />}
            className="text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Composant d'Analyse IA
interface AIAnalysisCardProps {
  analysis?: AIAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({ analysis, isLoading, onAnalyze }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FaSpinner className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Analyse IA en cours...</p>
            <p className="text-sm text-gray-500">Évaluation du contenu et des suggestions</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <FaBrain className="text-blue-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Analyse IA disponible</h3>
          <p className="text-gray-600 mb-4">
            Obtenez une analyse détaillée de votre lettre avec des suggestions d'amélioration personnalisées.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onAnalyze}
            leftIcon={<FaMagic />}
          >
            Analyser avec l'IA
          </Button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FaBrain className="text-blue-600 mr-2" />
          Analyse IA
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          leftIcon={<FaRedo />}
        >
          Réanalyser
        </Button>
      </div>

      {/* Scores principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Force globale</span>
            <span className={`text-${getScoreColor(analysis.strength)}-600 font-bold`}>
              {analysis.strength}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-${getScoreColor(analysis.strength)}-500 h-2 rounded-full transition-all duration-500`}
              style={{ width: `${analysis.strength}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Compétitivité</span>
            <span className={`text-${getScoreColor(analysis.competitiveness)}-600 font-bold`}>
              {analysis.competitiveness}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-${getScoreColor(analysis.competitiveness)}-500 h-2 rounded-full transition-all duration-500`}
              style={{ width: `${analysis.competitiveness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ton détecté */}
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-2">Ton détecté</span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${getToneColor(analysis.tone)}-100 text-${getToneColor(analysis.tone)}-700`}>
          {analysis.tone === 'professional' && '💼 Professionnel'}
          {analysis.tone === 'friendly' && '😊 Amical'}
          {analysis.tone === 'formal' && '🎩 Formel'}
          {analysis.tone === 'casual' && '😎 Décontracté'}
          {analysis.tone === 'persuasive' && '🎯 Persuasif'}
        </span>
      </div>

      {/* Suggestions d'amélioration */}
      {analysis.suggestions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <FaLightbulb className="text-yellow-500 mr-2" />
            Suggestions d'amélioration
          </h4>
          <div className="space-y-2">
            {analysis.suggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="flex items-start bg-blue-50 p-3 rounded-lg">
                <FaCheckCircle className="text-blue-600 mr-2 mt-1 flex-shrink-0" size={14} />
                <span className="text-sm text-blue-800">{suggestion}</span>
              </div>
            ))}
            {analysis.suggestions.length > 3 && (
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Voir {analysis.suggestions.length - 3} suggestions de plus
              </button>
            )}
          </div>
        </div>
      )}

      {/* Points faibles */}
      {analysis.weaknesses.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <FaExclamation className="text-orange-500 mr-2" />
            Points d'attention
          </h4>
          <div className="space-y-2">
            {analysis.weaknesses.slice(0, 2).map((weakness, index) => (
              <div key={index} className="flex items-start bg-orange-50 p-3 rounded-lg">
                <FaExclamationTriangle className="text-orange-600 mr-2 mt-1 flex-shrink-0" size={14} />
                <span className="text-sm text-orange-800">{weakness}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domaines d'amélioration prioritaires */}
      {analysis.improvementAreas && analysis.improvementAreas.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <FaAudible className="text-purple-500 mr-2" />
            Priorités d'amélioration
          </h4>
          <div className="space-y-3">
            {analysis.improvementAreas.slice(0, 3).map((area, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{area.category}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${area.priority === 'high' ? 'bg-red-100 text-red-700' :
                      area.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                    {area.priority === 'high' ? 'Haute' :
                      area.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{area.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
// LetterViewPage.tsx - Partie 3/4 : State Management et Logique

const LetterViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Stores
  // @ts-ignore
  const { user } = useAuthStore();
  const { subscription } = useSubscriptionStore();
  const toast = useToast();
  const {
    letter,
    isLoading,
    error,
    fetchLetter,
    updateLetter,
    deleteLetter,
    clearError
  } = useLetterStore();

  // État local optimisé
  const [uiState, setUIState] = useState<UIState>({
    isFullscreen: false,
    showMetadata: false,
    showAnalysis: false,
    showVersionHistory: false,
    showShareModal: false,
    showExportModal: false,
    showDeleteConfirm: false,
    selectedExportFormat: 'pdf',
    selectedSharePlatform: 'copy',
    isExporting: false,
    isSharing: false,
    isAnalyzing: false,
    isBookmarked: false,
    currentView: 'preview',
    sidebarCollapsed: false,
    activeTab: 'content'
  });

  const [metadata, setMetadata] = useState<LetterMetadata | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  // @ts-ignore
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  // @ts-ignore
  const [stats, setStats] = useState<LetterStats | null>(null);

  // Memoized calculations
  const computedMetadata = useMemo(() => {
    if (!letter?.content) return null;
    return calculateMetadata(letter.content);
  }, [letter?.content]);

  const hasUnsavedChanges = useMemo(() => {
    return false; // Sera implémenté avec l'éditeur
  }, []);

  const canExport = useMemo(() => {
    return subscription?.status === 'active' || (metadata?.wordCount || 0) < 1000;
  }, [subscription, metadata]);

  const canAnalyze = useMemo(() => {
    return subscription?.status === 'active';
  }, [subscription]);

  // Effects
  useEffect(() => {
    if (!id) return;
    fetchLetter(id);

    // Analytics
    analytics.pageView(`/dashboard/letters/${id}`);
    analytics.track({
      action: 'letter_viewed',
      category: 'engagement',
      label: id
    });
  }, [id, fetchLetter]);

  useEffect(() => {
    if (letter) {
      setMetadata(computedMetadata);

      // Mettre à jour les stats de vue
      const updateViewStats = async () => {
        try {
         await letterService.incrementViews(letter.id);
        } catch (error) {
          console.error('Error updating view stats:', error);
        }
      };

      updateViewStats();
    }
  }, [letter, computedMetadata]);

  // Debounced save pour les changements automatiques
  const debouncedSave = useCallback(
    debounce(async (updatedData: any) => {
      try {
        await updateLetter(letter?.id || '', updatedData);
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }, 2000),
    [letter?.id, updateLetter]
  );

  // Event handlers optimisés
  const updateUIState = useCallback(<K extends keyof UIState>(
    key: K,
    value: UIState[K]
  ) => {
    setUIState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!letter?.id) return;

    updateUIState('showDeleteConfirm', false);

    try {
      await deleteLetter(letter.id);

      toast.success('Lettre supprimée', 'La lettre a été supprimée avec succès');

      analytics.track({
        action: 'letter_deleted',
        category: 'engagement',
        label: letter.id
      });

      navigate('/dashboard/letters');
    } catch (error: any) {
      console.error('Error deleting letter:', error);
      toast.error('Erreur', 'Impossible de supprimer la lettre');
    }
  }, [letter?.id, deleteLetter, navigate, toast, updateUIState]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!letter?.id || !canExport) return;

    updateUIState('isExporting', true);

    try {
      const blob = await letterService.exportLetter(letter.id, options);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${letter.title || 'letter'}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Export réussi', `La lettre a été exportée en ${options.format.toUpperCase()}`);

      analytics.track({
        action: 'letter_exported',
        category: 'conversion',
        label: `${letter.id}-${options.format}`
      });

      updateUIState('showExportModal', false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Erreur d\'export', error.message || 'Impossible d\'exporter la lettre');
    } finally {
      updateUIState('isExporting', false);
    }
  }, [letter, canExport, toast, updateUIState]);

  const handleShare = useCallback(async (options: ShareOptions) => {
    if (!letter?.id) return;

    updateUIState('isSharing', true);

    try {
      const shareData = await letterService.createShareLink(letter.id, options);

      switch (options.platform) {
        case 'copy':
          await navigator.clipboard.writeText(shareData.url);
          toast.success('Lien copié', 'Le lien de partage a été copié dans le presse-papier');
          break;

        case 'email':
          const emailSubject = `Lettre de motivation - ${letter.title}`;
          const emailBody = `${options.message || 'Voici ma lettre de motivation'}\n\n${shareData.url}`;
          window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
          break;

        case 'linkedin':
          const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`;
          window.open(linkedinUrl, '_blank');
          break;

        case 'twitter':
          const twitterText = `${options.message || 'Découvrez ma lettre de motivation'} ${shareData.url}`;
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
          window.open(twitterUrl, '_blank');
          break;

        case 'facebook':
          const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
          window.open(facebookUrl, '_blank');
          break;

        case 'whatsapp':
          const whatsappText = `${options.message || 'Voici ma lettre de motivation'} ${shareData.url}`;
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
          window.open(whatsappUrl, '_blank');
          break;

        case 'telegram':
          const telegramText = `${options.message || 'Voici ma lettre de motivation'} ${shareData.url}`;
          const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(telegramText)}`;
          window.open(telegramUrl, '_blank');
          break;
      }

      analytics.track({
        action: 'letter_shared',
        category: 'engagement',
        label: `${letter.id}-${options.platform}`
      });

      updateUIState('showShareModal', false);
    } catch (error: any) {
      console.error('Share error:', error);
      toast.error('Erreur de partage', error.message || 'Impossible de partager la lettre');
    } finally {
      updateUIState('isSharing', false);
    }
  }, [letter, toast, updateUIState]);

  const handleAnalyze = useCallback(async () => {
    if (!letter?.id || !canAnalyze) return;

    updateUIState('isAnalyzing', true);

    try {
      const analysisResult = await letterService.analyzeWithAI(letter.id);
      setAnalysis(analysisResult);

      toast.success('Analyse terminée', 'L\'analyse IA de votre lettre est disponible');

      analytics.track({
        action: 'letter_analyzed',
        category: 'ai_usage',
        label: letter.id
      });

      updateUIState('showAnalysis', true);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Erreur d\'analyse', error.message || 'Impossible d\'analyser la lettre');
    } finally {
      updateUIState('isAnalyzing', false);
    }
  }, [letter, canAnalyze, toast, updateUIState]);

  const handleBookmark = useCallback(async () => {
    if (!letter?.id) return;

    try {
      await letterService.toggleBookmark(letter.id);
      updateUIState('isBookmarked', !uiState.isBookmarked);

      toast.success(
        uiState.isBookmarked ? 'Signet retiré' : 'Signet ajouté',
        uiState.isBookmarked ? 'La lettre a été retirée de vos favoris' : 'La lettre a été ajoutée à vos favoris'
      );

      analytics.track({
        action: uiState.isBookmarked ? 'letter_unbookmarked' : 'letter_bookmarked',
        category: 'engagement',
        label: letter.id
      });
    } catch (error: any) {
      console.error('Bookmark error:', error);
      toast.error('Erreur', 'Impossible de modifier le signet');
    }
  }, [letter, uiState.isBookmarked, toast, updateUIState]);

  const handlePrint = useCallback(() => {
    if (!letter) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letter.title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 2cm; }
            h1 { color: #333; margin-bottom: 1em; }
            .meta { margin-bottom: 2em; color: #666; font-size: 0.9em; }
            .content { white-space: pre-wrap; }
            @media print { body { margin: 1cm; } }
          </style>
        </head>
        <body>
          <h1>${letter.title}</h1>
          <div class="meta">
            <p><strong>Entreprise:</strong> ${letter.company || 'N/A'}</p>
            <p><strong>Poste:</strong> ${letter.jobTitle || 'N/A'}</p>
            <p><strong>Date:</strong> ${formatDate(letter.updatedAt)}</p>
          </div>
          <div class="content">${letter.content}</div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    analytics.track({
      action: 'letter_printed',
      category: 'engagement',
      label: letter.id
    });
  }, [letter]);

  const handleClone = useCallback(async () => {
    if (!letter) return;

    try {
      const clonedLetter = await letterService.cloneLetter(letter.id);

      toast.success('Lettre dupliquée', 'Une copie de la lettre a été créée');

      analytics.track({
        action: 'letter_cloned',
        category: 'engagement',
        label: letter.id
      });

      navigate(`/dashboard/letters/${clonedLetter.id}/edit`);
    } catch (error: any) {
      console.error('Clone error:', error);
      toast.error('Erreur', 'Impossible de dupliquer la lettre');
    }
  }, [letter, toast, navigate]);

  const handleFullscreen = useCallback(() => {
    updateUIState('isFullscreen', !uiState.isFullscreen);

    if (!uiState.isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [uiState.isFullscreen, updateUIState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (hasUnsavedChanges) {
              debouncedSave({});
            }
            break;
          case 'e':
            e.preventDefault();
            updateUIState('showExportModal', true);
            break;
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          case 'd':
            e.preventDefault();
            handleClone();
            break;
        }
      }

      if (e.key === 'Escape') {
        updateUIState('isFullscreen', false);
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }

      if (e.key === 'F11') {
        e.preventDefault();
        handleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, debouncedSave, updateUIState, handlePrint, handleClone, handleFullscreen]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  // LetterViewPage.tsx - Partie 4/4 : Interface Premium et Render

  // Composants de Loading et Error
  const LoadingComponent = () => (
    <DashboardLayout>
      <LazySection animationType="fade">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-purple-600 animate-spin"
              style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-gray-800">Chargement de la lettre</h3>
          <p className="text-gray-600 mt-2">Préparation de l'affichage optimisé...</p>
        </div>
      </LazySection>
    </DashboardLayout>
  );

  const ErrorComponent = () => (
    <DashboardLayout>
      <LazySection animationType="slideUp">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-8 mb-8 rounded-xl shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600 text-xl" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Lettre introuvable
              </h3>
              <p className="text-red-700 mb-4">
                {error || 'Cette lettre n\'existe pas ou vous n\'avez pas les permissions pour y accéder.'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/letters')}
                  leftIcon={<FaArrowLeft />}
                >
                  Retour à la liste
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.reload()}
                  leftIcon={<FaRedo />}
                >
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </LazySection>
    </DashboardLayout>
  );

  // Render conditionnel
  if (isLoading) return <LoadingComponent />;
  if (error || !letter) return <ErrorComponent />;

  const LetterTypeIcon = getLetterTypeIcon(letter.type);
  const statusColor = getStatusColor(letter.status || 'draft');

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <MetaTags
          title={`${letter.title} | TactiqCV`}
          description={letter.content ? letter.content.substring(0, 160) + '...' : 'Lettre de motivation professionnelle'}
          keywords={`lettre motivation, ${letter.company}, ${letter.jobTitle}, candidature`}
        />

        <div className={`transition-all duration-300 ${uiState.isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
          {/* Header Premium */}
          <LazySection animationType="slideUp">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                {/* Titre et métadonnées */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/dashboard/letters')}
                      leftIcon={<FaArrowLeft />}
                      className="flex-shrink-0"
                    >
                      Retour
                    </Button>

                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <LetterTypeIcon className="text-blue-600" size={20} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-100 text-${statusColor}-700`}>
                        {letter.status === 'draft' ? 'Brouillon' :
                          letter.status === 'final' ? 'Finalisé' :
                            letter.status === 'archived' ? 'Archivé' : 'Non défini'}
                      </span>
                      {uiState.isBookmarked && (
                        <FaBookmark className="text-yellow-500" size={16} />
                      )}
                    </div>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2 truncate">
                    {letter.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {letter.company && (
                      <div className="flex items-center">
                        <FaBuilding className="mr-2" />
                        <span>{letter.company}</span>
                      </div>
                    )}
                    {letter.jobTitle && (
                      <div className="flex items-center">
                        <FaBriefcase className="mr-2" />
                        <span>{letter.jobTitle}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <FaClock className="mr-2" />
                      <span>Modifié {formatRelativeTime(letter.updatedAt)}</span>
                    </div>
                    {metadata && (
                      <div className="flex items-center">
                        <FaFileAlt className="mr-2" />
                        <span>{metadata.wordCount} mots • {metadata.estimatedReadingTime} min de lecture</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions principales */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Actions rapides */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBookmark}
                      leftIcon={uiState.isBookmarked ? <FaBookmark /> : <FaHeart />}
                      className={uiState.isBookmarked ? 'text-yellow-600' : ''}
                    >
                      {uiState.isBookmarked ? 'Retiré' : 'Favori'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrint}
                      leftIcon={<FaPrint />}
                    >
                      Imprimer
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClone}
                      leftIcon={<FaClone />}
                    >
                      Dupliquer
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFullscreen}
                      leftIcon={uiState.isFullscreen ? <FaCompress /> : <FaExpand />}
                    >
                      {uiState.isFullscreen ? 'Quitter' : 'Plein écran'}
                    </Button>
                  </div>

                  {/* Actions principales */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => updateUIState('showExportModal', true)}
                      leftIcon={<FaDownload />}
                      disabled={!canExport}
                    >
                      Exporter
                    </Button>

                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => updateUIState('showShareModal', true)}
                      leftIcon={<FaShare />}
                    >
                      Partager
                    </Button>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate(`/dashboard/letters/${letter.id}/edit`)}
                      leftIcon={<FaEdit />}
                    >
                      Modifier
                    </Button>

                    {/* Menu actions supplémentaires */}
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="md"
                        leftIcon={<FaEllipsisV />} children={undefined} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                        <div className="py-2">
                          <button
                            onClick={() => updateUIState('showDeleteConfirm', true)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <FaTrash className="mr-3" />
                            Supprimer
                          </button>
                          <button
                            onClick={() => updateUIState('showVersionHistory', true)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <FaHistory className="mr-3" />
                            Historique
                          </button>
                          <button
                            onClick={() => updateUIState('activeTab', 'stats')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <FaChartLine className="mr-3" />
                            Statistiques
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </LazySection>

          {/* Navigation Tabs */}
          <LazySection animationType="slideUp">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'content', label: 'Contenu', icon: FaFileAlt },
                    { id: 'metadata', label: 'Métadonnées', icon: FaTag },
                    { id: 'analysis', label: 'Analyse IA', icon: FaBrain, premium: true },
                    { id: 'history', label: 'Historique', icon: FaHistory },
                    { id: 'stats', label: 'Statistiques', icon: FaChartLine }
                  ].map(({ id, label, icon: Icon, premium }) => (
                    <button
                      key={id}
                      onClick={() => updateUIState('activeTab', id as any)}
                      className={`relative py-4 px-1 border-b-2 font-medium text-sm transition-colors ${uiState.activeTab === id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } ${premium && !canAnalyze ? 'opacity-50' : ''}`}
                      disabled={premium && !canAnalyze}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-2" size={16} />
                        {label}
                        {premium && !canAnalyze && (
                          <FaCrown className="ml-2 text-yellow-500" size={12} />
                        )}
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </LazySection>

          {/* Contenu principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contenu de la lettre */}
              {uiState.activeTab === 'content' && (
                <LazySection animationType="slideUp">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-800">Contenu de la lettre</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateUIState('currentView', 'preview')}
                          className={uiState.currentView === 'preview' ? 'bg-blue-50 text-blue-600' : ''}
                        >
                          <FaEye className="mr-2" />
                          Aperçu
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateUIState('currentView', 'source')}
                          className={uiState.currentView === 'source' ? 'bg-blue-50 text-blue-600' : ''}
                        >
                          <FaCode className="mr-2" />
                          Source
                        </Button>
                      </div>
                    </div>

                    <div className={`min-h-[600px] p-6 rounded-lg border border-gray-200 ${uiState.currentView === 'preview'
                        ? 'bg-gray-50 font-serif leading-relaxed'
                        : 'bg-gray-900 text-green-400 font-mono text-sm'
                      }`}>
                      {uiState.currentView === 'preview' ? (
                        <div className="whitespace-pre-wrap text-gray-800 leading-7">
                          {letter.content}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {letter.content}
                        </div>
                      )}
                    </div>
                  </div>
                </LazySection>
              )}

              {/* Métadonnées */}
              {uiState.activeTab === 'metadata' && metadata && (
                <LazySection animationType="slideUp">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Métadonnées</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { label: 'Mots', value: metadata.wordCount, icon: FaFileAlt, color: 'blue' },
                        { label: 'Caractères', value: metadata.characterCount, icon: FaFont, color: 'green' },
                        { label: 'Paragraphes', value: metadata.paragraphCount, icon: FaAlignLeft, color: 'purple' },
                        { label: 'Temps de lecture', value: `${metadata.estimatedReadingTime} min`, icon: FaClock, color: 'orange' },
                        { label: 'Mots uniques', value: metadata.keywordsCount, icon: FaTags, color: 'pink' },
                        { label: 'Vues', value: metadata.views, icon: FaEye, color: 'indigo' }
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">{label}</span>
                            <div className={`bg-${color}-100 p-2 rounded-lg`}>
                              <Icon className={`text-${color}-600`} size={16} />
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Informations détaillées */}
                    <div className="mt-8 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Informations détaillées</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Entreprise</span>
                            <span className="font-medium text-gray-900">{letter.company || 'Non spécifié'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Poste</span>
                            <span className="font-medium text-gray-900">{letter.jobTitle || 'Non spécifié'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Destinataire</span>
                            <span className="font-medium text-gray-900">{letter.recipientName || 'Non spécifié'}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Créé le</span>
                            <span className="font-medium text-gray-900">{formatDate(letter.createdAt)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Modifié le</span>
                            <span className="font-medium text-gray-900">{formatDate(letter.updatedAt)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Type</span>

                            <span className="font-medium text-gray-900">{letter.type || 'Standard'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </LazySection>
              )}

              {/* Analyse IA */}
              {uiState.activeTab === 'analysis' && (
                <LazySection animationType="slideUp">
                  <AIAnalysisCard
                    analysis={analysis}
                    isLoading={uiState.isAnalyzing}
                    onAnalyze={handleAnalyze}
                  />
                </LazySection>
              )}

              {/* Historique des versions */}
              {uiState.activeTab === 'history' && (
                <LazySection animationType="slideUp">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Historique des versions</h2>

                    {versionHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <FaHistory className="mx-auto text-gray-400 mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun historique</h3>
                        <p className="text-gray-600">L'historique des versions apparaîtra ici lors des prochaines modifications.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versionHistory.map((version, _index) => (
                          <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-800">Version {version.version}</h4>
                              <span className="text-sm text-gray-500">{formatDate(version.createdAt)}</span>
                            </div>
                            <p className="text-gray-600 mb-3">{version.title}</p>
                            {version.changes.length > 0 && (
                              <div className="text-sm">
                                <p className="font-medium text-gray-700 mb-1">Modifications :</p>
                                <ul className="list-disc list-inside text-gray-600 space-y-1">
                                  {version.changes.map((change, idx) => (
                                    <li key={idx}>{change}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </LazySection>
              )}

              {/* Statistiques */}
              {uiState.activeTab === 'stats' && (
                <LazySection animationType="slideUp">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Statistiques d'utilisation</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      {[
                        { label: 'Vues totales', value: stats?.totalViews || 0, icon: FaEye, color: 'blue' },
                        { label: 'Modifications', value: stats?.totalEdits || 0, icon: FaEdit, color: 'green' },
                        { label: 'Partages', value: stats?.totalShares || 0, icon: FaShare, color: 'purple' },
                        { label: 'Téléchargements', value: stats?.totalDownloads || 0, icon: FaDownload, color: 'orange' }
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-gray-50 p-4 rounded-lg text-center">
                          <div className={`bg-${color}-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center`}>
                            <Icon className={`text-${color}-600`} size={20} />
                          </div>
                          <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
                          <div className="text-sm text-gray-600">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Graphique de performance (placeholder) */}
                    <div className="bg-gray-50 p-8 rounded-lg text-center">
                      <FaChartLine className="mx-auto text-gray-400 mb-4" size={48} />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Analyse de performance</h3>
                      <p className="text-gray-600">Les graphiques détaillés seront disponibles prochainement.</p>
                    </div>
                  </div>
                </LazySection>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions rapides */}
              <LazySection animationType="slideUp">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions rapides</h3>

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => updateUIState('showExportModal', true)}
                      leftIcon={<FaDownload />}
                      className="w-full justify-start"
                      disabled={!canExport}
                    >
                      Exporter la lettre
                    </Button>

                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => updateUIState('showShareModal', true)}
                      leftIcon={<FaShare />}
                      className="w-full justify-start"
                    >
                      Partager la lettre
                    </Button>

                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleAnalyze}
                      leftIcon={<FaBrain />}
                      className="w-full justify-start"
                      disabled={!canAnalyze}
                      loading={uiState.isAnalyzing}
                    >
                      Analyser avec IA
                    </Button>

                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleClone}
                      leftIcon={<FaClone />}
                      className="w-full justify-start"
                    >
                      Dupliquer la lettre
                    </Button>
                  </div>
                </div>
              </LazySection>

              {/* Métadonnées rapides */}
              {metadata && (
                <LazySection animationType="slideUp">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Aperçu</h3>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Longueur</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{metadata.wordCount} mots</div>
                          <div className="text-sm text-gray-500">{metadata.characterCount} caractères</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Lecture</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{metadata.estimatedReadingTime} min</div>
                          <div className="text-sm text-gray-500">{metadata.paragraphCount} paragraphes</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Activité</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{metadata.views} vues</div>
                          <div className="text-sm text-gray-500">{metadata.shares} partages</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </LazySection>
              )}

              {/* Lettres similaires (placeholder) */}
              <LazySection animationType="slideUp">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Lettres similaires</h3>

                  <div className="text-center py-6">
                    <FaSearch className="mx-auto text-gray-400 mb-3" size={32} />
                    <p className="text-gray-600 text-sm">Suggestions basées sur l'IA à venir</p>
                  </div>
                </div>
              </LazySection>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ExportModal
          isOpen={uiState.showExportModal}
          onClose={() => updateUIState('showExportModal', false)}
          onExport={handleExport}
          isLoading={uiState.isExporting}
        />

        <ShareModal
          isOpen={uiState.showShareModal}
          onClose={() => updateUIState('showShareModal', false)}
          onShare={handleShare}
          isLoading={uiState.isSharing}
          letter={letter}
        />

        <DeleteConfirmModal
          isOpen={uiState.showDeleteConfirm}
          onClose={() => updateUIState('showDeleteConfirm', false)}
          onConfirm={handleDelete}
          letter={letter}
          isLoading={false}
        />
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default LetterViewPage;