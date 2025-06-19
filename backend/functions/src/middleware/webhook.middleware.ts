// src/middleware/webhook.middleware.ts
import { Request, Response, NextFunction } from 'express';
import express from 'express';

/**
 * Middleware pour traiter le raw body des webhooks Stripe
 * Stripe nécessite le body brut pour vérifier la signature
 */
export const rawBodyMiddleware = express.raw({ type: 'application/json' });

/**
 * Middleware conditionnel pour appliquer raw body seulement aux webhooks
 */
export const conditionalRawBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/api/v1/payments/webhook' || req.originalUrl.includes('/payments/webhook')) {
    rawBodyMiddleware(req, res, next);
  } else {
    next();
  }
};

/**
 * Middleware de validation pour les webhooks Stripe
 */
export const validateStripeWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    res.status(400).json({
      success: false,
      error: 'Signature Stripe manquante',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (!req.body) {
    res.status(400).json({
      success: false,
      error: 'Body de la requête manquant',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};