// src/controllers/letter.controller.ts
import { Request, Response } from 'express';
import { LetterService } from '../services/letter.service';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/errors.util';
import { Letter } from '../models/letter.model';

export class LetterController {
  /**
   * Créer une nouvelle lettre
   * POST /letters
   */
  static async createLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const letterData = req.body;
      const newLetter = await LetterService.createLetter(req.user.uid, letterData);
      
      ResponseUtil.created(res, newLetter, 'Lettre créée avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la création de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la création de la lettre');
    }
  }

  /**
   * Récupérer toutes les lettres de l'utilisateur
   * GET /letters
   */
  static async getUserLetters(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const options = {
        status: req.query.status as 'draft' | 'final' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        sortBy: req.query.sortBy as 'createdAt' | 'updatedAt' | 'title' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined
      };

      const result = await LetterService.getUserLetters(req.user.uid, options);
      
      ResponseUtil.success(res, result, 'Lettres récupérées avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération des lettres:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des lettres');
    }
  }

  /**
   * Récupérer une lettre par ID
   * GET /letters/:id
   */
  static async getLetterById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const letter = await LetterService.getLetterById(id, req.user.uid);
      
      ResponseUtil.success(res, letter, 'Lettre récupérée avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la récupération de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération de la lettre');
    }
  }

  /**
   * Mettre à jour une lettre
   * PUT /letters/:id
   */
  static async updateLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const updateData = req.body;
      
      const updatedLetter = await LetterService.updateLetter(id, req.user.uid, updateData);
      
      ResponseUtil.success(res, updatedLetter, 'Lettre mise à jour avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la mise à jour de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la mise à jour de la lettre');
    }
  }

  /**
   * Supprimer une lettre
   * DELETE /letters/:id
   */
  static async deleteLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      await LetterService.deleteLetter(id, req.user.uid);
      
      ResponseUtil.deleted(res, 'Lettre supprimée avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la suppression de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la suppression de la lettre');
    }
  }

  /**
   * Obtenir les statistiques des lettres
   * GET /letters/stats
   */
  static async getLetterStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const stats = await LetterService.getUserLetterStats(req.user.uid);
      
      ResponseUtil.success(res, stats, 'Statistiques récupérées avec succès');
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
   * Dupliquer une lettre
   * POST /letters/:id/duplicate
   */
  static async duplicateLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const duplicatedLetter = await LetterService.duplicateLetter(id, req.user.uid);
      
      ResponseUtil.created(res, duplicatedLetter, 'Lettre dupliquée avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la duplication de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la duplication de la lettre');
    }
  }

  /**
   * Finaliser une lettre (passer de brouillon à final)
   * POST /letters/:id/finalize
   */
  static async finalizeLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const finalizedLetter = await LetterService.updateLetter(id, req.user.uid, { 
        status: 'final' 
      });
      
      ResponseUtil.success(res, finalizedLetter, 'Lettre finalisée avec succès');
    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de la finalisation de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la finalisation de la lettre');
    }
  }

  /**
   * Créer une lettre générée par IA
   * POST /letters/generate
   */
  static async generateLetterWithAI(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const {
        jobTitle,
        company,
        jobDescription,
        userProfile,
        model,
        tone,
        language,
        recipientEmail,
        recipientName,
        saveAsLetter = true
      } = req.body;

      if (!jobTitle || !company) {
        ResponseUtil.validationError(res, 'Titre du poste et nom de l\'entreprise requis');
        return;
      }

      // Générer le contenu avec l'IA
      const { AIService } = require('../services/ai.service');
      const aiResult = await AIService.generateCoverLetter(req.user.uid, {
        jobTitle,
        company,
        jobDescription,
        userProfile,
        model,
        tone,
        language
      });

      let letter: Letter | null = null;

      // Sauvegarder comme lettre si demandé
      if (saveAsLetter) {
        const letterData = {
          title: `Lettre de motivation - ${jobTitle} chez ${company}`,
          content: aiResult.content,
          recipient: {
            name: recipientName, // Peut être rempli plus tard
            email: recipientEmail // Peut être rempli plus tard
          },
          jobTitle,
          company,
          status: 'draft' as const,
          isAIGenerated: true,
          aiPromptUsed: `Génération automatique pour ${jobTitle} chez ${company}`,
          aiModel: aiResult.aiResponse.model
        };

        letter = await LetterService.createLetter(req.user.uid, letterData);
      }

      ResponseUtil.success(res, {
        content: aiResult.content,
        tokensUsed: aiResult.tokensUsed,
        aiResponseId: aiResult.aiResponse.id,
        model: aiResult.aiResponse.model,
        letter: letter,
        generatedAt: aiResult.aiResponse.createdAt
      }, 'Lettre générée avec IA avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur lors de la génération de lettre avec IA:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la génération de lettre avec IA');
    }
  }


  /**
   * Exporter une lettre au format PDF/DOCX
   * GET /letters/:id/export?format=pdf|docx
   */
  static async exportLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const format = req.query.format as string;

      if (!format || !['pdf', 'docx'].includes(format)) {
        ResponseUtil.validationError(res, 'Format d\'export invalide. Utilisez pdf ou docx');
        return;
      }

      // Récupérer la lettre
      const letter = await LetterService.getLetterById(id, req.user.uid);

      // TODO: Implémenter la génération PDF/DOCX
      // Pour l'instant, retourner les données de la lettre
      ResponseUtil.success(res, {
        letterId: letter.id,
        format,
        message: 'Export en cours de développement',
        letter: {
          title: letter.title,
          content: letter.content,
          company: letter.company,
          jobTitle: letter.jobTitle
        }
      }, `Export ${format.toUpperCase()} préparé`);

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }
      
      console.error('Erreur lors de l\'export de la lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'export de la lettre');
    }
  }
}