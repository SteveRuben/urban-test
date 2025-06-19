// middleware/errorHandler.middleware.ts - Middleware centralisé de gestion d'erreurs
import { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions/v2';
import { ResponseUtil } from '../utils/response.util';
import { 
  AppError, 
  ErrorHandler, 
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  QuotaExceededError,
  PaymentError,
  AIError,
  ExternalServiceError,
  DatabaseError,
  FileError
} from '../utils/errors.util';
import { CONFIG } from '../config/firebase';

/**
 * Middleware principal de gestion d'erreurs
 * DOIT être le dernier middleware dans la chaîne
 */
export const errorHandlerMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Éviter les réponses multiples
  if (res.headersSent) {
    return next(error);
  }

  // Log de l'erreur avec contexte
  ErrorHandler.logError(error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.uid,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query
  });

  const isDevelopment = CONFIG.ENVIRONMENT === 'development';

  // Gestion spécifique par type d'erreur
  if (error instanceof ValidationError) {
    return ResponseUtil.validationError(
      res, 
      error.message, 
      isDevelopment ? { stack: error.stack, details: error.details } : error.details
    );
  }

  if (error instanceof AuthenticationError) {
    return ResponseUtil.unauthorized(
      res, 
      error.message,
      isDevelopment ? { stack: error.stack } : undefined
    );
  }

  if (error instanceof AuthorizationError) {
    return ResponseUtil.forbidden(
      res, 
      error.message,
      isDevelopment ? { stack: error.stack } : undefined
    );
  }

  if (error instanceof NotFoundError) {
    return ResponseUtil.notFound(
      res, 
      error.message,
      isDevelopment ? { stack: error.stack } : undefined
    );
  }

  if (error instanceof ConflictError) {
    return ResponseUtil.conflict(
      res, 
      error.message,
      isDevelopment ? { stack: error.stack } : undefined
    );
  }

  if (error instanceof RateLimitError || error instanceof QuotaExceededError) {
    return ResponseUtil.tooManyRequests(
      res, 
      error.message,
      isDevelopment ? { stack: error.stack, details: error.details } : error.details
    );
  }

  if (error instanceof PaymentError) {
    return ResponseUtil.error(
      res, 
      error.message, 
      402, // Payment Required
      isDevelopment ? { 
        stack: error.stack, 
        provider: error.paymentProvider,
        transactionId: error.transactionId 
      } : {
        provider: error.paymentProvider
      }
    );
  }

  if (error instanceof AIError) {
    return ResponseUtil.serviceUnavailable(
      res, 
      error.message,
      isDevelopment ? { 
        stack: error.stack, 
        model: error.model,
        requestId: error.requestId 
      } : {
        service: 'IA'
      }
    );
  }

  if (error instanceof ExternalServiceError) {
    return ResponseUtil.error(
      res, 
      error.message, 
      502, // Bad Gateway
      isDevelopment ? { 
        stack: error.stack, 
        service: error.service 
      } : {
        service: error.service
      }
    );
  }

  if (error instanceof DatabaseError) {
    return ResponseUtil.serverError(
      res, 
      isDevelopment ? error.message : 'Erreur de base de données',
      isDevelopment ? { 
        stack: error.stack, 
        operation: error.operation 
      } : undefined
    );
  }

  if (error instanceof FileError) {
    return ResponseUtil.validationError(
      res, 
      error.message,
      isDevelopment ? { 
        stack: error.stack, 
        filename: error.filename,
        fileType: error.fileType 
      } : {
        filename: error.filename
      }
    );
  }

  // Gestion des erreurs AppError génériques
  if (error instanceof AppError) {
    return ResponseUtil.error(
      res, 
      error.message, 
      error.statusCode,
      isDevelopment ? { 
        stack: error.stack, 
        details: error.details 
      } : error.details
    );
  }

  // Gestion des erreurs Node.js natives
  if (error.name === 'CastError') {
    return ResponseUtil.validationError(res, 'ID invalide');
  }

  if (error.name === 'ValidationError') {
    return ResponseUtil.validationError(res, 'Données invalides');
  }

  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    return ResponseUtil.serverError(
      res, 
      isDevelopment ? error.message : 'Erreur de base de données'
    );
  }

  // Gestion des erreurs JSON
  if (error.name === 'SyntaxError' && 'body' in error) {
    return ResponseUtil.validationError(res, 'JSON invalide');
  }

  // Gestion des erreurs de timeout
  if (error.message.includes('timeout') || error.name === 'TimeoutError') {
    return ResponseUtil.error(res, 'Délai d\'attente dépassé', 408);
  }

  // Gestion des erreurs de connexion
  if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND') {
    return ResponseUtil.serviceUnavailable(res, 'Service externe indisponible');
  }

  // Erreur générique non gérée
  logger.error('Erreur non gérée capturée par le middleware:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  return ResponseUtil.serverError(
    res, 
    isDevelopment ? error.message : 'Erreur interne du serveur',
    isDevelopment ? { 
      name: error.name,
      stack: error.stack 
    } : undefined
  );
};

/**
 * Middleware pour capturer les erreurs async non capturées
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de gestion des erreurs 404
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} non trouvée`);
  next(error);
};

/**
 * Gestionnaire d'erreurs pour les promesses non capturées
 */
export const setupGlobalErrorHandlers = () => {
  // Promesses rejetées non capturées
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Promesse rejetée non gérée:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });

    // En production, on pourrait décider de fermer l'application
    if (CONFIG.ENVIRONMENT === 'production') {
      logger.error('Fermeture de l\'application due à une promesse rejetée non gérée');
      process.exit(1);
    }
  });

  // Exceptions non capturées
  process.on('uncaughtException', (error: Error) => {
    logger.error('Exception non capturée:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Toujours fermer l'application pour les exceptions non capturées
    logger.error('Fermeture de l\'application due à une exception non capturée');
    process.exit(1);
  });

  // Gestionnaire de signaux de fermeture gracieuse
  const gracefulShutdown = (signal: string) => {
    logger.info(`Signal reçu: ${signal}. Fermeture gracieuse...`);
    
    // Ici, on pourrait fermer les connexions DB, nettoyer les ressources, etc.
    setTimeout(() => {
      logger.info('Fermeture forcée après timeout');
      process.exit(1);
    }, 10000); // 10 secondes de timeout

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

/**
 * Middleware de logging des erreurs pour monitoring
 */
export const errorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Structurer les logs pour les outils de monitoring (Stackdriver, etc.)
  const errorLog = {
    timestamp: new Date().toISOString(),
    severity: error instanceof AppError && error.statusCode < 500 ? 'WARNING' : 'ERROR',
    message: error.message,
    error: {
      name: error.name,
      stack: error.stack,
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        isOperational: error.isOperational
      })
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.uid
    },
    context: {
      environment: CONFIG.ENVIRONMENT,
      region: CONFIG.REGION
    }
  };

  // Log structuré pour Cloud Logging
  if (CONFIG.ENVIRONMENT === 'production') {
    console.error(JSON.stringify(errorLog));
  } else {
    logger.error('Error Details:', errorLog);
  }

  next(error);
};