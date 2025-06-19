// utils/errors.util.ts - Classes d'erreurs personnalisées avec support PayPal
import { logger } from 'firebase-functions/v2';

/**
 * Classe d'erreur de base de l'application
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: any;
  public readonly errorCode?: string;

  constructor(
    message: string, 
    statusCode: number = 500, 
    isOperational: boolean = true,
    details?: any,
    errorCode?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.details = details;
    this.errorCode = errorCode;

    // Maintenir la stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreur de validation
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Erreur de validation', details?: any) {
    super(message, 400, true, details, 'VALIDATION_ERROR');
  }
}

/**
 * Erreur d'authentification
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentification requise', details?: any) {
    super(message, 401, true, details, 'AUTH_ERROR');
  }
}

/**
 * Erreur d'autorisation (alias pour compatibilité)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Accès non autorisé', details?: any) {
    super(message, 403, true, details, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Erreur d'accès interdit (plus claire que AuthorizationError)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Accès interdit', details?: any) {
    super(message, 403, true, details, 'FORBIDDEN_ERROR');
  }
}

/**
 * Erreur de ressource non trouvée
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée', details?: any) {
    super(message, 404, true, details, 'NOT_FOUND_ERROR');
  }
}

/**
 * Erreur de conflit
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflit de ressource', details?: any) {
    super(message, 409, true, details, 'CONFLICT_ERROR');
  }
}

/**
 * Erreur de limite de taux
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Trop de requêtes', details?: any) {
    super(message, 429, true, details, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Erreur de service externe
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string = 'Erreur de service externe', details?: any) {
    super(`[${service}] ${message}`, 502, true, details, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * Erreur de base de données
 */
export class DatabaseError extends AppError {
  public readonly operation: string;

  constructor(operation: string, message: string = 'Erreur de base de données', details?: any) {
    super(`Database ${operation}: ${message}`, 500, true, details, 'DATABASE_ERROR');
    this.operation = operation;
  }
}

/**
 * Erreur de paiement (support Stripe ET PayPal)
 */
export class PaymentError extends AppError {
  public readonly paymentProvider: string;
  public readonly transactionId?: string;
  public readonly paymentType?: 'one-time' | 'subscription';

  constructor(
    paymentProvider: string, 
    message: string = 'Erreur de paiement',
    transactionId?: string,
    details?: any,
    paymentType?: 'one-time' | 'subscription'
  ) {
    super(`[${paymentProvider}] ${message}`, 402, true, details, 'PAYMENT_ERROR');
    this.paymentProvider = paymentProvider;
    this.transactionId = transactionId;
    this.paymentType = paymentType;
  }
}

/**
 * Erreurs spécifiques PayPal
 */
export class PayPalError extends PaymentError {
  public readonly paypalErrorCode?: string;
  public readonly debugId?: string;

  constructor(
    message: string,
    paypalErrorCode?: string,
    debugId?: string,
    transactionId?: string,
    details?: any
  ) {
    super('PayPal', 'PAYPAL_ERROR' + message, transactionId, details);
    this.paypalErrorCode = paypalErrorCode;
    this.debugId = debugId;
  }
}

/**
 * Erreur d'IA
 */
export class AIError extends AppError {
  public readonly model: string;
  public readonly requestId?: string;

  constructor(
    model: string,
    message: string = 'Erreur de service IA',
    requestId?: string,
    details?: any
  ) {
    super(`[AI-${model}] ${message}`, 503, true, details, 'AI_ERROR');
    this.model = model;
    this.requestId = requestId;
  }
}

/**
 * Erreur de quota dépassé
 */
export class QuotaExceededError extends AppError {
  public readonly resource: string;
  public readonly limit: number;
  public readonly current: number;
  public readonly resetTime?: Date;

  constructor(
    resource: string,
    limit: number,
    current: number,
    message?: string,
    resetTime?: Date
  ) {
    const defaultMessage = `Quota dépassé pour ${resource}: ${current}/${limit}`;
    super(message || defaultMessage, 429, true, {
      resource,
      limit,
      current,
      resetTime
    }, 'QUOTA_EXCEEDED_ERROR');
    this.resource = resource;
    this.limit = limit;
    this.current = current;
    this.resetTime = resetTime;
  }
}

/**
 * Erreur de fichier
 */
export class FileError extends AppError {
  public readonly filename?: string;
  public readonly fileType?: string;
  public readonly fileSize?: number;

