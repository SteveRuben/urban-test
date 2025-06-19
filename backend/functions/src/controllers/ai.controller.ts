// src/controllers/ai.controller.ts - Version optimisée
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../utils/errors.util';
import { AIModel } from '../models/ai.model';
import { db, COLLECTIONS } from '../config/firebase';
import { ValidationUtil } from '../utils/validation.util';

// Cache en mémoire pour éviter les requêtes répétées
const modelsCache = new Map<string, any>();
const promptSuggestionsCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class AIController {
  /**
   * Générer une lettre de motivation avec l'IA
   * POST /ai/generate-letter
   */
  static async generateCoverLetter(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const {
        jobTitle,
        company,
        jobDescription,
        userProfile,
        model = AIModel.GEMINI_PRO,
        customPrompt,
        tone = 'professional',
        language = 'fr'
      } = req.body;

      // Validation stricte des paramètres
      const validationResult = this.validateGenerationRequest({
        jobTitle, company, model, tone, language
      });
      
      if (!validationResult.isValid) {
        ResponseUtil.validationError(res, validationResult.message);
        return;
      }

      // Sanitiser les données d'entrée
      const sanitizedData = {
        jobTitle: ValidationUtil.sanitizeString(jobTitle),
        company: ValidationUtil.sanitizeString(company),
        jobDescription: jobDescription ? ValidationUtil.sanitizeString(jobDescription) : undefined,
        userProfile: this.sanitizeUserProfile(userProfile),
        model,
        customPrompt: customPrompt ? ValidationUtil.sanitizeString(customPrompt) : undefined,
        tone,
        language
      };

      const result = await AIService.generateCoverLetter(req.user.uid, sanitizedData);

      const processingTime = Date.now() - startTime;

      ResponseUtil.success(res, {
        content: result.content,
        tokensUsed: result.tokensUsed,
        aiResponseId: result.aiResponse.id,
        model: result.aiResponse.model,
        generatedAt: result.aiResponse.createdAt,
        processingTime,
        metadata: {
          tone,
          language,
          hasCustomPrompt: !!customPrompt,
          hasUserProfile: !!userProfile
        }
      }, 'Lettre générée avec succès');

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Log détaillé de l'erreur pour le monitoring
      console.error('Erreur génération IA:', {
        userId: req.user?.uid,
        error: error instanceof Error ? error.message : error,
        processingTime,
        timestamp: new Date().toISOString()
      });

      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      ResponseUtil.serverError(res, 'Erreur lors de la génération de la lettre');
    }
  }

  /**
   * Améliorer une lettre existante avec optimisations
   * POST /ai/improve-letter/:letterId
   */
  static async improveLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { letterId } = req.params;
      const { focus, instructions, model = AIModel.GEMINI_PRO } = req.body;

      if (!ValidationUtil.isValidObjectId(letterId)) {
        ResponseUtil.validationError(res, 'ID de lettre invalide');
        return;
      }

      // Validation du focus
      const validFocus = ['clarity', 'impact', 'grammar', 'style', 'structure'];
      if (focus && !validFocus.includes(focus)) {
        ResponseUtil.validationError(res, `Focus invalide. Utilisez: ${validFocus.join(', ')}`);
        return;
      }

      const sanitizedInstructions = instructions ? 
        ValidationUtil.sanitizeString(instructions) : undefined;

      const improvement = await AIService.improveLetter(req.user.uid, letterId, {
        focus,
        instructions: sanitizedInstructions,
        model
      });

      ResponseUtil.success(res, {
        ...improvement,
        metadata: {
          focus,
          hasCustomInstructions: !!instructions,
          model
        }
      }, 'Améliorations générées avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur amélioration lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'amélioration de la lettre');
    }
  }

  /**
   * Obtenir les statistiques d'utilisation IA avec cache
   * GET /ai/stats
   */
  static async getAIStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const stats = await AIService.getUserAIStats(req.user.uid);

      // Enrichir les statistiques avec des données calculées
      const enrichedStats = {
        ...stats,
        efficiency: {
          averageTokensPerGeneration: stats.totalUsage > 0 ? 
            Math.round(stats.monthlyKeys / stats.totalUsage) : 0,
          costEfficiency: stats.totalCost > 0 ? 
            Math.round((stats.totalUsage / stats.totalCost) * 100) / 100 : 0
        },
        trends: {
          isIncreasing: stats.monthlyUsage > (stats.totalUsage * 0.3),
          recommendation: this.getUsageRecommendation(stats)
        }
      };

      ResponseUtil.success(res, enrichedStats, 'Statistiques IA récupérées');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur stats IA:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des statistiques');
    }
  }

  /**
   * Obtenir l'historique avec pagination optimisée
   * GET /ai/history
   */
  static async getAIHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as string) || 'desc';

      // Validation des paramètres de tri
      const validSortFields = ['createdAt', 'tokens', 'model'] as const;
      type ValidSortField = typeof validSortFields[number];
      
      if (!validSortFields.includes(sortBy as ValidSortField)) {
        ResponseUtil.validationError(res, `Tri invalide. Utilisez: ${validSortFields.join(', ')}`);
        return;
      }
       
      const history = await AIService.getUserAIHistory(req.user.uid, limit, offset, {
        sortBy: sortBy as ValidSortField,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      ResponseUtil.success(res, {
        history,
        pagination: {
          limit,
          offset,
          count: history.length,
          hasMore: history.length === limit,
          nextOffset: history.length === limit ? offset + limit : null
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }, 'Historique IA récupéré');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur historique IA:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération de l\'historique');
    }
  }

  /**
   * Obtenir les modèles IA avec cache intelligent
   * GET /ai/models
   */
  static async getAvailableModels(req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = 'ai_models';
      const cached = modelsCache.get(cacheKey) as CacheEntry<any>;
      
      // Vérifier le cache
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        ResponseUtil.success(res, cached.data, 'Modèles IA disponibles (cache)');
        return;
      }

      const models = [
        {
          id: AIModel.GEMINI_PRO,
          name: 'Gemini Pro',
          description: 'Modèle avancé de Google pour la génération de texte',
          capabilities: [
            'Génération de lettres de motivation',
            'Amélioration de textes',
            'Support multilingue (FR/EN)',
            'Différents tons disponibles'
          ],
          pricing: {
            costPer1000Tokens: 0.5,
            currency: 'EUR'
          },
          available: !!process.env.AI_API_KEY,
          recommended: true,
          performance: {
            averageResponseTime: '2-4s',
            qualityScore: 4.5,
            reliabilityScore: 4.8
          }
        },
        {
          id: AIModel.GPT_4,
          name: 'GPT-4',
          description: 'Modèle avancé d\'OpenAI (à venir)',
          capabilities: [
            'Génération de lettres de motivation',
            'Amélioration de textes',
            'Support multilingue',
            'Analyse approfondie'
          ],
          pricing: {
            costPer1000Tokens: 3.0,
            currency: 'EUR'
          },
          available: false,
          comingSoon: true,
          performance: {
            averageResponseTime: '3-6s',
            qualityScore: 4.7,
            reliabilityScore: 4.6
          }
        }
      ];

      const responseData = { 
        models,
        metadata: {
          totalModels: models.length,
          availableModels: models.filter(m => m.available).length,
          lastUpdated: new Date().toISOString()
        }
      };

      // Mettre en cache
      modelsCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      ResponseUtil.success(res, responseData, 'Modèles IA disponibles');

    } catch (error) {
      console.error('Erreur récupération modèles:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des modèles');
    }
  }

  /**
   * Suggestions de prompts avec filtrage intelligent
   * GET /ai/prompt-suggestions
   */
  static async getPromptSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { jobTitle, industry, level, language = 'fr' } = req.query;
      const cacheKey = `prompts_${industry}_${level}_${language}`;
      
      const cached = promptSuggestionsCache.get(cacheKey) as CacheEntry<any>;
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        ResponseUtil.success(res, cached.data, 'Suggestions de prompts (cache)');
        return;
      }

      const suggestions = await this.buildPromptSuggestions(language as string);

      // Filtrage intelligent
      let filtered = suggestions;
      
      if (industry) {
        filtered = filtered.filter(s => 
          !s.industry || s.industry.includes(industry as string)
        );
      }

      /* if (level) {
        filtered = filtered.filter(s => 
          !s.level || s.level === level
        );
      } */

      // Tri par pertinence
      filtered.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return a.name.localeCompare(b.name);
      });

      const responseData = {
        suggestions: filtered,
        filters: { jobTitle, industry, level, language },
        metadata: {
          totalSuggestions: suggestions.length,
          filteredCount: filtered.length,
          appliedFilters: [industry, level].filter(Boolean).length
        }
      };

      // Cache
      promptSuggestionsCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      ResponseUtil.success(res, responseData, 'Suggestions de prompts récupérées');

    } catch (error) {
      console.error('Erreur suggestions prompts:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des suggestions');
    }
  }

  /**
   * Analyser une lettre avec IA réelle
   * POST /ai/analyze-letter/:letterId
   */
  static async analyzeLetter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { letterId } = req.params;

      if (!ValidationUtil.isValidObjectId(letterId)) {
        ResponseUtil.validationError(res, 'ID de lettre invalide');
        return;
      }

      // Récupérer la lettre pour analyse
      const letterDoc = await db.collection(COLLECTIONS.LETTERS).doc(letterId).get();
      
      if (!letterDoc.exists || letterDoc.data()?.userId !== req.user.uid) {
        ResponseUtil.notFound(res, 'Lettre non trouvée');
        return;
      }

      const letter = letterDoc.data();
      if (!letter || !letter.content) {
        ResponseUtil.notFound(res, 'Lettre ou contenu de lettre non trouvé');
        return;
      }
      const analysis = await AIService.analyzeLetter(req.user.uid, letterId, letter.content);

      // Sauvegarder l'analyse en BD
      const analysisId = db.collection('letter_analyses').doc().id;
      const analysisData = {
        id: analysisId,
        letterId,
        userId: req.user.uid,
        ...analysis,
        createdAt: new Date(),
        metadata: {
          letterLength: letter.content.length,
          hasJobTitle: !!letter.jobTitle,
          hasCompany: !!letter.company
        }
      };

      await db.collection('letter_analyses').doc(analysisId).set(analysisData);

      ResponseUtil.success(res, {
        analysisId,
        ...analysis
      }, 'Analyse de lettre effectuée');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur analyse lettre:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'analyse de la lettre');
    }
  }

  /**
   * Feedback avec sauvegarde optimisée
   * POST /ai/feedback/:responseId
   */
  static async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.uid) {
        ResponseUtil.unauthorized(res, 'Utilisateur non authentifié');
        return;
      }

      const { responseId } = req.params;
      const { rating, feedback, improvementSuggestions, categories } = req.body;

      if (!ValidationUtil.isValidObjectId(responseId)) {
        ResponseUtil.validationError(res, 'ID de réponse IA invalide');
        return;
      }

      if (!rating || rating < 1 || rating > 5) {
        ResponseUtil.validationError(res, 'Note requise (1-5)');
        return;
      }

      // Vérifier que la réponse IA existe et appartient à l'utilisateur
      const aiResponseDoc = await db.collection(COLLECTIONS.AI_RESPONSES).doc(responseId).get();
      
      if (!aiResponseDoc.exists || aiResponseDoc.data()?.userId !== req.user.uid) {
        ResponseUtil.notFound(res, 'Réponse IA non trouvée');
        return;
      }

      const feedbackId = db.collection('ai_feedback').doc().id;
      const feedbackData = {
        id: feedbackId,
        userId: req.user.uid,
        generationId: responseId,
        rating: parseInt(rating),
        feedback: feedback ? ValidationUtil.sanitizeString(feedback) : '',
        improvementSuggestions: improvementSuggestions ? 
          ValidationUtil.sanitizeString(improvementSuggestions) : '',
        categories: Array.isArray(categories) ? categories : [],
        createdAt: new Date(),
        metadata: {
          hasDetailedFeedback: !!(feedback && feedback.length > 10),
          hasSuggestions: !!(improvementSuggestions && improvementSuggestions.length > 5),
          responseModel: aiResponseDoc.data()?.model
        }
      };

      // Sauvegarder en parallèle
      await Promise.all([
        db.collection('ai_feedback').doc(feedbackId).set(feedbackData),
        // Mettre à jour les stats de la réponse IA
        db.collection(COLLECTIONS.AI_RESPONSES).doc(responseId).update({
          rating: feedbackData.rating,
          feedback: feedbackData.feedback,
          updatedAt: new Date()
        })
      ]);

      ResponseUtil.success(res, { 
        feedbackId,
        submitted: true,
        rating: feedbackData.rating
      }, 'Feedback enregistré avec succès');

    } catch (error) {
      if (error instanceof AppError) {
        ResponseUtil.error(res, error.message, error.statusCode);
        return;
      }

      console.error('Erreur enregistrement feedback:', error);
      ResponseUtil.serverError(res, 'Erreur lors de l\'enregistrement du feedback');
    }
  }

  /**
   * Conseils d'écriture personnalisés et intelligents
   * GET /ai/writing-tips
   */
  static async getWritingTips(req: Request, res: Response): Promise<void> {
    try {
      const { industry, experience, language = 'fr', personalized } = req.query;
      
      let tips = await this.buildWritingTips(language as string);
      let personalizedTips: string[] = [];

      // Personnalisation basée sur l'historique utilisateur
      if (personalized === 'true' && req.user?.uid) {
        personalizedTips = await this.getPersonalizedTips(req.user.uid);
      }

      // Filtrage par industrie
      if (industry && tips.industry[industry as keyof typeof tips.industry]) {
        const industryTips = tips.industry[industry as keyof typeof tips.industry];
        tips.general = [...tips.general, ...industryTips];
      }

      // Adaptation selon l'expérience
      if (experience) {
        tips.general = this.adaptTipsToExperience(tips.general, experience as string);
      }

      const responseData = {
        tips: tips.general,
        personalizedTips,
        filters: { industry, experience, language },
        metadata: {
          totalTips: tips.general.length,
          hasPersonalization: personalizedTips.length > 0,
          adaptedForExperience: !!experience
        }
      };

      ResponseUtil.success(res, responseData, 'Conseils d\'écriture récupérés');

    } catch (error) {
      console.error('Erreur conseils écriture:', error);
      ResponseUtil.serverError(res, 'Erreur lors de la récupération des conseils');
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES UTILITAIRES
  // ==========================================

  /**
   * Validation stricte des paramètres de génération
   */
  private static validateGenerationRequest(params: any): { isValid: boolean; message?: string } {
    if (!params.jobTitle || params.jobTitle.trim().length < 2) {
      return { isValid: false, message: 'Le titre du poste doit contenir au moins 2 caractères' };
    }

    if (!params.company || params.company.trim().length < 2) {
      return { isValid: false, message: 'Le nom de l\'entreprise doit contenir au moins 2 caractères' };
    }

    if (params.model && !Object.values(AIModel).includes(params.model)) {
      return { isValid: false, message: 'Modèle IA invalide' };
    }

    const validTones = ['professional', 'casual', 'enthusiastic', 'formal'];
    if (params.tone && !validTones.includes(params.tone)) {
      return { isValid: false, message: `Ton invalide. Utilisez: ${validTones.join(', ')}` };
    }

    const validLanguages = ['fr', 'en'];
    if (params.language && !validLanguages.includes(params.language)) {
      return { isValid: false, message: 'Langue invalide. Utilisez: fr ou en' };
    }

    return { isValid: true };
  }

  /**
   * Sanitiser le profil utilisateur
   */
  private static sanitizeUserProfile(profile: any): any {
    if (!profile) return undefined;

    return {
      name: profile.name ? ValidationUtil.sanitizeString(profile.name) : undefined,
      experience: profile.experience ? ValidationUtil.sanitizeString(profile.experience) : undefined,
      skills: Array.isArray(profile.skills) ? 
        profile.skills.map((s: string) => ValidationUtil.sanitizeString(s)).filter(Boolean) : undefined,
      education: profile.education ? ValidationUtil.sanitizeString(profile.education) : undefined,
      achievements: Array.isArray(profile.achievements) ? 
        profile.achievements.map((a: string) => ValidationUtil.sanitizeString(a)).filter(Boolean) : undefined
    };
  }

  /**
   * Recommandation basée sur l'utilisation
   */
  private static getUsageRecommendation(stats: any): string {
    if (stats.monthlyUsage === 0) {
      return 'Commencez par générer votre première lettre avec l\'IA';
    }
    
    if (stats.successRate < 80) {
      return 'Essayez d\'affiner vos prompts pour de meilleurs résultats';
    }
    
    if (stats.monthlyUsage > 15) {
      return 'Considérez un abonnement supérieur pour plus de générations';
    }
    
    return 'Continuez à utiliser l\'IA pour optimiser vos candidatures';
  }

  /**
   * Construction des suggestions de prompts
   */
  private static async buildPromptSuggestions(language: string) {
    // Cette fonction pourrait être enrichie avec des données de BD
    return [
      {
        id: 'professional-standard',
        name: language === 'en' ? 'Professional Standard' : 'Professionnel Standard',
        description: language === 'en' ? 
          'Classic professional cover letter' : 
          'Lettre professionnelle classique',
        prompt: language === 'en' ? 
          'Write a professional and structured cover letter' : 
          'Rédigez une lettre de motivation professionnelle et structurée',
        tags: ['professionnel', 'standard', 'classique'],
        recommended: true,
        usageCount: 1250
      },
      {
        id: 'tech-focused',
        name: language === 'en' ? 'Tech Focused' : 'Orienté Technique',
        description: language === 'en' ? 
          'Letter focused on technical skills' : 
          'Lettre axée sur les compétences techniques',
        prompt: language === 'en' ? 
          'Write a letter emphasizing technical skills and innovation' : 
          'Rédigez une lettre mettant l\'accent sur les compétences techniques et l\'innovation',
        tags: ['technique', 'innovation', 'it'],
        industry: ['tech', 'it', 'software'],
        usageCount: 890
      }
      // Ajouter d'autres suggestions...
    ];
  }

  /**
   * Construction des conseils d'écriture
   */
  private static async buildWritingTips(language: string) {
    return language === 'en' ? {
      general: [
        'Start with a compelling opening that grabs attention',
        'Quantify your achievements with specific numbers',
        'Research the company and mention specific details',
        'Use active voice instead of passive voice',
        'Keep paragraphs short and focused'
      ],
      industry: {
        tech: [
          'Highlight your technical stack and certifications',
          'Mention open-source contributions or projects',
          'Show problem-solving abilities with examples'
        ],
        marketing: [
          'Showcase campaign results and metrics',
          'Demonstrate creativity with portfolio examples'
        ]
      }
    } : {
      general: [
        'Commencez par une accroche qui attire l\'attention',
        'Quantifiez vos réalisations avec des chiffres précis',
        'Recherchez l\'entreprise et mentionnez des détails spécifiques',
        'Utilisez la voix active plutôt que passive',
        'Gardez des paragraphes courts et focalisés'
      ],
      industry: {
        tech: [
          'Mettez en avant votre stack technique et certifications',
          'Mentionnez vos contributions open-source ou projets',
          'Montrez vos capacités de résolution de problèmes'
        ],
        marketing: [
          'Présentez les résultats de vos campagnes avec métriques',
          'Démontrez votre créativité avec des exemples concrets'
        ]
      }
    };
  }

  /**
   * Conseils personnalisés basés sur l'historique
   */
  private static async getPersonalizedTips(userId: string): Promise<string[]> {
    try {
      // Analyser l'historique IA de l'utilisateur
      const history = await AIService.getUserAIHistory(userId, 5, 0);
      const tips: string[] = [];

      if (history.length === 0) {
        tips.push('Commencez par générer votre première lettre pour obtenir des conseils personnalisés');
      } else {
        // Analyser les patterns d'utilisation
        const models = history.map(h => h.model);
        const mostUsedModel = models.reduce((a, b, i, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );

        tips.push(`Vous utilisez principalement ${mostUsedModel}. Essayez d'autres modèles pour varier.`);
        
        if (history.some(h => h.rating && h.rating < 4)) {
          tips.push('Enrichissez vos prompts avec plus de détails sur votre expérience');
        }
      }

      return tips;
    } catch (error) {
      console.error('Erreur conseils personnalisés:', error);
      return [];
    }
  }

  /**
   * Adapter les conseils selon l'expérience
   */
  private static adaptTipsToExperience(tips: string[], experience: string): string[] {
    if (experience === 'junior' || experience === 'entry') {
      return [
        'Mettez l\'accent sur votre formation et vos projets académiques',
        'Montrez votre motivation et votre capacité d\'apprentissage',
        ...tips
      ];
    } else if (experience === 'senior' || experience === 'expert') {
      return [
        'Mettez en avant vos réalisations managériales',
        'Quantifiez l\'impact de vos décisions stratégiques',
        ...tips
      ];
    }
    
    return tips;
  }
}