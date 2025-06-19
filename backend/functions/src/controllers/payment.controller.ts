// src/controllers/payment.controller.ts - Version PayPal corrigée
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/errors.util';
import { Currency, SubscriptionInterval, PlanType, PLAN_PRICES } from '../models/payment.model';
import { logger } from 'firebase-functions/v2';

export class PaymentController {
  /**
   * Créer une session de paiement PayPal
   * POST /payments/create-paypal-session
   */
  static async createPayPalSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const {
        planType,
        interval,
        currency = Currency.EUR,
        successUrl,
        cancelUrl
      } = req.body;

      console.log('Création session PayPal:', {
        userId: req.user.uid,
        planType,
        interval,
        currency,
        successUrl,
        cancelUrl});
        
      // Validation des paramètres requis
      if (!planType || !interval) {
        ResponseUtil.validationError(res, 'Type de plan et intervalle requis');
        return;
      }

      // Validation des valeurs
      const validPlanTypes: PlanType[] = ['basic', 'pro', 'premium'];
      const validIntervals: SubscriptionInterval[] = ['monthly', 'yearly', 'lifetime'];
      const validCurrencies = Object.values(Currency);

      if (!validPlanTypes.includes(planType)) {
        ResponseUtil.validationError(res, `Type de plan invalide. Valeurs acceptées: ${validPlanTypes.join(', ')}`);
        return;
      }

      if (!validIntervals.includes(interval)) {
        ResponseUtil.validationError(res, `Intervalle invalide. Valeurs acceptées: ${validIntervals.join(', ')}`);
        return;
      }

      if (!validCurrencies.includes(currency)) {
        ResponseUtil.validationError(res, `Devise invalide. Valeurs acceptées: ${validCurrencies.join(', ')}`);
        return;
      }

      // Vérifier que le prix existe pour cette combinaison
      const price = PLAN_PRICES[currency]?.[planType]?.[interval];
      if (price === undefined) {
        ResponseUtil.validationError(res, `Combinaison plan/intervalle/devise non disponible`);
        return;
      }

      const result = await PaymentService.createPaymentSession(
        req.user.uid,
        planType,
        interval,
        currency,
        successUrl,
        cancelUrl
      );

      logger.info('Session PayPal créée avec succès', {
        userId: req.user.uid,
        paymentId: result.paymentId,
        planType,
        interval,
        amount: result.amount
      });

