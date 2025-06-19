import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import type { 
  Notification, 
  NotificationState, 
  WebSocketNotificationMessage 
} from '../types/notification.types';

// WebSocket instance
let ws: WebSocket | null = null;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,

      fetchNotifications: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get<any>('/notifications');
          console.log('Notifications récupérées:', response.data?.data);
          const data = response.data.data;
          const notifications = data.notifications || data;
          
          set({ 
            notifications: Array.isArray(notifications) ? notifications : [],
            unreadCount: data.unreadCount || notifications.filter((n: Notification) => !n.read).length,
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Erreur lors de la récupération des notifications:', error);
          set({ 
            error: error.response?.data?.message || 'Erreur lors du chargement des notifications',
            isLoading: false 
          });
        }
      },

      markAsRead: async (notificationId: string) => {
        try {
          await api.patch(`/notifications/${notificationId}/read`);
          
          set((state) => {
            const updatedNotifications = state.notifications.map(n => 
              n.id === notificationId ? { ...n, read: true } : n
            );
            return {
              notifications: updatedNotifications,
              unreadCount: updatedNotifications.filter(n => !n.read).length
            };
          });
        } catch (error: any) {
          console.error('Erreur lors du marquage comme lu:', error);
          set({ error: 'Erreur lors de la mise à jour' });
        }
      },

      markAllAsRead: async () => {
        try {
          await api.patch('/notifications/read-all');
          
          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0
          }));
        } catch (error: any) {
          console.error('Erreur lors du marquage global:', error);
          set({ error: 'Erreur lors de la mise à jour' });
        }
      },

      deleteNotification: async (notificationId: string) => {
        try {
          await api.delete(`/notifications/${notificationId}`);
          
          set((state) => {
            const updatedNotifications = state.notifications.filter(n => n.id !== notificationId);
            return {
              notifications: updatedNotifications,
              unreadCount: updatedNotifications.filter(n => !n.read).length
            };
          });
        } catch (error: any) {
          console.error('Erreur lors de la suppression:', error);
          set({ error: 'Erreur lors de la suppression' });
        }
      },

      clearAll: async () => {
        try {
          await api.delete('/notifications');
          set({ notifications: [], unreadCount: 0 });
        } catch (error: any) {
          console.error('Erreur lors de la suppression globale:', error);
          set({ error: 'Erreur lors de la suppression' });
        }
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          read: false
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      },

      connectWebSocket: () => {
        const authStore = (window as any).__AUTH_STORE__?.getState?.();
        const token = authStore?.user?.token;
        
        if (!token || ws?.readyState === WebSocket.OPEN) return;

        try {
          const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
          ws = new WebSocket(`${wsUrl}/notifications?token=${token}`);

          ws.onopen = () => {
            console.log('✅ WebSocket notifications connecté');
          };

          ws.onmessage = (event) => {
            try {
              const data: WebSocketNotificationMessage = JSON.parse(event.data);
              
              if (data.type === 'notification') {
                get().addNotification({
                  type: data.notification.type,
                  title: data.notification.title,
                  message: data.notification.message,
                  data: data.notification.data,
                  action: data.notification.action
                });
              }
            } catch (error) {
              console.error('Erreur parsing WebSocket message:', error);
            }
          };

          ws.onclose = () => {
            console.log('🔌 WebSocket notifications fermé');
            // Tentative de reconnexion après 5 secondes
            setTimeout(() => {
              if (ws?.readyState === WebSocket.CLOSED) {
                get().connectWebSocket();
              }
            }, 5000);
          };

          ws.onerror = (error) => {
            console.error('❌ Erreur WebSocket notifications:', error);
          };
        } catch (error) {
          console.error('Erreur lors de la connexion WebSocket:', error);
        }
      },

      disconnectWebSocket: () => {
        if (ws) {
          ws.close();
          ws = null;
        }
      }
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Garder seulement les 50 dernières
        unreadCount: state.unreadCount
      }),
    }
  )
);