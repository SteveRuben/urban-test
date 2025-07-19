import { 
  INotification, 
  ICreateNotification, 
  IUpdateNotification, 
  IPaginationOptions, 
  IPaginatedNotifications,
} from '../models/notification.model';
import { COLLECTIONS, db } from '../config/firebase';
import { logger } from 'firebase-functions';
import { AppError } from '../utils/errors.util';
import { SubscriptionService } from './subscription.service';

export class NotificationService {
   private static collection = db.collection(COLLECTIONS.NOTIFICATION);
  

  /**
   * Créer une nouvelle notification
   */
  static async createNotification(data: ICreateNotification): Promise<INotification> {
    console.log('📝 NotificationService: Création notification pour userId:', data.userId);
    
    try {
      const notificationData: Omit<INotification, 'id'> = {
        ...data,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.collection.add(notificationData);
      
      const notification: INotification = {
        id: docRef.id,
        ...notificationData
      };

      console.log('✅ NotificationService: Notification créée avec ID:', docRef.id);
      return notification;
    } catch (error) {
      console.error('❌ NotificationService: Erreur création notification:', error);
      throw new Error(`Erreur lors de la création de la notification: ${error}`);
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur avec pagination
   */
  static async getUserNotifications(
    userId: string, 
    options: IPaginationOptions = {}
  ): Promise<IPaginatedNotifications> {
    console.log('📋 NotificationService: Récupération notifications pour userId:', userId);
    
    try {
      const {
        page = 1,
        limit = 20,
        orderBy = 'createdAt',
        orderDirection = 'desc'
      } = options;

      const offset = (page - 1) * limit;

      // Query pour récupérer les notifications
      let query = this.collection
        .where('userId', '==', userId)
        .orderBy(orderBy, orderDirection);

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      const snapshot = await query
        .offset(offset)
        .limit(limit)
        .get();

      const notifications: INotification[] = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as INotification);
      });

      // Compter les non lues
      const unreadSnapshot = await this.collection
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();
      
      const unreadCount = unreadSnapshot.size;

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      console.log('✅ NotificationService: Récupéré', notifications.length, 'notifications');
      
      return {
        notifications,
        pagination,
        unreadCount
      };
    } catch (error) {
      console.error('❌ NotificationService: Erreur récupération notifications:', error);
      throw new Error(`Erreur lors de la récupération des notifications: ${error}`);
    }
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    console.log('👁️ NotificationService: Marquer comme lu:', notificationId);
    
    try {
      const docRef = this.collection.doc(notificationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Notification non trouvée');
      }

      const notification = doc.data() as INotification;
      
      // Vérifier que la notification appartient à l'utilisateur
      if (notification.userId !== userId) {
        throw new Error('Accès non autorisé à cette notification');
      }

      const updateData: IUpdateNotification = {
        read: true,
        updatedAt: new Date()
      };

      // @ts-ignore
      await docRef.update(updateData);

      const updatedNotification: INotification = {
        ...notification,
        id: notificationId,
        ...updateData
      };

      console.log('✅ NotificationService: Notification marquée comme lue');
      return updatedNotification;
    } catch (error) {
      console.error('❌ NotificationService: Erreur marquage lecture:', error);
      throw new Error(`Erreur lors du marquage: ${error}`);
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  static async markAllAsRead(userId: string): Promise<number> {
    console.log('👁️‍🗨️ NotificationService: Marquer toutes comme lues pour:', userId);
    
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      const batch = this.collection.firestore.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          updatedAt: new Date()
        });
        count++;
      });

      await batch.commit();

      console.log('✅ NotificationService:', count, 'notifications marquées comme lues');
      return count;
    } catch (error) {
      console.error('❌ NotificationService: Erreur marquage global:', error);
      throw new Error(`Erreur lors du marquage global: ${error}`);
    }
  }

  /**
   * Supprimer une notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    console.log('🗑️ NotificationService: Suppression notification:', notificationId);
    
    try {
      const docRef = this.collection.doc(notificationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Notification non trouvée');
      }

      const notification = doc.data() as INotification;
      
      // Vérifier que la notification appartient à l'utilisateur
      if (notification.userId !== userId) {
        throw new Error('Accès non autorisé à cette notification');
      }

      await docRef.delete();
      console.log('✅ NotificationService: Notification supprimée');
    } catch (error) {
      console.error('❌ NotificationService: Erreur suppression:', error);
      throw new Error(`Erreur lors de la suppression: ${error}`);
    }
  }

  /**
   * Supprimer toutes les notifications d'un utilisateur
   */
  static async deleteAllUserNotifications(userId: string): Promise<number> {
    console.log('🗑️ NotificationService: Suppression toutes notifications pour:', userId);
    
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .get();

      const batch = this.collection.firestore.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      console.log('✅ NotificationService:', count, 'notifications supprimées');
      return count;
    } catch (error) {
      console.error('❌ NotificationService: Erreur suppression globale:', error);
      throw new Error(`Erreur lors de la suppression globale: ${error}`);
    }
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('❌ NotificationService: Erreur comptage non lues:', error);
      throw new Error(`Erreur lors du comptage: ${error}`);
    }
  }

  /**
   * Diffuser une notification à plusieurs utilisateurs (admin)
   */
  static async broadcastNotification(
    userIds: string[], 
    notificationData: Omit<ICreateNotification, 'userId'>
  ): Promise<INotification[]> {
    console.log('📢 NotificationService: Diffusion à', userIds.length, 'utilisateurs');
    
    try {
      const batch = this.collection.firestore.batch();
      const notifications: INotification[] = [];

      for (const userId of userIds) {
        const docRef = this.collection.doc();
        const notification: Omit<INotification, 'id'> = {
          ...notificationData,
          userId,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        batch.set(docRef, notification);
        notifications.push({
          id: docRef.id,
          ...notification
        });
      }

      await batch.commit();

      console.log('✅ NotificationService: Diffusion réussie');
      return notifications;
    } catch (error) {
      console.error('❌ NotificationService: Erreur diffusion:', error);
      throw new Error(`Erreur lors de la diffusion: ${error}`);
    }
  }

  /**
   * Nettoyer les anciennes notifications (job automatique)
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    console.log('🧹 NotificationService: Nettoyage notifications > ', daysOld, 'jours');
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const snapshot = await this.collection
        .where('createdAt', '<', (cutoffDate))
        .get();

      const batch = this.collection.firestore.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      console.log('✅ NotificationService:', count, 'anciennes notifications supprimées');
      return count;
    } catch (error) {
      console.error('❌ NotificationService: Erreur nettoyage:', error);
      throw new Error(`Erreur lors du nettoyage: ${error}`);
    }
  }

  /**
   * Rechercher des notifications
   */
  static async searchNotifications(
    userId: string, 
    searchTerm: string, 
    options: IPaginationOptions = {}
  ): Promise<IPaginatedNotifications> {
    console.log('🔍 NotificationService: Recherche pour:', searchTerm);
    
    try {
      // Note: Firestore ne supporte pas la recherche full-text native
      // Cette implémentation basique cherche dans le titre et le message
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const snapshot = await this.collection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const allNotifications: INotification[] = [];
      snapshot.forEach((doc) => {
        const notification = { id: doc.id, ...doc.data() } as INotification;
        
        // Recherche basique dans titre et message
        if (
          notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          notification.message.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          allNotifications.push(notification);
        }
      });

      const total = allNotifications.length;
      const notifications = allNotifications.slice(offset, offset + limit);

      const unreadCount = await this.getUnreadCount(userId);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        unreadCount
      };
    } catch (error) {
      console.error('❌ NotificationService: Erreur recherche:', error);
      throw new Error(`Erreur lors de la recherche: ${error}`);
    }
  }

 /**
 * Créer une notification spécialisée CV
 */
