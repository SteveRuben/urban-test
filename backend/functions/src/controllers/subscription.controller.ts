// src/controllers/subscription.controller.ts
import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/errors.util';
import { logger } from 'firebase-functions';

export class SubscriptionController {
  /**
   * Créer un nouvel abonnement
   * POST /subscriptions
   */
  static async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const subscriptionData = req.body;
      const newSubscription = await SubscriptionService.createSubscription(req.user.uid, subscriptionData);
      
      ResponseUtil.created(res, newSubscription, 'Abonnement créé avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la création de l\'abonnement:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la création de l\'abonnement');
    }
  }

  /**
   * Récupérer l'abonnement actif de l'utilisateur
   * GET /subscriptions/current
   */
  static async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      logger.debug('Récupération de l\'abonnement actif pour l\'utilisateur', { userId: req.user.uid });
      const subscription = await SubscriptionService.getActiveUserSubscription(req.user.uid);
      
      if (!subscription) {
        ResponseUtil.success(res, null, 'Aucun abonnement actif');
        return;
      }
      
      ResponseUtil.success(res, subscription, 'Abonnement actuel récupéré');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération de l\'abonnement actuel:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération de l\'abonnement');
    }
  }

  /**
   * Récupérer un abonnement par ID
   * GET /subscriptions/:id
   */
  static async getSubscriptionById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const subscription = await SubscriptionService.getSubscriptionById(id, req.user.uid);
      
      ResponseUtil.success(res, subscription, 'Abonnement récupéré avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération de l\'abonnement');
    }
  }

  /**
   * Mettre à jour un abonnement
   * PUT /subscriptions/:id
   */
  static async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const updateData = req.body;
      
      const updatedSubscription = await SubscriptionService.updateSubscription(id, req.user.uid, updateData);
      
      ResponseUtil.success(res, updatedSubscription, 'Abonnement mis à jour avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la mise à jour de l\'abonnement');
    }
  }

  /**
   * Annuler un abonnement
   * POST /subscriptions/:id/cancel
   */
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const { cancelAtPeriodEnd } = req.body;
      
      const cancelledSubscription = await SubscriptionService.cancelSubscription(
        id, 
        req.user.uid, 
        cancelAtPeriodEnd !== false // Par défaut true
      );
      
      ResponseUtil.updated(res, cancelledSubscription, 'Abonnement annulé avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'annulation de l\'abonnement');
    }
  }

  /**
   * Renouveler un abonnement
   * POST /subscriptions/:id/renew
   */
  static async renewSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const { endDate } = req.body;
      
      if (!endDate) {
        ResponseUtil.validationError(res, 'Date de fin requise pour le renouvellement');
        return;
      }
      
      const renewedSubscription = await SubscriptionService.renewSubscription(
        id, 
        req.user.uid, 
        new Date(endDate)
      );
      
      ResponseUtil.updated(res, renewedSubscription, 'Abonnement renouvelé avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors du renouvellement de l\'abonnement:', error);
      ResponseUtil.serverError(res, 'Erreur lors du renouvellement de l\'abonnement');
    }
  }

  /**
   * Vérifier les limites d'utilisation de l'IA
   * GET /subscriptions/ai-usage
   */
  static async checkAIUsage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const usageInfo = await SubscriptionService.checkAIUsageLimit(req.user.uid);
      
      ResponseUtil.success(res, usageInfo, 'Informations d\'utilisation IA récupérées');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la vérification de l\'utilisation IA:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la vérification de l\'utilisation IA');
    }
  }

  /**
   * Vérifier les limites de création de lettres
   * GET /subscriptions/letter-limits
   */
  static async checkLetterLimits(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const limitsInfo = await SubscriptionService.checkLetterCreationLimit(req.user.uid);
      
      ResponseUtil.success(res, limitsInfo, 'Informations de limites récupérées');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la vérification des limites:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la vérification des limites');
    }
  }

  /**
   * Récupérer tous les plans disponibles
   * GET /subscriptions/plans
   */
  static async getAvailablePlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await SubscriptionService.getAvailablePlans();
      
      ResponseUtil.success(res, plans, 'Plans disponibles récupérés');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération des plans:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des plans');
    }
  }

  /**
   * Obtenir un résumé complet de l'abonnement utilisateur
   * GET /subscriptions/summary
   */
  static async getSubscriptionSummary(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      // Récupérer toutes les informations en parallèle
      const [subscription, aiUsage, letterLimits] = await Promise.all([
        SubscriptionService.getActiveUserSubscription(req.user.uid),
        SubscriptionService.checkAIUsageLimit(req.user.uid),
        SubscriptionService.checkLetterCreationLimit(req.user.uid)
      ]);

      const summary = {
        subscription,
        aiUsage,
        letterLimits,
        hasActiveSubscription: subscription !== null,
        subscriptionType: subscription?.plan || 'free'
      };
      
      ResponseUtil.success(res, summary, 'Résumé d\'abonnement récupéré');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération du résumé:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération du résumé');
    }
  }

  /**
   * Incrémenter l'utilisation de l'IA (utilisé par le service IA)
   * POST /subscriptions/increment-ai-usage
   */
  static async incrementAIUsage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      await SubscriptionService.incrementAIUsage(req.user.uid);
      
      ResponseUtil.success(res, null, 'Utilisation IA incrémentée');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de l\'incrémentation de l\'utilisation IA:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'incrémentation de l\'utilisation IA');
    }
  }
}