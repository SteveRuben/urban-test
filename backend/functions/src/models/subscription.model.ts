// models/subscription.model.ts - Modèle d'abonnement mis à jour pour PayPal
import { PlanType, SubscriptionInterval } from './payment.model';

/**
 * Interface pour les plans d'abonnement
 */
export interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'lifetime';
  trialDays: number;
  isActive: boolean;
  monthlyAILimit?: number | null; // null = illimité
  unlimitedAI?: boolean;
  
  // Nouvelles propriétés pour compatibilité PayPal
  planType?: PlanType; // Mapping vers les types PayPal
  stripePriceId?: string; // Pour compatibilité Stripe
  paypalPlanId?: string; // ID du plan PayPal
}

/**
 * Énumération des fonctionnalités disponibles
 */
export enum SubscriptionPlanFeature {
  AI_GENERATION = "ai_generation",
  UNLIMITED_LETTERS = "unlimited_letters",
  TEMPLATES_ACCESS = "templates_access",
  PREMIUM_TEMPLATES = "premium_templates",
  EXPORT_PDF = "export_pdf",
  EXPORT_DOCX = "export_docx",
  ANALYTICS = "analytics",
  ADVANCED_ANALYTICS = "advanced_analytics",
  PRIORITY_SUPPORT = "priority_support",
  VIP_SUPPORT = "vip_support",
  CUSTOM_BRANDING = "custom_branding",
  API_ACCESS = "api_access"
}

/**
 * Configuration des plans par défaut
 */
export const SUBSCRIPTION_PLANS: Record<string, {
  name: string,
  features: SubscriptionPlanFeature[],
  aiLimit: number | null,
  letterLimit: number | null
}> = {
  FREE: {
    name: "Gratuit",
    features: [
      SubscriptionPlanFeature.TEMPLATES_ACCESS,
      SubscriptionPlanFeature.EXPORT_PDF
    ],
    aiLimit: 0,
    letterLimit: 3
  },
  BASIC: {
    name: "Basique", 
    features: [
      SubscriptionPlanFeature.TEMPLATES_ACCESS,
      SubscriptionPlanFeature.UNLIMITED_LETTERS,
      SubscriptionPlanFeature.AI_GENERATION,
      SubscriptionPlanFeature.EXPORT_PDF,
      SubscriptionPlanFeature.EXPORT_DOCX
    ],
    aiLimit: 5,
    letterLimit: null // illimité
  },
  PRO: {
    name: "Professionnel",
    features: [
      SubscriptionPlanFeature.TEMPLATES_ACCESS,
      SubscriptionPlanFeature.PREMIUM_TEMPLATES,
      SubscriptionPlanFeature.UNLIMITED_LETTERS,
      SubscriptionPlanFeature.AI_GENERATION,
      SubscriptionPlanFeature.EXPORT_PDF,
      SubscriptionPlanFeature.EXPORT_DOCX,
      SubscriptionPlanFeature.ANALYTICS
    ],
    aiLimit: 20,
    letterLimit: null // illimité
  },
  PREMIUM: {
    name: "Premium",
    features: [
      SubscriptionPlanFeature.TEMPLATES_ACCESS,
      SubscriptionPlanFeature.PREMIUM_TEMPLATES,
      SubscriptionPlanFeature.UNLIMITED_LETTERS,
      SubscriptionPlanFeature.AI_GENERATION,
      SubscriptionPlanFeature.EXPORT_PDF,
      SubscriptionPlanFeature.EXPORT_DOCX,
      SubscriptionPlanFeature.ANALYTICS,
      SubscriptionPlanFeature.ADVANCED_ANALYTICS,
      SubscriptionPlanFeature.VIP_SUPPORT,
      SubscriptionPlanFeature.CUSTOM_BRANDING
    ],
    aiLimit: null, // illimité
    letterLimit: null // illimité
  }
} ;//as const;

/**
 * Types de plans d'abonnement
 */
