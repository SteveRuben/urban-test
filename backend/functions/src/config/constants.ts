// src/config/constants.ts
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  LETTERS: '/letters',
  SUBSCRIPTIONS: '/subscriptions',
  PAYMENTS: '/payments',
  AI: '/ai',
  NOTIFICATIONS: '/notifications',
} as const;

export const DEFAULT_LIMITS = {
  FREE_TRIAL_LETTERS: 3,
  FREE_AI_TRIALS: 0,
  BASIC_AI_LIMIT: 5,
  PRO_AI_LIMIT: 20,
  PREMIUM_AI_LIMIT: null // illimité
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Token d\'authentification manquant ou invalide',
  FORBIDDEN: 'Accès interdit',
  NOT_FOUND: 'Ressource non trouvée',
  VALIDATION_ERROR: 'Erreur de validation des données',
  AI_LIMIT_EXCEEDED: 'Limite d\'utilisation de l\'IA atteinte',
  SUBSCRIPTION_REQUIRED: 'Abonnement requis pour cette fonctionnalité'
} as const;