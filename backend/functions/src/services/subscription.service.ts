// src/services/subscription.service.ts - Version corrigée pour PayPal
import { db, COLLECTIONS } from '../config/firebase';
import { Subscription, SubscriptionStatus, SubscriptionPlan, Plan, SUBSCRIPTION_PLANS } from '../models/subscription.model';
import { PlanType, SubscriptionInterval } from '../models/payment.model';
import { NotFoundError, ValidationError, ForbiddenError, AppError } from '../utils/errors.util';
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

  /**
 * Vérifier les limites spécifiques aux nouvelles fonctionnalités
 */
static async checkFeatureLimit(
  userId: string, 
  feature: 'cv_creation' | 'template_premium' | 'ai_analysis' | 'export_advanced' | 'cv_analysis' | 'job_matching'
): Promise<{
  canUse: boolean;
  currentUsage?: number;
  limit?: number;
  requiresUpgrade?: boolean;
  currentPlan: string;
  nextPlan?: string;
}> {
  try {
    const subscription = await this.getActiveUserSubscription(userId);
    const plan = subscription?.plan || 'free';
    
    switch (feature) {
      case 'cv_creation':
        const cvCount = await db.collection(COLLECTIONS.CVS)
          .where('userId', '==', userId)
          .get();
        
        const cvLimits = { 
          free: 2, 
          basic: 5, 
          pro: 15, 
          premium: 50,
          lifetime: 50 
        };
        const limit = cvLimits[plan as keyof typeof cvLimits] || 2;
        
        return {
          canUse: cvCount.size < limit,
          currentUsage: cvCount.size,
          limit,
          requiresUpgrade: cvCount.size >= limit,
          currentPlan: plan,
          nextPlan: plan === 'free' ? 'basic' : plan === 'basic' ? 'pro' : 'premium'
        };
        
      case 'template_premium':
        const premiumAccess = ['pro', 'premium', 'lifetime'].includes(plan);
        return {
          canUse: premiumAccess,
          requiresUpgrade: !premiumAccess,
          currentPlan: plan,
          nextPlan: plan === 'free' || plan === 'basic' ? 'pro' : undefined
        };
        
      case 'ai_analysis':
      case 'cv_analysis':
        const analysisAccess = ['basic', 'pro', 'premium', 'lifetime'].includes(plan);
        return {
          canUse: analysisAccess,
          requiresUpgrade: !analysisAccess,
          currentPlan: plan,
          nextPlan: plan === 'free' ? 'basic' : undefined
        };
        
      case 'job_matching':
        const matchingAccess = ['pro', 'premium', 'lifetime'].includes(plan);
        return {
          canUse: matchingAccess,
          requiresUpgrade: !matchingAccess,
          currentPlan: plan,
          nextPlan: plan === 'free' || plan === 'basic' ? 'pro' : undefined
        };
        
      case 'export_advanced':
        const exportAccess = ['pro', 'premium', 'lifetime'].includes(plan);
        
        // Vérifier l'usage mensuel des exports pour les plans limités
        if (exportAccess && plan !== 'premium' && plan !== 'lifetime') {
          const currentMonth = new Date().toISOString().substring(0, 7);
          const exportsSnapshot = await db.collection(COLLECTIONS.CV_EXPORTS)
            .where('userId', '==', userId)
            .where('createdAt', '>=', new Date(currentMonth + '-01'))
            .get();
          
          const monthlyExportLimits = { pro: 20, basic: 5 };
          const monthlyLimit = monthlyExportLimits[plan as keyof typeof monthlyExportLimits] || 0;
          
          return {
            canUse: exportsSnapshot.size < monthlyLimit,
            currentUsage: exportsSnapshot.size,
            limit: monthlyLimit,
            requiresUpgrade: exportsSnapshot.size >= monthlyLimit,
            currentPlan: plan,
            nextPlan: 'premium'
          };
        }
        
        return {
          canUse: exportAccess,
          requiresUpgrade: !exportAccess,
          currentPlan: plan,
          nextPlan: plan === 'free' || plan === 'basic' ? 'pro' : undefined
        };
        
      default:
        return { 
          canUse: false, 
          requiresUpgrade: true, 
          currentPlan: plan,
          nextPlan: 'basic'
        };
    }
  } catch (error) {
    logger.error('Erreur vérification limite fonctionnalité:', error);
    throw new AppError('Erreur lors de la vérification des limites', 500);
  }
}

