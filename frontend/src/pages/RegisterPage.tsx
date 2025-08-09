import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaGoogle, FaGithub, FaEye, FaEyeSlash, FaRocket, FaShieldAlt, FaCheck, FaCrown } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../store/toast.store';
import { LazySection } from '../components/performance/LazySection';
import { analytics } from '../utils/analytics';
import MetaTags from '../components/SEO/MetaTags';
import { debounce } from '../utils/performance';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'free';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isFormTouched, setIsFormTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const { 
    register, 
    loginWithGoogle, 
    loginWithGithub, 
    isLoading, 
    error, 
    clearError, 
    isAuthenticated 
  } = useAuthStore();

  // Analytics tracking
  useEffect(() => {
    analytics.pageView('/register');
    analytics.track({
      action: 'register_page_visited',
      category: 'auth',
      label: selectedPlan || 'free'
    });
  }, [selectedPlan]);

  // Redirection si authentifié
  useEffect(() => {
    if (isAuthenticated) {
      const destination = selectedPlan ? `/dashboard/subscription?plan=${selectedPlan}` : '/dashboard';
      navigate(destination, { replace: true });
      toast.success('Compte créé !', 'Bienvenue dans votre espace !');
    }
  }, [isAuthenticated, navigate, selectedPlan, toast]);

  // Calcul de la force du mot de passe
  const calculatePasswordStrength = useCallback((password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, []);

  // Validation en temps réel avec debounce
  const debouncedValidation = useMemo(
    () => debounce((formData: RegisterFormData) => {
      if (!isFormTouched) return;
      
      const errors: Record<string, string> = {};
      
      if (formData.name && formData.name.trim().length < 2) {
        errors.name = 'Le nom doit contenir au moins 2 caractères';
      }
      
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Format d\'email invalide';
      }
      
      if (formData.password) {
        if (formData.password.length < 6) {
          errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
        }
        setPasswordStrength(calculatePasswordStrength(formData.password));
      }
      
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
      
      setValidationErrors(errors);
    }, 300),
    [isFormTouched, calculatePasswordStrength] // Dépendances importantes
  );


  useEffect(() => {
    debouncedValidation(formData);
  }, [formData, debouncedValidation]);

  const validateFields = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!formData.email) {
      errors.email = 'L\'adresse email est requise';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!acceptTerms) {
      errors.terms = 'Vous devez accepter les conditions d\'utilisation';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsFormTouched(true);
    
    if (!validateFields()) {
      analytics.track({
        action: 'register_form_validation_failed',
        category: 'auth'
      });
      return;
    }
    
    try {
      analytics.track({
        action: 'register_attempt',
        category: 'auth',
        label: 'email_password'
      });
      
      await register(formData.email, formData.password, formData.name.trim(), selectedPlan);
      
      analytics.track({
        action: 'register_success',
        category: 'auth',
        label: 'email_password'
      });
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      analytics.track({
        action: 'register_failed',
        category: 'auth',
        label: 'email_password'
      });
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'github') => {
    clearError();
    setValidationErrors({});
    
    try {
      analytics.track({
        action: 'register_attempt',
        category: 'auth',
        label: provider
      });
      
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithGithub();
      }
      
      analytics.track({
        action: 'register_success',
        category: 'auth',
        label: provider
      });
    } catch (error) {
      console.error(`Erreur d'inscription ${provider}:`, error);
      analytics.track({
        action: 'register_failed',
        category: 'auth',
        label: provider
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setIsFormTouched(true);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (error) {
      clearError();
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

  return (
    <>
      <MetaTags 
        title="Créer un compte - Motivation Letter AI"
        description="Créez votre compte gratuit pour accéder à nos outils de création de lettres de motivation avec IA."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-emerald-50 to-amber-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl float-animation" style={{animationDelay: '2s'}}></div>
        
        <LazySection animationType="slideUp">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <Link to="/" className="flex justify-center group mb-8">
              <div className="relative">
                <div className="p-4 bg-white rounded-2xl shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105 card-hover-premium">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      ML
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-xs font-bold text-black">AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Rejoignez +10k utilisateurs
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                Créez votre compte gratuitement
              </p>
              {selectedPlan && (
                <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-emerald-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <FaCrown className="mr-2" />
                  Plan {selectedPlan} sélectionné
                </div>
              )}
              <p className="text-sm text-gray-500">
                Accès immédiat à tous nos outils IA
              </p>
            </div>
          </div>
        </LazySection>

        <LazySection animationType="slideUp" className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/80 backdrop-blur-sm py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
            {/* Message d'erreur global */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-count">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FaShieldAlt className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearError}
                    className="ml-4 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Nom */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom complet
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUser className={`h-5 w-5 transition-colors ${
                      validationErrors.name ? 'text-red-400' : 
                      formData.name ? 'text-purple-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`block w-full pl-12 pr-4 py-3 border rounded-xl text-sm transition-all duration-300 ${
                      validationErrors.name 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : formData.name 
                          ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500 bg-purple-50/50'
                          : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500 bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder-gray-400`}
                    placeholder="Votre nom complet"
                    disabled={isLoading}
                  />
                  {formData.name && !validationErrors.name && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </div>
                {validationErrors.name && (
                  <p className="mt-2 text-sm text-red-600 animate-count">{validationErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaEnvelope className={`h-5 w-5 transition-colors ${
                      validationErrors.email ? 'text-red-400' : 
                      formData.email ? 'text-emerald-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`block w-full pl-12 pr-4 py-3 border rounded-xl text-sm transition-all duration-300 ${
                      validationErrors.email 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : formData.email 
                          ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50'
                          : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder-gray-400`}
                    placeholder="votre@email.com"
                    disabled={isLoading}
                  />
                  {formData.email && !validationErrors.email && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </div>
                {validationErrors.email && (
                  <p className="mt-2 text-sm text-red-600 animate-count">{validationErrors.email}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className={`h-5 w-5 transition-colors ${
                      validationErrors.password ? 'text-red-400' : 
                      formData.password ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`block w-full pl-12 pr-12 py-3 border rounded-xl text-sm transition-all duration-300 ${
                      validationErrors.password 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : formData.password 
                          ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder-gray-400`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Force du mot de passe</span>
                      <span className={`font-medium ${
                        passwordStrength <= 1 ? 'text-red-600' :
                        passwordStrength <= 2 ? 'text-yellow-600' :
                        passwordStrength <= 3 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {validationErrors.password && (
                  <p className="mt-2 text-sm text-red-600 animate-count">{validationErrors.password}</p>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className={`h-5 w-5 transition-colors ${
                      validationErrors.confirmPassword ? 'text-red-400' : 
                      formData.confirmPassword ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`block w-full pl-12 pr-12 py-3 border rounded-xl text-sm transition-all duration-300 ${
                      validationErrors.confirmPassword 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : formData.confirmPassword 
                          ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder-gray-400`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <FaCheck className="mr-1 h-3 w-3" />
                    Les mots de passe correspondent
                  </div>
                )}
                {validationErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 animate-count">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Conditions d'utilisation */}
              <div>
                <div className="flex items-start">
                  <input
                    id="accept-terms"
                    name="accept-terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    disabled={isLoading}
                  />
                  <label htmlFor="accept-terms" className="ml-3 block text-sm text-gray-700 leading-relaxed">
                    J'accepte les{' '}
                    <Link to="/terms" className="text-blue-600 hover:text-blue-800 font-medium">
                      conditions d'utilisation
                    </Link>{' '}
                    et la{' '}
                    <Link to="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">
                      politique de confidentialité
                    </Link>
                  </label>
                </div>
                {validationErrors.terms && (
                  <p className="mt-2 text-sm text-red-600 animate-count">{validationErrors.terms}</p>
                )}
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 transform hover:scale-[1.02] btn-premium ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Création du compte...
                    </>
                  ) : (
                    <>
                      <FaRocket className="mr-2" />
                      Créer mon compte gratuitement
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Social registration */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">
                    Ou s'inscrire avec
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSocialRegister('google')}
                  className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md card-hover-premium"
                  disabled={isLoading}
                >
                  <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialRegister('github')}
                  className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md card-hover-premium"
                  disabled={isLoading}
                >
                  <FaGithub className="h-5 w-5 text-gray-800 mr-2" />
                  GitHub
                </button>
              </div>
            </div>

            {/* Login link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Vous avez déjà un compte ?{' '}
                <Link 
                  to="/login" 
                  className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Se connecter
                </Link>
              </p>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
              <div className="flex items-center">
                <FaShieldAlt className="mr-1" />
                <span>Données sécurisées</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span>Gratuit à vie</span>
              </div>
              <div className="flex items-center">
                <FaRocket className="mr-1" />
                <span>Accès immédiat</span>
              </div>
            </div>
          </div>
        </LazySection>
      </div>
    </>
  );
};

export default RegisterPage;