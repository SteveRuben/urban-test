// src/services/letter.service.ts
import { logger } from 'firebase-functions';
import { db, COLLECTIONS } from '../config/firebase';
import { Letter, LetterStats } from '../models/letter.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';

export class LetterService {
  private static collection = db.collection(COLLECTIONS.LETTERS);

  /**
   * Créer une nouvelle lettre
   */
  static async createLetter(userId: string, letterData: Partial<Letter>): Promise<Letter> {
    try {
      // Validation des données requises
      const requiredFields = ['title', 'content'];
      const missingFields = ValidationUtil.validateRequiredFields(letterData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      // Vérification des limites d'abonnement
      const letterLimits = await SubscriptionService.checkLetterCreationLimit(userId);
      if (!letterLimits.canCreate) {
        throw new ForbiddenError(
          `Limite de lettres atteinte (${letterLimits.currentCount}/${letterLimits.limit}). Mettez à niveau votre abonnement pour créer plus de lettres.`
        );
      }

      const letterId = this.collection.doc().id;
      
      const newLetter: Letter = {
        id: letterId,
        userId,
        title: ValidationUtil.sanitizeString(letterData.title!),
        content: letterData.content!,
        jobTitle: letterData.jobTitle ? ValidationUtil.sanitizeString(letterData.jobTitle) : undefined,
        company: letterData.company ? ValidationUtil.sanitizeString(letterData.company) : undefined,
        recipient: letterData.recipient,
        status: letterData.status || 'draft',
        isAIGenerated: letterData.isAIGenerated || false,
        aiPromptUsed: letterData.aiPromptUsed,
        aiModel: letterData.aiModel,
        templateId: letterData.templateId ?? '',
        viewCount: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.debug('Création d\'une nouvelle lettre', {newLetter});

      // Créer la lettre
      await this.collection.doc(letterId).set(newLetter);

      return newLetter;
    } catch (error) {
      console.error('Erreur lors de la création de la lettre:', error);
      throw error;
    }
  }

  /**
   * Récupérer une lettre par ID
   */
  static async getLetterById(letterId: string, userId: string): Promise<Letter> {
    try {
      if (!ValidationUtil.isValidObjectId(letterId)) {
        throw new ValidationError('ID lettre invalide');
      }

      const letterDoc = await this.collection.doc(letterId).get();
      
      if (!letterDoc.exists) {
        throw new NotFoundError('Lettre non trouvée');
      }

      const letterData = letterDoc.data() as Letter;
      
      // Vérifier que l'utilisateur est le propriétaire
      if (letterData.userId !== userId) {
        throw new ForbiddenError('Accès non autorisé à cette lettre');
      }

      // Incrémenter le compteur de vues
      await this.incrementViewCount(letterId);

      return {
        ...letterData,
        createdAt: letterData.createdAt,
        updatedAt: letterData.updatedAt,
        finalizedAt: letterData.finalizedAt
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la lettre:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les lettres d'un utilisateur
   */
  static async getUserLetters(
    userId: string, 
    options: {
      status?: 'draft' | 'final';
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{letters: Letter[], total: number}> {
    try {
      let query = this.collection.where('userId', '==', userId);

      // Filtrer par statut si spécifié
      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      // Tri
      const sortBy = options.sortBy || 'updatedAt';
      const sortOrder = options.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Pagination
      if (options.offset) {
        query = query.offset(options.offset);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const letters = snapshot.docs.map(doc => {
        const data = doc.data() as Letter;
        return {
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          finalizedAt: data.finalizedAt
        };
      });

      // Compter le total
      const totalSnapshot = await this.collection
        .where('userId', '==', userId)
        .get();
      
      return {
        letters,
        total: totalSnapshot.size
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des lettres:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une lettre
   */
  static async updateLetter(letterId: string, userId: string, updateData: Partial<Letter>): Promise<Letter> {
    try {
      if (!ValidationUtil.isValidObjectId(letterId)) {
        throw new ValidationError('ID lettre invalide');
      }

      // Vérifier que la lettre existe et appartient à l'utilisateur
      const existingLetter = await this.getLetterById(letterId, userId);

      // Préparer les données de mise à jour
      const updateFields: Partial<Letter> = {
        ...updateData,
        updatedAt: new Date()
      };

      // Nettoyer les champs string
      if (updateFields.title) {
        updateFields.title = ValidationUtil.sanitizeString(updateFields.title);
      }
      if (updateFields.jobTitle) {
        updateFields.jobTitle = ValidationUtil.sanitizeString(updateFields.jobTitle);
      }
      if (updateFields.company) {
        updateFields.company = ValidationUtil.sanitizeString(updateFields.company);
      }

      // Si on passe en statut final, ajouter la date de finalisation
      if (updateFields.status === 'final' && existingLetter.status === 'draft') {
        updateFields.finalizedAt = new Date();
      }

      // Incrémenter la version
      if (updateFields.content !== existingLetter.content) {
        updateFields.version = (existingLetter.version || 1) + 1;
      }

      // Empêcher la modification de certains champs
      delete updateFields.id;
      delete updateFields.userId;
      delete updateFields.createdAt;

      // Mettre à jour
      await this.collection.doc(letterId).update(updateFields);

      // Retourner la lettre mise à jour
      return await this.getLetterById(letterId, userId);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la lettre:', error);
      throw error;
    }
  }

  /**
   * Supprimer une lettre
   */
  static async deleteLetter(letterId: string, userId: string): Promise<void> {
    try {
      if (!ValidationUtil.isValidObjectId(letterId)) {
        throw new ValidationError('ID lettre invalide');
      }

      // Vérifier que la lettre existe et appartient à l'utilisateur
      await this.getLetterById(letterId, userId);

      // Supprimer la lettre
      await this.collection.doc(letterId).delete();
    } catch (error) {
      console.error('Erreur lors de la suppression de la lettre:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des lettres d'un utilisateur
   */
  static async getUserLetterStats(userId: string): Promise<LetterStats> {
    try {
      const snapshot = await this.collection.where('userId', '==', userId).get();
      const letters = snapshot.docs.map(doc => doc.data() as Letter);

      const stats: LetterStats = {
        totalCount: letters.length,
        draftCount: letters.filter(l => l.status === 'draft').length,
        finalCount: letters.filter(l => l.status === 'final').length,
        aiGeneratedCount: letters.filter(l => l.isAIGenerated).length,
        mostUsedTemplates: [],
        topCompanies: [],
        topPositions: [],
        creationsByMonth: {}
      };

      // Calculer les modèles les plus utilisés
      const templateCounts = new Map<string, number>();
      letters.forEach(letter => {
        if (letter.templateId) {
          templateCounts.set(letter.templateId, (templateCounts.get(letter.templateId) || 0) + 1);
        }
      });
      stats.mostUsedTemplates = Array.from(templateCounts.entries())
        .map(([templateId, count]) => ({ templateId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculer les entreprises les plus mentionnées
      const companyCounts = new Map<string, number>();
      letters.forEach(letter => {
        if (letter.company) {
          companyCounts.set(letter.company, (companyCounts.get(letter.company) || 0) + 1);
        }
      });
      stats.topCompanies = Array.from(companyCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculer les postes les plus mentionnés
      const positionCounts = new Map<string, number>();
      letters.forEach(letter => {
        if (letter.jobTitle) {
          positionCounts.set(letter.jobTitle, (positionCounts.get(letter.jobTitle) || 0) + 1);
        }
      });
      stats.topPositions = Array.from(positionCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculer les créations par mois
      letters.forEach(letter => {
        const monthKey = letter.createdAt.toISOString().substring(0, 7); // YYYY-MM
        stats.creationsByMonth[monthKey] = (stats.creationsByMonth[monthKey] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  }

  /**
   * Obtenir le nombre de lettres d'un utilisateur
   */
  // @ts-ignore
  private static async getUserLetterCount(userId: string): Promise<number> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.size;
  }

  /**
   * Incrémenter le compteur de vues
   */
  private static async incrementViewCount(letterId: string): Promise<void> {
    const letterRef = this.collection.doc(letterId);
    try {
      await letterRef.update({
        viewCount: (await letterRef.get()).data()?.viewCount + 1 || 1
      });
    } catch (error) {
      // Ignorer les erreurs de compteur de vues
      console.log('Erreur lors de l\'incrémentation des vues:', error);
    }
  }

  /**
   * Dupliquer une lettre
   */
  static async duplicateLetter(letterId: string, userId: string): Promise<Letter> {
    try {
      const originalLetter = await this.getLetterById(letterId, userId);
      
      const duplicateData: Partial<Letter> = {
        title: `${originalLetter.title} - Copie`,
        content: originalLetter.content,
        jobTitle: originalLetter.jobTitle,
        company: originalLetter.company,
        recipient: originalLetter.recipient,
        status: 'draft', // Toujours en brouillon
        templateId: originalLetter.templateId
      };

      return await this.createLetter(userId, duplicateData);
    } catch (error) {
      console.error('Erreur lors de la duplication de la lettre:', error);
      throw error;
    }
  }
}