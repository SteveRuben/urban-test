// src/controllers/template.controller.ts
import { Request, Response } from 'express';
import { TemplateService } from '../services/template.service';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/errors.util';
import { LetterTemplate, LetterType } from '../models/letter.model';

export class TemplateController {
  /**
   * Récupérer tous les templates disponibles avec filtres
   * GET /templates?type=job&isPremium=false&tags=tech,startup&search=developer&limit=20&offset=0
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const {
        type,
        isPremium,
        tags,
        search,
        limit,
        offset
      } = req.query;

      // Validation et conversion des paramètres
      const filters: any = {};

      if (type && Object.values(LetterType).includes(type as LetterType)) {
        filters.type = type as LetterType;
      }

      if (isPremium !== undefined) {
        filters.isPremium = isPremium === 'true';
      }

      if (tags && typeof tags === 'string') {
        filters.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      if (search && typeof search === 'string') {
        filters.search = search.trim();
      }

      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit);
        if (!isNaN(limitNum) && limitNum > 0) {
          filters.limit = limitNum;
        }
      }

      if (offset && typeof offset === 'string') {
        const offsetNum = parseInt(offset);
        if (!isNaN(offsetNum) && offsetNum >= 0) {
          filters.offset = offsetNum;
        }
      }

      const result = await TemplateService.getAvailableTemplates(req.user.uid, filters);

      ResponseUtil.success(res, {
        templates: result.templates,
        pagination: {
          total: result.total,
          limit: filters.limit || 20,
          offset: filters.offset || 0,
          hasMore: result.hasMore
        },
        filters: {
          type: filters.type,
          isPremium: filters.isPremium,
          tags: filters.tags,
          search: filters.search
        }
      }, 'Templates récupérés avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur récupération templates:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des templates');
    }
  }

  /**
   * Récupérer un template spécifique
   * GET /templates/:id
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ResponseUtil.validationError(res, 'ID du template requis');
        return;
      }

      const template = await TemplateService.getTemplate(req.user.uid, id);

      ResponseUtil.success(res, template, 'Template récupéré avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur récupération template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération du template');
    }
  }

  /**
   * Créer un nouveau template personnalisé
   * POST /templates
   */
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const {
        title,
        template,
        type,
        tags,
        isPublic
      } = req.body;

      // Validation des types
      if (type && !Object.values(LetterType).includes(type)) {
        ResponseUtil.validationError(res, 'Type de template invalide');
        return;
      }

      const templateData = {
        title,
        template,
        type: type || LetterType.JOB_APPLICATION,
        tags: Array.isArray(tags) ? tags : [],
        isPublic: Boolean(isPublic)
      };

      const newTemplate = await TemplateService.createTemplate(req.user.uid, templateData);

