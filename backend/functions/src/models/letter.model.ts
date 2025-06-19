export interface Letter {
  id: string;
  userId: string;
  title: string;
  content: string;
  jobTitle?: string;
  company?: string;
  recipient?: {
    name?: string;
    email?: string;
  };
  status: 'draft' | 'final';
  
  // Champs pour la génération IA
  isAIGenerated?: boolean; // Indique si la lettre a été générée par IA
  aiPromptUsed?: string; // Stocke le prompt utilisé pour la génération
  aiModel?: string; // Le modèle d'IA utilisé (pour suivi et amélioration)
  
  // Statistiques et métadonnées
  templateId?: string; // Si créée à partir d'un modèle
  viewCount?: number; // Nombre de fois que la lettre a été vue
  
  // Versions et historique
  version?: number; // Numéro de version pour suivre les modifications
  previousVersions?: string[]; // Références aux versions précédentes
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date; // Date à laquelle la lettre a été finalisée
}

export interface AIUsageStats {
  userId: string;
  totalUsage: number;
  monthlyCounts: Record<string, number>; // Format: "YYYY-MM": count
  lastUsed: Date;
  generationStats?: {
    averageLength?: number;
    topCompanies?: string[];
    topPositions?: string[];
  };
}

export enum LetterType {
  JOB_APPLICATION = "job",
  SCHOLARSHIP = "scholarship",
  INTERNSHIP = "internship",
  CUSTOM = "custom"
}

export interface LetterTemplate {
  id: string;
  type: LetterType;
  title: string;
  template: string; // Contenu avec des variables comme {{position}}, {{company}}, etc.
  isPublic: boolean; // Si le modèle est disponible pour tous les utilisateurs
  isPremium?: boolean; // Si le modèle est réservé aux abonnements premium
  isAIGenerated?: boolean; // Si le modèle a été généré par IA
  useCount?: number; // Nombre d'utilisations du modèle
  rating?: number; // Note moyenne du modèle (1-5)
  creatorId?: string; // ID de l'utilisateur qui a créé le modèle, null si c'est par défaut
  tags?: string[]; // Tags pour faciliter la recherche
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour les statistiques de lettres
export interface LetterStats {
  totalCount: number;
  draftCount: number;
  finalCount: number;
  aiGeneratedCount: number;
  mostUsedTemplates: {
    templateId: string;
    count: number;
  }[];
  topCompanies: {
    name: string;
    count: number;
  }[];
  topPositions: {
    name: string;
    count: number;
  }[];
  creationsByMonth: Record<string, number>; // Format: "YYYY-MM": count
}

// Interface pour les évaluations de lettres par l'IA
export interface LetterEvaluation {
  id: string;
  letterId: string;
  userId: string;
  clarity: number; // 1-10
  relevance: number; // 1-10
  professionalism: number; // 1-10
  personalization: number; // 1-10
  structure: number; // 1-10
  impact: number; // 1-10
  strengths: string[];
  improvements: string[];
  overallScore: number; // 1-10
  createdAt: Date;
}