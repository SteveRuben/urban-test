import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useCVStore } from '../store/cv.store';
import { useToast } from '../store/toast.store';
import { CVRegion, type CVAnalysis, type AnalysisPoint } from '../types/cv.types';
import DashboardLayout from '../components/layout/DashboardLayout';

const CVAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    currentCV,
    isLoading,
    error,
    loadCVById,
    analyzeCV,
    clearError
  } = useCVStore();

  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<CVRegion>(CVRegion.FRANCE);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (id) {
      loadCVById(id);
    }
  }, [id, loadCVById]);

  useEffect(() => {
    if (currentCV) {
      setSelectedRegion(currentCV.region);
      if (currentCV.lastAnalysis) {
        setAnalysis(currentCV.lastAnalysis);
      }
    }
  }, [currentCV]);

  useEffect(() => {
    if (error) {
      toast.error('Erreur', error);
      clearError();
    }
  }, [error, toast, clearError]);

  const handleAnalyze = async () => {
    if (!id) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeCV(id, selectedRegion);
      setAnalysis(result);
      toast.success('Analyse terminée', 'Analyse terminée avec succès');
    } catch (error) {
      console.log('Erreur', 'Erreur lors de l\'analyse',error)
      toast.error('Erreur', 'Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // const getImpactIcon = (impact: string) => {
  //   switch (impact) {
  //     case 'high':
  //       return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
  //     case 'medium':
  //       return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
  //     case 'low':
  //       return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
  //     default:
  //       return <LightBulbIcon className="h-5 w-5 text-gray-500" />;
  //   }
  // };

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

  if (isLoading || !currentCV) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du CV...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/dashboard/cvs/${id}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Retour au CV
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analyse du CV</h1>
              <p className="mt-2 text-gray-600">{currentCV.title}</p>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analyser pour la région
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as CVRegion)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(CVRegion).map((region) => (
                    <option key={region} value={region}>
                      {getRegionFlag(region)} {region.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Analyser avec l'IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {!analysis ? (
          /* État initial - pas d'analyse */
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Analysez votre CV avec l'IA
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Notre IA Gemini Pro va analyser votre CV selon les standards de la région sélectionnée
              et vous donner des recommandations personnalisées pour l'améliorer.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyse en cours...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  Commencer l'analyse
                </>
              )}
            </button>
          </div>
        ) : (
          /* Résultats d'analyse */
          <div className="space-y-8">
            {/* Scores globaux */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}/100
                </div>
                <div className="text-sm text-gray-600">Score Global</div>
                <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${getScoreBgColor(analysis.overallScore)} ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore >= 80 ? 'Excellent' :
                    analysis.overallScore >= 60 ? 'Bon' : 'À améliorer'}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysis.regionalCompliance)}`}>
                  {analysis.regionalCompliance}/100
                </div>
                <div className="text-sm text-gray-600">Conformité Régionale</div>
                <div className="flex items-center justify-center mt-2">
                  <GlobeAltIcon className="h-4 w-4 mr-1 text-gray-500" />
                  <span className="text-xs text-gray-500">{selectedRegion.toUpperCase()}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysis.atsCompatibility)}`}>
                  {analysis.atsCompatibility}/100
                </div>
                <div className="text-sm text-gray-600">Compatibilité ATS</div>
                <div className="flex items-center justify-center mt-2">
                  <DocumentTextIcon className="h-4 w-4 mr-1 text-gray-500" />
                  <span className="text-xs text-gray-500">Lisibilité robot</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysis.keywordOptimization)}`}>
                  {analysis.keywordOptimization}/100
                </div>
                <div className="text-sm text-gray-600">Optimisation Mots-clés</div>
                <div className="flex items-center justify-center mt-2">
                  <SparklesIcon className="h-4 w-4 mr-1 text-gray-500" />
                  <span className="text-xs text-gray-500">SEO CV</span>
                </div>
              </div>
            </div>

            {/* Points forts */}
            {analysis.strengths.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Points forts ({analysis.strengths.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.strengths.map((strength, index) => (
                    <AnalysisPointCard key={index} point={strength} type="strength" />
                  ))}
                </div>
              </div>
            )}

            {/* Points faibles */}
            {analysis.weaknesses.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Points à améliorer ({analysis.weaknesses.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.weaknesses.map((weakness, index) => (
                    <AnalysisPointCard key={index} point={weakness} type="weakness" />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <LightBulbIcon className="h-6 w-6 text-blue-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Suggestions d'amélioration ({analysis.suggestions.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.suggestions.map((suggestion, index) => (
                    <AnalysisPointCard key={index} point={suggestion} type="suggestion" />
                  ))}
                </div>
              </div>
            )}

            {/* Analyse ATS détaillée */}
            {analysis.atsAnalysis && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Analyse ATS Détaillée
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Score de lisibilité</h3>
                    <div className="flex items-center">
                      <div className={`text-2xl font-bold mr-3 ${getScoreColor(analysis.atsAnalysis.readabilityScore)}`}>
                        {analysis.atsAnalysis.readabilityScore}/100
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${analysis.atsAnalysis.readabilityScore >= 80 ? 'bg-green-500' :
                            analysis.atsAnalysis.readabilityScore >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                          style={{ width: `${analysis.atsAnalysis.readabilityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Problèmes de formatage</h3>
                    {analysis.atsAnalysis.formattingIssues.length === 0 ? (
                      <p className="text-green-600 text-sm">✓ Aucun problème détecté</p>
                    ) : (
                      <ul className="text-sm text-red-600 space-y-1">
                        {analysis.atsAnalysis.formattingIssues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {analysis.atsAnalysis.optimizationTips.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-3">Conseils d'optimisation</h3>
                    <ul className="space-y-2">
                      {analysis.atsAnalysis.optimizationTips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <LightBulbIcon className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Éléments manquants */}
            {analysis.missingElements.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Éléments manquants
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysis.missingElements.map((element, index) => (
                    <div key={index} className="flex items-center p-3 bg-yellow-50 rounded-lg">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-sm text-gray-700">{element}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Prochaines étapes
              </h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate(`/dashboard/cvs/${id}/edit`)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Modifier le CV
                </button>

                <button
                  onClick={() => navigate(`/dashboard/cvs/${id}/job-matching`)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Analyser avec une offre
                </button>

                <button
                  onClick={handleAnalyze}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Relancer l'analyse
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
};

// Composant pour afficher un point d'analyse
const AnalysisPointCard: React.FC<{
  point: AnalysisPoint;
  type: 'strength' | 'weakness' | 'suggestion';
}> = ({ point, type }) => {
  const getCardStyle = () => {
    switch (type) {
      case 'strength':
        return 'border-green-200 bg-green-50';
      case 'weakness':
        return 'border-red-200 bg-red-50';
      case 'suggestion':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'strength':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'weakness':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'suggestion':
        return <LightBulbIcon className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getCardStyle()}`}>
      <div className="flex items-start">
        <div className="mr-3 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">{point.title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${point.impact === 'high' ? 'bg-red-100 text-red-700' :
              point.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
              {point.impact === 'high' ? 'Priorité haute' :
                point.impact === 'medium' ? 'Priorité moyenne' :
                  'Priorité basse'}
            </span>
          </div>
          <p className="text-sm text-gray-700">{point.description}</p>
          <div className="mt-2 text-xs text-gray-500">
            Catégorie: {point.category}
            {point.actionable && (
              <span className="ml-2 text-blue-600">• Action possible</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVAnalysisPage;