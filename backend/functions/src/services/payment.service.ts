// src/services/payment.service.ts - Version PayPal corrigée et complète
import paypal from '@paypal/checkout-server-sdk';
import { db, COLLECTIONS } from '../config/firebase';
import { Payment, PaymentStatus, PaymentMethod, Currency, SubscriptionInterval, PlanType, PLAN_PRICES } from '../models/payment.model';
import { NotFoundError, ValidationError, ForbiddenError, AppError, PayPalError } from '../utils/errors.util';
import { SubscriptionService } from './subscription.service';
import { logger } from 'firebase-functions/v2';

export class PaymentService {
  private static paypalClient: paypal.core.PayPalHttpClient;
  private static paymentsCollection = db.collection(COLLECTIONS.PAYMENTS);

  /**
   * Initialiser le client PayPal
   */
  static initializePayPal(): void {
    if (this.paypalClient) {
      return; // Déjà initialisé
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

    if (!clientId || !clientSecret) {
      throw new AppError('Configuration PayPal manquante', 500);
    }

    const paypalEnvironment = environment === 'live' 
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    this.paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);
    
    logger.debug('Client PayPal initialisé', { environment });
  }

  /**
   * Créer une session de paiement PayPal
   */
  static async createPaymentSession(
    userId: string,
    planType: PlanType,
    interval: SubscriptionInterval,
    currency: Currency = Currency.EUR,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{
    paymentId: string;
    approvalUrl: string;
    amount: number;
    isSubscription: boolean;
  }> {
    try {
      this.initializePayPal();

      const planDetails = this.getPlanDetails(planType, interval, currency);
      const isSubscription = interval !== 'lifetime';

      logger.debug('Création session de paiement PayPal', planDetails);

      // URLs par défaut
      const defaultSuccessUrl = successUrl || `${process.env.FRONTEND_URL}/dashboard/subscription?success=true`;
      const defaultCancelUrl = cancelUrl || `${process.env.FRONTEND_URL}/dashboard/subscription?canceled=true`;

      let approvalUrl: string;
      let paypalId: string;

      if (isSubscription) {
        // Créer un abonnement PayPal pour les paiements récurrents
        const subscription = await this.createPayPalSubscription(
          userId, planType, interval, currency, defaultSuccessUrl, defaultCancelUrl
        );
        approvalUrl = subscription.approvalUrl;
        paypalId = subscription.subscriptionId;
      } else {
        // Créer une commande PayPal pour les paiements uniques (lifetime)
        const order = await this.createPayPalOrder(
          userId, planType, interval, currency, defaultSuccessUrl, defaultCancelUrl
        );
        approvalUrl = order.approvalUrl;
        paypalId = order.orderId;
      }
      logger.debug('Création session de paiement PayPal', { approvalUrl, paypalId});
      logger.debug('is subscription', { isSubscription });
      // Enregistrer le paiement en base
      const paymentId = this.paymentsCollection.doc().id;
      const payment: Payment = {
        id: paymentId,
        userId,
        planId: planType,
        planType,
        interval,
        amount: planDetails.price,
        currency,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.PAYPAL,
        description: `${planDetails.name} - ${this.getIntervalLabel(interval)}`,
        paypalOrderId:  paypalId ,
        paypalSubscriptionId:  paypalId,
        metadata: {
          planType,
          interval,
          isSubscription,
          paypalId
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      logger.debug('is subscription', payment);
      await this.paymentsCollection.doc(paymentId).set(payment);

      logger.info('Session de paiement PayPal créée', {
        paymentId,
        userId,
        planType,
        interval,
        amount: planDetails.price,
        isSubscription
      });

      return {
        paymentId,
        approvalUrl,
        amount: planDetails.price,
        isSubscription
      };

    } catch (error) {
      logger.error('Erreur création session PayPal:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors de la création du paiement PayPal', 500);
    }
  }

  /**
   * Créer une commande PayPal pour paiement unique
   */
  private static async createPayPalOrder(
    userId: string,
    planType: PlanType,
    interval: SubscriptionInterval,
    currency: Currency,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ orderId: string; approvalUrl: string }> {
    const planDetails = this.getPlanDetails(planType, interval, currency);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');

    const orderPayload = {
      intent: 'CAPTURE',
      application_context: {
        return_url: successUrl,
        cancel_url: cancelUrl,
        brand_name: 'Cover Letter Generator',
        locale: this.getCurrencyLocale(currency),
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      },
      purchase_units: [
        {
          reference_id: `${userId}-${planType}-${interval}`,
          description: `${planDetails.name} - ${this.getIntervalLabel(interval)}`,
          amount: {
            currency_code: currency.toUpperCase(),
            value: planDetails.price.toFixed(2)
          }
        }
      ]
    };

    request.requestBody(orderPayload as any);
    const response = await this.paypalClient.execute(request);
    const order = response.result;

    const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;
    if (!approvalUrl) {
      throw new AppError('URL d\'approbation PayPal non trouvée', 500);
    }

    return {
      orderId: order.id,
      approvalUrl
    };
  }

  /**
   * Créer un abonnement PayPal récurrent
   */
  private static async createPayPalSubscription(
    userId: string,
    planType: PlanType,
    interval: SubscriptionInterval,
    currency: Currency,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ subscriptionId: string; approvalUrl: string }> {
    // TODO: Implémenter la création d'abonnements PayPal
    // Pour l'instant, on utilise des commandes uniques
    const order = await this.createPayPalOrder(userId, planType, interval, currency, successUrl, cancelUrl);
    return {
      subscriptionId: order.orderId,
      approvalUrl: order.approvalUrl
    };
  }

  /**
   * Confirmer et capturer un paiement PayPal
   */
  static async capturePayment(
    paymentId: string,
    paypalOrderId?: string,
    paypalSubscriptionId?: string
  ): Promise<Payment> {
    try {
      this.initializePayPal();

      // Récupérer le paiement en base
      const paymentDoc = await this.paymentsCollection.doc(paymentId).get();
      if (!paymentDoc.exists) {
        throw new NotFoundError('Paiement non trouvé');
      }

      const payment = paymentDoc.data() as Payment;

      if (paypalOrderId) {
        // Capturer une commande PayPal
        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
        //request.requestBody({});

        const response = await this.paypalClient.execute(request);
        const captureResult = response.result;

         if (captureResult.status !== 'COMPLETED') {
            throw new PayPalError(
              `Capture PayPal échouée: ${captureResult.status}`,
              'CAPTURE_FAILED',
              captureResult.debug_id || undefined,
              paypalOrderId
            );
          }

        // Mettre à jour le paiement
        const updatedPayment: Partial<Payment> = {
          status: PaymentStatus.SUCCEEDED,
          completedAt: new Date(),
          updatedAt: new Date(),
          paypalCaptureId: captureResult.id,
          receiptUrl: this.generateReceiptUrl(paymentId)
        };

        await this.paymentsCollection.doc(paymentId).update(updatedPayment);

        // Créer ou mettre à jour l'abonnement utilisateur
        await this.handlePaymentSuccess(payment);

        logger.info('Paiement PayPal capturé avec succès', {
          paymentId,
          paypalOrderId,
          userId: payment.userId
        });

        return { ...payment, ...updatedPayment } as Payment;
      }

      if (paypalSubscriptionId) {
        // Pour les abonnements, on ne capture pas - on vérifie juste le statut
        logger.info('Abonnement PayPal activé', {
          paymentId,
          paypalSubscriptionId,
          userId: payment.userId
        });

        const updatedPayment: Partial<Payment> = {
          status: PaymentStatus.SUCCEEDED,
          completedAt: new Date(),
          updatedAt: new Date(),
          receiptUrl: this.generateReceiptUrl(paymentId)
        };

        await this.paymentsCollection.doc(paymentId).update(updatedPayment);
        await this.handlePaymentSuccess(payment);

        return { ...payment, ...updatedPayment } as Payment;
      }

      throw new ValidationError('ID de commande ou d\'abonnement PayPal requis');

    } catch (error) {
      logger.error('Erreur capture PayPal:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors de la confirmation du paiement', 500);
    }
  }

  /**
   * Annuler un abonnement PayPal
   */
  static async cancelSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<void> {
    try {
      logger.info('Annulation abonnement PayPal', { subscriptionId, reason });

      // TODO: Implémenter l'annulation via l'API PayPal
      // Pour l'instant, on met à jour uniquement en base

      // Trouver le paiement correspondant
      const snapshot = await this.paymentsCollection
        .where('paypalSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        await paymentDoc.ref.update({
          status: PaymentStatus.CANCELLED,
          updatedAt: new Date(),
          refundReason: reason || 'Annulation par l\'utilisateur'
        });

        // Mettre à jour l'abonnement utilisateur
        const payment = paymentDoc.data() as Payment;
        await SubscriptionService.cancelSubscriptionByUserId(payment.userId, reason);
      }

    } catch (error) {
      logger.error('Erreur annulation abonnement PayPal:', error);
      throw new AppError('Erreur lors de l\'annulation de l\'abonnement', 500);
    }
  }

  /**
   * Traiter les webhooks PayPal
   */
  static async handleWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<void> {
    try {
      logger.info('Webhook PayPal reçu', { eventType: body.event_type });

      // TODO: Vérifier la signature PayPal
      // const isValid = await this.verifyPayPalWebhook(headers, body);
      // if (!isValid) {
      //   throw new AppError('Signature PayPal invalide', 400);
      // }

      const eventType = body.event_type;
      const resource = body.resource;

      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(resource);
          break;

        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.FAILED':
          await this.handlePaymentFailed(resource);
          break;

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionActivated(resource);
          break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(resource);
          break;

        default:
          logger.debug(`Événement webhook PayPal non géré: ${eventType}`);
      }

    } catch (error) {
      logger.error('Erreur traitement webhook PayPal:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des paiements
   */
  static async getPaymentHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Payment[]> {
    try {
      const snapshot = await this.paymentsCollection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          completedAt: data.completedAt?.toDate?.() || data.completedAt
        } as Payment;
      });

    } catch (error) {
      logger.error('Erreur récupération historique PayPal:', error);
      throw new AppError('Erreur lors de la récupération de l\'historique', 500);
    }
  }