/**
 * Vérifier les limites d'utilisation IA spécifiques aux nouvelles fonctionnalités
 */
static async checkAIFeatureUsage(
  userId: string, 
  featureType: 'cv_generation' | 'cv_analysis' | 'job_matching' | 'template_generation'
): Promise<{
  canUse: boolean;
  currentUsage: number;
  limit: number | null;
  resetDate: Date | null;
  plan: string;
}> {
  try {
    const subscription = await this.getActiveUserSubscription(userId);
    const plan = subscription?.plan || 'free';
    
    // Définir les limites par fonctionnalité et par plan
    const featureLimits = {
      cv_generation: {
        free: 0,
        basic: 3,
        pro: 10,
        premium: null, // illimité
        lifetime: null
      },
      cv_analysis: {
        free: 0,
        basic: 5,
        pro: 20,
        premium: null,
        lifetime: null
      },
      job_matching: {
        free: 0,
        basic: 0,
        pro: 15,
        premium: null,
        lifetime: null
      },
      template_generation: {
        free: 0,
        basic: 10,
        pro: 30,
        premium: null,
        lifetime: null
      }
    };
    
    const limit = featureLimits[featureType][plan as keyof typeof featureLimits[typeof featureType]] || 0;
    
    // Compter l'usage actuel du mois
    const currentMonth = new Date().toISOString().substring(0, 7);
    const usageSnapshot = await db.collection(COLLECTIONS.AI_USAGE)
      .where('userId', '==', userId)
      .where('featureType', '==', featureType)
      .where('createdAt', '>=', new Date(currentMonth + '-01'))
      .get();
    
    const currentUsage = usageSnapshot.size;
    
    // Date de réinitialisation (1er du mois prochain)
    const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    
    return {
      canUse: limit === null || currentUsage < limit,
      currentUsage,
      limit,
      resetDate,
      plan
    };
  } catch (error) {
    logger.error('Erreur vérification usage IA fonctionnalité:', error);
    throw new AppError('Erreur lors de la vérification de l\'usage IA', 500);
  }
}

/**
 * Enregistrer l'utilisation d'une fonctionnalité IA
 */
static async logAIFeatureUsage(
  userId: string,
  featureType: 'cv_generation' | 'cv_analysis' | 'job_matching' | 'template_generation',
  metadata?: {
    cvId?: string;
    jobTitle?:string;
    company?:string;
    matchingScore?:string;
    cvRegion?:string;
    targetRegion?:string;
    targetJob?: string;
    type?:string;
    templateId?: string;
    model?: string;
    tokensUsed?: number;
    cost?: number;
  }
): Promise<void> {
  try {
    const usageId = db.collection(COLLECTIONS.AI_USAGE).doc().id;
    const usageLog = {
      id: usageId,
      userId,
      featureType,
      metadata: metadata || {},
      createdAt: new Date(),
      month: new Date().toISOString().substring(0, 7) // YYYY-MM
    };
    
    await db.collection(COLLECTIONS.AI_USAGE).doc(usageId).set(usageLog);
    
    logger.debug('Usage IA fonctionnalité enregistré', { userId, featureType, usageId });
  } catch (error) {
    logger.error('Erreur enregistrement usage IA fonctionnalité:', error);
    // Ne pas faire échouer l'opération principale
  }
}

/**
 * Obtenir les recommandations de mise à niveau
 */
