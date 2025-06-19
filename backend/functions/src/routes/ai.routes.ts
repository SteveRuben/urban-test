// src/routes/ai.routes.ts
import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Routes publiques (sans authentification)
router.get('/models', AIController.getAvailableModels);           // Modèles disponibles
router.get('/prompt-suggestions', AIController.getPromptSuggestions); // Suggestions de prompts
router.get('/writing-tips', AIController.getWritingTips);         // Conseils d'écriture

// Toutes les autres routes nécessitent une authentification
router.use(AuthMiddleware.validateFirebaseToken);

// Routes principales de génération IA
router.post('/generate-letter', AIController.generateCoverLetter); // Générer une lettre
router.post('/improve-letter/:letterId', AIController.improveLetter); // Améliorer une lettre
router.post('/analyze-letter/:letterId', AIController.analyzeLetter); // Analyser une lettre

// Routes de gestion et statistiques
router.get('/stats', AIController.getAIStats);                    // Statistiques utilisateur
router.get('/history', AIController.getAIHistory);               // Historique des générations

// Routes de feedback
router.post('/feedback/:responseId', AIController.submitFeedback); // Donner un feedback

export default router;