import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { LazySection } from '../components/performance/LazySection';
import { analytics } from '../utils/analytics';
import MetaTags from '../components/SEO/MetaTags';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);

  // Analytics tracking
  React.useEffect(() => {
    analytics.pageView('/forgot-password');
    analytics.track({
      action: 'forgot_password_page_visited',
      category: 'auth'
    });
  }, []);

  const validateEmail = (email: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setIsEmailValid(isValid);
    return isValid;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setError(null);
    validateEmail(value);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!email) {
      setError('Veuillez entrer votre adresse email.');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Veuillez entrer une adresse email valide.');
      return;
    }
    
    setIsLoading(true);

    try {
      analytics.track({
        action: 'password_reset_attempt',
        category: 'auth'
      });

      // Simulation de réinitialisation - à remplacer par Firebase
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Instructions de réinitialisation envoyées à ${email}. Veuillez vérifier votre boîte de réception et vos spams.`);
      
      analytics.track({
        action: 'password_reset_success',
        category: 'auth'
      });
    } catch (error) {
      console.log('Échec de l\'envoi des instructions. Veuillez vérifier votre adresse email et réessayer.',error)
      setError('Échec de l\'envoi des instructions. Veuillez vérifier votre adresse email et réessayer.');
      analytics.track({
        action: 'password_reset_failed',
        category: 'auth'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <MetaTags 
        title="Mot de passe oublié - Motivation Letter AI"
        description="Réinitialisez votre mot de passe pour retrouver l'accès à votre compte Motivation Letter AI."
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
                Mot de passe oublié ?
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                Pas de problème !
              </p>
              <p className="text-sm text-gray-500">
                Entrez votre email et nous vous enverrons un lien de réinitialisation
              </p>
            </div>
          </div>
        </LazySection>

        <LazySection animationType="slideUp" className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/80 backdrop-blur-sm py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
            
            {/* Messages d'état */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-count">
                <div className="flex items-center">
                  <FaExclamationTriangle className="h-5 w-5 text-red-400 mr-3" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg animate-count">
                <div className="flex items-start">
                  <FaCheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-700 font-medium">{success}</p>
                    <p className="text-xs text-green-600 mt-1">
                      N'oubliez pas de vérifier vos spams si vous ne recevez rien.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Adresse email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaEnvelope className={`h-5 w-5 transition-colors ${
                        error ? 'text-red-400' : 
                        isEmailValid ? 'text-green-500' : 
                        email ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={handleEmailChange}
                      className={`block w-full pl-12 pr-4 py-3 border rounded-xl text-sm transition-all duration-300 ${
                        error 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                          : isEmailValid 
                            ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-green-50/50'
                            : email 
                              ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/50'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
                      } focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder-gray-400`}
                      disabled={isLoading}
                      required
                    />
                    {isEmailValid && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isEmailValid}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-[1.02] btn-premium ${
                    (isLoading || !isEmailValid) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <FaEnvelope className="mr-2" />
                      Envoyer les instructions
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto">
                  <FaCheckCircle className="h-10 w-10 text-green-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Email envoyé !
                  </h3>
                  <p className="text-sm text-gray-600">
                    Vérifiez votre boîte de réception et suivez les instructions pour créer un nouveau mot de passe.
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Vous ne recevez rien ?</strong>
                    <br />
                    Vérifiez vos spams ou 
                    <button 
                      onClick={() => {
                        setSuccess(null);
                        setEmail('');
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      réessayez avec une autre adresse
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Liens de navigation */}
            <div className="mt-8 space-y-4">
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors group"
                >
                  <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
                  Retour à la connexion
                </Link>
              </div>
              
              <div className="text-center border-t border-gray-200 pt-4">
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
            </div>

            {/* Informations d'aide */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Besoin d'aide ?
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Vérifiez que l'adresse email est correcte</li>
                <li>• Consultez votre dossier spam/courrier indésirable</li>
                <li>• Le lien expire après 24 heures</li>
                <li>• Contactez le support si le problème persiste</li>
              </ul>
            </div>
          </div>
        </LazySection>
      </div>
    </>
  );
};

export default ForgotPasswordPage;