static async createCVNotification(
  userId: string,
  type: 'cv_created' | 'cv_analyzed' | 'cv_shared' | 'cv_matched' | 'cv_exported' | 'cv_optimized',
  cvId: string,
  cvTitle: string,
  additionalData?: any
): Promise<INotification> {
  const notificationMessages = {
    cv_created: {
      title: '✅ CV créé avec succès',
      message: `Votre CV "${cvTitle}" a été créé. Commencez à le personnaliser et optimisez-le avec notre IA !`,
      type: 'success' as const
    },
    cv_analyzed: {
      title: '🔍 Analyse CV terminée',
      message: `L'analyse de votre CV "${cvTitle}" est disponible. Score global : ${additionalData?.overallScore || 'N/A'}/100. Consultez les recommandations.`,
      type: 'info' as const
    },
    cv_shared: {
      title: '🔗 CV partagé',
      message: `Votre CV "${cvTitle}" a été partagé avec succès. Lien de partage généré.`,
      type: 'success' as const
    },
    cv_matched: {
      title: '🎯 Correspondance trouvée',
      message: `Votre CV "${cvTitle}" correspond à ${additionalData?.matchingScore || 'N/A'}% avec l'offre "${additionalData?.jobTitle}".`,
      type: 'success' as const
    },
    cv_exported: {
      title: '📄 CV exporté',
      message: `Votre CV "${cvTitle}" a été exporté au format ${additionalData?.format?.toUpperCase()}. Téléchargement prêt.`,
      type: 'success' as const
    },
    cv_optimized: {
      title: '⚡ CV optimisé',
      message: `Votre CV "${cvTitle}" a été optimisé pour la région ${additionalData?.region}. ${additionalData?.improvementsCount || 0} améliorations suggérées.`,
      type: 'info' as const
    }
  };

  const notification = notificationMessages[type];
  
  return await this.createNotification({
    userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: {
      cvId,
      cvTitle,
      category: 'cv',
      ...additionalData
    },
    action: {
      label: 'Voir le CV',
      href: `/cv/${cvId}`
    }
  });
}

