import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ICreateNotification, IPaginationOptions } from '../models/notification.model';
import { ResponseUtil } from '../utils/response.util';



export class NotificationController {


    /**
     * GET /notifications
     * Récupérer les notifications de l'utilisateur connecté
     */
    static async getNotifications(req: Request, res: Response) {
        try {
            console.log('📨 Controller: GET /notifications pour userId:', req.user?.uid);

            if (!req.user?.uid) {
               return ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }

            // Paramètres de pagination depuis query params
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
            const orderBy = (req.query.orderBy as string) || 'createdAt';
            const orderDirection = (req.query.orderDirection as 'asc' | 'desc') || 'desc';

            const options: IPaginationOptions = {
                page,
                limit,
                orderBy,
                orderDirection
            };

            if (!req.user?.uid) {
                return ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }
            const result = await NotificationService.getUserNotifications(req.user.uid, options);
            return ResponseUtil.success(res, result);
        } catch (error) {
            console.error('❌ Controller: Erreur GET notifications:', error);
            return ResponseUtil.error(res, 'Erreur lors de la récupération des notifications');
        }
    };

    /**
     * POST /notifications
     * Créer une nouvelle notification (admin uniquement)
     */
    static async createNotification(req: Request, res: Response) {
        try {
            console.log('📝 Controller: POST /notifications');

            // TODO: Vérifier que l'utilisateur est admin
            // if (!req.user?.isAdmin) {
            //    res.status(403).json({
            //     success: false,
            //     error: 'Accès non autorisé'
            //   });
            // }

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié')
            }

            const { userId, type, title, message, data, action } = req.body;

            // Validation des données
            if (!userId || !type || !title || !message) {
                ResponseUtil.validationError(res, 'userId, type, title et message sont requis');
            }

            if (!['success', 'info', 'warning', 'error'].includes(type)) {
                ResponseUtil.validationError(res, 'Type invalide. Doit être: success, info, warning ou error');
            }

            const notificationData: ICreateNotification = {
                userId,
                type,
                title,
                message,
                data,
                action
            };

            const notification = await NotificationService.createNotification(notificationData);

            console.log('✅ Controller: Notification créée avec ID:', notification.id);

            ResponseUtil.success(res, notification);

        } catch (error) {
            console.error('❌ Controller: Erreur POST notification:', error);
            ResponseUtil.error(res, 'Erreur lors de la création de la notification');
        }
    };

    /**
     * PATCH|PUT /notifications/:id/read
     * Marquer une notification comme lue
     */
    static async markAsRead(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log('👁️ Controller: PATCH /notifications/${id}/read pour:', id);

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }

            if (!id) {
                ResponseUtil.validationError(res, 'ID de notification requis');
            }
            // @ts-ignore
            const notification = await NotificationService.markAsRead(id, req.user.uid);

            console.log('✅ Controller: Notification marquée comme lue');

            ResponseUtil.success(res, notification);
        } catch (error) {
            console.error('❌ Controller: Erreur PATCH read:', error);
            ResponseUtil.error(res, 'Erreur lors de la mise à jour de la notification');
        }
    };

    /**
     * PATCH | PUT /notifications/read-all
     * Marquer toutes les notifications comme lues
     */
    static async markAllAsRead(req: Request, res: Response) {
        try {
            console.log('👁️‍🗨️ Controller: PATCH /notifications/read-all');

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }
            // @ts-ignore
            const count = await NotificationService.markAllAsRead(req.user.uid);

            console.log('✅ Controller:', count, 'notifications marquées comme lues');
            ResponseUtil.success(res, {
                modifiedCount: count,
                message: `${count} notification(s) marquée(s) comme lue(s)`
            });

        } catch (error) {
            console.error('❌ Controller: Erreur PATCH read-all:', error);
            ResponseUtil.error(res, 'Erreur lors de la mise à jour des notifications');
        }
    };

    /**
     * DELETE /notifications/:id
     * Supprimer une notification
     */
    static async deleteNotification(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log('🗑️ Controller: DELETE /notifications/${id} pour:', id);

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }

            if (!id) {
                ResponseUtil.validationError(res, 'ID de notification requis');
            }
            // @ts-ignore
            await NotificationService.deleteNotification(id, req.user.uid);

            console.log('✅ Controller: Notification supprimée');
            ResponseUtil.deleted(res, null, 'Notification supprimée avec succès');
        } catch (error) {
            console.error('❌ Controller: Erreur DELETE notification:', error);
            ResponseUtil.error(res, 'Erreur lors de la suppression de la notification');
        }
    };

    /**
     * DELETE /notifications
     * Supprimer toutes les notifications de l'utilisateur
     */
    static async deleteAllNotifications(req: Request, res: Response) {
        try {
            console.log('🗑️ Controller: DELETE /notifications (toutes)');

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }
            // @ts-ignore
            const count = await NotificationService.deleteAllUserNotifications(req.user.uid);

            console.log('✅ Controller:', count, 'notifications supprimées');

            ResponseUtil.success(res, {
                deletedCount: count,
                message: `${count} notification(s) supprimée(s)`
            });

        } catch (error) {
            console.error('❌ Controller: Erreur DELETE all notifications:', error);
            ResponseUtil.error(res, 'Erreur lors de la suppression des notifications');
        }
    };

    /**
     * GET /notifications/unread-count
     * Obtenir le nombre de notifications non lues
     */
    static async getUnreadCount(req: Request, res: Response) {
        try {
            console.log('📊 Controller: GET /notifications/unread-count');

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }
            // @ts-ignore
            const count = await NotificationService.getUnreadCount(req.user.uid);

            ResponseUtil.success(res, { unreadCount: count });

        } catch (error) {
            console.error('❌ Controller: Erreur GET unread-count:', error);
            ResponseUtil.error(res, 'Erreur lors de la récupération du nombre de notifications non lues');
        }
    };

    /**
     * POST /notifications/broadcast
     * Diffuser une notification à plusieurs utilisateurs (admin)
     */
    static async broadcastNotification(req: Request, res: Response) {
        try {
            console.log('📢 Controller: POST /notifications/broadcast');

            // TODO: Vérifier que l'utilisateur est admin
            // if (!req.user?.isAdmin) {
            //    res.status(403).json({
            //     success: false,
            //     error: 'Accès non autorisé - Admin requis'
            //   });
            // }

            const { userIds, type, title, message, data, action } = req.body;

            // Validation
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                ResponseUtil.validationError(res, 'userIds requis et doit être un tableau non vide');
            }

            if (!type || !title || !message) {
                ResponseUtil.validationError(res, 'type, title et message sont requis');
            }

            const notificationData = { type, title, message, data, action };
            const notifications = await NotificationService.broadcastNotification(userIds, notificationData);

            console.log('✅ Controller: Diffusion réussie à', notifications.length, 'utilisateurs');

            ResponseUtil.success(res, {
                notifications,
                broadcastCount: notifications.length,
                message: `Notification diffusée à ${notifications.length} utilisateur(s)`
            });

        } catch (error) {
            console.error('❌ Controller: Erreur POST broadcast:', error);
            ResponseUtil.error(res, 'Erreur lors de la diffusion de la notification');
        }
    };

    /**
     * GET /notifications/search
     * Rechercher dans les notifications
     */
    static async searchNotifications(req: Request, res: Response) {
        try {
            console.log('🔍 Controller: GET /notifications/search');

            if (!req.user?.uid) {
                ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
            }

            const searchTerm = req.query.q as string;

            if (!searchTerm || searchTerm.trim().length < 2) {
                ResponseUtil.validationError(res, 'Terme de recherche requis (minimum 2 caractères)');
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

            const options: IPaginationOptions = { page, limit };

            const result = await NotificationService.searchNotifications(
                // @ts-ignore
                req.user.uid,
                searchTerm.trim(),
                options
            );

            console.log('✅ Controller: Recherche terminée:', result.notifications.length, 'résultats');

            ResponseUtil.success(res, {
                success: true,
                data: result,
                searchTerm: searchTerm.trim()
            });

        } catch (error) {
            console.error('❌ Controller: Erreur GET search:', error);
            ResponseUtil.error(res, 'Erreur lors de la recherche dans les notifications');
        }
    };
}