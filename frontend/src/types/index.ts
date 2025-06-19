// src/types/index.ts

// Ce fichier exporte tous les types pour les rendre disponibles via une seule importation

export * from './env.types';
export * from './auth.types';
export * from './letter.types';
export * from './subscription.types';
export * from './payment.types';
export * from './ui.types';
export * from './notification.types';

// Tout autre type partagé ou types utilitaires
export type ApiResponse<T = any> = {
  data: T;
  status: number;
  message?: string;
};

export type ApiError = {
  message: string;
  details?: string;
  code?: string;
  stack?: string;
};

// Types et interfaces améliorés

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt' | 'html';
  quality?: 'standard' | 'high' | 'ultra';
  includeMetadata?: boolean;
  includeWatermark?: boolean;
  customTemplate?: string;
  fontSize?: number;
  fontFamily?: string;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ShareOptions {
  platform: 'email' | 'linkedin' | 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'copy';
  message?: string;
  includePreview?: boolean;
  publicAccess?: boolean;
  expiresAt?: Date;
}

export interface AIAnalysis {
  tone: 'professional' | 'friendly' | 'formal' | 'casual' | 'persuasive';
  strength: number; // 0-100
  weaknesses: string[];
  suggestions: string[];
  competitiveness: number; // 0-100
  matchScore?: number; // 0-100 si comparé à une offre
  improvementAreas: {
    category: string;
    priority: 'low' | 'medium' | 'high';
    suggestion: string;
  }[];
}

export interface VersionHistory {
  id: string;
  version: number;
  title: string;
  content: string;
  changes: string[];
  createdAt: Date;
  createdBy: string;
  isAutosave: boolean;
  size: number;
}



export interface UIState {
  isFullscreen: boolean;
  showMetadata: boolean;
  showAnalysis: boolean;
  showVersionHistory: boolean;
  showShareModal: boolean;
  showExportModal: boolean;
  showDeleteConfirm: boolean;
  selectedExportFormat: ExportOptions['format'];
  selectedSharePlatform: ShareOptions['platform'];
  isExporting: boolean;
  isSharing: boolean;
  isAnalyzing: boolean;
  isBookmarked: boolean;
  currentView: 'preview' | 'source' | 'split';
  sidebarCollapsed: boolean;
  activeTab: 'content' | 'metadata' | 'analysis' | 'history' | 'stats';
}