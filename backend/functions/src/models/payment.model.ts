// src/models/payment.model.ts - Version PayPal corrigée et nettoyée

// ==========================================
// ÉNUMÉRATIONS DE BASE
// ==========================================

export enum Currency {
  EUR = "eur",
  USD = "usd",
  GBP = "gbp",
  CAD = "cad",
  JPY = "jpy"
}

export enum PaymentStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded", 
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
  DISPUTED = "disputed"
}

export enum PaymentMethod {
  PAYPAL = "paypal",
  CARD = "card", // Pour compatibilité future
  BANK_TRANSFER = "bank_transfer",
  APPLE_PAY = "apple_pay",
  GOOGLE_PAY = "google_pay"
}

// ==========================================
// TYPES DE PLAN ET INTERVALLES
// ==========================================

export type PlanType = 'basic' | 'pro' | 'premium';
export type SubscriptionInterval = 'monthly' | 'yearly' | 'lifetime';

// Types pour la structure des prix
export type PlanPrices = {
  [key in Currency]: {
    [plan in PlanType]: {
      [interval in SubscriptionInterval]: number;
    };
  };
};

// ==========================================
// INTERFACES PRINCIPALES
// ==========================================

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  planId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethod;
  description?: string;
  receiptUrl?: string;
  refundReason?: string;
  
  // Champs PayPal spécifiques
  paypalOrderId?: string;          // ID de l'ordre PayPal (paiements uniques)
  paypalCaptureId?: string;        // ID de capture PayPal
  paypalSubscriptionId?: string;   // ID d'abonnement PayPal (récurrents)
  paypalPayerId?: string;          // ID du payeur PayPal
  
  // Informations sur le plan
  planType: PlanType;
  interval: SubscriptionInterval;
  
  // Métadonnées
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  paymentId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amount: number;
  currency: Currency;
  status: 'paid' | 'unpaid' | 'void';
  dueDate: Date;
  paidDate?: Date;
  items: InvoiceItem[];
  taxRate?: number;
  taxAmount?: number;
  
  // Champs PayPal spécifiques
  paypalInvoiceId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  planId?: string;
}

// ==========================================
// WEBHOOKS PAYPAL
// ==========================================

export interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: any;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export enum PayPalWebhookEventType {
  PAYMENT_CAPTURE_COMPLETED = 'PAYMENT.CAPTURE.COMPLETED',
  PAYMENT_CAPTURE_DENIED = 'PAYMENT.CAPTURE.DENIED',
  PAYMENT_CAPTURE_FAILED = 'PAYMENT.CAPTURE.FAILED',
  BILLING_SUBSCRIPTION_CREATED = 'BILLING.SUBSCRIPTION.CREATED',
  BILLING_SUBSCRIPTION_ACTIVATED = 'BILLING.SUBSCRIPTION.ACTIVATED',
  BILLING_SUBSCRIPTION_CANCELLED = 'BILLING.SUBSCRIPTION.CANCELLED',
  BILLING_SUBSCRIPTION_SUSPENDED = 'BILLING.SUBSCRIPTION.SUSPENDED',
  BILLING_SUBSCRIPTION_PAYMENT_FAILED = 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
}

// ==========================================
// CONFIGURATION DES PRIX
// ==========================================

export const PLAN_PRICES: PlanPrices = {
  [Currency.EUR]: {
    basic: {
      monthly: 9.99,
      yearly: 99.99,      // ~8.33€/mois (-17%)
      lifetime: 199.99    // Équivaut à ~20 mois
    },
    pro: {
      monthly: 19.99,
      yearly: 199.99,     // ~16.67€/mois (-17%)
      lifetime: 399.99    // Équivaut à ~20 mois
    },
    premium: {
      monthly: 39.99,
      yearly: 399.99,     // ~33.33€/mois (-17%)
      lifetime: 799.99    // Équivaut à ~20 mois
    }
  },
  [Currency.USD]: {
    basic: {
      monthly: 10.99,
      yearly: 109.99,
      lifetime: 219.99
    },
    pro: {
      monthly: 21.99,
      yearly: 219.99,
      lifetime: 439.99
    },
    premium: {
      monthly: 43.99,
      yearly: 439.99,
      lifetime: 879.99
    }
  },
  [Currency.GBP]: {
    basic: {
      monthly: 8.99,
      yearly: 89.99,
      lifetime: 179.99
    },
    pro: {
      monthly: 17.99,
      yearly: 179.99,
      lifetime: 359.99
    },
    premium: {
      monthly: 35.99,
      yearly: 359.99,
      lifetime: 719.99
    }
  },
  [Currency.CAD]: {
    basic: {
      monthly: 13.99,
      yearly: 139.99,
      lifetime: 279.99
    },
    pro: {
      monthly: 27.99,
      yearly: 279.99,
      lifetime: 559.99
    },
    premium: {
      monthly: 55.99,
      yearly: 559.99,
      lifetime: 1119.99
    }
  },
  [Currency.JPY]: {
    basic: {
      monthly: 1599,
      yearly: 15999,
      lifetime: 31999
    },
    pro: {
      monthly: 3199,
      yearly: 31999,
      lifetime: 63999
    },
    premium: {
      monthly: 6399,
      yearly: 63999,
      lifetime: 127999
    }
  }
};

// ==========================================
// CONFIGURATION DES COÛTS IA
// ==========================================

export type AIUsageCosts = {
  [key in Currency]?: {
    [model: string]: {
      perRequest: number;
      perToken: number;
    };
  };
};

