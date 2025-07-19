import { AIModel } from "../models/ai.model";
import { AIService } from "./ai.service";
import { AIUsageService } from "./ai.usage.service";

// Interface pour les résultats d'IA avec métadonnées
export interface AIResult<T> {
  data: T;
  metadata: {
    model: AIModel;
    tokensUsed: number;
    processingTime: number;
    cost: number;
    timestamp: Date;
  };
  success: boolean;
  error?: string;
}

// Wrapper pour les appels IA avec gestion des erreurs et métriques
export class AIWrapper {
  //@ts-ignore
  private aiService: AIService;
  
  constructor() {
    this.aiService = new AIService();
  }

  async executeWithMetrics<T>(
    operation: () => Promise<T>,
    userId: string,
    model: AIModel
  ): Promise<AIResult<T>> {
    const startTime = Date.now();
    
    try {
      // Vérifier les quotas
      const canUse = await AIUsageService.canUseAI(userId, model);
      if (!canUse.canUse) {
        throw new Error(canUse.reason || 'Quota d\'IA dépassé');
      }

      // Exécuter l'opération
      const data = await operation();
      const processingTime = Date.now() - startTime;
      
      // Estimer les tokens (simplification)
      const tokensUsed = Math.ceil(JSON.stringify(data).length / 4);
      const cost = AIUsageService.calculateCost(model, tokensUsed);
      
      // Enregistrer l'usage
      await AIUsageService.logAIUsage(userId, model, tokensUsed, true, cost);
      
      return {
        data,
        metadata: {
          model,
          tokensUsed,
          processingTime,
          cost,
          timestamp: new Date()
        },
        success: true
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Enregistrer l'échec
      await AIUsageService.logAIUsage(userId, model, 0, false, 0);
      
      return {
        data: null as any,
        metadata: {
          model,
          tokensUsed: 0,
          processingTime,
          cost: 0,
          timestamp: new Date()
        },
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}