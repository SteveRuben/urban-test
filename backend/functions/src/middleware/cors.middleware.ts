// src/middleware/cors.middleware.ts
import cors from 'cors';

export const corsOptions = {
  origin: [
    'https://motivationletter.ai',
    'https://motivationletter-ai.web.app',
    'https://motivationletter-ai.firebaseapp.com',
    // Ajout pour développement local
    'http://localhost:3000',
    'http://localhost:5173' // Vite dev server
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept', 
    'Stripe-Signature'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions);