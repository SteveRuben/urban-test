import { CollectionName, COLLECTIONS, db } from "./firebase";

export const FIRESTORE_INDEXES = {
  // Index pour les CV
  cvs: [
    { fields: ['userId', 'status', 'updatedAt'], order: 'desc' },
    { fields: ['userId', 'region', 'createdAt'], order: 'desc' },
    { fields: ['templateId', 'createdAt'], order: 'desc' },
    { fields: ['status', 'region', 'updatedAt'], order: 'desc' }
  ],
  
  // Index pour les templates
  enhanced_templates: [
    { fields: ['isPublic', 'type', 'usageCount'], order: 'desc' },
    { fields: ['isPublic', 'category', 'rating'], order: 'desc' },
    { fields: ['isPublic', 'isPremium', 'createdAt'], order: 'desc' },
    { fields: ['type', 'experienceLevel', 'usageCount'], order: 'desc' }
  ],
  
  // Index pour les instances de templates
  template_instances: [
    { fields: ['userId', 'type', 'updatedAt'], order: 'desc' },
    { fields: ['userId', 'status', 'createdAt'], order: 'desc' },
    { fields: ['templateId', 'status', 'createdAt'], order: 'desc' }
  ],
  
  // Index pour l'usage de l'IA
  ai_usage: [
    { fields: ['userId', 'createdAt'], order: 'desc' },
    { fields: ['userId', 'model', 'createdAt'], order: 'desc' },
    { fields: ['success', 'createdAt'], order: 'desc' }
  ],
  
  // Index pour les analyses de CV
  cv_analysis: [
    { fields: ['userId', 'createdAt'], order: 'desc' },
    { fields: ['cvId', 'createdAt'], order: 'desc' },
    { fields: ['overallScore', 'createdAt'], order: 'desc' }
  ],
  
  // Index pour les correspondances de poste
  cv_matching: [
    { fields: ['userId', 'matchingScore'], order: 'desc' },
    { fields: ['cvId', 'createdAt'], order: 'desc' },
    { fields: ['userId', 'createdAt'], order: 'desc' }
  ],
  
  // Index pour les notifications
  notifications: [
    { fields: ['userId', 'read', 'createdAt'], order: 'desc' },
    { fields: ['userId', 'type', 'createdAt'], order: 'desc' }
  ],
  
  // Index pour les abonnements
  subscriptions: [
    { fields: ['userId', 'status', 'createdAt'], order: 'desc' },
    { fields: ['status', 'endDate'], order: 'asc' },
    { fields: ['plan', 'status', 'createdAt'], order: 'desc' }
  ],
  
  // Index pour les paiements
  payments: [
    { fields: ['userId', 'status', 'createdAt'], order: 'desc' },
    { fields: ['status', 'method', 'createdAt'], order: 'desc' },
    { fields: ['planType', 'status', 'createdAt'], order: 'desc' }
  ]
};