      ResponseUtil.success(res, {
        paymentId: result.paymentId,
        approvalUrl: result.approvalUrl,
        amount: result.amount,
        currency,
        planType,
        interval,
        isSubscription: result.isSubscription
      }, 'Session de paiement PayPal créée avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur création session PayPal:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la création de la session de paiement');
    }
  }

  /**
   * Confirmer un paiement PayPal
   * POST /payments/confirm-paypal
   */
  static async confirmPayPalPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { paymentId, paypalOrderId, paypalSubscriptionId } = req.body;

      if (!paymentId) {
        ResponseUtil.validationError(res, 'ID de paiement requis');
        return;
      }

      if (!paypalOrderId && !paypalSubscriptionId) {
        ResponseUtil.validationError(res, 'ID d\'ordre PayPal ou ID d\'abonnement requis');
        return;
      }

      const payment = await PaymentService.capturePayment(
        paymentId,
        paypalOrderId,
        paypalSubscriptionId
      );

      logger.info('Paiement PayPal confirmé avec succès', {
        userId: req.user.uid,
        paymentId,
        paypalOrderId,
        paypalSubscriptionId
      });

      ResponseUtil.success(res, {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          planType: payment.planType,
          interval: payment.interval,
          completedAt: payment.completedAt,
          receiptUrl: payment.receiptUrl
        }
      }, 'Paiement confirmé avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur confirmation PayPal:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la confirmation du paiement');
    }
  }

  /**
   * Annuler un abonnement PayPal
   * POST /payments/cancel-subscription
   */
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { subscriptionId, reason } = req.body;

      if (!subscriptionId) {
        ResponseUtil.validationError(res, 'ID d\'abonnement requis');
        return;
      }

      await PaymentService.cancelSubscription(subscriptionId, reason);

      logger.info('Abonnement PayPal annulé avec succès', {
        userId: req.user.uid,
        subscriptionId,
        reason
      });

      ResponseUtil.success(res, {
        cancelled: true,
        subscriptionId,
        reason
      }, 'Abonnement annulé avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur annulation abonnement PayPal:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'annulation de l\'abonnement');
    }
  }

  /**
   * Webhook PayPal
   * POST /payments/webhook/paypal
   */
  static async handlePayPalWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Récupérer les headers PayPal pour la vérification de signature
      const paypalHeaders = {
        'paypal-transmission-signature': req.headers['paypal-transmission-signature'] as string,
        'paypal-cert-id': req.headers['paypal-cert-id'] as string,
        'paypal-auth-algo': req.headers['paypal-auth-algo'] as string,
        'paypal-transmission-id': req.headers['paypal-transmission-id'] as string,
        'paypal-transmission-time': req.headers['paypal-transmission-time'] as string
      };

      // Vérifier que tous les headers requis sont présents
      const missingHeaders = Object.entries(paypalHeaders)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingHeaders.length > 0) {
        logger.warn('Headers PayPal manquants pour webhook', { missingHeaders });
        ResponseUtil.validationError(res, `Headers PayPal manquants: ${missingHeaders.join(', ')}`);
        return;
      }

      // Traiter le webhook
      await PaymentService.handleWebhook(paypalHeaders, req.body);

      logger.info('Webhook PayPal traité avec succès', {
        eventType: req.body?.event_type,
        eventId: req.body?.id
      });

      // PayPal s'attend à une réponse 200
      ResponseUtil.success(res, { received: true }, 'Webhook traité avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        logger.error('Erreur traitement webhook PayPal:', {
          error: error.message,
          statusCode: error.statusCode,
          eventType: req.body?.event_type
        });
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur webhook PayPal:', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        eventType: req.body?.event_type,
        stack: error instanceof Error ? error.stack : undefined
      });
      ResponseUtil.serverError(res, 'Erreur lors du traitement du webhook');
    }
  }

  /**
   * Récupérer l'historique des paiements
   * GET /payments/history
   */
  static async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      // Validation et nettoyage des paramètres de pagination
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const payments = await PaymentService.getPaymentHistory(req.user.uid, limit, offset);

      logger.debug('Historique des paiements récupéré', {
        userId: req.user.uid,
        count: payments.length,
        limit,
        offset
      });

      ResponseUtil.success(res, {
        payments,
        pagination: {
          limit,
          offset,
          count: payments.length,
          hasMore: payments.length === limit
        }
      }, 'Historique des paiements récupéré');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur récupération historique paiements:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération de l\'historique');
    }
  }

  /**
   * Obtenir les détails d'un paiement
   * GET /payments/:id
   */
  static async getPaymentDetails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ResponseUtil.validationError(res, 'ID de paiement requis');
        return;
      }

      const payment = await PaymentService.getPaymentById(id, req.user.uid);

      logger.debug('Détails du paiement récupérés', {
        userId: req.user.uid,
        paymentId: id
      });

      ResponseUtil.success(res, { payment }, 'Détails du paiement récupérés');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur récupération détails paiement:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des détails');
    }
  }

  /**
   * Générer un reçu de paiement
   * GET /payments/:id/receipt
   */
  static async generateReceipt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ResponseUtil.validationError(res, 'ID de paiement requis');
        return;
      }

      // Vérifier que le paiement existe et appartient à l'utilisateur
      const payment = await PaymentService.getPaymentById(id, req.user.uid);

      if (payment.status !== 'succeeded') {
        ResponseUtil.validationError(res, 'Seuls les paiements réussis ont un reçu');
        return;
      }

      // TODO: Implémenter la génération de reçu PDF
      const receiptData = {
        paymentId: payment.id,
        receiptNumber: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
        receiptUrl: payment.receiptUrl || `/payments/${id}/receipt.pdf`,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          planType: payment.planType,
          interval: payment.interval,
          description: payment.description,
          completedAt: payment.completedAt,
          method: 'PayPal'
        },
        user: {
          email: req.user.email
        },
        company: {
          name: 'Cover Letter Generator',
          address: 'France', // À adapter selon votre entreprise
          email: 'support@coverlettergenerator.com'
        }
      };

      logger.info('Reçu de paiement généré', {
        userId: req.user.uid,
        paymentId: id,
        receiptNumber: receiptData.receiptNumber
      });

      ResponseUtil.success(res, receiptData, 'Reçu généré avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur génération reçu:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la génération du reçu');
    }
  }

  /**
   * Demander un remboursement PayPal
   * POST /payments/refund
   */
  static async requestRefund(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { paymentId, reason, amount } = req.body;

      if (!paymentId || !reason) {
        ResponseUtil.validationError(res, 'ID de paiement et raison du remboursement requis');
        return;
      }

      if (amount && (typeof amount !== 'number' || amount <= 0)) {
        ResponseUtil.validationError(res, 'Le montant du remboursement doit être un nombre positif');
        return;
      }

      await PaymentService.requestRefund(paymentId, req.user.uid, reason, amount);

      logger.info('Demande de remboursement PayPal créée', {
        userId: req.user.uid,
        paymentId,
        reason,
        amount
      });

      ResponseUtil.success(res, {
        refundRequested: true,
        paymentId,
        reason,
        amount,
        message: 'Votre demande de remboursement a été enregistrée. Nous la traiterons dans les plus brefs délais.'
      }, 'Demande de remboursement enregistrée');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      logger.error('Erreur demande de remboursement:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la demande de remboursement');
    }
  }

  /**
   * Obtenir les informations de pricing
   * GET /payments/pricing
   */
  static async getPricing(req: Request, res: Response): Promise<void> {
    try {
      const currency = (req.query.currency as Currency) || Currency.EUR;

      if (!Object.values(Currency).includes(currency)) {
        ResponseUtil.validationError(res, `Devise invalide. Valeurs acceptées: ${Object.values(Currency).join(', ')}`);
        return;
      }

      const pricing = {
        currency,
        plans: [
          {
            id: 'basic',
            name: 'Basique',
            description: 'Parfait pour commencer',
            features: [
              'Lettres illimitées',
              '5 générations IA par mois',
              'Templates de base',
              'Export PDF/DOCX',
              'Support email'
            ],
            pricing: {
              monthly: { 
                amount: PLAN_PRICES[currency].basic.monthly, 
                currency,
                savings: null
              },
              yearly: { 
                amount: PLAN_PRICES[currency].basic.yearly, 
                currency,
                savings: '17%'
              },
              lifetime: { 
                amount: PLAN_PRICES[currency].basic.lifetime, 
                currency,
                savings: '75%'
              }
            }
          },
          {
            id: 'pro',
            name: 'Professionnel',
            description: 'Pour les professionnels actifs',
            features: [
              'Lettres illimitées',
              '20 générations IA par mois',
              'Tous les templates',
              'Analyses IA avancées',
              'Export multiple formats',
              'Support prioritaire'
            ],
            pricing: {
              monthly: { 
                amount: PLAN_PRICES[currency].pro.monthly, 
                currency,
                savings: null
              },
              yearly: { 
                amount: PLAN_PRICES[currency].pro.yearly, 
                currency,
                savings: '17%'
              },
              lifetime: { 
                amount: PLAN_PRICES[currency].pro.lifetime, 
                currency,
                savings: '75%'
              }
            },
            popular: true
          },
          {
            id: 'premium',
            name: 'Premium',
            description: 'Solution complète',
            features: [
              'Lettres illimitées',
              'Générations IA illimitées',
              'Tous les templates premium',
              'Analyses IA expert',
              'API personnalisée',
              'Support VIP 24/7',
              'Accès anticipé aux nouvelles fonctionnalités',
              'Formation personnalisée'
            ],
            pricing: {
              monthly: { 
                amount: PLAN_PRICES[currency].premium.monthly, 
                currency,
                savings: null
              },
              yearly: { 
                amount: PLAN_PRICES[currency].premium.yearly, 
                currency,
                savings: '17%'
              },
              lifetime: { 
                amount: PLAN_PRICES[currency].premium.lifetime, 
                currency,
                savings: '75%'
              }
            }
          }
        ],
        paymentMethods: ['paypal'],
        trialAvailable: false,
        taxIncluded: true,
        refundPolicy: '30 jours satisfait ou remboursé'
      };

      ResponseUtil.success(res, pricing, 'Informations de tarification récupérées');

    } catch (error) {
      logger.error('Erreur récupération pricing:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des tarifs');
    }
  }
}