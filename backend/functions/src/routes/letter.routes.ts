// src/routes/letter.routes.ts
import { Router } from 'express';
import { LetterController } from '../controllers/letter.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes lettres nécessitent une authentification
router.use(AuthMiddleware.validateFirebaseToken);

// Routes principales des lettres
router.get('/stats', LetterController.getLetterStats);           // Statistiques (avant /:id)
router.get('/', LetterController.getUserLetters);               // Liste des lettres
router.post('/', LetterController.createLetter);                // Créer une lettre
router.post('/generate', LetterController.generateLetterWithAI); // Générer avec IA
router.get('/:id', LetterController.getLetterById);             // Récupérer une lettre
router.put('/:id', LetterController.updateLetter);              // Mettre à jour une lettre
router.delete('/:id', LetterController.deleteLetter);           // Supprimer une lettre

// Actions spéciales sur les lettres
router.post('/:id/duplicate', LetterController.duplicateLetter); // Dupliquer une lettre
router.post('/:id/finalize', LetterController.finalizeLetter);   // Finaliser une lettre
router.get('/:id/export', LetterController.exportLetter);        // Exporter une lettre

export default router;