// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/errors.util';
import { logger } from 'firebase-functions';

export class UserController {
  /**
   * Créer un nouvel utilisateur
   * POST /users
   */
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      logger.debug('Création d\'un nouvel utilisateur', { userData });
      logger.debug('Données utilisateur:', req);
      logger.debug('ID utilisateur Firebase:', req.user?.uid);
      // L'ID utilisateur vient du token Firebase (req.user.uid)
      if (req.user?.uid) {
        userData.id = req.user.uid;
        userData.email = req.user.email;
        userData.isEmailVerified = req.user.emailVerified;
      }
      let plan = req.body.plan || 'free'; // Plan par défaut
      const newUser = await UserService.createUser(userData, plan);
            
      ResponseUtil.created(res, newUser, 'Utilisateur créé avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la création de l\'utilisateur');
    }
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   * GET /users/profile
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const user = await UserService.getUserById(req.user?.uid);
      
      ResponseUtil.success(res, user, 'Profil utilisateur récupéré');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération du profil:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération du profil');
    }
  }

  /**
   * Récupérer un utilisateur par ID
   * GET /users/:id
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Vérifier que l'utilisateur ne peut accéder qu'à ses propres données
      if (req.user?.uid !== id) {
        ResponseUtil.forbidden(res, 'Accès non autorisé');
        return;
      }

      const user = await UserService.getUserById(id);
      
      ResponseUtil.success(res, user, 'Utilisateur récupéré');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération de l\'utilisateur');
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   * PUT /users/profile
   */
  static async updateCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const updateData = req.body;
      
      // Empêcher la mise à jour de certains champs sensibles
      delete updateData.id;
      delete updateData.email; // L'email est géré par Firebase Auth
      delete updateData.createdAt;
      delete updateData.trialUsed;
      delete updateData.aiTrialsUsed;

      const updatedUser = await UserService.updateUser(req.user.uid, updateData);
      
      ResponseUtil.success(res, updatedUser, 'Profil mis à jour avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la mise à jour du profil:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la mise à jour du profil');
    }
  }

  /**
   * Mettre à jour un utilisateur spécifique
   * PUT /users/:id
   */
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Vérifier que l'utilisateur ne peut modifier que ses propres données
      if (req.user?.uid !== id) {
        ResponseUtil.forbidden(res, 'Accès non autorisé');
        return;
      }

      // Empêcher la mise à jour de certains champs sensibles
      delete updateData.id;
      delete updateData.email;
      delete updateData.createdAt;

      const updatedUser = await UserService.updateUser(id, updateData);
      
      ResponseUtil.updated(res, updatedUser, 'Utilisateur mis à jour avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la mise à jour de l\'utilisateur');
    }
  }

  /**
   * Obtenir les statistiques de l'utilisateur
   * GET /users/profile/stats
   */
  static async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const stats = await UserService.getUserStats(req.user.uid);
      
      ResponseUtil.success(res, stats, 'Statistiques utilisateur récupérées');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération des statistiques:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des statistiques');
    }
  }

  /**
   * Mettre à jour la dernière connexion
   * POST /users/profile/login
   */
  static async updateLastLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      await UserService.updateLastLogin(req.user.uid);
      
      ResponseUtil.success(res, null, 'Dernière connexion mise à jour');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la mise à jour de la dernière connexion:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la mise à jour de la dernière connexion');
    }
  }

  /**
   * Supprimer le compte utilisateur
   * DELETE /users/profile
   */
  static async deleteCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      await UserService.deleteUser(req.user.uid);
      
      ResponseUtil.deleted(res, 'Compte utilisateur supprimé avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la suppression du compte:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la suppression du compte');
    }
  }

  /**
   * Supprimer un utilisateur spécifique
   * DELETE /users/:id
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Vérifier que l'utilisateur ne peut supprimer que son propre compte
      if (req.user?.uid !== id) {
        ResponseUtil.forbidden(res, 'Accès non autorisé');
        return;
      }

      await UserService.deleteUser(id);
      
      ResponseUtil.deleted(res, 'Utilisateur supprimé avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la suppression de l\'utilisateur');
    }
  }
}

