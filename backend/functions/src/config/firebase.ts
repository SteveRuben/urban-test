// src/config/firebase.ts - Configuration Firebase complète
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';

// Configuration Firebase Admin (éviter la double initialisation)
const firebaseConfig = {
  apiKey: process.env.CLG_PRIVATE_KEY_ID,
  authDomain: process.env.CLG_AUTH_DOMAIN,
  projectId: process.env.CLG_PROJECT_ID,
  storageBucket: process.env.CLG_STORAGE_BUCKET,
  messagingSenderId: process.env.CLG_MESSAGING_SENDER_ID,
  appId: process.env.CLG_APP_ID,
  measurementId: process.env.CLG_MEASUREMENT_ID,
};

logger.info('Initialisation de Firebase avec la configuration suivante:', firebaseConfig);
logger.info('Environnement Firebase:', process.env.NODE_ENV || 'development');
logger.info('Genemi Key:', process.env.AI_API_KEY || 'us-central1');
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exports des services Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Configuration des collections Firestore
export const COLLECTIONS = {
  USERS: 'users',
  LETTERS: 'letters',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  PLANS: 'plans',
  TEMPLATES: 'templates',
  AI_USAGE: 'ai_usage',
  AI_PROMPTS: 'ai_prompts',
  AI_RESPONSES: 'ai_responses',
  AI_FEEDBACK: 'ai_feedback',
  TEMPLATE_RATINGS: 'template_ratings',
  LETTER_ANALYSES: 'letter_analyses',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  NOTIFICATION : 'notifications'
} as const;

// Configuration des endpoints API
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  LETTERS: '/letters',
  SUBSCRIPTIONS: '/subscriptions',
  PAYMENTS: '/payments',
  AI: '/ai',
  TEMPLATES: '/templates',
  ANALYTICS: '/analytics'
} as const;

// Limites et quotas par défaut
export const DEFAULT_LIMITS = {
  // Limites utilisateur gratuit
  FREE_TRIAL_LETTERS: 3,
  FREE_AI_GENERATIONS: 0,
  FREE_TEMPLATES_ACCESS: 5,
  
  // Limites utilisateur premium mensuel  
  MONTHLY_LETTERS: -1, // illimité
  MONTHLY_AI_GENERATIONS: 50,
  MONTHLY_TEMPLATES_ACCESS: -1, // illimité
  
  // Limites utilisateur lifetime
  LIFETIME_LETTERS: -1, // illimité
  LIFETIME_AI_GENERATIONS: -1, // illimité
  LIFETIME_TEMPLATES_ACCESS: -1, // illimité
  
  // Limites techniques
  MAX_LETTER_LENGTH: 10000, // caractères
  MAX_TEMPLATE_SIZE: 5000, // caractères
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_AI_REQUESTS_PER_HOUR: 20
} as const;

// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  // Authentification
  UNAUTHORIZED: 'Token d\'authentification manquant ou invalide',
  TOKEN_EXPIRED: 'Token d\'authentification expiré',
  TOKEN_INVALID: 'Token d\'authentification invalide',
  FORBIDDEN: 'Accès interdit à cette ressource',
  
  // Ressources
  NOT_FOUND: 'Ressource non trouvée',
  ALREADY_EXISTS: 'Ressource déjà existante',
  
  // Validation
  VALIDATION_ERROR: 'Erreur de validation des données',
  MISSING_REQUIRED_FIELDS: 'Champs obligatoires manquants',
  INVALID_FORMAT: 'Format de données invalide',
  
  // Limites
  RATE_LIMIT_EXCEEDED: 'Limite de requêtes dépassée',
  QUOTA_EXCEEDED: 'Quota d\'utilisation dépassé',
  AI_LIMIT_EXCEEDED: 'Limite d\'utilisation de l\'IA atteinte',
  SUBSCRIPTION_REQUIRED: 'Abonnement requis pour cette fonctionnalité',
  UPGRADE_REQUIRED: 'Mise à niveau du compte requise',
  
  // Technique
  SERVER_ERROR: 'Erreur interne du serveur',
  SERVICE_UNAVAILABLE: 'Service temporairement indisponible',
  TIMEOUT: 'Délai d\'attente dépassé',
  
  // Paiements
  PAYMENT_FAILED: 'Échec du paiement',
  SUBSCRIPTION_INACTIVE: 'Abonnement inactif',
  CARD_DECLINED: 'Carte bancaire refusée'
} as const;

// Configuration de l'application
export const CONFIG = {
  // Région et environnement
  REGION: 'us-central1',
  TIMEZONE: 'Europe/Paris',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  
  // Langues supportées
  DEFAULT_LANGUAGE: 'fr',
  SUPPORTED_LANGUAGES: ['fr', 'en'],
  
  // Limites techniques
  MAX_UPLOAD_SIZE: '10mb',
  MAX_REQUEST_TIMEOUT: 300000, // 5 minutes
  
  // CORS Origins
  CORS_ORIGINS: [
    'https://motivationletter.ai',
    'https://motivationletter-ai.web.app',
    'https://motivationletter-ai.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  
  // URLs externes
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  
  // Paramètres IA
  AI_CONFIG: {
    DEFAULT_MODEL: 'gemini-pro',
    MAX_TOKENS: 2048,
    TEMPERATURE: 0.7,
    TOP_P: 0.8,
    TOP_K: 40,
    SAFETY_SETTINGS: [
      {
        category: 'harm_category_harassment',
        threshold: 'block_medium_and_above'
      },
      {
        category: 'harm_category_hate_speech', 
        threshold: 'block_medium_and_above'
      }
    ]
  }
} as const;

// Plans d'abonnement
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    currency: 'EUR',
    interval: null,
    features: {
      letters: 3,
      ai_generations: 0,
      templates: 5,
      export_formats: ['pdf'],
      support: 'community'
    }
  },
  MONTHLY: {
    id: 'monthly',
    name: 'Premium Mensuel',
    price: 9.99,
    currency: 'EUR',
    interval: 'month',
    stripe_price_id: 'price_monthly_premium',
    features: {
      letters: -1, // illimité
      ai_generations: 50,
      templates: -1, // illimité
      export_formats: ['pdf', 'docx'], 
      support: 'priority'
    }
  },
  LIFETIME: {
    id: 'lifetime',
    name: 'Accès à Vie',
    price: 99,
    currency: 'EUR',
    interval: null,
    stripe_price_id: 'price_lifetime_premium',
    features: {
      letters: -1, // illimité
      ai_generations: -1, // illimité
      templates: -1, // illimité
      export_formats: ['pdf', 'docx'],
      support: 'vip'
    }
  }
} as const;

