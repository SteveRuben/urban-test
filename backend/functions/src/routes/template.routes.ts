// src/routes/template.routes.ts
import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Routes publiques (sans authentification)
/**
 * @route GET /templates/popular
 * @desc Récupérer les templates populaires
 * @access Public
 */
router.get('/popular', TemplateController.getPopularTemplates);

/**
 * @route GET /templates/category/:type
 * @desc Récupérer les templates par catégorie
 * @access Public
 */
router.get('/category/:type', TemplateController.getTemplatesByCategory);

/**
 * @route GET /templates/variables
 * @desc Récupérer les variables disponibles pour les templates
 * @access Public
 */
router.get('/variables', TemplateController.getTemplateVariables);

/**
 * @route POST /templates/preview
 * @desc Prévisualiser un template avec des variables
 * @access Public
 */
router.post('/preview', TemplateController.previewTemplate);

// Routes protégées (authentification requise)
router.use(AuthMiddleware.validateFirebaseToken);

/**
 * @route GET /templates
 * @desc Récupérer tous les templates disponibles avec filtres
 * @access Private
 * @query type - Type de template (job, scholarship, internship, custom)
 * @query isPremium - Filtrer par templates premium (true/false)
 * @query tags - Tags séparés par des virgules
 * @query search - Terme de recherche
 * @query limit - Nombre de résultats par page (max 100)
 * @query offset - Décalage pour la pagination
 */
router.get('/', TemplateController.getTemplates);

/**
 * @route GET /templates/:id
 * @desc Récupérer un template spécifique
 * @access Private
 */
router.get('/:id', TemplateController.getTemplate);

/**
 * @route POST /templates
 * @desc Créer un nouveau template personnalisé
 * @access Private
 * @body title - Titre du template (requis)
 * @body template - Contenu du template (requis)
 * @body type - Type de template (requis)
 * @body tags - Tags du template (optionnel)
 * @body isPublic - Rendre le template public (optionnel, défaut: false)
 */
router.post('/', TemplateController.createTemplate);

/**
 * @route PUT /templates/:id
 * @desc Mettre à jour un template
 * @access Private (propriétaire uniquement)
 */
router.put('/:id', TemplateController.updateTemplate);

/**
 * @route DELETE /templates/:id
 * @desc Supprimer un template
 * @access Private (propriétaire uniquement)
 */
router.delete('/:id', TemplateController.deleteTemplate);

/**
 * @route POST /templates/:id/use
 * @desc Utiliser un template avec traitement des variables
 * @access Private
 * @body Variables à remplacer dans le template
 */
router.post('/:id/use', TemplateController.useTemplate);

/**
 * @route POST /templates/:id/rate
 * @desc Noter un template
 * @access Private
 * @body rating - Note de 1 à 5 (requis)
 */
router.post('/:id/rate', TemplateController.rateTemplate);

/**
 * @route POST /templates/:id/duplicate
 * @desc Dupliquer un template
 * @access Private
 * @body title - Titre du template dupliqué (optionnel)
 */
router.post('/:id/duplicate', TemplateController.duplicateTemplate);


/**
 * 
 * // Templates publics
router.get('/templates', templateController.getTemplates);
router.get('/templates/:id', templateController.getTemplate);
router.get('/templates/recommendations', templateController.getRecommendations);

// Gestion des instances de templates (authentification requise)
router.post('/templates/instances', 
  validateTemplateInstance,
  templateController.createTemplateInstance
);

router.get('/templates/instances', templateController.getUserInstances);
router.get('/templates/instances/:instanceId', templateController.getInstanceById);
router.put('/templates/instances/:instanceId', templateController.updateInstance);
router.delete('/templates/instances/:instanceId', templateController.deleteInstance);

// Génération IA pour templates (limitations selon abonnement)
router.post('/templates/instances/:instanceId/generate',
  subscriptionMiddleware(['basic', 'pro', 'premium']),
  rateLimitMiddleware(10, 60000), // 10 générations par minute
  templateController.generateContent
);

router.post('/templates/instances/:instanceId/improve',
  subscriptionMiddleware(['pro', 'premium']),
  rateLimitMiddleware(5, 60000),
  templateController.improveLetter
);
 */
export default router;