// middleware/validation.middleware.ts - Middleware de validation des données
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ResponseUtil } from '../utils/response.util';
import { logger } from 'firebase-functions/v2';

/**
 * Interface pour les schémas de validation
 */
interface ValidationSchemas {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

/**
 * Schémas de validation réutilisables
 */
export const ValidationSchemas = {
  // Validation d'email
  email: Joi.string().email().required().messages({
    'string.email': 'Format d\'email invalide',
    'any.required': 'Email requis'
  }),

  // Validation de mot de passe
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
    'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
    'any.required': 'Mot de passe requis'
  }),

  // Validation de nom
  name: Joi.string().min(2).max(50).pattern(/^[a-zA-ZÀ-ÿ\s-']+$/).required().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'string.max': 'Le nom ne peut pas dépasser 50 caractères',
    'string.pattern.base': 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes',
    'any.required': 'Nom requis'
  }),

  // Validation d'ID MongoDB/Firebase
  objectId: Joi.string().alphanum().length(24).messages({
    'string.length': 'ID invalide',
    'string.alphanum': 'ID invalide'
  }),

  // Validation d'ID Firebase
  firebaseId: Joi.string().min(10).max(50).alphanum().messages({
    'string.min': 'ID Firebase invalide',
    'string.max': 'ID Firebase invalide'
  }),

  // Validation de titre de lettre
  letterTitle: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Le titre doit contenir au moins 5 caractères',
    'string.max': 'Le titre ne peut pas dépasser 200 caractères',
    'any.required': 'Titre requis'
  }),

  // Validation de contenu de lettre
  letterContent: Joi.string().min(100).max(10000).required().messages({
    'string.min': 'Le contenu doit contenir au moins 100 caractères',
    'string.max': 'Le contenu ne peut pas dépasser 10 000 caractères',
    'any.required': 'Contenu requis'
  }),

  // Validation de nom d'entreprise
  companyName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Le nom de l\'entreprise doit contenir au moins 2 caractères',
    'string.max': 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères',
    'any.required': 'Nom de l\'entreprise requis'
  }),

  // Validation de poste
  jobTitle: Joi.string().min(2).max(100).required().messages({
    'string.min': 'L\'intitulé du poste doit contenir au moins 2 caractères',
    'string.max': 'L\'intitulé du poste ne peut pas dépasser 100 caractères',
    'any.required': 'Intitulé du poste requis'
  }),

  // Validation de statut
  status: Joi.string().valid('draft', 'final').default('draft').messages({
    'any.only': 'Le statut doit être "draft" ou "final"'
  }),

  // Validation de langue
  language: Joi.string().valid('fr', 'en').default('fr').messages({
    'any.only': 'La langue doit être "fr" ou "en"'
  }),

  // Validation de pagination
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Le numéro de page doit être un nombre',
    'number.integer': 'Le numéro de page doit être un entier',
    'number.min': 'Le numéro de page doit être supérieur à 0'
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'La limite doit être un nombre',
    'number.integer': 'La limite doit être un entier',
    'number.min': 'La limite doit être supérieure à 0',
    'number.max': 'La limite ne peut pas dépasser 100'
  }),

  // Validation pour les requêtes d'IA
  aiPrompt: Joi.string().min(10).max(2000).required().messages({
    'string.min': 'Le prompt doit contenir au moins 10 caractères',
    'string.max': 'Le prompt ne peut pas dépasser 2000 caractères',
    'any.required': 'Prompt requis'
  }),

  aiModel: Joi.string().valid('gemini-pro', 'gemini-pro-vision').default('gemini-pro').messages({
    'any.only': 'Modèle d\'IA non supporté'
  }),

  aiTone: Joi.string().valid('professional', 'casual', 'enthusiastic', 'formal').default('professional').messages({
    'any.only': 'Ton invalide'
  })
};

/**
 * Schémas complets pour différents endpoints
 */
