// src/types/payment.types.ts

// Types liés aux paiements
export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  planType?: string;
  amount: number;
  currency: string;
  interval?: 'monthly' | 'yearly' | 'lifetime';
  status: 'pending' | 'succeeded' | 'failed';
  paypalOrderId?: string;          // ID de l'ordre PayPal (paiements uniques)
  paypalCaptureId?: string;        // ID de capture PayPal
  paypalSubscriptionId?: string;   // ID d'abonnement PayPal (récurrents)
  paypalPayerId?: string;  
  paymentMethod: string;
  receiptUrl?: string;
  createdAt: string;
  date?: string; // Pour la compatibilité avec certains composants d'interface
}

export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  paymentMethod: string;
  invoiceUrl?: string;
}

export interface PaymentIntent {
  clientSecret: string;
  id: string;
  amount: number;
  currency: string;
  status: string;
}