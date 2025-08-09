import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    FaArrowLeft,
    FaEdit,
    FaDownload,
    FaShare,
    FaCopy,
    FaEye,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaEnvelope,
    FaPhone,
    FaLinkedin,
    FaGithub,
    FaGlobe,
    FaBriefcase,
    FaGraduationCap,
    FaCogs,
    FaLanguage,
    FaCertificate,
    FaProjectDiagram,
    FaHeart,
    FaUsers,
    FaStar,
    FaChartLine,
    FaRocket,
    FaExclamationTriangle,
    FaSpinner,
    FaFilePdf,
    FaFileWord,
    FaFileCode,
    FaFileAlt,
    FaUser
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { useCVStore } from '../store/cv.store';
import { useToast } from '../store/toast.store';
import { CVSectionType,
    type WorkExperience, 
    type Education, 
    type Skill, 
    type Language, 
    type Certification, 
    type Project, 
    type CVUserSection} from '../types/cv.types';
import { analytics } from '../utils/analytics';
import MetaTags from '../components/SEO/MetaTags';
import LoadingSpinner from '../components/layout/LoadingSpinner';

const CVViewPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<string>('');
    const [shareMenuOpen, setShareMenuOpen] = useState(false);

    const {
        currentCV,
        isLoading,
        error,
        loadCVById,
        exportCV,
        clearError
    } = useCVStore();

    // Charger le CV au montage
    useEffect(() => {
        if (id) {
            loadCVById(id);
            analytics.pageView(`/dashboard/cv/${id}`);
            analytics.track({
                action: 'cv_viewed',
                category: 'engagement',
                label: id
            });
        }
    }, [id, loadCVById]);

    // Gestion des erreurs
    useEffect(() => {
        if (error) {
            toast.error('Erreur', error);
            clearError();
        }
    }, [error, toast, clearError]);

    // Handlers
    const handleEdit = () => {
        if (currentCV) {
            analytics.track({
                action: 'cv_edit_clicked',
                category: 'engagement',
                label: currentCV.id
            });
            navigate(`/dashboard/cv/${currentCV.id}/edit`);
        }
    };

    const handleExport = async (format: string) => {
        if (!currentCV) return;

        setIsExporting(true);
        setExportFormat(format);

        try {
            const downloadUrl = await exportCV(currentCV.id, format);

            // Ouvrir le lien de téléchargement
            window.open(downloadUrl, '_blank');

            toast.success('Export réussi', `CV exporté en ${format.toUpperCase()}`);

            analytics.track({
                action: 'cv_exported',
                category: 'conversion',
                label: format
            });

        } catch (error: unknown) {
            console.error('Erreur export:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Impossible d\'exporter le CV';
            toast.error('Erreur d\'export', errorMessage );
        } finally {
            setIsExporting(false);
            setExportFormat('');
        }
    };

    const handleShare = () => {
        setShareMenuOpen(!shareMenuOpen);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Lien copié', 'Le lien du CV a été copié dans le presse-papiers');
            setShareMenuOpen(false);
        } catch (error) {
            console.log('Erreur', 'Impossible de copier le lien',error)
            toast.error('Erreur', 'Impossible de copier le lien');
        }
    };

    // Utilitaires de formatage
    const formatDate = (date: Date | string) => {
        try {
            const d = typeof date === 'string' ? new Date(date) : date;
            return d.toLocaleDateString('fr-FR', {
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return 'Date invalide';
        }
    };

    const getSkillLevelText = (level: number) => {
        const levels = ['Débutant', 'Novice', 'Intermédiaire', 'Avancé', 'Expert'];
        return levels[level - 1] || 'Non défini';
    };

    const getSkillLevelColor = (level: number) => {
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
        return colors[level - 1] || 'bg-gray-500';
    };

    const getRegionFlag = (region: string) => {
        const flags: Record<string, string> = {
            france: '🇫🇷',
            usa: '🇺🇸',
            uk: '🇬🇧',
            germany: '🇩🇪',
            canada: '🇨🇦',
            spain: '🇪🇸',
            italy: '🇮🇹',
            international: '🌍'
        };
        return flags[region] || '🌍';
    };

    // Loading state
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner size="large" text="Chargement du CV..." />
                </div>
            </DashboardLayout>
        );
    }

    // Error state
    if (!currentCV) {
        return (
            <DashboardLayout>
                <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-lg">
                    <div className="flex items-center">
                        <FaExclamationTriangle className="text-red-500 mr-3 text-xl" />
                        <div className="flex-1">
                            <h3 className="text-red-800 font-semibold">CV non trouvé</h3>
                            <p className="text-red-700 mt-1">Le CV demandé n'existe pas ou vous n'avez pas les permissions pour le voir.</p>
                        </div>
                        <Button
                            as={Link}
                            to="/dashboard/cv"
                            variant="outline"
                            size="sm"
                        >
                            Retour aux CV
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <>
            <MetaTags
                title={`${currentCV.title} - CV`}
                description={`Visualisation du CV ${currentCV.title} créé avec MotivationLetter AI`}
            />

            <DashboardLayout>
                {/* Header avec actions */}
                <div className="mb-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={() => navigate('/dashboard/cv')}
                                variant="ghost"
                                leftIcon={<FaArrowLeft />}
                                size="sm"
                            >
                                Retour
                            </Button>

                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                                    {getRegionFlag(currentCV.region)}
                                    <span className="ml-2">{currentCV.title}</span>
                                </h1>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                    <div className="flex items-center">
                                        <FaCalendarAlt className="mr-1" />
                                        Modifié le {formatDate(currentCV.updatedAt)}
                                    </div>
                                    <div className="flex items-center">
                                        <FaEye className="mr-1" />
                                        Version {currentCV.version}
                                    </div>
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentCV.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : currentCV.status === 'published'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {currentCV.status === 'completed' ? 'Terminé' :
                                            currentCV.status === 'published' ? 'Publié' : 'Brouillon'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Export Menu */}
                            <div className="relative">
                                <Button
                                    onClick={() => setShareMenuOpen(!shareMenuOpen)}
                                    variant="outline"
                                    leftIcon={<FaDownload />}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <>
                                            <FaSpinner className="animate-spin mr-2" />
                                            Export {exportFormat.toUpperCase()}...
                                        </>
                                    ) : (
                                        'Exporter'
                                    )}
                                </Button>

                                {shareMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                        <div className="py-2">
                                            <button
                                                onClick={() => handleExport('pdf')}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                disabled={isExporting}
                                            >
                                                <FaFilePdf className="mr-3 text-red-500" />
                                                PDF
                                            </button>
                                            <button
                                                onClick={() => handleExport('docx')}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                disabled={isExporting}
                                            >
                                                <FaFileWord className="mr-3 text-blue-500" />
                                                Word (DOCX)
                                            </button>
                                            <button
                                                onClick={() => handleExport('html')}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                disabled={isExporting}
                                            >
                                                <FaFileCode className="mr-3 text-orange-500" />
                                                HTML
                                            </button>
                                            <button
                                                onClick={() => handleExport('json')}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                disabled={isExporting}
                                            >
                                                <FaFileAlt className="mr-3 text-gray-500" />
                                                JSON
                                            </button>
                                        </div>
                                        <div className="border-t border-gray-100 py-2">
                                            <button
                                                onClick={handleCopyLink}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <FaCopy className="mr-3 text-gray-400" />
                                                Copier le lien
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleShare}
                                variant="outline"
                                leftIcon={<FaShare />}
                            >
                                Partager
                            </Button>

                            <Button
                                onClick={handleEdit}
                                variant="primary"
                                leftIcon={<FaEdit />}
                            >
                                Modifier
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Analyse IA si disponible */}
                {currentCV.lastAnalysis && (
                    <div className="mb-8 bg-gradient-to-r from-purple-50 to-emerald-50 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                <FaChartLine className="mr-2 text-purple-600" />
                                Analyse IA
                            </h2>
                            <div className="flex items-center space-x-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {currentCV.lastAnalysis.overallScore}/100
                                    </div>
                                    <div className="text-xs text-gray-500">Score global</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Conformité régionale</span>
                                    <span className="text-lg font-bold text-green-600">
                                        {currentCV.lastAnalysis.regionalCompliance}/100
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${currentCV.lastAnalysis.regionalCompliance}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Compatibilité ATS</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {currentCV.lastAnalysis.atsCompatibility}/100
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${currentCV.lastAnalysis.atsCompatibility}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Optimisation mots-clés</span>
                                    <span className="text-lg font-bold text-purple-600">
                                        {currentCV.lastAnalysis.keywordOptimization}/100
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${currentCV.lastAnalysis.keywordOptimization}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contenu principal du CV */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* En-tête du CV */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 border-b border-gray-200">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                                {/* Photo si disponible */}
                                {currentCV.personalInfo.photo && (
                                    <div className="flex-shrink-0">
                                        <img
                                            src={currentCV.personalInfo.photo}
                                            alt={`${currentCV.personalInfo.firstName} ${currentCV.personalInfo.lastName}`}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                        />
                                    </div>
                                )}

                                {/* Informations personnelles */}
                                <div className="flex-1">
                                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                        {currentCV.personalInfo.firstName} {currentCV.personalInfo.lastName}
                                    </h1>

                                    {currentCV.personalInfo.professionalSummary && (
                                        <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                                            {currentCV.personalInfo.professionalSummary}
                                        </p>
                                    )}

                                    {/* Coordonnées */}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        {currentCV.personalInfo.email && (
                                            <div className="flex items-center">
                                                <FaEnvelope className="mr-2 text-blue-500" />
                                                <a href={`mailto:${currentCV.personalInfo.email}`} className="hover:text-blue-600">
                                                    {currentCV.personalInfo.email}
                                                </a>
                                            </div>
                                        )}

                                        {currentCV.personalInfo.phone && (
                                            <div className="flex items-center">
                                                <FaPhone className="mr-2 text-green-500" />
                                                <a href={`tel:${currentCV.personalInfo.phone}`} className="hover:text-green-600">
                                                    {currentCV.personalInfo.phone}
                                                </a>
                                            </div>
                                        )}

                                        {currentCV.personalInfo.address && (
                                            <div className="flex items-center">
                                                <FaMapMarkerAlt className="mr-2 text-red-500" />
                                                <span>
                                                    {currentCV.personalInfo.address.city}, {currentCV.personalInfo.address.country}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Liens professionnels */}
                                    <div className="flex flex-wrap gap-4 mt-3">
                                        {currentCV.personalInfo.linkedin && (
                                            <a
                                                href={currentCV.personalInfo.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                <FaLinkedin className="mr-1" />
                                                LinkedIn
                                            </a>
                                        )}

                                        {currentCV.personalInfo.github && (
                                            <a
                                                href={currentCV.personalInfo.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-sm text-gray-700 hover:text-gray-900"
                                            >
                                                <FaGithub className="mr-1" />
                                                GitHub
                                            </a>
                                        )}

                                        {(currentCV.personalInfo.website || currentCV.personalInfo.portfolio) && (
                                            <a
                                                href={currentCV.personalInfo.website || currentCV.personalInfo.portfolio}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-sm text-purple-600 hover:text-purple-700"
                                            >
                                                <FaGlobe className="mr-1" />
                                                Site web
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sections du CV */}
                    <div className="p-8">
                        <div className="max-w-4xl mx-auto space-y-8">
                            {currentCV.sections
                                .filter(section => section.isVisible)
                                .sort((a, b) => a.order - b.order)
                                .map((section) => (
                                    <CVSection 
                                        key={section.sectionId} 
                                        section={section} 
                                        getSkillLevelText={getSkillLevelText}
                                        getSkillLevelColor={getSkillLevelColor}
                                    />
                                ))}
                        </div>
                    </div>
                </div>

                {/* Actions rapides en bas */}
                <div className="mt-8 flex justify-center space-x-4">
                    <Button
                        onClick={handleEdit}
                        variant="primary"
                        leftIcon={<FaEdit />}
                        size="lg"
                    >
                        Modifier ce CV
                    </Button>

                    <Button
                        as={Link}
                        to={`/dashboard/cv/${currentCV.id}/analyze`}
                        variant="outline"
                        leftIcon={<FaRocket />}
                        size="lg"
                    >
                        Analyser avec l'IA
                    </Button>
                </div>
            </DashboardLayout>
        </>
    );
};

// Composant pour afficher une section du CV
const CVSection: React.FC<{ 
    section: CVUserSection;
    getSkillLevelText: (level: number) => string;
    getSkillLevelColor: (level: number) => string;
}> = ({ section, getSkillLevelText, getSkillLevelColor }) => {
    const getSectionIcon = (type: CVSectionType) => {
        const icons = {
            [CVSectionType.WORK_EXPERIENCE]: FaBriefcase,
            [CVSectionType.EDUCATION]: FaGraduationCap,
            [CVSectionType.SKILLS]: FaCogs,
            [CVSectionType.LANGUAGES]: FaLanguage,
            [CVSectionType.CERTIFICATIONS]: FaCertificate,
            [CVSectionType.PROJECTS]: FaProjectDiagram,
            [CVSectionType.VOLUNTEER]: FaHeart,
            [CVSectionType.HOBBIES]: FaUsers,
            [CVSectionType.REFERENCES]: FaStar,
            [CVSectionType.PROFESSIONAL_SUMMARY]: FaFileAlt,
            [CVSectionType.PERSONAL_INFO]: FaUser,
            [CVSectionType.CUSTOM]: FaFileAlt
        };
        return icons[type] || FaFileAlt;
    };

    const Icon = getSectionIcon(section.type);

    return (
        <div className="border-l-4 border-blue-500 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Icon className="mr-3 text-blue-600" />
                {section.title}
            </h2>

            <div className="space-y-4">
                {/* Expérience professionnelle */}
                {section.content.workExperience?.map((exp: WorkExperience) => (
                    <div key={exp.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                                <p className="text-blue-600 font-medium">{exp.company}</p>
                                {exp.location && (
                                    <p className="text-sm text-gray-500 flex items-center mt-1">
                                        <FaMapMarkerAlt className="mr-1" />
                                        {exp.location}
                                    </p>
                                )}
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                <p>
                                    {new Date(exp.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} -
                                    {exp.isCurrent ? ' Présent' : ` ${new Date(exp.endDate!).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`}
                                </p>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${exp.type === 'full-time' ? 'bg-green-100 text-green-700' :
                                    exp.type === 'part-time' ? 'bg-blue-100 text-blue-700' :
                                        exp.type === 'contract' ? 'bg-purple-100 text-purple-700' :
                                            exp.type === 'internship' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                    }`}>
                                    {exp.type === 'full-time' ? 'Temps plein' :
                                        exp.type === 'part-time' ? 'Temps partiel' :
                                            exp.type === 'contract' ? 'Contrat' :
                                                exp.type === 'internship' ? 'Stage' : 'Bénévolat'}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-700 mb-3">{exp.description}</p>

                        {exp.achievements.length > 0 && (
                            <div className="mb-3">
                                <h4 className="font-medium text-gray-800 mb-2">Réalisations :</h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {exp.achievements.map((achievement, index) => (
                                        <li key={index}>{achievement}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {exp.technologies && exp.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {exp.technologies.map((tech, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Formation */}
                {section.content.education?.map((edu: Education) => (
                    <div key={edu.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                                <p className="text-blue-600 font-medium">{edu.institution}</p>
                                <p className="text-gray-600">{edu.field}</p>
                                {edu.location && (
                                    <p className="text-sm text-gray-500 flex items-center mt-1">
                                        <FaMapMarkerAlt className="mr-1" />
                                        {edu.location}
                                    </p>
                                )}
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                <p>
                                    {new Date(edu.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} -
                                    {edu.endDate ? ` ${new Date(edu.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}` : ' En cours'}
                                </p>
                                {edu.gpa && (
                                    <p className="mt-1">
                                        GPA: {edu.gpa}/{edu.maxGpa || 4}
                                    </p>
                                )}
                            </div>
                        </div>

                        {edu.honors && edu.honors.length > 0 && (
                            <div className="mb-2">
                                <h4 className="font-medium text-gray-800 mb-1">Distinctions :</h4>
                                <div className="flex flex-wrap gap-2">
                                    {edu.honors.map((honor, index) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"
                                        >
                                            {honor}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {edu.coursework && edu.coursework.length > 0 && (
                            <div>
                                <h4 className="font-medium text-gray-800 mb-1">Cours pertinents :</h4>
                                <p className="text-gray-700 text-sm">{edu.coursework.join(', ')}</p>
                            </div>
                        )}

                        {edu.thesis && (
                            <div className="mt-2">
                                <h4 className="font-medium text-gray-800 mb-1">Thèse/Mémoire :</h4>
                                <p className="text-gray-700 text-sm italic">{edu.thesis}</p>
                            </div>
                        )}
                    </div>
                ))}

                {/* Compétences */}
                {section.content.skills && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.content.skills.map((skill: Skill, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-medium text-gray-900">{skill.name}</h3>
                                    <span className="text-sm text-gray-500 capitalize">
                                        {skill.category === 'technical' ? 'Technique' :
                                         skill.category === 'soft' ? 'Relationnel' :
                                         skill.category === 'language' ? 'Langue' : skill.category}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-1000 ${getSkillLevelColor(skill.level)}`}
                                            style={{ width: `${(skill.level / 5) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {getSkillLevelText(skill.level)}
                                    </span>
                                </div>

                                {skill.yearsOfExperience && (
                                    <p className="text-xs text-gray-500">
                                        {skill.yearsOfExperience} an{skill.yearsOfExperience > 1 ? 's' : ''} d'expérience
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Langues */}
                {section.content.languages && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.content.languages.map((lang: Language, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-gray-900">{lang.name}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${lang.level === 'Native' ? 'bg-green-100 text-green-700' :
                                        ['C1', 'C2'].includes(lang.level) ? 'bg-blue-100 text-blue-700' :
                                            ['B1', 'B2'].includes(lang.level) ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {lang.level}
                                    </span>
                                </div>

                                {lang.certifications && lang.certifications.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-500">
                                            Certifications: {lang.certifications.join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Certifications */}
                {section.content.certifications?.map((cert: Certification) => (
                    <div key={cert.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                                <p className="text-blue-600 font-medium">{cert.issuer}</p>
                                {cert.credentialId && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        ID: {cert.credentialId}
                                    </p>
                                )}
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                <p>{new Date(cert.issueDate).toLocaleDateString('fr-FR')}</p>
                                {cert.expiryDate && (
                                    <p className="text-red-600">
                                        Expire: {new Date(cert.expiryDate).toLocaleDateString('fr-FR')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {cert.url && (
                            <div className="mt-2">
                                <a
                                    href={cert.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                    Voir la certification →
                                </a>
                            </div>
                        )}
                    </div>
                ))}

                {/* Projets */}
                {section.content.projects?.map((project: Project) => (
                    <div key={project.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                                {project.role && (
                                    <p className="text-blue-600 font-medium">{project.role}</p>
                                )}
                            </div>
                            {(project.startDate || project.endDate) && (
                                <div className="text-right text-sm text-gray-500">
                                    {project.startDate && (
                                        <p>
                                            {new Date(project.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                            {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <p className="text-gray-700 mb-3">{project.description}</p>

                        {project.achievements.length > 0 && (
                            <div className="mb-3">
                                <h4 className="font-medium text-gray-800 mb-2">Réalisations :</h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                    {project.achievements.map((achievement, index) => (
                                        <li key={index}>{achievement}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {project.technologies.map((tech, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex space-x-4">
                            {project.url && (
                                <a
                                    href={project.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                                >
                                    <FaGlobe className="mr-1" />
                                    Voir le projet
                                </a>
                            )}

                            {project.repository && (
                                <a
                                    href={project.repository}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-700 hover:text-gray-900 text-sm flex items-center"
                                >
                                    <FaGithub className="mr-1" />
                                    Code source
                                </a>
                            )}
                        </div>
                    </div>
                ))}

                {/* Contenu personnalisé */}
                {section.content.customContent && (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="prose prose-sm max-w-none text-gray-700">
                            {section.content.customContent.split('\n').map((paragraph, index) => (
                                <p key={index} className="mb-2 last:mb-0">
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CVViewPage;