export enum SubscriptionPlan {
  FREE = "free",
  BASIC = "basic", 
  PRO = "pro",
  PREMIUM = "premium",
  // Conservé pour compatibilité descendante
  MONTHLY = "monthly",
  LIFETIME = "lifetime"
}

/**
 * Statuts d'abonnement
 */
export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  EXPIRED = "expired", 
  CANCELLED = "cancelled",
  TRIAL = "trial",
  PENDING = "pending", // En attente de confirmation de paiement
  PAST_DUE = "past_due", // Paiement en retard
  PAUSED = "paused" // Abonnement suspendu temporairement
}

/**
 * Interface principale pour les abonnements
 */
export interface Subscription {
  id: string;
  userId: string;
  planId: string; // Référence à un Plan dans la collection plans
  plan: SubscriptionPlan; // Type de plan
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date; // undefined pour les abonnements lifetime
  
  // Informations de paiement
  paymentId?: string;
  
  // Champs PayPal spécifiques
  paypalSubscriptionId?: string; // ID de l'abonnement PayPal
  paypalOrderId?: string; // ID de la commande PayPal
  paypalPlanId?: string; // ID du plan PayPal
  
  // Champs Stripe (pour compatibilité)
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  
  // Gestion des essais
  trialCount?: number; // Nombre d'essais gratuits utilisés
  trialStartDate?: Date;
  trialEndDate?: Date;
  
  // Utilisation de l'IA
  aiUsageCount?: number; // Utilisation actuelle dans le cycle
  aiUsageReset?: Date; // Date de réinitialisation du compteur
  aiUsageTotalAllTime?: number; // Usage total depuis le début
  
  // Gestion du renouvellement
  isAutoRenew?: boolean; // Renouvellement automatique
  cancelAtPeriodEnd?: boolean; // Annulation en fin de période
  cancelReason?: string; // Raison de l'annulation
  cancelledAt?: Date; // Date d'annulation
  
  // Périodes de facturation (pour PayPal)
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  billingCycleAnchor?: Date; // Ancrage du cycle de facturation
  
  // Métadonnées et suivi
  source?: 'web' | 'mobile' | 'api'; // Source de création
  promocode?: string; // Code promo utilisé
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    code: string;
    validUntil?: Date;
  };
  
  // Historique des changements
  planHistory?: Array<{
    planId: string;
    plan: SubscriptionPlan;
    startDate: Date;
    endDate?: Date;
    reason?: string;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Champs calculés (non stockés en DB)
  remainingDays?: number;
  isExpired?: boolean;
  canUseAI?: boolean;
  aiLimitRemaining?: number;
}

/**
 * Interface pour les statistiques d'abonnement
 */
export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  trialSubscriptions: number;
  
  subscriptionsByPlan: Record<SubscriptionPlan, number>;
  monthlyRevenue: number;
  yearlyRevenue: number;
  
  churnRate: number; // Taux d'attrition
  retentionRate: number; // Taux de rétention
  
  averageLifetimeValue: number; // Valeur vie client moyenne
  averageMonthlyRevenue: number; // Revenu mensuel moyen
}

/**
 * Interface pour les changements d'abonnement
 */
export interface SubscriptionChange {
  id: string;
  subscriptionId: string;
  userId: string;
  changeType: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'renew';
  fromPlan: SubscriptionPlan;
  toPlan?: SubscriptionPlan;
  effectiveDate: Date;
  reason?: string;
  prorationAmount?: number; // Montant de proratisation
  createdAt: Date;
}

/**
 * Utilitaires pour les abonnements
 */
export class SubscriptionUtils {
  /**
   * Vérifier si un plan a une fonctionnalité
   */
  static hasPlanFeature(plan: SubscriptionPlan, feature: SubscriptionPlanFeature): boolean {
    const planConfig = SUBSCRIPTION_PLANS[plan.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS];
    return planConfig?.features.includes(feature) || false;
  }
  
  /**
   * Obtenir la limite IA d'un plan
   */
  static getAILimit(plan: SubscriptionPlan): number | null {
    const planConfig = SUBSCRIPTION_PLANS[plan.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS];
    return planConfig?.aiLimit || 0;
  }
  
