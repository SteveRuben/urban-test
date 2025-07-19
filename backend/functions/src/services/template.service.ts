// src/services/template.service.ts
import { db, COLLECTIONS } from '../config/firebase';
import { CVRegion } from '../models/cv.model';
import { LetterTemplate, LetterType } from '../models/letter.model';
import { Template, TemplateCategory, TemplateType, TemplateVariable, ValidationResult } from '../models/template.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';

export class TemplateService {
  private static templatesCollection = db.collection(COLLECTIONS.TEMPLATES);

  /**
   * Récupérer tous les templates publics et ceux de l'utilisateur
   */
  static async getAvailableTemplates(
    userId: string,
    filters?: {
      type?: LetterType;
      isPremium?: boolean;
      tags?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    templates: LetterTemplate[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const limit = Math.min(filters?.limit || 20, 100);
      const offset = filters?.offset || 0;

      // Construire la requête de base
      let query = this.templatesCollection
        .where('isPublic', '==', true)
        .orderBy('useCount', 'desc');

      // Appliquer les filtres
      if (filters?.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters?.isPremium !== undefined) {
        query = query.where('isPremium', '==', filters.isPremium);
      }

      const snapshot = await query.limit(limit + 1).offset(offset).get();
      let templates = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }) as LetterTemplate);

      // Filtrage côté client pour les critères complexes
      if (filters?.tags && filters.tags.length > 0) {
        templates = templates.filter(template => 
          template.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        templates = templates.filter(template =>
          template.title.toLowerCase().includes(searchTerm) ||
          template.template.toLowerCase().includes(searchTerm) ||
          template.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Ajouter les templates personnels de l'utilisateur
      const userTemplatesSnapshot = await this.templatesCollection
        .where('creatorId', '==', userId)
        .where('isPublic', '==', false)
        .get();

      const userTemplates = userTemplatesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }) as LetterTemplate);

      // Combiner et trier
      const allTemplates = [...templates.slice(0, limit), ...userTemplates];
      
      // Vérifier les accès premium
      const userSubscription = await SubscriptionService.getActiveUserSubscription(userId);
      const hasPremiumAccess = this.hasFeatureAccess(userSubscription, 'premium_templates');

      const accessibleTemplates = allTemplates.filter(template => {
        if (template.isPremium && !hasPremiumAccess && template.creatorId !== userId) {
          return false;
        }
        return true;
      });