/**
 * Créer une notification spécialisée Template
 */
static async createTemplateNotification(
  userId: string,
  type: 'template_generated' | 'template_improved' | 'template_saved' | 'template_shared' | 'template_completed',
  templateData: {
    instanceId: string;
    templateId: string;
    title: string;
    type: string;
    status?: string;
    score?: number;
  }
): Promise<INotification> {
  const notificationMessages = {
    template_generated: {
      title: '🤖 Contenu généré par l\'IA',
      message: `Votre ${templateData.type} "${templateData.title}" a été généré avec succès par notre IA. Prêt à personnaliser !`,
      type: 'success' as const
    },
    template_improved: {
      title: '✨ Suggestions d\'amélioration disponibles',
      message: `Des améliorations ont été suggérées pour "${templateData.title}". Score d'optimisation : ${templateData.score || 'N/A'}/100.`,
      type: 'info' as const
    },
    template_saved: {
      title: '💾 Template sauvegardé',
      message: `Votre template "${templateData.title}" a été sauvegardé avec succès.`,
      type: 'success' as const
    },
    template_shared: {
      title: '🔗 Template partagé',
      message: `Votre template "${templateData.title}" a été partagé et est maintenant accessible publiquement.`,
      type: 'success' as const
    },
    template_completed: {
      title: '🎉 Template finalisé',
      message: `Votre ${templateData.type} "${templateData.title}" est maintenant finalisé et prêt à être utilisé !`,
      type: 'success' as const
    }
  };

  const notification = notificationMessages[type];
  
  return await this.createNotification({
    userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: {
      category: 'template',
      templateType: templateData.type,
      ...templateData,
      instanceId: templateData.instanceId,
      templateId: templateData.templateId,
    },
    action: {
      label: 'Voir le contenu',
      href: `/templates/instances/${templateData.instanceId}`
    }
  });
}

/**
 * Créer une notification d'alerte de quota
 */
static async createQuotaAlert(
  userId: string,
  feature: 'cv_creation' | 'ai_usage' | 'template_premium' | 'exports',
  quotaData: {
    current: number;
    limit: number;
    percentage: number;
    plan: string;
  }
): Promise<INotification> {
  const featureLabels = {
    cv_creation: 'création de CV',
    ai_usage: 'utilisation IA',
    template_premium: 'templates premium',
    exports: 'exports'
  };

  const featureLabel = featureLabels[feature];
  let title: string;
  let message: string;
  let notificationType: 'info' | 'warning' | 'error';

  if (quotaData.percentage >= 100) {
    title = '🚫 Limite atteinte';
    message = `Vous avez atteint votre limite de ${featureLabel} (${quotaData.current}/${quotaData.limit}). Mettez à niveau votre abonnement pour continuer.`;
    notificationType = 'error';
  } else if (quotaData.percentage >= 80) {
    title = '⚠️ Limite bientôt atteinte';
    message = `Vous approchez de votre limite de ${featureLabel} (${quotaData.current}/${quotaData.limit}). Pensez à mettre à niveau votre abonnement.`;
    notificationType = 'warning';
  } else {
    title = '📊 Usage en cours';
    message = `Vous avez utilisé ${quotaData.current}/${quotaData.limit} de votre quota de ${featureLabel}.`;
    notificationType = 'info';
  }

  return await this.createNotification({
    userId,
    type: notificationType,
    title,
    message,
    data: {
      feature,
      quota: quotaData,
      category: 'quota'
    },
    action: {
      label: 'Voir les plans',
      href: '/subscription/plans'
    }
  });
}

