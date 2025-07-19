// src/services/ai.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, COLLECTIONS } from '../config/firebase';
import { 
  AIModel, 
  AIGenerationRequest, 
  AIGenerationResponse, 
  AIUsageLog, 
  AILetterImprovement 
} from '../models/ai.model';
import { Letter } from '../models/letter.model';
import { NotFoundError, ValidationError, ForbiddenError, AppError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';
import { logger } from 'firebase-functions';
import { CV, CVAnalysis, CVRegion, JobMatching } from '../models/cv.model';
import { Template } from '../models/template.model';

export class AIService {
 
  private static geminiAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
  private static aiUsageCollection = db.collection(COLLECTIONS.AI_USAGE);
  private static aiResponsesCollection = db.collection(COLLECTIONS.AI_RESPONSES);
  
  /**
   * Générer une lettre de motivation avec l'IA
   */
  static async generateCoverLetter(
    userId: string,
    request: {
      jobTitle: string;
      company: string;
      jobDescription?: string;
      userProfile?: {
        name?: string;
        experience?: string;
        skills?: string[];
        education?: string;
        achievements?: string[];
      };
      model?: AIModel;
      customPrompt?: string;
      tone?: 'professional' | 'casual' | 'enthusiastic' | 'formal';
      language?: 'fr' | 'en';
    }
  ): Promise<{
    content: string;
    aiResponse: AIGenerationResponse;
    tokensUsed: number;
  }> {
    try {
      // Vérifier les limites d'utilisation
      logger.debug('Initialisation du service AI avec Gemini', { userId, request });
      const usageCheck = await SubscriptionService.checkAIUsageLimit(userId);
      if (!usageCheck.canUse) {
        throw new ForbiddenError(
          `Limite d'utilisation IA atteinte (${usageCheck.currentUsage}/${usageCheck.limit}). Mettez à niveau votre abonnement.`
        );
      }

      // Validation des paramètres
      const requiredFields = ['jobTitle', 'company'];
      const missingFields = ValidationUtil.validateRequiredFields(request, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      const model = request.model || AIModel.GEMINI_FLASH_2_0;
      const tone = request.tone || 'professional';
      const language = request.language || 'fr';

      // Construire le prompt
      const prompt = request.customPrompt || this.buildCoverLetterPrompt(request, tone, language);

      // Enregistrer la requête
      const aiRequest = await this.logAIRequest(userId, {
        jobPosition: request.jobTitle,
        company: request.company,
        model,
        promptTemplate: prompt,
        userData: request.userProfile
      });

      // Générer le contenu avec le modèle sélectionné
      let generatedContent: string;
      let tokensUsed: number;

      logger.debug('Génération de la lettre IA', { userId, model, prompt });
      switch (model) {
        case AIModel.GEMINI_PRO:
          // Use Gemini 2.5 Pro for the premium model
          const geminiProResult = await this.generateWithGemini(prompt, 'gemini-2.5-pro');
          generatedContent = geminiProResult.content;
          tokensUsed = geminiProResult.tokensUsed;
          break;
        
        case AIModel.GEMINI_FLASH_2_0:
          // Use Gemini 2.5 Flash for the flash model
          const flashResult = await this.generateWithGemini(prompt, 'gemini-2.5-flash');
          generatedContent = flashResult.content;
          tokensUsed = flashResult.tokensUsed;
          logger.debug('Contenu généré avec Gemini 2.5 Flash', { content: generatedContent, tokensUsed });
          break;
          
        case AIModel.GEMINI_2_0_FLASH:
          // Use Gemini 2.0 Flash
          const flash2Result = await this.generateWithGemini(prompt, 'gemini-2.0-flash');
          generatedContent = flash2Result.content;
          tokensUsed = flash2Result.tokensUsed;
          break;
          
        case AIModel.GPT_4:
          // TODO: Implémenter l'intégration OpenAI
          throw new AppError('OpenAI GPT-4 non encore implémenté', 501);
        
        default:
          // Default to Gemini 2.5 Flash
          const defaultResult = await this.generateWithGemini(prompt, 'gemini-2.5-flash');
          generatedContent = defaultResult.content;
          tokensUsed = defaultResult.tokensUsed;
      }

      // Enregistrer la réponse
      const aiResponse = await this.logAIResponse(aiRequest.id, userId, {
        content: generatedContent,
        model,
        tokens: tokensUsed
      });

      // Incrémenter l'utilisation
      await SubscriptionService.incrementAIUsage(userId);
      logger.debug('Incrémentation de l\'utilisation IA', { userId, model, tokensUsed });
      // Enregistrer l'usage pour la facturation/analytics
      await this.logAIUsage(userId, model, tokensUsed, true);

      return {
        content: generatedContent,
        aiResponse,
        tokensUsed
      };

    } catch (error) {
      console.error('Erreur lors de la génération de lettre IA:', error);
      
      // Enregistrer l'erreur pour analyse
      if (error instanceof AppError) {
        await this.logAIUsage(userId, request.model || AIModel.GEMINI_FLASH_2_0, 0, false, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Améliorer une lettre existante avec l'IA
   */
  static async improveLetter(
    userId: string,
    letterId: string,
    improvements: {
      focus?: 'clarity' | 'impact' | 'grammar' | 'style' | 'structure';
      instructions?: string;
      model?: AIModel;
    }
  ): Promise<AILetterImprovement> {
    try {
      // Vérifier les limites
      const usageCheck = await SubscriptionService.checkAIUsageLimit(userId);
      if (!usageCheck.canUse) {
        throw new ForbiddenError('Limite d\'utilisation IA atteinte');
      }

      // Récupérer la lettre
      const letterDoc = await db.collection(COLLECTIONS.LETTERS).doc(letterId).get();
      if (!letterDoc.exists || letterDoc.data()?.userId !== userId) {
        throw new NotFoundError('Lettre non trouvée');
      }

      const letter = letterDoc.data() as Letter;
      const model = improvements.model || AIModel.GEMINI_FLASH_2_0;

      // Construire le prompt d'amélioration
      const prompt = this.buildImprovementPrompt(letter.content, improvements);

      // Générer les améliorations - use appropriate model
      const geminiModel = this.getGeminiModelName(model);
      const result = await this.generateWithGemini(prompt, geminiModel);

      // Créer l'enregistrement d'amélioration
      const improvementId = db.collection(COLLECTIONS.AI_RESPONSES).doc().id;
      const improvement: AILetterImprovement = {
        id: improvementId,
        letterId,
        userId,
        originalContent: letter.content,
        suggestedContent: result.content,
        improvements: this.parseImprovements(result.content),
        applied: false,
        createdAt: new Date()
      };

      await db.collection('ai_improvements').doc(improvementId).set(improvement);

      // Incrémenter l'utilisation
      await SubscriptionService.incrementAIUsage(userId);
      await this.logAIUsage(userId, model, result.tokensUsed, true);

      return improvement;

    } catch (error) {
      console.error('Erreur lors de l\'amélioration de lettre:', error);
      throw error;
    }
  }

  /**
   * Get the correct Gemini model name based on AIModel enum
   */
  private static getGeminiModelName(model: AIModel): string {
    switch (model) {
      case AIModel.GEMINI_PRO:
        return 'gemini-2.5-pro';
      case AIModel.GEMINI_FLASH_2_0:
        return 'gemini-2.5-flash';
      case AIModel.GEMINI_2_0_FLASH:
        return 'gemini-2.0-flash';
      default:
        return 'gemini-2.5-flash'; // Default to 2.5 Flash
    }
  }

  /**
   * Générer du contenu avec Gemini
   */
  private static async generateWithGemini(prompt: string, modelName: string): Promise<{
    content: string;
    tokensUsed: number;
  }> {
    try {
      logger.debug('Génération avec Gemini', { modelName, promptLength: prompt.length });
      
      const model = this.geminiAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      // Get actual token usage if available, otherwise estimate
      let tokensUsed = 0;
      try {
        const usageMetadata = response.usageMetadata;
        tokensUsed = usageMetadata?.totalTokenCount || 0;
      } catch (error) {
        // Fallback to estimation if usage metadata is not available
        tokensUsed = Math.ceil((prompt.length + content.length) / 4);
      }

      logger.debug('Génération Gemini réussie', { 
        modelName, 
        contentLength: content.length, 
        tokensUsed 
      });

      return {
        content: content.trim(),
        tokensUsed
      };

    } catch (error: any) {
      console.error('Erreur Gemini:', error);
      
      // Handle specific Gemini API errors
      if (error.status === 404) {
        throw new AppError(`Modèle ${modelName} non disponible. Veuillez utiliser un modèle plus récent.`, 400);
      } else if (error.status === 429) {
        throw new AppError('Limite de taux dépassée. Veuillez réessayer plus tard.', 429);
      } else if (error.status === 403) {
        throw new AppError('Accès refusé à l\'API Gemini. Vérifiez votre clé API.', 403);
      }
      
      throw new AppError('Erreur lors de la génération avec Gemini', 500);
    }
  }

  /**
   * Construire le prompt pour la génération de lettre
   */
  private static buildCoverLetterPrompt(
    request: {
      jobTitle: string;
      company: string;
      jobDescription?: string;
      userProfile?: any;
    },
    tone: string,
    language: string
  ): string {
    const isEnglish = language === 'en';
    
    let prompt = isEnglish 
      ? `Write a professional cover letter for the position of "${request.jobTitle}" at "${request.company}".`
      : `Rédigez une lettre de motivation professionnelle pour le poste de "${request.jobTitle}" chez "${request.company}".`;

    // Ajouter le profil utilisateur si disponible
    if (request.userProfile) {
      const profile = request.userProfile;
      
      if (isEnglish) {
        prompt += `\n\nCandidate profile:`;
        if (profile.name) prompt += `\n- Name: ${profile.name}`;
        if (profile.experience) prompt += `\n- Experience: ${profile.experience}`;
        if (profile.skills) prompt += `\n- Skills: ${profile.skills.join(', ')}`;
        if (profile.education) prompt += `\n- Education: ${profile.education}`;
        if (profile.achievements) prompt += `\n- Key achievements: ${profile.achievements.join(', ')}`;
      } else {
        prompt += `\n\nProfil du candidat :`;
        if (profile.name) prompt += `\n- Nom : ${profile.name}`;
        if (profile.experience) prompt += `\n- Expérience : ${profile.experience}`;
        if (profile.skills) prompt += `\n- Compétences : ${profile.skills.join(', ')}`;
        if (profile.education) prompt += `\n- Formation : ${profile.education}`;
        if (profile.achievements) prompt += `\n- Réalisations clés : ${profile.achievements.join(', ')}`;
      }
    }

    // Ajouter la description du poste si disponible
    if (request.jobDescription) {
      prompt += isEnglish
        ? `\n\nJob description:\n${request.jobDescription}`
        : `\n\nDescription du poste :\n${request.jobDescription}`;
    }

    // Instructions selon le tone
    const toneInstructions = {
      professional: isEnglish ? 'Use a professional and formal tone.' : 'Utilisez un ton professionnel et formel.',
      casual: isEnglish ? 'Use a friendly but professional tone.' : 'Utilisez un ton amical mais professionnel.',
      enthusiastic: isEnglish ? 'Show enthusiasm and passion for the role.' : 'Montrez de l\'enthousiasme et de la passion pour le poste.',
      formal: isEnglish ? 'Use a very formal and traditional tone.' : 'Utilisez un ton très formel et traditionnel.'
    };

    prompt += `\n\n${toneInstructions[tone as keyof typeof toneInstructions]}`;

    // Instructions finales
    if (isEnglish) {
      prompt += `\n\nRequirements:
- Write a complete cover letter with proper structure
- Include an engaging opening, compelling body paragraphs, and strong closing
- Highlight relevant skills and experience
- Show knowledge of the company
- Keep it concise (around 300-400 words)
- Use proper business letter format`;
    } else {
      prompt += `\n\nExigences :
- Rédigez une lettre de motivation complète avec une structure appropriée
- Incluez une ouverture engageante, des paragraphes de corps convaincants et une conclusion forte
- Mettez en valeur les compétences et l'expérience pertinentes
- Montrez la connaissance de l'entreprise
- Restez concis (environ 300-400 mots)
- Utilisez le format approprié d'une lettre commerciale`;
    }

    return prompt;
  }

  /**
   * Construire le prompt pour l'amélioration de lettre
   */
  private static buildImprovementPrompt(
    originalContent: string,
    improvements: {
      focus?: string;
      instructions?: string;
    }
  ): string {
    let prompt = `Analysez et améliorez cette lettre de motivation :\n\n${originalContent}\n\n`;

    if (improvements.focus) {
      const focusInstructions = {
        clarity: 'Concentrez-vous sur la clarté et la lisibilité du texte.',
        impact: 'Renforcez l\'impact et la persuasion du message.',
        grammar: 'Corrigez la grammaire, l\'orthographe et la syntaxe.',
        style: 'Améliorez le style d\'écriture et le flow.',
        structure: 'Optimisez la structure et l\'organisation du contenu.'
      };
      
      prompt += focusInstructions[improvements.focus as keyof typeof focusInstructions] + '\n\n';
    }

    if (improvements.instructions) {
      prompt += `Instructions spécifiques : ${improvements.instructions}\n\n`;
    }

    prompt += `Fournissez :
1. La version améliorée de la lettre
2. Un résumé des améliorations apportées
3. Des suggestions additionnelles si nécessaire

Format de réponse :
LETTRE AMÉLIORÉE:
[lettre améliorée ici]

AMÉLIORATIONS APPORTÉES:
[liste des améliorations]`;

    return prompt;
  }

  /**
   * Parser les améliorations depuis la réponse IA
   */
  private static parseImprovements(content: string): Array<{
    category: 'clarity' | 'impact' | 'grammar' | 'style' | 'structure';
    description: string;
  }> {
    // Simple parsing - à améliorer selon le format de réponse
    const improvements: Array<{
      category: 'clarity' | 'impact' | 'grammar' | 'style' | 'structure';
      description: string;
    }> = [];
    
    if (content.includes('clarté') || content.includes('clarity')) {
      improvements.push({
        category: 'clarity',
        description: 'Amélioration de la clarté du texte'
      });
    }
    
    if (content.includes('impact') || content.includes('persuasion')) {
      improvements.push({
        category: 'impact',
        description: 'Renforcement de l\'impact du message'
      });
    }
    
    // Ajouter d'autres patterns selon les besoins
    
    return improvements;
  }

  /**
   * Enregistrer une requête IA
   */
  private static async logAIRequest(
    userId: string,
    requestData: {
      jobPosition: string;
      company: string;
      model: AIModel;
      promptTemplate?: string;
      userData?: any;
    }
  ): Promise<AIGenerationRequest> {
    const requestId = this.aiUsageCollection.doc().id;
    const request: Partial<AIGenerationRequest> = {
      userId,
      promptTemplate: requestData.promptTemplate,
      model: requestData.model,
      jobPosition: requestData.jobPosition,
      company: requestData.company,
      userData: requestData.userData,
      createdAt: new Date()
    };

    await db.collection('ai_requests').doc(requestId).set({ ...request, id: requestId });
    return { ...request, id: requestId, userId: userId as string } as AIGenerationRequest;
  }

  /**
   * Enregistrer une réponse IA
   */
  private static async logAIResponse(
    requestId: string,
    userId: string,
    responseData: {
      content: string;
      model: AIModel;
      tokens: number;
    }
  ): Promise<AIGenerationResponse> {
    const responseId = this.aiResponsesCollection.doc().id;
    const response: AIGenerationResponse = {
      id: responseId,
      requestId,
      userId,
      content: responseData.content,
      model: responseData.model,
      tokens: responseData.tokens,
      processingTime: 0, // À calculer si nécessaire
      createdAt: new Date()
    };

    await this.aiResponsesCollection.doc(responseId).set(response);
    return response;
  }

  /**
   * Enregistrer l'utilisation IA pour analytics/facturation
   */
  private static async logAIUsage(
    userId: string,
    model: AIModel,
    tokens: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const usageId = this.aiUsageCollection.doc().id;
    const usage: AIUsageLog = {
      id: usageId,
      userId,
      model,
      promptTokens: Math.floor(tokens * 0.7), // Estimation
      completionTokens: Math.floor(tokens * 0.3), // Estimation
      totalTokens: tokens,
      cost: this.calculateCost(model, tokens),
      success,
      errorMessage: errorMessage || '',
      createdAt: new Date()
    };
    logger.debug('Enregistrement de l\'utilisation IA', {usage});
    await this.aiUsageCollection.doc(usageId).set(usage);
  }

  /**
   * Calculer le coût d'utilisation
   */
  private static calculateCost(model: AIModel, tokens: number): number {
    // Prix en centimes - updated for new models
    const pricing = {
      [AIModel.GEMINI_PRO]: 0.7, // Gemini 2.5 Pro pricing
      [AIModel.GEMINI_FLASH_2_0]: 0.075, // Gemini 2.5 Flash pricing  
      [AIModel.GEMINI_2_0_FLASH]: 0.075, // Gemini 2.0 Flash pricing
      [AIModel.GPT_4]: 3.0, // 0.03€ per 1000 tokens
      [AIModel.CUSTOM]: 1.0
    };

    return Math.ceil((tokens / 1000) * (pricing[model] || 0.075));
  }

  /**
   * Obtenir les statistiques d'utilisation IA d'un utilisateur
   */
  static async getUserAIStats(userId: string): Promise<{
    totalUsage: number;
    monthlyUsage: number;
    totalCost: number;
    monthlyKeys: number;
    favoriteModel: AIModel;
    successRate: number;
  }> {
    try {
      const snapshot = await this.aiUsageCollection
        .where('userId', '==', userId)
        .get();

      const usages = snapshot.docs.map(doc => doc.data() as AIUsageLog);
      
      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM
      
      const monthlyUsages = usages.filter(usage => 
        usage.createdAt.toISOString().substring(0, 7) === currentMonth
      );

      // Calculer les statistiques
      const totalUsage = usages.length;
      const monthlyUsage = monthlyUsages.length;
      const totalCost = usages.reduce((sum, usage) => sum + usage.cost, 0);
      const monthlyKeys = monthlyUsages.reduce((sum, usage) => sum + usage.totalTokens, 0);
      
      // Modèle favori
      const modelCounts = usages.reduce((acc, usage) => {
        acc[usage.model] = (acc[usage.model] || 0) + 1;
        return acc;
      }, {} as Record<AIModel, number>);
      
      const favoriteModel = Object.entries(modelCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as AIModel || AIModel.GEMINI_FLASH_2_0;

      // Taux de succès
      const successfulUsages = usages.filter(usage => usage.success).length;
      const successRate = totalUsage > 0 ? (successfulUsages / totalUsage) * 100 : 100;

      return {
        totalUsage,
        monthlyUsage,
        totalCost,
        monthlyKeys,
        favoriteModel,
        successRate
      };

    } catch (error) {
      console.error('Erreur lors du calcul des stats IA:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des générations IA
   */
  static async getUserAIHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0,
    options?: {
      sortBy?: 'createdAt' | 'tokens' | 'model';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<AIGenerationResponse[]> {
    try {
       
      const sortBy = options?.sortBy || 'createdAt';
      const sortOrder = options?.sortOrder || 'desc';
      const snapshot = await this.aiResponsesCollection
        .where('userId', '==', userId)
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data() as AIGenerationResponse;
        return {
          ...data,
          createdAt: data.createdAt
        };
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique IA:', error);
      throw error;
    }
  }

  /**
   * Analyser une lettre de motivation avec l'IA
   */
  static async analyzeLetter(
    userId: string,
    letterId: string,
    letterContent: string
  ): Promise<{
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    readabilityScore: number;
    impactScore: number;
    structureScore: number;
    keywordMatch: number;
    detailedAnalysis: {
      opening: { score: number; feedback: string };
      body: { score: number; feedback: string };
      closing: { score: number; feedback: string };
      tone: { score: number; feedback: string };
      personalization: { score: number; feedback: string };
    };
  }> {
    try {
      // Vérifier les limites d'utilisation
      const usageCheck = await SubscriptionService.checkAIUsageLimit(userId);
      if (!usageCheck.canUse) {
        throw new ForbiddenError('Limite d\'utilisation IA atteinte');
      }

      // Construire le prompt d'analyse détaillée
      const prompt = this.buildAnalysisPrompt(letterContent);

      // Générer l'analyse avec Gemini 2.5 Flash
      const result = await this.generateWithGemini(prompt, 'gemini-2.5-flash');

      // Parser la réponse structurée
      const analysis = this.parseAnalysisResponse(result.content);

      // Incrémenter l'utilisation
      await SubscriptionService.incrementAIUsage(userId);
      await this.logAIUsage(userId, AIModel.GEMINI_FLASH_2_0, result.tokensUsed, true);

      return analysis;

    } catch (error) {
      console.error('Erreur lors de l\'analyse de lettre:', error);
      throw error;
    }
  }

   /**
   * Construire le prompt pour l'analyse de lettre
   */
  private static buildAnalysisPrompt(letterContent: string): string {
    return `Analysez cette lettre de motivation de manière détaillée et structurée :
        ${letterContent}

        Fournissez une analyse complète au format JSON suivant :

        {
        "overallScore": [score de 0 à 100],
        "strengths": ["point fort 1", "point fort 2", ...],
        "weaknesses": ["point faible 1", "point faible 2", ...],
        "suggestions": ["suggestion 1", "suggestion 2", ...],
        "readabilityScore": [score de 0 à 100],
        "impactScore": [score de 0 à 100],
        "structureScore": [score de 0 à 100],
        "keywordMatch": [score de 0 à 100],
        "detailedAnalysis": {
            "opening": {
            "score": [score de 0 à 100],
            "feedback": "commentaire sur l'introduction"
            },
            "body": {
            "score": [score de 0 à 100],
            "feedback": "commentaire sur le corps de la lettre"
            },
            "closing": {
            "score": [score de 0 à 100],
            "feedback": "commentaire sur la conclusion"
            },
            "tone": {
            "score": [score de 0 à 100],
            "feedback": "commentaire sur le ton utilisé"
            },
            "personalization": {
            "score": [score de 0 à 100],
            "feedback": "commentaire sur la personnalisation"
            }
        }
        }

        Critères d'évaluation :
        - Structure et organisation
        - Clarté et lisibilité
        - Impact et persuasion
        - Personnalisation pour l'entreprise/poste
        - Grammaire et orthographe
        - Ton approprié
        - Longueur et concision
        - Mots-clés pertinents

        Soyez constructif et spécifique dans vos commentaires.`;
  }

  /**
   * Parser la réponse d'analyse structurée
   */
  private static parseAnalysisResponse(content: string): any {
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }

      const analysisData = JSON.parse(jsonMatch[0]);

      // Validation et valeurs par défaut
      return {
        overallScore: Math.max(0, Math.min(100, analysisData.overallScore || 75)),
        strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths.slice(0, 5) : [
          'Structure générale correcte',
          'Ton professionnel approprié'
        ],
        weaknesses: Array.isArray(analysisData.weaknesses) ? analysisData.weaknesses.slice(0, 5) : [
          'Pourrait être plus personnalisé'
        ],
        suggestions: Array.isArray(analysisData.suggestions) ? analysisData.suggestions.slice(0, 5) : [
          'Ajouter des exemples concrets de réalisations',
          'Personnaliser davantage pour l\'entreprise'
        ],
        readabilityScore: Math.max(0, Math.min(100, analysisData.readabilityScore || 80)),
        impactScore: Math.max(0, Math.min(100, analysisData.impactScore || 70)),
        structureScore: Math.max(0, Math.min(100, analysisData.structureScore || 85)),
        keywordMatch: Math.max(0, Math.min(100, analysisData.keywordMatch || 65)),
        detailedAnalysis: {
          opening: {
            score: Math.max(0, Math.min(100, analysisData.detailedAnalysis?.opening?.score || 75)),
            feedback: analysisData.detailedAnalysis?.opening?.feedback || 'Introduction correcte'
          },
          body: {
            score: Math.max(0, Math.min(100, analysisData.detailedAnalysis?.body?.score || 75)),
            feedback: analysisData.detailedAnalysis?.body?.feedback || 'Corps de lettre bien structuré'
          },
          closing: {
            score: Math.max(0, Math.min(100, analysisData.detailedAnalysis?.closing?.score || 75)),
            feedback: analysisData.detailedAnalysis?.closing?.feedback || 'Conclusion appropriée'
          },
          tone: {
            score: Math.max(0, Math.min(100, analysisData.detailedAnalysis?.tone?.score || 80)),
            feedback: analysisData.detailedAnalysis?.tone?.feedback || 'Ton professionnel adapté'
          },
          personalization: {
            score: Math.max(0, Math.min(100, analysisData.detailedAnalysis?.personalization?.score || 60)),
            feedback: analysisData.detailedAnalysis?.personalization?.feedback || 'Personnalisation à améliorer'
          }
        }
      };

    } catch (error) {
      console.error('Erreur parsing analyse IA:', error);
      
      // Retourner une analyse par défaut en cas d'erreur de parsing
      return {
        overallScore: 75,
        strengths: [
          'Structure générale correcte',
          'Ton professionnel approprié'
        ],
        weaknesses: [
          'Pourrait être plus personnalisé',
          'Manque d\'exemples concrets'
        ],
        suggestions: [
          'Ajouter des exemples concrets de réalisations',
          'Personnaliser davantage pour l\'entreprise',
          'Améliorer l\'accroche d\'introduction'
        ],
        readabilityScore: 80,
        impactScore: 70,
        structureScore: 85,
        keywordMatch: 65,
        detailedAnalysis: {
          opening: {
            score: 75,
            feedback: 'Introduction correcte mais pourrait être plus engageante'
          },
          body: {
            score: 75,
            feedback: 'Corps de lettre bien structuré, ajouter plus d\'exemples'
          },
          closing: {
            score: 75,
            feedback: 'Conclusion appropriée'
          },
          tone: {
            score: 80,
            feedback: 'Ton professionnel adapté'
          },
          personalization: {
            score: 60,
            feedback: 'Personnalisation à améliorer pour l\'entreprise cible'
          }
        }
      };
    }
  }

  /**
   * Analyser un CV pour conformité régionale et optimisation ATS
   */
  async analyzeCVCompliance(cv: CV, targetRegion: CVRegion): Promise<CVAnalysis> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_PRO,
      systemInstruction: `Tu es un expert en recrutement international et standards de CV.
      Analyse le CV selon les critères de la région ${targetRegion} et les bonnes pratiques ATS.
      
      Critères d'évaluation :
      - Conformité aux standards régionaux
      - Compatibilité ATS (lisibilité par les robots)
      - Structure et organisation
      - Contenu et pertinence
      - Optimisation des mots-clés
      
      Fournis une analyse détaillée avec scores et recommandations concrètes.`
    });

    const prompt = `
    Analyse ce CV pour la région ${targetRegion} :
    
    INFORMATIONS PERSONNELLES :
    ${JSON.stringify(cv.personalInfo, null, 2)}
    
    SECTIONS DU CV :
    ${cv.sections.map(section => `
    ${section.title.toUpperCase()} :
    ${JSON.stringify(section.content, null, 2)}
    `).join('\n')}
    
    Fournis une analyse complète au format JSON avec :
    {
      "overallScore": number (0-100),
      "regionalCompliance": number (0-100),
      "atsCompatibility": number (0-100),
      "keywordOptimization": number (0-100),
      "strengths": [{"category": string, "title": string, "description": string, "impact": "low|medium|high"}],
      "weaknesses": [{"category": string, "title": string, "description": string, "impact": "low|medium|high"}],
      "suggestions": [{"category": string, "title": string, "description": string, "actionable": boolean}],
      "missingElements": [string],
      "regionalAnalysis": {
        "${targetRegion}": {
          "score": number,
          "compliant": boolean,
          "issues": [string],
          "recommendations": [string]
        }
      },
      "atsAnalysis": {
        "readabilityScore": number,
        "formattingIssues": [string],
        "keywordDensity": {},
        "optimizationTips": [string]
      }
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    try {
      const analysisData = JSON.parse(analysisText);
      
      return {
        id: `analysis_${Date.now()}`,
        cvId: cv.id,
        userId: cv.userId,
        overallScore: analysisData.overallScore,
        regionalCompliance: analysisData.regionalCompliance,
        atsCompatibility: analysisData.atsCompatibility,
        keywordOptimization: analysisData.keywordOptimization,
        strengths: analysisData.strengths,
        weaknesses: analysisData.weaknesses,
        suggestions: analysisData.suggestions,
        missingElements: analysisData.missingElements,
        regionalAnalysis: analysisData.regionalAnalysis,
        atsAnalysis: analysisData.atsAnalysis,
        createdAt: new Date()
      };
    } catch (error) {
      throw new Error('Erreur lors de l\'analyse du CV par l\'IA');
    }
  }

  /**
   * Analyser la correspondance entre un CV et une offre d'emploi
   */
  async analyzeJobMatching(cv: CV, jobDescription: string, jobTitle: string, company?: string): Promise<JobMatching> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_FLASH_2_0,
      systemInstruction: `Tu es un expert en matching CV/offre d'emploi.
      Analyse la correspondance entre le profil candidat et l'offre d'emploi.
      
      Évalue :
      - Correspondance des compétences (techniques et soft skills)
      - Adéquation de l'expérience
      - Niveau d'éducation requis vs acquis
      - Mots-clés et terminologie du secteur
      - Lacunes et points d'amélioration
      
      Fournis un score de matching détaillé et des recommandations.`
    });

    const cvText = this.cvToText(cv);
    
    const prompt = `
    Analyse la correspondance entre ce CV et cette offre d'emploi :
    
    OFFRE D'EMPLOI :
    Poste : ${jobTitle}
    ${company ? `Entreprise : ${company}` : ''}
    Description : ${jobDescription}
    
    CV DU CANDIDAT :
    ${cvText}
    
    Fournis une analyse au format JSON avec :
    {
      "matchingScore": number (0-100),
      "matchingDetails": {
        "skillsMatch": [
          {
            "skill": string,
            "required": boolean,
            "userHas": boolean,
            "userLevel": number (1-5),
            "requiredLevel": number (1-5),
            "match": "perfect|good|partial|missing"
          }
        ],
        "experienceMatch": {
          "yearsRequired": number,
          "yearsUser": number,
          "match": "exceeds|meets|close|insufficient",
          "relevantExperience": [string]
        },
        "educationMatch": {
          "degreeRequired": string,
          "degreeUser": [string],
          "match": "exceeds|meets|equivalent|insufficient",
          "relevantEducation": [string]
        },
        "keywordsMatch": [
          {
            "keyword": string,
            "frequency": number,
            "importance": "high|medium|low",
            "inCV": boolean
          }
        ]
      },
      "recommendations": [
        {
          "type": "skill|experience|education|keyword|format",
          "title": string,
          "description": string,
          "priority": "high|medium|low",
          "actionable": boolean,
          "implementation": string
        }
      ]
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const matchingText = response.text();
    
    try {
      const matchingData = JSON.parse(matchingText);
      
      return {
        id: `matching_${Date.now()}`,
        cvId: cv.id,
        userId: cv.userId,
        jobTitle,
        company,
        jobDescription,
        requirements: this.extractRequirements(jobDescription),
        matchingScore: matchingData.matchingScore,
        matchingDetails: matchingData.matchingDetails,
        recommendations: matchingData.recommendations,
        source: 'manual',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error('Erreur lors de l\'analyse de correspondance par l\'IA');
    }
  }

  /**
   * Générer une lettre de motivation à partir d'un template
   */
  async generateMotivationLetter(
    template: Template,
    variableValues: Record<string, any>,
    customInstructions?: string
  ): Promise<string> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_FLASH_2_0,
      systemInstruction: `Tu es un expert en rédaction de lettres de motivation.
      Crée des lettres personnalisées, authentiques et percutantes qui se démarquent.
      
      Principes :
      - Personnalisation maximale selon le contexte
      - Ton professionnel mais humain
      - Structure claire et logique
      - Mise en valeur des points forts
      - Éviter les clichés et formules génériques
      - Adaptation au secteur et au niveau d'expérience`
    });

    // Construire le contexte à partir du template et des variables
    //@ts-ignore
    const context = {
      templateName: template.name,
      category: template.category,
      industry: template.industry,
      experienceLevel: template.experienceLevel,
      variables: variableValues,
      customInstructions: customInstructions || ''
    };

    const prompt = `
    Génère une lettre de motivation basée sur ce template :
    
    TEMPLATE : ${template.name}
    CATÉGORIE : ${template.category}
    SECTEUR : ${template.industry.join(', ')}
    NIVEAU : ${template.experienceLevel}
    
    VARIABLES UTILISATEUR :
    ${JSON.stringify(variableValues, null, 2)}
    
    INSTRUCTIONS PERSONNALISÉES :
    ${customInstructions || 'Aucune instruction spéciale'}
    
    STRUCTURE DU TEMPLATE :
    ${template.sections.map(section => `
    ${section.name.toUpperCase()} :
    ${section.content}
    
    Guidance IA : ${section.aiGuidance?.prompt || 'Aucune'}
    Ton : ${section.aiGuidance?.tone || 'professional'}
    Longueur : ${section.aiGuidance?.length || 'medium'}
    `).join('\n')}
    
    Génère une lettre de motivation complète, fluide et personnalisée.
    La lettre doit être prête à être envoyée, sans placeholder ni variable non remplacée.
    Assure-toi que le contenu est cohérent, authentique et adapté au contexte professionnel.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Optimiser un CV existant avec l'IA
   */
  async optimizeCV(cv: CV, targetJob?: string, targetRegion?: CVRegion): Promise<string[]> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_PRO,
      systemInstruction: `Tu es un expert en optimisation de CV.
      Propose des améliorations concrètes pour maximiser l'impact du CV.
      
      Focus sur :
      - Optimisation des mots-clés pour l'ATS
      - Amélioration de la structure et lisibilité
      - Quantification des résultats
      - Adaptation au poste ciblé
      - Conformité aux standards régionaux`
    });

    const cvText = this.cvToText(cv);
    const context = {
      targetJob: targetJob || 'poste général',
      targetRegion: targetRegion || cv.region,
      currentRegion: cv.region
    };

    const prompt = `
    Analyse ce CV et propose des améliorations concrètes :
    
    CONTEXTE :
    - Poste visé : ${context.targetJob}
    - Région cible : ${context.targetRegion}
    - Région actuelle : ${context.currentRegion}
    
    CV ACTUEL :
    ${cvText}
    
    Fournis un tableau JSON d'améliorations :
    [
      {
        "section": "nom_de_la_section",
        "type": "content|structure|format|keywords",
        "priority": "high|medium|low",
        "current": "texte actuel problématique",
        "improved": "version améliorée",
        "reason": "explication de l'amélioration"
      }
    ]
    
    Concentre-toi sur les améliorations les plus impactantes.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvementsText = response.text();
    
    try {
      const improvements = JSON.parse(improvementsText);
      return improvements.map((imp: any) => 
        `**${imp.section} (${imp.priority})**: ${imp.reason}\n` +
        `Actuel: "${imp.current}"\n` +
        `Amélioré: "${imp.improved}"`
      );
    } catch (error) {
      // Fallback si le JSON n'est pas valide
      return [improvementsText];
    }
  }

  /**
   * Extraire les mots-clés d'une offre d'emploi
   */
  async extractJobKeywords(jobDescription: string): Promise<string[]> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_2_0_FLASH_LITE 
    });

    const prompt = `
    Extrait les mots-clés les plus importants de cette offre d'emploi.
    Focus sur les compétences techniques, soft skills, technologies, et termes sectoriels.
    
    OFFRE D'EMPLOI :
    ${jobDescription}
    
    Retourne un tableau JSON simple de mots-clés :
    ["mot-clé1", "mot-clé2", "mot-clé3", ...]
    
    Maximum 20 mots-clés, classés par importance.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const keywordsText = response.text();
    
    try {
      return JSON.parse(keywordsText);
    } catch (error) {
      // Fallback : extraire manuellement les mots-clés du texte
      return this.extractKeywordsManually(jobDescription);
    }
  }

  /**
   * Suggérer des améliorations pour une lettre de motivation
   */
  async improveLetter(letterContent: string, jobContext?: any): Promise<string[]> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_FLASH_2_0 
    });

    const prompt = `
    Analyse cette lettre de motivation et propose des améliorations :
    
    ${jobContext ? `CONTEXTE DU POSTE :
    Poste : ${jobContext.position}
    Entreprise : ${jobContext.company}
    Secteur : ${jobContext.industry}
    ` : ''}
    
    LETTRE ACTUELLE :
    ${letterContent}
    
    Fournis 5-8 suggestions d'amélioration concrètes sous forme de liste :
    - Suggestion 1 avec explication
    - Suggestion 2 avec explication
    - etc.
    
    Focus sur :
    - Personnalisation et spécificité
    - Impact et persuasion
    - Structure et fluidité
    - Élimination des clichés
    - Adaptation au secteur`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestions = response.text();
    
    // Parser les suggestions en liste
    return suggestions
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());
  }

  /**
   * Générer un résumé professionnel optimisé
   */
  async generateProfessionalSummary(cv: CV, targetRole?: string): Promise<string> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_FLASH_2_0 
    });

    const experience = cv.sections.find(s => s.type === 'work_experience')?.content.workExperience || [];
    const skills = cv.sections.find(s => s.type === 'skills')?.content.skills || [];
    const education = cv.sections.find(s => s.type === 'education')?.content.education || [];

    const prompt = `
    Génère un résumé professionnel percutant pour ce profil :
    
    ${targetRole ? `POSTE VISÉ : ${targetRole}` : ''}
    
    EXPÉRIENCE :
    ${experience.map(exp => `- ${exp.position} chez ${exp.company} (${exp.description})`).join('\n')}
    
    COMPÉTENCES :
    ${skills.map(skill => `- ${skill.name} (niveau ${skill.level}/5)`).join('\n')}
    
    FORMATION :
    ${education.map(edu => `- ${edu.degree} en ${edu.field} - ${edu.institution}`).join('\n')}
    
    Crée un résumé de 3-4 phrases qui :
    - Met en valeur les points forts
    - Montre la progression de carrière
    - Inclut des mots-clés pertinents
    - Est adapté au poste visé
    - Évite les clichés
    
    Le résumé doit être punchy et convaincant.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Adapter un CV pour une région spécifique
   */
  async adaptCVForRegion(cv: CV, targetRegion: CVRegion): Promise<{
    adaptedSections: any[];
    recommendations: string[];
  }> {
    const model = AIService.geminiAI.getGenerativeModel({ 
      model: AIModel.GEMINI_PRO 
    });

    const prompt = `
    Adapte ce CV pour les standards de la région ${targetRegion} :
    
    CV ACTUEL (région: ${cv.region}) :
    ${JSON.stringify({
      personalInfo: cv.personalInfo,
      sections: cv.sections.map(s => ({
        type: s.type,
        title: s.title,
        content: s.content
      }))
    }, null, 2)}
    
    Fournis au format JSON :
    {
      "adaptedSections": [
        {
          "type": "section_type",
          "newTitle": "titre adapté",
          "changes": ["changement 1", "changement 2"],
          "content": "contenu adapté si nécessaire"
        }
      ],
      "recommendations": [
        "recommandation 1 pour adaptation régionale",
        "recommandation 2",
        "etc."
      ]
    }
    
    Prends en compte les spécificités culturelles et légales de ${targetRegion}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const adaptationText = response.text();
    
    try {
      return JSON.parse(adaptationText);
    } catch (error) {
      return {
        adaptedSections: [],
        recommendations: ['Erreur lors de l\'adaptation automatique. Révision manuelle recommandée.']
      };
    }
  }

  // Méthodes utilitaires privées

  private cvToText(cv: CV): string {
    let text = `
INFORMATIONS PERSONNELLES :
${cv.personalInfo.firstName} ${cv.personalInfo.lastName}
Email: ${cv.personalInfo.email}
Téléphone: ${cv.personalInfo.phone}
${cv.personalInfo.address ? `Adresse: ${cv.personalInfo.address.city}, ${cv.personalInfo.address.country}` : ''}
${cv.personalInfo.professionalSummary ? `Résumé: ${cv.personalInfo.professionalSummary}` : ''}
`;

    cv.sections.forEach(section => {
      text += `\n${section.title.toUpperCase()} :\n`;
      
      if (section.content.workExperience) {
        section.content.workExperience.forEach(exp => {
          text += `- ${exp.position} chez ${exp.company} (${exp.startDate.getFullYear()}-${exp.endDate?.getFullYear() || 'présent'})\n`;
          text += `  ${exp.description}\n`;
          if (exp.achievements.length > 0) {
            text += `  Réalisations: ${exp.achievements.join(', ')}\n`;
          }
        });
      }
      
      if (section.content.education) {
        section.content.education.forEach(edu => {
          text += `- ${edu.degree} en ${edu.field} - ${edu.institution} (${edu.startDate.getFullYear()}-${edu.endDate?.getFullYear() || 'présent'})\n`;
        });
      }
      
      if (section.content.skills) {
        section.content.skills.forEach(skill => {
          text += `- ${skill.name} (niveau ${skill.level}/5, catégorie: ${skill.category})\n`;
        });
      }
      
      if (section.content.languages) {
        section.content.languages.forEach(lang => {
          text += `- ${lang.name} (niveau ${lang.level})\n`;
        });
      }
      
      if (section.content.certifications) {
        section.content.certifications.forEach(cert => {
          text += `- ${cert.name} par ${cert.issuer} (${cert.issueDate.getFullYear()})\n`;
        });
      }
      
      if (section.content.projects) {
        section.content.projects.forEach(project => {
          text += `- ${project.name}: ${project.description}\n`;
          text += `  Technologies: ${project.technologies.join(', ')}\n`;
        });
      }
      
      if (section.content.customContent) {
        text += section.content.customContent + '\n';
      }
    });
    
    return text;
  }

  private extractRequirements(jobDescription: string): string[] {
    // Extraction simple des exigences - peut être améliorée avec de l'IA
    const requirements: string[] = [];
    const lines = jobDescription.split('\n');
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('requis') || 
          lowerLine.includes('exigé') || 
          lowerLine.includes('indispensable') ||
          lowerLine.includes('obligatoire') ||
          lowerLine.includes('must have') ||
          lowerLine.includes('required')) {
        requirements.push(line.trim());
      }
    }
    
    return requirements;
  }

  private extractKeywordsManually(text: string): string[] {
    // Fallback manuel pour l'extraction de mots-clés
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'Git',
      'Communication', 'Leadership', 'Teamwork', 'Problem solving',
      'Project management', 'Agile', 'Scrum', 'DevOps', 'AWS', 'Docker'
    ];
    
    const foundKeywords = commonSkills.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    
    return foundKeywords.slice(0, 10); // Limiter à 10 mots-clés
  }

  /**
 * Analyser un CV complet avec l'IA (méthode spécialisée)
 */
static async analyzeCVContent(
  userId: string,
  cvContent: {
    personalInfo: any;
    sections: any[];
    region: CVRegion;
  },
  options: {
    targetRegion?: CVRegion;
    jobDescription?: string;
    focusAreas?: ('ats' | 'regional' | 'content' | 'keywords')[];
    language?: 'fr' | 'en';
  } = {}
): Promise<{
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  regionalCompliance: number;
  atsScore: number;
  keywordOptimization: number;
  detailedAnalysis: {
    personalInfo: { score: number; feedback: string };
    experience: { score: number; feedback: string };
    education: { score: number; feedback: string };
    skills: { score: number; feedback: string };
    format: { score: number; feedback: string };
  };
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
  }>;
}> {
  try {
    // Vérifier les limites d'utilisation
    const usageCheck = await SubscriptionService.checkAIFeatureUsage(userId, 'cv_analysis');
    if (!usageCheck.canUse) {
      throw new ForbiddenError(
        `Limite d'analyse CV atteinte (${usageCheck.currentUsage}/${usageCheck.limit}). ` +
        `Quota réinitialisé le ${usageCheck.resetDate?.toLocaleDateString('fr-FR')}.`
      );
    }

    // Construire le prompt spécialisé pour l'analyse CV
    const prompt = this.buildCVAnalysisPrompt(cvContent, options);

    logger.debug('Début analyse CV avec IA', { 
      userId, 
      cvRegion: cvContent.region, 
      targetRegion: options.targetRegion,
      focusAreas: options.focusAreas 
    });

    // Générer l'analyse avec Gemini Pro pour plus de précision
    const result = await this.generateWithGemini(prompt, 'gemini-2.5-pro');

    // Parser la réponse structurée
    const analysis = this.parseCVAnalysisResponse(result.content);

    // Enregistrer l'usage
    await SubscriptionService.logAIFeatureUsage(userId, 'cv_analysis', {
      model: 'gemini-2.5-pro',
      tokensUsed: result.tokensUsed,
      cost: this.calculateCost(AIModel.GEMINI_PRO, result.tokensUsed),
      cvRegion: cvContent.region,
      targetRegion: options.targetRegion
    });

    logger.info('Analyse CV terminée avec succès', {
      userId,
      overallScore: analysis.overallScore,
      tokensUsed: result.tokensUsed
    });

    return analysis;
  } catch (error:any) {
    logger.error('Erreur analyse CV IA:', error);
    
    // Enregistrer l'erreur pour suivi
    await this.logAIUsage(userId, AIModel.GEMINI_PRO, 0, false, error?.message);
    
    throw error;
  }
}

/**
 * Analyser la correspondance entre un CV et une offre d'emploi
 */
static async analyzeJobMatching(
  userId: string,
  cvContent: any,
  jobDescription: string,
  jobTitle: string,
  company?: string
): Promise<{
  matchingScore: number;
  matchingDetails: {
    skillsMatch: Array<{
      skill: string;
      required: boolean;
      userHas: boolean;
      match: 'perfect' | 'good' | 'partial' | 'missing';
    }>;
    experienceMatch: {
      yearsRequired: number;
      yearsUser: number;
      match: 'exceeds' | 'meets' | 'close' | 'insufficient';
    };
    educationMatch: {
      match: 'exceeds' | 'meets' | 'equivalent' | 'insufficient';
      details: string;
    };
    keywordsMatch: Array<{
      keyword: string;
      importance: 'high' | 'medium' | 'low';
      inCV: boolean;
    }>;
  };
  recommendations: Array<{
    type: 'skill' | 'experience' | 'education' | 'keyword' | 'format';
    priority: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
  }>;
  missingElements: string[];
  improvementAreas: string[];
}> {
  try {
    // Vérifier les limites
    const usageCheck = await SubscriptionService.checkAIFeatureUsage(userId, 'job_matching');
    if (!usageCheck.canUse) {
      throw new ForbiddenError('Limite d\'analyse de correspondance atteinte');
    }

    // Construire le prompt pour le matching
    const prompt = this.buildJobMatchingPrompt(cvContent, jobDescription, jobTitle, company);

    logger.debug('Début analyse correspondance emploi', { 
      userId, 
      jobTitle, 
      company,
      jobDescriptionLength: jobDescription.length 
    });

    // Utiliser Gemini Flash pour l'efficacité
    const result = await this.generateWithGemini(prompt, 'gemini-2.5-flash');

    // Parser la réponse
    const matching = this.parseJobMatchingResponse(result.content);

    // Enregistrer l'usage
    await SubscriptionService.logAIFeatureUsage(userId, 'job_matching', {
      model: 'gemini-2.5-flash',
      tokensUsed: result.tokensUsed,
      jobTitle,
      company,
      matchingScore: matching.matchingScore
    });

    logger.info('Analyse correspondance terminée', {
      userId,
      matchingScore: matching.matchingScore,
      jobTitle
    });

    return matching;
  } catch (error) {
    logger.error('Erreur analyse correspondance:', error);
    throw error;
  }
}

/**
 * Générer des suggestions d'optimisation CV pour une région spécifique
 */
static async generateRegionalOptimization(
  userId: string,
  cvContent: any,
  targetRegion: CVRegion,
  targetJob?: string
): Promise<{
  adaptations: Array<{
    section: string;
    type: 'add' | 'remove' | 'modify' | 'reorder';
    current: string;
    suggested: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  culturalNotes: string[];
  formatChanges: string[];
  contentSuggestions: string[];
  complianceScore: number;
}> {
  try {
    // Vérifier les limites
    const usageCheck = await SubscriptionService.checkAIFeatureUsage(userId, 'cv_analysis');
    if (!usageCheck.canUse) {
      throw new ForbiddenError('Limite d\'optimisation régionale atteinte');
    }

    const prompt = this.buildRegionalOptimizationPrompt(cvContent, targetRegion, targetJob);

    const result = await this.generateWithGemini(prompt, 'gemini-2.5-pro');
    const optimization = this.parseRegionalOptimizationResponse(result.content);

    // Enregistrer l'usage
    await SubscriptionService.logAIFeatureUsage(userId, 'cv_analysis', {
      model: 'gemini-2.5-pro',
      tokensUsed: result.tokensUsed,
      targetRegion,
      targetJob,
      type: 'regional_optimization'
    });

    return optimization;
  } catch (error) {
    logger.error('Erreur optimisation régionale:', error);
    throw error;
  }
}

/**
 * Extraire et analyser les mots-clés d'une offre d'emploi
 */
static async extractJobKeywords(
  userId: string,
  jobDescription: string,
  jobTitle: string
): Promise<{
  keywords: Array<{
    word: string;
    category: 'technical' | 'soft' | 'industry' | 'general';
    importance: 'high' | 'medium' | 'low';
    frequency: number;
  }>;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  educationRequirements: string[];
  industryTerms: string[];
}> {
  try {
    const prompt = this.buildKeywordExtractionPrompt(jobDescription, jobTitle);

    const result = await this.generateWithGemini(prompt, 'gemini-2.5-flash');
    const extraction = this.parseKeywordExtractionResponse(result.content);

    logger.debug('Extraction mots-clés terminée', {
      userId,
      jobTitle,
      keywordsCount: extraction.keywords.length
    });

    return extraction;
  } catch (error) {
    logger.error('Erreur extraction mots-clés:', error);
    throw error;
  }
}

/**
 * Construire le prompt pour l'analyse complète de CV
 */
private static buildCVAnalysisPrompt(
  cvContent: any,
  options: {
    targetRegion?: CVRegion;
    jobDescription?: string;
    focusAreas?: string[];
    language?: string;
  }
): string {
  const language = options.language || 'fr';
  const isEnglish = language === 'en';
  
  let prompt = isEnglish ? 
    `Analyze this CV comprehensively and professionally:\n\n` :
    `Analysez ce CV de manière complète et professionnelle :\n\n`;
  
  // Ajouter les informations du CV
  prompt += `PERSONAL INFORMATION:\n${JSON.stringify(cvContent.personalInfo, null, 2)}\n\n`;
  
  cvContent.sections?.forEach((section: any, index: number) => {
    prompt += `SECTION ${index + 1} - ${section.title}:\n${JSON.stringify(section.content, null, 2)}\n\n`;
  });
  
  // Contexte régional
  if (options.targetRegion) {
    prompt += isEnglish ?
      `TARGET REGION: ${options.targetRegion}\nAnalyze compliance with ${options.targetRegion} recruitment standards.\n\n` :
      `RÉGION CIBLE : ${options.targetRegion}\nAnalysez la conformité aux standards de recrutement de ${options.targetRegion}.\n\n`;
  }
  
  // Description de poste
  if (options.jobDescription) {
    prompt += isEnglish ?
      `JOB DESCRIPTION:\n${options.jobDescription}\n\nAnalyze fit between CV and this job posting.\n\n` :
      `DESCRIPTION DU POSTE :\n${options.jobDescription}\n\nAnalysez l'adéquation entre le CV et cette offre d'emploi.\n\n`;
  }
  
  // Focus spécifique
  if (options.focusAreas && options.focusAreas.length > 0) {
    prompt += isEnglish ?
      `FOCUS AREAS: ${options.focusAreas.join(', ')}\n\n` :
      `DOMAINES DE FOCUS : ${options.focusAreas.join(', ')}\n\n`;
  }
  
  // Instructions de format
  prompt += isEnglish ? `
Provide analysis in JSON format with:
{
  "overallScore": [global score 0-100],
  "strengths": [list of strengths],
  "weaknesses": [list of weaknesses],
  "suggestions": [improvement suggestions],
  "regionalCompliance": [regional compliance score 0-100],
  "atsScore": [ATS compatibility score 0-100],
  "keywordOptimization": [keyword optimization score 0-100],
  "detailedAnalysis": {
    "personalInfo": {"score": [0-100], "feedback": "feedback"},
    "experience": {"score": [0-100], "feedback": "feedback"},
    "education": {"score": [0-100], "feedback": "feedback"},
    "skills": {"score": [0-100], "feedback": "feedback"},
    "format": {"score": [0-100], "feedback": "feedback"}
  },
  "recommendations": [
    {
      "category": "category",
      "priority": "high|medium|low",
      "description": "description",
      "implementation": "how to implement"
    }
  ]
}

Be constructive and specific in recommendations.` : `
Fournissez l'analyse au format JSON avec :
{
  "overallScore": [score global 0-100],
  "strengths": [liste des points forts],
  "weaknesses": [liste des points faibles],
  "suggestions": [suggestions d'amélioration],
  "regionalCompliance": [score de conformité régionale 0-100],
  "atsScore": [score de compatibilité ATS 0-100],
  "keywordOptimization": [score d'optimisation mots-clés 0-100],
  "detailedAnalysis": {
    "personalInfo": {"score": [0-100], "feedback": "commentaire"},
    "experience": {"score": [0-100], "feedback": "commentaire"},
    "education": {"score": [0-100], "feedback": "commentaire"},
    "skills": {"score": [0-100], "feedback": "commentaire"},
    "format": {"score": [0-100], "feedback": "commentaire"}
  },
  "recommendations": [
    {
      "category": "catégorie",
      "priority": "high|medium|low",
      "description": "description",
      "implementation": "comment implémenter"
    }
  ]
}

Soyez constructif et spécifique dans vos recommandations.`;
  
  return prompt;
}

/**
 * Construire le prompt pour l'analyse de correspondance emploi
 */
private static buildJobMatchingPrompt(
  cvContent: any,
  jobDescription: string,
  jobTitle: string,
  company?: string
): string {
  return `
Analysez la correspondance entre ce CV et cette offre d'emploi :

OFFRE D'EMPLOI :
Poste : ${jobTitle}
${company ? `Entreprise : ${company}` : ''}
Description : ${jobDescription}

CV DU CANDIDAT :
${JSON.stringify(cvContent, null, 2)}

Fournissez une analyse au format JSON avec :
{
  "matchingScore": [score global 0-100],
  "matchingDetails": {
    "skillsMatch": [
      {
        "skill": "nom de la compétence",
        "required": true/false,
        "userHas": true/false,
        "match": "perfect|good|partial|missing"
      }
    ],
    "experienceMatch": {
      "yearsRequired": nombre,
      "yearsUser": nombre,
      "match": "exceeds|meets|close|insufficient"
    },
    "educationMatch": {
      "match": "exceeds|meets|equivalent|insufficient",
      "details": "détails de correspondance"
    },
    "keywordsMatch": [
      {
        "keyword": "mot-clé",
        "importance": "high|medium|low",
        "inCV": true/false
      }
    ]
  },
  "recommendations": [
    {
      "type": "skill|experience|education|keyword|format",
      "priority": "high|medium|low",
      "description": "description",
      "implementation": "comment implémenter"
    }
  ],
  "missingElements": [éléments manquants importants],
  "improvementAreas": [domaines d'amélioration]
}

Analysez en détail et soyez précis dans vos recommandations.`;
}

/**
 * Construire le prompt pour l'optimisation régionale
 */
private static buildRegionalOptimizationPrompt(
  cvContent: any,
  targetRegion: CVRegion,
  targetJob?: string
): string {
  return `
Optimisez ce CV pour la région ${targetRegion} ${targetJob ? `et le poste de ${targetJob}` : ''} :

CV ACTUEL :
${JSON.stringify(cvContent, null, 2)}

Fournissez des recommandations d'adaptation au format JSON :
{
  "adaptations": [
    {
      "section": "nom de la section",
      "type": "add|remove|modify|reorder",
      "current": "état actuel",
      "suggested": "suggestion",
      "reason": "raison de l'adaptation",
      "priority": "high|medium|low"
    }
  ],
  "culturalNotes": [notes culturelles importantes],
  "formatChanges": [changements de format recommandés],
  "contentSuggestions": [suggestions de contenu],
  "complianceScore": [score de conformité 0-100]
}

Tenez compte des spécificités culturelles et légales de ${targetRegion}.`;
}

/**
 * Construire le prompt pour l'extraction de mots-clés
 */
private static buildKeywordExtractionPrompt(jobDescription: string, jobTitle: string): string {
  return `
Extrayez et analysez les mots-clés de cette offre d'emploi :

POSTE : ${jobTitle}
DESCRIPTION : ${jobDescription}

Fournissez l'analyse au format JSON :
{
  "keywords": [
    {
      "word": "mot-clé",
      "category": "technical|soft|industry|general",
      "importance": "high|medium|low",
      "frequency": nombre d'occurrences
    }
  ],
  "requiredSkills": [compétences obligatoires],
  "preferredSkills": [compétences souhaitées],
  "experienceLevel": "niveau d'expérience requis",
  "educationRequirements": [exigences de formation],
  "industryTerms": [termes spécifiques au secteur]
}

Classez par ordre d'importance et soyez précis.`;
}

// ==========================================
// MÉTHODES DE PARSING DES RÉPONSES
// ==========================================

/**
 * Parser la réponse d'analyse CV
 */
private static parseCVAnalysisResponse(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide');
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    return {
      overallScore: Math.max(0, Math.min(100, analysisData.overallScore || 75)),
      strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths.slice(0, 8) : [
        'Structure professionnelle',
        'Informations complètes'
      ],
      weaknesses: Array.isArray(analysisData.weaknesses) ? analysisData.weaknesses.slice(0, 6) : [
        'Optimisation mots-clés à améliorer'
      ],
      suggestions: Array.isArray(analysisData.suggestions) ? analysisData.suggestions.slice(0, 10) : [
        'Ajouter des mots-clés pertinents',
        'Quantifier les réalisations'
      ],
      regionalCompliance: Math.max(0, Math.min(100, analysisData.regionalCompliance || 80)),
      atsScore: Math.max(0, Math.min(100, analysisData.atsScore || 75)),
      keywordOptimization: Math.max(0, Math.min(100, analysisData.keywordOptimization || 70)),
      detailedAnalysis: analysisData.detailedAnalysis || {
        personalInfo: { score: 80, feedback: 'Informations complètes' },
        experience: { score: 75, feedback: 'Expérience bien détaillée' },
        education: { score: 85, feedback: 'Formation appropriée' },
        skills: { score: 70, feedback: 'Compétences à mieux valoriser' },
        format: { score: 80, feedback: 'Format professionnel' }
      },
      recommendations: Array.isArray(analysisData.recommendations) ? analysisData.recommendations : []
    };
  } catch (error) {
    logger.error('Erreur parsing analyse CV:', error);
    
    // Retourner une analyse par défaut
    return {
      overallScore: 75,
      strengths: ['Structure professionnelle', 'Informations complètes'],
      weaknesses: ['Optimisation mots-clés à améliorer'],
      suggestions: ['Ajouter des mots-clés pertinents', 'Quantifier les réalisations'],
      regionalCompliance: 80,
      atsScore: 75,
      keywordOptimization: 70,
      detailedAnalysis: {
        personalInfo: { score: 80, feedback: 'Informations complètes' },
        experience: { score: 75, feedback: 'Expérience bien détaillée' },
        education: { score: 85, feedback: 'Formation appropriée' },
        skills: { score: 70, feedback: 'Compétences à mieux valoriser' },
        format: { score: 80, feedback: 'Format professionnel' }
      },
      recommendations: []
    };
  }
}

/**
 * Parser la réponse d'analyse de correspondance
 */
private static parseJobMatchingResponse(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('Erreur parsing correspondance emploi:', error);
    
    return {
      matchingScore: 65,
      matchingDetails: {
        skillsMatch: [],
        experienceMatch: { match: 'meets', yearsRequired: 0, yearsUser: 0 },
        educationMatch: { match: 'meets', details: 'Formation appropriée' },
        keywordsMatch: []
      },
      recommendations: [],
      missingElements: [],
      improvementAreas: ['Optimiser les mots-clés', 'Quantifier les réalisations']
    };
  }
}

/**
 * Parser la réponse d'optimisation régionale
 */
private static parseRegionalOptimizationResponse(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('Erreur parsing optimisation régionale:', error);
    
    return {
      adaptations: [],
      culturalNotes: ['Adapter selon les standards locaux'],
      formatChanges: ['Respecter les formats régionaux'],
      contentSuggestions: ['Personnaliser le contenu'],
      complianceScore: 75
    };
  }
}

/**
 * Parser la réponse d'extraction de mots-clés
 */
private static parseKeywordExtractionResponse(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('Erreur parsing extraction mots-clés:', error);
    
    return {
      keywords: [],
      requiredSkills: [],
      preferredSkills: [],
      experienceLevel: 'Non spécifié',
      educationRequirements: [],
      industryTerms: []
    };
  }
}

}