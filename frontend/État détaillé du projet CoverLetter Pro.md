État détaillé du projet CoverLetter Pro
Aperçu général
CoverLetter Pro est une application SaaS permettant aux utilisateurs de créer, gérer et optimiser leurs lettres de motivation pour des candidatures professionnelles. L'application propose différents niveaux d'abonnement (gratuit, mensuel, à vie) et dispose d'une interface intuitive pour la rédaction de lettres.
Architecture technique
Backend

Technologie : Firebase Functions (v2)
Langage : TypeScript
Base de données : Firestore
Authentification : Firebase Authentication
Paiements : Stripe

Frontend

Technologie : React 18 avec Vite
Langage : TypeScript
Styling : xStyled (extension de styled-components) + approche design system
Routing : React Router v6
Packaging : npm

État d'avancement
Backend (100% développé)
Le backend est entièrement développé avec les endpoints suivants :
Endpoints publics

GET /plans - Récupère les informations sur les plans d'abonnement
GET /currencies - Récupère les devises supportées
POST /webhook/stripe - Webhook pour les événements Stripe

Endpoints authentifiés

Utilisateurs :

POST /users - Création d'un utilisateur
GET /users/me - Récupération des données utilisateur
PUT /users/me - Mise à jour des données utilisateur
DELETE /users/me - Suppression du compte utilisateur


Lettres :

GET /letters - Liste des lettres de l'utilisateur
POST /letters - Création d'une nouvelle lettre
GET /letters/:id - Récupération d'une lettre spécifique
PUT /letters/:id - Mise à jour d'une lettre
DELETE /letters/:id - Suppression d'une lettre


Modèles de lettres :

GET /letter-templates - Liste des modèles disponibles
POST /letter-templates - Création d'un modèle (admin)
POST /generate-letter - Génération d'une lettre à partir d'un modèle


Abonnements :

GET /subscriptions/active - Récupère l'abonnement actif
POST /subscriptions/free - Création d'un abonnement gratuit
DELETE /subscriptions/:subscriptionId - Annulation d'un abonnement
POST /payments/create-intent - Création d'une intention de paiement
GET /payments/history - Historique des paiements
GET /payments/check/:paymentIntentId - Vérification du statut d'un paiement



Frontend (70% développé)
Pages implémentées (UI seulement, sans intégration backend)

HomePage (100%)

Landing page complète avec toutes les sections
Responsive et optimisée


LoginPage (100%)

Formulaire de connexion
Options de connexion sociale (Google, GitHub)
Validation des champs
Lien vers réinitialisation du mot de passe


RegisterPage (100%)

Formulaire d'inscription
Choix de plan d'abonnement
Validation des champs
Conditions d'utilisation


ForgotPasswordPage (100%)

Formulaire de réinitialisation
Validation des champs
Message de confirmation


DashboardPage (100%)

Statistiques utilisateur
Actions rapides
Liste des lettres récentes


LettersPage (100%)

Liste de toutes les lettres
Filtres et tri
Recherche
Actions (voir, modifier, supprimer)


LetterEditorPage (100%)

Formulaire d'édition
Prévisualisation
Sauvegarde automatique
Export PDF/Word


ProfilePage (100%)

Gestion des informations personnelles
Changement de mot de passe
Suppression de compte



Pages à finaliser

SubscriptionPage (50%)

Structure de base implémentée
Informations d'abonnement
Manque : intégration avec Stripe, historique des paiements



Composants clés

DashboardLayout (100%)

Layout complet pour le tableau de bord
Sidebar navigation
Header avec profil utilisateur
Responsive (mobile et desktop)


Button (100%)

Composant réutilisable
Différentes variantes et tailles
Props bien typés
États: loading, disabled, etc.


Navbar (100%)

Navigation principale
Menu responsive
Boutons login/register


Footer (100%)

Liens de bas de page
Responsive



Intégrations à développer
Priorité haute

Authentification (0%)

Intégrer Firebase Auth avec le frontend
Gérer les états de connexion
Protéger les routes privées
Gérer la persistance de session


Services API (0%)

Créer des services pour chaque endpoint
Implémenter l'intercepteur pour les tokens
Gérer les erreurs et les retries


État global (0%)

Implémenter Zustand pour la gestion de l'état
Stores pour: auth, letters, subscriptions
Persister les données critiques



Priorité moyenne

Finir SubscriptionPage (50%)

Intégrer l'API Stripe pour les paiements
Gestion des abonnements
Historique des factures


TemplatesPage (0%)

Page de sélection des modèles
Prévisualisation des modèles
Filtrage par catégorie/type



Priorité basse

Analytics (0%)

Suivi des métriques utilisateur
Indicateurs de performance



Structure de données
Modèles de données principaux

User

typescriptinterface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isEmailVerified: boolean;
  trialUsed: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

Letter

