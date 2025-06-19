// utils/response.util.ts - Utilitaires pour standardiser les réponses HTTP
import { Response } from 'express';

export class ResponseUtil {
  /**
   * Réponse de succès générique
   */
  static success(res: Response, data: any = null, message: string = 'Succès', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse de succès avec données paginées
   */
  static successWithPagination(
    res: Response, 
    data: any[], 
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message: string = 'Succès'
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse de succès pour création (201)
   */
  static created(res: Response, data: any = null, message: string = 'Créé avec succès') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse de succès pour création (201)
   */
  static updated(res: Response, data: any = null, message: string = 'Créé avec succès') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

   /**
   * Réponse de succès pour création (201)
   */
  static deleted(res: Response, data: any = null, message: string = 'Créé avec succès') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse de succès sans contenu (204)
   */
  static noContent(res: Response) {
    return res.status(204).send();
  }

  /**
   * Réponse d'erreur générique
   */
  static error(res: Response, message: string, statusCode: number = 400, details?: any) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Erreur de validation (400)
   */
  static validationError(res: Response, message: string = 'Erreur de validation', details?: any) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message,
        statusCode: 400,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Erreur d'authentification (401)
   */
  static unauthorized(res: Response, message: string = 'Non autorisé', details?: any) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'UNAUTHORIZED',
        message,
        statusCode: 401,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Erreur d'accès interdit (403)
   */
  static forbidden(res: Response, message: string = 'Accès interdit', details?: any) {
    return res.status(403).json({
      success: false,
      error: {
        type: 'FORBIDDEN',
        message,
        statusCode: 403,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Ressource non trouvée (404)
   */
  static notFound(res: Response, message: string = 'Ressource non trouvée', details?: any) {
    return res.status(404).json({
      success: false,
      error: {
        type: 'NOT_FOUND',
        message,
        statusCode: 404,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Conflit de ressource (409)
   */
  static conflict(res: Response, message: string = 'Conflit de ressource', details?: any) {
    return res.status(409).json({
      success: false,
      error: {
        type: 'CONFLICT',
        message,
        statusCode: 409,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Trop de requêtes (429)
   */
  static tooManyRequests(res: Response, message: string = 'Trop de requêtes', details?: any) {
    return res.status(429).json({
      success: false,
      error: {
        type: 'TOO_MANY_REQUESTS',
        message,
        statusCode: 429,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Erreur serveur interne (500)
   */
  static serverError(res: Response, message: string = 'Erreur interne du serveur', details?: any) {
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message,
        statusCode: 500,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Service indisponible (503)
   */
  static serviceUnavailable(res: Response, message: string = 'Service temporairement indisponible', details?: any) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message,
        statusCode: 503,
        ...(details && { details })
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse personnalisée avec métadonnées
   */
  static customResponse(
    res: Response, 
    statusCode: number, 
    data: any, 
    meta?: {
      message?: string;
      requestId?: string;
      executionTime?: number;
      version?: string;
    }
  ) {
    const isSuccess = statusCode >= 200 && statusCode < 300;
    
    return res.status(statusCode).json({
      success: isSuccess,
      ...(isSuccess ? { data } : { error: data }),
      ...(meta && {
        meta: {
          ...meta,
          timestamp: new Date().toISOString()
        }
      }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Wrapper pour les erreurs async/await
   */
  static handleAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}