      ResponseUtil.success(res, newTemplate, 'Template créé avec succès', 201);

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur création template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la création du template');
    }
  }

  /**
   * Mettre à jour un template
   * PUT /templates/:id
   */
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        ResponseUtil.validationError(res, 'ID du template requis');
        return;
      }

      const updatedTemplate = await TemplateService.updateTemplate(
        req.user.uid,
        id,
        updateData
      );

      ResponseUtil.success(res, updatedTemplate, 'Template mis à jour avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur mise à jour template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la mise à jour du template');
    }
  }

  /**
   * Supprimer un template
   * DELETE /templates/:id
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;

      if (!id) {
        ResponseUtil.validationError(res, 'ID du template requis');
        return;
      }

      await TemplateService.deleteTemplate(req.user.uid, id);

      ResponseUtil.success(res, { deleted: true }, 'Template supprimé avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur suppression template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la suppression du template');
    }
  }

  /**
   * Utiliser un template (avec traitement des variables)
   * POST /templates/:id/use
   */
  static async useTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const variables = req.body;

      if (!id) {
        ResponseUtil.validationError(res, 'ID du template requis');
        return;
      }

      // Utiliser le template et incrémenter le compteur
      const template = await TemplateService.useTemplate(req.user.uid, id);

      // Traiter le template avec les variables fournies
      const processedContent = TemplateService.processTemplate(template.template, variables);

      ResponseUtil.success(res, {
        template: {
          id: template.id,
          title: template.title,
          type: template.type,
          originalContent: template.template,
          processedContent,
          useCount: template.useCount
        },
        variables: variables,
        metadata: {
          variablesUsed: Object.keys(variables).length,
          contentLength: processedContent.length,
          usedAt: new Date().toISOString()
        }
      }, 'Template utilisé avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur utilisation template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'utilisation du template');
    }
  }

  /**
   * Noter un template
   * POST /templates/:id/rate
   */
  static async rateTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const { rating } = req.body;

      if (!id) {
        ResponseUtil.validationError(res, 'ID du template requis');
        return;
      }

      if (!rating || typeof rating !== 'number') {
        ResponseUtil.validationError(res, 'Note requise (nombre entre 1 et 5)');
        return;
      }

      await TemplateService.rateTemplate(req.user.uid, id, rating);

      ResponseUtil.success(res, {
        rated: true,
        rating,
        templateId: id
      }, 'Template noté avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur notation template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la notation du template');
    }
  }

  /**
   * Récupérer les templates populaires
   * GET /templates/popular
   */
  static async getPopularTemplates(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

      const popularTemplates = await TemplateService.getPopularTemplates(limit);

      ResponseUtil.success(res, {
        templates: popularTemplates,
        count: popularTemplates.length,
        limit
      }, 'Templates populaires récupérés');

    } catch (error) {
      console.error('Erreur templates populaires:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des templates populaires');
    }
  }

  /**
   * Récupérer les templates par catégorie
   * GET /templates/category/:type
   */
  static async getTemplatesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      if (!type || !Object.values(LetterType).includes(type as LetterType)) {
        ResponseUtil.validationError(res, 'Type de template invalide');
        return;
      }

      const templates = await TemplateService.getTemplatesByCategory(
        type as LetterType,
        limit
      );

      ResponseUtil.success(res, {
        templates,
        category: type,
        count: templates.length,
        limit
      }, `Templates de catégorie ${type} récupérés`);

    } catch (error) {
      console.error('Erreur templates par catégorie:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des templates par catégorie');
    }
  }

  /**
   * Prévisualiser un template avec des variables
   * POST /templates/preview
   */
  static async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { template, variables } = req.body;

      if (!template || typeof template !== 'string') {
        ResponseUtil.validationError(res, 'Template requis');
        return;
      }

      const processedContent = TemplateService.processTemplate(
        template,
        variables || {}
      );

      ResponseUtil.success(res, {
        originalTemplate: template,
        processedContent,
        variables: variables || {},
        metadata: {
          originalLength: template.length,
          processedLength: processedContent.length,
          variablesCount: Object.keys(variables || {}).length
        }
      }, 'Aperçu du template généré');

    } catch (error) {
      console.error('Erreur aperçu template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la génération de l\'aperçu');
    }
  }

  /**
   * Récupérer les variables disponibles pour les templates
   * GET /templates/variables
   */
  static async getTemplateVariables(req: Request, res: Response): Promise<void> {
    try {
      const variables = {
        standard: [
          {
            name: 'position',
            placeholder: '{{position}}',
            description: 'Titre du poste visé',
            example: 'Développeur Full Stack',
            required: true
          },
          {
            name: 'company',
            placeholder: '{{company}}',
            description: 'Nom de l\'entreprise',
            example: 'Google France',
            required: true
          },
          {
            name: 'name',
            placeholder: '{{name}}',
            description: 'Votre nom complet',
            example: 'Jean Dupont',
            required: false
          },
          {
            name: 'email',
            placeholder: '{{email}}',
            description: 'Votre adresse email',
            example: 'jean.dupont@email.com',
            required: false
          },
          {
            name: 'phone',
            placeholder: '{{phone}}',
            description: 'Votre numéro de téléphone',
            example: '+33 6 12 34 56 78',
            required: false
          },
          {
            name: 'experience',
            placeholder: '{{experience}}',
            description: 'Votre expérience professionnelle',
            example: '5 ans d\'expérience en développement web',
            required: false
          },
          {
            name: 'skills',
            placeholder: '{{skills}}',
            description: 'Vos compétences principales',
            example: 'JavaScript, React, Node.js',
            required: false
          },
          {
            name: 'recipient',
            placeholder: '{{recipient}}',
            description: 'Destinataire de la lettre',
            example: 'Madame Martin',
            required: false
          }
        ],
        automatic: [
          {
            name: 'date',
            placeholder: '{{date}}',
            description: 'Date du jour (automatique)',
            example: new Date().toLocaleDateString('fr-FR'),
            required: false
          }
        ],
        tips: [
          'Utilisez les variables entre doubles accolades : {{variable}}',
          'Les variables non renseignées sont remplacées par des placeholders',
          'Vous pouvez créer vos propres variables personnalisées',
          'Les variables sont sensibles à la casse'
        ]
      };

      ResponseUtil.success(res, variables, 'Variables de template récupérées');

    } catch (error) {
      console.error('Erreur variables template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des variables');
    }
  }

  /**
   * Dupliquer un template
   * POST /templates/:id/duplicate
   */
  static async duplicateTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { id } = req.params;
      const { title } = req.body;

      if (!id) {
        ResponseUtil.validationError(res, 'ID du template requis');
        return;
      }

      // Récupérer le template original
      const originalTemplate = await TemplateService.getTemplate(req.user.uid, id);

      // Créer le template dupliqué
      const duplicateData = {
        title: title || `${originalTemplate.title} (Copie)`,
        template: originalTemplate.template,
        type: originalTemplate.type,
        tags: originalTemplate.tags || [],
        isPublic: false // Les duplications sont privées par défaut
      };

      const duplicatedTemplate = await TemplateService.createTemplate(
        req.user.uid,
        duplicateData
      );

      ResponseUtil.success(res, {
        original: {
          id: originalTemplate.id,
          title: originalTemplate.title
        },
        duplicate: duplicatedTemplate
      }, 'Template dupliqué avec succès', 201);

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur duplication template:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la duplication du template');
    }
  }

  /**
   * Rechercher des templates avec recherche avancée
   * POST /templates/search
   */
  static async searchTemplates(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const {
        query,
        filters,
        sortBy = 'useCount',
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        ResponseUtil.validationError(res, 'Terme de recherche requis (minimum 2 caractères)');
        return;
      }

      const searchFilters = {
        ...filters,
        search: query.trim(),
        limit: Math.min(limit, 100),
        offset: Math.max(offset, 0)
      };

      const result = await TemplateService.getAvailableTemplates(req.user.uid, searchFilters);

      // Tri des résultats si nécessaire
      if (sortBy && ['useCount', 'rating', 'createdAt', 'title'].includes(sortBy)) {
        result.templates.sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a];
          const bValue = b[sortBy as keyof typeof b];
          
          if (sortOrder === 'asc') {
            return (aValue ?? 0) > (bValue ?? 0) ? 1 : -1;
          } else {
            return (aValue ?? 0) < (bValue ?? 0) ? 1 : -1;
          }
        });
      }

      ResponseUtil.success(res, {
        query,
        results: result.templates,
        pagination: {
          total: result.total,
          limit: searchFilters.limit,
          offset: searchFilters.offset,
          hasMore: result.hasMore
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }, `${result.total} templates trouvés`);

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur recherche templates:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la recherche de templates');
    }
  }

  /**
   * Obtenir les statistiques des templates d'un utilisateur
   * GET /templates/my/stats
   */
  static async getMyTemplateStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      // Récupérer tous les templates de l'utilisateur
      const userTemplatesSnapshot = await TemplateService['templatesCollection']
        .where('creatorId', '==', req.user.uid)
        .get();

      const userTemplates  = userTemplatesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as LetterTemplate[];

      // Calculer les statistiques
      const stats = {
        totalTemplates: userTemplates.length,
        publicTemplates: userTemplates.filter(t => t.isPublic).length,
        privateTemplates: userTemplates.filter(t => !t.isPublic).length,
        totalUses: userTemplates.reduce((sum, t) => sum + (t.useCount || 0), 0),
        averageRating: userTemplates.length > 0 ? 
          userTemplates.reduce((sum, t) => sum + (t.rating || 0), 0) / userTemplates.length : 0,
        byType: userTemplates.reduce((acc, t) => {
          acc[t.type] = (acc[t.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        mostUsed: userTemplates
          .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            title: t.title,
            useCount: t.useCount || 0,
            rating: t.rating || 0
          })),
        recentActivity: userTemplates
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            title: t.title,
            updatedAt: t.updatedAt,
            action: 'updated'
          }))
      };

      ResponseUtil.success(res, stats, 'Statistiques des templates récupérées');

    } catch (error) {
      console.error('Erreur statistiques templates:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des statistiques');
    }
  }
}