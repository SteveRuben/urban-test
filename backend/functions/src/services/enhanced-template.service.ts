// services/enhanced-template.service.ts - Service amélioré pour les templates
import { db, COLLECTIONS } from '../config/firebase';
import { 
  Template, 
  TemplateInstance, 
  TemplateType, 
  TemplateCategory,
  ValidationResult 
} from '../models/template.model';
import { CVRegion } from '../models/cv.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';
import { logger } from 'firebase-functions';

export class EnhancedTemplateService {
  private static templatesCollection = db.collection(COLLECTIONS.TEMPLATES);
  private static instancesCollection = db.collection(COLLECTIONS.TEMPLATE_INSTANCES);

  /**
   * Rechercher des templates avec filtres avancés
   */
  static async searchTemplates(
    filters: {
      type?: TemplateType;
      category?: TemplateCategory;
      industry?: string;
      experienceLevel?: string;
      isPremium?: boolean;
      region?: CVRegion;
      keywords?: string[];
    },
    pagination: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    templates: Template[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.templatesCollection.where('isPublic', '==', true);

      // Appliquer les filtres
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.experienceLevel) {
        query = query.where('experienceLevel', '==', filters.experienceLevel);
      }

      if (filters.isPremium !== undefined) {
        query = query.where('isPremium', '==', filters.isPremium);
      }

      // Trier par popularité
      query = query.orderBy('usageCount', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      let templates = totalSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }) as Template);

      // Filtres côté client pour les critères complexes
      if (filters.industry) {
        templates = templates.filter(template => 
          template.industry.includes(filters.industry!)
        );
      }

      if (filters.region && filters.type === TemplateType.CV) {
        templates = templates.filter(template => 
          template.regions?.includes(filters.region!)
        );
      }

      if (filters.keywords && filters.keywords.length > 0) {
        templates = templates.filter(template => {
          const searchText = `${template.name} ${template.description} ${template.tags.join(' ')} ${template.keywords.join(' ')}`.toLowerCase();
          return filters.keywords!.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
        });
      }

      const total = templates.length;
      const paginatedTemplates = templates.slice(offset, offset + limit);

      return {
        templates: paginatedTemplates,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Erreur lors de la recherche de templates:', error);
      throw error;
    }
  }

  /**
   * Obtenir un template par ID
   */
  static async getTemplateById(templateId: string): Promise<Template> {
    try {
      if (!ValidationUtil.isValidObjectId(templateId)) {
        throw new ValidationError('ID template invalide');
      }

      const templateDoc = await this.templatesCollection.doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new NotFoundError('Template non trouvé');
      }

      const template = { ...templateDoc.data(), id: templateDoc.id } as Template;

      return {
        ...template,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du template:', error);
      throw error;
    }
  }

  /**
   * Créer une instance de template
   */
  static async createInstance(instanceData: Partial<TemplateInstance>): Promise<TemplateInstance> {
    try {
      const requiredFields = ['templateId', 'userId', 'type', 'variableValues', 'title'];
      const missingFields = ValidationUtil.validateRequiredFields(instanceData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      // Vérifier que le template existe
      const template = await this.getTemplateById(instanceData.templateId!);

      // Vérifier les accès premium
      if (template.isPremium) {
        const userSubscription = await SubscriptionService.getActiveUserSubscription(instanceData.userId!);
        const hasPremiumAccess = this.hasFeatureAccess(userSubscription, 'premium_templates');

        if (!hasPremiumAccess) {
          throw new ForbiddenError('Abonnement premium requis pour ce template');
        }
      }

      // Valider les données du template
      const validation = this.validateTemplateData(template, instanceData.variableValues!);
      if (!validation.isValid) {
        throw new ValidationError(`Données invalides: ${validation.errors.join(', ')}`);
      }

      const instanceId = this.instancesCollection.doc().id;
      const now = new Date();

      const newInstance: TemplateInstance = {
        id: instanceId,
        templateId: instanceData.templateId!,
        userId: instanceData.userId!,
        type: instanceData.type!,
        variableValues: instanceData.variableValues!,
        sectionContents: {},
        generatedContent: '',
        title: ValidationUtil.sanitizeString(instanceData.title!),
        status: 'draft',
        aiSettings: instanceData.aiSettings,
        versions: [],
        currentVersion: 1,
        createdAt: now,
        updatedAt: now
      };

      await this.instancesCollection.doc(instanceId).set(newInstance);

      // Incrémenter le compteur d'utilisation du template
      await this.incrementTemplateUsage(instanceData.templateId!);

      logger.info('Instance de template créée', {
        instanceId,
        templateId: instanceData.templateId,
        userId: instanceData.userId
      });

      return newInstance;
    } catch (error) {
      logger.error('Erreur lors de la création de l\'instance:', error);
      throw error;
    }
  }

  /**
   * Obtenir une instance par ID
   */
  static async getInstanceById(instanceId: string, userId: string): Promise<TemplateInstance> {
    try {
      if (!ValidationUtil.isValidObjectId(instanceId)) {
        throw new ValidationError('ID instance invalide');
      }

      const instanceDoc = await this.instancesCollection.doc(instanceId).get();
      
      if (!instanceDoc.exists) {
        throw new NotFoundError('Instance non trouvée');
      }

      const instance = instanceDoc.data() as TemplateInstance;
      
      // Vérifier que l'utilisateur est le propriétaire
      if (instance.userId !== userId) {
        throw new ForbiddenError('Accès non autorisé à cette instance');
      }

      return {
        ...instance,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        lastGeneratedAt: instance.lastGeneratedAt
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'instance:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une instance
   */
  static async updateInstance(instanceId: string, updateData: Partial<TemplateInstance>): Promise<TemplateInstance> {
    try {
      const instanceDoc = await this.instancesCollection.doc(instanceId).get();
      
      if (!instanceDoc.exists) {
        throw new NotFoundError('Instance non trouvée');
      }

      const instance = instanceDoc.data() as TemplateInstance;

      const updateFields: Partial<TemplateInstance> = {
        ...updateData,
        updatedAt: new Date()
      };

      // Empêcher la modification de certains champs
      delete updateFields.id;
      delete updateFields.userId;
      delete updateFields.templateId;
      delete updateFields.createdAt;

      // Si on met à jour le contenu généré, incrémenter la version
      if (updateFields.generatedContent && updateFields.generatedContent !== instance.generatedContent) {
        updateFields.currentVersion = (instance.currentVersion || 1) + 1;
        
        // Sauvegarder l'ancienne version
        const newVersion = {
          version: instance.currentVersion || 1,
          content: instance.generatedContent,
          variableValues: instance.variableValues,
          generatedAt: instance.lastGeneratedAt || instance.updatedAt,
          aiSettings: instance.aiSettings,
          metadata: instance.generationMetadata
        };

        updateFields.versions = [...(instance.versions || []), newVersion];
      }

      await this.instancesCollection.doc(instanceId).update(updateFields);

      logger.info('Instance mise à jour', {
        instanceId,
        updateFields: Object.keys(updateFields)
      });

      // Retourner l'instance mise à jour
      const updatedDoc = await this.instancesCollection.doc(instanceId).get();
      const updatedInstance = updatedDoc.data() as TemplateInstance;
      
      return {
        ...updatedInstance,
        createdAt: updatedInstance.createdAt,
        updatedAt: updatedInstance.updatedAt,
        lastGeneratedAt: updatedInstance.lastGeneratedAt
      };
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'instance:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'une instance
   */
  static async updateInstanceStatus(instanceId: string, status: string, progress?: number): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (progress !== undefined) {
        updateData.generationProgress = progress;
      }

      await this.instancesCollection.doc(instanceId).update(updateData);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  /**
   * Obtenir les instances d'un utilisateur
   */
  static async getUserInstances(
    userId: string,
    filters: {
      type?: TemplateType;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    instances: TemplateInstance[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10 } = filters;
      const offset = (page - 1) * limit;

      let query = this.instancesCollection.where('userId', '==', userId);

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      query = query.orderBy('updatedAt', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      const snapshot = await query
        .offset(offset)
        .limit(limit)
        .get();

      const instances = snapshot.docs.map(doc => {
        const data = doc.data() as TemplateInstance;
        return {
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastGeneratedAt: data.lastGeneratedAt
        };
      });

      return {
        instances,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des instances:', error);
      throw error;
    }
  }

  /**
   * Supprimer une instance
   */
  static async deleteInstance(instanceId: string, userId: string): Promise<void> {
    try {
      // Vérifier que l'instance existe et appartient à l'utilisateur
      await this.getInstanceById(instanceId, userId);

      await this.instancesCollection.doc(instanceId).delete();

      logger.info('Instance supprimée', { instanceId, userId });
    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'instance:', error);
      throw error;
    }
  }

  /**
   * Obtenir tous les templates disponibles
   */
  static async getAllTemplates(): Promise<Template[]> {
    try {
      const snapshot = await this.templatesCollection
        .where('isPublic', '==', true)
        .orderBy('usageCount', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
      }) as Template);
    } catch (error) {
      logger.error('Erreur lors de la récupération de tous les templates:', error);
      throw error;
    }
  }

  /**
   * Obtenir le profil utilisateur pour les recommandations
   */
  static async getUserProfile(userId: string): Promise<any> {
    try {
      // Récupérer les informations de l'utilisateur
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      const subscription = await SubscriptionService.getActiveUserSubscription(userId);

      return {
        industry: userData?.preferredIndustry,
        experienceLevel: userData?.experienceLevel,
        subscription: subscription?.plan || 'free'
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du profil utilisateur:', error);
      return null;
    }
  }

  /**
   * Obtenir l'historique des templates utilisés par un utilisateur
   */
  static async getUserTemplateHistory(userId: string): Promise<Array<{ templateId: string; usedAt: Date }>> {
    try {
      const snapshot = await this.instancesCollection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          templateId: data.templateId,
          usedAt: data.createdAt
        };
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des templates
   */
  static async getUserTemplateStats(userId: string, period: string): Promise<any> {
    try {
      const snapshot = await this.instancesCollection
        .where('userId', '==', userId)
        .get();

      const instances = snapshot.docs.map(doc => doc.data() as TemplateInstance);

      // Calculer les statistiques selon la période
      const now = new Date();
      const periodMs = period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

      const recentInstances = instances.filter(instance => 
        now.getTime() - instance.createdAt.getTime() < periodMs
      );

      const stats = {
        totalInstances: instances.length,
        recentInstances: recentInstances.length,
        completedInstances: instances.filter(i => i.status === 'completed').length,
        favoriteType: this.getMostUsedType(instances),
        templateUsage: this.getTemplateUsageStats(instances),
        generationSuccess: this.calculateGenerationSuccessRate(instances)
      };

      return stats;
    } catch (error) {
      logger.error('Erreur lors du calcul des stats templates:', error);
      throw error;
    }
  }

  /**
   * Obtenir les tendances d'utilisation
   */
  static async getUsageTrends(userId: string, months: number): Promise<any> {
    try {
      const snapshot = await this.instancesCollection
        .where('userId', '==', userId)
        .get();

      const instances = snapshot.docs.map(doc => doc.data() as TemplateInstance);

      // Grouper par mois
      const trends = {};
      const now = new Date();

      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
        
        trends[monthKey] = {
          instances: 0,
          completed: 0,
          aiGenerated: 0
        };
      }

      instances.forEach(instance => {
        const monthKey = instance.createdAt.toISOString().substring(0, 7);
        
        if (trends[monthKey]) {
          trends[monthKey].instances++;
          
          if (instance.status === 'completed') {
            trends[monthKey].completed++;
          }
          
          if (instance.generatedContent) {
            trends[monthKey].aiGenerated++;
          }
        }
      });

      return trends;
    } catch (error) {
      logger.error('Erreur lors du calcul des tendances:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  /**
   * Valider les données d'un template
   */
  static validateTemplateData(template: Template, variableValues: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier les variables globales
    template.globalVariables.forEach(variable => {
      if (variable.required && !variableValues[variable.name]) {
        errors.push(`Le champ "${variable.label}" est requis`);
      }

      if (variableValues[variable.name] && variable.validation) {
        const value = variableValues[variable.name];
        const validation = variable.validation;

        if (typeof value === 'string') {
          if (validation.minLength && value.length < validation.minLength) {
            errors.push(`"${variable.label}" doit contenir au moins ${validation.minLength} caractères`);
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            errors.push(`"${variable.label}" ne peut pas dépasser ${validation.maxLength} caractères`);
          }
          if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
            errors.push(`"${variable.label}" ne respecte pas le format attendu`);
          }
        }

        if (typeof value === 'number') {
          if (validation.min !== undefined && value < validation.min) {
            errors.push(`"${variable.label}" doit être supérieur ou égal à ${validation.min}`);
          }
          if (validation.max !== undefined && value > validation.max) {
            errors.push(`"${variable.label}" doit être inférieur ou égal à ${validation.max}`);
          }
        }
      }
    });

    // Vérifier les variables de sections
    template.sections.forEach(section => {
      section.variables.forEach(variable => {
        if (variable.required && !variableValues[variable.name]) {
          errors.push(`Le champ "${variable.label}" (section ${section.name}) est requis`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Recommander des templates basés sur le profil utilisateur
   */
  static recommendTemplates(
    templates: Template[],
    userProfile: {
      industry?: string;
      experienceLevel?: string;
      previousTemplates?: string[];
      subscription?: string;
    }
  ): Template[] {
    let scored = templates.map(template => {
      let score = 0;

      // Score basé sur l'industrie
      if (userProfile.industry && template.industry.includes(userProfile.industry)) {
        score += 10;
      }

      // Score basé sur l'expérience
      if (userProfile.experienceLevel && 
          (template.experienceLevel === userProfile.experienceLevel || template.experienceLevel === 'any')) {
        score += 8;
      }

      // Popularité
      score += Math.min(template.usageCount / 100, 5);

      // Note
      score += template.rating;

      // Éviter les templates déjà utilisés récemment
      if (userProfile.previousTemplates?.includes(template.id)) {
        score -= 3;
      }

      // Templates premium si abonnement
      if (template.isPremium && userProfile.subscription === 'free') {
        score = 0; // Exclure si pas d'abonnement
      }

      return { template, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.template);
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  private static async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      const templateRef = this.templatesCollection.doc(templateId);
      const templateDoc = await templateRef.get();
      
      if (templateDoc.exists) {
        const currentUsage = templateDoc.data()?.usageCount || 0;
        await templateRef.update({
          usageCount: currentUsage + 1,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      // Ignorer les erreurs d'incrémentation
      logger.warn('Erreur lors de l\'incrémentation du compteur d\'usage:', error);
    }
  }

  private static hasFeatureAccess(subscription: any, feature: string): boolean {
    if (!subscription) return false;
    
    const premiumFeatures = ['premium_templates', 'ai_generation', 'analytics'];
    
    if (!premiumFeatures.includes(feature)) return true;
    
    return ['pro', 'premium'].includes(subscription.plan);
  }

  private static getMostUsedType(instances: TemplateInstance[]): TemplateType | null {
    const typeCounts = instances.reduce((acc, instance) => {
      acc[instance.type] = (acc[instance.type] || 0) + 1;
      return acc;
    }, {} as Record<TemplateType, number>);

    const entries = Object.entries(typeCounts);
    if (entries.length === 0) return null;

    return entries.sort(([,a], [,b]) => b - a)[0][0] as TemplateType;
  }

  private static getTemplateUsageStats(instances: TemplateInstance[]): Array<{ templateId: string; count: number }> {
    const templateCounts = instances.reduce((acc, instance) => {
      acc[instance.templateId] = (acc[instance.templateId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(templateCounts)
      .map(([templateId, count]) => ({ templateId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private static calculateGenerationSuccessRate(instances: TemplateInstance[]): number {
    const withGeneration = instances.filter(i => i.generatedContent);
    const total = instances.length;
    
    return total > 0 ? Math.round((withGeneration.length / total) * 100) : 0;
  }
}