export const EndpointSchemas = {
  // Authentification
  register: {
    body: Joi.object({
      email: ValidationSchemas.email,
      password: ValidationSchemas.password,
      name: ValidationSchemas.name,
      acceptTerms: Joi.boolean().valid(true).required().messages({
        'any.only': 'Vous devez accepter les conditions d\'utilisation'
      })
    })
  },

  login: {
    body: Joi.object({
      email: ValidationSchemas.email,
      password: Joi.string().required().messages({
        'any.required': 'Mot de passe requis'
      })
    })
  },

  // Lettres de motivation
  createLetter: {
    body: Joi.object({
      title: ValidationSchemas.letterTitle,
      content: ValidationSchemas.letterContent,
      company: ValidationSchemas.companyName,
      jobTitle: ValidationSchemas.jobTitle,
      status: ValidationSchemas.status,
      language: ValidationSchemas.language,
      templateId: Joi.string().optional(),
      recipient: Joi.object({
        name: Joi.string().max(100).optional(),
        email: Joi.string().email().optional()
      }).optional()
    })
  },

  updateLetter: {
    params: Joi.object({
      id: ValidationSchemas.firebaseId.required()
    }),
    body: Joi.object({
      title: ValidationSchemas.letterTitle.optional(),
      content: ValidationSchemas.letterContent.optional(),
      company: ValidationSchemas.companyName.optional(),
      jobTitle: ValidationSchemas.jobTitle.optional(),
      status: ValidationSchemas.status.optional(),
      recipient: Joi.object({
        name: Joi.string().max(100).optional(),
        email: Joi.string().email().optional()
      }).optional()
    }).min(1)
  },

  // Génération IA
  generateAI: {
    body: Joi.object({
      jobTitle: ValidationSchemas.jobTitle,
      company: ValidationSchemas.companyName,
      jobDescription: Joi.string().max(5000).optional(),
      userProfile: Joi.object({
        name: Joi.string().max(100).optional(),
        experience: Joi.string().max(1000).optional(),
        skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
        education: Joi.string().max(500).optional(),
        achievements: Joi.array().items(Joi.string().max(200)).max(10).optional()
      }).optional(),
      customPrompt: Joi.string().max(1000).optional(),
      model: ValidationSchemas.aiModel,
      tone: ValidationSchemas.aiTone,
      language: ValidationSchemas.language,
      saveAsLetter: Joi.boolean().default(false)
    })
  },

  // Pagination générique
  pagination: {
    query: Joi.object({
      page: ValidationSchemas.page,
      limit: ValidationSchemas.limit,
      search: Joi.string().max(100).optional(),
      sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'company').default('updatedAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
      status: Joi.string().valid('draft', 'final', 'all').default('all')
    })
  }
};

/**
 * Créer un middleware de validation personnalisé
 */
export const createValidationMiddleware = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationErrors: any[] = [];

      // Valider le body
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          validationErrors.push({
            location: 'body',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        } else {
          req.body = value;
        }
      }

      // Valider les query parameters
      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          validationErrors.push({
            location: 'query',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        } else {
          req.query = value;
        }
      }

      // Valider les paramètres d'URL
      if (schemas.params) {
        const { error, value } = schemas.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          validationErrors.push({
            location: 'params',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          });
        } else {
          req.params = value;
        }
      }

      // S'il y a des erreurs de validation
      if (validationErrors.length > 0) {
        logger.warn('Erreurs de validation:', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return ResponseUtil.validationError(res, 'Données invalides', {
          validationErrors
        });
      }

      next();
      return;

    } catch (error) {
      logger.error('Erreur dans la validation:', error);
      return ResponseUtil.serverError(res, 'Erreur de validation');
    }
  };
};

/**
 * Middleware de validation générique (vérifie les types de base)
 */
export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Validation basique du Content-Type pour les requêtes POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    // Accepter les requêtes sans Content-Type (peuvent être vides)
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return ResponseUtil.validationError(res, 'Content-Type non supporté. Utilisez application/json');
    }
  }

  // Validation de base des headers
  const userAgent = req.get('User-Agent');
  if (!userAgent) {
    logger.warn('Requête sans User-Agent', {
      ip: req.ip,
      path: req.path
    });
  }

  next();
  return
};

// Export des middlewares de validation spécifiques
export const validateRegister = createValidationMiddleware(EndpointSchemas.register);
export const validateLogin = createValidationMiddleware(EndpointSchemas.login);
export const validateCreateLetter = createValidationMiddleware(EndpointSchemas.createLetter);
export const validateUpdateLetter = createValidationMiddleware(EndpointSchemas.updateLetter);
export const validateGenerateAI = createValidationMiddleware(EndpointSchemas.generateAI);
export const validatePagination = createValidationMiddleware(EndpointSchemas.pagination);