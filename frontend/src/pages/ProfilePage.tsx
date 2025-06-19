import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUser, 
  FaSave, 
  FaCamera, 
  FaKey, 
  FaTrash, 
  FaFileAlt,
  FaCreditCard,
  FaCheck,
  FaShieldAlt,
  FaExclamationTriangle,
  FaTimes,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGlobe
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../store/toast.store';
import { LazySection } from '../components/performance/LazySection';
import { analytics } from '../utils/analytics';
import MetaTags from '../components/SEO/MetaTags';
import { debounce } from '../utils/performance';
import api from '../services/api';
import { OptimizedImage } from '../components/layout/OptimizedImage';

interface UserData {
  name: string;
  email: string;
  avatar: string;
  phoneNumber: string;
  jobTitle: string;
  industry: string;
  location: string;
  website: string;
  bio: string;
  isEmailVerified: boolean;
  memberSince: string;
  profileViews: number;
  completionRate: number;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  
  // État pour les données utilisateur
  const [userData, setUserData] = useState<UserData>({
    name: user?.displayName || 'Utilisateur',
    email: user?.email || '',
    avatar: user?.photoURL || '',
    phoneNumber: '',
    jobTitle: '',
    industry: 'Informatique / Technologie',
    location: '',
    website: '',
    bio: '',
    isEmailVerified: user?.isEmailVerified || false,
    // @ts-ignore
    memberSince: user?.metadata?.creationTime || new Date().toISOString(),
    profileViews: 0,
    completionRate: 0
  });

  // État pour la modification du profil
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserData>({ ...userData });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // État pour la modification du mot de passe
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // État pour la suppression du compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStep, setDeleteStep] = useState(1);

  // Analytics tracking
  useEffect(() => {
    analytics.pageView('/profile');
    analytics.track({
      action: 'profile_page_visited',
      category: 'user_management'
    });
  }, []);

  // Charger les données utilisateur au montage
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Validation en temps réel avec debounce
  const debouncedValidation = useCallback(
    debounce((data: UserData) => {
      const errors: Record<string, string> = {};
      
      if (data.name && data.name.trim().length < 2) {
        errors.name = 'Le nom doit contenir au moins 2 caractères';
      }
      
      if (data.phoneNumber && !/^[\d\s\+\-\(\)]{10,}$/.test(data.phoneNumber.replace(/\s/g, ''))) {
        errors.phoneNumber = 'Numéro de téléphone invalide';
      }
      
      if (data.website && !/^https?:\/\/.+\..+/.test(data.website)) {
        errors.website = 'URL du site web invalide';
      }
      
      setValidationErrors(errors);
    }, 300),
    []
  );

  useEffect(() => {
    if (isEditing) {
      debouncedValidation(formData);
    }
  }, [formData, isEditing, debouncedValidation]);

