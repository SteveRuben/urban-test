// Nouveau fichier pour les modèles liés à l'IA
export type AIUsageType = 'generation' | 'analysis' | 'improvement';

export enum AIModel {
 // Gemini 2.5 models (latest and recommended)
  GEMINI_PRO = 'gemini-2.5-pro',           // Most advanced reasoning model
  GEMINI_FLASH_2_0 = 'gemini-2.5-flash',  // Best balance of price/performance
  
  // Gemini 2.0 models  
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',  // Previous generation flash model
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite', // Optimized for cost efficiency
  
  // OpenAI models (for future implementation)
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  
  // Custom models
  CUSTOM = 'custom'
}

export const ModelInfo = {
  [AIModel.GEMINI_PRO]: {
    name: 'Gemini 2.5 Pro',
    description: 'Most advanced reasoning model with thinking capabilities',
    maxTokens: 2000000, // 2M context window
    costPer1kTokens: 0.7, // in cents
    features: ['thinking', 'multimodal', 'long-context', 'code-generation'],
    recommended: true
  },
  [AIModel.GEMINI_FLASH_2_0]: {
    name: 'Gemini 2.5 Flash', 
    description: 'Best balance of price and performance with thinking',
    maxTokens: 1000000, // 1M context window
    costPer1kTokens: 0.075, // in cents
    features: ['thinking', 'multimodal', 'fast', 'cost-efficient'],
    recommended: true
  },
  [AIModel.GEMINI_2_0_FLASH]: {
    name: 'Gemini 2.0 Flash',
    description: 'Previous generation multimodal model',
    maxTokens: 1000000,
    costPer1kTokens: 0.075,
    features: ['multimodal', 'fast'],
    recommended: false
  },
  [AIModel.GEMINI_2_0_FLASH_LITE]: {
    name: 'Gemini 2.0 Flash Lite',
    description: 'Cost-optimized model for high-volume tasks',
    maxTokens: 1000000,
    costPer1kTokens: 0.05,
    features: ['cost-efficient', 'fast'],
    recommended: false
  },
  [AIModel.GPT_4]: {
    name: 'GPT-4',
    description: 'OpenAI GPT-4 model (not yet implemented)',
    maxTokens: 128000,
    costPer1kTokens: 3.0,
    features: ['advanced-reasoning'],
    recommended: false
  },
  [AIModel.GPT_4_TURBO]: {
    name: 'GPT-4 Turbo',
    description: 'OpenAI GPT-4 Turbo (not yet implemented)',
    maxTokens: 128000,
    costPer1kTokens: 1.0,
    features: ['advanced-reasoning', 'fast'],
    recommended: false
  },
  [AIModel.CUSTOM]: {
    name: 'Custom Model',
    description: 'Custom AI model configuration',
    maxTokens: 100000,
    costPer1kTokens: 1.0,
    features: ['custom'],
    recommended: false
  }
};

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  model: AIModel;
  isPublic: boolean;
  isPremium: boolean;
  creatorId?: string;
  usageCount: number;
  averageRating?: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIGenerationRequest {
  id: string;
  userId: string;
  promptTemplate?: string;
  customPrompt?: string;
  model: AIModel;
  jobPosition: string;
  company: string;
  userData?: {
    experience?: string;
    skills?: string[];
    education?: string;
    achievements?: string[];
  };
  createdAt: Date;
}

export interface AIGenerationResponse {
  id: string;
  requestId: string;
  userId: string;
  content: string;
  model: AIModel;
  tokens: number;
  processingTime: number; // en millisecondes
  rating?: number; // Évaluation donnée par l'utilisateur
  feedback?: string; // Commentaire de l'utilisateur
  createdAt: Date;
}

// Pour le suivi et la facturation
export interface AIUsageLog {
  id: string;
  userId: string;
  subscriptionId?: string;
  model: AIModel;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // en centimes
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

// Pour l'amélioration du service
export interface AIFeedback {
  id: string;
  userId: string;
  generationId: string;
  rating: number; // 1-5
  feedback?: string;
  improvementSuggestions?: string;
  createdAt: Date;
}

// Pour les limitations et quotas
export interface AIQuota {
  userId: string;
  planId: string;
  monthlyLimit: number | null; // null = illimité
  currentUsage: number;
  resetDate: Date;
  lastUpdated: Date;
}

// Pour les suggestions d'amélioration
export interface AILetterImprovement {
  id: string;
  letterId: string;
  userId: string;
  originalContent: string;
  suggestedContent: string;
  improvements: {
    category: 'clarity' | 'impact' | 'grammar' | 'style' | 'structure';
    description: string;
  }[];
  applied: boolean;
  createdAt: Date;
}

/**
 * Model selection helper
 */
export class ModelSelector {
  /**
   * Get recommended model based on use case
   */
  static getRecommendedModel(useCase: 'generation' | 'analysis' | 'improvement' | 'budget'): AIModel {
    switch (useCase) {
      case 'generation':
        return AIModel.GEMINI_FLASH_2_0; // Best balance for letter generation
      case 'analysis':
        return AIModel.GEMINI_PRO; // Most advanced for detailed analysis
      case 'improvement':
        return AIModel.GEMINI_FLASH_2_0; // Good balance for improvements
      case 'budget':
        return AIModel.GEMINI_2_0_FLASH_LITE; // Most cost-effective
      default:
        return AIModel.GEMINI_FLASH_2_0;
    }
  }

  /**
   * Check if model is available and recommended
   */
  static isModelRecommended(model: AIModel): boolean {
    return ModelInfo[model]?.recommended || false;
  }

  /**
   * Get available models for UI selection
   */
  static getAvailableModels(): Array<{
    value: AIModel;
    label: string;
    description: string;
    cost: number;
    recommended: boolean;
  }> {
    return Object.entries(ModelInfo)
      .filter(([model]) => model !== AIModel.CUSTOM)
      .map(([model, info]) => ({
        value: model as AIModel,
        label: info.name,
        description: info.description,
        cost: info.costPer1kTokens,
        recommended: info.recommended
      }))
      .sort((a, b) => {
        // Sort by recommended first, then by cost
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return a.cost - b.cost;
      });
  }
}