// src/types/env.types.ts

// Déclarations pour les fichiers d'environnement Vite
export interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  // Plus de variables d'environnement...
}

// Déclaration pour augmenter ImportMeta
export interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface StripeInstance {
  elements(): unknown;
  confirmCardPayment(clientSecret: string, paymentMethod?: unknown): Promise<unknown>;
  confirmPayment(options: unknown): Promise<unknown>;
}
// Extension de l'interface Window pour les fonctionnalités globales comme Stripe
declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}