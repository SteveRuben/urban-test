// src/types/letter.types.ts

// Types liés aux lettres de motivation
export interface Letter {
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
  tags?: string[];
  isPublic?: boolean;
  isPremium?: boolean;
  type?:string; // 'standard' | 'premium'
}

export interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  isActive: boolean;
  isPremium?: boolean;
  authorId: string;
  popularity?: number;
  isNew?: boolean;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LetterFormData {
  title: string;
  company: string;
  jobTitle: string;
  recipientName: string;
  recipientEmail: string;
  content: string;
  status: 'draft' | 'final';
}

export interface LetterState {
  letters: Letter[];
  letter: Letter | null;
  templates: LetterTemplate[];
  isLoading: boolean;
  error: string | null;
}

export interface LetterMetadata {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  estimatedReadingTime: number;
  sentimentScore?: number;
  readabilityScore?: number;
  keywordsCount: number;
  lastOpened?: Date;
  views: number;
  shares: number;
  downloads: number;
}

export interface LetterStats {
  createdAt: Date;
  updatedAt: Date;
  lastViewed?: Date;
  totalViews: number;
  totalEdits: number;
  totalShares: number;
  totalDownloads: number;
  avgSessionTime?: number;
  conversionRate?: number; // Si suivi des candidatures
}