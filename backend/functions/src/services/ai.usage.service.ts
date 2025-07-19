import { AIModel, ModelInfo } from "../models/ai.model";

export class AIUsageService {
  /**
   * Calculer le coût d'une requête IA
   */
  static calculateCost(model: AIModel, tokensUsed: number): number {
    const modelInfo = ModelInfo[model];
    if (!modelInfo) return 0;
    
    return (tokensUsed / 1000) * modelInfo.costPer1kTokens;
  }

  /**
   * Vérifier si l'utilisateur peut utiliser l'IA
   */
  static async canUseAI(userId: string, model: AIModel): Promise<{
    canUse: boolean;
    reason?: string;
    remainingQuota?: number;
  }> {
    // Cette méthode devrait vérifier la base de données pour :
    // - Le plan d'abonnement de l'utilisateur
    // - Son usage actuel du mois
    // - Les limites de son plan
    
    // Implémentation simplifiée - à remplacer par la vraie logique
    return {
      canUse: true,
      remainingQuota: 100
    };
  }

  /**
   * Enregistrer l'usage d'IA
   */
  static async logAIUsage(
    userId: string, 
    model: AIModel, 
    tokensUsed: number, 
    success: boolean,
    cost: number
  ): Promise<void> {
    // Enregistrer en base de données
    const usageLog = {
      userId,
      model,
      tokensUsed,
      cost,
      success,
      timestamp: new Date()
    };
    
    // TODO: Sauvegarder en base
    console.log('AI Usage logged:', usageLog);
  }
}



