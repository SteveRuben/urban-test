/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/**
 * Firebase Functions pour Motivation Letter AI
 * API complète avec toutes les fonctionnalités
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import express from 'express';
import helmet from 'helmet';
import { CONFIG, ERROR_MESSAGES } from './config/firebase';

// Importation des middlewares

import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { validationMiddleware } from './middleware/validation.middleware';

// Importation des routes
//import authRoutes from './routes/auth.routes';
//import analyticsRoutes from './routes/analytics.routes';

// Importation des utilitaires
import { ResponseUtil } from './utils/response.util';
import { AppError } from './utils/errors.util';
import { AuthMiddleware } from './middleware/auth.middleware';
import routes from './routes';
import { corsMiddleware } from './middleware/cors.middleware';

// Configuration globale pour toutes les functions
setGlobalOptions({
  region: CONFIG.REGION,
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: '1GiB'
});

// Initialisation Express
const app = express();

// Trust proxy pour Cloud Run
app.set('trust proxy', true);

// Middleware de sécurité Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuration CORS
app.use(corsMiddleware);

// Middleware de logging des requêtes
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
});

// Rate limiting global
app.use(rateLimitMiddleware);

// Health checks (AVANT le parsing JSON pour éviter les problèmes)


app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Motivation Letter AI API',
    version: '1.0.0',
    status: 'running',
    docs: {
      health: '/health',
      api: '/api/v1',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        letters: '/api/v1/letters',
        templates: '/api/v1/templates',
        subscriptions: '/api/v1/subscriptions',
        payments: '/api/v1/payments',
        ai: '/api/v1/ai',
        analytics: '/api/v1/analytics'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check API
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'API healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      auth: 'active',
      ai: 'available',
      payments: 'configured',
      storage: 'ready'
    },
    limits: {
      maxRequestsPerMinute: 60,
      maxFileSize: '10MB',
      supportedLanguages: CONFIG.SUPPORTED_LANGUAGES
    }
  });
});

// Middleware pour le parsing JSON (avec gestion des webhooks Stripe)
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ 
  limit: CONFIG.MAX_UPLOAD_SIZE,
  verify: (req: express.Request, res, buf, encoding) => {
    // Stocker le raw body pour les webhooks Stripe
    if (req.originalUrl.includes('/payments/webhook')) {
      (req as any).rawBody = buf;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: CONFIG.MAX_UPLOAD_SIZE 
}));

// Middleware de validation globale
app.use(validationMiddleware);

// Routes API principales
app.use('/v1', routes);
// Route de test simple avec paramètre
app.get('/v1/test/:id', (req, res) => {
  res.json({
    message: 'Test route with parameter',
    id: req.params.id
  });
});
//app.use('/api/v1/auth', authRoutes);
/* app.use('/api/v1/users', AuthMiddleware.validateFirebaseToken, userRoutes);
app.use('/api/v1/letters', AuthMiddleware.validateFirebaseToken, letterRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/subscriptions', AuthMiddleware.validateFirebaseToken, subscriptionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/ai', AuthMiddleware.validateFirebaseToken, aiRoutes); */
//app.use('/api/v1/analytics', authMiddleware, analyticsRoutes);

// Route de test pour vérifier l'authentification
app.get('/api/v1/test/auth', AuthMiddleware.validateFirebaseToken, (req, res) => {
  res.json({
    message: 'Authentification réussie',
    user: (req as any).user,
    timestamp: new Date().toISOString()
  });
});

// Routes de monitoring et métriques (pour les administrateurs)
app.get('/api/v1/metrics', AuthMiddleware.validateFirebaseToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      ResponseUtil.forbidden(res, 'Accès administrateur requis');
      return;
    }
    
    // Collecter les métriques de base
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform
      },
      api: {
        region: CONFIG.REGION,
        environment: CONFIG.ENVIRONMENT
      }
    };
    
    res.json(metrics);
    return;
  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques:', error);
    return ResponseUtil.serverError(res, 'Erreur lors de la récupération des métriques');
  }
});