  /**
   * Obtenir la limite de lettres d'un plan
   */
  static getLetterLimit(plan: SubscriptionPlan): number | null {
    const planConfig = SUBSCRIPTION_PLANS[plan.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS];
    return planConfig?.letterLimit || 0;
  }
  
  /**
   * Vérifier si un abonnement est actif
   */
  static isActive(subscription: Subscription): boolean {
    return subscription.status === SubscriptionStatus.ACTIVE ||
           subscription.status === SubscriptionStatus.TRIAL;
  }
  
  /**
   * Vérifier si un abonnement a expiré
   */
  static isExpired(subscription: Subscription): boolean {
    if (!subscription.endDate) return false; // Lifetime
    return new Date() > subscription.endDate;
  }
  
  /**
   * Calculer les jours restants
   */
  static getRemainingDays(subscription: Subscription): number | null {
    if (!subscription.endDate) return null; // Lifetime
    const now = new Date();
    const diffTime = subscription.endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Mapper PlanType vers SubscriptionPlan
   */
  static mapPlanTypeToSubscriptionPlan(planType: PlanType): SubscriptionPlan {
    const mapping: Record<PlanType, SubscriptionPlan> = {
      basic: SubscriptionPlan.BASIC,
      pro: SubscriptionPlan.PRO,
      premium: SubscriptionPlan.PREMIUM
    };
    return mapping[planType] || SubscriptionPlan.FREE;
  }
  
  /**
   * Mapper SubscriptionPlan vers PlanType
   */
  static mapSubscriptionPlanToPlanType(plan: SubscriptionPlan): PlanType | null {
    const mapping: Record<SubscriptionPlan, PlanType | null> = {
      [SubscriptionPlan.FREE]: null,
      [SubscriptionPlan.BASIC]: 'basic',
      [SubscriptionPlan.PRO]: 'pro', 
      [SubscriptionPlan.PREMIUM]: 'premium',
      [SubscriptionPlan.MONTHLY]: 'basic', // Mapping par défaut
      [SubscriptionPlan.LIFETIME]: 'premium' // Mapping par défaut
    };
    return mapping[plan] || null;
  }
  
  /**
   * Calculer le prochain cycle de facturation
   */
  static getNextBillingDate(
    currentDate: Date, 
    interval: SubscriptionInterval
  ): Date {
    const nextDate = new Date(currentDate);
    
    switch (interval) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'lifetime':
        nextDate.setFullYear(nextDate.getFullYear() + 125); // Pas de prochaine facture
        break; // Lifetime, pas de prochaine facture
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
  }
  
  /**
   * Valider les données d'abonnement
   */
  static validateSubscriptionData(data: Partial<Subscription>): string[] {
    const errors: string[] = [];
    
    if (!data.userId) errors.push('userId est requis');
    if (!data.planId) errors.push('planId est requis');
    if (!data.plan) errors.push('plan est requis');
    if (!data.status) errors.push('status est requis');
    
    if (data.endDate && data.startDate && data.endDate <= data.startDate) {
      errors.push('La date de fin doit être postérieure à la date de début');
    }
    
    if (data.aiUsageCount && data.aiUsageCount < 0) {
      errors.push('L\'utilisation IA ne peut pas être négative');
    }
    
    return errors;
  }
}

/**
 * Types pour les événements d'abonnement
 */
export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  userId: string;
  eventType: 'created' | 'updated' | 'cancelled' | 'expired' | 'renewed' | 'trial_started' | 'trial_ended';
  data: any;
  source: 'system' | 'user' | 'webhook';
  createdAt: Date;
}

/**
 * Configuration des webhooks d'abonnement
 */
export interface SubscriptionWebhookConfig {
  endpoint: string;
  events: string[];
  secret?: string;
  isActive: boolean;
}

/**
 * Export des types pour la compatibilité
 */
export type { PlanType, SubscriptionInterval } from './payment.model';