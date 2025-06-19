// src/types/subscription.types.ts

import type { Payment } from "../types";

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "expired"
  | "cancelled"
  | "trial"
  | "pending" // En attente de confirmation de paiement
  | "past_due" // Paiement en retard
  | "paused"; // Abonnement suspendu temporairement

// Types liés aux abonnements et plans
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  trialCount?: number; // Nombre d'essais gratuits utilisés
  trialStartDate?: Date;
  trialEndDate?: Date;
  aiUsageCount?: number; // Utilisation actuelle dans le cycle
  aiUsageReset?: Date; // Date de réinitialisation du compteur
  aiUsageTotalAllTime?: number;
}

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
  monthlyAILimit: number;
  unlimitedAI: boolean;
}

export interface SubscriptionData {
  plan: 'free' | 'monthly' | 'lifetime';
  status: 'active' | 'canceled' | 'expired' | 'trial';
  startDate: string;
  nextBillingDate?: string;
  cancelledAt?: string;
  price: number;
  currency: string;
}

export interface SubscriptionState {
  subscription: Subscription | null;
  plans: Plan[];
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
}