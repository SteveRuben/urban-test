import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { useCVStore } from '../store/cv.store';
import { useToast } from '../store/toast.store';
import {
  type CV,
  CVSectionType,
  type CVUserSection,
  type CVPersonalInfo
} from '../types/cv.types';
import DashboardLayout from '../components/layout/DashboardLayout';

const CVEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    currentCV,
    isLoading,
    error,
    loadCVById,
    updateCV,
    exportCV,
    clearError
  } = useCVStore();

  const [activeSection, setActiveSection] = useState<string>('personal_info');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (id) {
      loadCVById(id);
    }
  }, [id, loadCVById]);

  useEffect(() => {
    if (error) {
      toast.error('Erreur', error);
      clearError();
    }
  }, [error, toast, clearError]);

  const handleSave = async () => {
    if (!currentCV || !id) return;

    try {
      await updateCV(id, {
        personalInfo: currentCV.personalInfo,
        sections: currentCV.sections,
        status: currentCV.status
      });
      setHasUnsavedChanges(false);
      toast.success('CV sauvegardé', 'CV sauvegardé avec succès');
    } catch (error) {
      toast.error('Erreur', 'Erreur lors de la sauvegarde');
    }
  };

  const handleExport = async (format: string) => {
    if (!id) return;

    try {
      const downloadUrl = await exportCV(id, format);
      window.open(downloadUrl, '_blank');
      toast.success('Export réussi', 'Export généré avec succès');
    } catch (error) {
      toast.error('Erreur', 'Erreur lors de l\'export');
    }
  };

  const updatePersonalInfo = (field: keyof CVPersonalInfo, value: any) => {
    if (!currentCV) return;

    const updatedCV = {
      ...currentCV,
      personalInfo: {
        ...currentCV.personalInfo,
        [field]: value
      }
    };

    // Ici vous devriez mettre à jour le store local
    setHasUnsavedChanges(true);
  };

  const addSection = (type: CVSectionType) => {
    if (!currentCV) return;

    const newSection: CVUserSection = {
      sectionId: `section_${Date.now()}`,
      type,
      title: getSectionTitle(type),
      content: {},
      order: currentCV.sections.length,
      isVisible: true
    };

    const updatedCV = {
      ...currentCV,
      sections: [...currentCV.sections, newSection]
    };

    setHasUnsavedChanges(true);
  };

  const removeSection = (sectionId: string) => {
    if (!currentCV) return;

    const updatedCV = {
      ...currentCV,
      sections: currentCV.sections.filter(s => s.sectionId !== sectionId)
    };

    setHasUnsavedChanges(true);
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!currentCV) return;

    const sections = [...currentCV.sections];
    const index = sections.findIndex(s => s.sectionId === sectionId);

    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= sections.length) return;

    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];

    // Mettre à jour les ordres
    sections.forEach((section, idx) => {
      section.order = idx;
    });

    const updatedCV = {
      ...currentCV,
      sections
    };

    setHasUnsavedChanges(true);
  };

  const getSectionTitle = (type: CVSectionType): string => {
    const titles = {
      [CVSectionType.PERSONAL_INFO]: 'Informations personnelles',
      [CVSectionType.PROFESSIONAL_SUMMARY]: 'Résumé professionnel',
      [CVSectionType.WORK_EXPERIENCE]: 'Expérience professionnelle',
      [CVSectionType.EDUCATION]: 'Formation',
      [CVSectionType.SKILLS]: 'Compétences',
      [CVSectionType.LANGUAGES]: 'Langues',
      [CVSectionType.CERTIFICATIONS]: 'Certifications',
      [CVSectionType.PROJECTS]: 'Projets',
      [CVSectionType.VOLUNTEER]: 'Bénévolat',
      [CVSectionType.HOBBIES]: 'Loisirs',
      [CVSectionType.REFERENCES]: 'Références',
      [CVSectionType.CUSTOM]: 'Section personnalisée'
    };
    return titles[type] || 'Section';
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
        {/* Barre d'outils */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/dashboard/cvs')}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Retour
                </button>

                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{currentCV.title}</h1>
                  <p className="text-sm text-gray-500">
                    {hasUnsavedChanges ? 'Modifications non sauvegardées' : 'Sauvegardé'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  {isPreviewMode ? 'Éditer' : 'Aperçu'}
                </button>

                <div className="relative">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Exporter
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/dashboard/cvs/${id}/analyze`)}
                  className="flex items-center px-3 py-2 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Analyser
                </button>

                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Navigation des sections */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sections</h3>

                <div className="space-y-2">
                  {/* Section informations personnelles (toujours présente) */}
                  <button
                    onClick={() => setActiveSection('personal_info')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${activeSection === 'personal_info'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    Informations personnelles
                  </button>

                  {/* Sections dynamiques */}
                  {currentCV.sections.map((section) => (
                    <div key={section.sectionId} className="flex items-center group">
                      <button
                        onClick={() => setActiveSection(section.sectionId)}
                        className={`flex-1 text-left px-3 py-2 rounded-md transition-colors ${activeSection === section.sectionId
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        {section.title}
                      </button>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center ml-2">
                        <button
                          onClick={() => moveSection(section.sectionId, 'up')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Monter"
                        >
                          <ArrowUpIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveSection(section.sectionId, 'down')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Descendre"
                        >
                          <ArrowDownIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeSection(section.sectionId)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bouton ajouter section */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addSection(e.target.value as CVSectionType);
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Ajouter une section</option>
                      <option value={CVSectionType.PROFESSIONAL_SUMMARY}>Résumé professionnel</option>
                      <option value={CVSectionType.WORK_EXPERIENCE}>Expérience</option>
                      <option value={CVSectionType.EDUCATION}>Formation</option>
                      <option value={CVSectionType.SKILLS}>Compétences</option>
                      <option value={CVSectionType.LANGUAGES}>Langues</option>
                      <option value={CVSectionType.CERTIFICATIONS}>Certifications</option>
                      <option value={CVSectionType.PROJECTS}>Projets</option>
                      <option value={CVSectionType.VOLUNTEER}>Bénévolat</option>
                      <option value={CVSectionType.HOBBIES}>Loisirs</option>
                      <option value={CVSectionType.REFERENCES}>Références</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm">
                {isPreviewMode ? (
                  /* Mode aperçu */
                  <div className="p-8">
                    <CVPreview cv={currentCV} />
                  </div>
                ) : (
                  /* Mode édition */
                  <div className="p-8">
                    {activeSection === 'personal_info' ? (
                      <PersonalInfoEditor
                        personalInfo={currentCV.personalInfo}
                        onChange={updatePersonalInfo}
                      />
                    ) : (
                      <SectionEditor
                        section={currentCV.sections.find(s => s.sectionId === activeSection)}
                        onChange={(updatedSection) => {
                          // Mettre à jour la section
                          setHasUnsavedChanges(true);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Composant d'aperçu du CV
const CVPreview: React.FC<{ cv: CV }> = ({ cv }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* En-tête */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {cv.personalInfo.firstName} {cv.personalInfo.lastName}
        </h1>
        <div className="text-gray-600 space-y-1">
          <p>{cv.personalInfo.email} | {cv.personalInfo.phone}</p>
          {cv.personalInfo.address && (
            <p>{cv.personalInfo.address.city}, {cv.personalInfo.address.country}</p>
          )}
          {cv.personalInfo.linkedin && (
            <p>LinkedIn: {cv.personalInfo.linkedin}</p>
          )}
        </div>
      </div>

      {/* Résumé professionnel */}
      {cv.personalInfo.professionalSummary && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">
            Résumé Professionnel
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {cv.personalInfo.professionalSummary}
          </p>
        </div>
      )}

      {/* Sections */}
      {cv.sections
        .filter(section => section.isVisible)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.sectionId} className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              {section.title}
            </h2>
            <SectionPreview section={section} />
          </div>
        ))}
    </div>
  );
};

// Composant d'aperçu de section
const SectionPreview: React.FC<{ section: CVUserSection }> = ({ section }) => {
  switch (section.type) {
    case CVSectionType.WORK_EXPERIENCE:
      return (
        <div className="space-y-4">
          {section.content.workExperience?.map((exp, index) => (
            <div key={index} className="border-l-2 border-blue-200 pl-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                <span className="text-sm text-gray-600">
                  {exp.startDate.getFullYear()} - {exp.endDate?.getFullYear() || 'Présent'}
                </span>
              </div>
              <p className="text-gray-700 font-medium mb-2">{exp.company}</p>
              <p className="text-gray-600 text-sm mb-2">{exp.description}</p>
              {exp.achievements.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {exp.achievements.map((achievement, idx) => (
                    <li key={idx}>{achievement}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );

    case CVSectionType.EDUCATION:
      return (
        <div className="space-y-4">
          {section.content.education?.map((edu, index) => (
            <div key={index} className="border-l-2 border-green-200 pl-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                <span className="text-sm text-gray-600">
                  {edu.startDate.getFullYear()} - {edu.endDate?.getFullYear() || 'Présent'}
                </span>
              </div>
              <p className="text-gray-700 font-medium">{edu.institution}</p>
              <p className="text-gray-600 text-sm">{edu.field}</p>
            </div>
          ))}
        </div>
      );

    case CVSectionType.SKILLS:
      return (
        <div className="grid grid-cols-2 gap-4">
          {section.content.skills?.map((skill, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-700">{skill.name}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`w-3 h-3 rounded-full mr-1 ${level <= skill.level ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="text-gray-600">
          {section.content.customContent || 'Contenu de la section'}
        </div>
      );
  }
};

// Composant d'édition des informations personnelles
const PersonalInfoEditor: React.FC<{
  personalInfo: CVPersonalInfo;
  onChange: (field: keyof CVPersonalInfo, value: any) => void;
}> = ({ personalInfo, onChange }) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Informations personnelles
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prénom *
          </label>
          <input
            type="text"
            value={personalInfo.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom *
          </label>
          <input
            type="text"
            value={personalInfo.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={personalInfo.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Téléphone *
          </label>
          <input
            type="tel"
            value={personalInfo.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LinkedIn
          </label>
          <input
            type="url"
            value={personalInfo.linkedin || ''}
            onChange={(e) => onChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/votre-profil"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Résumé professionnel
          </label>
          <textarea
            value={personalInfo.professionalSummary || ''}
            onChange={(e) => onChange('professionalSummary', e.target.value)}
            rows={4}
            placeholder="Décrivez brièvement votre profil professionnel..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

// Composant d'édition de section (simplifié)
const SectionEditor: React.FC<{
  section?: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  if (!section) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Sélectionnez une section à modifier</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        {section.title}
      </h2>

      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-600 mb-4">
          Éditeur de section en cours de développement
        </p>
        <p className="text-sm text-gray-500">
          Cette fonctionnalité sera disponible dans la prochaine version
        </p>
      </div>
    </div>
  );
};

export default CVEditorPage;