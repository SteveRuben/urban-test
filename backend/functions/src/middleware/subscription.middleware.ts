import { Request, Response, NextFunction } from 'express';
// Middleware d'authentification et autorisation
// Middleware de vérification d'abonnement
export const subscriptionMiddleware = (requiredPlan: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // @ts-ignore
      const userId = req.user?.uid;
      
      // Vérifier l'abonnement de l'utilisateur
      // const subscription = await SubscriptionService.getUserSubscription(userId);
      
      // Pour l'exemple, on simule un abonnement
      const subscription = { plan: 'pro', status: 'active'  };
      
      if (requiredPlan.length > 0 && !requiredPlan.includes(subscription.plan)) {
        return res.status(403).json({
          success: false,
          error: 'Abonnement insuffisant',
          required: requiredPlan
        });
      }

      // @ts-ignore
      req.user?.subscription = subscription;
      return next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification de l\'abonnement'
      });
    }
  };
};



// Validation middleware
export const validateCV = (req: Request, res: Response, next: NextFunction) => {
  const { personalInfo, sections } = req.body;

  if (!personalInfo || !personalInfo.firstName || !personalInfo.lastName || !personalInfo.email) {
    return res.status(400).json({
      success: false,
      error: 'Informations personnelles incomplètes'
    });
  }

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({
      success: false,
      error: 'Sections du CV invalides'
    });
  }

  return next();
};

export const validateTemplateInstance = (req: Request, res: Response, next: NextFunction) => {
  const { templateId, variableValues } = req.body;

  if (!templateId) {
    return res.status(400).json({
      success: false,
      error: 'ID du template requis'
    });
  }

  if (!variableValues || typeof variableValues !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Variables du template invalides'
    });
  }

  return next();
};