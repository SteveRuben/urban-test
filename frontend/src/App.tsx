import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import EnhancedNavbar from './components/layout/EnhancedNavbar';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import LetterViewPage from './pages/LetterViewPage';
import LetterEditorPage from './pages/LetterEditorPage';
import SubscriptionPage from './pages/SubscriptionPage';
import ProfilePage from './pages/ProfilePage';
import LettersPage from './pages/LettersPage';
import TemplatesPage from './pages/TemplatesPage';
import CVsPage from './pages/CVsPage';
import CVCreatePage from './pages/CVCreatePage';
import CVViewPage from './pages/CVViewPage';
import CVEditorPage from './pages/CVEditorPage';
import CVAnalysisPage from './pages/CVAnalysisPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/layout/LoadingSpinner';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { analytics } from './utils/analytics';
import LoginPage from './pages/LoginPage';

// Composant pour gérer l'affichage conditionnel de la navbar
const AppContent: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  
  // Analytics - Track page views
  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location.pathname]);
  
  // Vérifie si le chemin commence par /dashboard pour ne pas afficher la navbar
  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const isAuthRoute = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <ErrorBoundary>
      {/* Afficher EnhancedNavbar seulement si on n'est pas sur une route dashboard ou auth */}
      {!isDashboardRoute && !isAuthRoute && <EnhancedNavbar />}
      
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />
        <Route 
          path="/forgot-password" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} 
        />
        
        {/* Routes protégées du dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/letters" 
          element={
            <ProtectedRoute>
              <LettersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/letters/new" 
          element={
            <ProtectedRoute>
              <LetterEditorPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/letters/:id" 
          element={
            <ProtectedRoute>
              <LetterViewPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/letters/:id/edit" 
          element={
            <ProtectedRoute>
              <LetterEditorPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/subscription" 
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/templates" 
          element={
            <ProtectedRoute>
              <TemplatesPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Routes CV */}
        <Route 
          path="/dashboard/cv" 
          element={
            <ProtectedRoute>
              <CVsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/cv/new" 
          element={
            <ProtectedRoute>
              <CVCreatePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/cv/:id" 
          element={
            <ProtectedRoute>
              <CVViewPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/cv/:id/edit" 
          element={
            <ProtectedRoute>
              <CVEditorPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/cv/:id/analyze" 
          element={
            <ProtectedRoute>
              <CVAnalysisPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Routes CV legacy (pour compatibilité) */}
        <Route 
          path="/dashboard/cvs" 
          element={<Navigate to="/dashboard/cv" replace />} 
        />
        <Route 
          path="/dashboard/cvs/new" 
          element={<Navigate to="/dashboard/cv/new" replace />} 
        />
        <Route 
          path="/dashboard/cvs/:id" 
          element={<Navigate to="/dashboard/cv/:id" replace />} 
        />
        <Route 
          path="/dashboard/cvs/:id/edit" 
          element={<Navigate to="/dashboard/cv/:id/edit" replace />} 
        />
        <Route 
          path="/dashboard/cvs/:id/analyze" 
          element={<Navigate to="/dashboard/cv/:id/analyze" replace />} 
        />
        
        {/* Routes legacy pour compatibilité */}
        <Route 
          path="/editor" 
          element={<Navigate to="/dashboard/letters/new" replace />} 
        />
        <Route 
          path="/editor/:id" 
          element={<Navigate to="/dashboard/letters/:id/edit" replace />} 
        />
        <Route 
          path="/subscription" 
          element={<Navigate to="/dashboard/subscription" replace />} 
        />
        
        {/* Route 404 */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-8">Page non trouvée</p>
                <button
                  onClick={() => window.history.back()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
      
      {/* Toast Container pour les notifications */}
      <ToastContainer />
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  const { isLoading, isInitialized } = useAuthStore();
  const [appInitialized, setAppInitialized] = useState(false);

  useEffect(() => {
    console.log('App - Initialisation de l\'authentification');
    
    // Initialiser l'authentification au démarrage de l'app
    const { initializeAuth } = useAuthStore.getState();
    const unsubscribe = initializeAuth();
    
    // Marquer comme initialisé après un court délai pour permettre à Firebase de se charger
    const timer = setTimeout(() => {
      setAppInitialized(true);
      console.log('App - Application marquée comme initialisée');
    }, 1500); // Légèrement plus long pour une initialisation robuste
    
    return () => {
      console.log('App - Nettoyage de l\'authentification');
      if (unsubscribe) {
        unsubscribe();
      }
      clearTimeout(timer);
    };
  }, []); // Tableau de dépendances vide pour éviter les re-exécutions

  // Afficher un spinner pendant l'initialisation
  if (!appInitialized || (!isInitialized && isLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl mx-auto">
                ML
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs font-bold text-black">AI</span>
              </div>
            </div>
          </div>
          <LoadingSpinner size="large" text="Initialisation de Motivation Letter AI..." />
          <p className="mt-4 text-sm text-gray-500">
            Configuration de votre espace personnel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
};

export default App;