/**
 * Créer une notification de mise à niveau recommandée
 */
static async createUpgradeRecommendation(
  userId: string,
  upgradeData: {
    currentPlan: string;
    recommendedPlan: string;
    reasons: string[];
    blockedFeatures: string[];
    savings?: number;
  }
): Promise<INotification> {
  const reasonsText = upgradeData.reasons.slice(0, 2).join(' • ');
  const savingsText = upgradeData.savings ? ` Économisez ${upgradeData.savings}€ avec le plan lifetime !` : '';

  return await this.createNotification({
    userId,
    type: 'info',
    title: '🚀 Mise à niveau recommandée',
    message: `Passez au plan ${upgradeData.recommendedPlan} pour débloquer plus de fonctionnalités. ${reasonsText}.${savingsText}`,
    data: {
      category: 'upgrade',
      currentPlan: upgradeData.currentPlan,
      recommendedPlan: upgradeData.recommendedPlan,
      reasons: upgradeData.reasons,
      blockedFeatures: upgradeData.blockedFeatures,
      savings: upgradeData.savings
    },
    action: {
      label: 'Voir les plans',
      href: '/subscription/upgrade'
    }
  });
}

/**
 * Créer une notification d'analyse d'activité
 */
static async createActivitySummary(
  userId: string,
  period: 'weekly' | 'monthly',
  activityData: {
    cvsCreated: number;
    aiGenerations: number;
    templatesUsed: number;
    analysisPerformed: number;
    topActivity: string;
  }
): Promise<INotification> {
  const periodLabel = period === 'weekly' ? 'cette semaine' : 'ce mois';
  const topActivityText = activityData.topActivity ? ` Votre activité principale : ${activityData.topActivity}.` : '';

  return await this.createNotification({
    userId,
    type: 'info',
    title: `📈 Résumé d'activité ${period === 'weekly' ? 'hebdomadaire' : 'mensuel'}`,
    message: `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}, vous avez créé ${activityData.cvsCreated} CV, utilisé l'IA ${activityData.aiGenerations} fois et utilisé ${activityData.templatesUsed} templates.${topActivityText}`,
    data: {
      category: 'activity_summary',
      period,
      ...activityData
    },
    action: {
      label: 'Voir les statistiques',
      href: '/dashboard/analytics'
    }
  });
}

/**
 * Notifier les échecs d'IA avec suggestions
 */
static async createAIFailureNotification(
  userId: string,
  feature: string,
  error: string,
  suggestions: string[]
): Promise<INotification> {
  return await this.createNotification({
    userId,
    type: 'warning',
    title: '🤖 Génération IA échouée',
    message: `La génération IA pour ${feature} a échoué. Suggestions : ${suggestions.slice(0, 2).join(', ')}.`,
    data: {
      category: 'ai_failure',
      feature,
      error,
      suggestions
    },
    action: {
      label: 'Réessayer',
      href: '/dashboard'
    }
  });
}

/**
 * Créer des notifications de conseils et astuces
 */
static async createTipNotification(
  userId: string,
  tipData: {
    category: 'cv_optimization' | 'template_usage' | 'ai_features' | 'productivity';
    title: string;
    tip: string;
    actionUrl?: string;
  }
): Promise<INotification> {
  const categoryEmojis = {
    cv_optimization: '💡',
    template_usage: '📝',
    ai_features: '🤖',
    productivity: '⚡'
  };

  const emoji = categoryEmojis[tipData.category];

  return await this.createNotification({
    userId,
    type: 'info',
    title: `${emoji} Astuce : ${tipData.title}`,
    message: tipData.tip,
    data: {
      category: 'tip',
      tipCategory: tipData.category
    },
    action: tipData.actionUrl ? {
      label: 'En savoir plus',
      href: tipData.actionUrl
    } : undefined
  });
}

/**
 * Notification de nouvelle fonctionnalité
 */
