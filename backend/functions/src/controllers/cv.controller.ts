// controllers/cv.controller.ts - Contrôleurs API pour les fonctionnalités CV

import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { CVService } from '../services/cv.service';
import { CVRegion } from '../models/cv.model';
import { AIModel } from '../models/ai.model';
import { AIWrapper } from '../services/ai.wrapper.service';
import { ResponseUtil } from '../utils/response.util';

export class CVController {

  constructor() {
   
  }

  /**
   * Créer un nouveau CV
   */
  static async createCV (req: Request, res: Response): Promise<void> {
    try {
      const { templateId, title, region } = req.body;
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const userId = req.user?.uid;

      const cv = await CVService.createCV({
        userId,
        templateId,
        title,
        region: region || CVRegion.INTERNATIONAL,
        personalInfo: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: {
            city: '',
            country: ''
          }
        },
        sections: [],
        status: 'draft',
        version: 1,
        isAIOptimized: false,
        jobMatchings: [],
        exports: [],
        shareSettings: {
          isPublic: false,
          passwordProtected: false,
          trackViews: false,
          views: []
        }
      });


      ResponseUtil.created(res, cv, 'CV créé avec succès');
    } catch (error) {
      ResponseUtil.error(res, error instanceof Error ? error.message : 'Erreur lors de la création du CV', 500);
    }
  };

  static async getCVById(req: Request, res: Response) : Promise<void>{
    try {
      const { id } = req.params;
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const userId = req.user?.uid;

      const cv = await CVService.getCVById(id, userId);

      ResponseUtil.success(res, cv, 'CV recupéré avec succès');

    }catch (error) {
      ResponseUtil.error(res, error instanceof Error ? error.message : 'Erreur lors de la mise à jour du CV', 500);
    }

  }

  static async deleteCV(req: Request, res: Response) : Promise<void>{
    try {
      const { id } = req.params;
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const userId = req.user?.uid;

      await CVService.deleteCV(id, userId);

      ResponseUtil.deleted(res, {}, 'Supprimé avec success');
      
    }catch (error) {
      ResponseUtil.error(res, error instanceof Error ? error.message : 'Erreur lors de la mise à jour du CV', 500);
    }

  }

  /**
   * Mettre à jour un CV
   */
  static async updateCV (req: Request, res: Response) : Promise<void> {
    try {
      const { id } = req.params;
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const userId = req.user?.uid;
      const updateData = req.body;

      const cv = await CVService.updateCV(id, userId, updateData);
      
      ResponseUtil.updated(res, cv, 'CV mis à jour avec succès');
      
    } catch (error) {
      ResponseUtil.error(res, error instanceof Error ? error.message : 'Erreur lors de la mise à jour du CV', 500);
    }
  };

  /**
   * Analyser un CV avec l'IA
   */
  static async analyzeCV (req: Request, res: Response) : Promise<void> {
    try {
      const { id } = req.params;
      const { targetRegion } = req.body;

      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const userId = req.user?.uid;

      const cv = await CVService.getCVById(id, userId);
      if (!cv) {
        ResponseUtil.notFound(res, 'CV non trouvé');
      }

      const result = await new AIWrapper().executeWithMetrics(
        () => new AIService().analyzeCVCompliance(cv, targetRegion || cv.region),
        userId,
        AIModel.GEMINI_PRO
      );

      if (!result.success) {
        ResponseUtil.error(res, result.error || '');
      }

      // Sauvegarder l'analyse
      await CVService.saveAnalysis(result.data);

      res.json({
        success: true,
        data: result.data,
        metadata: result.metadata,
        message: 'Analyse du CV terminée'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse du CV'
      });
    }
  };

  /**
   * Analyser la correspondance avec une offre d'emploi
   */
  static async analyzeJobMatching (req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobDescription, jobTitle, company } = req.body;
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      const userId = req.user?.uid ;

      if (!jobDescription || !jobTitle) {
        ResponseUtil.validationError(res, 'Description du poste et titre requis');
      }

      const cv = await CVService.getCVById(id, userId);
      if (!cv) {
        ResponseUtil.notFound(res, 'CV non trouvé');
      }

      const result = await new AIWrapper().executeWithMetrics(
        () => new AIService().analyzeJobMatching(cv, jobDescription, jobTitle, company),
        userId,
        AIModel.GEMINI_FLASH_2_0
      );

      if (!result.success) {
        ResponseUtil.error(res, result.error || '');
      }

      // Sauvegarder le matching
      await CVService.saveJobMatching(result.data);

      res.json({
        success: true,
        data: result.data,
        metadata: result.metadata,
        message: 'Analyse de correspondance terminée'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse de correspondance'
      });
    }
  };

  /**
   * Optimiser un CV avec l'IA
   */
  static async optimizeCV (req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { targetJob, targetRegion } = req.body;
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      const userId = req.user?.uid;

      const cv = await CVService.getCVById(id, userId);
      if (!cv) {
        ResponseUtil.notFound(res, 'CV non trouvé');
      }

      const result = await new AIWrapper().executeWithMetrics(
        () => new AIService().optimizeCV(cv, targetJob, targetRegion),
        userId,
        AIModel.GEMINI_PRO
      );

      if (!result.success) {
        ResponseUtil.error(res, result.error||'');
      }

      res.json({
        success: true,
        data: {
          suggestions: result.data,
          cvId: id
        },
        metadata: result.metadata,
        message: 'Suggestions d\'optimisation générées'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'optimisation du CV'
      });
    }
  };

  /**
   * Adapter un CV pour une région
   */
  static async adaptCVForRegion (req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { targetRegion } = req.body;

      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      const userId = req.user?.uid;

      if (!targetRegion) {
        ResponseUtil.validationError(res, 'Région cible requise');
      }

      const cv = await CVService.getCVById(id, userId);
      if (!cv) {
        ResponseUtil.notFound(res, 'CV non trouvé');
      }

      const result = await new AIWrapper().executeWithMetrics(
        () => new AIService().adaptCVForRegion(cv, targetRegion),
        userId,
        AIModel.GEMINI_PRO
      );

      if (!result.success) {
        ResponseUtil.error(res, result.error || '');
      }

      res.json({
        success: true,
        data: result.data,
        metadata: result.metadata,
        message: 'Adaptation régionale générée'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'adaptation régionale'
      });
    }
  };

  /**
   * Exporter un CV
   */
  static async exportCV (req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;

      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      const userId = req.user?.uid;

      const cv = await CVService.getCVById(id, userId);
      if (!cv) {
        ResponseUtil.notFound(res, 'CV non trouvé');
      }

      const exportResult = await CVService.exportCV(cv, format as string);

      ResponseUtil.success(res, exportResult,  'CV exporté avec succès');

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'export du CV'
      });
    }
  };

  /**
   * Obtenir tous les CV de l'utilisateur
   */
  static async getUserCVs (req: Request, res: Response): Promise<void> {
    try {

      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      const userId = req.user?.uid ;

      const { page = 1, limit = 10 } = req.query;

      const cvs = await CVService.getUserCVs(userId, {
        page: Number(page),
        limit: Number(limit)
      });

      ResponseUtil.success(res, cvs,'CV récupérés avec succès');

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des CV'
      });
    }
  };

  /**
   * Dupliquer un CV
   */
  static async duplicateCV (req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title } = req.body;

      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }
      const userId = req.user?.uid;

      const originalCV = await CVService.getCVById(id, userId);
      if (!originalCV) {
        ResponseUtil.notFound(res, 'CV non trouvé');
      }

      const duplicatedCV = await CVService.duplicateCV(originalCV, title);

      ResponseUtil.success(res, duplicatedCV, 'CV dupliqué avec succès');

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la duplication du CV'
      });
    }
  };

  /**
   * Obtenir les templates CV
   */
  static async getCVTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { region, style, industry, experienceLevel } = req.query;

      const templates = await CVService.getCVTemplates({
        region: region as string,
        style: style as string,
        industry: industry as string,
        experienceLevel: experienceLevel as string
      });

      ResponseUtil.success(res, { cvs: templates }, 'Templates récupérés avec succès');

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des templates'
      });
    }
  };
}
