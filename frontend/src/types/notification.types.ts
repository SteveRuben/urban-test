// types/notification.types.ts
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  data?: NotificationData;  // Données supplémentaires (ID de lettre, etc.)
  read: boolean;
  createdAt: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  
  // Real-time
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

export interface NotificationApiResponse {
  notifications: Notification[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface WebSocketNotificationMessage {
  type: 'notification';
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>;
}

// Types pour les différents contextes de notifications
export interface LetterNotificationData {
  letterId: string;
  letterTitle: string;
}

export interface SubscriptionNotificationData {
  planName: string;
  planId?: string;
  expiresAt?: string;
}

export interface QuotaNotificationData {
  used: number;
  total: number;
  percentage: number;
}

export interface SystemNotificationData {
  startTime?: string;
  duration?: string;
  featureName?: string;
  description?: string;
}

// Types pour les différents contextes de notifications
export interface LetterNotificationData {
  letterId: string;
  letterTitle: string;
}

export interface SubscriptionNotificationData {
  planName: string;
  planId?: string;
  expiresAt?: string;
}

export interface QuotaNotificationData {
  used: number;
  total: number;
  percentage: number;
}

export interface SystemNotificationData {
  startTime?: string;
  duration?: string;
  featureName?: string;
  description?: string;
}

// Type union pour toutes les données possibles de notifications
export type NotificationData = 
  | LetterNotificationData 
  | SubscriptionNotificationData 
  | QuotaNotificationData 
  | SystemNotificationData 
  | Record<string, unknown>; // Pour les cas non prévus