static async createFeatureAnnouncementNotification(
  userId: string,
  featureData: {
    name: string;
    description: string;
    category: 'cv' | 'template' | 'ai' | 'general';
    isNew: boolean;
    learnMoreUrl?: string;
  }
): Promise<INotification> {
  const title = featureData.isNew ? 
    `🎉 Nouvelle fonctionnalité : ${featureData.name}` : 
    `✨ Améliorations : ${featureData.name}`;

  return await this.createNotification({
    userId,
    type: 'info',
    title,
    message: featureData.description,
    data: {
      category: 'feature_announcement',
      featureName: featureData.name,
      featureCategory: featureData.category,
      isNew: featureData.isNew
    },
    action: featureData.learnMoreUrl ? {
      label: 'Découvrir',
      href: featureData.learnMoreUrl
    } : undefined
  });
}

/**
 * Envoyer des notifications en lot pour des événements système
 */
static async sendBulkNotifications(
  notifications: Array<{
    userId: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    data?: any;
    action?: { label: string; href: string };
  }>
): Promise<INotification[]> {
  try {
    const batch = db.batch();
    const createdNotifications: INotification[] = [];

    for (const notificationData of notifications) {
      const docRef = this.collection.doc();
      const notification: Omit<INotification, 'id'> = {
        ...notificationData,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      batch.set(docRef, notification);
      createdNotifications.push({
        id: docRef.id,
        ...notification
      });
    }

    await batch.commit();

    logger.info('Notifications en lot envoyées', {
      count: notifications.length,
      userIds: [...new Set(notifications.map(n => n.userId))]
    });

    return createdNotifications;
  } catch (error) {
    logger.error('Erreur envoi notifications en lot:', error);
    throw new AppError('Erreur lors de l\'envoi des notifications en lot', 500);
  }
}

/**
 * Créer des notifications automatiques basées sur l'activité utilisateur
 */
static async createSmartNotifications(userId: string): Promise<void> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Récupérer l'activité récente
    const [recentCVs, recentTemplates, recentAIUsage, subscription] = await Promise.all([
      db.collection(COLLECTIONS.CVS)
        .where('userId', '==', userId)
        .where('updatedAt', '>=', sevenDaysAgo)
        .get(),
      
      db.collection(COLLECTIONS.TEMPLATE_INSTANCES)
        .where('userId', '==', userId)
        .where('updatedAt', '>=', sevenDaysAgo)
        .get(),
      
      db.collection(COLLECTIONS.AI_USAGE)
        .where('userId', '==', userId)
        .where('createdAt', '>=', sevenDaysAgo)
        .get(),
      
      SubscriptionService.getActiveUserSubscription(userId)
    ]);

    const notifications: Array<{
      userId: string;
      type: 'info';
      title: string;
      message: string;
      data: any;
      action?: { label: string; href: string };
    }> = [];

    // Notification si pas d'activité récente
    if (recentCVs.empty && recentTemplates.empty && recentAIUsage.empty) {
      const lastActivity = await this.getLastUserActivity(userId);
      if (lastActivity && (now.getTime() - lastActivity.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        notifications.push({
          userId,
          type: 'info',
          title: '👋 Nous vous avons manqué !',
          message: 'Revenez créer de nouveaux CV et lettres de motivation avec notre IA améliorée.',
          data: { category: 'engagement', type: 'comeback' },
          action: { label: 'Créer un CV', href: '/cv/new' }
        });
      }
    }

    // Notification de conseils selon l'usage
    if (recentCVs.size > 0 && recentAIUsage.empty) {
      notifications.push({
        userId,
        type: 'info',
        title: '💡 Optimisez vos CV avec l\'IA',
        message: 'Utilisez notre analyse IA pour améliorer vos CV et augmenter vos chances de succès.',
        data: { category: 'tip', type: 'ai_suggestion' },
        action: { label: 'Analyser un CV', href: '/cv' }
      });
    }

    // Notification de mise à niveau si usage intensif
    if (!subscription || subscription.plan === 'free') {
      if (recentAIUsage.size > 3 || recentCVs.size > 1) {
        notifications.push({
          userId,
          type: 'info',
          title: '🚀 Débloquez plus de fonctionnalités',
          message: 'Votre usage intensif mérite un abonnement premium pour des fonctionnalités illimitées.',
          data: { category: 'upgrade', type: 'usage_based' },
          action: { label: 'Voir les plans', href: '/subscription/plans' }
        });
      }
    }

    // Envoyer les notifications créées
    if (notifications.length > 0) {
      await this.sendBulkNotifications(notifications);
      logger.debug('Notifications intelligentes créées', { userId, count: notifications.length });
    }

  } catch (error) {
    logger.error('Erreur création notifications intelligentes:', error);
    // Ne pas faire échouer l'opération principale
  }
}

