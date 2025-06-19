import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { AuthMiddleware } from "../middleware/auth.middleware";

const router = Router();
// Toutes les routes lettres nécessitent une authentification
router.use(AuthMiddleware.validateFirebaseToken);

router.get("/", NotificationController.getNotifications); // Liste des notifications
router.post("/", NotificationController.createNotification); // Créer une notification lues
router.delete("/", NotificationController.deleteAllNotifications); // Supprimer toutes les notifications
router.delete("/:id", NotificationController.deleteNotification); // Supprimer une notification
router.put("/:id/read", NotificationController.markAsRead); // Marquer une notification comme lue
router.put("/read-all", NotificationController.markAllAsRead); // Marquer toutes les notifications comme
router.get("/unread-count", NotificationController.getUnreadCount); // Compter les notifications non lues
router.get("/broadcast", NotificationController.broadcastNotification); // Statistiques des notifications
router.get("/search", NotificationController.searchNotifications); // Rechercher des notifications

export default router;