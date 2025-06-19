// LoginPage.tsx - Version Premium
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaGoogle, FaGithub, FaEye, FaEyeSlash, FaRocket, FaShieldAlt } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../store/toast.store';
import { LazySection } from '../components/performance/LazySection';
import { analytics } from '../utils/analytics';
import MetaTags from '../components/SEO/MetaTags';
import { debounce } from '../utils/performance';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});
  const [isFormTouched, setIsFormTouched] = useState(false);
  
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  
  const { 
    login, 
    loginWithGoogle, 
    loginWithGithub, 
    isLoading, 
    error, 
    clearError, 
    isAuthenticated 
  } = useAuthStore();

  // Analytics tracking
  useEffect(() => {
    analytics.pageView('/login');
    analytics.track({
      action: 'login_page_visited',
      category: 'auth'
    });
  }, []);

  // Redirection si authentifié
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
      toast.success('Connexion réussie', 'Bienvenue dans votre espace !');
    }
  }, [isAuthenticated, navigate, from, toast]);

  // Validation en temps réel avec debounce
  const debouncedValidation = useCallback(
    debounce((email: string, password: string) => {
      if (!isFormTouched) return;
      
      const errors: {email?: string; password?: string} = {};
      
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Format d\'email invalide';
      }
      
      if (password && password.length < 6) {
        errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      }
      
      setValidationErrors(errors);
    }, 300),
    [isFormTouched]
  );

  useEffect(() => {
    debouncedValidation(email, password);
  }, [email, password, debouncedValidation]);

  const validateFields = () => {
    const errors: {email?: string; password?: string} = {};
    
    if (!email) {
      errors.email = 'L\'adresse email est requise';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    if (!password) {
      errors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
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
        action: 'login_form_validation_failed',
        category: 'auth'
      });
      return;
    }
    
    try {
      analytics.track({
        action: 'login_attempt',
        category: 'auth',
        label: 'email_password'
      });
      
      await login(email, password);
      
      analytics.track({
        action: 'login_success',
        category: 'auth',
        label: 'email_password'
      });
    } catch (error) {
      console.error('Erreur de connexion:', error);
      analytics.track({
        action: 'login_failed',
        category: 'auth',
        label: 'email_password'
      });
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    clearError();
    setValidationErrors({});
    
    try {
      analytics.track({
        action: 'login_attempt',
        category: 'auth',
        label: provider
      });
      
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithGithub();
      }
      
      analytics.track({
        action: 'login_success',
        category: 'auth',
        label: provider
      });
    } catch (error) {
      console.error(`Erreur de connexion ${provider}:`, error);
      analytics.track({
        action: 'login_failed',
        category: 'auth',
        label: provider
      });
    }
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    setIsFormTouched(true);
    
    if (field === 'email') {
      setEmail(value);
      if (validationErrors.email) {
        setValidationErrors(prev => ({...prev, email: undefined}));
      }
    } else {
      setPassword(value);
      if (validationErrors.password) {
        setValidationErrors(prev => ({...prev, password: undefined}));
      }
    }
    
    if (error) {
      clearError();
    }
  };

  return (
    <>
      <MetaTags 
        title="Connexion - Motivation Letter AI"
        description="Connectez-vous à votre compte pour accéder à vos lettres de motivation et créer de nouveaux documents."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl float-animation" style={{animationDelay: '2s'}}></div>
        
        <LazySection animationType="slideUp">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <Link to="/" className="flex justify-center group mb-8">
              <div className="relative">
                <div className="p-4 bg-white rounded-2xl shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105 card-hover-premium">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      ML
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-xs font-bold text-black">AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Bon retour parmi nous !
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                Connectez-vous à votre compte
              </p>
              <p className="text-sm text-gray-500">
                Accédez à vos lettres de motivation et créez-en de nouvelles
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
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaEnvelope className={`h-5 w-5 transition-colors ${
                      validationErrors.email ? 'text-red-400' : 
                      email ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`block w-full pl-12 pr-4 py-3 border rounded-xl text-sm transition-all duration-300 ${
                      validationErrors.email 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : email 
                          ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder-gray-400`}
                    placeholder="votre@email.com"
                    disabled={isLoading}
                  />
                  {email && !validationErrors.email && (
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
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Mot de passe
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className={`h-5 w-5 transition-colors ${
                      validationErrors.password ? 'text-red-400' : 
                      password ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`block w-full pl-12 pr-12 py-3 border rounded-xl text-sm transition-all duration-300 ${
                      validationErrors.password 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : password 
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
                {validationErrors.password && (
                  <p className="mt-2 text-sm text-red-600 animate-count">{validationErrors.password}</p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700">
                    Se souvenir de moi
                  </label>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Connexion sécurisée 🔒</span>
                </div>
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-[1.02] btn-premium ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <FaRocket className="mr-2" />
                      Se connecter
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Social login */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">
                    Ou continuer avec
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md card-hover-premium"
                  disabled={isLoading}
                >
                  <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md card-hover-premium"
                  disabled={isLoading}
                >
                  <FaGithub className="h-5 w-5 text-gray-800 mr-2" />
                  GitHub
                </button>
              </div>
            </div>

            {/* Sign up link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Vous n'avez pas de compte ?{' '}
                <Link 
                  to="/register" 
                  className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Créer un compte gratuitement
                </Link>
              </p>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
              <div className="flex items-center">
                <FaShieldAlt className="mr-1" />
                <span>Sécurisé</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span>+10k utilisateurs</span>
              </div>
            </div>
          </div>
        </LazySection>
      </div>
    </>
  );
};

export default LoginPage;