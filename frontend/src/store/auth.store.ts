import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
  sendPasswordResetEmail,
  type AuthError,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../services/api';
import type { User } from '../types';

interface AxiosError {
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

// Type guard pour vérifier si c'est une erreur Axios
function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error
  );
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // Nouveau flag pour savoir si Firebase est initialisé
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, plan?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  initializeAuth: () => () => void;
}

// Formatage des erreurs Firebase en français
const formatAuthError = (error: AuthError): string => {
  console.error('Firebase Auth Error:', error);
  
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'L\'adresse e-mail n\'est pas valide.',
    'auth/user-disabled': 'Ce compte utilisateur a été désactivé.',
    'auth/user-not-found': 'Aucun utilisateur trouvé avec cet e-mail.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/invalid-credential': 'Identifiants invalides. Vérifiez votre email et mot de passe.',
    'auth/email-already-in-use': 'Cette adresse e-mail est déjà utilisée par un autre compte.',
    'auth/weak-password': 'Le mot de passe doit comporter au moins 6 caractères.',
    'auth/operation-not-allowed': 'Cette opération n\'est pas autorisée.',
    'auth/popup-closed-by-user': 'La fenêtre de connexion a été fermée avant la fin de l\'opération.',
    'auth/cancelled-popup-request': 'La demande de connexion a été annulée.',
    'auth/popup-blocked': 'La fenêtre de connexion a été bloquée par le navigateur.',
    'auth/configuration-not-found': 'Configuration d\'authentification introuvable.',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion internet.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.'
  };
  
  return errorMessages[error.code] || `Erreur d'authentification: ${error.message}`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    
    (set) => ({
      user: null,
      isLoading: true, // Commencer en mode loading
      error: null,
      isAuthenticated: false,
      isInitialized: false,
      
      initializeAuth: () => {
        console.log('Store: initializeAuth appelé');
        set({ isLoading: true, isInitialized: false });
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('Store: onAuthStateChanged - firebaseUser:', firebaseUser?.email || 'null');
          
          if (firebaseUser) {
            try {
              console.log('Store: Utilisateur Firebase trouvé, récupération du profil...');
              
              // Essayer d'abord avec /users/profile
              let response;
              try {
                response = await api.get('/users/profile');
                console.log('Store: Profil récupéré via /users/profile');
              } catch (profileError: unknown) {
                console.log('Store: /users/profile échoué, essai avec /users/me');
                console.error('Store: Erreur lors de la récupération du profil:', profileError);
                if (!isAxiosError(profileError) || profileError.response?.status !== 404) {
                  const selectedPlan = localStorage.getItem('selectedPlan') || 'free';
                  const profileData = {
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                    isEmailVerified: firebaseUser.emailVerified,
                    plan: selectedPlan || 'free', // Plan par défaut
                    photoURL: firebaseUser.photoURL || '',
                  };
                  
                  response = await api.post('/users', profileData);
                }else {
                  response = await api.get('/users/profile');
                  console.log('Store: Profil récupéré via /users/me');
                }
              }
              
              console.log('Store: Données utilisateur récupérées:', response.data);
              set({ 
                user: response.data.data, 
                isAuthenticated: true, 
                isLoading: false,
                isInitialized: true,
                error: null
              });
              console.log('Store: État mis à jour avec succès');
            } catch (error: unknown) {
              console.error('Store: Erreur lors de la récupération du profil:', error);
              
              // Si l'utilisateur n'existe pas dans l'API, le créer
              if (!isAxiosError(error) || error.response?.status !== 404) {
                try {
                  console.log('Store: Création d\'un nouvel utilisateur');
                  const selectedPlan = localStorage.getItem('selectedPlan') || 'free';
                  const profileData = {
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                    isEmailVerified: firebaseUser.emailVerified,
                    plan: selectedPlan || 'free', // Plan par défaut
                    photoURL: firebaseUser.photoURL || '',
                  };

                  await api.post('/users', profileData);
                  
                  // Récupérer à nouveau après création
                  let newResponse;
                  try {
                    newResponse = await api.get('/users/profile');
                  } catch {
                    newResponse = await api.get('/users/me');
                  }
                  
                  set({ 
                    user: newResponse.data.data , 
                    isAuthenticated: true, 
                    isLoading: false,
                    isInitialized: true,
                    error: null
                  });
                  console.log('Store: Nouvel utilisateur créé et récupéré');
                } catch (createError) {
                  console.error('Store: Erreur lors de la création de l\'utilisateur:', createError);
                  set({ 
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isInitialized: true,
                    error: 'Erreur lors de la création du compte'
                  });
                }
              } else {
                console.error('Store: Erreur API non-404:', error);
                set({ 
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  isInitialized: true,
                  error: 'Erreur de connexion à l\'API'
                });
              }
            }
          } else {
            console.log('Store: Aucun utilisateur Firebase');
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              isInitialized: true,
              error: null
            });
          }
        });
        
        return unsubscribe;
      },
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('Store: Début de la connexion');
          
          // Connexion Firebase
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log('Store: Connexion Firebase réussie');
          console.log('Store: Utilisateur connecté:', userCredential.user.email);
          // onAuthStateChanged se chargera de récupérer les données utilisateur
          // Pas besoin de faire les appels API ici
          
        } catch (error: unknown) {
          const authError = error as AuthError;
          set({ 
            error: formatAuthError(authError), 
            isLoading: false
          });
          throw error;
        }
      },
      
      register: async (email: string, password: string, name: string, plan?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Créer le compte Firebase
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Mettre à jour le profil Firebase avec le nom
          await updateFirebaseProfile(userCredential.user, {
            displayName: name
          });
          
          // onAuthStateChanged se chargera de créer l'utilisateur dans l'API
          // await new Promise(resolve => setTimeout(resolve, 50));
          if (plan && plan !== 'free') {
            localStorage.setItem('selectedPlan', plan);
          }
        } catch (error: unknown) {
          console.error('Erreur d\'inscription:', error);
          const authError = error as AuthError;
          set({ 
            error: formatAuthError(authError), 
            isLoading: false
          });
          throw error;
        }
      },
      
      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const provider = new GoogleAuthProvider();
          provider.addScope('email');
          provider.addScope('profile');
          
          // const userCredential =
          await signInWithPopup(auth, provider);
          console.log('Store: Connexion Google réussie');
          
          // onAuthStateChanged se chargera du reste
          
        } catch (error: unknown) {
          console.error('Erreur de connexion Google:', error);
          set({ 
            error: formatAuthError(error as AuthError), 
            isLoading: false
          });
          throw error;
        }
      },
      
      loginWithGithub: async () => {
        set({ isLoading: true, error: null });
        try {
          const provider = new GithubAuthProvider();
          provider.addScope('user:email');
          
          // const userCredential = 
          // await signInWithPopup(auth, provider);
          console.log('Store: Connexion GitHub réussie');
          
          // onAuthStateChanged se chargera du reste
          
        } catch (error: unknown) {
          console.error('Erreur de connexion GitHub:', error);
          set({ 
            error: formatAuthError(error as AuthError), 
            isLoading: false
          });
          throw error;
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        try {
          await firebaseSignOut(auth);
          console.log('Store: Déconnexion réussie');
          // onAuthStateChanged mettra à jour l'état automatiquement
        } catch (error: unknown) {
          console.error('Erreur de déconnexion:', error);
          set({ 
            error: formatAuthError(error as AuthError), 
            isLoading: false 
          });
          throw error;
        }
      },
      
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await sendPasswordResetEmail(auth, email);
          set({ isLoading: false });
        } catch (error: unknown) {
          console.error('Erreur de réinitialisation:', error);
          set({ 
            error: formatAuthError(error as AuthError), 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateUser: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          // Mettre à jour l'utilisateur dans notre API
          await api.put('/users/profile', data);
          
          // Récupérer les données utilisateur mises à jour
          const response = await api.get('/users/profile');
          
          set({ 
            user: response.data.user, 
            isLoading: false 
          });
        } catch (error: unknown) {
          console.error('Erreur de mise à jour:', error);
          const authError = error as AuthError;
          set({ 
            error: formatAuthError(authError), 
            isLoading: false
          });
          throw error;
        }
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        // Ne plus persister isAuthenticated, laisser Firebase gérer
        user: state.user
      }),
    }
  )
);