  constructor(
    message: string = 'Erreur de fichier',
    filename?: string,
    fileType?: string,
    fileSize?: number,
    details?: any
  ) {
    super(message, 400, true, details, 'FILE_ERROR');
    this.filename = filename;
    this.fileType = fileType;
    this.fileSize = fileSize;
  }
}

/**
 * Erreur de configuration
 */
export class ConfigurationError extends AppError {
  public readonly configKey: string;

  constructor(configKey: string, message: string = 'Erreur de configuration') {
    super(`Configuration manquante ou invalide: ${configKey} - ${message}`, 500, true, { configKey }, 'CONFIG_ERROR');
    this.configKey = configKey;
  }
}

/**
 * Erreur de webhook
 */
export class WebhookError extends AppError {
  public readonly provider: string;
  public readonly eventType?: string;
  public readonly webhookId?: string;

  constructor(
    provider: string,
    message: string = 'Erreur de webhook',
    eventType?: string,
    webhookId?: string,
    details?: any
  ) {
    super(`[${provider} Webhook] ${message}`, 400, true, details, 'WEBHOOK_ERROR');
    this.provider = provider;
    this.eventType = eventType;
    this.webhookId = webhookId;
  }
}

/**
 * Gestionnaire d'erreurs centralisé
 */
export class ErrorHandler {
  /**
   * Log une erreur avec le bon niveau de détail
   */
  static logError(error: Error, context?: any) {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...(context && { context })
    };

    if (error instanceof AppError) {
      errorInfo.statusCode = error.statusCode;
      errorInfo.isOperational = error.isOperational;
      errorInfo.details = error.details;
      errorInfo.errorCode = error.errorCode;

      // Informations spécifiques selon le type d'erreur
      if (error instanceof PayPalError) {
        errorInfo.paypalErrorCode = error.paypalErrorCode;
        errorInfo.debugId = error.debugId;
      } else if (error instanceof PaymentError) {
        errorInfo.paymentProvider = error.paymentProvider;
        errorInfo.transactionId = error.transactionId;
        errorInfo.paymentType = error.paymentType;
      } else if (error instanceof AIError) {
        errorInfo.model = error.model;
        errorInfo.requestId = error.requestId;
      } else if (error instanceof QuotaExceededError) {
        errorInfo.quotaInfo = {
          resource: error.resource,
          limit: error.limit,
          current: error.current,
          resetTime: error.resetTime
        };
      }

      // Log selon la sévérité
      if (error.statusCode >= 500) {
        logger.error('Erreur serveur:', errorInfo);
      } else if (error.statusCode >= 400) {
        logger.warn('Erreur client:', errorInfo);
      } else {
        logger.info('Erreur info:', errorInfo);
      }
    } else {
      // Erreur non gérée
      logger.error('Erreur non gérée:', errorInfo);
    }
  }

  /**
   * Détermine si une erreur est opérationnelle
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Convertit une erreur Firebase en AppError
   */
  static fromFirebaseError(firebaseError: any): AppError {
    const code = firebaseError.code;
    const message = firebaseError.message;

    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return new AuthenticationError('Email ou mot de passe incorrect');
      
      case 'auth/invalid-id-token':
      case 'auth/id-token-expired':
        return new AuthenticationError('Token d\'authentification invalide ou expiré');
      
      case 'auth/user-disabled':
        return new ForbiddenError('Compte utilisateur désactivé');
      
      case 'auth/too-many-requests':
        return new RateLimitError('Trop de tentatives de connexion');
      
      case 'auth/email-already-in-use':
        return new ConflictError('Cette adresse email est déjà utilisée');
      
      case 'permission-denied':
        return new ForbiddenError('Permissions insuffisantes');
      
      case 'not-found':
        return new NotFoundError('Document non trouvé');
      
      case 'already-exists':
        return new ConflictError('Le document existe déjà');
      
      case 'resource-exhausted':
        return new QuotaExceededError('Firebase', 1000, 1001, 'Quota Firebase dépassé');
      
      case 'unavailable':
        return new ExternalServiceError('Firebase', 'Service Firebase temporairement indisponible');
      
      default:
        return new AppError(`Firebase Error: ${message}`, 500, true, { code });
    }
  }

  /**
   * Convertit une erreur PayPal en PayPalError
   */
  static fromPayPalError(paypalError: any): PayPalError {
    const name = paypalError.name || 'UNKNOWN_ERROR';
    const message = paypalError.message || 'Erreur PayPal inconnue';
    const details = paypalError.details || [];
    const debugId = paypalError.debug_id;

    // Mapper les erreurs PayPal communes
    switch (name) {
      case 'VALIDATION_ERROR':
        return new PayPalError('Données de paiement invalides', name, debugId, undefined, details);
      
      case 'PAYMENT_ALREADY_DONE':
        return new PayPalError('Paiement déjà effectué', name, debugId);
      
      case 'PAYMENT_NOT_APPROVED':
        return new PayPalError('Paiement non approuvé par l\'utilisateur', name, debugId);
      
      case 'INSTRUMENT_DECLINED':
        return new PayPalError('Moyen de paiement refusé', name, debugId);
      
      case 'PAYER_CANNOT_PAY':
        return new PayPalError('Le payeur ne peut pas effectuer ce paiement', name, debugId);
      
      case 'PAYEE_ACCOUNT_RESTRICTED':
        return new PayPalError('Compte marchand restreint', name, debugId);
      
      case 'INTERNAL_SERVICE_ERROR':
        return new PayPalError('Erreur interne PayPal', name, debugId);
      
      case 'RATE_LIMIT_REACHED':
        return new PayPalError('Limite de taux PayPal atteinte', name, debugId);
      
      default:
        return new PayPalError(message, name, debugId, undefined, details);
    }
  }

  /**
   * Convertit une erreur Stripe en PaymentError (pour compatibilité)
   */
