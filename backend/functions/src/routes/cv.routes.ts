import { Router } from "express";
import { AuthMiddleware } from "../middleware/auth.middleware";
import { subscriptionMiddleware, validateCV } from "../middleware/subscription.middleware";
import { strictRateLimitMiddleware } from "../middleware/rateLimit.middleware";
import { CVController } from "../controllers/cv.controller";


const router = Router();

// Routes publiques (pas d'auth nécessaire)


// Routes protégées (authentification requise)
router.use(AuthMiddleware.validateFirebaseToken);

router.get('/templates', CVController.getCVTemplates); // Templates CV publics
// CRUD CV de base
router.post('', CVController.createCV);
router.get('', CVController.getUserCVs);
router.get('/:id', CVController.getCVById);
router.put('/:id', validateCV, CVController.updateCV);
router.delete('/:id', CVController.deleteCV);
router.post('/:id/duplicate', CVController.duplicateCV);

// Fonctionnalités IA pour CV (limitations selon abonnement)
router.post('/:id/analyze', 
  subscriptionMiddleware(['basic', 'pro', 'premium']),
  strictRateLimitMiddleware(5, 60000), // 5 analyses par minute
  CVController.analyzeCV
);

router.post('/:id/job-matching',
  subscriptionMiddleware(['pro', 'premium']),
  strictRateLimitMiddleware(3, 60000), // 3 matching par minute
  CVController.analyzeJobMatching
);

router.post('/:id/optimize',
  subscriptionMiddleware(['pro', 'premium']),
  strictRateLimitMiddleware(3, 60000),
  CVController.optimizeCV
);

router.post('/:id/adapt-region',
  subscriptionMiddleware(['premium']),
  strictRateLimitMiddleware(2, 60000),
  CVController.adaptCVForRegion
);

// Export de CV
router.get('/:id/export',
  subscriptionMiddleware(['basic', 'pro', 'premium']),
  CVController.exportCV
);

router.post('/upload-analyze',
  subscriptionMiddleware(['pro', 'premium']),
  strictRateLimitMiddleware(3, 300000), // 3 uploads par 5 minutes
  async (req, res) => {
    try {
      // Cette route permettrait d'uploader un CV PDF/DOC et l'analyser
      // Nécessiterait un service de parsing de documents
      res.json({
        success: true,
        message: 'Fonctionnalité d\'upload en développement'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload'
      });
    }
  }
);

// Route pour analyser une URL d'offre d'emploi
router.post('/jobs/analyze-url',
  subscriptionMiddleware(['pro', 'premium']),
  strictRateLimitMiddleware(5, 60000),
  CVController.analyzeJobMatching
);


export default router;