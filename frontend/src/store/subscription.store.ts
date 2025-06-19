// store/subscription.store.ts - Version avec types corrects
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import subscriptionService from '../services/subscription.service';
import paymentService from '../services/payment.service';

// Import des types corrects
import type { Subscription,  Plan} from '../types/subscription.types';
import type { Payment} from '../types/payment.types';

// Types pour les statistiques (si pas définis ailleurs)
export interface PaymentStats {
  totalRevenue: number;
  monthlyPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averageOrderValue: number;
  activeSubscriptions: number;
  conversionRate: number;
  topPlan: string;
  topPaymentMethod: string;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  trialSubscriptions: number;
  subscriptionsByPlan: Record<string, number>;
  churnRate: number;
  retentionRate: number;
}

// Types pour les limites d'utilisation
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

// Types PayPal
export type PlanType = 'basic' | 'pro' | 'premium';
export type SubscriptionInterval = 'monthly' | 'yearly' | 'lifetime';

export interface PayPalSessionData {
  sessionId: string;
  approvalUrl: string;
  paymentId: string;
}

// Interface principale du store
interface SubscriptionState {
  // État principal
  subscription: Subscription | null;
  plans: Plan[];
  payments: Payment[];
  paymentStats: PaymentStats | null;
  subscriptionStats: SubscriptionStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Cache pour les limites
  aiUsageCache: {
    canUse: boolean;
    currentUsage: number;
    limit: number | null;
    resetDate: Date | null;
    lastCheck: Date | null;
  } | null;
  
  letterLimitCache: {
    canCreate: boolean;
    currentCount: number;
    limit: number | null;
    lastCheck: Date | null;
  } | null;
  
  // Actions principales
  fetchSubscription: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
  fetchPaymentStats: () => Promise<void>;
  fetchSubscriptionStats: () => Promise<void>;
  
  // Actions PayPal
  createPayPalSession: (planType: PlanType, interval: SubscriptionInterval) => Promise<PayPalSessionData>;
  confirmPayPalPayment: (paymentId: string, paypalData: any) => Promise<void>;
  cancelPayPalPayment: (paymentId: string, reason?: string) => Promise<void>;
  
  // Actions abonnement
  createFreeSubscription: () => Promise<void>;
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  changePlan: (newPlanId: string) => Promise<void>;
  
  // Actions utilitaires avec cache
  checkAIUsageLimit: (forceRefresh?: boolean) => Promise<AIUsageLimit>;
  checkLetterLimit: (forceRefresh?: boolean) => Promise<LetterLimit>;
  incrementAIUsage: () => Promise<void>;
  
  // Vérifications de fonctionnalités
  hasFeature: (feature: string) => boolean;
  canUseAI: () => boolean;
  canCreateLetter: () => boolean;
  
