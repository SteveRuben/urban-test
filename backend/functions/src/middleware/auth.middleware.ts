// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { auth, ERROR_MESSAGES } from '../config/firebase';
import { ResponseUtil } from '../utils/response.util';
import { logger } from 'firebase-functions';

// Étendre l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        emailVerified?: boolean;
        role?: string;
        subscription?: {
          plan: string;
          status: string;
          expiresAt?: Date;
        };
      };
    }
  }
}

export class AuthMiddleware {
  /**
   * Vérifie le token Firebase et ajoute l'utilisateur à la requête
   */
  static async validateFirebaseToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Vérifier le format du token (Bearer token)
      if (!authHeader.startsWith('Bearer ')) {
        return ResponseUtil.unauthorized(res, 'Format de token invalide. Utilisez "Bearer <token>"');
      }

      const token = authHeader.split('Bearer ')[1];
      
      if (!token) {
       // ResponseUtil.unauthorized(res, 'Token d\'authentification invalide');
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Vérifier le token avec Firebase Auth
      const decodedToken = await auth.verifyIdToken(token);
      if (!decodedToken) {
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
      }
      // Ajouter l'utilisateur à la requête
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        role: decodedToken.role || 'user'
      };

       // Log de l'authentification réussie
      logger.debug('Authentification réussie', {
        uid: req.user.uid,
        email: req.user.email,
        path: req.path,
        method: req.method
      });
      
      return next();
    } catch (error: any) {
      logger.error('Erreur d\'authentification:', {
        error: error.message,
        code: error.code,
        path: req.path,
        method: req.method
      });
  
      // Gestion des erreurs spécifiques Firebase Auth
      switch (error.code) {
        case 'auth/id-token-expired':
          return ResponseUtil.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
        case 'auth/id-token-revoked':
          return ResponseUtil.unauthorized(res, 'Token révoqué');
        case 'auth/invalid-id-token':
          return ResponseUtil.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
        case 'auth/user-disabled':
          return ResponseUtil.forbidden(res, 'Compte utilisateur désactivé');
        case 'auth/user-not-found':
          return ResponseUtil.unauthorized(res, 'Utilisateur non trouvé');
        default:
          return ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      }
    }
  }

  /**
   * Vérifie que l'email est vérifié
   */
  static requireEmailVerification(req: Request, res: Response, next: NextFunction): void {
    if (!req.user?.emailVerified) {
      ResponseUtil.forbidden(res, 'Email non vérifié');
      return;
    }
    next();
  }

  /**
   * Middleware pour vérifier l'accès à une ressource utilisateur
   */
  static checkResourceOwnership(userIdParam: string = 'userId') {
    return (req: Request, res: Response, next: NextFunction): void => {
      const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
      
      if (!resourceUserId) {
        ResponseUtil.validationError(res, 'ID utilisateur manquant');
        return;
      }

      if (req.user?.uid !== resourceUserId) {
        ResponseUtil.forbidden(res, 'Accès non autorisé à cette ressource');
        return;
      }

      next();
    };
  }

  /**
   * Middleware optionnel - n'échoue pas si pas de token
   */
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        
        if (token) {
          const decodedToken = await auth.verifyIdToken(token);
          req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            name: decodedToken.name,
            role: decodedToken.role || 'user'
          };
        }
      }
    } catch (error) {
      // Ignorer les erreurs pour l'auth optionnelle
      console.log('Auth optionnelle échouée, continuation sans utilisateur');
    }
    
    next();
  }
}

