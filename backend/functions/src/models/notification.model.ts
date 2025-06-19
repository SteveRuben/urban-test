
// Interface TypeScript pour les notifications
export interface INotification {
  id?: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>; // Données supplémentaires
  read: boolean;
  createdAt:  Date;
  updatedAt?: Date;
  action?: {
    label: string;
    href?: string;
  };
}

// Interface pour la création (sans champs auto-générés)
export interface ICreateNotification {
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  action?: {
    label: string;
    href?: string;
  };
}

// Interface pour la mise à jour
export interface IUpdateNotification {
  read?: boolean;
  updatedAt?: Date;
}

// Interface pour les filtres
export interface INotificationFilters {
  userId?: string;
  type?: string;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
}

// Interface pour la pagination
export interface IPaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Interface pour la réponse avec pagination
export interface IPaginatedNotifications {
  notifications: INotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  unreadCount: number;
}

// Types pour les contextes spécifiques
export interface ILetterNotificationData {
  letterId: string;
  letterTitle: string;
}

export interface ISubscriptionNotificationData {
  planName: string;
  planId?: string;
  expiresAt?: string;
}

export interface IQuotaNotificationData {
  used: number;
  total: number;
  percentage: number;
}

export interface ISystemNotificationData {
  startTime?: string;
  duration?: string;
  featureName?: string;
  description?: string;
}

