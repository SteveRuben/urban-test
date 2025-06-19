// services/payment.service.ts - Service frontend PayPal final
import api from './api';
import type { Payment,  } from '../types';
import type { PaymentStats } from '../store';

export interface PayPalSessionData {
  sessionId: string;
  approvalUrl: string;
  paymentId: string;
}

export interface PayPalConfirmData {
  paypalOrderId?: string;
  paypalSubscriptionId?: string;
  payerID?: string;
  token?: string;
}

class PaymentService {
  /**
   * Créer une session de paiement PayPal
   */
  async createPayPalSession(
    planType: string, 
    interval: string,
    options?: {
      currency?: string;
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<PayPalSessionData> {
    try {
      const response = await api.post('/payments/create-paypal-session', {
        planType,
        interval,
        currency: options?.currency || 'eur',
        successUrl: options?.successUrl || `${window.location.origin}/dashboard/subscription?success=true`,
        cancelUrl: options?.cancelUrl || `${window.location.origin}/dashboard/subscription?canceled=true`
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Erreur création session PayPal:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la création de la session de paiement PayPal'
      );
    }
  }

  /**
   * Confirmer un paiement PayPal
   */
  async confirmPayPalPayment(
    paymentId: string, 
    paypalData: PayPalConfirmData
  ): Promise<Payment> {
    try {
      const response = await api.post('/payments/confirm-paypal', {
        paymentId,
        ...paypalData
      });

      return response.data;
    } catch (error: any) {
      console.error('Erreur confirmation PayPal:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la confirmation du paiement PayPal'
      );
    }
  }

  /**
   * Annuler un paiement PayPal
   */
  async cancelPayPalPayment(
    paymentId: string, 
    reason?: string
  ): Promise<void> {
    try {
      await api.post('/payments/cancel-paypal', {
        paymentId,
        reason: reason || 'Annulé par l\'utilisateur'
      });
    } catch (error: any) {
      console.error('Erreur annulation PayPal:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de l\'annulation du paiement PayPal'
      );
    }
  }

  /**
   * Récupérer l'historique des paiements
   */
  async getPaymentHistory(page: number = 1, limit: number = 10): Promise<Payment[]> {
    try {
      const response = await api.get('/payments/history', {
        params: { page, limit }
      });

      return response.data.payments || response.data;
    } catch (error: any) {
      console.error('Erreur récupération historique:', error);
      if (error.response?.status === 404) {
        return []; // Pas d'historique
      }
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération de l\'historique des paiements'
      );
    }
  }

  /**
   * Récupérer les statistiques de paiement
   */
  async getPaymentStats(): Promise<PaymentStats> {
    try {
      const response = await api.get('/payments/stats');
      return response.data;
    } catch (error: any) {
      console.error('Erreur récupération stats:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération des statistiques'
      );
    }
  }

  /**
   * Récupérer un paiement par ID
   */
  async getPaymentById(paymentId: string): Promise<Payment> {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur récupération paiement:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération du paiement'
      );
    }
  }

  /**
   * Télécharger un reçu de paiement
   */
  async downloadReceipt(paymentId: string): Promise<void> {
    try {
      const response = await api.get(`/payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erreur téléchargement reçu:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors du téléchargement du reçu'
      );
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      const response = await api.get(`/payments/${paymentId}/status`);
      return response.data.status;
    } catch (error: any) {
      console.error('Erreur vérification statut:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la vérification du statut du paiement'
      );
    }
  }

  /**
   * Gérer le retour PayPal depuis l'URL
   */
  async handlePayPalReturn(): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const payerID = urlParams.get('PayerID');
      const paymentId = urlParams.get('paymentId');

      if (!token || !payerID || !paymentId) {
        return { success: false, error: 'Paramètres PayPal manquants' };
      }

      // Confirmer le paiement
      await this.confirmPayPalPayment(paymentId, {
        token,
        payerID
      });

      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return { success: true, paymentId };
    } catch (error: any) {
      console.error('Erreur traitement retour PayPal:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors du traitement du retour PayPal' 
      };
    }
  }

  /**
   * Formater le montant pour PayPal
   */
  formatAmount(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Obtenir l'URL du logo PayPal selon la taille
   */
  getPayPalLogoUrl(size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizes = {
      small: 'https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg',
      medium: 'https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_74x46.jpg',
      large: 'https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg'
    };
    return sizes[size];
  }

  /**
   * Vérifier si PayPal est disponible dans le pays
   */
  isPayPalAvailable(countryCode: string): boolean {
    // Liste des pays supportés par PayPal (simplifiée)
    const supportedCountries = [
      'FR', 'DE', 'GB', 'IT', 'ES', 'US', 'CA', 'AU', 'JP', 'NL', 'BE', 'CH', 'AT'
    ];
    return supportedCountries.includes(countryCode.toUpperCase());
  }

  // ===============================
  // MÉTHODES LEGACY (pour compatibilité Stripe)
  // ===============================

  /**
   * Créer un PaymentIntent (legacy Stripe - redirige vers PayPal)
   * @deprecated Utiliser createPayPalSession à la place
   */
  async createPaymentIntent(planId: string): Promise<{ clientSecret: string }> {
    console.warn('createPaymentIntent est déprécié, utilisez createPayPalSession');
    
    try {
      // Rediriger vers PayPal pour les nouveaux paiements
      const session = await this.createPayPalSession(planId, 'monthly');
      
      // Rediriger immédiatement vers PayPal
      if (session.approvalUrl) {
        window.location.href = session.approvalUrl;
      }
      
      // Retourner un format compatible pour éviter les erreurs
      return { clientSecret: session.sessionId };
    } catch (error) {
      throw error;
    }
  }
}

export default new PaymentService();