/**
 * Méthode utilitaire pour obtenir la dernière activité utilisateur
 */
private static async getLastUserActivity(userId: string): Promise<Date | null> {
  try {
    const collections = [COLLECTIONS.CVS, COLLECTIONS.TEMPLATE_INSTANCES, COLLECTIONS.LETTERS];
    let latestActivity: Date | null = null;

    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const updatedAt = doc.data().updatedAt?.toDate() || doc.data().updatedAt;
        
        if (!latestActivity || (updatedAt && updatedAt > latestActivity)) {
          latestActivity = updatedAt;
        }
      }
    }

    return latestActivity;
  } catch (error) {
    logger.error('Erreur récupération dernière activité:', error);
    return null;
  }
}

/**
 * Planifier l'envoi de notifications récurrentes
 */
static async scheduleRecurringNotifications(): Promise<void> {
  try {
    const now = new Date();
    const isMonday = now.getDay() === 1; // 1 = Lundi
    const isFirstOfMonth = now.getDate() === 1;

    if (isMonday) {
      // Notifications hebdomadaires
      await this.sendWeeklyDigest();
    }

    if (isFirstOfMonth) {
      // Notifications mensuelles
      await this.sendMonthlyReport();
    }

    logger.info('Vérification notifications récurrentes terminée', {
      isMonday,
      isFirstOfMonth
    });
  } catch (error) {
    logger.error('Erreur planification notifications récurrentes:', error);
  }
}

/**
 * Envoyer un digest hebdomadaire
 */
private static async sendWeeklyDigest(): Promise<void> {
  try {
    // Récupérer tous les utilisateurs actifs
    const activeUsers = await db.collection(COLLECTIONS.USERS)
      .where('lastLoginAt', '>=', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      .get();

    const notifications: any[] = [];

    for (const userDoc of activeUsers.docs) {
      const userId = userDoc.id;
      
      // Calculer l'activité de la semaine
      const weeklyActivity = await SubscriptionService.calculateUsageStats(userId, 'current_month');
      
      if (weeklyActivity.cvCreated > 0 || weeklyActivity.aiGenerations > 0) {
        notifications.push({
          userId,
          type: 'info',
          title: '📊 Votre semaine en résumé',
          message: `Cette semaine : ${weeklyActivity.cvCreated} CV créés, ${weeklyActivity.aiGenerations} générations IA. Continuez sur cette lancée !`,
          data: {
            category: 'weekly_digest',
            activity: weeklyActivity
          },
          action: {
            label: 'Voir le dashboard',
            href: '/dashboard'
          }
        });
      }
    }

    if (notifications.length > 0) {
      await this.sendBulkNotifications(notifications);
      logger.info('Digest hebdomadaire envoyé', { count: notifications.length });
    }
  } catch (error) {
    logger.error('Erreur envoi digest hebdomadaire:', error);
  }
}

/**
 * Envoyer un rapport mensuel
 */
private static async sendMonthlyReport(): Promise<void> {
  try {
    // Récupérer les utilisateurs avec abonnement actif
    const activeSubscriptions = await db.collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('status', '==', 'active')
      .get();

    const notifications: any[] = [];

    for (const subDoc of activeSubscriptions.docs) {
      const subscription = subDoc.data();
      const userId = subscription.userId;
      
      // Calculer les stats du mois dernier
      const monthlyStats = await SubscriptionService.calculateUsageStats(userId, 'last_month');
      
      notifications.push({
        userId,
        type: 'info',
        title: '📈 Rapport mensuel',
        message: `Le mois dernier : ${monthlyStats.cvCreated} CV, ${monthlyStats.aiGenerations} générations IA, ${monthlyStats.templatesUsed} templates. Économies d'IA : ${monthlyStats.totalCost.toFixed(2)}€.`,
        data: {
          category: 'monthly_report',
          stats: monthlyStats
        },
        action: {
          label: 'Voir les détails',
          href: '/dashboard/analytics'
        }
      });
    }

    if (notifications.length > 0) {
      await this.sendBulkNotifications(notifications);
      logger.info('Rapport mensuel envoyé', { count: notifications.length });
    }
  } catch (error) {
    logger.error('Erreur envoi rapport mensuel:', error);
  }
}
}