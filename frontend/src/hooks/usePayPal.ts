// hooks/usePayPal.ts - Hooks personnalisés pour PayPal mis à jour
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import paymentService from '../services/payment.service';
import { useSubscriptionStore } from '../store/subscription.store';
import type { PlanType, SubscriptionInterval, PayPalSessionData } from '../store/subscription.store';

/**
 * Hook pour gérer les paiements PayPal
 */
export const usePayPal = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createPayPalSession } = useSubscriptionStore();

  const createSession = useCallback(async (
    planType: PlanType, 
    interval: SubscriptionInterval,
    // @ts-ignore
    options?: {
      currency?: string;
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<PayPalSessionData> => {
    try {
      setLoading(true);
      setError(null);
      
      const session = await createPayPalSession(planType, interval);
      
      // Rediriger automatiquement vers PayPal
      if (session.approvalUrl) {
        window.location.href = session.approvalUrl;
      }
      
      return session;
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création du paiement PayPal';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [createPayPalSession]);

  const confirmPayment = useCallback(async (paymentId: string, paypalData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await paymentService.confirmPayPalPayment(paymentId, paypalData);
      return result;
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la confirmation du paiement';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelPayment = useCallback(async (paymentId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await paymentService.cancelPayPalPayment(paymentId, reason);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'annulation du paiement';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createSession,
    confirmPayment,
    cancelPayment,
    loading,
    error,
    clearError
  };
};

/**
 * Hook pour gérer les retours PayPal depuis l'URL
 */
export const usePayPalReturn = () => {
  const [searchParams] = useSearchParams();
  const [returnData, setReturnData] = useState<{
    type: 'success' | 'cancel' | null;
    paymentId?: string;
    token?: string;
    payerID?: string;
    message?: string;
  }>({ type: null });
  
  const { fetchSubscription, fetchPaymentHistory } = useSubscriptionStore();

  useEffect(() => {
    const handleReturn = async () => {
      const success = searchParams.get('success');
      const canceled = searchParams.get('canceled');
      const paymentId = searchParams.get('paymentId');
      const token = searchParams.get('token');
      const payerID = searchParams.get('PayerID');

      if (success === 'true' && paymentId && token && payerID) {
        try {
          // Confirmer automatiquement le paiement
          await paymentService.confirmPayPalPayment(paymentId, { token, payerID });
          
          setReturnData({
            type: 'success',
            paymentId,
            token,
            payerID,
            message: 'Paiement réussi ! Votre abonnement a été activé.'
          });
          
          // Rafraîchir les données
          await fetchSubscription();
          await fetchPaymentHistory();
          
        } catch (error: any) {
          console.error('Erreur confirmation PayPal:', error);
          setReturnData({
            type: 'success',
            paymentId,
            token,
            payerID,
            message: 'Paiement reçu, traitement en cours...'
          });
        }
      } else if (canceled === 'true') {
        setReturnData({
          type: 'cancel',
          message: 'Paiement annulé. Vous pouvez réessayer à tout moment.'
        });
      }

      // Nettoyer l'URL après traitement
      if (success || canceled) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleReturn();
  }, [searchParams, fetchSubscription, fetchPaymentHistory]);

  const clearReturnData = useCallback(() => {
    setReturnData({ type: null });
  }, []);

  return {
    returnData,
    clearReturnData,
    isSuccess: returnData.type === 'success',
    isCancel: returnData.type === 'cancel'
  };
};

/**
 * Hook pour calculer les prix et remises
 */
export const usePayPalPricing = () => {
  const calculatePrice = useCallback((
    basePlan: PlanType,
    interval: SubscriptionInterval
  ) => {
    const basePrices = {
      basic: { monthly: 9.99, yearly: 99.99, lifetime: 199.99 },
      pro: { monthly: 19.99, yearly: 199.99, lifetime: 399.99 },
      premium: { monthly: 39.99, yearly: 399.99, lifetime: 799.99 }
    };

    return basePrices[basePlan]?.[interval] || 0;
  }, []);

  const calculateDiscount = useCallback((interval: SubscriptionInterval) => {
    const discounts = {
      monthly: 0,
      yearly: 17, // 17% de réduction
      lifetime: 30 // 30% de réduction
    };

    return discounts[interval];
  }, []);

  const calculateSavings = useCallback((
    basePlan: PlanType,
    interval: 'yearly' | 'lifetime'
  ) => {
    const monthlyPrice = calculatePrice(basePlan, 'monthly');
    const intervalPrice = calculatePrice(basePlan, interval);
    
    if (interval === 'yearly') {
      return (monthlyPrice * 12) - intervalPrice;
    }
    if (interval === 'lifetime') {
      const yearlyPrice = calculatePrice(basePlan, 'yearly');
      return (yearlyPrice * 10) - intervalPrice;
    }
    
    return 0;
  }, [calculatePrice]);

  const formatPrice = useCallback((amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }, []);

  return {
    calculatePrice,
    calculateDiscount,
    calculateSavings,
    formatPrice
  };
};

/**
 * Hook pour gérer les notifications PayPal
 */
export const usePayPalNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>>([]);

  const addNotification = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    const notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Garder max 10 notifications

    // Auto-suppression après 5 secondes pour les succès
    if (type === 'success') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    clearAll,
    unreadCount
  };
};

/**
 * Hook pour valider les données PayPal
 */
export const usePayPalValidation = () => {
  const validatePlanSelection = useCallback((
    planId?: string,
    interval?: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!planId) {
      errors.push('Veuillez sélectionner un plan');
    }

    if (!interval) {
      errors.push('Veuillez sélectionner une période de facturation');
    }

    const validPlans: PlanType[] = ['basic', 'pro', 'premium'];
    if (planId && !validPlans.includes(planId as PlanType)) {
      errors.push('Plan sélectionné invalide');
    }

    const validIntervals: SubscriptionInterval[] = ['monthly', 'yearly', 'lifetime'];
    if (interval && !validIntervals.includes(interval as SubscriptionInterval)) {
      errors.push('Période de facturation invalide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const validatePayPalReturn = useCallback((
    token?: string,
    payerID?: string,
    paymentId?: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!token) {
      errors.push('Token PayPal manquant');
    }

    if (!payerID) {
      errors.push('ID du payeur PayPal manquant');
    }

    if (!paymentId) {
      errors.push('ID de paiement manquant');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    validatePlanSelection,
    validatePayPalReturn
  };
};

/**
 * Hook pour gérer les statistiques PayPal
 */
export const usePayPalStats = () => {
  const [stats, setStats] = useState<{
    totalRevenue: number;
    monthlyPayments: number;
    activeSubscriptions: number;
    conversionRate: number;
    averageOrderValue: number;
    topPlan: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await paymentService.getPaymentStats();
      setStats(data);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

/**
 * Hook pour gérer l'état de synchronisation PayPal
 */
export const usePayPalSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { refreshAll } = useSubscriptionStore();

  const syncWithPayPal = useCallback(async () => {
    try {
      setSyncing(true);
      
      // Utiliser refreshAll pour synchroniser toutes les données
      await refreshAll();
      
      setLastSync(new Date());
      
    } catch (error) {
      console.error('Erreur synchronisation PayPal:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [refreshAll]);

  // Auto-sync toutes les 5 minutes si la page est active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncWithPayPal();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [syncWithPayPal]);

  return {
    syncing,
    lastSync,
    syncWithPayPal
  };
};

/**
 * Hook pour détecter le pays et adapter l'expérience PayPal
 */
export const usePayPalLocalization = () => {
  const [country, setCountry] = useState<string>('FR');
  const [currency, setCurrency] = useState<string>('EUR');
  const [isPayPalAvailable, setIsPayPalAvailable] = useState<boolean>(true);

  useEffect(() => {
    // Détecter le pays de l'utilisateur
    const detectCountry = async () => {
      try {
        // Utiliser l'API de géolocalisation ou une API tierce
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        setCountry(data.country_code || 'FR');
        setCurrency(data.currency || 'EUR');
        
        // Vérifier si PayPal est disponible dans ce pays
        const supportedCountries = [
          'FR', 'DE', 'GB', 'IT', 'ES', 'US', 'CA', 'AU', 'JP', 'NL', 'BE', 'CH', 'AT'
        ];
        setIsPayPalAvailable(supportedCountries.includes(data.country_code));
        
      } catch (error) {
        console.error('Erreur détection pays:', error);
        // Valeurs par défaut
        setCountry('FR');
        setCurrency('EUR');
        setIsPayPalAvailable(true);
      }
    };

    detectCountry();
  }, []);

  const getLocalizedText = useCallback((key: string) => {
    const translations: Record<string, Record<string, string>> = {
      FR: {
        'pay_with_paypal': 'Payer avec PayPal',
        'secure_payment': 'Paiement sécurisé',
        'cancel_anytime': 'Annulation à tout moment',
        'money_back_guarantee': 'Garantie satisfait ou remboursé'
      },
      EN: {
        'pay_with_paypal': 'Pay with PayPal',
        'secure_payment': 'Secure payment',
        'cancel_anytime': 'Cancel anytime',
        'money_back_guarantee': 'Money back guarantee'
      },
      DE: {
        'pay_with_paypal': 'Mit PayPal bezahlen',
        'secure_payment': 'Sichere Zahlung',
        'cancel_anytime': 'Jederzeit kündbar',
        'money_back_guarantee': 'Geld-zurück-Garantie'
      }
    };

    return translations[country]?.[key] || translations['FR'][key] || key;
  }, [country]);

  return {
    country,
    currency,
    isPayPalAvailable,
    getLocalizedText
  };
};

/**
 * Hook pour gérer les erreurs PayPal avec retry automatique
 */
export const usePayPalErrorHandler = () => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  const handleError = useCallback(async (
    error: any,
    retryFunction: () => Promise<any>
  ) => {
    console.error('Erreur PayPal:', error);

    // Erreurs qui ne nécessitent pas de retry
    const noRetryErrors = [
      'PAYMENT_NOT_APPROVED',
      'PAYER_CANNOT_PAY',
      'INSTRUMENT_DECLINED'
    ];

    const shouldRetry = !noRetryErrors.some(code => 
      error.message?.includes(code) || error.paypalErrorCode === code
    );

    if (shouldRetry && retryCount < maxRetries) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);

      try {
        // Attendre avant de retry (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        const result = await retryFunction();
        
        // Reset en cas de succès
        setRetryCount(0);
        setIsRetrying(false);
        
        return result;
        
      } catch (retryError) {
        setIsRetrying(false);
        throw retryError;
      }
    } else {
      setIsRetrying(false);
      throw error;
    }
  }, [retryCount, maxRetries]);

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    handleError,
    resetRetryCount,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries
  };
};

/**
 * Hook combiné pour une expérience PayPal complète
 */
export const usePayPalComplete = () => {
  const paypal = usePayPal();
  const returnHandler = usePayPalReturn();
  const pricing = usePayPalPricing();
  const notifications = usePayPalNotifications();
  const validation = usePayPalValidation();
  const stats = usePayPalStats();
  const sync = usePayPalSync();
  const localization = usePayPalLocalization();
  const errorHandler = usePayPalErrorHandler();

  // Gestion centralisée des erreurs
  useEffect(() => {
    if (paypal.error) {
      notifications.addNotification('error', 'Erreur PayPal', paypal.error);
    }
  }, [paypal.error, notifications]);

  // Gestion des retours PayPal
  useEffect(() => {
    if (returnHandler.isSuccess && returnHandler.returnData.message) {
      notifications.addNotification('success', 'Paiement réussi', returnHandler.returnData.message);
    }
    if (returnHandler.isCancel && returnHandler.returnData.message) {
      notifications.addNotification('warning', 'Paiement annulé', returnHandler.returnData.message);
    }
  }, [returnHandler, notifications]);

  return {
    // Fonctions principales
    createSession: paypal.createSession,
    confirmPayment: paypal.confirmPayment,
    cancelPayment: paypal.cancelPayment,
    
    // État
    loading: paypal.loading || sync.syncing,
    error: paypal.error,
    
    // Retours PayPal
    returnData: returnHandler.returnData,
    isSuccess: returnHandler.isSuccess,
    isCancel: returnHandler.isCancel,
    clearReturnData: returnHandler.clearReturnData,
    
    // Pricing
    calculatePrice: pricing.calculatePrice,
    calculateDiscount: pricing.calculateDiscount,
    calculateSavings: pricing.calculateSavings,
    formatPrice: pricing.formatPrice,
    
    // Notifications
    notifications: notifications.notifications,
    addNotification: notifications.addNotification,
    removeNotification: notifications.removeNotification,
    unreadCount: notifications.unreadCount,
    
    // Validation
    validatePlanSelection: validation.validatePlanSelection,
    validatePayPalReturn: validation.validatePayPalReturn,
    
    // Stats
    stats: stats.stats,
    statsLoading: stats.loading,
    
    // Sync
    syncWithPayPal: sync.syncWithPayPal,
    lastSync: sync.lastSync,
    
    // Localisation
    country: localization.country,
    currency: localization.currency,
    isPayPalAvailable: localization.isPayPalAvailable,
    getLocalizedText: localization.getLocalizedText,
    
    // Gestion d'erreurs
    handleError: errorHandler.handleError,
    canRetry: errorHandler.canRetry,
    isRetrying: errorHandler.isRetrying,
    
    // Utilitaires
    clearError: paypal.clearError
  };
};