// Configuration des règles de sécurité Firestore recommandées
export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Règles pour les CV
    match /cvs/{cvId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Règles pour les templates publics
    match /enhanced_templates/{templateId} {
      allow read: if resource.data.isPublic == true;
      allow read, write: if request.auth != null && request.auth.uid == resource.data.creatorId;
    }
    
    // Règles pour les instances de templates
    match /template_instances/{instanceId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Règles pour les lettres
    match /letters/{letterId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Règles pour les abonnements
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Seules les fonctions Cloud peuvent modifier
    }
    
    // Règles pour les paiements
    match /payments/{paymentId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Seules les fonctions Cloud peuvent modifier
    }
    
    // Règles pour les notifications
    match /notifications/{notificationId} {
      allow read, update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Seules les fonctions Cloud peuvent créer/supprimer
    }
    
    // Règles pour l'usage de l'IA (lecture seule pour l'utilisateur)
    match /ai_usage/{usageId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Seules les fonctions Cloud peuvent modifier
    }
    
    // Règles pour les analyses de CV
    match /cv_analysis/{analysisId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Seules les fonctions Cloud peuvent modifier
    }
    
    // Règles pour les correspondances de poste
    match /cv_matching/{matchingId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Règles pour les exports de CV
    match /cv_exports/{exportId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Seules les fonctions Cloud peuvent modifier
    }
    
    // Règles pour les statistiques (lecture seule)
    match /user_stats/{statsId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false;
    }
    
    // Règles pour les évaluations de templates
    match /template_ratings/{ratingId} {
      allow read: if true; // Public pour calculer les moyennes
      allow create, update: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Règles pour les CV partagés
    match /shared_cvs/{shareId} {
      allow read: if resource.data.isPublic == true || 
                     (request.auth != null && request.auth.uid == resource.data.ownerId);
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
  }
}`;

// Fonctions utilitaires pour les collections
export class CollectionUtils {
  /**
   * Générer un ID de document unique
   */
  static generateId(): string {
    return db.collection('_temp').doc().id;
  }
  
  /**
   * Vérifier si une collection existe
   */
  static async collectionExists(collectionName: CollectionName): Promise<boolean> {
    try {
      const snapshot = await db.collection(collectionName).limit(1).get();
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Compter les documents dans une collection
   */
  static async countDocuments(collectionName: CollectionName, filters?: any): Promise<number> {
    try {
      //let query = db.collection(collectionName);
      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(collectionName);
      
      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          query = query.where(field, '==', value);
        });
      }
      
      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error('Erreur lors du comptage des documents:', error);
      return 0;
    }
  }
  
  /**
   * Nettoyer les documents expirés
   */
  static async cleanupExpiredDocuments(
    collectionName: CollectionName,
    expiryField: string,
    batchSize: number = 500
  ): Promise<number> {
    try {
      const now = new Date();
      const snapshot = await db.collection(collectionName)
        .where(expiryField, '<=', now)
        .limit(batchSize)
        .get();
      
      if (snapshot.empty) {
        return 0;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Erreur lors du nettoyage des documents expirés:', error);
      return 0;
    }
  }
  
  /**
   * Migrer des documents entre collections
   */
  static async migrateDocuments(
    sourceCollection: CollectionName,
    targetCollection: CollectionName,
    transformer?: (doc: any) => any,
    batchSize: number = 500
  ): Promise<number> {
    try {
      const snapshot = await db.collection(sourceCollection)
        .limit(batchSize)
        .get();
      
      if (snapshot.empty) {
        return 0;
      }
      
      const batch = db.batch();
      let migratedCount = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const transformedData = transformer ? transformer(data) : data;
        
        const newDocRef = db.collection(targetCollection).doc(doc.id);
        batch.set(newDocRef, {
          ...transformedData,
          migratedAt: new Date(),
          originalCollection: sourceCollection
        });
        
        migratedCount++;
      });
      
      await batch.commit();
      console.log(`Migré ${migratedCount} documents de ${sourceCollection} vers ${targetCollection}`);
      
      return migratedCount;
    } catch (error) {
      console.error('Erreur lors de la migration des documents:', error);
      return 0;
    }
  }
  
  /**
   * Créer des index composites automatiquement
   */
  static generateIndexCreationCommands(): string[] {
    const commands: string[] = [];
    
    Object.entries(FIRESTORE_INDEXES).forEach(([collection, indexes]) => {
      indexes.forEach(index => {
        const fields = index.fields.map(field => {
          if (typeof field === 'string') {
            return field;
          } else {
            return `${Object.keys(field)[0]} ${Object.values(field)[0]}`;
          }
        }).join(', ');
        
        commands.push(
          `firebase firestore:indexes:create --collection-group=${collection} --fields="${fields}"`
        );
      });
    });
    
    return commands;
  }
  
  /**
   * Valider la structure d'un document
   */
  static validateDocumentStructure(
    collectionName: CollectionName,
    document: any,
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[]; errors: string[] } {
    const missingFields: string[] = [];
    const errors: string[] = [];
    
    // Vérifier les champs requis
    requiredFields.forEach(field => {
      if (!document.hasOwnProperty(field) || document[field] === null || document[field] === undefined) {
        missingFields.push(field);
      }
    });
    
    // Validations spécifiques par collection
    switch (collectionName) {
      case COLLECTIONS.CVS:
        if (document.personalInfo && !document.personalInfo.email) {
          errors.push('Email requis dans personalInfo');
        }
        break;
        
      case COLLECTIONS.ENHANCED_TEMPLATES:
        if (document.sections && !Array.isArray(document.sections)) {
          errors.push('sections doit être un tableau');
        }
        break;
        
      case COLLECTIONS.TEMPLATE_INSTANCES:
        if (document.variableValues && typeof document.variableValues !== 'object') {
          errors.push('variableValues doit être un objet');
        }
        break;
        
      case COLLECTIONS.SUBSCRIPTIONS:
        if (document.endDate && document.startDate && document.endDate <= document.startDate) {
          errors.push('endDate doit être postérieure à startDate');
        }
        break;
    }
    
    return {
      isValid: missingFields.length === 0 && errors.length === 0,
      missingFields,
      errors
    };
  }
}

// Configuration des triggers Cloud Functions
export const CLOUD_FUNCTION_TRIGGERS = {
  // Triggers pour les CV
  onCVCreated: {
    collection: COLLECTIONS.CVS,
    event: 'onCreate',
    functions: ['updateUserStats', 'sendWelcomeNotification']
  },
  
  onCVUpdated: {
    collection: COLLECTIONS.CVS,
    event: 'onUpdate',
    functions: ['updateLastActivity', 'trackVersionChanges']
  },
  
  // Triggers pour les templates
  onTemplateUsed: {
    collection: COLLECTIONS.TEMPLATE_INSTANCES,
    event: 'onCreate',
    functions: ['incrementTemplateUsage', 'updateTemplateStats']
  },
  
  // Triggers pour les abonnements
  onSubscriptionChanged: {
    collection: COLLECTIONS.SUBSCRIPTIONS,
    event: 'onUpdate',
    functions: ['updateUserPermissions', 'sendSubscriptionNotification']
  },
  
  // Triggers pour les paiements
  onPaymentCompleted: {
    collection: COLLECTIONS.PAYMENTS,
    event: 'onUpdate',
    functions: ['updateSubscription', 'sendReceiptEmail', 'updateAnalytics']
  },
  
  // Triggers pour l'usage de l'IA
  onAIUsage: {
    collection: COLLECTIONS.AI_USAGE,
    event: 'onCreate',
    functions: ['updateQuotaUsage', 'trackCosts', 'updateUserStats']
  }
};

// Configuration des tâches de maintenance
export const MAINTENANCE_TASKS = {
  // Nettoyage quotidien
  daily: [
    {
      name: 'cleanupExpiredExports',
      collection: COLLECTIONS.CV_EXPORTS,
      action: 'deleteExpired',
      field: 'expiresAt'
    },
    {
      name: 'cleanupOldNotifications',
      collection: COLLECTIONS.NOTIFICATION,
      action: 'deleteOlder',
      field: 'createdAt',
      days: 90
    }
  ],
  
  // Nettoyage hebdomadaire
  weekly: [
    {
      name: 'cleanupUnusedTemplateInstances',
      collection: COLLECTIONS.TEMPLATE_INSTANCES,
      action: 'deleteEmpty',
      condition: { status: 'draft', generatedContent: '' }
    },
    {
      name: 'updateTemplateStats',
      collection: COLLECTIONS.ENHANCED_TEMPLATES,
      action: 'recalculateStats'
    }
  ],
  
  // Nettoyage mensuel
  monthly: [
    {
      name: 'archiveOldCVs',
      collection: COLLECTIONS.CVS,
      action: 'archive',
      field: 'lastViewedAt',
      months: 12
    },
    {
      name: 'cleanupAIUsageLogs',
      collection: COLLECTIONS.AI_USAGE,
      action: 'deleteOlder',
      field: 'createdAt',
      months: 6
    }
  ]
};