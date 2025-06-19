import { 
  INotification, 
  ICreateNotification, 
  IUpdateNotification, 
  IPaginationOptions, 
  IPaginatedNotifications,
} from '../models/notification.model';
import { COLLECTIONS, db } from '../config/firebase';

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
}