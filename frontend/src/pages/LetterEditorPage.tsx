import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaSave,
  FaArrowLeft,
  FaDownload,
  FaCheck,
  FaEye,
  FaTimes,
  FaTrash,
  FaRobot,
  FaSpinner,
  FaExclamationTriangle,
  FaLightbulb,
  FaCog
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';

interface LetterFormData {
  title: string;
  company: string;
  jobTitle: string;
  recipientName: string;
  recipientEmail: string;
  content: string;
  status: 'draft' | 'final';
}

interface UserProfile {
  name?: string;
  experience?: string;
  skills?: string[];
  education?: string;
  achievements?: string[];
}

const LetterEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const isNewLetter = !id || id === 'new';

  const [formData, setFormData] = useState<LetterFormData>({
    title: '',
    company: '',
    jobTitle: '',
    recipientName: '',
    recipientEmail: '',
    content: '',
    status: 'draft'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Champs pour la génération IA mis à jour
  const [aiSettings, setAiSettings] = useState({
    jobDescription: '',
    customPrompt: '',
    model: 'gemini-2.0-flash', // Correspond à AIModel.GEMINI_PRO
    tone: 'professional', // 'professional' | 'casual' | 'enthusiastic' | 'formal'
    language: 'fr', // 'fr' | 'en'
    saveAsLetter: true
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: user?.displayName || '',
    experience: '',
    skills: [],
    education: '',
    achievements: []
  });

  // Champs pour les compétences et réalisations
  const [skillsInput, setSkillsInput] = useState('');
  const [achievementsInput, setAchievementsInput] = useState('');

  // Vérification de l'authentification
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Chargement des données d'une lettre existante
  useEffect(() => {
    const fetchLetterData = async () => {
      if (isNewLetter) return;

      try {
        const response = await api.get(`/letters/${id}`);
        const letter = response.data;
        const serverContent = letter.content || '';
        if (formData.content && formData.content !== serverContent && formData.content.length > 0) {
         
            return; // Ne pas écraser les données locales
          
        }
        setFormData({
          title: letter.title || '',
          company: letter.company || '',
          jobTitle: letter.jobTitle || '',
          recipientName: letter.recipient?.name || '',
          recipientEmail: letter.recipient?.email || '',
          content: letter.content || '',
          status: letter.status || 'draft'
        });
      } catch (err: any) {
        console.error('Erreur lors du chargement de la lettre:', err);
        setError(`Impossible de charger les données de la lettre: ${err.response?.data?.message || 'Erreur serveur'}`);
      }
    };

    fetchLetterData();
  }, [id, isNewLetter]);

  // Mise à jour du profil utilisateur
  useEffect(() => {
    setUserProfile(prev => ({
      ...prev,
      name: user?.displayName || '',
      skills: skillsInput ? skillsInput.split(',').map(s => s.trim()).filter(Boolean) : [],
      achievements: achievementsInput ? achievementsInput.split(',').map(a => a.trim()).filter(Boolean) : []
    }));
  }, [user, skillsInput, achievementsInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAiSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setAiSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleUserProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({ ...prev, [name]: value }));
  };

  const downloadLetter = async () => {
    const response = await api.get(`/letters/${id}/export?format=pdf`);
    if(response.data.data.blob){
      const binaryString = window.atob(response.data.data.blob);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for(let i=0; i < len; i++){
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer],{type:'application/pdf'});

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url;
      a.download = `${response.data.data.letter.title}.pdf`;

      document.body.appendChild(a);
      a.click();
      document.removeChild(a);

      window.URL.revokeObjectURL(url);
    }
  }

  const handleSave = async (asFinal: boolean = false) => {
    setIsSaving(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        status: asFinal ? 'final' : formData.status
      };

      const letterData = {
        title: dataToSave.title,
        content: dataToSave.content,
        jobTitle: dataToSave.jobTitle,
        company: dataToSave.company,
        recipient: {
          name: dataToSave.recipientName,
          email: dataToSave.recipientEmail
        },
        status: dataToSave.status
      };

      if (isNewLetter) {
        const response = await api.post('/letters', letterData);
        navigate(`/dashboard/letters/${response.data.id}/edit`);
      } else {
        await api.put(`/letters/${id}`, letterData);
      }

      setFormData(dataToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (asFinal) {
        setTimeout(() => {
          navigate('/dashboard/letters');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error saving letter:', err);
      setError(`Erreur lors de l'enregistrement: ${err.response?.data?.message || 'Erreur serveur'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await api.delete(`/letters/${id}`);
      navigate('/dashboard/letters');
    } catch (err: any) {
      console.error('Error deleting letter:', err);
      setError(`Erreur lors de la suppression: ${err.response?.data?.message || 'Erreur serveur'}`);
    } finally {
      setIsSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const generateAIContent = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Validation des champs requis
      if (!formData.jobTitle?.trim() || !formData.company?.trim()) {
        setError('Veuillez remplir au moins le titre du poste et l\'entreprise pour générer une lettre.');
        setIsGenerating(false);
        return;
      }

      // Préparer les données pour l'API selon le format attendu
      const requestData = {
        jobTitle: formData.jobTitle.trim(),
        company: formData.company.trim(),
        recipientName: formData.recipientName?.trim() || undefined,
        recipientEmail: formData.recipientEmail?.trim() || undefined,
        jobDescription: aiSettings.jobDescription?.trim() || undefined,
        userProfile: {
          name: userProfile.name?.trim() || user?.displayName || undefined,
          experience: userProfile.experience?.trim() || undefined,
          skills: userProfile.skills?.filter(Boolean) || undefined,
          education: userProfile.education?.trim() || undefined,
          achievements: userProfile.achievements?.filter(Boolean) || undefined
        },
        model: aiSettings.model,
        customPrompt: aiSettings.customPrompt?.trim() || undefined,
        tone: aiSettings.tone,
        language: aiSettings.language,
        saveAsLetter: aiSettings.saveAsLetter
      };

      // Nettoyer les champs vides du userProfile
      Object.keys(requestData.userProfile).forEach(key => {
        const value = requestData.userProfile[key as keyof typeof requestData.userProfile];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          delete requestData.userProfile[key as keyof typeof requestData.userProfile];
        }
      });

      console.log('Données envoyées à l\'API:', requestData);

      // Appel à l'API pour générer le contenu avec l'IA
      const response = await api.post('/letters/generate', requestData);

      // Mise à jour du contenu avec la réponse de l'IA
      if (response.data?.data) {
        setFormData(prev => ({
          ...prev,
          content: response.data.data.content,
          title: prev.title || `Lettre de motivation - ${formData.jobTitle} chez ${formData.company}`
        }));
      }

      // Si une lettre a été sauvegardée automatiquement, rediriger
      if (response.data.data.letter && aiSettings.saveAsLetter) {
        navigate(`/dashboard/letters/${response.data.data.letter.id}/edit`);
      }

    } catch (err: any) {
      console.error('Error generating AI content:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la génération du contenu IA';
      setError(errorMessage);
      
      // Mode démo en cas d'erreur (pour le développement)
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <DashboardLayout>
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-3">
              Supprimer cette lettre ?
            </h3>
            <p className="mb-4 text-gray-600">
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer définitivement cette lettre de motivation ?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
                loading={isSaving}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 md:p-10 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-200 p-4">
              <h3 className="text-lg font-bold">
                Aperçu de la lettre
              </h3>
              <button
                className="p-2 rounded-md hover:bg-gray-100 flex items-center justify-center"
                onClick={() => setShowPreview(false)}
                aria-label="Fermer l'aperçu"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 preview-content text-sm">
              <div className="mb-6 text-right">
                <div>{userProfile.name || user?.displayName || 'Jean Dupont'}</div>
                <div>10 rue de Paris</div>
                <div>75001 Paris</div>
                <div>{user?.email || 'jean.dupont@email.com'}</div>
                <div>06 12 34 56 78</div>
              </div>

              <div className="mb-6">
                <div>{formData.recipientName || 'Service Recrutement'}</div>
                <div>{formData.company}</div>
                <div>20 avenue des Champs-Élysées</div>
                <div>75008 Paris</div>
              </div>

              <div className="mb-6 text-right">
                Paris, le {new Date().toLocaleDateString('fr-FR')}
              </div>

              <div className="mb-3">
                <div><strong>Objet :</strong> {formData.title || `Candidature au poste de ${formData.jobTitle}`}</div>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed">
                {formData.content}
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 p-4 gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowPreview(false)}
              >
                Fermer
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<FaDownload />}
                onClick={downloadLetter}
                disabled={isNewLetter}
              >
                Télécharger en PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center">
          <Link
            to="/dashboard/letters"
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mr-4 hover:bg-gray-200"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
              {isNewLetter ? 'Nouvelle lettre de motivation' : formData.title}
            </h1>
            <p className="text-gray-600">
              {isNewLetter
                ? 'Créez une nouvelle lettre personnalisée'
                : `Dernière modification le ${new Date().toLocaleDateString('fr-FR')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {!isNewLetter && (
            <>
              <Button
                variant="outline"
                size="md"
                leftIcon={<FaTrash />}
                className="text-red-500 border-red-500 hover:bg-red-50"
                onClick={() => setShowConfirmDialog(true)}
              >
                Supprimer
              </Button>
              <Button
                variant="outline"
                size="md"
                leftIcon={<FaEye />}
                onClick={() => setShowPreview(true)}
              >
                Aperçu
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="md"
            leftIcon={<FaSave />}
            onClick={() => handleSave()}
            loading={isSaving}
          >
            Enregistrer
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<FaCheck />}
            onClick={() => handleSave(true)}
            loading={isSaving}
          >
            {formData.status === 'final' ? 'Mettre à jour' : 'Finaliser'}
          </Button>
        </div>
      </div>

      {/* Success or Error Message */}
      {saveSuccess && (
        <div className="bg-green-100 text-green-700 p-4 rounded-md mb-6 flex items-center">
          <FaCheck className="mr-2" />
          Lettre enregistrée avec succès
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6 flex items-center">
          <FaExclamationTriangle className="mr-2" />
          {error}
        </div>
      )}

      {/* Letter Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Letter Details */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              Informations de base
            </h2>

            <div className="mb-4">
              <label
                htmlFor="title"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Titre de la lettre *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Ex: Candidature au poste de Développeur Frontend"
                value={formData.title}
                onChange={handleInputChange}
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="company"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Entreprise cible *
              </label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="Ex: TechCorp"
                value={formData.company}
                onChange={handleInputChange}
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="jobTitle"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Intitulé du poste *
              </label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                placeholder="Ex: Développeur Frontend"
                value={formData.jobTitle}
                onChange={handleInputChange}
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              Destinataire
            </h2>

            <div className="mb-4">
              <label
                htmlFor="recipientName"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Nom du destinataire
              </label>
              <input
                id="recipientName"
                name="recipientName"
                type="text"
                placeholder="Ex: Mme Alexandra Martin"
                value={formData.recipientName}
                onChange={handleInputChange}
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="recipientEmail"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Email du destinataire
              </label>
              <input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                placeholder="Ex: a.martin@techcorp.com"
                value={formData.recipientEmail}
                onChange={handleInputChange}
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section IA améliorée */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                Génération IA
              </h2>
              <div className="text-sm bg-yellow-100 text-yellow-800 p-2 rounded-md flex items-center">
                <FaLightbulb className="mr-2" />
                Nouveau!
              </div>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              Utilisez l'IA pour générer automatiquement le contenu de votre lettre de motivation. Remplissez d'abord les informations ci-dessus puis complétez votre profil ci-dessous.
            </p>

            {/* Profil utilisateur */}
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 flex items-center">
                <FaCog className="mr-2" />
                Votre profil
              </h3>

              <div className="mb-3">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Nom complet
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Jean Dupont"
                  value={userProfile.name}
                  onChange={handleUserProfileChange}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm"
                />
              </div>

              <div className="mb-3">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Expérience professionnelle
                </label>
                <textarea
                  name="experience"
                  placeholder="Ex: 5 ans d'expérience en développement web, spécialisé en React"
                  value={userProfile.experience}
                  onChange={handleUserProfileChange}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm h-20 resize-y"
                />
              </div>

              <div className="mb-3">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Compétences clés (séparées par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="Ex: React, TypeScript, CSS, gestion de projet agile"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm"
                />
              </div>

              <div className="mb-3">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Formation
                </label>
                <input
                  name="education"
                  type="text"
                  placeholder="Ex: Master en informatique, École d'ingénieur"
                  value={userProfile.education}
                  onChange={handleUserProfileChange}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm"
                />
              </div>

              <div className="mb-3">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Réalisations principales (séparées par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Développement d'une app mobile, Management d'équipe de 5 personnes"
                  value={achievementsInput}
                  onChange={(e) => setAchievementsInput(e.target.value)}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm"
                />
              </div>
            </div>

            {/* Description du poste */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Description du poste (optionnel)
              </label>
              <textarea
                name="jobDescription"
                value={aiSettings.jobDescription}
                onChange={handleAiSettingsChange}
                placeholder="Collez ici la description du poste pour une lettre plus personnalisée"
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-y text-sm"
              />
            </div>

            {/* Paramètres IA */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Ton de la lettre
                </label>
                <select
                  name="tone"
                  value={aiSettings.tone}
                  onChange={handleAiSettingsChange}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm"
                >
                  <option value="professional">Professionnel</option>
                  <option value="casual">Décontracté</option>
                  <option value="enthusiastic">Enthousiaste</option>
                  <option value="formal">Formel</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Langue
                </label>
                <select
                  name="language"
                  value={aiSettings.language}
                  onChange={handleAiSettingsChange}
                  className="py-2 px-3 w-full rounded-md border border-gray-300 text-sm"
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </div>
            </div>

            {/* Instructions personnalisées */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Instructions spécifiques pour l'IA (optionnel)
              </label>
              <textarea
                name="customPrompt"
                value={aiSettings.customPrompt}
                onChange={handleAiSettingsChange}
                placeholder="Instructions spécifiques pour personnaliser davantage la génération"
                className="py-2 px-3 w-full rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[60px] resize-y text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Exemple : "Mets l'accent sur l'innovation", "Mentionne ma passion pour le développement durable"
              </p>
            </div>

            {/* Options de sauvegarde */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="saveAsLetter"
                  checked={aiSettings.saveAsLetter}
                  onChange={handleAiSettingsChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Sauvegarder automatiquement comme nouvelle lettre
                </span>
              </label>
            </div>

            <Button
              variant="primary"
              size="md"
              leftIcon={isGenerating ? <FaSpinner className="animate-spin" /> : <FaRobot />}
              onClick={generateAIContent}
              disabled={isGenerating || !formData.jobTitle?.trim() || !formData.company?.trim()}
              className="w-full"
            >
              {isGenerating ? 'Génération en cours...' : 'Générer avec l\'IA'}
            </Button>

            {isGenerating && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center text-sm text-blue-600">
                  <FaSpinner className="animate-spin mr-2" />
                  Génération de votre lettre personnalisée...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Letter Content */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Contenu de la lettre
              </h2>
              {formData.content && (
                <div className="text-sm text-gray-500">
                  {formData.content.length} caractères
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <label
                htmlFor="content"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Corps de la lettre *
              </label>
              <textarea
                id="content"
                name="content"
                placeholder="Saisissez le contenu de votre lettre ici ou utilisez la génération IA pour commencer..."
                value={formData.content}
                onChange={handleInputChange}
                className="py-3 px-4 rounded-md border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[500px] flex-1 resize-y font-mono text-sm leading-relaxed"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' }}
              />
              
              <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                <span>
                  Conseil : Une lettre efficace fait généralement 300-400 mots
                </span>
                {formData.content && (
                  <span>
                    ~{Math.round(formData.content.split(' ').length)} mots
                  </span>
                )}
              </div>
            </div>

            {/* Boutons d'action rapide */}
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const templates = [
                    "Madame, Monsieur,\n\n",
                    "\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n" + (userProfile.name || user?.displayName || '[Votre nom]')
                  ];
                  setFormData(prev => ({
                    ...prev,
                    content: prev.content + templates[Math.floor(Math.random() * templates.length)]
                  }));
                }}
                className="text-xs"
              >
                + Formule
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const suggestions = [
                    `Mon expérience de ${userProfile.experience || '[votre expérience]'} m'a permis de développer...`,
                    `Mes compétences en ${userProfile.skills?.join(', ') || '[vos compétences]'} sont parfaitement adaptées...`,
                    `Particulièrement intéressé(e) par ${formData.company}, je souhaite...`,
                    `Ma formation en ${userProfile.education || '[votre formation]'} m'a donné les bases pour...`
                  ];
                  const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                  const cursorPos = (document.getElementById('content') as HTMLTextAreaElement)?.selectionStart || formData.content.length;
                  const newContent = formData.content.slice(0, cursorPos) + randomSuggestion + formData.content.slice(cursorPos);
                  setFormData(prev => ({ ...prev, content: newContent }));
                }}
                className="text-xs"
              >
                + Suggestion
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(prev => ({ ...prev, content: '' }));
                }}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                Effacer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conseils d'écriture */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
          <FaLightbulb className="mr-2" />
          Conseils pour une lettre efficace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <ul className="space-y-1">
            <li>• Personnalisez pour l'entreprise et le poste</li>
            <li>• Mettez en avant vos réalisations concrètes</li>
            <li>• Utilisez des mots-clés de l'offre d'emploi</li>
          </ul>
          <ul className="space-y-1">
            <li>• Restez concis (1 page maximum)</li>
            <li>• Relisez attentivement avant d'envoyer</li>
            <li>• Adaptez le ton à la culture d'entreprise</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LetterEditorPage;