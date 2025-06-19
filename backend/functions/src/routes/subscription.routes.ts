// src/routes/subscription.routes.ts
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Route publique pour les plans (pas d'auth requise)
router.get('/plans', SubscriptionController.getAvailablePlans);

// Toutes les autres routes nécessitent une authentification
router.use(AuthMiddleware.validateFirebaseToken);

// Routes principales des abonnements
router.get('/current', SubscriptionController.getCurrentSubscription);    // Abonnement actuel
router.get('/summary', SubscriptionController.getSubscriptionSummary);    // Résumé complet
router.post('/', SubscriptionController.createSubscription);              // Créer un abonnement
router.get('/:id', SubscriptionController.getSubscriptionById);           // Récupérer un abonnement
router.put('/:id', SubscriptionController.updateSubscription);            // Mettre à jour un abonnement

// Actions sur les abonnements
router.post('/:id/cancel', SubscriptionController.cancelSubscription);    // Annuler un abonnement
router.post('/:id/renew', SubscriptionController.renewSubscription);      // Renouveler un abonnement

// Vérification des limites
router.get('/ai-usage', SubscriptionController.checkAIUsage);             // Limites IA
router.get('/letter-limits', SubscriptionController.checkLetterLimits);   // Limites lettres
router.post('/increment-ai-usage', SubscriptionController.incrementAIUsage); // Incrémenter usage IA

export default router;