static async getUpgradeRecommendations(userId: string): Promise<{
  shouldUpgrade: boolean;
  currentPlan: string;
  recommendedPlan: string;
  reasons: string[];
  blockedFeatures: string[];
  savings?: number;
}> {
  try {
    const subscription = await this.getActiveUserSubscription(userId);
    const currentPlan = subscription?.plan || 'free';
    
    // Analyser l'usage des 30 derniers jours
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [cvCount, aiUsage, templateUsage] = await Promise.all([
      // Compter les CV créés
      db.collection(COLLECTIONS.CVS)
        .where('userId', '==', userId)
        .where('createdAt', '>=', thirtyDaysAgo)
        .get(),
      
      // Compter l'usage IA
      db.collection(COLLECTIONS.AI_USAGE)
        .where('userId', '==', userId)
        .where('createdAt', '>=', thirtyDaysAgo)
        .get(),
      
      // Compter l'usage des templates
      db.collection(COLLECTIONS.TEMPLATE_INSTANCES)
        .where('userId', '==', userId)
        .where('createdAt', '>=', thirtyDaysAgo)
        .get()
    ]);
    
    const reasons: string[] = [];
    const blockedFeatures: string[] = [];
    let recommendedPlan = currentPlan;
    
    // Analyser les besoins selon l'usage
    if (currentPlan === 'free') {
      if (cvCount.size >= 2) {
        reasons.push('Vous avez atteint la limite de CV gratuits');
        blockedFeatures.push('Création de CV supplémentaires');
      }
      
      if (aiUsage.size > 0) {
        reasons.push('Vous pourriez bénéficier de la génération IA');
        blockedFeatures.push('Génération IA de contenu');
      }
      if(templateUsage.size > 15 ){
       // TOOD:
      }
      
      recommendedPlan = 'basic';
    }
    
    if (currentPlan === 'basic') {
      if (cvCount.size >= 4) {
        reasons.push('Vous approchez de la limite de CV');
        recommendedPlan = 'pro';
      }
      
      if (aiUsage.size >= 8) {
        reasons.push('Usage intensif de l\'IA détecté');
        recommendedPlan = 'pro';
      }
      
      // Vérifier les tentatives d'accès aux fonctionnalités premium
      const premiumAttempts = await db.collection('feature_attempts')
        .where('userId', '==', userId)
        .where('blocked', '==', true)
        .where('createdAt', '>=', thirtyDaysAgo)
        .get();
      
      if (premiumAttempts.size > 3) {
        reasons.push('Tentatives fréquentes d\'accès aux fonctionnalités premium');
        blockedFeatures.push('Templates premium', 'Analyse avancée de CV');
        recommendedPlan = 'pro';
      }
    }
    
    if (currentPlan === 'pro') {
      if (aiUsage.size >= 25) {
        reasons.push('Usage très intensif de l\'IA');
        recommendedPlan = 'premium';
      }
      
      if (cvCount.size >= 12) {
        reasons.push('Création intensive de CV');
        recommendedPlan = 'premium';
      }
    }
    
    // Calculer les économies potentielles pour lifetime
    let savings = 0;
    if (recommendedPlan === 'premium' && currentPlan !== 'lifetime') {
      const monthlyPrice = 39.99; // Prix premium mensuel
      const lifetimePrice = 799.99; // Prix lifetime
      //const breakEvenMonths = Math.ceil(lifetimePrice / monthlyPrice);
      savings = (monthlyPrice * 24) - lifetimePrice; // Économies sur 2 ans
    }
    
    return {
      shouldUpgrade: recommendedPlan !== currentPlan,
      currentPlan,
      recommendedPlan,
      reasons,
      blockedFeatures,
      savings: savings > 0 ? savings : undefined
    };
  } catch (error) {
    logger.error('Erreur calcul recommandations mise à niveau:', error);
    throw new AppError('Erreur lors du calcul des recommandations', 500);
  }
}

