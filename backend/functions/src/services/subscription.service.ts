// src/services/subscription.service.ts - Version corrigée pour PayPal
import { db, COLLECTIONS } from '../config/firebase';
import { Subscription, SubscriptionStatus, SubscriptionPlan, Plan, SUBSCRIPTION_PLANS } from '../models/subscription.model';
import { PlanType, SubscriptionInterval } from '../models/payment.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { logger } from 'firebase-functions/v2';

export class SubscriptionService {
  private static subscriptionCollection = db.collection(COLLECTIONS.SUBSCRIPTIONS);
  private static planCollection = db.collection(COLLECTIONS.PLANS);
  private static userCollection = db.collection(COLLECTIONS.USERS);

  /**
   * Créer un nouvel abonnement
   */
  static async createSubscription(userId: string, subscriptionData: Partial<Subscription>): Promise<Subscription> {
    try {
      // Validation des données requises
      const requiredFields = ['planId', 'plan'];
      const missingFields = ValidationUtil.validateRequiredFields(subscriptionData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      // Vérifier si l'utilisateur a déjà un abonnement actif
      const existingSubscription = await this.getActiveUserSubscription(userId);
      if (existingSubscription && existingSubscription.status === SubscriptionStatus.ACTIVE) {
        // Annuler l'ancien abonnement
        await this.cancelSubscription(existingSubscription.id, userId, false);
        logger.info('Ancien abonnement annulé lors de la création du nouveau', {
          userId,
          oldSubscriptionId: existingSubscription.id
        });
      }

      const subscriptionId = this.subscriptionCollection.doc().id;
      const now = new Date();
      
      const newSubscription: Subscription = {
        id: subscriptionId,
        userId,
        planId: subscriptionData.planId!,
        plan: subscriptionData.plan!,
        status: subscriptionData.status || SubscriptionStatus.ACTIVE,
        startDate: subscriptionData.startDate || now,
        paymentId: subscriptionData.paymentId || '',
        trialCount: subscriptionData.trialCount || 0,
        aiUsageCount: 0,
        aiUsageReset: this.getNextMonthDate(now),
        isAutoRenew: subscriptionData.isAutoRenew !== false, // Par défaut true
        cancelAtPeriodEnd: false,
        
        // Champs PayPal spécifiques
        paypalSubscriptionId: subscriptionData.paypalSubscriptionId || '',
        paypalOrderId: subscriptionData.paypalOrderId || '',
        
        // Période actuelle pour la facturation
        currentPeriodStart: subscriptionData.startDate || now,
        currentPeriodEnd: subscriptionData.endDate || this.calculateEndDate(now, subscriptionData.plan!),
        endDate: subscriptionData.endDate || this.calculateEndDate(now, subscriptionData.plan!),
        createdAt: now,
        updatedAt: now
      };

      // Créer l'abonnement
      await this.subscriptionCollection.doc(subscriptionId).set(newSubscription);

      // Mettre à jour l'utilisateur avec l'ID de l'abonnement
      await this.userCollection.doc(userId).update({
        subscriptionId: subscriptionId,
        updatedAt: now
      });

      logger.info('Abonnement créé avec succès', {
        subscriptionId,
        userId,
        planId: subscriptionData.planId,
        plan: subscriptionData.plan
      });

      return newSubscription;
    } catch (error) {
      logger.error('Erreur lors de la création de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour l'abonnement d'un utilisateur après paiement PayPal
   */
  static async updateUserSubscription(
    userId: string,
    planType: PlanType,
    interval: SubscriptionInterval,
    paymentId?: string,
    paypalData?: {
      subscriptionId?: string;
      orderId?: string;
    }
  ): Promise<Subscription> {
    try {
      // Mapper le PlanType vers SubscriptionPlan
      const subscriptionPlan = this.mapPlanTypeToSubscriptionPlan(planType);
      
      // Calculer les dates d'abonnement
      const startDate = new Date();
      const endDate = this.calculateEndDate(startDate, subscriptionPlan, interval);

      const subscriptionData: Partial<Subscription> = {
        planId: planType,
        plan: subscriptionPlan,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        paymentId,
        paypalSubscriptionId: paypalData?.subscriptionId,
        paypalOrderId: paypalData?.orderId,
        isAutoRenew: interval !== 'lifetime'
      };

      // Vérifier s'il y a déjà un abonnement
      const existingSubscription = await this.getActiveUserSubscription(userId);
      
      if (existingSubscription) {
        // Mettre à jour l'abonnement existant
        return await this.updateSubscription(existingSubscription.id, userId, subscriptionData);
      } else {
        // Créer un nouvel abonnement
        return await this.createSubscription(userId, subscriptionData);
      }

    } catch (error) {
      logger.error('Erreur mise à jour abonnement utilisateur:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'abonnement actif d'un utilisateur
   */
  static async getActiveUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const snapshot = await this.subscriptionCollection
        .where('userId', '==', userId)
        .where('status', 'in', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const subscriptionData = snapshot.docs[0].data() as Subscription;
      logger.debug('Abonnement actif trouvé', {
        userId,
        endDate: subscriptionData.endDate?.valueOf(),
        date:  (new Date().valueOf()),
        eq: subscriptionData.endDate ? (new Date() > subscriptionData.endDate) : false
      });
      // Vérifier si l'abonnement a expiré
     /*  if (subscriptionData.endDate && new Date() > subscriptionData.endDate) {
        // Marquer comme expiré
        await this.expireSubscription(subscriptionData.id);
        return null;
      }
 */
      return {
        ...subscriptionData,
        startDate: subscriptionData.startDate,
        endDate:  subscriptionData.endDate,
        currentPeriodStart:  subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        aiUsageReset: subscriptionData.aiUsageReset,
        createdAt: subscriptionData.createdAt,
        updatedAt: subscriptionData.updatedAt
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'abonnement actif:', error);
      throw error;
    }
  }

  /**
   * Récupérer un abonnement par ID
   */
  static async getSubscriptionById(subscriptionId: string, userId?: string): Promise<Subscription> {
    try {
      if (!ValidationUtil.isValidObjectId(subscriptionId)) {
        throw new ValidationError('ID abonnement invalide');
      }

      const subscriptionDoc = await this.subscriptionCollection.doc(subscriptionId).get();
      
      if (!subscriptionDoc.exists) {
        throw new NotFoundError('Abonnement non trouvé');
      }

      const subscriptionData = subscriptionDoc.data() as Subscription;
      
      // Vérifier que l'utilisateur est le propriétaire (si userId fourni)
      if (userId && subscriptionData.userId !== userId) {
        throw new ForbiddenError('Accès non autorisé à cet abonnement');
      }

      return {
        ...subscriptionData,
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.endDate,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        aiUsageReset: subscriptionData.aiUsageReset,
        createdAt: subscriptionData.createdAt,
        updatedAt: subscriptionData.updatedAt
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un abonnement
   */
  static async updateSubscription(subscriptionId: string, userId: string, updateData: Partial<Subscription>): Promise<Subscription> {
    try {
      // Vérifier que l'abonnement existe et appartient à l'utilisateur
      await this.getSubscriptionById(subscriptionId, userId);

      const updateFields: Partial<Subscription> = {
        ...updateData,
        updatedAt: new Date()
      };

      // Empêcher la modification de certains champs sensibles
      delete updateFields.id;
      delete updateFields.userId;
      delete updateFields.createdAt;

      // Mettre à jour
      await this.subscriptionCollection.doc(subscriptionId).update(updateFields);

      logger.info('Abonnement mis à jour', {
        subscriptionId,
        userId,
        updateFields: Object.keys(updateFields)
      });

      // Retourner l'abonnement mis à jour
      return await this.getSubscriptionById(subscriptionId, userId);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Annuler un abonnement
   */
  static async cancelSubscription(subscriptionId: string, userId: string, cancelAtPeriodEnd: boolean = true, reason?: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId, userId);

      if (subscription.status === SubscriptionStatus.CANCELLED) {
        throw new ValidationError('Abonnement déjà annulé');
      }

      const updateData: Partial<Subscription> = {
        cancelAtPeriodEnd,
        isAutoRenew: false,
        cancelReason: reason
      };

      // Si annulation immédiate, changer le statut
      if (!cancelAtPeriodEnd) {
        updateData.status = SubscriptionStatus.CANCELLED;
        updateData.endDate = new Date();
        updateData.currentPeriodEnd = new Date();
      }

      logger.info('Abonnement annulé', {
        subscriptionId,
        userId,
        cancelAtPeriodEnd,
        reason
      });

      return await this.updateSubscription(subscriptionId, userId, updateData);
    } catch (error) {
      logger.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      throw error;
    }
  }
  /**
   * Surcharge pour annuler par userId directement
   */
  static async cancelSubscriptionByUserId(userId: string, reason?: string): Promise<void>{
    try{

        const subscription = await this.getActiveUserSubscription(userId);
        if (!subscription) {
          logger.warn('Aucun abonnement actif trouvé pour annulation', { userId });
          return;
        }
        
        await this.cancelSubscription(subscription.id, userId, true, reason);
        return;
    }catch (error) {
      logger.error('Erreur annulation abonnement par userId:', error);
      throw error;
    }
  }
  // Surcharge pour annuler par subscriptionId et userId
  /*static async cancelSubscription(userId: string, reason?: string): Promise<void>;
  static async cancelSubscription(subscriptionId: string, userId: string, cancelAtPeriodEnd?: boolean, reason?: string): Promise<Subscription>;
  static async cancelSubscription(
    userIdOrSubscriptionId: string, 
    userIdOrReason?: string, 
    cancelAtPeriodEnd: boolean = true, 
    reason?: string
  ): Promise<Subscription | void> {
    try {
      // Si seulement userId fourni (première surcharge)
      if (typeof userIdOrReason === 'string' && !cancelAtPeriodEnd && !reason) {
        const userId = userIdOrSubscriptionId;
        const cancelReason = userIdOrReason;
        
        const subscription = await this.getActiveUserSubscription(userId);
        if (!subscription) {
          logger.warn('Aucun abonnement actif trouvé pour annulation', { userId });
          return;
        }
        
        await this.cancelSubscription(subscription.id, userId, true, cancelReason);
        return;
      }
      
      // Sinon, utiliser la logique normale (deuxième surcharge)
      return await this.cancelSubscription(
        userIdOrSubscriptionId, 
        userIdOrReason as string, 
        cancelAtPeriodEnd, 
        reason
      );
      
    } catch (error) {
      logger.error('Erreur annulation abonnement:', error);
      throw error;
    }
  }*/

  /**
   * Renouveler un abonnement
   */
  static async renewSubscription(subscriptionId: string, userId: string, newEndDate?: Date): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId, userId);
      
      const endDate = newEndDate || this.calculateEndDate(
        subscription.currentPeriodEnd || new Date(), 
        subscription.plan
      );

      const updateData: Partial<Subscription> = {
        status: SubscriptionStatus.ACTIVE,
        endDate,
        currentPeriodStart: subscription.currentPeriodEnd || new Date(),
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        isAutoRenew: true
      };

      logger.info('Abonnement renouvelé', {
        subscriptionId,
        userId,
        newEndDate: endDate
      });

      return await this.updateSubscription(subscriptionId, userId, updateData);
    } catch (error) {
      logger.error('Erreur lors du renouvellement de l\'abonnement:', error);
      throw error;
    }
  }

  /**
   * Marquer un abonnement comme expiré
   */
  static async expireSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.subscriptionCollection.doc(subscriptionId).update({
        status: SubscriptionStatus.EXPIRED,
        updatedAt: new Date()
      });

      logger.info('Abonnement marqué comme expiré', { subscriptionId });
    } catch (error) {
      logger.error('Erreur expiration abonnement:', error);
      throw error;
    }
  }

  /**
   * Vérifier les limites d'utilisation de l'IA
   */
  static async checkAIUsageLimit(userId: string): Promise<{
    canUse: boolean;
    currentUsage: number;
    limit: number | null;
    resetDate: Date | null;
    plan: SubscriptionPlan;
  }> {
    try {
      const subscription = await this.getActiveUserSubscription(userId);
      
      if (!subscription) {
        // Utilisateur gratuit/sans abonnement
        return {
          canUse: false,
          currentUsage: 0,
          limit: SUBSCRIPTION_PLANS.FREE.aiLimit,
          resetDate: null,
          plan: SubscriptionPlan.FREE
        };
      }

      const planLimits = this.getPlanLimits(subscription.plan);
      const currentUsage = subscription.aiUsageCount || 0;
      const limit = planLimits.aiLimit;
      
      // Vérifier si le compteur doit être réinitialisé
      const now = new Date();
      if (subscription.aiUsageReset && now >= subscription.aiUsageReset) {
        // Réinitialiser le compteur
        await this.resetAIUsageCount(subscription.id, userId);
        return {
          canUse: true,
          currentUsage: 0,
          limit,
          resetDate: this.getNextMonthDate(now),
          plan: subscription.plan
        };
      }

      return {
        canUse: limit === null || currentUsage < limit,
        currentUsage,
        limit,
        resetDate: subscription.aiUsageReset || null,
        plan: subscription.plan
      };
    } catch (error) {
      logger.error('Erreur lors de la vérification des limites IA:', error);
      throw error;
    }
  }

  /**
   * Incrémenter l'utilisation de l'IA
   */
  static async incrementAIUsage(userId: string): Promise<void> {
    try {
      const subscription = await this.getActiveUserSubscription(userId);
      
      if (!subscription) {
        throw new ForbiddenError('Aucun abonnement actif pour utiliser l\'IA');
      }

      const usageCheck = await this.checkAIUsageLimit(userId);
      if (!usageCheck.canUse) {
        throw new ForbiddenError(`Limite d'utilisation de l'IA atteinte (${usageCheck.currentUsage}/${usageCheck.limit})`);
      }

      await this.subscriptionCollection.doc(subscription.id).update({
        aiUsageCount: (subscription.aiUsageCount || 0) + 1,
        updatedAt: new Date()
      });

      logger.debug('Utilisation IA incrémentée', {
        userId,
        subscriptionId: subscription.id,
        newCount: (subscription.aiUsageCount || 0) + 1
      });

    } catch (error) {
      logger.error('Erreur lors de l\'incrémentation de l\'utilisation IA:', error);
      throw error;
    }
  }

  /**
   * Réinitialiser le compteur d'utilisation de l'IA
   */
  private static async resetAIUsageCount(subscriptionId: string, userId: string): Promise<void> {
    const now = new Date();
    await this.subscriptionCollection.doc(subscriptionId).update({
      aiUsageCount: 0,
      aiUsageReset: this.getNextMonthDate(now),
      updatedAt: now
    });

    logger.info('Compteur IA réinitialisé', {
      subscriptionId,
      userId,
      nextReset: this.getNextMonthDate(now)
    });
  }

  /**
   * Vérifier si l'utilisateur peut créer une nouvelle lettre
   */
  static async checkLetterCreationLimit(userId: string): Promise<{
    canCreate: boolean;
    currentCount: number;
    limit: number | null;
    plan: SubscriptionPlan;
  }> {
    try {
      const subscription = await this.getActiveUserSubscription(userId);
      
      // Compter les lettres existantes
      const lettersSnapshot = await db.collection(COLLECTIONS.LETTERS)
        .where('userId', '==', userId)
        .get();
      
      const currentCount = lettersSnapshot.size;
      
      if (!subscription) {
        // Utilisateur gratuit
        const limit = SUBSCRIPTION_PLANS.FREE.letterLimit;
        return {
          canCreate: limit === null || currentCount < limit,
          currentCount,
          limit,
          plan: SubscriptionPlan.FREE
        };
      }

      const planLimits = this.getPlanLimits(subscription.plan);
      const limit = planLimits.letterLimit;
      
      return {
        canCreate: limit === null || currentCount < limit,
        currentCount,
        limit,
        plan: subscription.plan
      };
    } catch (error) {
      logger.error('Erreur lors de la vérification des limites de lettres:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les plans disponibles
   */
  static async getAvailablePlans(): Promise<Plan[]> {
    try {
      const snapshot = await this.planCollection
        .where('isActive', '==', true)
        .orderBy('price')
        .get();

      if (snapshot.empty) {
        // Retourner des plans par défaut si aucun plan n'est configuré
        return this.getDefaultPlans();
      }

      return snapshot.docs.map(doc => {
        const data = doc.data() as Plan;
        return { ...data };
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des plans:', error);
      // Retourner des plans par défaut en cas d'erreur
      return this.getDefaultPlans();
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  /**
   * Mapper PlanType (PayPal) vers SubscriptionPlan
   */
  private static mapPlanTypeToSubscriptionPlan(planType: PlanType): SubscriptionPlan {
    const mapping: Record<PlanType, SubscriptionPlan> = {
      basic: SubscriptionPlan.BASIC,
      pro: SubscriptionPlan.PRO,
      premium: SubscriptionPlan.PREMIUM
    };
    
    return mapping[planType] || SubscriptionPlan.FREE;
  }

  /**
   * Calculer la date de fin d'abonnement
   */
  private static calculateEndDate(
    startDate: Date, 
    plan: SubscriptionPlan, 
    interval?: SubscriptionInterval
  ): Date | undefined {
    if (interval === 'lifetime') {
      return undefined; // Pas de date de fin pour lifetime
    }
    
    if (interval === 'yearly') {
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      return endDate;
    }
    
    // Par défaut mensuel
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  /**
   * Obtenir les limites d'un plan
   */
  private static getPlanLimits(plan: SubscriptionPlan): {
    aiLimit: number | null;
    letterLimit: number | null;
  } {
    const limits = {
      [SubscriptionPlan.FREE]: SUBSCRIPTION_PLANS.FREE,
      [SubscriptionPlan.BASIC]: SUBSCRIPTION_PLANS.BASIC,
      [SubscriptionPlan.PRO]: SUBSCRIPTION_PLANS.PRO,
      [SubscriptionPlan.PREMIUM]: SUBSCRIPTION_PLANS.PREMIUM
    };
    
    return limits[plan] || SUBSCRIPTION_PLANS.FREE;
  }

  /**
   * Obtenir la date du mois prochain
   */
  private static getNextMonthDate(date: Date): Date {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // Premier jour du mois
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }

  /**
   * Plans par défaut
   */
  public static getDefaultPlans(): Plan[] {
    return [
      {
        id: 'free',
        name: 'Gratuit',
        description: 'Plan gratuit avec fonctionnalités de base',
        features: ['3 lettres maximum', 'Modèles de base', 'Export PDF'],
        price: 0,
        currency: 'eur',
        interval: 'month',
        trialDays: 0,
        isActive: true,
        monthlyAILimit: 0,
        unlimitedAI: false,
      },
      {
        id: 'basic',
        name: 'Basique',
        description: 'Plan basique pour utilisateurs occasionnels',
        features: ['Lettres illimitées', '5 générations IA/mois', 'Modèles premium', 'Export PDF/DOCX'],
        price: 9.99,
        currency: 'eur',
        interval: 'month',
        trialDays: 7,
        isActive: true,
        monthlyAILimit: 5,
        unlimitedAI: false,
      },
      {
        id: 'pro',
        name: 'Professionnel',
        description: 'Plan professionnel avec IA avancée',
        features: ['Lettres illimitées', '20 générations IA/mois', 'Tous les modèles', 'Analytiques', 'Support prioritaire'],
        price: 19.99,
        currency: 'eur',
        interval: 'month',
        trialDays: 14,
        isActive: true,
        monthlyAILimit: 20,
        unlimitedAI: false,
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'Plan premium avec IA illimitée',
        features: ['Lettres illimitées', 'IA illimitée', 'Tous les modèles', 'Analytiques avancées', 'Support VIP'],
        price: 39.99,
        currency: 'eur',
        interval: 'month',
        trialDays: 30,
        isActive: true,
        monthlyAILimit: null, // Illimité
        unlimitedAI: true,
      }
    ];
  }

  /**
   * Nettoyer les abonnements expirés (tâche de maintenance)
   */
  static async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      const now = new Date();
      const snapshot = await this.subscriptionCollection
        .where('status', '==', SubscriptionStatus.ACTIVE)
        .where('endDate', '<=', now)
        .get();

      let expiredCount = 0;
      const batch = db.batch();

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: SubscriptionStatus.EXPIRED,
          updatedAt: now
        });
        expiredCount++;
      });

      if (expiredCount > 0) {
        await batch.commit();
        logger.info(`${expiredCount} abonnements expirés nettoyés`);
      }

      return expiredCount;
    } catch (error) {
      logger.error('Erreur nettoyage abonnements expirés:', error);
      throw error;
    }
  }

  /**
   * Statistiques des abonnements
   */
  static async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    byPlan: Record<SubscriptionPlan, number>;
  }> {
    try {
      const snapshot = await this.subscriptionCollection.get();
      
      const stats = {
        total: snapshot.size,
        active: 0,
        expired: 0,
        cancelled: 0,
        byPlan: {
          [SubscriptionPlan.FREE]: 0,
          [SubscriptionPlan.BASIC]: 0,
          [SubscriptionPlan.PRO]: 0,
          [SubscriptionPlan.PREMIUM]: 0,
          [SubscriptionPlan.MONTHLY]: 0,
          [SubscriptionPlan.LIFETIME]: 0
        }
      };

      snapshot.docs.forEach(doc => {
        const subscription = doc.data() as Subscription;
        
        // Compter par statut
        switch (subscription.status) {
          case SubscriptionStatus.ACTIVE:
            stats.active++;
            break;
          case SubscriptionStatus.EXPIRED:
            stats.expired++;
            break;
          case SubscriptionStatus.CANCELLED:
            stats.cancelled++;
            break;
        }
        
        // Compter par plan
        if (subscription.plan in stats.byPlan) {
          stats.byPlan[subscription.plan]++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Erreur récupération statistiques abonnements:', error);
      throw error;
    }
  }
}