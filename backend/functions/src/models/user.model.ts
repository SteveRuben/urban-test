import { Currency } from './payment.model';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isEmailVerified: boolean;
  
  // Essais et limites
  trialUsed: number;
  aiTrialsUsed: number; // Nombre d'essais de génération IA utilisés
  
  // Utilisation de l'IA
  aiUsage: Record<string, number>; // Utilisation mensuelle de l'IA (format: "YYYY-MM": count)
  aiLastUsed?: Date; // Date de dernière utilisation de l'IA
  
  // Préférences utilisateur
  preferredCurrency?: Currency;
  
  // Références
  subscriptionId?: string; // ID de l'abonnement actif
  
  // Statistiques et analytique
  lettersCount?: number; // Nombre total de lettres créées
  
  // Dates de l'utilisateur
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

// Interface pour les statistiques d'utilisation
export interface UserStats {
  userId: string;
  lettersCreated: number;
  lettersFinalized: number;
  aiGenerated: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour les préférences utilisateur
export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  defaultRecipient?: {
    name?: string;
    email?: string;
  };
  defaultSignature?: string;
  preferredCurrency: Currency;
  updatedAt: Date;
}