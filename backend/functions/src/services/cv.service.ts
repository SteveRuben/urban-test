import { logger } from 'firebase-functions';
import PDFDocument from 'pdfkit';
import { Document, Paragraph, Packer } from 'docx';
import { COLLECTIONS, db } from '../config/firebase';
import { CV, CVAnalysis, CVExport, CVRegion, JobMatching } from '../models/cv.model';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';

export class CVService {
  private static collection = db.collection(COLLECTIONS.CVS);
  private static analysisCollection = db.collection(COLLECTIONS.CV_ANALYSIS);
  private static matchingCollection = db.collection(COLLECTIONS.CV_MATCHING);

  /**
   * Créer un nouveau CV
   */
  static async createCV(cvData: Partial<CV>): Promise<CV> {
    try {
      // Validation des données requises
      const requiredFields = ['userId', 'templateId', 'title', 'region'];
      const missingFields = ValidationUtil.validateRequiredFields(cvData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      // Vérifier les limites d'abonnement pour les CV
      const userSubscription = await SubscriptionService.getActiveUserSubscription(cvData.userId!);
      const cvCount = await this.getUserCVCount(cvData.userId!);
      
      const maxCVs = this.getMaxCVsForUser(userSubscription);
      if (cvCount >= maxCVs) {
        throw new ForbiddenError(
          `Limite de CV atteinte (${cvCount}/${maxCVs}). Mettez à niveau votre abonnement.`
        );
      }

      const cvId = this.collection.doc().id;
      const now = new Date();
      
      const newCV: CV = {
        id: cvId,
        userId: cvData.userId!,
        templateId: cvData.templateId!,
        title: ValidationUtil.sanitizeString(cvData.title!),
        region: cvData.region!,
        personalInfo: cvData.personalInfo || {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: { city: '', country: '' }
        },
        sections: cvData.sections || [],
        status: cvData.status || 'draft',
        version: 1,
        isAIOptimized: false,
        jobMatchings: [],
        exports: [],
        shareSettings: cvData.shareSettings || {
          isPublic: false,
          passwordProtected: false,
          trackViews: false,
          views: []
        },
        createdAt: now,
        updatedAt: now,
        lastViewedAt: now
      };

      await this.collection.doc(cvId).set(newCV);

      logger.info('CV créé avec succès', {
        cvId,
        userId: cvData.userId,
        region: cvData.region
      });

      return newCV;
    } catch (error) {
      logger.error('Erreur lors de la création du CV:', error);
      throw error;
    }
  }

  /**
   * Récupérer un CV par ID
   */
  static async getCVById(cvId: string, userId: string): Promise<CV> {
    try {
      if (!ValidationUtil.isValidObjectId(cvId)) {
        throw new ValidationError('ID CV invalide');
      }

      const cvDoc = await this.collection.doc(cvId).get();
      
      if (!cvDoc.exists) {
        throw new NotFoundError('CV non trouvé');
      }

      const cvData = cvDoc.data() as CV;
      
      // Vérifier que l'utilisateur est le propriétaire
      if (cvData.userId !== userId) {
        throw new ForbiddenError('Accès non autorisé à ce CV');
      }

      // Mettre à jour la date de dernière vue
      await this.collection.doc(cvId).update({
        lastViewedAt: new Date()
      });

      return {
        ...cvData,
        createdAt: cvData.createdAt,
        updatedAt: cvData.updatedAt,
        lastViewedAt: new Date()
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération du CV:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un CV
   */
  static async updateCV(cvId: string, userId: string, updateData: Partial<CV>): Promise<CV> {
    try {
      // Vérifier que le CV existe et appartient à l'utilisateur
      await this.getCVById(cvId, userId);

      const updateFields: Partial<CV> = {
        ...updateData,
        updatedAt: new Date()
      };

      // Nettoyer les champs string
      if (updateFields.title) {
        updateFields.title = ValidationUtil.sanitizeString(updateFields.title);
      }

      // Incrémenter la version si le contenu change
      if (updateFields.personalInfo || updateFields.sections) {
        const currentCV = await this.getCVById(cvId, userId);
        updateFields.version = (currentCV.version || 1) + 1;
      }

      // Empêcher la modification de certains champs
      delete updateFields.id;
      delete updateFields.userId;
      delete updateFields.createdAt;

      await this.collection.doc(cvId).update(updateFields);

      logger.info('CV mis à jour', {
        cvId,
        userId,
        updateFields: Object.keys(updateFields)
      });

      return await this.getCVById(cvId, userId);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du CV:', error);
      throw error;
    }
  }

  /**
   * Obtenir tous les CV d'un utilisateur
   */
  static async getUserCVs(
    userId: string, 
    options: {
      page?: number;
      limit?: number;
      status?: string;
      region?: CVRegion;
    } = {}
  ): Promise<{
    cvs: CV[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, status, region } = options;
      const offset = (page - 1) * limit;

      let query = this.collection.where('userId', '==', userId);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (region) {
        query = query.where('region', '==', region);
      }

      // Trier par date de mise à jour
      query = query.orderBy('updatedAt', 'desc');

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      const snapshot = await query
        .offset(offset)
        .limit(limit)
        .get();

      const cvs = snapshot.docs.map(doc => {
        const data = doc.data() as CV;
        return {
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastViewedAt: data.lastViewedAt
        };
      });

      return {
        cvs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des CV:', error);
      throw error;
    }
  }

  /**
   * Supprimer un CV
   */
  static async deleteCV(cvId: string, userId: string): Promise<void> {
    try {
      // Vérifier que le CV existe et appartient à l'utilisateur
      await this.getCVById(cvId, userId);

      // Supprimer le CV et ses données associées
      const batch = db.batch();

      // Supprimer le CV
      batch.delete(this.collection.doc(cvId));

      // Supprimer les analyses associées
      const analysisSnapshot = await this.analysisCollection
        .where('cvId', '==', cvId)
        .get();
      
      analysisSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer les matchings associés
      const matchingSnapshot = await this.matchingCollection
        .where('cvId', '==', cvId)
        .get();
      
      matchingSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info('CV supprimé avec succès', { cvId, userId });
    } catch (error) {
      logger.error('Erreur lors de la suppression du CV:', error);
      throw error;
    }
  }

  /**
   * Dupliquer un CV
   */
  static async duplicateCV(originalCV: CV, newTitle?: string): Promise<CV> {
    try {
      const duplicateData: Partial<CV> = {
        userId: originalCV.userId,
        templateId: originalCV.templateId,
        title: newTitle || `${originalCV.title} - Copie`,
        region: originalCV.region,
        personalInfo: { ...originalCV.personalInfo },
        sections: originalCV.sections.map(section => ({ ...section })),
        status: 'draft'
      };

      return await this.createCV(duplicateData);
    } catch (error) {
      logger.error('Erreur lors de la duplication du CV:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder une analyse de CV
   */
  static async saveAnalysis(analysis: CVAnalysis): Promise<void> {
    try {
      const analysisId = this.analysisCollection.doc().id;
      await this.analysisCollection.doc(analysisId).set({
        ...analysis,
        id: analysisId
      });

      // Mettre à jour le CV pour indiquer qu'il a une analyse
      await this.collection.doc(analysis.cvId).update({
        lastAnalysis: analysis,
        updatedAt: new Date()
      });

      logger.info('Analyse CV sauvegardée', {
        analysisId,
        cvId: analysis.cvId,
        overallScore: analysis.overallScore
      });
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de l\'analyse:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder un matching de poste
   */
  static async saveJobMatching(matching: JobMatching): Promise<void> {
    try {
      const matchingId = this.matchingCollection.doc().id;
      await this.matchingCollection.doc(matchingId).set({
        ...matching,
        id: matchingId
      });

      // Ajouter le matching au CV
      const cv = await this.getCVById(matching.cvId, matching.userId);
      const updatedMatchings = [...cv.jobMatchings, matching];
      
      await this.collection.doc(matching.cvId).update({
        jobMatchings: updatedMatchings,
        updatedAt: new Date()
      });

      logger.info('Job matching sauvegardé', {
        matchingId,
        cvId: matching.cvId,
        matchingScore: matching.matchingScore
      });
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du matching:', error);
      throw error;
    }
  }

  /**
   * Exporter un CV
   */
  static async exportCV(cv: CV, format: string): Promise<CVExport> {
    try {
      const exportId = db.collection(COLLECTIONS.CV_EXPORTS).doc().id;
      let fileBuffer: Buffer;
      let fileName: string;

      // Générer le fichier selon le format
      switch (format.toLowerCase()) {
        case 'pdf':
          fileBuffer = await this.generateCVPDF(cv);
          fileName = `${cv.title}.pdf`;
          break;
        case 'docx':
          fileBuffer = await this.generateCVDOCX(cv);
          fileName = `${cv.title}.docx`;
          break;
        case 'html':
          fileBuffer = await this.generateCVHTML(cv);
          fileName = `${cv.title}.html`;
          break;
        case 'json':
          fileBuffer = Buffer.from(JSON.stringify(cv, null, 2));
          fileName = `${cv.title}.json`;
          break;
        default:
          throw new ValidationError('Format d\'export non supporté');
      }

      // Ici, vous devriez uploader le fichier vers votre stockage (Firebase Storage, AWS S3, etc.)
      // Pour l'exemple, on simule une URL de téléchargement
      const downloadUrl = `https://storage.example.com/exports/${exportId}/${fileName}`;

      const cvExport: CVExport = {
        id: exportId,
        cvId: cv.id,
        format: format as any,
        fileName,
        fileSize: fileBuffer.length,
        downloadUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        downloadCount: 0,
        createdAt: new Date()
      };

      // Sauvegarder l'export en base
      await db.collection(COLLECTIONS.CV_EXPORTS).doc(exportId).set(cvExport);

      // Ajouter l'export au CV
      const updatedExports = [...cv.exports, cvExport];
      await this.collection.doc(cv.id).update({
        exports: updatedExports,
        updatedAt: new Date()
      });

      logger.info('CV exporté avec succès', {
        exportId,
        cvId: cv.id,
        format,
        fileSize: fileBuffer.length
      });

      return cvExport;
    } catch (error) {
      logger.error('Erreur lors de l\'export du CV:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques CV d'un utilisateur
   */
  static async getUserCVStats(userId: string, period: string = 'month'): Promise<any> {
    try {
      const snapshot = await this.collection.where('userId', '==', userId).get();
      const cvs = snapshot.docs.map(doc => doc.data() as CV);

      const stats = {
        totalCVs: cvs.length,
        draftCVs: cvs.filter(cv => cv.status === 'draft').length,
        completedCVs: cvs.filter(cv => cv.status === 'completed').length,
        publishedCVs: cvs.filter(cv => cv.status === 'published').length,
        cvsByRegion: this.groupByRegion(cvs),
        recentActivity: this.getRecentActivity(cvs, period),
        avgAnalysisScore: this.calculateAvgAnalysisScore(cvs)
      };

      return stats;
    } catch (error) {
      logger.error('Erreur lors du calcul des stats CV:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  private static async getUserCVCount(userId: string): Promise<number> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.size;
  }

  private static getMaxCVsForUser(subscription: any): number {
    if (!subscription || subscription.plan === 'free') {
      return 2; // Plan gratuit : 2 CV
    }
    
    if (subscription.plan === 'basic') {
      return 5; // Plan basic : 5 CV
    }
    
    if (subscription.plan === 'pro') {
      return 15; // Plan pro : 15 CV
    }
    
    return 50; // Plan premium : 50 CV
  }

  private static async generateCVPDF(cv: CV): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // En-tête avec informations personnelles
        doc.fontSize(20).text(`${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`, {
          align: 'center'
        });
        
        doc.fontSize(12).text(`${cv.personalInfo.email} | ${cv.personalInfo.phone}`, {
          align: 'center'
        });

        if (cv.personalInfo.address) {
          doc.text(`${cv.personalInfo.address.city}, ${cv.personalInfo.address.country}`, {
            align: 'center'
          });
        }

        doc.moveDown();

        // Résumé professionnel
        if (cv.personalInfo.professionalSummary) {
          doc.fontSize(14).text('Résumé Professionnel', { underline: true });
          doc.fontSize(11).text(cv.personalInfo.professionalSummary);
          doc.moveDown();
        }

        // Sections du CV
        cv.sections.forEach(section => {
          doc.fontSize(14).text(section.title, { underline: true });
          
          // Contenu selon le type de section
          if (section.content.workExperience) {
            section.content.workExperience.forEach(exp => {
              doc.fontSize(12).text(`${exp.position} - ${exp.company}`, { continued: true });
              doc.text(` (${exp.startDate.getFullYear()}-${exp.endDate?.getFullYear() || 'présent'})`, { align: 'right' });
              doc.fontSize(10).text(exp.description);
              doc.moveDown(0.5);
            });
          }

          if (section.content.education) {
            section.content.education.forEach(edu => {
              doc.fontSize(12).text(`${edu.degree} - ${edu.institution}`, { continued: true });
              doc.text(` (${edu.startDate.getFullYear()}-${edu.endDate?.getFullYear() || 'présent'})`, { align: 'right' });
              doc.fontSize(10).text(`${edu.field}`);
              doc.moveDown(0.5);
            });
          }

          if (section.content.skills) {
            const skillsText = section.content.skills.map(skill => `${skill.name} (${skill.level}/5)`).join(', ');
            doc.fontSize(11).text(skillsText);
          }

          doc.moveDown();
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async generateCVDOCX(cv: CV): Promise<Buffer> {
    try {
      const doc = new Document({
        sections: [{
          children: [
            // En-tête
            new Paragraph({
              text: `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`,
              heading: 'Title'
            }),
            new Paragraph({
              text: `${cv.personalInfo.email} | ${cv.personalInfo.phone}`
            }),
            
            // Sections du CV
            ...cv.sections.flatMap(section => [
              new Paragraph({
                text: section.title,
                heading: 'Heading1'
              }),
              // Ajouter le contenu selon le type de section
              new Paragraph({
                text: this.formatSectionContent(section)
              })
            ])
          ]
        }]
      });

      return await Packer.toBuffer(doc);
    } catch (error) {
      logger.error('Erreur génération DOCX:', error);
      throw error;
    }
  }

  private static async generateCVHTML(cv: CV): Promise<Buffer> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cv.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .name { font-size: 24px; font-weight: bold; }
          .contact { margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="name">${cv.personalInfo.firstName} ${cv.personalInfo.lastName}</div>
          <div class="contact">${cv.personalInfo.email} | ${cv.personalInfo.phone}</div>
        </div>
        
        ${cv.sections.map(section => `
          <div class="section">
            <div class="section-title">${section.title}</div>
            <div>${this.formatSectionContent(section)}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    return Buffer.from(html, 'utf8');
  }

  private static formatSectionContent(section: any): string {
    if (section.content.workExperience) {
      return section.content.workExperience.map((exp: any) => 
        `${exp.position} - ${exp.company} (${exp.startDate.getFullYear()}-${exp.endDate?.getFullYear() || 'présent'})\n${exp.description}`
      ).join('\n\n');
    }

    if (section.content.education) {
      return section.content.education.map((edu: any) => 
        `${edu.degree} - ${edu.institution} (${edu.startDate.getFullYear()}-${edu.endDate?.getFullYear() || 'présent'})`
      ).join('\n');
    }

    if (section.content.skills) {
      return section.content.skills.map((skill: any) => `${skill.name} (${skill.level}/5)`).join(', ');
    }

    return section.content.customContent || '';
  }

  private static groupByRegion(cvs: CV[]): Record<string, number> {
    return cvs.reduce((acc, cv) => {
      acc[cv.region] = (acc[cv.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private static getRecentActivity(cvs: CV[], period: string): any[] {
    const now = new Date();
    const periodMs = period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    
    return cvs
      .filter(cv => now.getTime() - cv.updatedAt.getTime() < periodMs)
      .map(cv => ({
        id: cv.id,
        title: cv.title,
        action: 'updated',
        date: cv.updatedAt
      }));
  }

  private static calculateAvgAnalysisScore(cvs: CV[]): number {
    const analyzed = cvs.filter(cv => cv.lastAnalysis);
    if (analyzed.length === 0) return 0;
    
    const total = analyzed.reduce((sum, cv) => sum + (cv.lastAnalysis?.overallScore || 0), 0);
    return Math.round(total / analyzed.length);
  }

  /**
   * Obtenir les templates CV
   */
  static async getCVTemplates(filters: {
    region?: string;
    style?: string;
    industry?: string;
    experienceLevel?: string;
  } = {}): Promise<any[]> {
    try {
      // Pour l'instant, on retourne des templates par défaut
      // Dans une vraie application, ceci viendrait d'une base de données
      const defaultTemplates = [
        {
          id: 'template-modern-1',
          name: 'Moderne Professionnel',
          description: 'Template moderne et épuré, parfait pour tous les secteurs',
          region: 'international',
          style: 'modern',
          industry: ['tech', 'marketing', 'design'],
          experienceLevel: 'mid',
          isPublic: true,
          isPremium: false,
          creatorId: 'system',
          usageCount: 1250,
          rating: 4.8,
          tags: ['moderne', 'épuré', 'universel'],
          culturalNotes: ['Adapté à tous les pays', 'Design contemporain'],
          requiredSections: ['personal_info', 'work_experience', 'education', 'skills'],
          optionalSections: ['projects', 'languages', 'certifications'],
          prohibitedElements: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'template-classic-1',
          name: 'Classique Traditionnel',
          description: 'Template traditionnel et professionnel, valeur sûre',
          region: 'international',
          style: 'classic',
          industry: ['finance', 'legal', 'consulting'],
          experienceLevel: 'senior',
          isPublic: true,
          isPremium: false,
          creatorId: 'system',
          usageCount: 980,
          rating: 4.6,
          tags: ['classique', 'professionnel', 'traditionnel'],
          culturalNotes: ['Format standard', 'Présentation formelle'],
          requiredSections: ['personal_info', 'work_experience', 'education'],
          optionalSections: ['skills', 'languages', 'hobbies'],
          prohibitedElements: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'template-creative-1',
          name: 'Créatif Original',
          description: 'Template créatif et original, pour se démarquer',
          region: 'international',
          style: 'creative',
          industry: ['design', 'marketing', 'media'],
          experienceLevel: 'mid',
          isPublic: true,
          isPremium: true,
          creatorId: 'system',
          usageCount: 750,
          rating: 4.9,
          tags: ['créatif', 'original', 'artistique'],
          culturalNotes: ['Design innovant', 'Mise en page créative'],
          requiredSections: ['personal_info', 'work_experience', 'skills'],
          optionalSections: ['projects', 'portfolio', 'certifications'],
          prohibitedElements: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Filtrer selon les critères
      let filteredTemplates = defaultTemplates;

      if (filters.region && filters.region !== 'international') {
        filteredTemplates = filteredTemplates.filter(t => 
          t.region === filters.region || t.region === 'international'
        );
      }

      if (filters.style) {
        filteredTemplates = filteredTemplates.filter(t => t.style === filters.style);
      }

      if (filters.experienceLevel) {
        filteredTemplates = filteredTemplates.filter(t => 
          t.experienceLevel === filters.experienceLevel || t.experienceLevel === 'mid'
        );
      }

      if (filters.industry) {
        filteredTemplates = filteredTemplates.filter(t => 
          t.industry.includes(filters.industry)
        );
      }

      logger.info('Templates CV récupérés', {
        total: filteredTemplates.length,
        filters
      });

      return filteredTemplates;
    } catch (error) {
      logger.error('Erreur lors de la récupération des templates:', error);
      throw error;
    }
  }
}