      return {
        templates: accessibleTemplates,
        total: accessibleTemplates.length,
        hasMore: templates.length > limit
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des templates:', error);
      throw error;
    }
  }

  /**
   * Récupérer un template spécifique
   */
  static async getTemplate(userId: string, templateId: string): Promise<LetterTemplate> {
    try {
      const templateDoc = await this.templatesCollection.doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new NotFoundError('Template non trouvé');
      }

      const template = { ...templateDoc.data(), id: templateDoc.id } as LetterTemplate;

      // Vérifier les accès
      if (!template.isPublic && template.creatorId !== userId) {
        throw new ForbiddenError('Accès non autorisé à ce template');
      }

      if (template.isPremium) {
        const userSubscription = await SubscriptionService.getActiveUserSubscription(userId);
        const hasPremiumAccess = this.hasFeatureAccess(userSubscription, 'premium_templates');

        if (!hasPremiumAccess && template.creatorId !== userId) {
          throw new ForbiddenError('Abonnement premium requis pour ce template');
        }
      }

      return template;

    } catch (error) {
      console.error('Erreur lors de la récupération du template:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau template personnalisé
   */
  static async createTemplate(
    userId: string,
    templateData: {
      title: string;
      template: string;
      type: LetterType;
      tags?: string[];
      isPublic?: boolean;
    }
  ): Promise<LetterTemplate> {
    try {
      // Validation des données
      const requiredFields = ['title', 'template', 'type'];
      const missingFields = ValidationUtil.validateRequiredFields(templateData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      if (templateData.title.trim().length < 3) {
        throw new ValidationError('Le titre doit contenir au moins 3 caractères');
      }

      if (templateData.template.trim().length < 50) {
        throw new ValidationError('Le template doit contenir au moins 50 caractères');
      }

      // Vérifier les limites utilisateur
      const userTemplatesCount = await this.getUserTemplatesCount(userId);
      const userSubscription = await SubscriptionService.getActiveUserSubscription(userId);
      
      const maxTemplates = this.getMaxTemplatesForUser(userSubscription);
      if (userTemplatesCount >= maxTemplates) {
        throw new ForbiddenError(
          `Limite de templates atteinte (${maxTemplates}). Mettez à niveau votre abonnement.`
        );
      }

      const templateId = this.templatesCollection.doc().id;
      const template: LetterTemplate = {
        id: templateId,
        title: ValidationUtil.sanitizeString(templateData.title),
        template: ValidationUtil.sanitizeString(templateData.template),
        type: templateData.type,
        tags: templateData.tags?.map(tag => ValidationUtil.sanitizeString(tag)).filter(Boolean) || [],
        isPublic: templateData.isPublic || false,
        isPremium: false, // Les templates utilisateur ne sont pas premium par défaut
        isAIGenerated: false,
        useCount: 0,
        rating: 0,
        creatorId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.templatesCollection.doc(templateId).set(template);

      return template;

    } catch (error) {
      console.error('Erreur lors de la création du template:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un template utilisateur
   */
  static async updateTemplate(
    userId: string,
    templateId: string,
    updateData: Partial<{
      title: string;
      template: string;
      tags: string[];
      isPublic: boolean;
    }>
  ): Promise<LetterTemplate> {
    try {
      const templateDoc = await this.templatesCollection.doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new NotFoundError('Template non trouvé');
      }

      const template = templateDoc.data() as LetterTemplate;

      // Vérifier les permissions
      if (template.creatorId !== userId) {
        throw new ForbiddenError('Vous ne pouvez pas modifier ce template');
      }

      // Préparer les données de mise à jour
      const updatePayload: Partial<LetterTemplate> = {
        updatedAt: new Date()
      };

      if (updateData.title) {
        if (updateData.title.trim().length < 3) {
          throw new ValidationError('Le titre doit contenir au moins 3 caractères');
        }
        updatePayload.title = ValidationUtil.sanitizeString(updateData.title);
      }

      if (updateData.template) {
        if (updateData.template.trim().length < 50) {
          throw new ValidationError('Le template doit contenir au moins 50 caractères');
        }
        updatePayload.template = ValidationUtil.sanitizeString(updateData.template);
      }

      if (updateData.tags) {
        updatePayload.tags = updateData.tags
          .map(tag => ValidationUtil.sanitizeString(tag))
          .filter(Boolean);
      }

      if (updateData.isPublic !== undefined) {
        updatePayload.isPublic = updateData.isPublic;
      }

      await this.templatesCollection.doc(templateId).update(updatePayload);

      return {
        ...template,
        ...updatePayload,
        id: templateId
      };

    } catch (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      throw error;
    }
  }

  /**
   * Supprimer un template utilisateur
   */
  static async deleteTemplate(userId: string, templateId: string): Promise<void> {
    try {
      const templateDoc = await this.templatesCollection.doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new NotFoundError('Template non trouvé');
      }

      const template = templateDoc.data() as LetterTemplate;

      // Vérifier les permissions
      if (template.creatorId !== userId) {
        throw new ForbiddenError('Vous ne pouvez pas supprimer ce template');
      }

      await this.templatesCollection.doc(templateId).delete();

    } catch (error) {
      console.error('Erreur lors de la suppression du template:', error);
      throw error;
    }
  }

  /**
   * Utiliser un template (incrémenter le compteur d'utilisation)
   */
  static async useTemplate(userId: string, templateId: string): Promise<LetterTemplate> {
    try {
      const template = await this.getTemplate(userId, templateId);

      // Incrémenter le compteur d'utilisation
      await this.templatesCollection.doc(templateId).update({
        useCount: (template.useCount || 0) + 1,
        updatedAt: new Date()
      });

      return {
        ...template,
        useCount: (template.useCount || 0) + 1
      };

    } catch (error) {
      console.error('Erreur lors de l\'utilisation du template:', error);
      throw error;
    }
  }

  /**
   * Noter un template
   */
  static async rateTemplate(
    userId: string,
    templateId: string,
    rating: number
  ): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new ValidationError('La note doit être comprise entre 1 et 5');
      }

      await this.getTemplate(userId, templateId);

      // Enregistrer la note individuelle
      const ratingId = db.collection('template_ratings').doc().id;
      await db.collection('template_ratings').doc(ratingId).set({
        id: ratingId,
        templateId,
        userId,
        rating,
        createdAt: new Date()
      });

      // Calculer la nouvelle moyenne
      const ratingsSnapshot = await db.collection('template_ratings')
        .where('templateId', '==', templateId)
        .get();

      const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
      const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      // Mettre à jour le template
      await this.templatesCollection.doc(templateId).update({
        rating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Erreur lors de la notation du template:', error);
      throw error;
    }
  }

  /**
   * Remplacer les variables dans un template
   */
  static processTemplate(
    template: string,
    variables: {
      position?: string;
      company?: string;
      name?: string;
      email?: string;
      phone?: string;
      experience?: string;
      skills?: string[];
      [key: string]: any;
    }
  ): string {
    let processedTemplate = template;

    // Remplacer les variables standard
    const replacements = {
      '{{position}}': variables.position || '[POSTE]',
      '{{company}}': variables.company || '[ENTREPRISE]',
      '{{name}}': variables.name || '[VOTRE NOM]',
      '{{email}}': variables.email || '[VOTRE EMAIL]',
      '{{phone}}': variables.phone || '[VOTRE TÉLÉPHONE]',
      '{{experience}}': variables.experience || '[VOTRE EXPÉRIENCE]',
      '{{skills}}': Array.isArray(variables.skills) ? variables.skills.join(', ') : '[VOS COMPÉTENCES]',
      '{{date}}': new Date().toLocaleDateString('fr-FR'),
      '{{recipient}}': variables.recipient || 'Madame, Monsieur'
    };

    // Appliquer les remplacements
    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
    });

    // Remplacer les variables personnalisées
    Object.entries(variables).forEach(([key, value]) => {
      if (!key.startsWith('{{') && typeof value === 'string') {
        const placeholder = `{{${key}}}`;
        processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
      }
    });

    return processedTemplate.trim();
  }

  /**
   * Obtenir les templates populaires
   */
  static async getPopularTemplates(limit: number = 5): Promise<LetterTemplate[]> {
    try {
      const snapshot = await this.templatesCollection
        .where('isPublic', '==', true)
        .orderBy('useCount', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }) as LetterTemplate);

    } catch (error) {
      console.error('Erreur lors de la récupération des templates populaires:', error);
      throw error;
    }
  }

  /**
   * Obtenir les templates par catégorie
   */
  static async getTemplatesByCategory(
    category: LetterType,
    limit: number = 10
  ): Promise<LetterTemplate[]> {
    try {
      const snapshot = await this.templatesCollection
        .where('isPublic', '==', true)
        .where('type', '==', category)
        .orderBy('rating', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }) as LetterTemplate);

    } catch (error) {
      console.error('Erreur lors de la récupération des templates par catégorie:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'abonnement utilisateur pour validation
   */
  static async getUserSubscription(userId: string): Promise<any> {
    return await SubscriptionService.getActiveUserSubscription(userId);
  }

  // ==========================================
  // MÉTHODES PRIVÉES UTILITAIRES
  // ==========================================

  /**
   * Compter les templates d'un utilisateur
   */
  private static async getUserTemplatesCount(userId: string): Promise<number> {
    const snapshot = await this.templatesCollection
      .where('creatorId', '==', userId)
      .get();
    
    return snapshot.size;
  }

  /**
   * Obtenir le nombre maximum de templates selon l'abonnement
   */
  private static getMaxTemplatesForUser(subscription: any): number {
    if (!subscription || subscription.plan === 'free') {
      return 2; // Plan gratuit : 2 templates personnalisés
    }
    
    if (subscription.plan === 'basic') {
      return 5; // Plan basic : 5 templates personnalisés
    }
    
    if (subscription.plan === 'pro') {
      return 15; // Plan pro : 15 templates personnalisés
    }
    
    return 50; // Plan premium : 50 templates personnalisés
  }

  /**
   * Vérifier l'accès aux fonctionnalités premium
   */
  private static hasFeatureAccess(subscription: any, feature: string): boolean {
    if (!subscription) return false;
    
    const premiumFeatures = ['premium_templates', 'ai_generation', 'analytics'];
    
    if (!premiumFeatures.includes(feature)) return true;
    
    return ['pro', 'premium'].includes(subscription.plan);
  }

   /**
   * Générer le contenu d'un template avec les variables utilisateur
   */
  static generateContent(template: Template, variableValues: Record<string, any>): string {
    let content = '';
    
    template.sections
      .sort((a, b) => a.order - b.order)
      .forEach(section => {
        let sectionContent = section.content;
        
        // Remplacer les variables globales
        template.globalVariables.forEach(variable => {
          const value = variableValues[variable.name] || variable.defaultValue || '';
          sectionContent = sectionContent.replace(
            new RegExp(`{{${variable.name}}}`, 'g'),
            Array.isArray(value) ? value.join(', ') : value
          );
        });
        
        // Remplacer les variables de section
        section.variables.forEach(variable => {
          const value = variableValues[variable.name] || variable.defaultValue || '';
          sectionContent = sectionContent.replace(
            new RegExp(`{{${variable.name}}}`, 'g'),
            Array.isArray(value) ? value.join(', ') : value
          );
        });
        
        content += sectionContent + '\n\n';
      });
    
    return content.trim();
  }
  
  /**
   * Valider les données d'entrée d'un template
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
   * Extraire toutes les variables d'un template
   */
  static extractAllVariables(template: Template): TemplateVariable[] {
    const variables = [...template.globalVariables];
    
    template.sections.forEach(section => {
      variables.push(...section.variables);
    });
    
    return variables;
  }
  
  /**
   * Rechercher des templates par critères
   */
  static searchTemplates(
    templates: Template[],
    filters: {
      type?: TemplateType;
      category?: TemplateCategory;
      industry?: string;
      experienceLevel?: string;
      isPremium?: boolean;
      region?: CVRegion;
      keywords?: string[];
    }
  ): Template[] {
    return templates.filter(template => {
      if (filters.type && template.type !== filters.type) return false;
      if (filters.category && template.category !== filters.category) return false;
      if (filters.industry && !template.industry.includes(filters.industry)) return false;
      if (filters.experienceLevel && template.experienceLevel !== 'any' && template.experienceLevel !== filters.experienceLevel) return false;
      if (filters.isPremium !== undefined && template.isPremium !== filters.isPremium) return false;
      if (filters.region && template.regions && !template.regions.includes(filters.region)) return false;
      
      if (filters.keywords && filters.keywords.length > 0) {
        const templateText = `${template.name} ${template.description} ${template.tags.join(' ')} ${template.keywords.join(' ')}`.toLowerCase();
        const hasKeyword = filters.keywords.some(keyword => 
          templateText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }
      
      return true;
    });
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
}