// services/subscription.service.ts - Service frontend mis à jour (Partie 1/2)
import api from './api';
import type { Subscription, Plan } from '../types';

export interface AIUsageLimit {
  canUse: boolean;
  currentUsage: number;
  limit: number | null;
  resetDate: Date | null;
  plan: string;
}

export interface LetterLimit {
  canCreate: boolean;
  currentCount: number;
  limit: number | null;
  plan: string;
}

// Interface pour les timestamps Firebase
interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

// Interface pour les statistiques d'abonnement
export interface SubscriptionStats {
  totalActiveSubscriptions: number;
  monthlyRevenue: number;
  churnRate: number;
  planDistribution: Record<string, number>;
  aiUsageStats: {
    totalGenerations: number;
    averagePerUser: number;
  };
  userGrowth: {
    newThisMonth: number;
    growthRate: number;
  };
}

class SubscriptionService {

  firebaseTimeStamptoDate(params:unknown): Date {
    if (params && typeof params === 'object' && '_seconds' in params) {
      const timestamp = params as FirebaseTimestamp;
      const milliseconds = timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000;
      return new Date(milliseconds);
    }
    return new Date();
  }
  /**
   * Récupérer l'abonnement actif de l'utilisateur
   */
  async getActiveSubscription(): Promise<Subscription> {
    try {
      const response = await api.get('/subscriptions/current');
      
      // Convertir les dates string en objets Date
      const subscription = response.data.data;
      if (subscription) {
        subscription.startDate = subscription.startDate ? this.firebaseTimeStamptoDate(subscription.startDate) : null;
        subscription.endDate = subscription.endDate ? this.firebaseTimeStamptoDate(subscription.endDate) : null;
        subscription.currentPeriodStart = subscription.currentPeriodStart ? this.firebaseTimeStamptoDate(subscription.currentPeriodStart) : null;
        subscription.currentPeriodEnd = subscription.currentPeriodEnd ? this.firebaseTimeStamptoDate(subscription.currentPeriodEnd) : null;
        subscription.createdAt = subscription.createdAt ? this.firebaseTimeStamptoDate(subscription.createdAt) : null;
        subscription.updatedAt = subscription.updatedAt ? this.firebaseTimeStamptoDate(subscription.updatedAt) : null;
      }
      
      return subscription;
    } catch (error: unknown) {
      console.error('Erreur...', error);
  
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Message d\'erreur par défaut');
    }
  }

  /**
   * Récupérer tous les plans disponibles
   */
  async getPlans(): Promise<Plan[]> {
    try {
      const response = await api.get('/subscriptions/plans');
      return response.data.data ;
    } catch (error: unknown) {
      console.error('Erreur récupération plans:', error);
      
      // Retourner des plans par défaut en cas d'erreur
      return this.getDefaultPlans();
    }
  }

  /**
   * Plans par défaut (fallback)
   */
  private getDefaultPlans(): Plan[] {
    return [
      {
        id: 'basic',
        name: 'Basique',
        description: 'Plan basique pour utilisateurs occasionnels',
        features: [
          'Lettres illimitées',
          '5 générations IA par mois',
          'Templates premium',
          'Export PDF/DOCX'
        ],
        price: 9.99,
        currency: 'eur',
        interval: 'month',
        trialDays: 7,
        isActive: true,
        monthlyAILimit: 5,
        unlimitedAI: false
      },
      {
        id: 'pro',
        name: 'Professionnel',
        description: 'Plan professionnel avec IA avancée',
        features: [
          'Lettres illimitées',
          '20 générations IA par mois',
          'Tous les templates',
          'Analyses IA avancées',
          'Support prioritaire'
        ],
        price: 19.99,
        currency: 'eur',
        interval: 'month',
        trialDays: 14,
        isActive: true,
        monthlyAILimit: 20,
        unlimitedAI: false
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'Plan premium avec IA illimitée',
        features: [
          'Lettres illimitées',
          'Générations IA illimitées',
          'Tous les templates',
          'Analyses IA avancées',
          'Support VIP',
          'Accès anticipé aux nouvelles fonctionnalités'
        ],
        price: 39.99,
        currency: 'eur',
        interval: 'month',
        trialDays: 30,
        isActive: true,
        monthlyAILimit: 1000000, // Illimité
        unlimitedAI: true
      }
    ];
  }

  /**
   * Créer un abonnement gratuit
   */
  async createFreeSubscription(): Promise<Subscription> {
    try {
      const response = await api.post('/subscriptions/free');
      return response.data;
    } catch (error: unknown) {
      console.error('Erreur création abonnement gratuit:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur création abonnement gratuit');
    }
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    try {
      await api.post(`/subscriptions/${subscriptionId}/cancel`, {
        reason: reason || 'Annulé par l\'utilisateur'
      });
    } catch (error: unknown) {
      console.error('Erreur annulation abonnement:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur annulation abonnement');
    }
  }

  /**
   * Réactiver un abonnement
   */
   /**
   * Réactiver un abonnement
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      await api.post(`/subscriptions/${subscriptionId}/reactivate`);
    } catch (error: unknown) {
      console.error('Erreur réactivation abonnement:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur réactivation abonnement');
    }
  }

  /**
   * Vérifier les limites d'utilisation de l'IA
   */
  async checkAIUsageLimit(): Promise<AIUsageLimit> {
    try {
      const response = await api.get('/subscriptions/ai-usage-limit');
      const data = response.data;
      
      return {
        canUse: data.canUse,
        currentUsage: data.currentUsage,
        limit: data.limit,
        resetDate: data.resetDate ? new Date(data.resetDate) : null,
        plan: data.plan
      };
    } catch (error: unknown) {
      console.error('Erreur vérification limites IA:', error);
      
      // Retourner des valeurs par défaut pour plan gratuit
      return {
        canUse: false,
        currentUsage: 0,
        limit: 0,
        resetDate: null,
        plan: 'free'
      };
    }
  }

  /**
   * Vérifier les limites de création de lettres
   */
  async checkLetterLimit(): Promise<LetterLimit> {
    try {
      const response = await api.get('/subscriptions/letter-limit');
      const data = response.data;
      
      return {
        canCreate: data.canCreate,
        currentCount: data.currentCount,
        limit: data.limit,
        plan: data.plan
      };
    } catch (error: unknown) {
      console.error('Erreur vérification limites lettres:', error);
      
      // Retourner des valeurs par défaut pour plan gratuit
      return {
        canCreate: false,
        currentCount: 0,
        limit: 3,
        plan: 'free'
      };
    }
  }

  /**
   * Incrémenter l'utilisation de l'IA
   */
  async incrementAIUsage(): Promise<void> {
    try {
      await api.post('/subscriptions/increment-ai-usage');
    } catch (error: unknown) {
      console.error('Erreur incrémentation IA:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur incrémentation IA');
    }
  }

  /**
   * Récupérer les statistiques d'abonnement
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    try {
      const response = await api.get('/subscriptions/stats');
      return response.data;
    } catch (error: unknown) {
      console.error('Erreur récupération stats abonnement:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur récupération stats abonnemnt');
    }
  }

  /**
   * Changer de plan d'abonnement
   */
  async changePlan(newPlanId: string): Promise<Subscription> {
    try {
      const response = await api.post('/subscriptions/change-plan', {
        planId: newPlanId
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Erreur changement de plan:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur changement de plan');
    }
  }

  /**
   * Vérifier si une fonctionnalité est disponible
   */
  async checkFeatureAccess(feature: string): Promise<boolean> {
    try {
      const response = await api.get(`/subscriptions/feature-access/${feature}`);
      return response.data.hasAccess;
    } catch (error: unknown) {
      console.error('Erreur vérification fonctionnalité:', error);
      return false; // Par défaut, pas d'accès
    }
  }

  /**
   * Obtenir le plan recommandé pour l'utilisateur
   */
  async getRecommendedPlan(): Promise<Plan | null> {
    try {
      const response = await api.get('/subscriptions/recommended-plan');
      return response.data.plan;
    } catch (error: unknown) {
      console.error('Erreur récupération plan recommandé:', error);
      return null;
    }
  }

  /**
   * Estimer le coût d'un upgrade
   */
  async estimateUpgradeCost(targetPlanId: string): Promise<{
    prorationAmount: number;
    nextBillingAmount: number;
    currency: string;
  }> {
    try {
      const response = await api.post('/subscriptions/estimate-upgrade', {
        targetPlanId
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Erreur estimation coût upgrade:', error);
      const isAxiosError = error && typeof error === 'object' && 'response' in error;
      const errorMessage = isAxiosError 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error ? error.message : 'Erreur inconnue';
        
      throw new Error(errorMessage || 'Erreur estimation de coût upgrade');
    }
  }
}

export default new SubscriptionService();