/**
 * Vérifier la compatibilité d'une fonctionnalité avec le plan actuel
 */
static async isFeatureAvailable(
  userId: string,
  feature: string
): Promise<{
  available: boolean;
  planRequired?: string;
  currentPlan: string;
}> {
  try {
    const subscription = await this.getActiveUserSubscription(userId);
    const currentPlan = subscription?.plan || 'free';
    
    // Mapping des fonctionnalités par plan
    const featureRequirements = {
      'cv_creation_unlimited': 'basic',
      'ai_generation': 'basic',
      'premium_templates': 'pro',
      'cv_analysis': 'basic',
      'job_matching': 'pro',
      'advanced_exports': 'pro',
      'unlimited_ai': 'premium',
      'priority_support': 'pro',
      'vip_support': 'premium',
      'custom_branding': 'premium',
      'api_access': 'premium'
    };
    
    const requiredPlan = featureRequirements[feature as keyof typeof featureRequirements];
    
    if (!requiredPlan) {
      // Fonctionnalité non reconnue, considérée comme disponible
      return {
        available: true,
        currentPlan
      };
    }
    
    // Hiérarchie des plans
    const planHierarchy = {
      free: 0,
      basic: 1,
      pro: 2,
      premium: 3,
      lifetime: 3
    };
    
    const currentLevel = planHierarchy[currentPlan as keyof typeof planHierarchy] || 0;
    const requiredLevel = planHierarchy[requiredPlan as keyof typeof planHierarchy] || 0;
    
    return {
      available: currentLevel >= requiredLevel,
      planRequired: currentLevel < requiredLevel ? requiredPlan : undefined,
      currentPlan
    };
  } catch (error) {
    logger.error('Erreur vérification disponibilité fonctionnalité:', error);
    return {
      available: false,
      currentPlan: 'free'
    };
  }
}

/**
 * Calculer les statistiques d'utilisation pour la facturation
 */
static async calculateUsageStats(userId: string, period: 'current_month' | 'last_month' | 'last_3_months' = 'current_month'): Promise<{
  cvCreated: number;
  aiGenerations: number;
  templatesUsed: number;
  exportsGenerated: number;
  analysisPerformed: number;
  jobMatchings: number;
  totalCost: number;
  period: string;
}> {
  try {
    let startDate: Date;
    let endDate: Date = new Date();
    
    const now = new Date();
    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
    }
    
    const [cvs, aiUsage, templates, exports, analysis, matchings] = await Promise.all([
      db.collection(COLLECTIONS.CVS)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get(),
      
      db.collection(COLLECTIONS.AI_USAGE)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get(),
      
      db.collection(COLLECTIONS.TEMPLATE_INSTANCES)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get(),
      
      db.collection(COLLECTIONS.CV_EXPORTS)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get(),
      
      db.collection(COLLECTIONS.CV_ANALYSIS)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get(),
      
      db.collection(COLLECTIONS.CV_MATCHING)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get()
    ]);
    
    // Calculer le coût total basé sur l'usage IA
    const totalCost = aiUsage.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.cost || 0);
    }, 0);
    
    return {
      cvCreated: cvs.size,
      aiGenerations: aiUsage.size,
      templatesUsed: templates.size,
      exportsGenerated: exports.size,
      analysisPerformed: analysis.size,
      jobMatchings: matchings.size,
      totalCost: Math.round(totalCost * 100) / 100, // Arrondir à 2 décimales
      period
    };
  } catch (error) {
    logger.error('Erreur calcul statistiques usage:', error);
    throw new AppError('Erreur lors du calcul des statistiques d\'usage', 500);
  }
}

/**
 * Vérifier et réinitialiser les quotas mensuels
 */