typescriptinterface Letter {
  id: string;
  userId: string;
  title: string;
  content: string;
  templateId?: string;
  jobTitle?: string;
  company?: string;
  recipientName?: string;
  recipientEmail?: string;
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
}

Subscription

typescriptinterface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

Plan

typescriptinterface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'lifetime';
  trialDays: number;
  isActive: boolean;
}
Enjeux techniques

Sécurité et authentification

Assurer que toutes les routes authentifiées sont correctement protégées
Gérer les tokens d'authentification et leur renouvellement
Implémenter la validation des inputs pour éviter les injections


Performances

Optimiser les requêtes Firestore pour limiter les coûts
Implémenter un système de mise en cache côté client
Lazy loading des composants non critiques


Expérience utilisateur

Assurer une expérience fluide sur tous les appareils (desktop, tablette, mobile)
Minimiser les temps de chargement
Implémenter la sauvegarde automatique dans l'éditeur de lettres


Intégration des paiements

Sécuriser les transactions Stripe
Gérer correctement les webhooks pour les événements de paiement
Implémenter une gestion robuste des erreurs de paiement



Guide d'implémentation pour la suite
1. Configuration initiale

Installer les dépendances manquantes :

bashcd frontend
npm install firebase zustand axios react-query react-hook-form yup
2. Mettre à jour App.tsx avec toutes les routes
typescript// Exemple de structure de Routes à implémenter
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  
  {/* Routes protégées */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/dashboard/letters" element={<LettersPage />} />
    <Route path="/dashboard/letters/new" element={<LetterEditorPage />} />
    <Route path="/dashboard/letters/:id" element={<LetterViewPage />} />
    <Route path="/dashboard/letters/:id/edit" element={<LetterEditorPage />} />
    <Route path="/dashboard/subscription" element={<SubscriptionPage />} />
    <Route path="/dashboard/profile" element={<ProfilePage />} />
    <Route path="/dashboard/templates" element={<TemplatesPage />} />
  </Route>
</Routes>
3. Créer les services API
Structure recommandée :
src/
└── services/
    ├── api.ts                  # Configuration de base axios
    ├── auth.service.ts         # Service d'authentification
    ├── letter.service.ts       # Service de gestion des lettres
    ├── template.service.ts     # Service pour les modèles
    └── subscription.service.ts # Service pour les abonnements
Exemple d'implémentation du service API de base :
typescript// api.ts
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/your-project-id/europe-west1/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Gérer les erreurs 401 (non authentifié)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const auth = getAuth();
        await auth.currentUser?.getIdToken(true); // Force refresh du token
        const token = await auth.currentUser?.getIdToken();
        
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Si le refresh échoue, déconnecter l'utilisateur
        await auth.signOut();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
4. Implémenter l'état global avec Zustand
Structure recommandée :
src/
└── store/
    ├── auth.store.ts     # État d'authentification
    ├── letter.store.ts   # État des lettres
    └── subscription.store.ts # État des abonnements
Exemple d'implémentation du store d'authentification :
typescript// auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { User } from '../types';
import authService from '../services/auth.service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const auth = getAuth();
          await signInWithEmailAndPassword(auth, email, password);
          const userData = await authService.getCurrentUser();
          set({ user: userData, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error.message || 'Erreur de connexion', 
            isLoading: false,
            isAuthenticated: false 
          });
        }
      },
      
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const auth = getAuth();
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await authService.createUser({ 
            email, 
            displayName: name,
            uid: userCredential.user.uid 
          });
          const userData = await authService.getCurrentUser();
          set({ user: userData, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error.message || 'Erreur d\'inscription', 
            isLoading: false,
            isAuthenticated: false 
          });
        }
      },
      
      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const auth = getAuth();
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          const userData = await authService.getCurrentUser();
          set({ user: userData, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error.message || 'Erreur de connexion avec Google', 
            isLoading: false,
            isAuthenticated: false 
          });
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        try {
          const auth = getAuth();
          await firebaseSignOut(auth);
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
          set({ 
            error: error.message || 'Erreur de déconnexion', 
            isLoading: false 
          });
        }
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
Points de départ recommandés
Pour un développeur junior, je recommande de commencer par :

Mettre à jour App.tsx avec toutes les routes et implémenter le ProtectedRoute component
Configurer l'authentification Firebase et implémenter le service d'authentification
Implémenter le store auth avec Zustand pour gérer l'état d'authentification
Intégrer l'authentification avec les pages existantes (Login, Register, ForgotPassword)
Développer le service des lettres et l'intégrer avec les pages correspondantes
Compléter la page d'abonnement avec l'intégration Stripe

Documentation et ressources

Documentation Firebase
Documentation Stripe
Documentation xStyled
Documentation Zustand
Documentation React Router

Ce document fournit une vue d'ensemble complète du projet, de son état actuel, et des prochaines étapes à suivre pour finaliser le développement. Un développeur junior devrait pouvoir reprendre le projet en suivant ce guide sans avoir besoin de poser des questions supplémentaires.