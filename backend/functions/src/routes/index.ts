
// src/routes/index.ts
import { Router } from 'express';
import userRoutes from './user.routes';
import letterRoutes from './letter.routes'; 
import subscriptionRoutes from './subscription.routes'; 
import paymentRoutes from './payment.routes'; 
import aiRoutes from './ai.routes';
import cvRoutes from './cv.routes'; 
import templateRoutes from './template.routes';
import notificationRoutes from './notification.routes';
import { CONFIG } from '../config/firebase';

const router = Router();

// Routes principales
router.use('/users', userRoutes);
router.use('/letters', letterRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/ai', aiRoutes);
router.use('/templates', templateRoutes);
router.use('/notifications', notificationRoutes);
router.use('/cv',cvRoutes);

router.get('/health2', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: CONFIG.ENVIRONMENT,
    version: '1.0.0',
    region: CONFIG.REGION,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Route de santé
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Générateur de Lettres de Motivation API',
    version: '1.0.0',
    features: {
      users: 'enabled',
      letters: 'enabled',
      templates: 'active',
      subscriptions: 'enabled',
      payments: 'enabled',
      ai: 'enabled',
      cv: 'enabled'
    },
    environment: process.env.NODE_ENV || 'development',
    integrations: {
      stripe: {
        configured: !!process.env.STRIPE_SECRET_KEY,
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
      },
      ai: {
        geminiConfigured: !!process.env.AI_API_KEY,
        models: ['gemini-pro']
      },
      firebase: {
        projectId: process.env.CLG_PROJECT_ID || 'not-configured'
      }
    }
  });
});

export default router;