static async resetMonthlyQuotas(userId: string): Promise<void> {
  try {
    const subscription = await this.getActiveUserSubscription(userId);
    if (!subscription) return;
    
    const now = new Date();
    const lastReset = subscription.aiUsageReset || subscription.createdAt;
    
    // Vérifier si on est dans un nouveau mois
    if (lastReset && 
        (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear())) {
      
      // Réinitialiser les compteurs mensuels
      await this.subscriptionCollection.doc(subscription.id).update({
        aiUsageCount: 0,
        aiUsageReset: this.getNextMonthDate(now),
        updatedAt: now
      });
      
      logger.info('Quotas mensuels réinitialisés', {
        userId,
        subscriptionId: subscription.id,
        resetDate: this.getNextMonthDate(now)
      });
    }
  } catch (error) {
    logger.error('Erreur réinitialisation quotas mensuels:', error);
    // Ne pas faire échouer l'opération
  }
}

/**
 * Obtenir les limites détaillées pour tous les types de fonctionnalités
 */
static async getAllFeatureLimits(userId: string): Promise<{
  cvs: { current: number; limit: number; canCreate: boolean };
  aiGeneration: { current: number; limit: number | null; canUse: boolean };
  templates: { premiumAccess: boolean; currentUsage: number };
  exports: { current: number; limit: number | null; canExport: boolean };
  analysis: { current: number; limit: number | null; canAnalyze: boolean };
  jobMatching: { current: number; limit: number | null; canMatch: boolean };
  plan: string;
  upgradeRecommended: boolean;
}> {
  try {
    const subscription = await this.getActiveUserSubscription(userId);
    const plan = subscription?.plan || 'free';
    
    // Obtenir toutes les limites en parallèle
    const [
      cvLimits,
      aiLimits,
      templateAccess,
      exportLimits,
      analysisLimits,
      matchingLimits
    ] = await Promise.all([
      this.checkFeatureLimit(userId, 'cv_creation'),
      this.checkAIUsageLimit(userId),
      this.checkFeatureLimit(userId, 'template_premium'),
      this.checkFeatureLimit(userId, 'export_advanced'),
      this.checkFeatureLimit(userId, 'ai_analysis'),
      this.checkFeatureLimit(userId, 'job_matching')
    ]);
    
    // Compter l'usage actuel des templates
    const currentMonth = new Date().toISOString().substring(0, 7);
    const templateUsage = await db.collection(COLLECTIONS.TEMPLATE_INSTANCES)
      .where('userId', '==', userId)
      .where('createdAt', '>=', new Date(currentMonth + '-01'))
      .get();
    
    // Déterminer si une mise à niveau est recommandée
    const upgradeRecommended = 
      !cvLimits.canUse || 
      !aiLimits.canUse || 
      (!templateAccess.canUse && templateUsage.size > 0) ||
      !analysisLimits.canUse ||
      !matchingLimits.canUse;
    
    return {
      cvs: {
        current: cvLimits.currentUsage || 0,
        limit: cvLimits.limit || 0,
        canCreate: cvLimits.canUse
      },
      aiGeneration: {
        current: aiLimits.currentUsage,
        limit: aiLimits.limit,
        canUse: aiLimits.canUse
      },
      templates: {
        premiumAccess: templateAccess.canUse,
        currentUsage: templateUsage.size
      },
      exports: {
        current: exportLimits.currentUsage || 0,
        limit: exportLimits.limit || null,
        canExport: exportLimits.canUse
      },
      analysis: {
        current: analysisLimits.currentUsage || 0,
        limit: analysisLimits.limit || null,
        canAnalyze: analysisLimits.canUse
      },
      jobMatching: {
        current: matchingLimits.currentUsage || 0,
        limit: matchingLimits.limit || null,
        canMatch: matchingLimits.canUse
      },
      plan,
      upgradeRecommended
    };
  } catch (error) {
    logger.error('Erreur récupération limites fonctionnalités:', error);
    throw new AppError('Erreur lors de la récupération des limites', 500);
  }
}
}