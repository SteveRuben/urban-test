import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface DebugInfo {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  componentInitialized: boolean;
  hasUser: boolean;
  userEmail: string | undefined;
  timestamp: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const [componentInitialized, setComponentInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    componentInitialized: false,
    hasUser: false,
    userEmail: undefined,
    timestamp: '',
  });
  
  // Utiliser le hook complet pour forcer la réactivité
  const authState = useAuthStore();
  const { isAuthenticated, isLoading, user, isInitialized } = authState;

  // Initialiser le composant avec un délai court
  useEffect(() => {
    console.log('ProtectedRoute - Initialisation du composant');
    
    const timer = setTimeout(() => {
      setComponentInitialized(true);
      console.log('ProtectedRoute - Composant marqué comme initialisé');
    }, 500); // Délai plus court car l'app est déjà initialisée
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Debug : surveiller les changements d'état
  useEffect(() => {
    const debug = {
      isAuthenticated,
      isLoading,
      isInitialized,
      componentInitialized,
      hasUser: !!user,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    };
    setDebugInfo(debug);
    console.log('ProtectedRoute - État auth:', debug);
  }, [isAuthenticated, isLoading, user, isInitialized, componentInitialized]);

  // Pendant l'initialisation ou le chargement, afficher un spinner
  if (!componentInitialized || !isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg mx-auto">
                ML
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs font-bold text-black">AI</span>
              </div>
            </div>
          </div>
          <LoadingSpinner size="large" text="Vérification de l'authentification..." />
        </div>
      </div>
    );
  }

  // Si pas authentifié après l'initialisation, afficher une page de connexion premium
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="text-center">
            <div className="mx-auto mb-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl mx-auto transform hover:scale-105 transition-transform">
                  ML
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-bold text-black">AI</span>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Accès Restreint
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Connectez-vous pour accéder à votre espace
            </p>
            <p className="text-sm text-gray-500">
              Créez des lettres de motivation professionnelles avec notre IA
            </p>
            
            {/* Debug info - uniquement en développement */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-white/80 backdrop-blur-sm rounded-lg text-xs text-left border">
                <strong className="text-gray-700">Debug Info:</strong>
                <pre className="mt-1 text-gray-600">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-white/20">
            <div className="space-y-4">
              <Link
                to="/login"
                state={{ from: location }}
                className="group relative w-full flex justify-center items-center py-3 px-6 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Se connecter
              </Link>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">
                    Nouveau sur Motivation Letter AI ?
                  </span>
                </div>
              </div>
              
              <Link
                to="/register"
                className="group relative w-full flex justify-center items-center py-3 px-6 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Créer un compte gratuit
              </Link>
              
              <div className="text-center pt-4">
                <Link 
                  to="/" 
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  ← Retour à l'accueil
                </Link>
              </div>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>100% Sécurisé</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span>+10k utilisateurs</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>IA Gemini Pro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;