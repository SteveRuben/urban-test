// src/routes/payment.routes.ts - Version PayPal corrigée
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Routes publiques (webhooks PayPal)
/**
 * @route POST /payments/webhook/paypal
 * @desc Webhook PayPal pour les notifications de paiement
 * @access Public (avec vérification de signature PayPal)
 */
router.post('/webhook/paypal', PaymentController.handlePayPalWebhook);

/**
 * @route GET /payments/pricing
 * @desc Récupérer les informations de tarification
 * @access Public
 */
router.get('/pricing', PaymentController.getPricing);

// Routes protégées (authentification requise)
router.use(AuthMiddleware.validateFirebaseToken);

/**
 * @route POST /payments/create-paypal-session
 * @desc Créer une session de paiement PayPal (paiement unique ou abonnement)
 * @access Private
 * @body planType - Type de plan (basic, pro, premium)
 * @body interval - Intervalle de facturation (monthly, yearly, lifetime)
 * @body currency - Devise (optionnel, défaut: EUR)
 * @body successUrl - URL de retour en cas de succès (optionnel)
 * @body cancelUrl - URL de retour en cas d'annulation (optionnel)
 */
router.post('/create-paypal-session', PaymentController.createPayPalSession);

/**
 * @route POST /payments/confirm-paypal
 * @desc Confirmer et capturer un paiement PayPal
 * @access Private
 * @body paymentId - ID du paiement dans notre système
 * @body paypalOrderId - ID de l'ordre PayPal (pour paiements uniques)
 * @body paypalSubscriptionId - ID de l'abonnement PayPal (pour abonnements)
 */
router.post('/confirm-paypal', PaymentController.confirmPayPalPayment);

/**
 * @route POST /payments/cancel-subscription
 * @desc Annuler un abonnement PayPal
 * @access Private
 * @body subscriptionId - ID de l'abonnement PayPal
 * @body reason - Raison de l'annulation (optionnel)
 */
router.post('/cancel-subscription', PaymentController.cancelSubscription);

/**
 * @route GET /payments/history
 * @desc Récupérer l'historique des paiements de l'utilisateur
 * @access Private
 * @query limit - Nombre de résultats par page (max 50, défaut 10)
 * @query offset - Décalage pour la pagination (défaut 0)
 */
router.get('/history', PaymentController.getPaymentHistory);

/**
 * @route GET /payments/:id
 * @desc Récupérer les détails d'un paiement spécifique
 * @access Private
 * @param id - ID du paiement
 */
router.get('/:id', PaymentController.getPaymentDetails);

/**
 * @route GET /payments/:id/receipt
 * @desc Générer et télécharger le reçu d'un paiement
 * @access Private
 * @param id - ID du paiement
 */
router.get('/:id/receipt', PaymentController.generateReceipt);

/**
 * @route POST /payments/refund
 * @desc Demander un remboursement PayPal
 * @access Private
 * @body paymentId - ID du paiement à rembourser
 * @body reason - Raison du remboursement
 * @body amount - Montant à rembourser (optionnel, remboursement complet par défaut)
 */
router.post('/refund', PaymentController.requestRefund);

export default router;