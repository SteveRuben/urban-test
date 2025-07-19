// src/services/user.service.ts
import { logger } from 'firebase-functions';
import { db, COLLECTIONS } from '../config/firebase';
import { Subscription, SubscriptionPlan } from '../models/subscription.model';
import { User, UserStats } from '../models/user.model';
import { NotFoundError, ValidationError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';

export class UserService {
  private static collection = db.collection(COLLECTIONS.USERS);

  /**
   * Créer un nouvel utilisateur
   */
  static async createUser(userData: Partial<User>, planId: string): Promise<User> {
    try {
      // Validation des données requises
      const requiredFields = ['id', 'email', 'displayName'];
      const missingFields = ValidationUtil.validateRequiredFields(userData, requiredFields);

      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      if (!ValidationUtil.isValidEmail(userData.email!)) {
        throw new ValidationError('Email invalide');
      }

      /*  let plan = (await SubscriptionService.getAvailablePlans()).find(p => p.id === planId);
       if (!plan) {
         throw new ValidationError('Plan d\'abonnement invalide');
       } */
      let subplanId = planId === 'free' ? SubscriptionPlan.FREE
        : planId === 'basic' ? SubscriptionPlan.BASIC
          : planId === 'pro' ? SubscriptionPlan.PRO
            : planId == 'lifetime' ? SubscriptionPlan.PREMIUM : SubscriptionPlan.LIFETIME;
      let subscription: Partial<Subscription> = {
        planId: planId,
        plan: subplanId,
      }
      const newUser: User = {
        id: userData.id!,
        email: userData.email!,
        displayName: ValidationUtil.sanitizeString(userData.displayName!),
        photoURL: userData.photoURL || '',
        isEmailVerified: userData.isEmailVerified || false,
        trialUsed: 0,
        aiTrialsUsed: 0,
        aiUsage: {},
        lettersCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };


      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.collection.doc(newUser.id).get();
      if (existingUser.exists) {
        throw new ValidationError('Utilisateur déjà existant');
      }

      // Créer l'utilisateur
      await this.collection.doc(newUser.id).set(newUser);

      subscription = await SubscriptionService.createSubscription(newUser.id, subscription);
      newUser.subscriptionId = subscription.id;
      return newUser;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  static async getUserById(userId: string): Promise<User> {
    try {
      if (!ValidationUtil.isValidObjectId(userId)) {
        throw new ValidationError('ID utilisateur invalide');
      }

      const userDoc = await this.collection.doc(userId).get();

      if (!userDoc.exists) {
        throw new NotFoundError('Utilisateur non trouvé');
      }

      const userData = userDoc.data() as User;

      // Convertir les Timestamps en Date
      return {
        ...userData,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLoginAt: userData.lastLoginAt,
        aiLastUsed: userData.aiLastUsed
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  static async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      if (!ValidationUtil.isValidObjectId(userId)) {
        throw new ValidationError('ID utilisateur invalide');
      }

      // Vérifier que l'utilisateur existe
      await this.getUserById(userId);

      // Préparer les données de mise à jour
      const updateFields: Partial<User> = {
        ...updateData,
        updatedAt: new Date()
      };

      // Nettoyer les champs string
      if (updateFields.displayName) {
        updateFields.displayName = ValidationUtil.sanitizeString(updateFields.displayName);
      }

      // Validation email si fourni
      if (updateFields.email && !ValidationUtil.isValidEmail(updateFields.email)) {
        throw new ValidationError('Email invalide');
      }

      // Mettre à jour
      await this.collection.doc(userId).update(updateFields);

      // Retourner l'utilisateur mis à jour
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Incrémenter l'utilisation d'essai
   */
  static async incrementTrialUsage(userId: string): Promise<void> {
    try {
      const userRef = this.collection.doc(userId);
      await userRef.update({
        trialUsed: (await userRef.get()).data()?.trialUsed + 1 || 1,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation de l\'essai:', error);
      throw error;
    }
  }

  /**
   * Incrémenter l'utilisation IA
   */
  static async incrementAIUsage(userId: string): Promise<void> {
    try {
      const userRef = this.collection.doc(userId);
      const user = await this.getUserById(userId);

      const currentMonth = new Date().toISOString().substring(0, 7); // Format: YYYY-MM
      const currentAIUsage = user.aiUsage || {};
      currentAIUsage[currentMonth] = (currentAIUsage[currentMonth] || 0) + 1;

      await userRef.update({
        aiTrialsUsed: (user.aiTrialsUsed || 0) + 1,
        aiUsage: currentAIUsage,
        aiLastUsed: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation de l\'utilisation IA:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour la dernière connexion
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.collection.doc(userId).update({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la dernière connexion:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'un utilisateur
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    try {
      const user = await this.getUserById(userId);

      // Calculer les statistiques à partir des données utilisateur et des lettres
      const lettersSnapshot = await db.collection(COLLECTIONS.LETTERS)
        .where('userId', '==', userId)
        .get();

      const letters = lettersSnapshot.docs.map(doc => doc.data());

      const stats: UserStats = {
        userId,
        lettersCreated: letters.length,
        lettersFinalized: letters.filter(letter => letter.status === 'final').length,
        aiGenerated: letters.filter(letter => letter.isAIGenerated).length,
        lastActivity: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: new Date()
      };

      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      if (!ValidationUtil.isValidObjectId(userId)) {
        throw new ValidationError('ID utilisateur invalide');
      }

      // Vérifier que l'utilisateur existe
      await this.getUserById(userId);

      // Supprimer l'utilisateur
      await this.collection.doc(userId).delete();

      // TODO: Supprimer aussi les données liées (lettres, abonnements, etc.)
      // Cela sera implémenté dans les services correspondants
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  }

  static async checkCVCreationLimit(userId: string): Promise<{
    canCreate: boolean;
    currentCount: number;
    limit: number;
    plan: string;
  }> {
    try {
      const subscription = await SubscriptionService.getActiveUserSubscription(userId);

      // Compter les CV existants
      const cvsSnapshot = await db.collection(COLLECTIONS.CVS)
        .where('userId', '==', userId)
        .get();

      const currentCount = cvsSnapshot.size;

      // Déterminer la limite selon le plan
      let limit = 2; // Plan gratuit
      if (subscription) {
        switch (subscription.plan) {
          case 'basic': limit = 5; break;
          case 'pro': limit = 15; break;
          case 'premium': limit = 50; break;
        }
      }

      return {
        canCreate: currentCount < limit,
        currentCount,
        limit,
        plan: subscription?.plan || 'free'
      };
    } catch (error) {
      logger.error('Erreur vérification limite CV:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques CV de l'utilisateur
   */
  static async getUserCVStats(userId: string): Promise<any> {
    try {
      const cvsSnapshot = await db.collection(COLLECTIONS.CVS)
        .where('userId', '==', userId)
        .get();

      const cvs = cvsSnapshot.docs.map(doc => doc.data());

      return {
        totalCVs: cvs.length,
        draftCVs: cvs.filter(cv => cv.status === 'draft').length,
        completedCVs: cvs.filter(cv => cv.status === 'completed').length,
        recentlyUpdated: cvs.filter(cv => {
          const daysSinceUpdate = (new Date().getTime() - cv.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate <= 7;
        }).length
      };
    } catch (error) {
      logger.error('Erreur stats CV utilisateur:', error);
      throw error;
    }
  }
}