/*   static fromStripeError(stripeError: any): PaymentError {
    const type = stripeError.type;
    const message = stripeError.message;
    const code = stripeError.code;

    switch (type) {
      case 'card_error':
        return new PaymentError('Stripe', `Carte refusée: ${message}`, stripeError.payment_intent?.id, { code });
      
      case 'invalid_request_error':
        return new ValidationError(`Requête Stripe invalide: ${message}`);
      
      case 'api_error':
        return new ExternalServiceError('Stripe', 'Erreur API Stripe');
      
      case 'connection_error':
        return new ExternalServiceError('Stripe', 'Problème de connexion avec Stripe');
      
      case 'rate_limit_error':
        return new RateLimitError('Limite de taux Stripe dépassée');
      
      default:
        return new PaymentError('Stripe', message, undefined, { type, code });
    }
  } */

  /**
   * Convertit une erreur d'IA en AIError
   */
  static fromAIError(aiError: any, model: string = 'unknown'): AIError {
    const message = aiError.message || 'Erreur inconnue du service IA';
    const status = aiError.status || aiError.statusCode;

    if (status === 429) {
      // new QuotaExceededError('IA', 100, 101, 'Quota IA dépassé');
      return new AIError(model, 'Quota IA dépassé', aiError.requestId);
    }

    if (status >= 500) {
      return new AIError(model, 'Service IA temporairement indisponible');
    }

    return new AIError(model, message, aiError.requestId);
  }

  /**
   * Convertit une erreur d'axios en AppError appropriée
   */
  static fromAxiosError(axiosError: any, service?: string): AppError {
    const response = axiosError.response;
    const request = axiosError.request;
    const message = axiosError.message;

    if (response) {
      // Le serveur a répondu avec un code d'erreur
      const status = response.status;
      const data = response.data;
      
      if (service === 'PayPal' && data) {
        return this.fromPayPalError(data);
      }
      
      if (status >= 500) {
        return new ExternalServiceError(service || 'API', 'Erreur serveur externe');
      } else if (status === 429) {
        return new RateLimitError('Limite de taux API dépassée');
      } else if (status >= 400) {
        return new ValidationError(`Erreur API ${service || 'externe'}: ${data?.message || message}`);
      }
    } else if (request) {
      // Aucune réponse reçue
      return new ExternalServiceError(service || 'API', 'Aucune réponse du service externe');
    }
    
    // Erreur de configuration axios
    return new ConfigurationError('AXIOS_CONFIG', message);
  }
}

/**
 * Décorateur pour capturer les erreurs async
 */
export function CatchAsync(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      ErrorHandler.logError(error as Error, {
        class: target.constructor.name,
        method: propertyName,
        args: args.length
      });
      throw error;
    }
  };
}

/**
 * Décorateur pour capturer et convertir les erreurs externes
 */
