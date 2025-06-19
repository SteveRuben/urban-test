import { useEffect } from 'react';
import { useNotificationStore } from '../store/notification.store';
import { useAuthStore } from '../store/auth.store';

export const useNotifications = () => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    connectWebSocket,
    disconnectWebSocket
  } = useNotificationStore();
  
  const { isAuthenticated, user } = useAuthStore();

  // Initialiser les notifications au montage
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔔 Initialisation des notifications pour:', user.email);
      
      // Charger les notifications existantes
      fetchNotifications();
      
      // Connecter le WebSocket pour les notifications en temps réel
      connectWebSocket();
      
      // Nettoyage à la déconnexion
      return () => {
        disconnectWebSocket();
      };
    }
  }, [isAuthenticated, user, fetchNotifications, connectWebSocket, disconnectWebSocket]);

  // Nettoyer les notifications à la déconnexion
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectWebSocket();
    }
  }, [isAuthenticated, disconnectWebSocket]);

  // Fonction utilitaire pour formater le temps
  const formatTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    
    return created.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Fonction pour obtenir l'icône selon le type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': 
      default: return 'ℹ️';
    }
  };

  // Fonction pour obtenir la couleur selon le type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'info': 
      default: return 'blue';
    }
  };

  // Marquer automatiquement comme lu après lecture
  const handleRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      await markAsRead(notificationId);
    }
  };

  // Obtenir les notifications récentes (7 derniers jours)
  const recentNotifications = notifications.filter(n => {
    const created = new Date(n.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  });

  // Obtenir les notifications non lues
  const unreadNotifications = notifications.filter(n => !n.read);

  // Stats utiles
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    recent: recentNotifications.length,
    success: notifications.filter(n => n.type === 'success').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    error: notifications.filter(n => n.type === 'error').length,
    info: notifications.filter(n => n.type === 'info').length,
  };

  return {
    // État
    notifications,
    unreadNotifications,
    recentNotifications,
    unreadCount,
    isLoading,
    error,
    stats,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    handleRead,
    fetchNotifications,
    
    // Utilitaires
    formatTime,
    getTypeIcon,
    getTypeColor,
  };
};

// Hook pour les notifications en temps réel (composants spécifiques)
export const useRealtimeNotifications = (callbacks?: {
  onLetterGenerated?: (data: any) => void;
  onSubscriptionChange?: (data: any) => void;
  onQuotaWarning?: (data: any) => void;
}) => {
  const { notifications } = useNotifications();

  useEffect(() => {
    // Écouter les nouvelles notifications et déclencher les callbacks
    const latestNotification = notifications[0];
    
    if (latestNotification && callbacks) {
      // @ts-ignore
      const { data, type, title } = latestNotification;
      
      // Déclencher le callback approprié selon le contenu
      if (data?.letterId && callbacks.onLetterGenerated) {
        callbacks.onLetterGenerated(data);
      }
      
      if (data?.planName && callbacks.onSubscriptionChange) {
        callbacks.onSubscriptionChange(data);
      }
      
      if ((data?.used && data?.total) && callbacks.onQuotaWarning) {
        callbacks.onQuotaWarning(data);
      }
    }
  }, [notifications, callbacks]);

  return {
    latestNotification: notifications[0] || null,
    hasNewNotifications: notifications.some(n => !n.read)
  };
};