  // État et utilitaires
  clearError: () => void;
  clearCache: () => void;
  setLoading: (loading: boolean) => void;
  refreshAll: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  devtools(
    persist(
      (set, get) => ({
        // État initial
        subscription: null,
        plans: [],
        payments: [],
        paymentStats: null,
        subscriptionStats: null,
        isLoading: false,
        error: null,
        aiUsageCache: null,
        letterLimitCache: null,
        
        // =====================================
        // ACTIONS PRINCIPALES
        // =====================================
        
        fetchSubscription: async () => {
          set({ isLoading: true, error: null });
          try {
            const subscription = await subscriptionService.getActiveSubscription();
            console.log('Abonnement récupéré:', subscription);
            set({ 
              subscription, 
              isLoading: false,
              // Vider les caches car l'abonnement peut avoir changé
              aiUsageCache: null,
              letterLimitCache: null 
            });
          } catch (error: any) {
            console.error('Erreur fetch subscription:', error);
            if (error.response?.status === 404 || error.response?.status === 400) {
              set({ subscription: null, isLoading: false });
            } else {
              set({ 
                error: error.response?.data?.message || error.message || 'Erreur lors du chargement de l\'abonnement', 
                isLoading: false 
              });
            }
          }
        },
        
        fetchPlans: async () => {
          try {
            const plans = await subscriptionService.getPlans();
            console.log('Plans récupérés:', plans);
            set({ plans });
          } catch (error: any) {
            console.error('Erreur fetch plans:', error);
            set({ 
              error: error.response?.data?.message || error.message || 'Erreur lors du chargement des plans'
            });
          }
        },
        
        fetchPaymentHistory: async () => {
          try {
            const payments = await paymentService.getPaymentHistory();
            console.log('Historique paiements récupéré:', payments);
            set({ payments });
          } catch (error: any) {
            console.error('Erreur fetch payment history:', error);
            if (error.response?.status === 404) {
              set({ payments: [] });
            } else {
              set({ 
                error: error.response?.data?.message || error.message || 'Erreur lors du chargement de l\'historique'
              });
            }
          }
        },
        
        fetchPaymentStats: async () => {
          try {
            const paymentStats = await paymentService.getPaymentStats();
            set({ paymentStats });
          } catch (error: any) {
            console.error('Erreur fetch payment stats:', error);
            // Stats optionnelles, ne pas faire planter l'app
          }
        },
        
        fetchSubscriptionStats: async () => {
          try {
            const subscriptionStats = await subscriptionService.getSubscriptionStats();
            set({ subscriptionStats });
          } catch (error: any) {
            console.error('Erreur fetch subscription stats:', error);
            // Stats optionnelles
          }
        },
        
        // =====================================
        // ACTIONS PAYPAL
        // =====================================
        
        createPayPalSession: async (planType: PlanType, interval: SubscriptionInterval) => {
          set({ isLoading: true, error: null });
          try {
            const session = await paymentService.createPayPalSession(planType, interval);
            console.log('Session PayPal créée:', session);
            set({ isLoading: false });
            return session;
          } catch (error: any) {
            console.error('Erreur création session PayPal:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création de la session PayPal';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        confirmPayPalPayment: async (paymentId: string, paypalData: any) => {
          set({ isLoading: true, error: null });
          try {
            await paymentService.confirmPayPalPayment(paymentId, paypalData);
            console.log('Paiement PayPal confirmé');
            
            // Rafraîchir toutes les données
            await get().refreshAll();
            
            set({ isLoading: false });
          } catch (error: any) {
            console.error('Erreur confirmation PayPal:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la confirmation du paiement';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        cancelPayPalPayment: async (paymentId: string, reason?: string) => {
          set({ isLoading: true, error: null });
          try {
            await paymentService.cancelPayPalPayment(paymentId, reason);
            console.log('Paiement PayPal annulé');
            set({ isLoading: false });
          } catch (error: any) {
            console.error('Erreur annulation PayPal:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'annulation du paiement';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        // =====================================
        // ACTIONS ABONNEMENT
        // =====================================
        
        createFreeSubscription: async () => {
          set({ isLoading: true, error: null });
          try {
            const subscription = await subscriptionService.createFreeSubscription();
            console.log('Abonnement gratuit créé:', subscription);
            set({ subscription, isLoading: false });
          } catch (error: any) {
            console.error('Erreur création abonnement gratuit:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création de l\'abonnement gratuit';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        cancelSubscription: async (reason?: string) => {
          set({ isLoading: true, error: null });
          try {
            const { subscription } = get();
            
            if (!subscription) {
              throw new Error('Aucun abonnement actif à annuler');
            }
            
            await subscriptionService.cancelSubscription(subscription.id, reason);
            console.log('Abonnement annulé');
            
            // Rafraîchir l'abonnement
            await get().fetchSubscription();
            
            set({ isLoading: false });
          } catch (error: any) {
            console.error('Erreur annulation abonnement:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'annulation de l\'abonnement';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        reactivateSubscription: async () => {
          set({ isLoading: true, error: null });
          try {
            const { subscription } = get();
            
            if (!subscription) {
              throw new Error('Aucun abonnement à réactiver');
            }
            
            await subscriptionService.reactivateSubscription(subscription.id);
            console.log('Abonnement réactivé');
            
            // Rafraîchir l'abonnement
            await get().fetchSubscription();
            
            set({ isLoading: false });
          } catch (error: any) {
            console.error('Erreur réactivation abonnement:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la réactivation de l\'abonnement';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        changePlan: async (newPlanId: string) => {
          set({ isLoading: true, error: null });
          try {
            const subscription = await subscriptionService.changePlan(newPlanId);
            console.log('Plan changé:', subscription);
            
            // Rafraîchir toutes les données
            await get().refreshAll();
            
            set({ isLoading: false });
          } catch (error: any) {
            console.error('Erreur changement de plan:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du changement de plan';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }
        },
        
        // =====================================
        // ACTIONS UTILITAIRES AVEC CACHE
        // =====================================
        
        checkAIUsageLimit: async (forceRefresh = false) => {
          const { aiUsageCache } = get();
          
          // Utiliser le cache s'il est récent (moins de 5 minutes) et pas de forceRefresh
          if (!forceRefresh && aiUsageCache?.lastCheck) {
            const cacheAge = Date.now() - aiUsageCache.lastCheck.getTime();
            if (cacheAge < 5 * 60 * 1000) { // 5 minutes
              return {
                canUse: aiUsageCache.canUse,
                currentUsage: aiUsageCache.currentUsage,
                limit: aiUsageCache.limit,
                resetDate: aiUsageCache.resetDate,
                plan: get().subscription?.planId || 'free'
              };
            }
          }
          
          try {
            const usage = await subscriptionService.checkAIUsageLimit();
            console.log('Limites IA vérifiées:', usage);
            
            // Mettre à jour le cache
            const newCache = {
              canUse: usage.canUse,
              currentUsage: usage.currentUsage,
              limit: usage.limit,
              resetDate: usage.resetDate,
              lastCheck: new Date()
            };
            set({ aiUsageCache: newCache });
            
            return usage;
          } catch (error: any) {
            console.error('Erreur vérification limites IA:', error);
            // Retourner des valeurs par défaut en cas d'erreur
            return {
              canUse: false,
              currentUsage: 0,
              limit: 0,
              resetDate: null,
              plan: 'free'
            };
          }
        },
        
        checkLetterLimit: async (forceRefresh = false) => {
          const { letterLimitCache } = get();
          
          // Utiliser le cache s'il est récent (moins de 2 minutes) et pas de forceRefresh
          if (!forceRefresh && letterLimitCache?.lastCheck) {
            const cacheAge = Date.now() - letterLimitCache.lastCheck.getTime();
            if (cacheAge < 2 * 60 * 1000) { // 2 minutes
              return {
                canCreate: letterLimitCache.canCreate,
                currentCount: letterLimitCache.currentCount,
                limit: letterLimitCache.limit,
                plan: get().subscription?.planId || 'free'
              };
            }
          }
          
          try {
            const limit = await subscriptionService.checkLetterLimit();
            console.log('Limites lettres vérifiées:', limit);
            
            // Mettre à jour le cache
            const newCache = {
              canCreate: limit.canCreate,
              currentCount: limit.currentCount,
              limit: limit.limit,
              lastCheck: new Date()
            };
            set({ letterLimitCache: newCache });
            
            return limit;
          } catch (error: any) {
            console.error('Erreur vérification limites lettres:', error);
            // Retourner des valeurs par défaut en cas d'erreur
            return {
              canCreate: false,
              currentCount: 0,
              limit: 3,
              plan: 'free'
            };
          }
        },
        
        incrementAIUsage: async () => {
          try {
            await subscriptionService.incrementAIUsage();
            
            // Invalider le cache des limites IA
            set({ aiUsageCache: null });
            
            // Actualiser les limites
            await get().checkAIUsageLimit(true);
            
          } catch (error: any) {
            console.error('Erreur incrémentation IA:', error);
            throw new Error(
              error.response?.data?.message || 
              'Erreur lors de l\'incrémentation de l\'utilisation IA'
            );
          }
        },
        
        // =====================================
        // VÉRIFICATIONS DE FONCTIONNALITÉS
        // =====================================
        
        hasFeature: (feature: string) => {
          const { subscription, plans } = get();
          
          if (!subscription || subscription.status !== 'active') {
            // Plan gratuit - fonctionnalités de base
            const freeFeatures = ['templates_access', 'export_pdf'];
            return freeFeatures.includes(feature);
          }
          
          // Trouver le plan correspondant
          const currentPlan = plans.find(plan => plan.id === subscription.planId);
          if (!currentPlan) {
            return false;
          }
          
          // Vérifier si le plan inclut la fonctionnalité
          return currentPlan.features?.includes(feature) || false;
        },
        
        canUseAI: () => {
          const { subscription, aiUsageCache } = get();
          
          if (!subscription || subscription.status !== 'active') {
            return false;
          }
          
          // Plan gratuit n'a pas accès à l'IA
          if (subscription.planId === 'free') {
            return false;
          }
          
          // Si on a des données en cache, les utiliser
          if (aiUsageCache) {
            return aiUsageCache.canUse;
          }
          
          // Sinon, vérifier de base selon le plan
          return subscription.planId !== 'free';
        },
        
        canCreateLetter: () => {
          const { subscription, letterLimitCache } = get();
          
          // Si on a des données en cache, les utiliser
          if (letterLimitCache) {
            return letterLimitCache.canCreate;
          }
          
          // Sinon, vérifier de base selon le plan
          if (!subscription || subscription.status !== 'active') {
            return true; // Plan gratuit a une limite mais peut créer
          }
          
          return true; // Plans payants ont des lettres illimitées
        },
        
        // =====================================
        // UTILITAIRES
        // =====================================
        
        clearError: () => set({ error: null }),
        
        clearCache: () => set({ 
          aiUsageCache: null, 
          letterLimitCache: null 
        }),
        
        setLoading: (loading: boolean) => set({ isLoading: loading }),
        
        refreshAll: async () => {
          try {
            await Promise.all([
              get().fetchSubscription(),
              get().fetchPlans(),
              get().fetchPaymentHistory(),
              get().fetchPaymentStats(),
              get().fetchSubscriptionStats()
            ]);
            
            // Vider les caches pour forcer le rafraîchissement
            get().clearCache();
            
          } catch (error) {
            console.error('Erreur lors du rafraîchissement complet:', error);
          }
        }
      }),
      {
        name: 'subscription-store',
        partialize: (state) => ({
          // Ne persister que certaines données importantes
          subscription: state.subscription,
          plans: state.plans,
          // Ne pas persister les caches et états temporaires
        }),
        version: 1, // Pour gérer les migrations futures
      }
    ),
    {
      name: 'subscription-store-devtools'
    }
  )
);

// =====================================
// HOOKS SPÉCIALISÉS
// =====================================

/**
 * Hook pour vérifier si l'utilisateur peut utiliser une fonctionnalité
 */
export const useSubscriptionFeature = (feature: string) => {
  const hasFeature = useSubscriptionStore((state) => state.hasFeature);
  return hasFeature(feature);
};

/**
 * Hook pour obtenir les informations de plan actuelles
 */
export const useSubscriptionPlan = () => {
  const { subscription, plans } = useSubscriptionStore((state) => ({
    subscription: state.subscription,
    plans: state.plans
  }));
  
  const currentPlan = subscription ? 
    plans.find(plan => plan.id === subscription.planId) 
    : null;
  
  const isActive = subscription?.status === 'active';
  const isFree = !subscription || subscription.planId === 'free';
  
  return {
    subscription,
    currentPlan,
    isActive,
    isFree,
    canUpgrade: isFree || subscription?.planId === 'basic',
    daysRemaining: subscription?.currentPeriodEnd ? 
      Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) 
      : null
  };
};

/**
 * Hook pour les limites d'utilisation
 */
export const useUsageLimits = () => {
  const { 
    checkAIUsageLimit, 
    checkLetterLimit, 
    canUseAI, 
    canCreateLetter,
    incrementAIUsage
  } = useSubscriptionStore();
  
  return {
    checkAIUsageLimit,
    checkLetterLimit,
    canUseAI,
    canCreateLetter,
    incrementAIUsage
  };
};

/**
 * Sélecteurs pour optimiser les re-renders
 */
export const subscriptionSelectors = {
  isLoading: (state: SubscriptionState) => state.isLoading,
  error: (state: SubscriptionState) => state.error,
  subscription: (state: SubscriptionState) => state.subscription,
  plans: (state: SubscriptionState) => state.plans,
  payments: (state: SubscriptionState) => state.payments,
  hasActiveSubscription: (state: SubscriptionState) => 
    state.subscription?.status === 'active',
  canUseAI: (state: SubscriptionState) => state.canUseAI(),
  canCreateLetter: (state: SubscriptionState) => state.canCreateLetter()
};