// Route de diagnostic pour les développeurs
app.get('/api/v1/debug', (req, res) => {
  if (CONFIG.ENVIRONMENT === 'production') {
    return ResponseUtil.forbidden(res, 'Debug non disponible en production');
  }
  
  return res.json({
    timestamp: new Date().toISOString(),
    environment: process.env,
    config: {
      region: CONFIG.REGION,
      corsOrigins: CONFIG.CORS_ORIGINS,
      supportedLanguages: CONFIG.SUPPORTED_LANGUAGES
    },
    request: {
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      ip: req.ip
    }
  });
});

// Gestion des erreurs 404 pour les routes API
app.use('/api/*', (req, res) => {
  ResponseUtil.notFound(res, `Endpoint API non trouvé: ${req.method} ${req.originalUrl}`, {
    availableEndpoints: [
      'GET /api/v1/health',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/register',
      'GET /api/v1/letters',
      'POST /api/v1/letters',
      'GET /api/v1/templates',
      'POST /api/v1/ai/generate'
    ]
  });
});

// Gestion des erreurs 404 pour toutes les autres routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: `La route ${req.method} ${req.originalUrl} n'existe pas`,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Vérifiez l\'URL ou consultez la documentation API à la racine /'
  });
});

// Middleware de gestion d'erreurs globales (DOIT être en dernier)
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log détaillé de l'erreur
  logger.error('Erreur non gérée dans l\'API:', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    request: {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      headers: req.headers,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    timestamp: new Date().toISOString()
  });

  // Ne pas exposer les détails en production
  const isDevelopment = CONFIG.ENVIRONMENT === 'development';

  // Erreur personnalisée de l'application
  if (error instanceof AppError) {
    return ResponseUtil.error(res, error.message, error.statusCode, 
      isDevelopment ? { stack: error.stack } : undefined);
  }
  
  // Erreurs de parsing JSON
  if (error.type === 'entity.parse.failed') {
    return ResponseUtil.validationError(res, 'Format JSON invalide', 
      isDevelopment ? { details: error.message } : undefined);
  }
  
  // Erreurs de payload trop volumineux
  if (error.type === 'entity.too.large') {
    return ResponseUtil.validationError(res, `Payload trop volumineux (max: ${CONFIG.MAX_UPLOAD_SIZE})`,
      isDevelopment ? { limit: CONFIG.MAX_UPLOAD_SIZE } : undefined);
  }

  // Erreurs Firebase spécifiques
  if (error.code) {
    switch (error.code) {
      case 'auth/id-token-expired':
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
      case 'auth/id-token-revoked':
        return ResponseUtil.unauthorized(res, 'Token révoqué');
      case 'auth/invalid-id-token':
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
      case 'permission-denied':
        return ResponseUtil.forbidden(res, ERROR_MESSAGES.FORBIDDEN);
      case 'not-found':
        return ResponseUtil.notFound(res, ERROR_MESSAGES.NOT_FOUND);
      case 'already-exists':
        return ResponseUtil.conflict(res, ERROR_MESSAGES.ALREADY_EXISTS);
      case 'resource-exhausted':
        return ResponseUtil.tooManyRequests(res, ERROR_MESSAGES.QUOTA_EXCEEDED);
    }
  }

  // Erreurs CORS
  if (error.message.includes('CORS')) {
    return ResponseUtil.forbidden(res, 'Origine non autorisée par CORS');
  }

  // Erreurs de timeout
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return ResponseUtil.error(res, ERROR_MESSAGES.TIMEOUT, 408);
  }

  // Erreur générique
  return ResponseUtil.serverError(res, 
    isDevelopment ? error.message : ERROR_MESSAGES.SERVER_ERROR,
    isDevelopment ? { 
      stack: error.stack,
      name: error.name,
      code: error.code 
    } : undefined
  );
});

// Gestion des promesses rejetées non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée:', {
    reason,
    promise,
    timestamp: new Date().toISOString()
  });
});

// Gestion des exceptions non capturées
process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});

// Export de la fonction Firebase (Gen 2) avec configuration optimisée
export const api = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  maxInstances: 10,
  minInstances: CONFIG.ENVIRONMENT === 'production' ? 1 : 0,
  concurrency: 80,
  cors: true,
  invoker: 'public'
}, app);

// Export pour les tests locaux
export { app };

// Log de démarrage
/*logger.info('🚀 Motivation Letter AI API démarrée', {
  environment: CONFIG.ENVIRONMENT,
  region: CONFIG.REGION,
  version: '1.0.0',
  timestamp: new Date().toISOString()
});*/