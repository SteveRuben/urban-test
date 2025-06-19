// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes utilisateur nécessitent une authentification
router.use(AuthMiddleware.validateFirebaseToken);

// Routes pour le profil de l'utilisateur connecté
router.get('/profile', UserController.getCurrentUser);
router.put('/profile', UserController.updateCurrentUser);
router.delete('/profile', UserController.deleteCurrentUser);
router.get('/profile/stats', UserController.getUserStats);
router.post('/profile/login', UserController.updateLastLogin);

// Routes pour les utilisateurs spécifiques
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

// Route pour créer un utilisateur (après authentification Firebase)
router.post('/', UserController.createUser);

export default router;
