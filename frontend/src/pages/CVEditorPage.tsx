import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useCVStore } from '../store/cv.store';
import { useToast } from '../store/toast.store';
import {
  type CV,
  CVSectionType,
  type CVUserSection,
  type CVPersonalInfo,
  type WorkExperience,
  type Education,
  type Skill,
  type Language,
  type Certification,
  type Project
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
  const [editingCV, setEditingCV] = useState<CV | null>(null);

  // Initialisez editingCV quand currentCV se charge
  useEffect(() => {
    if (currentCV) {
      setEditingCV(currentCV);
    }
  }, [currentCV]);

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
    if (!editingCV || !id) return;

    try {
      await updateCV(id, {
        personalInfo: editingCV.personalInfo,
        sections: editingCV.sections,
        status: editingCV.status
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
    if (!editingCV) return;

    const updatedCV = {
      ...editingCV,
      personalInfo: {
        ...editingCV.personalInfo,
        [field]: value
      }
    };

    setEditingCV(updatedCV); 
    setHasUnsavedChanges(true);
  };

  const updateSection = (updatedSection: CVUserSection) => {
    if (!editingCV) return;

    const updatedCV = {
      ...editingCV,
      sections: editingCV.sections.map(section => 
        section.sectionId === updatedSection.sectionId ? updatedSection : section
      )
    };

    setEditingCV(updatedCV);
    setHasUnsavedChanges(true);
  };

  const addSection = (type: CVSectionType) => {
    if (!editingCV) return;

    // Pour les sections personnalisées, générer un titre unique
    let title = getSectionTitle(type);
    if (type === CVSectionType.CUSTOM) {
      const customSections = editingCV.sections.filter(s => s.type === CVSectionType.CUSTOM);
      title = `Section personnalisée ${customSections.length + 1}`;
    }

    const newSection: CVUserSection = {
      sectionId: `section_${Date.now()}`,
      type,
      title,
      content: getInitialSectionContent(type),
      order: editingCV.sections.length,
      isVisible: true
    };

    const updatedCV = {
      ...editingCV,
      sections: [...editingCV.sections, newSection]
    };
    setEditingCV(updatedCV);
    setHasUnsavedChanges(true);
  };

  const removeSection = (sectionId: string) => {
    if (!editingCV) return;

    const updatedCV = {
      ...editingCV,
      sections: editingCV.sections.filter(s => s.sectionId !== sectionId)
    };
    setEditingCV(updatedCV); 
    setHasUnsavedChanges(true);
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!editingCV) return;

    const sections = [...editingCV.sections];
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
      ...editingCV,
      sections
    };

    setEditingCV(updatedCV);
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

  const getInitialSectionContent = (type: CVSectionType) => {
    switch (type) {
      case CVSectionType.WORK_EXPERIENCE:
        return { workExperience: [] };
      case CVSectionType.EDUCATION:
        return { education: [] };
      case CVSectionType.SKILLS:
        return { skills: [] };
      case CVSectionType.LANGUAGES:
        return { languages: [] };
      case CVSectionType.CERTIFICATIONS:
        return { certifications: [] };
      case CVSectionType.PROJECTS:
        return { projects: [] };
      default:
        return { customContent: '' };
    }
  };

  const getAvailableSections = () => {
    if (!editingCV) return [];

    const existingSectionTypes = editingCV.sections.map(section => section.type);
    
    const allSections = [
      { value: CVSectionType.PROFESSIONAL_SUMMARY, label: 'Résumé professionnel' },
      { value: CVSectionType.WORK_EXPERIENCE, label: 'Expérience' },
      { value: CVSectionType.EDUCATION, label: 'Formation' },
      { value: CVSectionType.SKILLS, label: 'Compétences' },
      { value: CVSectionType.LANGUAGES, label: 'Langues' },
      { value: CVSectionType.CERTIFICATIONS, label: 'Certifications' },
      { value: CVSectionType.PROJECTS, label: 'Projets' },
      { value: CVSectionType.VOLUNTEER, label: 'Bénévolat' },
      { value: CVSectionType.HOBBIES, label: 'Loisirs' },
      { value: CVSectionType.REFERENCES, label: 'Références' },
      { value: CVSectionType.CUSTOM, label: 'Section personnalisée' }
    ];

    // Filtrer les sections déjà présentes, sauf pour CUSTOM qui peut être ajouté plusieurs fois
    return allSections.filter(section => 
      section.value === CVSectionType.CUSTOM || !existingSectionTypes.includes(section.value)
    );
  };

  if (isLoading || !editingCV) {
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
                  <h1 className="text-lg font-semibold text-gray-900">{editingCV.title}</h1>
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
                  {editingCV.sections.map((section) => (
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
                      {getAvailableSections().map((sectionType) => (
                        <option key={sectionType.value} value={sectionType.value}>
                          {sectionType.label}
                        </option>
                      ))}
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
                    <CVPreview cv={editingCV} />
                  </div>
                ) : (
                  /* Mode édition */
                  <div className="p-8">
                    {activeSection === 'personal_info' ? (
                      <PersonalInfoEditor
                        personalInfo={editingCV.personalInfo}
                        onChange={updatePersonalInfo}
                      />
                    ) : (
                      <SectionEditor
                        section={editingCV.sections.find(s => s.sectionId === activeSection)}
                        onChange={updateSection}
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
                  {new Date(exp.startDate).getFullYear()} - {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Présent'}
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
                  {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Présent'}
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

    case CVSectionType.LANGUAGES:
      return (
        <div className="grid grid-cols-2 gap-4">
          {section.content.languages?.map((language, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-700">{language.name}</span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">{language.level}</span>
            </div>
          ))}
        </div>
      );

    case CVSectionType.CERTIFICATIONS:
      return (
        <div className="space-y-3">
          {section.content.certifications?.map((cert, index) => (
            <div key={index} className="border-l-2 border-purple-200 pl-4">
              <h3 className="font-semibold text-gray-900">{cert.name}</h3>
              <p className="text-gray-700">{cert.issuer}</p>
              <p className="text-sm text-gray-600">{new Date(cert.issueDate).getFullYear()}</p>
            </div>
          ))}
        </div>
      );

    case CVSectionType.PROJECTS:
      return (
        <div className="space-y-4">
          {section.content.projects?.map((project, index) => (
            <div key={index} className="border-l-2 border-orange-200 pl-4">
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{project.description}</p>
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech, idx) => (
                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {tech}
                  </span>
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
            GitHub
          </label>
          <input
            type="url"
            value={personalInfo.github || ''}
            onChange={(e) => onChange('github', e.target.value)}
            placeholder="https://github.com/votre-profil"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio/Site web
          </label>
          <input
            type="url"
            value={personalInfo.portfolio || personalInfo.website || ''}
            onChange={(e) => onChange('portfolio', e.target.value)}
            placeholder="https://votre-portfolio.com"
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

// Composant d'édition de section
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

  switch (section.type) {
    case CVSectionType.WORK_EXPERIENCE:
      return <WorkExperienceEditor section={section} onChange={onChange} />;
    case CVSectionType.EDUCATION:
      return <EducationEditor section={section} onChange={onChange} />;
    case CVSectionType.SKILLS:
      return <SkillsEditor section={section} onChange={onChange} />;
    case CVSectionType.LANGUAGES:
      return <LanguagesEditor section={section} onChange={onChange} />;
    case CVSectionType.CERTIFICATIONS:
      return <CertificationsEditor section={section} onChange={onChange} />;
    case CVSectionType.PROJECTS:
      return <ProjectsEditor section={section} onChange={onChange} />;
    case CVSectionType.PROFESSIONAL_SUMMARY:
      return <ProfessionalSummaryEditor section={section} onChange={onChange} />;
    default:
      return <CustomSectionEditor section={section} onChange={onChange} />;
  }
};

// Éditeur d'expérience professionnelle
const WorkExperienceEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const workExperiences = section.content.workExperience || [];

  const addWorkExperience = () => {
    const newExperience: WorkExperience = {
      id: `exp_${Date.now()}`,
      company: '',
      position: '',
      location: '',
      startDate: new Date(),
      endDate: undefined,
      isCurrent: true,
      description: '',
      achievements: [],
      technologies: [],
      type: 'full-time'
    };

    onChange({
      ...section,
      content: {
        ...section.content,
        workExperience: [...workExperiences, newExperience]
      }
    });
  };

  const updateWorkExperience = (index: number, updatedExp: WorkExperience) => {
    const updated = [...workExperiences];
    updated[index] = updatedExp;

    onChange({
      ...section,
      content: {
        ...section.content,
        workExperience: updated
      }
    });
  };

  const removeWorkExperience = (index: number) => {
    onChange({
      ...section,
      content: {
        ...section.content,
        workExperience: workExperiences.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        <button
          onClick={addWorkExperience}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </button>
      </div>

      <div className="space-y-6">
        {workExperiences.map((exp, index) => (
          <div key={exp.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Expérience #{index + 1}</h3>
              <button
                onClick={() => removeWorkExperience(index)}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poste *
                </label>
                <input
                  type="text"
                  value={exp.position}
                  onChange={(e) => updateWorkExperience(index, { ...exp, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise *
                </label>
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => updateWorkExperience(index, { ...exp, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu
                </label>
                <input
                  type="text"
                  value={exp.location || ''}
                  onChange={(e) => updateWorkExperience(index, { ...exp, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={exp.type}
                  onChange={(e) => updateWorkExperience(index, { ...exp, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full-time">Temps plein</option>
                  <option value="part-time">Temps partiel</option>
                  <option value="contract">Contrat</option>
                  <option value="internship">Stage</option>
                  <option value="volunteer">Bénévolat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={exp.startDate instanceof Date ? exp.startDate.toISOString().split('T')[0] : exp.startDate}
                  onChange={(e) => updateWorkExperience(index, { ...exp, startDate: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exp.isCurrent}
                      onChange={(e) => updateWorkExperience(index, { ...exp, isCurrent: e.target.checked, endDate: e.target.checked ? undefined : new Date() })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Poste actuel</label>
                  </div>
                  {!exp.isCurrent && (
                    <input
                      type="date"
                      value={exp.endDate instanceof Date ? exp.endDate.toISOString().split('T')[0] : exp.endDate || ''}
                      onChange={(e) => updateWorkExperience(index, { ...exp, endDate: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={exp.description}
                  onChange={(e) => updateWorkExperience(index, { ...exp, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Réalisations clés (une par ligne)
                </label>
                <textarea
                  value={exp.achievements.join('\n')}
                  onChange={(e) => {
                    // Permettre la saisie libre avec retours à la ligne
                    const achievements = e.target.value.split('\n');
                    updateWorkExperience(index, { ...exp, achievements });
                  }}
                  onBlur={(e) => {
                    // Nettoyer seulement quand l'utilisateur quitte le champ
                    const cleanAchievements = e.target.value
                      .split('\n')
                      .map(a => a.trim())
                      .filter(a => a.length > 0);
                    updateWorkExperience(index, { ...exp, achievements: cleanAchievements });
                  }}
                  rows={4}
                  placeholder="Augmentation des ventes de 25%
Gestion d'une équipe de 5 personnes  
Développement d'un nouveau processus qui a réduit les délais de 30%
Formation de 20 nouveaux employés"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Une réalisation par ligne. Concentrez-vous sur des résultats mesurables
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technologies utilisées (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={exp.technologies?.join(', ') || ''}
                  onChange={(e) => {
                    // Permettre la saisie libre, ne pas filtrer pendant la frappe
                    const technologies = e.target.value.split(',').map(t => t.trim());
                    updateWorkExperience(index, { ...exp, technologies });
                  }}
                  onBlur={(e) => {
                    // Nettoyer seulement quand l'utilisateur quitte le champ
                    const cleanTechnologies = e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(t => t.length > 0);
                    updateWorkExperience(index, { ...exp, technologies: cleanTechnologies });
                  }}
                  placeholder="JavaScript, Python, React, Docker, AWS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Listez les technologies, outils et langages utilisés
                </p>
              </div>
            </div>
          </div>
        ))}

        {workExperiences.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4">Aucune expérience ajoutée</p>
            <button
              onClick={addWorkExperience}
              className="text-blue-600 hover:text-blue-800"
            >
              Ajouter votre première expérience
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Éditeur de formation
const EducationEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const educations = section.content.education || [];

  const addEducation = () => {
    const newEducation: Education = {
      id: `edu_${Date.now()}`,
      institution: '',
      degree: '',
      field: '',
      location: '',
      startDate: new Date(),
      endDate: undefined,
      gpa: undefined,
      maxGpa: undefined,
      honors: [],
      coursework: [],
      thesis: undefined
    };

    onChange({
      ...section,
      content: {
        ...section.content,
        education: [...educations, newEducation]
      }
    });
  };

  const updateEducation = (index: number, updatedEdu: Education) => {
    const updated = [...educations];
    updated[index] = updatedEdu;

    onChange({
      ...section,
      content: {
        ...section.content,
        education: updated
      }
    });
  };

  const removeEducation = (index: number) => {
    onChange({
      ...section,
      content: {
        ...section.content,
        education: educations.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        <button
          onClick={addEducation}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </button>
      </div>

      <div className="space-y-6">
        {educations.map((edu, index) => (
          <div key={edu.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Formation #{index + 1}</h3>
              <button
                onClick={() => removeEducation(index)}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diplôme *
                </label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(index, { ...edu, degree: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domaine d'études *
                </label>
                <input
                  type="text"
                  value={edu.field}
                  onChange={(e) => updateEducation(index, { ...edu, field: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution *
                </label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => updateEducation(index, { ...edu, institution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu
                </label>
                <input
                  type="text"
                  value={edu.location || ''}
                  onChange={(e) => updateEducation(index, { ...edu, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={edu.startDate instanceof Date ? edu.startDate.toISOString().split('T')[0] : edu.startDate}
                  onChange={(e) => updateEducation(index, { ...edu, startDate: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={edu.endDate instanceof Date ? edu.endDate.toISOString().split('T')[0] : edu.endDate || ''}
                  onChange={(e) => updateEducation(index, { ...edu, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GPA/Note
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={edu.gpa || ''}
                    onChange={(e) => updateEducation(index, { ...edu, gpa: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="3.8"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="self-center text-gray-500">/</span>
                  <input
                    type="number"
                    step="0.01"
                    value={edu.maxGpa || ''}
                    onChange={(e) => updateEducation(index, { ...edu, maxGpa: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="4.0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distinctions/Mentions (une par ligne)
                </label>
                <textarea
                  value={edu.honors?.join('\n') || ''}
                  onChange={(e) => {
                    // Permettre la saisie libre avec retours à la ligne
                    const honors = e.target.value.split('\n');
                    updateEducation(index, { ...edu, honors });
                  }}
                  onBlur={(e) => {
                    // Nettoyer seulement quand l'utilisateur quitte le champ
                    const cleanHonors = e.target.value
                      .split('\n')
                      .map(h => h.trim())
                      .filter(h => h.length > 0);
                    updateEducation(index, { ...edu, honors: cleanHonors });
                  }}
                  rows={3}
                  placeholder="Magna Cum Laude
Mention Très Bien
Prix d'excellence"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Une distinction par ligne
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cours pertinents (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={edu.coursework?.join(', ') || ''}
                  onChange={(e) => {
                    // Permettre la saisie libre, ne pas filtrer pendant la frappe
                    const coursework = e.target.value.split(',').map(c => c.trim());
                    updateEducation(index, { ...edu, coursework });
                  }}
                  onBlur={(e) => {
                    // Nettoyer seulement quand l'utilisateur quitte le champ
                    const cleanCoursework = e.target.value
                      .split(',')
                      .map(c => c.trim())
                      .filter(c => c.length > 0);
                    updateEducation(index, { ...edu, coursework: cleanCoursework });
                  }}
                  placeholder="Algorithmes, Bases de données, Intelligence Artificielle, Statistiques"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Listez les cours les plus pertinents pour votre carrière
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thèse/Mémoire
                </label>
                <input
                  type="text"
                  value={edu.thesis || ''}
                  onChange={(e) => updateEducation(index, { ...edu, thesis: e.target.value })}
                  placeholder="Titre de la thèse ou du mémoire"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        ))}

        {educations.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4">Aucune formation ajoutée</p>
            <button
              onClick={addEducation}
              className="text-blue-600 hover:text-blue-800"
            >
              Ajouter votre première formation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Éditeur de compétences
const SkillsEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const skills = section.content.skills || [];

  const addSkill = () => {
    const newSkill: Skill = {
      name: '',
      category: 'technical',
      level: 3,
      yearsOfExperience: undefined,
      certifications: []
    };

    onChange({
      ...section,
      content: {
        ...section.content,
        skills: [...skills, newSkill]
      }
    });
  };

  const updateSkill = (index: number, updatedSkill: Skill) => {
    const updated = [...skills];
    updated[index] = updatedSkill;

    onChange({
      ...section,
      content: {
        ...section.content,
        skills: updated
      }
    });
  };

  const removeSkill = (index: number) => {
    onChange({
      ...section,
      content: {
        ...section.content,
        skills: skills.filter((_, i) => i !== index)
      }
    });
  };

  const skillsByCategory = skills.reduce((acc, skill, index) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push({ skill, index });
    return acc;
  }, {} as Record<string, Array<{ skill: Skill; index: number }>>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        <button
          onClick={addSkill}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
          <div key={category} className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
              {category === 'technical' ? 'Techniques' : 
               category === 'soft' ? 'Relationnelles' :
               category === 'language' ? 'Langues' : 'Autres'}
            </h3>
            
            <div className="space-y-4">
              {categorySkills.map(({ skill, index }) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => updateSkill(index, { ...skill, name: e.target.value })}
                      placeholder="Nom de la compétence"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="w-32">
                    <select
                      value={skill.category}
                      onChange={(e) => updateSkill(index, { ...skill, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="technical">Technique</option>
                      <option value="soft">Relationnel</option>
                      <option value="language">Langue</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div className="w-24">
                    <select
                      value={skill.level}
                      onChange={(e) => updateSkill(index, { ...skill, level: parseInt(e.target.value) as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Débutant</option>
                      <option value={2}>Novice</option>
                      <option value={3}>Intermédiaire</option>
                      <option value={4}>Avancé</option>
                      <option value={5}>Expert</option>
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      value={skill.yearsOfExperience || ''}
                      onChange={(e) => updateSkill(index, { ...skill, yearsOfExperience: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Années"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={() => removeSkill(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {skills.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4">Aucune compétence ajoutée</p>
            <button
              onClick={addSkill}
              className="text-blue-600 hover:text-blue-800"
            >
              Ajouter votre première compétence
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Éditeur de langues
const LanguagesEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const languages = section.content.languages || [];

  const addLanguage = () => {
    const newLanguage: Language = {
      name: '',
      level: 'B1',
      certifications: []
    };

    onChange({
      ...section,
      content: {
        ...section.content,
        languages: [...languages, newLanguage]
      }
    });
  };

  const updateLanguage = (index: number, updatedLang: Language) => {
    const updated = [...languages];
    updated[index] = updatedLang;

    onChange({
      ...section,
      content: {
        ...section.content,
        languages: updated
      }
    });
  };

  const removeLanguage = (index: number) => {
    onChange({
      ...section,
      content: {
        ...section.content,
        languages: languages.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        <button
          onClick={addLanguage}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </button>
      </div>

      <div className="space-y-4">
        {languages.map((language, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <input
                type="text"
                value={language.name}
                onChange={(e) => updateLanguage(index, { ...language, name: e.target.value })}
                placeholder="Nom de la langue"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-32">
              <select
                value={language.level}
                onChange={(e) => updateLanguage(index, { ...language, level: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A1">A1 - Débutant</option>
                <option value="A2">A2 - Élémentaire</option>
                <option value="B1">B1 - Intermédiaire</option>
                <option value="B2">B2 - Intermédiaire avancé</option>
                <option value="C1">C1 - Autonome</option>
                <option value="C2">C2 - Maîtrise</option>
                <option value="Native">Langue maternelle</option>
              </select>
            </div>

            <div className="flex-1">
              <input
                type="text"
                value={language.certifications?.join(', ') || ''}
                onChange={(e) => {
                  // Permettre la saisie libre, ne pas filtrer pendant la frappe
                  const certifications = e.target.value.split(',').map(c => c.trim());
                  updateLanguage(index, { ...language, certifications });
                }}
                onBlur={(e) => {
                  // Nettoyer seulement quand l'utilisateur quitte le champ
                  const cleanCertifications = e.target.value
                    .split(',')
                    .map(c => c.trim())
                    .filter(c => c.length > 0);
                  updateLanguage(index, { ...language, certifications: cleanCertifications });
                }}
                placeholder="TOEFL, DELF, DELE, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => removeLanguage(index)}
              className="text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ))}

        {languages.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4">Aucune langue ajoutée</p>
            <button
              onClick={addLanguage}
              className="text-blue-600 hover:text-blue-800"
            >
              Ajouter votre première langue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Éditeur de certifications
const CertificationsEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const certifications = section.content.certifications || [];

  const addCertification = () => {
    const newCertification: Certification = {
      id: `cert_${Date.now()}`,
      name: '',
      issuer: '',
      issueDate: new Date(),
      expiryDate: undefined,
      credentialId: undefined,
      url: undefined
    };

    onChange({
      ...section,
      content: {
        ...section.content,
        certifications: [...certifications, newCertification]
      }
    });
  };

  const updateCertification = (index: number, updatedCert: Certification) => {
    const updated = [...certifications];
    updated[index] = updatedCert;

    onChange({
      ...section,
      content: {
        ...section.content,
        certifications: updated
      }
    });
  };

  const removeCertification = (index: number) => {
    onChange({
      ...section,
      content: {
        ...section.content,
        certifications: certifications.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        <button
          onClick={addCertification}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </button>
      </div>

      <div className="space-y-6">
        {certifications.map((cert, index) => (
          <div key={cert.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Certification #{index + 1}</h3>
              <button
                onClick={() => removeCertification(index)}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la certification *
                </label>
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => updateCertification(index, { ...cert, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisme émetteur *
                </label>
                <input
                  type="text"
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, { ...cert, issuer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'obtention *
                </label>
                <input
                  type="date"
                  value={cert.issueDate instanceof Date ? cert.issueDate.toISOString().split('T')[0] : cert.issueDate}
                  onChange={(e) => updateCertification(index, { ...cert, issueDate: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'expiration
                </label>
                <input
                  type="date"
                  value={cert.expiryDate instanceof Date ? cert.expiryDate.toISOString().split('T')[0] : cert.expiryDate || ''}
                  onChange={(e) => updateCertification(index, { ...cert, expiryDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de certification
                </label>
                <input
                  type="text"
                  value={cert.credentialId || ''}
                  onChange={(e) => updateCertification(index, { ...cert, credentialId: e.target.value })}
                  placeholder="ID ou numéro de certification"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de vérification
                </label>
                <input
                  type="url"
                  value={cert.url || ''}
                  onChange={(e) => updateCertification(index, { ...cert, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        ))}

        {certifications.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4">Aucune certification ajoutée</p>
            <button
              onClick={addCertification}
              className="text-blue-600 hover:text-blue-800"
            >
              Ajouter votre première certification
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Éditeur de projets
const ProjectsEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const projects = section.content.projects || [];

  const addProject = () => {
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: '',
      description: '',
      role: undefined,
      technologies: [],
      url: undefined,
      repository: undefined,
      startDate: undefined,
      endDate: undefined,
      achievements: []
    };

    onChange({
      ...section,
      content: {
        ...section.content,
        projects: [...projects, newProject]
      }
    });
  };

  const updateProject = (index: number, updatedProject: Project) => {
    const updated = [...projects];
    updated[index] = updatedProject;

    onChange({
      ...section,
      content: {
        ...section.content,
        projects: updated
      }
    });
  };

  const removeProject = (index: number) => {
    onChange({
      ...section,
      content: {
        ...section.content,
        projects: projects.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        <button
          onClick={addProject}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </button>
      </div>

      <div className="space-y-6">
        {projects.map((project, index) => (
          <div key={project.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Projet #{index + 1}</h3>
              <button
                onClick={() => removeProject(index)}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du projet *
                </label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => updateProject(index, { ...project, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre rôle
                </label>
                <input
                  type="text"
                  value={project.role || ''}
                  onChange={(e) => updateProject(index, { ...project, role: e.target.value })}
                  placeholder="Lead Developer, Designer, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={project.description}
                  onChange={(e) => updateProject(index, { ...project, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL du projet
                </label>
                <input
                  type="url"
                  value={project.url || ''}
                  onChange={(e) => updateProject(index, { ...project, url: e.target.value })}
                  placeholder="https://mon-projet.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repository GitHub
                </label>
                <input
                  type="url"
                  value={project.repository || ''}
                  onChange={(e) => updateProject(index, { ...project, repository: e.target.value })}
                  placeholder="https://github.com/user/repo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={project.startDate instanceof Date ? project.startDate.toISOString().split('T')[0] : project.startDate || ''}
                  onChange={(e) => updateProject(index, { ...project, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={project.endDate instanceof Date ? project.endDate.toISOString().split('T')[0] : project.endDate || ''}
                  onChange={(e) => updateProject(index, { ...project, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technologies utilisées (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={project.technologies.join(', ')}
                  onChange={(e) => {
                    // Permettre la saisie libre, ne pas filtrer pendant la frappe
                    const technologies = e.target.value.split(',').map(t => t.trim());
                    updateProject(index, { ...project, technologies });
                  }}
                  onBlur={(e) => {
                    // Nettoyer seulement quand l'utilisateur quitte le champ
                    const cleanTechnologies = e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(t => t.length > 0);
                    updateProject(index, { ...project, technologies: cleanTechnologies });
                  }}
                  placeholder="React, Node.js, PostgreSQL, MongoDB"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Séparez chaque technologie par une virgule
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Réalisations clés (une par ligne)
                </label>
                <textarea
                  value={project.achievements.join('\n')}
                  onChange={(e) => {
                    // Permettre la saisie libre avec retours à la ligne
                    const achievements = e.target.value.split('\n');
                    updateProject(index, { ...project, achievements });
                  }}
                  onBlur={(e) => {
                    // Nettoyer seulement quand l'utilisateur quitte le champ
                    const cleanAchievements = e.target.value
                      .split('\n')
                      .map(a => a.trim())
                      .filter(a => a.length > 0);
                    updateProject(index, { ...project, achievements: cleanAchievements });
                  }}
                  rows={4}
                  placeholder="Développement d'une API REST performante
Implémentation d'une interface utilisateur responsive
Réduction du temps de chargement de 50%  
Gestion d'une équipe de 3 développeurs"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Une réalisation par ligne. Appuyez sur Entrée pour passer à la ligne suivante
                </p>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4">Aucun projet ajouté</p>
            <button
              onClick={addProject}
              className="text-blue-600 hover:text-blue-800"
            >
              Ajouter votre premier projet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Éditeur de résumé professionnel
const ProfessionalSummaryEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const content = section.content.customContent || '';

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">{section.title}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Résumé professionnel
        </label>
        <textarea
          value={content}
          onChange={(e) => onChange({
            ...section,
            content: {
              ...section.content,
              customContent: e.target.value
            }
          })}
          rows={6}
          placeholder="Rédigez un résumé de votre profil professionnel, vos compétences clés et vos objectifs..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-2 text-sm text-gray-600">
          Conseil : Rédigez un résumé de 3-4 phrases qui met en avant vos points forts et votre expérience.
        </p>
      </div>
    </div>
  );
};

// Éditeur de section personnalisée
const CustomSectionEditor: React.FC<{
  section: CVUserSection;
  onChange: (section: CVUserSection) => void;
}> = ({ section, onChange }) => {
  const content = section.content.customContent || '';

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titre de la section
        </label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onChange({
            ...section,
            title: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contenu
        </label>
        <textarea
          value={content}
          onChange={(e) => onChange({
            ...section,
            content: {
              ...section.content,
              customContent: e.target.value
            }
          })}
          rows={8}
          placeholder="Contenu de votre section personnalisée..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default CVEditorPage;