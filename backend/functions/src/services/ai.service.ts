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
}