// Templates par défaut
export const DEFAULT_TEMPLATES = {
  CLASSIC_PROFESSIONAL: {
    id: 'classic_professional',
    title: 'Lettre de motivation classique',
    category: 'professional',
    tags: ['classique', 'formel', 'professionnel'],
    language: 'fr',
    isPremium: false,
    content: `Madame, Monsieur,

Je me permets de vous adresser ma candidature pour le poste de {{jobTitle}} au sein de {{company}}.

{{#if experience}}Fort(e) de {{experience}}, j'ai développé une solide expertise dans ce domaine.{{/if}} Mes compétences en {{skills}} me permettront de contribuer efficacement à vos projets et d'apporter une valeur ajoutée à votre équipe.

Je suis particulièrement attiré(e) par {{company}} en raison de {{companyReason}}. Cette opportunité représente pour moi le cadre idéal pour mettre à profit mes compétences et poursuivre mon développement professionnel.

{{#if achievements}}Parmi mes principales réalisations, je peux citer : {{achievements}}.{{/if}}

Je reste à votre disposition pour un entretien au cours duquel je pourrai vous exposer plus en détail ma motivation et mes qualifications.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{userName}}`
  },
  
  MODERN_STARTUP: {
    id: 'modern_startup',
    title: 'Lettre moderne pour startup',
    category: 'startup',
    tags: ['moderne', 'startup', 'tech', 'dynamique'],
    language: 'fr',
    isPremium: true,
    content: `Bonjour,

Passionné(e) par l'innovation et attiré(e) par l'énergie de {{company}}, je souhaite rejoindre votre équipe en tant que {{jobTitle}}.

{{#if experience}}Mon parcours de {{experience}} m'a permis de développer{{else}}J'ai développé{{/if}} une expertise en {{skills}} qui s'aligne parfaitement avec vos besoins. Votre approche {{companyApproach}} correspond exactement à ma vision du futur de ce secteur.

Ce qui me motive chez {{company}} :
- {{motivation1}}
- {{motivation2}}
- {{motivation3}}

{{#if achievements}}Mes réalisations récentes incluent {{achievements}}, démontrant ma capacité à livrer des résultats concrets dans un environnement dynamique.{{/if}}

J'aimerais beaucoup discuter de la façon dont je peux contribuer à vos objectifs ambitieux. Seriez-vous disponible pour un échange dans les prochains jours ?

À bientôt,
{{userName}}`
  },
  
  INTERNSHIP_STUDENT: {
    id: 'internship_student',
    title: 'Demande de stage étudiant',
    category: 'internship',
    tags: ['stage', 'étudiant', 'junior', 'formation'],
    language: 'fr',
    isPremium: false,
    content: `Madame, Monsieur,

Étudiant(e) en {{education}} à {{school}}, je recherche un stage de {{duration}} au sein de {{company}} pour compléter ma formation théorique par une expérience pratique enrichissante.

Votre entreprise, reconnue pour {{companyStrength}}, représente le cadre idéal pour appliquer les connaissances acquises durant mon cursus et découvrir les réalités du monde professionnel.

{{#if projects}}Mes projets académiques récents portent sur {{projects}}, ce qui m'a permis de développer des compétences en {{skills}}.{{/if}} Je suis particulièrement motivé(e) par l'opportunité de contribuer à {{specificProject}} et d'apprendre auprès de vos équipes expérimentées.

Ma curiosité, ma capacité d'adaptation et mon engagement font de moi un candidat déterminé à tirer le meilleur parti de cette expérience professionnelle.

{{#if availability}}Je suis disponible à partir du {{availability}} pour une durée de {{duration}}.{{/if}}

Je vous remercie de l'attention que vous porterez à ma candidature et reste à votre disposition pour tout complément d'information.

Cordialement,
{{userName}}`
  }
} as const;

// Validation des configurations
export const validateConfig = (): boolean => {
  const warnings: string[] = [];
  
  // Vérifier les variables d'environnement critiques en production
  if (CONFIG.ENVIRONMENT === 'production') {
    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push('STRIPE_SECRET_KEY manquant en production');
    }
    if (!process.env.GEMINI_API_KEY) {
      warnings.push('GEMINI_API_KEY manquant en production');
    }
  }
  
  if (warnings.length > 0) {
    console.warn('Configuration warnings:', warnings);
    return false;
  }
  
  return true;
};

// Initialisation et validation
validateConfig();

// Types TypeScript pour une meilleure sécurité
export type CollectionName = keyof typeof COLLECTIONS;
export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
export type TemplateId = keyof typeof DEFAULT_TEMPLATES;
export type SupportedLanguage = typeof CONFIG.SUPPORTED_LANGUAGES[number];