export function CatchExternalError(service: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error: any) {
        // Convertir les erreurs connues
        if (error.isAxiosError) {
          throw ErrorHandler.fromAxiosError(error, service);
        }
        
        if (service === 'PayPal' && error.name) {
          throw ErrorHandler.fromPayPalError(error);
        }

        if (service === 'Firebase' && error.code) {
          throw ErrorHandler.fromFirebaseError(error);
        }

        // Log et re-throw les erreurs inconnues
        ErrorHandler.logError(error, {
          class: target.constructor.name,
          method: propertyName,
          service
        });
        throw error;
      }
    };
  };
}

/**
 * Utilitaires de validation d'erreurs
 */
export class ErrorValidation {
  /**
   * Valide si un objet est une erreur AppError
   */
  static isAppError(error: any): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Valide si une erreur est une erreur de paiement
   */
  static isPaymentError(error: any): error is PaymentError {
    return error instanceof PaymentError || error instanceof PayPalError;
  }

  /**
   * Valide si une erreur est liée aux quotas
   */
  static isQuotaError(error: any): error is QuotaExceededError {
    return error instanceof QuotaExceededError;
  }

  /**
   * Extrait les informations essentielles d'une erreur
   */
  static extractErrorInfo(error: Error) {
    const info: any = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    if (error instanceof AppError) {
      info.statusCode = error.statusCode;
      info.isOperational = error.isOperational;
      info.errorCode = error.errorCode;
      info.timestamp = error.timestamp;
      info.details = error.details;

      // Informations spécifiques par type d'erreur
      if (error instanceof PayPalError) {
        info.paypalErrorCode = error.paypalErrorCode;
        info.debugId = error.debugId;
      } else if (error instanceof PaymentError) {
        info.paymentProvider = error.paymentProvider;
        info.transactionId = error.transactionId;
        info.paymentType = error.paymentType;
      } else if (error instanceof QuotaExceededError) {
        info.quotaInfo = {
          resource: error.resource,
          limit: error.limit,
          current: error.current,
          resetTime: error.resetTime
        };
      }
    }

    return info;
  }

  /**
   * Sanitise une erreur pour l'affichage client
   */
  static sanitizeForClient(error: Error, includeStack: boolean = false, includeDetails: boolean = false) {
    const sanitized: any = {
      message: error.message,
      name: error.name
    };

    if (error instanceof AppError) {
      sanitized.statusCode = error.statusCode;
      sanitized.errorCode = error.errorCode;
      sanitized.timestamp = error.timestamp;

      if (includeDetails && error.details && typeof error.details === 'object') {
        sanitized.details = error.details;
      }

      // Informations spécifiques pour certains types d'erreurs
      if (error instanceof QuotaExceededError) {
        sanitized.quotaInfo = {
          resource: error.resource,
          limit: error.limit,
          current: error.current,
          resetTime: error.resetTime
        };
      } else if (error instanceof PaymentError && !error.transactionId) {
        // Ne pas exposer les IDs de transaction côté client par sécurité
        sanitized.paymentProvider = error.paymentProvider;
      }
    }

    if (includeStack && error.stack) {
      sanitized.stack = error.stack;
    }

    return sanitized;
  }

  /**
   * Obtient un message d'erreur utilisateur-friendly
   */
  static getUserFriendlyMessage(error: Error): string {
    if (error instanceof PayPalError) {
      switch (error.paypalErrorCode) {
        case 'INSTRUMENT_DECLINED':
          return 'Votre moyen de paiement a été refusé. Veuillez vérifier vos informations ou essayer avec un autre moyen de paiement.';
        case 'PAYER_CANNOT_PAY':
          return 'Impossible d\'effectuer ce paiement. Veuillez vérifier votre compte PayPal.';
        case 'PAYMENT_NOT_APPROVED':
          return 'Le paiement n\'a pas été approuvé. Veuillez réessayer.';
        default:
          return 'Une erreur s\'est produite lors du traitement de votre paiement PayPal.';
      }
    }

    if (error instanceof QuotaExceededError) {
      return `Vous avez atteint votre limite d'utilisation pour ${error.resource}. ${
        error.resetTime ? `Réinitialisation le ${error.resetTime.toLocaleDateString()}.` : ''
      }`;
    }

    if (error instanceof AuthenticationError) {
      return 'Veuillez vous connecter pour continuer.';
    }

    if (error instanceof ForbiddenError) {
      return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
    }

    if (error instanceof ValidationError) {
      return error.message; // Les erreurs de validation sont généralement déjà user-friendly
    }

    if (error instanceof ExternalServiceError) {
      return 'Un service externe est temporairement indisponible. Veuillez réessayer dans quelques instants.';
    }

    // Message générique
    return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  }
}