  // Calcul de la force du mot de passe
  const calculatePasswordStrength = useCallback((password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, []);

  useEffect(() => {
    if (passwordData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(passwordData.newPassword));
    }
  }, [passwordData.newPassword, calculatePasswordStrength]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      const profileData = response.data;
      
      const updatedUserData = {
        name: profileData.displayName || user?.displayName || 'Utilisateur',
        email: profileData.email || user?.email || '',
        avatar: profileData.photoURL || user?.photoURL || '',
        phoneNumber: profileData.phoneNumber || '',
        jobTitle: profileData.jobTitle || '',
        industry: profileData.industry || 'Informatique / Technologie',
        location: profileData.location || '',
        website: profileData.website || '',
        bio: profileData.bio || '',
        isEmailVerified: profileData.isEmailVerified || user?.isEmailVerified || false,
        // @ts-ignore
        memberSince: profileData.memberSince || user?.metadata?.creationTime || new Date().toISOString(),
        profileViews: profileData.profileViews || Math.floor(Math.random() * 50) + 10,
        completionRate: calculateProfileCompletion(profileData)
      };
      
      setUserData(updatedUserData);
      setFormData(updatedUserData);
    } catch (err: any) {
      console.error('Erreur lors du chargement du profil:', err);
      toast.error('Erreur', 'Impossible de charger les données du profil');
    }
  };

  const calculateProfileCompletion = (data: any) => {
    const fields = ['displayName', 'email', 'phoneNumber', 'jobTitle', 'industry', 'location', 'bio'];
    const completed = fields.filter(field => data[field] && data[field].trim()).length;
    return Math.round((completed / fields.length) * 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur de validation du champ modifié
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du fichier
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Erreur', 'La taille du fichier ne doit pas dépasser 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Erreur', 'Veuillez sélectionner une image valide');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const newAvatarUrl = response.data.avatarUrl;
      setUserData(prev => ({ ...prev, avatar: newAvatarUrl }));
      setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));
      
      toast.success('Succès', 'Photo de profil mise à jour');
      
      analytics.track({
        action: 'avatar_uploaded',
        category: 'user_management'
      });
    } catch (err: any) {
      console.error('Erreur lors de l\'upload:', err);
      toast.error('Erreur', 'Impossible de mettre à jour la photo de profil');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setFormData({ ...userData });
      setValidationErrors({});
    }
    setIsEditing(!isEditing);
    
    analytics.track({
      action: isEditing ? 'profile_edit_cancelled' : 'profile_edit_started',
      category: 'user_management'
    });
  };

  const handleSaveProfile = async () => {
    // Validation finale
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Erreur', 'Veuillez corriger les erreurs avant de sauvegarder');
      return;
    }

    setIsSaving(true);
    
    try {
      await api.put('/users/profile', {
        displayName: formData.name,
        phoneNumber: formData.phoneNumber,
        jobTitle: formData.jobTitle,
        industry: formData.industry,
        location: formData.location,
        website: formData.website,
        bio: formData.bio
      });
      
      // Mise à jour des données utilisateur
      const updatedData = { ...formData, completionRate: calculateProfileCompletion(formData) };
      setUserData(updatedData);
      
      toast.success('Succès', 'Profil mis à jour avec succès');
      setIsEditing(false);
      
      analytics.track({
        action: 'profile_updated',
        category: 'user_management'
      });
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde du profil:', err);
      toast.error('Erreur', err.response?.data?.message || 'Erreur lors de la sauvegarde du profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation basique
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await api.post('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Succès', 'Mot de passe modifié avec succès');
      setShowPasswordForm(false);
      
      analytics.track({
        action: 'password_changed',
        category: 'security'
      });
    } catch (err: any) {
      console.error('Erreur lors du changement de mot de passe:', err);
      toast.error('Erreur', err.response?.data?.message || 'Échec de la modification du mot de passe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'supprimer mon compte') {
      return;
    }
    
    setIsSaving(true);
    
    try {
      await api.delete('/users/account');
      
      analytics.track({
        action: 'account_deleted',
        category: 'user_management'
      });
      
      toast.success('Compte supprimé', 'Redirection en cours...');
      
      // Redirection vers la page d'accueil
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      console.error('Erreur lors de la suppression du compte:', err);
      toast.error('Erreur', err.response?.data?.message || 'Erreur lors de la suppression du compte');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      await api.post('/users/send-verification-email');
      toast.success('Succès', 'Email de vérification envoyé');
      
      analytics.track({
        action: 'verification_email_sent',
        category: 'user_management'
      });
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', err);
      toast.error('Erreur', 'Impossible d\'envoyer l\'email de vérification');
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-yellow-500';
    if (passwordStrength <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Faible';
    if (passwordStrength <= 2) return 'Moyen';
    if (passwordStrength <= 3) return 'Fort';
    return 'Très fort';
  };

  const formatMemberSince = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <>
      <MetaTags 
        title="Mon Profil - Motivation Letter AI"
        description="Gérez votre profil utilisateur, vos informations personnelles et vos préférences de compte."
      />

      <DashboardLayout>
        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <LazySection animationType="scale">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaExclamationTriangle className="text-red-600 text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Supprimer votre compte ?
                  </h3>
                  <p className="text-gray-600">
                    Cette action est <strong>irréversible</strong> et entraînera la suppression définitive de toutes vos données.
                  </p>
                </div>

                {deleteStep === 1 && (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">Vous perdrez :</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Toutes vos lettres de motivation</li>
                        <li>• Votre historique et statistiques</li>
                        <li>• Vos modèles personnalisés</li>
                        <li>• Votre abonnement premium</li>
                      </ul>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setDeleteStep(2)}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        Continuer
                      </Button>
                    </div>
                  </div>
                )}

                {deleteStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tapez "supprimer mon compte" pour confirmer
                      </label>
                      <input
                        type="text"
                        placeholder="supprimer mon compte"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => {
                          setDeleteStep(1);
                          setDeleteConfirmText('');
                        }}
                        className="flex-1"
                      >
                        Retour
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleDeleteAccount}
                        loading={isSaving}
                        disabled={deleteConfirmText !== 'supprimer mon compte'}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        Supprimer définitivement
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </LazySection>
          </div>
        )}

        {/* Header */}
        <LazySection animationType="slideUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Mon profil
              </h1>
              <p className="text-lg text-gray-600">
                Gérez vos informations personnelles et vos préférences
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <FaCalendarAlt className="mr-2" />
                Membre depuis {formatMemberSince(userData.memberSince)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Profile completion indicator */}
              <div className="hidden sm:flex items-center bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">{userData.completionRate}%</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Profil complété</div>
                  <div className="text-xs text-gray-500">Optimisez votre visibilité</div>
                </div>
              </div>
              
              {/* Action buttons */}
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleEditToggle}
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<FaSave />}
                    onClick={handleSaveProfile}
                    loading={isSaving}
                    className="btn-premium"
                  >
                    Enregistrer
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<FaEdit />}
                  onClick={handleEditToggle}
                  className="btn-premium"
                >
                  Modifier le profil
                </Button>
              )}
            </div>
          </div>
        </LazySection>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Avatar and Quick Info */}
          <LazySection animationType="slideLeft" className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              {/* Avatar Section */}
              <div className="text-center mb-6">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  {userData.avatar ? (
                    <OptimizedImage
                      src={userData.avatar}
                      alt="Avatar"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-gray-100 shadow-lg flex items-center justify-center">
                      <FaUser className="text-4xl text-gray-400" />
                    </div>
                  )}
                  
                  {isEditing && (
                    <label className="absolute right-0 bottom-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 card-hover-premium">
                      {isUploading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <FaCamera />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {userData.name}
                </h2>
                <p className="text-gray-600 mb-2">
                  {userData.jobTitle || 'Utilisateur'}
                </p>
                {userData.location && (
                  <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                    <FaMapMarkerAlt className="mr-1" />
                    {userData.location}
                  </div>
                )}

                {/* Verification Badge */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  userData.isEmailVerified 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {userData.isEmailVerified ? (
                    <>
                      <FaCheck className="mr-2" />
                      Email vérifié
                    </>
                  ) : (
                    <>
                      <FaExclamationTriangle className="mr-2" />
                      Email non vérifié
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userData.profileViews}</div>
                  <div className="text-xs text-gray-600">Vues du profil</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{userData.completionRate}%</div>
                  <div className="text-xs text-gray-600">Complétion</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <Link
                  to="/dashboard/subscription"
                  className="flex items-center justify-center py-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl text-yellow-700 font-medium hover:from-yellow-100 hover:to-orange-100 transition-all duration-300 border border-yellow-200 card-hover-premium"
                >
                  <FaCreditCard className="mr-2" />
                  Gérer mon abonnement
                </Link>
                <Link
                  to="/dashboard/letters"
                  className="flex items-center justify-center py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-blue-700 font-medium hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200 card-hover-premium"
                >
                  <FaFileAlt className="mr-2" />
                  Mes lettres
                </Link>
                {!showPasswordForm && (
                  <button
                    className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl text-purple-700 font-medium hover:from-purple-100 hover:to-pink-100 transition-all duration-300 border border-purple-200 card-hover-premium"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    <FaKey className="mr-2" />
                    Changer de mot de passe
                  </button>
                )}
              </div>
            </div>
          </LazySection>

          {/* Right Column - Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Password Change Form */}
            {showPasswordForm && (
              <LazySection animationType="slideUp">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Changer de mot de passe
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Assurez-vous d'utiliser un mot de passe fort et unique
                      </p>
                    </div>
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mot de passe actuel
                      </label>
                      <div className="relative">
                        <input
                          name="currentPassword"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordInputChange}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Mot de passe actuel"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    
                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          name="newPassword"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={handlePasswordInputChange}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      
                      {/* Password strength indicator */}
                      {passwordData.newPassword && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Force du mot de passe</span>
                            <span className={`font-medium ${
                              passwordStrength <= 1 ? 'text-red-600' :
                              passwordStrength <= 2 ? 'text-yellow-600' :
                              passwordStrength <= 3 ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {getPasswordStrengthText()}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                              style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Utilisez au moins 8 caractères avec des majuscules, chiffres et symboles
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirmer le nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          name="confirmPassword"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordInputChange}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Confirmer le mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                        <div className="mt-2 flex items-center text-sm text-green-600">
                          <FaCheck className="mr-1 h-3 w-3" />
                          Les mots de passe correspondent
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleChangePassword}
                      loading={isSaving}
                      className="w-full btn-premium"
                      leftIcon={<FaKey />}
                    >
                      Modifier le mot de passe
                    </Button>
                  </div>
                </div>
              </LazySection>
            )}

            {/* Profile Information */}
            <LazySection animationType="slideUp">
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Informations personnelles
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Ces informations vous aident à créer des lettres plus personnalisées
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Progression</div>
                    <div className="text-lg font-bold text-blue-600">{userData.completionRate}%</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom complet *
                    </label>
                    {isEditing ? (
                      <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                          validationErrors.name
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } focus:ring-2`}
                        placeholder="Votre nom complet"
                      />
                    ) : (
                      <div className="py-3 text-gray-900 font-medium">
                        {userData.name}
                      </div>
                    )}
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Adresse email
                    </label>
                    <div className="flex items-center py-3">
                      <span className="text-gray-900 font-medium flex-1">{userData.email}</span>
                      {!userData.isEmailVerified && (
                        <button
                          className="ml-3 px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors font-medium"
                          onClick={handleSendVerificationEmail}
                        >
                          Vérifier
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Numéro de téléphone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Numéro de téléphone
                    </label>
                    {isEditing ? (
                      <input
                        name="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                          validationErrors.phoneNumber
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } focus:ring-2`}
                        placeholder="06 12 34 56 78"
                      />
                    ) : (
                      <div className="py-3 text-gray-900">
                        {userData.phoneNumber || <span className="text-gray-400 italic">Non renseigné</span>}
                      </div>
                    )}
                    {validationErrors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
                    )}
                  </div>
                  
                  {/* Intitulé de poste */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Intitulé de poste
                    </label>
                    {isEditing ? (
                      <input
                        name="jobTitle"
                        type="text"
                        value={formData.jobTitle}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Ex: Développeur Frontend"
                      />
                    ) : (
                      <div className="py-3 text-gray-900">
                        {userData.jobTitle || <span className="text-gray-400 italic">Non renseigné</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Localisation */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Localisation
                    </label>
                    {isEditing ? (
                      <input
                        name="location"
                        type="text"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Paris, France"
                      />
                    ) : (
                      <div className="py-3 text-gray-900">
                        {userData.location || <span className="text-gray-400 italic">Non renseigné</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Site web */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Site web / Portfolio
                    </label>
                    {isEditing ? (
                      <input
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                          validationErrors.website
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } focus:ring-2`}
                        placeholder="https://monsite.com"
                      />
                    ) : (
                      <div className="py-3">
                        {userData.website ? (
                          <a 
                            href={userData.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <FaGlobe className="mr-1" />
                            {userData.website}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Non renseigné</span>
                        )}
                      </div>
                    )}
                    {validationErrors.website && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.website}</p>
                    )}
                  </div>
                  
                  {/* Secteur d'activité */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Secteur d'activité
                    </label>
                    {isEditing ? (
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="Informatique / Technologie">Informatique / Technologie</option>
                        <option value="Finance / Banque">Finance / Banque</option>
                        <option value="Santé / Médical">Santé / Médical</option>
                        <option value="Education / Formation">Education / Formation</option>
                        <option value="Marketing / Communication">Marketing / Communication</option>
                        <option value="Commerce / Vente">Commerce / Vente</option>
                        <option value="Industrie / Production">Industrie / Production</option>
                        <option value="Ingénierie">Ingénierie</option>
                        <option value="Juridique">Juridique</option>
                        <option value="Ressources Humaines">Ressources Humaines</option>
                        <option value="Arts / Design">Arts / Design</option>
                        <option value="Transport / Logistique">Transport / Logistique</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Média / Journalisme">Média / Journalisme</option>
                        <option value="Autre">Autre</option>
                      </select>
                    ) : (
                      <div className="py-3 text-gray-900">
                        {userData.industry}
                      </div>
                    )}
                  </div>
                  
                  {/* Bio / Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bio / Description professionnelle
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        placeholder="Décrivez votre parcours professionnel et vos objectifs..."
                      />
                    ) : (
                      <div className="py-3 text-gray-900">
                        {userData.bio ? (
                          <p className="whitespace-pre-wrap">{userData.bio}</p>
                        ) : (
                          <span className="text-gray-400 italic">Non renseigné</span>
                        )}
                      </div>
                    )}
                    {isEditing && (
                      <p className="mt-1 text-xs text-gray-500">
                        Cette description peut être utilisée pour personnaliser vos lettres de motivation
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </LazySection>

            {/* Security & Danger Zone */}
            {isEditing && (
              <LazySection animationType="slideUp">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl shadow-sm p-6 border border-red-200">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                      <FaShieldAlt className="text-red-600 text-xl" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-red-600">
                        Zone de danger
                      </h2>
                      <p className="text-sm text-red-600/80">
                        Actions irréversibles sur votre compte
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white/50 rounded-xl p-4 mb-4">
                    <h3 className="font-semibold text-red-800 mb-2">Suppression du compte</h3>
                    <p className="text-sm text-red-700 mb-4">
                      La suppression de votre compte est irréversible et entraînera la perte de toutes vos données : 
                      lettres de motivation, historique, statistiques et paramètres personnalisés.
                    </p>
                    
                    <div className="bg-red-100 rounded-lg p-3 mb-4">
                      <h4 className="font-medium text-red-800 mb-2">⚠️ Vous perdrez :</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Toutes vos lettres de motivation sauvegardées</li>
                        <li>• Votre historique et vos statistiques d'utilisation</li>
                        <li>• Vos modèles et templates personnalisés</li>
                        <li>• Votre abonnement premium actuel</li>
                        <li>• Toutes vos préférences et paramètres</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<FaTrash />}
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setDeleteStep(1);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                  >
                    Supprimer mon compte définitivement
                  </Button>
                </div>
              </LazySection>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default ProfilePage;