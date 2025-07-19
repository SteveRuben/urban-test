import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useCVStore } from '../store/cv.store';
import { CVRegion, CVStyle, type CVTemplate } from '../types/cv.types';
import { useToast } from '../store/toast.store';
import DashboardLayout from '../components/layout/DashboardLayout';

const CVCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { templates, isLoading, error, createCV, loadTemplates, clearError } = useCVStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    region: CVRegion.FRANCE,
    templateId: '',
    style: CVStyle.MODERN,
    experienceLevel: 'mid' as 'entry' | 'mid' | 'senior' | 'executive'
  });

  const [filteredTemplates, setFilteredTemplates] = useState<CVTemplate[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (error) {
      toast.error('Erreur', error);
      clearError();
    }
  }, [error, toast, clearError]);

  useEffect(() => {
    // Templates par défaut qui s'affichent toujours avec les critères actuels
    const defaultTemplates = [
      {
        id: 'default-modern',
        name: 'Moderne',
        description: 'Template moderne et épuré, adapté à tous les secteurs',
        region: formData.region,
        style: formData.style,
        industry: ['tech', 'marketing', 'design'],
        experienceLevel: formData.experienceLevel,
        isPublic: true,
        isPremium: false,
        creatorId: 'system',
        usageCount: 0,
        rating: 4.8,
        tags: ['moderne', 'épuré', 'universel'],
        culturalNotes: ['Adapté à tous les pays', 'Design contemporain'],
        requiredSections: ['personal_info', 'work_experience', 'education', 'skills'] as any,
        optionalSections: ['projects', 'languages', 'certifications'] as any,
        prohibitedElements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      },
      {
        id: 'default-classic',
        name: 'Classique',
        description: 'Template traditionnel et professionnel, valeur sûre',
        region: formData.region,
        style: formData.style,
        industry: ['finance', 'legal', 'consulting'],
        experienceLevel: formData.experienceLevel,
        isPublic: true,
        isPremium: false,
        creatorId: 'system',
        usageCount: 0,
        rating: 4.6,
        tags: ['classique', 'professionnel', 'traditionnel'],
        culturalNotes: ['Format standard', 'Présentation formelle'],
        requiredSections: ['personal_info', 'work_experience', 'education'] as any,
        optionalSections: ['skills', 'languages', 'hobbies'] as any,
        prohibitedElements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      },
      {
        id: 'default-creative',
        name: 'Créatif',
        description: 'Template créatif et original, pour se démarquer',
        region: formData.region,
        style: formData.style,
        industry: ['design', 'marketing', 'media'],
        experienceLevel: formData.experienceLevel,
        isPublic: true,
        isPremium: false,
        creatorId: 'system',
        usageCount: 0,
        rating: 4.9,
        tags: ['créatif', 'original', 'artistique'],
        culturalNotes: ['Design innovant', 'Mise en page créative'],
        requiredSections: ['personal_info', 'work_experience', 'skills'] as any,
        optionalSections: ['projects', 'portfolio', 'certifications'] as any,
        prohibitedElements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true
      }
    ];

    // Filtrer les templates API selon les critères sélectionnés
    const apiFiltered = templates.filter(template => {
      const regionMatch = template.region === formData.region ||
        template.region === CVRegion.INTERNATIONAL ||
        formData.region === CVRegion.INTERNATIONAL;

      const styleMatch = template.style === formData.style;

      const experienceMatch = template.experienceLevel === formData.experienceLevel ||
        template.experienceLevel === 'mid';

      return regionMatch && styleMatch && experienceMatch;
    });

    // Combiner les templates API filtrés avec les templates par défaut
    const combinedTemplates = [...apiFiltered, ...defaultTemplates];

    setFilteredTemplates(combinedTemplates);
  }, [templates, formData.region, formData.style, formData.experienceLevel]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Format non supporté', 'Utilisez PDF, Word ou Image.');
        return;
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Fichier trop volumineux', 'Maximum 10MB.');
        return;
      }

      setUploadedFile(file);
      setFormData({ ...formData, templateId: 'import' });
      toast.success('Fichier importé', 'Fichier importé avec succès !');
    }
  };

  const handleCreateCV = async () => {
    if (!formData.title.trim()) {
      toast.error('Titre requis', 'Veuillez saisir un titre pour votre CV');
      return;
    }

    if (!formData.templateId) {
      toast.error('Template requis', 'Veuillez choisir une méthode de création');
      return;
    }

    try {
      let newCV;

      if (formData.templateId === 'import' && uploadedFile) {
        // Logique d'import de fichier (à implémenter avec l'API)
        toast.info('Analyse en cours', 'Analyse du fichier en cours...');

        // Pour l'instant, on crée un CV standard et on indique qu'il faut implémenter l'import
        newCV = await createCV({
          title: `${formData.title.trim()} (Importé)`,
          region: formData.region,
          templateId: 'standard' // Utiliser le template standard temporairement
        });

        toast.success('CV créé', 'L\'analyse du fichier sera disponible prochainement.');
      } else {
        // Création avec le template sélectionné
        newCV = await createCV({
          title: formData.title.trim(),
          region: formData.region,
          templateId: formData.templateId
        });

        toast.success('CV créé', 'CV créé avec succès !');
      }

      navigate(`/dashboard/cv/${newCV.id}/edit`);
    } catch (error) {
      console.error('Erreur création CV:', error);
      toast.error('Erreur', 'Erreur lors de la création du CV');
    }
  };

  const getRegionInfo = (region: CVRegion) => {
    const info: Record<CVRegion, { flag: string; name: string; description: string }> = {
      [CVRegion.FRANCE]: {
        flag: '🇫🇷',
        name: 'France',
        description: 'CV français avec photo optionnelle, format anti-chronologique'
      },
      [CVRegion.USA]: {
        flag: '🇺🇸',
        name: 'États-Unis',
        description: 'Resume américain, pas de photo, focus sur les résultats'
      },
      [CVRegion.UK]: {
        flag: '🇬🇧',
        name: 'Royaume-Uni',
        description: 'CV britannique, références importantes, style concis'
      },
      [CVRegion.GERMANY]: {
        flag: '🇩🇪',
        name: 'Allemagne',
        description: 'CV allemand détaillé avec photo professionnelle'
      },
      [CVRegion.CANADA]: {
        flag: '🇨🇦',
        name: 'Canada',
        description: 'CV canadien bilingue, expérience bénévole valorisée'
      },
      [CVRegion.SPAIN]: {
        flag: '�🇸',
        name: 'Espagne',
        description: 'CV espagnol avec photo, format européen'
      },
      [CVRegion.ITALY]: {
        flag: '🇮🇹',
        name: 'Italie',
        description: 'CV italien avec photo, format européen'
      },
      [CVRegion.INTERNATIONAL]: {
        flag: '🌍',
        name: 'International',
        description: 'Format universel adapté à tous les pays'
      }
    };
    return info[region] || info[CVRegion.INTERNATIONAL];
  };

  const getStyleInfo = (style: CVStyle) => {
    const info: Record<CVStyle, { name: string; description: string }> = {
      [CVStyle.MODERN]: {
        name: 'Moderne',
        description: 'Design contemporain avec couleurs et icônes'
      },
      [CVStyle.CLASSIC]: {
        name: 'Classique',
        description: 'Format traditionnel, sobre et professionnel'
      },
      [CVStyle.CREATIVE]: {
        name: 'Créatif',
        description: 'Design original pour métiers créatifs'
      },
      [CVStyle.MINIMAL]: {
        name: 'Minimaliste',
        description: 'Design épuré, focus sur le contenu'
      },
      [CVStyle.EXECUTIVE]: {
        name: 'Exécutif',
        description: 'Format premium pour postes de direction'
      },
      [CVStyle.TECH]: {
        name: 'Tech',
        description: 'Optimisé pour les métiers techniques'
      },
      [CVStyle.ACADEMIC]: {
        name: 'Académique',
        description: 'Format pour le milieu académique et recherche'
      }
    };
    return info[style] || info[CVStyle.MODERN];
  };

  if (isLoading && templates.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des templates...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/cv')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Retour à mes CV
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Créer un nouveau CV</h1>
          <p className="mt-2 text-gray-600">
            Suivez les étapes pour créer votre CV professionnel
          </p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= stepNumber
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                  }`}>
                  {step > stepNumber ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${step > stepNumber ? 'bg-purple-600' : 'bg-gray-200'
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Informations</span>
            <span>Région & Style</span>
            <span>Template</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Étape 1: Informations de base */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Informations de base
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre du CV *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CV Développeur Full-Stack, CV Marketing Manager..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Donnez un nom descriptif à votre CV pour le retrouver facilement
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau d'expérience
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'entry', label: 'Débutant', desc: '0-2 ans' },
                      { value: 'mid', label: 'Intermédiaire', desc: '2-5 ans' },
                      { value: 'senior', label: 'Senior', desc: '5-10 ans' },
                      { value: 'executive', label: 'Exécutif', desc: '10+ ans' }
                    ].map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, experienceLevel: level.value as any })}
                        className={`p-4 border rounded-lg text-center transition-colors ${formData.experienceLevel === level.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-gray-400'
                          }`}
                      >
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-gray-500">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.title.trim()}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* Étape 2: Région et Style */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Région et Style
              </h2>

              <div className="space-y-8">
                {/* Sélection de région */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Région cible *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(CVRegion).map((region) => {
                      const regionInfo = getRegionInfo(region);
                      return (
                        <button
                          key={region}
                          type="button"
                          onClick={() => setFormData({ ...formData, region })}
                          className={`p-4 border rounded-lg text-left transition-colors ${formData.region === region
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          <div className="flex items-center mb-2">
                            <span className="text-2xl mr-3">{regionInfo.flag}</span>
                            <span className="font-medium">{regionInfo.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{regionInfo.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sélection de style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Style de CV *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(CVStyle).map((style) => {
                      const styleInfo = getStyleInfo(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setFormData({ ...formData, style })}
                          className={`p-4 border rounded-lg text-left transition-colors ${formData.style === style
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          <div className="font-medium mb-2">{styleInfo.name}</div>
                          <p className="text-sm text-gray-600">{styleInfo.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* Étape 3: Sélection du template */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Choisir un template
              </h2>

              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    Aucun template disponible pour ces critères
                  </p>
                  <button
                    onClick={() => setStep(2)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    Modifier les critères
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${formData.templateId === template.id
                        ? 'border-amber-500 ring-2 ring-amber-200'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                      onClick={() => setFormData({ ...formData, templateId: template.id })}
                    >
                      {/* Aperçu du template */}
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <div className="text-sm text-gray-600">{template.style}</div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <div className="flex gap-1">
                            {template.isDefault && (
                              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">
                                Par défaut
                              </span>
                            )}
                            {template.isPremium && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                Premium
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>⭐ {template.rating}/5</span>
                          <span>{template.usageCount} utilisations</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={handleCreateCV}
                  disabled={!formData.templateId || isLoading}
                  className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Création...' : 'Créer le CV'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CVCreatePage;