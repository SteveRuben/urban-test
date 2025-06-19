import { useNotificationStore } from '../store/notification.store';

export interface NotificationTrigger {
  // Lettres de motivation
  letterGenerated: (letterId: string, letterTitle: string) => void;
  letterUpdated: (letterId: string, letterTitle: string) => void;
  letterDeleted: (letterTitle: string) => void;
  
  // Abonnement
  subscriptionUpgraded: (planName: string) => void;
  subscriptionExpiring: (daysLeft: number) => void;
  subscriptionExpired: () => void;
  subscriptionCancelled: () => void;
  
  // Limites et quotas
  quotaWarning: (used: number, total: number) => void;
  quotaReached: () => void;
  quotaReset: () => void;
  
  // Système
  systemMaintenance: (startTime: string, duration: string) => void;
  newFeature: (featureName: string, description: string) => void;
  
  // Erreurs
  apiError: (message: string) => void;
  paymentFailed: (amount: string, reason: string) => void;
}

class NotificationService {
  // Utiliser getState() au lieu de la référence du hook
  private getStore = () => useNotificationStore.getState();

  // ===== LETTRES DE MOTIVATION =====
  letterGenerated = (letterId: string, letterTitle: string) => {
    this.getStore().addNotification({
      type: 'success',
      title: 'Lettre générée avec succès',
      message: `Votre lettre "${letterTitle}" a été créée par notre IA.`,
      data: { letterId, letterTitle },
      action: {
        label: 'Voir la lettre',
        href: `/dashboard/letters/${letterId}`
      }
    });
  };

  letterUpdated = (letterId: string, letterTitle: string) => {
    this.getStore().addNotification({
      type: 'info',
      title: 'Lettre mise à jour',
      message: `Les modifications de "${letterTitle}" ont été sauvegardées.`,
      data: { letterId, letterTitle },
      action: {
        label: 'Voir la lettre',
        href: `/dashboard/letters/${letterId}`
      }
    });
  };

  letterDeleted = (letterTitle: string) => {
    this.getStore().addNotification({
      type: 'warning',
      title: 'Lettre supprimée',
      message: `La lettre "${letterTitle}" a été supprimée définitivement.`,
      data: { letterTitle }
    });
  };

  // ===== ABONNEMENT =====
  subscriptionUpgraded = (planName: string) => {
    this.getStore().addNotification({
      type: 'success',
      title: 'Abonnement activé',
      message: `Félicitations ! Vous êtes maintenant abonné au plan ${planName}.`,
      data: { planName },
      action: {
        label: 'Voir les avantages',
        href: '/dashboard/subscription'
      }
    });
  };

  subscriptionExpiring = (daysLeft: number) => {
    this.getStore().addNotification({
      type: 'warning',
      title: 'Abonnement bientôt expiré',
      message: `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`,
      data: { daysLeft },
      action: {
        label: 'Renouveler',
        href: '/dashboard/subscription'
      }
    });
  };

  subscriptionExpired = () => {
    this.getStore().addNotification({
      type: 'error',
      title: 'Abonnement expiré',
      message: 'Votre abonnement a expiré. Renouvelez pour continuer à utiliser toutes les fonctionnalités.',
      action: {
        label: 'Renouveler maintenant',
        href: '/dashboard/subscription'
      }
    });
  };

  subscriptionCancelled = () => {
    this.getStore().addNotification({
      type: 'info',
      title: 'Abonnement annulé',
      message: 'Votre abonnement a été annulé. Vous gardez l\'accès jusqu\'à la fin de la période.',
      action: {
        label: 'Voir les détails',
        href: '/dashboard/subscription'
      }
    });
  };

  // ===== LIMITES ET QUOTAS =====
  quotaWarning = (used: number, total: number) => {
    const percentage = Math.round((used / total) * 100);
    this.getStore().addNotification({
      type: 'warning',
      title: 'Limite bientôt atteinte',
      message: `Vous avez utilisé ${used}/${total} lettres (${percentage}%). Passez au premium pour plus.`,
      data: { used, total, percentage },
      action: {
        label: 'Upgrader',
        href: '/dashboard/subscription'
      }
    });
  };

  quotaReached = () => {
    this.getStore().addNotification({
      type: 'error',
      title: 'Limite atteinte',
      message: 'Vous avez atteint votre limite mensuelle. Upgradez pour continuer.',
      action: {
        label: 'Voir les plans',
        href: '/dashboard/subscription'
      }
    });
  };

  quotaReset = () => {
    this.getStore().addNotification({
      type: 'success',
      title: 'Quota réinitialisé',
      message: 'Vos quotas mensuels ont été renouvelés. Bon mois !',
      action: {
        label: 'Créer une lettre',
        href: '/dashboard/letters/new'
      }
    });
  };

  // ===== SYSTÈME =====
  systemMaintenance = (startTime: string, duration: string) => {
    this.getStore().addNotification({
      type: 'warning',
      title: 'Maintenance programmée',
      message: `Maintenance prévue le ${startTime} pendant ${duration}. Service temporairement indisponible.`,
      data: { startTime, duration }
    });
  };

  newFeature = (featureName: string, description: string) => {
    this.getStore().addNotification({
      type: 'info',
      title: `🎉 Nouvelle fonctionnalité : ${featureName}`,
      message: description,
      data: { featureName, description },
      action: {
        label: 'Découvrir',
        href: '/dashboard'
      }
    });
  };

  // ===== ERREURS =====
  apiError = (message: string) => {
    this.getStore().addNotification({
      type: 'error',
      title: 'Erreur technique',
      message: `Une erreur est survenue : ${message}`,
      data: { message }
    });
  };

  paymentFailed = (amount: string, reason: string) => {
    this.getStore().addNotification({
      type: 'error',
      title: 'Échec du paiement',
      message: `Le paiement de ${amount} a échoué : ${reason}`,
      data: { amount, reason },
      action: {
        label: 'Réessayer',
        href: '/dashboard/subscription'
      }
    });
  };

  // ===== UTILITAIRES =====
  
  // Déclencher une notification personnalisée
  //@ts-ignore
  custom = (notification: Parameters<typeof this.getStore>['addNotification'][0]) => {
    this.getStore().addNotification(notification);
  };

  // Notifications bulk pour les admins
  //@ts-ignore
  broadcast = async (notification: Parameters<typeof this.getStore>['addNotification'][0]) => {
    // En développement, juste ajouter localement
    if (process.env.NODE_ENV === 'development') {
      this.getStore().addNotification(notification);
      return;
    }

    try {
      // En production, envoyer via l'API pour diffusion
      await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Erreur lors de la diffusion:', error);
    }
  };
}

// Export singleton
export const notifications = new NotificationService();