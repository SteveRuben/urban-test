/* import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/cover-letter-generator-api/europe-west1/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Nouveau système d'attente d'authentification
let authReady = false;
const authPromise = new Promise<void>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    authReady = true;
    unsubscribe();
    resolve();
  });
});

api.interceptors.request.use(async (config) => {
  if (!authReady) {
    await authPromise;
  }

;
  const user = auth.currentUser;

  if (user) {
    try {
      // Force le rafraîchissement du token pour les requêtes critiques
      const forceRefresh = config.url?.includes('/users/me') || config.url?.includes('/letters');
      const token = await user.getIdToken(forceRefresh);
      
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting token:', error);
      // Ne pas bloquer la requête mais elle échouera probablement
    }
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
    
    // Si l'erreur est 401 (non authentifié) et qu'on n'a pas déjà tenté de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          // Force le refresh du token
          await user.getIdToken(true);
          const newToken = await user.getIdToken();
          
          // Met à jour le token dans la requête
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Relance la requête originale avec le nouveau token
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Erreur lors du rafraîchissement du token:', refreshError);
        
        // Si le refresh échoue, on déconnecte l'utilisateur
        const auth = getAuth();
        await auth.signOut();
        
        // Redirige vers la page de login
        window.location.href = '/login?session_expired=true';
      }
    }
    
    return Promise.reject(error);
  }
);

api.interceptors.request.use(config => {
  console.log('Request headers:', config.headers);
  return config;
});
export default api; */
import axios from 'axios';
import { auth } from '../config/firebase';

//|| 'http://127.0.0.1:5001/motivationletter-ai/us-central1/api/v1'
console.log('API URL:', import.meta.env.VITE_API_URL);
// Configuration de base d'axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api-ybcarzkuva-uc.a.run.app/v1' ,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et les erreurs
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si l'erreur est due à un token expiré (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const user = auth.currentUser;
        if (user) {
          // Forcer le rafraîchissement du token
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Réessayer la requête avec le nouveau token
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Erreur lors du rafraîchissement du token:', refreshError);
        // Rediriger vers la page de connexion si nécessaire
        window.location.href = '/login';
      }
    }

    // Gestion des erreurs réseau
    if (!error.response) {
      console.error('Erreur réseau:', error.message);
      return Promise.reject({
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
        status: 0
      });
    }

    // Gestion des erreurs serveur
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        'Une erreur est survenue';

    console.error('Erreur API:', {
      status: error.response.status,
      message: errorMessage,
      url: error.config?.url
    });

    return Promise.reject({
      message: errorMessage,
      status: error.response.status,
      response: error.response
    });
  }
);

export default api;