export const AI_USAGE_COSTS: AIUsageCosts = {
  [Currency.EUR]: {
    'gemini-pro': {
      perRequest: 5,    // 0.05€ par requête
      perToken: 0.01,   // 0.0001€ par token
    }
  },
  [Currency.USD]: {
    'gemini-pro': {
      perRequest: 6,    // 0.06$ par requête
      perToken: 0.01,   // 0.0001$ par token
    }
  },
  [Currency.GBP]: {
    'gemini-pro': {
      perRequest: 4,    // 0.04£ par requête
      perToken: 0.01,   // 0.0001£ par token
    }
  },
  [Currency.CAD]: {
    'gemini-pro': {
      perRequest: 7,    // 0.07$ CAD par requête
      perToken: 0.01,   // 0.0001$ CAD par token
    }
  },
  [Currency.JPY]: {
    'gemini-pro': {
      perRequest: 8,    // 8¥ par requête
      perToken: 0.01,   // 0.01¥ par token
    }
  }
};

// ==========================================
// CONFIGURATION PAYPAL
// ==========================================

export interface PayPalPlanConfig {
  id: string;
  name: string;
  description: string;
  type: 'SERVICE' | 'DIGITAL_GOODS';
  category: 'SOFTWARE' | 'DIGITAL_MEDIA_BOOKS_MOVIES_MUSIC';
  image_url?: string;
  home_url?: string;
}

export const PAYPAL_PLAN_CONFIGS: Record<PlanType, PayPalPlanConfig> = {
  basic: {
    id: 'basic-plan',
    name: 'Plan Basique',
    description: 'Accès aux fonctionnalités de base pour la génération de lettres de motivation',
    type: 'SERVICE',
    category: 'SOFTWARE'
  },
  pro: {
    id: 'pro-plan',
    name: 'Plan Professionnel',
    description: 'Accès complet avec IA avancée et templates premium',
    type: 'SERVICE',
    category: 'SOFTWARE'
  },
  premium: {
    id: 'premium-plan',
    name: 'Plan Premium',
    description: 'Accès illimité à toutes les fonctionnalités et support VIP',
    type: 'SERVICE',
    category: 'SOFTWARE'
  }
};

// ==========================================
// UTILITAIRES
// ==========================================

/**
 * Convertir les montants entre devises (taux simplifiés)
 */
export function convertAmount(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
  // Taux de change simplifiés (à remplacer par une API en production)
  const exchangeRates = {
    [Currency.EUR]: 1,
    [Currency.USD]: 1.1,
    [Currency.GBP]: 0.85,
    [Currency.CAD]: 1.5,
    [Currency.JPY]: 160
  };
  
  // Convertir d'abord en EUR (devise de base)
  const amountInEUR = fromCurrency === Currency.EUR 
    ? amount 
    : amount / exchangeRates[fromCurrency];
  
  // Puis convertir de EUR vers la devise cible
  return toCurrency === Currency.EUR 
    ? amountInEUR 
    : amountInEUR * exchangeRates[toCurrency];
}

/**
 * Formater les montants selon la devise
 */
export function formatAmount(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  
  return formatter.format(amount);
}

/**
 * Obtenir le locale approprié pour une devise
 */
export function getCurrencyLocale(currency: Currency): string {
  const locales = {
    [Currency.EUR]: 'fr-FR',
    [Currency.USD]: 'en-US',
    [Currency.GBP]: 'en-GB',
    [Currency.CAD]: 'en-CA',
    [Currency.JPY]: 'ja-JP'
  };
  return locales[currency] || 'en-US';
}

/**
 * Générer un ID de plan PayPal
 */
export function getPayPalPlanId(planType: PlanType, interval: SubscriptionInterval): string {
  return `CLG_${planType}_${interval}_plan`.toUpperCase();
}

/**
 * Parser un montant PayPal
 */
export function parsePayPalAmount(amount: string | number): number {
  return typeof amount === 'string' ? parseFloat(amount) : amount;
}

/**
 * Formater un montant pour PayPal (2 décimales)
 */
export function formatPayPalAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Calculer les économies pour un intervalle donné
 */
export function calculateSavings(planType: PlanType, interval: SubscriptionInterval, currency: Currency): number {
  if (interval === 'monthly') return 0;
  
  const prices = PLAN_PRICES[currency][planType];
  const monthlyPrice = prices.monthly;
  const selectedPrice = prices[interval];
  
  const equivalentMonthly = interval === 'yearly' 
    ? monthlyPrice * 12 
    : monthlyPrice * 24; // Estimation pour lifetime
  
  return Math.round(((equivalentMonthly - selectedPrice) / equivalentMonthly) * 100);
}

/**
 * Obtenir le label d'affichage pour un intervalle
 */
export function getIntervalLabel(interval: SubscriptionInterval): string {
  const labels = {
    monthly: 'Mensuel',
    yearly: 'Annuel',
    lifetime: 'À vie'
  };
  return labels[interval] || 'Inconnu';
}

/**
 * Obtenir le label d'affichage pour un type de plan
 */
export function getPlanLabel(planType: PlanType): string {
  const labels = {
    basic: 'Basique',
    pro: 'Professionnel',
    premium: 'Premium'
  };
  return labels[planType] || 'Inconnu';
}

/**
 * Valider une combinaison plan/intervalle/devise
 */
export function isValidPlanCombination(planType: PlanType, interval: SubscriptionInterval, currency: Currency): boolean {
  return !!(PLAN_PRICES[currency]?.[planType]?.[interval]);
}

/**
 * Obtenir le prix d'un plan
 */
export function getPlanPrice(planType: PlanType, interval: SubscriptionInterval, currency: Currency): number | null {
  return PLAN_PRICES[currency]?.[planType]?.[interval] || null;
}