// middleware/rateLimit.middleware.ts - Middleware de limitation de taux
import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { logger } from 'firebase-functions/v2';

// Interface pour stocker les tentatives par IP/utilisateur
interface RateLimitInfo {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Cache en mémoire pour les tentatives (en production, utiliser Redis)
const rateLimitCache = new Map<string, RateLimitInfo>();

// Configuration des limites par endpoint
const RATE_LIMITS = {
  default: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes pour login/register
  },
  ai: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 heure pour l'IA
  },
  payments: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 heure pour les paiements
  }
};

/**
 * Nettoie les entrées expirées du cache
 */
const cleanExpiredEntries = () => {
  const now = Date.now();
  for (const [key, info] of rateLimitCache.entries()) {
    if (now > info.resetTime) {
      rateLimitCache.delete(key);
    }
  }
};

/**
 * Détermine la configuration de rate limit selon l'endpoint
 */
const getRateLimitConfig = (path: string) => {
  if (path.includes('/auth/')) return RATE_LIMITS.auth;
  if (path.includes('/ai/')) return RATE_LIMITS.ai;
  if (path.includes('/payments/')) return RATE_LIMITS.payments;
  return RATE_LIMITS.default;
};

/**
 * Génère une clé unique pour identifier le client
 */
const generateKey = (req: Request): string => {
  // Utiliser l'ID utilisateur si authentifié, sinon l'IP
  const userId = (req as any).user?.uid;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const path = req.path;
  
  return userId ? `user:${userId}:${path}` : `ip:${ip}:${path}`;
};

/**
 * Middleware principal de rate limiting
 */
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Nettoyer le cache périodiquement
    if (Math.random() < 0.01) { // 1% de chance à chaque requête
      cleanExpiredEntries();
    }

    const key = generateKey(req);
    const config = getRateLimitConfig(req.path);
    const now = Date.now();

    let info = rateLimitCache.get(key);

    if (!info) {
      // Première requête pour cette clé
      info = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      rateLimitCache.set(key, info);
    } else if (now > info.resetTime) {
      // Fenêtre expirée, réinitialiser
      info = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      rateLimitCache.set(key, info);
    } else {
      // Incrémenter le compteur
      info.count++;
      rateLimitCache.set(key, info);
    }

    // Vérifier si la limite est dépassée
    if (info.count > config.maxRequests) {
      const resetIn = Math.ceil((info.resetTime - now) / 1000);
      
      logger.warn('Rate limit dépassé', {
        key,
        path: req.path,
        count: info.count,
        limit: config.maxRequests,
        resetIn,
        ip: req.ip
      });

      // Ajouter les headers de rate limiting
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(info.resetTime / 1000).toString(),
        'Retry-After': resetIn.toString()
      });

      return ResponseUtil.tooManyRequests(
        res, 
        `Trop de requêtes. Limite: ${config.maxRequests} par ${config.windowMs / 60000} minutes. Réessayez dans ${resetIn} secondes.`,
        {
          limit: config.maxRequests,
          windowMs: config.windowMs,
          resetIn,
          retryAfter: resetIn
        }
      );
    }

    // Ajouter les headers informatifs
    const remaining = Math.max(0, config.maxRequests - info.count);
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(info.resetTime / 1000).toString()
    });

    next();
    return;
  } catch (error: any) {
    logger.error('Erreur dans le rate limiting:', error);
    // En cas d'erreur, laisser passer la requête
    next();
    return ResponseUtil.serverError(
      res, 
      'Erreur interne du serveur lors du rate limiting',
      { error: error.message }
    );
  }
};

/**
 * Middleware de rate limiting strict pour les endpoints sensibles
 */
export const strictRateLimitMiddleware = (maxRequests: number = 3, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `strict:${generateKey(req)}`;
    const now = Date.now();

    let info = rateLimitCache.get(key);

    if (!info) {
      info = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      rateLimitCache.set(key, info);
    } else if (now > info.resetTime) {
      info = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      rateLimitCache.set(key, info);
    } else {
      info.count++;
      rateLimitCache.set(key, info);
    }

    if (info.count > maxRequests) {
      const resetIn = Math.ceil((info.resetTime - now) / 1000);
      
      logger.warn('Rate limit strict dépassé', {
        key,
        path: req.path,
        count: info.count,
        limit: maxRequests,
        resetIn
      });

      return ResponseUtil.tooManyRequests(
        res,
        `Trop de tentatives. Limite stricte: ${maxRequests} par ${windowMs / 1000} secondes.`,
        { resetIn, retryAfter: resetIn }
      );
    }

    next();
    return;
  };
};

/**
 * Middleware spécifique pour les tentatives de connexion
 */
export const loginRateLimitMiddleware = strictRateLimitMiddleware(5, 15 * 60 * 1000); // 5 tentatives par 15 min

/**
 * Middleware pour les requêtes d'IA
 */
export const aiRateLimitMiddleware = strictRateLimitMiddleware(10, 60 * 60 * 1000); // 10 requêtes par heure