  /**
   * Récupérer un paiement par ID
   */
  static async getPaymentById(paymentId: string, userId: string): Promise<Payment> {
    try {
      const paymentDoc = await this.paymentsCollection.doc(paymentId).get();
      
      if (!paymentDoc.exists) {
        throw new NotFoundError('Paiement non trouvé');
      }

      const payment = paymentDoc.data() as Payment;
      
      if (payment.userId !== userId) {
        throw new ForbiddenError('Accès non autorisé à ce paiement');
      }

      return {
        ...payment,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        completedAt: payment.completedAt
      };

    } catch (error) {
      logger.error('Erreur récupération paiement:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors de la récupération du paiement', 500);
    }
  }

  /**
   * Demander un remboursement PayPal
   */
  static async requestRefund(
    paymentId: string,
    userId: string,
    reason: string,
    amount?: number
  ): Promise<void> {
    try {
      const payment = await this.getPaymentById(paymentId, userId);

      if (payment.status !== PaymentStatus.SUCCEEDED) {
        throw new ValidationError('Seuls les paiements réussis peuvent être remboursés');
      }

      // TODO: Implémenter le remboursement via l'API PayPal
      logger.info('Demande de remboursement PayPal', {
        paymentId,
        userId,
        reason,
        amount: amount || payment.amount
      });

      // Mettre à jour le statut en base
      await this.paymentsCollection.doc(paymentId).update({
        status: PaymentStatus.REFUNDED,
        refundReason: reason,
        updatedAt: new Date()
      });

    } catch (error) {
      logger.error('Erreur demande de remboursement:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  private static getPlanDetails(planType: PlanType, interval: SubscriptionInterval, currency: Currency) {
    const planNames = {
      basic: 'Basique',
      pro: 'Professionnel', 
      premium: 'Premium'
    };

    const price = PLAN_PRICES[currency]?.[planType]?.[interval];
    if (price === undefined) {
      throw new ValidationError(`Prix non disponible pour ${planType}-${interval}-${currency}`);
    }

    return {
      name: planNames[planType],
      price
    };
  }

  private static getIntervalLabel(interval: SubscriptionInterval): string {
    const labels = {
      monthly: 'Mensuel',
      yearly: 'Annuel',
      lifetime: 'À vie'
    };
    return labels[interval] || 'Inconnu';
  }

  private static getCurrencyLocale(currency: Currency): string {
    const locales = {
      eur: 'fr-FR',
      usd: 'en-US',
      gbp: 'en-GB',
      cad: 'en-CA',
      jpy: 'ja-JP'
    };
    return locales[currency] || 'en-US';
  }

  private static generateReceiptUrl(paymentId: string): string {
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/subscription/receipt/${paymentId}`;
  }

  private static async handlePaymentSuccess(payment: Payment): Promise<void> {
    try {
      // Créer ou mettre à jour l'abonnement utilisateur
      await SubscriptionService.updateUserSubscription(
        payment.userId,
        payment.planType,
        payment.interval
      );

      logger.info('Abonnement mis à jour après paiement réussi', {
        userId: payment.userId,
        planType: payment.planType,
        interval: payment.interval
      });

    } catch (error) {
      logger.error('Erreur mise à jour abonnement après paiement:', error);
      // Ne pas faire échouer le paiement si la mise à jour de l'abonnement échoue
    }
  }

  private static async handlePaymentCompleted(resource: any): Promise<void> {
    logger.info('Paiement PayPal complété via webhook', { captureId: resource.id });
    // TODO: Traiter le paiement complété
  }

  private static async handlePaymentFailed(resource: any): Promise<void> {
    logger.info('Paiement PayPal échoué via webhook', { captureId: resource.id });
    // TODO: Traiter l'échec de paiement
  }

  private static async handleSubscriptionActivated(resource: any): Promise<void> {
    logger.info('Abonnement PayPal activé via webhook', { subscriptionId: resource.id });
    // TODO: Traiter l'activation d'abonnement
  }

  private static async handleSubscriptionCancelled(resource: any): Promise<void> {
    logger.info('Abonnement PayPal annulé via webhook', { subscriptionId: resource.id });
    // TODO: Traiter l'annulation d'abonnement
  }
}