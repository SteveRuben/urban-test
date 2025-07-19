// src/services/letter.service.ts
import { logger } from 'firebase-functions';
import { db, COLLECTIONS } from '../config/firebase';
import { Letter, LetterStats } from '../models/letter.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.util';
import { ValidationUtil } from '../utils/validation.util';
import { SubscriptionService } from './subscription.service';
import PDFDocument from 'pdfkit';
import docx from 'docx';
import { ExportOptions } from '../controllers/letter.controller';
import { JSDOM } from 'jsdom';
import { EnhancedTemplateService } from './enhanced-template.service';
import { NotificationService } from './notification.service';
const { Document, Paragraph, Packer, AlignmentType, TableRow, TableCell, Table } = docx;

export class LetterService {
  private static collection = db.collection(COLLECTIONS.LETTERS);

  /**
   * Créer une nouvelle lettre
   */
  static async createLetter(userId: string, letterData: Partial<Letter>): Promise<Letter> {
    try {
      // Validation des données requises
      const requiredFields = ['title', 'content'];
      const missingFields = ValidationUtil.validateRequiredFields(letterData, requiredFields);
      
      if (missingFields.length > 0) {
        throw new ValidationError(`Champs manquants: ${missingFields.join(', ')}`);
      }

      // Vérification des limites d'abonnement
      const letterLimits = await SubscriptionService.checkLetterCreationLimit(userId);
      if (!letterLimits.canCreate) {
        throw new ForbiddenError(
          `Limite de lettres atteinte (${letterLimits.currentCount}/${letterLimits.limit}). Mettez à niveau votre abonnement pour créer plus de lettres.`
        );
      }

      const letterId = this.collection.doc().id;
      
      const newLetter: Letter = {
        id: letterId,
        userId,
        title: ValidationUtil.sanitizeString(letterData.title!),
        content: letterData.content!,
        jobTitle: letterData.jobTitle ? ValidationUtil.sanitizeString(letterData.jobTitle) : undefined,
        company: letterData.company ? ValidationUtil.sanitizeString(letterData.company) : undefined,
        recipient: letterData.recipient,
        status: letterData.status || 'draft',
        isAIGenerated: letterData.isAIGenerated || false,
        aiPromptUsed: letterData.aiPromptUsed,
        aiModel: letterData.aiModel,
        templateId: letterData.templateId ?? '',
        viewCount: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.debug('Création d\'une nouvelle lettre', {newLetter});

      // Créer la lettre
      await this.collection.doc(letterId).set(newLetter);

      return newLetter;
    } catch (error) {
      console.error('Erreur lors de la création de la lettre:', error);
      throw error;
    }
  }

  /**
   * Récupérer une lettre par ID
   */
  static async getLetterById(letterId: string, userId: string): Promise<Letter> {
    try {
      if (!ValidationUtil.isValidObjectId(letterId)) {
        throw new ValidationError('ID lettre invalide');
      }

      const letterDoc = await this.collection.doc(letterId).get();
      
      if (!letterDoc.exists) {
        throw new NotFoundError('Lettre non trouvée');
      }

      const letterData = letterDoc.data() as Letter;
      
      // Vérifier que l'utilisateur est le propriétaire
      if (letterData.userId !== userId) {
        throw new ForbiddenError('Accès non autorisé à cette lettre');
      }

      // Incrémenter le compteur de vues
      await this.incrementViewCount(letterId);

      return {
        ...letterData,
        createdAt: letterData.createdAt,
        updatedAt: letterData.updatedAt,
        finalizedAt: letterData.finalizedAt
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la lettre:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les lettres d'un utilisateur
   */
  static async getUserLetters(
    userId: string, 
    options: {
      status?: 'draft' | 'final';
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{letters: Letter[], total: number}> {
    try {
      let query = this.collection.where('userId', '==', userId);

      // Filtrer par statut si spécifié
      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      // Tri
      const sortBy = options.sortBy || 'updatedAt';
      const sortOrder = options.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Pagination
      if (options.offset) {
        query = query.offset(options.offset);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const letters = snapshot.docs.map(doc => {
        const data = doc.data() as Letter;
        return {
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          finalizedAt: data.finalizedAt
        };
      });

      // Compter le total
      const totalSnapshot = await this.collection
        .where('userId', '==', userId)
        .get();
      
      return {
        letters,
        total: totalSnapshot.size
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des lettres:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une lettre
   */
  static async updateLetter(letterId: string, userId: string, updateData: Partial<Letter>): Promise<Letter> {
    try {
      if (!ValidationUtil.isValidObjectId(letterId)) {
        throw new ValidationError('ID lettre invalide');
      }

      // Vérifier que la lettre existe et appartient à l'utilisateur
      const existingLetter = await this.getLetterById(letterId, userId);

      // Préparer les données de mise à jour
      const updateFields: Partial<Letter> = {
        ...updateData,
        updatedAt: new Date()
      };

      // Nettoyer les champs string
      if (updateFields.title) {
        updateFields.title = ValidationUtil.sanitizeString(updateFields.title);
      }
      if (updateFields.jobTitle) {
        updateFields.jobTitle = ValidationUtil.sanitizeString(updateFields.jobTitle);
      }
      if (updateFields.company) {
        updateFields.company = ValidationUtil.sanitizeString(updateFields.company);
      }

      // Si on passe en statut final, ajouter la date de finalisation
      if (updateFields.status === 'final' && existingLetter.status === 'draft') {
        updateFields.finalizedAt = new Date();
      }

      // Incrémenter la version
      if (updateFields.content !== existingLetter.content) {
        updateFields.version = (existingLetter.version || 1) + 1;
      }

      // Empêcher la modification de certains champs
      delete updateFields.id;
      delete updateFields.userId;
      delete updateFields.createdAt;

      // Mettre à jour
      await this.collection.doc(letterId).update(updateFields);

      // Retourner la lettre mise à jour
      return await this.getLetterById(letterId, userId);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la lettre:', error);
      throw error;
    }
  }

  /**
   * Supprimer une lettre
   */
  static async deleteLetter(letterId: string, userId: string): Promise<void> {
    try {
      if (!ValidationUtil.isValidObjectId(letterId)) {
        throw new ValidationError('ID lettre invalide');
      }

      // Vérifier que la lettre existe et appartient à l'utilisateur
      await this.getLetterById(letterId, userId);

      // Supprimer la lettre
      await this.collection.doc(letterId).delete();
    } catch (error) {
      console.error('Erreur lors de la suppression de la lettre:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des lettres d'un utilisateur
   */
  static async getUserLetterStats(userId: string): Promise<LetterStats> {
    try {
      const snapshot = await this.collection.where('userId', '==', userId).get();
      const letters = snapshot.docs.map(doc => doc.data() as Letter);

      const stats: LetterStats = {
        totalCount: letters.length,
        draftCount: letters.filter(l => l.status === 'draft').length,
        finalCount: letters.filter(l => l.status === 'final').length,
        aiGeneratedCount: letters.filter(l => l.isAIGenerated).length,
        mostUsedTemplates: [],
        topCompanies: [],
        topPositions: [],
        creationsByMonth: {}
      };

      // Calculer les modèles les plus utilisés
      const templateCounts = new Map<string, number>();
      letters.forEach(letter => {
        if (letter.templateId) {
          templateCounts.set(letter.templateId, (templateCounts.get(letter.templateId) || 0) + 1);
        }
      });
      stats.mostUsedTemplates = Array.from(templateCounts.entries())
        .map(([templateId, count]) => ({ templateId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculer les entreprises les plus mentionnées
      const companyCounts = new Map<string, number>();
      letters.forEach(letter => {
        if (letter.company) {
          companyCounts.set(letter.company, (companyCounts.get(letter.company) || 0) + 1);
        }
      });
      stats.topCompanies = Array.from(companyCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculer les postes les plus mentionnés
      const positionCounts = new Map<string, number>();
      letters.forEach(letter => {
        if (letter.jobTitle) {
          positionCounts.set(letter.jobTitle, (positionCounts.get(letter.jobTitle) || 0) + 1);
        }
      });
      stats.topPositions = Array.from(positionCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculer les créations par mois
      letters.forEach(letter => {
        const monthKey = letter.createdAt.toISOString().substring(0, 7); // YYYY-MM
        stats.creationsByMonth[monthKey] = (stats.creationsByMonth[monthKey] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  }

  /**
   * Obtenir le nombre de lettres d'un utilisateur
   */
  // @ts-ignore
  private static async getUserLetterCount(userId: string): Promise<number> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.size;
  }

  /**
   * Incrémenter le compteur de vues
   */
  static async incrementViewCount(letterId: string): Promise<void> {
    const letterRef = this.collection.doc(letterId);
    try {
      await letterRef.update({
        viewCount: (await letterRef.get()).data()?.viewCount + 1 || 1
      });
    } catch (error) {
      // Ignorer les erreurs de compteur de vues
      console.log('Erreur lors de l\'incrémentation des vues:', error);
    }
  }

  /**
   * Dupliquer une lettre
   */
  static async duplicateLetter(letterId: string, userId: string): Promise<Letter> {
    try {
      const originalLetter = await this.getLetterById(letterId, userId);
      
      const duplicateData: Partial<Letter> = {
        title: `${originalLetter.title} - Copie`,
        content: originalLetter.content,
        jobTitle: originalLetter.jobTitle,
        company: originalLetter.company,
        recipient: originalLetter.recipient,
        status: 'draft', // Toujours en brouillon
        templateId: originalLetter.templateId
      };

      return await this.createLetter(userId, duplicateData);
    } catch (error) {
      console.error('Erreur lors de la duplication de la lettre:', error);
      throw error;
    }
  }

  private static firebaseTimeStamptoDate(params:any) : Date {
    if(params.hasOwnProperty("_seconds")){
      const milliseconds = params._seconds*1000 + params._nanoseconds/1000000;
      return new Date(milliseconds);
    }
    return new Date();
  }
 /**
   * Génère un fichier PDF à partir d'une lettre avec les options spécifiées
   */
  static async generatePDF(letter: Letter, user: any, options: ExportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Créer un tampon pour stocker le PDF
        const chunks: Buffer[] = [];
        
        // Convertir les marges de cm à points (1 cm = 28.35 points)
        const margins = {
          top: options.margins?.top ? options.margins.top * 28.35 : 50,
          right: options.margins?.right ? options.margins.right * 28.35 : 50,
          bottom: options.margins?.bottom ? options.margins.bottom * 28.35 : 50,
          left: options.margins?.left ? options.margins.left * 28.35 : 50
        };
        
        // Créer un nouveau document PDF avec les options spécifiées
        const doc = new PDFDocument({
          margins: margins,
          size: 'A4',
          info: options.includeMetadata ? {
            Title: letter.title,
            Author: user?.displayName || 'Utilisateur',
            Subject: letter.jobTitle || 'Lettre de motivation',
            Keywords: 'lettre, candidature, motivation',
            CreationDate: LetterService.firebaseTimeStamptoDate(letter.createdAt),
            ModificationDate: LetterService.firebaseTimeStamptoDate(letter.updatedAt)
          } : undefined
        });
        
        // Configurer la qualité
        if (options.quality === 'high') {
          doc.compress(false);
        } else if (options.quality === 'ultra') {
          doc.compress(false);
          // PDFKit n'a pas d'option directe pour la qualité ultra, mais on pourrait
          // configurer des paramètres supplémentaires ici si nécessaire
        }
        
        // Capturer les données du PDF dans notre tampon
        doc.on('data', (chunk) => chunks.push(chunk));
        
        // Résoudre la promesse avec le buffer complet quand le document est terminé
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // Appliquer le filigrane si demandé
        if (options.includeWatermark) {
          // Ajouter un filigrane en arrière-plan sur chaque page
          doc.on('pageAdded', () => {
            const { width, height } = doc.page;
            
            // Sauvegarder l'état actuel
            doc.save();
            
            // Configurer le texte du filigrane
            doc.fillColor('#EEEEEE', 0.3)
               .fontSize(60)
               .rotate(45, { origin: [width / 2, height / 2] })
               .text('motivationletter.ai', width / 2 - 150, height / 2 - 30, {
                 align: 'center'
               });
            
            // Restaurer l'état précédent
            doc.restore();
          });
        }
        
        // Couleurs et styles
        const primaryColor = '#333333';
        const secondaryColor = '#4a86e8';
        
        // Configurer la police
        doc.font(`${options.fontFamily}-Bold`).fontSize(options.fontSize + 2).fillColor(primaryColor);
        
        // Informations de l'expéditeur (en haut à gauche)
        const senderName = user?.displayName || 'Nom Prénom';
        doc.text(senderName, { continued: false });
        
        doc.font(`${options.fontFamily}`).fontSize(options.fontSize - 2).fillColor('#666666');
        doc.text(user?.email || 'email@example.com');
        doc.text(user?.phoneNumber || '+33 6 XX XX XX XX');
        doc.text(user?.address || 'Adresse, Code Postal, Ville');
        
        // Date (en haut à droite)
        const date = new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        doc.fontSize(options.fontSize - 2).text(date, { align: 'right' });
        doc.moveDown();
        
        // Informations du destinataire (en dessous à droite)
        doc.font(`${options.fontFamily}-Bold`).fontSize(options.fontSize).fillColor(primaryColor);
        if (letter.recipient?.name) {
          doc.text(letter.recipient.name, { align: 'right' });
        } else if (letter.company) {
          doc.text(letter.company, { align: 'right' });
        }
        
        // Ligne séparatrice
        doc.moveTo(margins.left, 130)
           .lineTo(doc.page.width - margins.right, 130)
           .lineWidth(1)
           .stroke(secondaryColor);
        
        // Objet de la lettre
        doc.font(`${options.fontFamily}-Bold`).fontSize(options.fontSize + 2).fillColor(primaryColor);
        let objectText = "Objet : ";
        if (letter.jobTitle) {
          objectText += `Candidature au poste de ${letter.jobTitle}`;
          if (letter.company) {
            objectText += ` chez ${letter.company}`;
          }
        } else {
          objectText += letter.title;
        }
        doc.text(objectText, { continued: false });
        
        // Formule de politesse
        doc.moveDown();
        doc.font(`${options.fontFamily}`).fontSize(options.fontSize).fillColor(primaryColor);
        doc.text("Madame, Monsieur,", { continued: false });
        
        // Contenu principal de la lettre
        doc.moveDown();
        doc.font(`${options.fontFamily}`).fontSize(options.fontSize).fillColor('#333333');
        doc.text(letter.content, {
          align: 'justify',
          lineGap: 7
        });
        
        // Formule de politesse finale
        /* doc.moveDown(2);
        doc.font(`${options.fontFamily}`).fontSize(options.fontSize).fillColor('#333333');
        doc.text("Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."); */
        
        // Signature
        /* doc.moveDown(2);
        doc.font(`${options.fontFamily}-Bold`).fontSize(options.fontSize).fillColor(primaryColor);
        doc.text(senderName, { align: 'right' }); */
        
        // Footer avec pagination et métadonnées
        if (options.includeMetadata) {
          doc.font(`${options.fontFamily}`).fontSize(8).fillColor('#999999');
          doc.text(`Créé le ${LetterService.firebaseTimeStamptoDate(letter.createdAt).toLocaleDateString('fr-FR')} - Dernière modification le ${LetterService.firebaseTimeStamptoDate(letter.updatedAt).toLocaleDateString('fr-FR')}`, margins.left, doc.page.height - 30, { align: 'left' });
          doc.text('Page 1', { align: 'right' });
        }
        
        // Finaliser le document
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Génère un fichier DOCX à partir d'une lettre avec les options spécifiées
   */
  static async generateDOCX(letter: Letter, user: any, options: ExportOptions): Promise<Buffer> {
    try {
      // Convertir les marges de cm à twips (1 cm = 566.9 twips)
      const margins = {
        top: options.margins?.top ? Math.round(options.margins.top * 566.9) : 1134,
        right: options.margins?.right ? Math.round(options.margins.right * 566.9) : 1134,
        bottom: options.margins?.bottom ? Math.round(options.margins.bottom * 566.9) : 1134,
        left: options.margins?.left ? Math.round(options.margins.left * 566.9) : 1134
      };
      
      // Informations de l'expéditeur
      const senderName = user?.displayName || 'Nom Prénom';
      const senderEmail = user?.email || 'email@example.com';
      const senderPhone = user?.phoneNumber || '+33 6 XX XX XX XX';
      const senderAddress = user?.address || 'Adresse, Code Postal, Ville';
      
      // Date formatée
      const date = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      // Objet de la lettre
      let objectText = "Objet : ";
      if (letter.jobTitle) {
        objectText += `Candidature au poste de ${letter.jobTitle}`;
        if (letter.company) {
          objectText += ` chez ${letter.company}`;
        }
      } else {
        objectText += letter.title;
      }
      
      // Préparer les paragraphes pour le contenu
      const contentParagraphs = letter.content.split('\n').map(line => 
        new Paragraph({
          text: line,
          spacing: {
            after: 200,
            line: 276, // Equivalent à 1.15 fois la hauteur de ligne
          },
          alignment: AlignmentType.JUSTIFIED,
          style: "Normal"
        })
      );
      
      // Créer un nouveau document DOCX
      const doc = new Document({
        creator: options.includeMetadata ? (user?.displayName || 'Utilisateur') : undefined,
        title: options.includeMetadata ? letter.title : undefined,
        subject: options.includeMetadata ? (letter.jobTitle || 'Lettre de motivation') : undefined,
        description: options.includeMetadata ? 'Document généré par motivationletter.ai' : undefined,
        styles: {
          paragraphStyles: [
            {
              id: "Normal",
              name: "Normal",
              run: {
                size: options.fontSize * 2, // DOCX utilise des demi-points pour la taille
                font: options.fontFamily
              }
            },
            {
              id: "Heading1",
              name: "Heading 1",
              run: {
                size: (options.fontSize + 2) * 2,
                font: options.fontFamily,
                bold: true
              }
            }
          ]
        },
        sections: [{
          properties: {
            page: {
              margin: {
                top: margins.top,
                right: margins.right,
                bottom: margins.bottom,
                left: margins.left
              }
            }
          },
          headers: {
            default: options.includeWatermark ? new docx.Header({
              children: [
                new Paragraph({
                  text: "MotivationLetterAI",
                  alignment: AlignmentType.CENTER,
                  style: "Normal",
                  // @ts-ignore
                  color: "DDDDDD"
                })
              ]
            }) : undefined
          },
          children: [
            // En-tête avec informations de l'expéditeur
            new Table({
              width: {
                size: 100,
                type: docx.WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    // Colonne gauche : Informations de l'expéditeur
                    new TableCell({
                      width: {
                        size: 50,
                        type: docx.WidthType.PERCENTAGE,
                      },
                      children: [
                        new Paragraph({
                          text: senderName,
                          style: "Heading1"
                        }),
                        new Paragraph({
                          text: senderEmail,
                          style: "Normal"
                        }),
                        new Paragraph({
                          text: senderPhone,
                          style: "Normal"
                        }),
                        new Paragraph({
                          text: senderAddress,
                          style: "Normal"
                        })
                      ],
                      borders: {
                        top: { style: docx.BorderStyle.NONE },
                        bottom: { style: docx.BorderStyle.NONE },
                        left: { style: docx.BorderStyle.NONE },
                        right: { style: docx.BorderStyle.NONE }
                      }
                    }),
                    // Colonne droite : Date et destinataire
                    new TableCell({
                      width: {
                        size: 50,
                        type: docx.WidthType.PERCENTAGE,
                      },
                      children: [
                        new Paragraph({
                          text: date,
                          alignment: AlignmentType.RIGHT,
                          style: "Normal"
                        }),
                        new Paragraph({
                          text: letter.recipient?.name || letter.company || "",
                          alignment: AlignmentType.RIGHT,
                          style: "Heading1"
                        })
                      ],
                      borders: {
                        top: { style: docx.BorderStyle.NONE },
                        bottom: { style: docx.BorderStyle.NONE },
                        left: { style: docx.BorderStyle.NONE },
                        right: { style: docx.BorderStyle.NONE }
                      }
                    })
                  ]
                })
              ]
            }),
            
            // Ligne séparatrice
            new Paragraph({
              text: "",
              border: {
                bottom: {
                  color: "4a86e8",
                  space: 1,
                  style: docx.BorderStyle.SINGLE,
                  size: 6
                }
              }
            }),
            
            // Objet de la lettre
            new Paragraph({
              text: objectText,
              spacing: {
                before: 400,
                after: 400
              },
              style: "Heading1"
            }),
            
            // Formule d'introduction
            new Paragraph({
              text: "Madame, Monsieur,",
              spacing: {
                after: 400
              },
              style: "Normal"
            }),
            
            // Contenu principal
            ...contentParagraphs,
            
            // Formule de politesse
            new Paragraph({
              text: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
              spacing: {
                before: 400,
                after: 400
              },
              style: "Normal"
            }),
            
            // Signature
            new Paragraph({
              text: senderName,
              alignment: AlignmentType.RIGHT,
              spacing: {
                before: 800
              },
              style: "Heading1"
            })
          ],
          footers: {
            default: options.includeMetadata ? new docx.Footer({
              children: [
                new Paragraph({
                  text: `Créé le ${LetterService.firebaseTimeStamptoDate(letter.createdAt).toLocaleDateString('fr-FR')} - Dernière modification le ${LetterService.firebaseTimeStamptoDate(letter.updatedAt).toLocaleDateString('fr-FR')}`,
                  style: "Normal",
                  // @ts-ignore
                  size: 16, // 8pt
                  color: "999999"
                })
              ]
            }) : undefined
          }
        }]
      });
      
      // Générer le document DOCX
      return await Packer.toBuffer(doc);
    } catch (error) {
      console.error('Erreur lors de la génération du DOCX:', error);
      throw error;
    }
  }
  
  /**
   * Génère un fichier TXT à partir d'une lettre
   */
  static async generateTXT(letter: Letter, options: ExportOptions): Promise<Buffer> {
    try {
      const lines: string[] = [];
      
      // Titre
      lines.push(letter.title.toUpperCase());
      lines.push('');
      
      // Date
      const date = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      lines.push(date);
      lines.push('');
      
      // Objet
      let objectText = "Objet : ";
      if (letter.jobTitle) {
        objectText += `Candidature au poste de ${letter.jobTitle}`;
        if (letter.company) {
          objectText += ` chez ${letter.company}`;
        }
      } else {
        objectText += letter.title;
      }
      lines.push(objectText);
      lines.push('');
      
      // Formule d'introduction
      lines.push("Madame, Monsieur,");
      lines.push('');
      
      // Contenu principal
      lines.push(letter.content);
      lines.push('');
      
      // Formule de politesse
      lines.push("Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.");
      lines.push('');
      
      // Métadonnées
      if (options.includeMetadata) {
        lines.push('--------------------');
        lines.push(`Créé le ${LetterService.firebaseTimeStamptoDate(letter.createdAt).toLocaleDateString('fr-FR')}`);
        lines.push(`Dernière modification le ${LetterService.firebaseTimeStamptoDate(letter.updatedAt).toLocaleDateString('fr-FR')}`);
      }
      
      // Joindre toutes les lignes avec des sauts de ligne
      const content = lines.join('\n');
      
      // Créer un buffer avec le contenu
      return Buffer.from(content, 'utf8');
    } catch (error) {
      console.error('Erreur lors de la génération du TXT:', error);
      throw error;
    }
  }
  
  /**
   * Génère un fichier HTML à partir d'une lettre
   */
  static async generateHTML(letter: Letter, user: any, options: ExportOptions): Promise<Buffer> {
    try {
      const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
      const document = dom.window.document;
      
      // Ajouter les métadonnées
      const head = document.head;
      
      // Ajouter le titre
      const title = document.createElement('title');
      title.textContent = letter.title;
      head.appendChild(title);
      
      // Ajouter les métadonnées si demandé
      if (options.includeMetadata) {
        const metaAuthor = document.createElement('meta');
        metaAuthor.setAttribute('name', 'author');
        metaAuthor.setAttribute('content', user?.displayName || 'Utilisateur');
        head.appendChild(metaAuthor);
        
        const metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        metaDescription.setAttribute('content', `Lettre de motivation pour ${letter.jobTitle || 'un poste'} ${letter.company ? 'chez ' + letter.company : ''}`);
        head.appendChild(metaDescription);
      }
      
      // Ajouter le style CSS
      const style = document.createElement('style');
      style.textContent = `
        body {
          font-family: ${options.fontFamily}, 'Times New Roman', serif;
          font-size: ${options.fontSize}pt;
          line-height: 1.5;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: ${options.margins?.top || 2.5}cm ${options.margins?.right || 2.5}cm ${options.margins?.bottom || 2.5}cm ${options.margins?.left || 2.5}cm;
          position: relative;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .sender-info {
          flex: 1;
        }
        
        .sender-name {
          font-weight: bold;
          font-size: ${options.fontSize + 2}pt;
        }
        
        .recipient-info {
          text-align: right;
          flex: 1;
        }
        
        .divider {
          border-bottom: 1px solid #4a86e8;
          margin: 20px 0;
        }
        
        .object {
          font-weight: bold;
          font-size: ${options.fontSize + 2}pt;
          margin: 20px 0;
        }
        
        .content {
          text-align: justify;
          white-space: pre-line;
        }
        
        .signature {
          text-align: right;
          margin-top: 40px;
          font-weight: bold;
        }
        
        .footer {
          margin-top: 40px;
          font-size: 8pt;
          color: #999;
        }
        
        ${options.includeWatermark ? `
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 60pt;
          color: rgba(238, 238, 238, 0.3);
          z-index: -1;
          pointer-events: none;
        }
        ` : ''}
      `;
      head.appendChild(style);
      
      // Créer le contenu HTML
      const body = document.body;
      
      // Filigrane si demandé
      if (options.includeWatermark) {
        const watermark = document.createElement('div');
        watermark.className = 'watermark';
        watermark.textContent = 'motivationletter.ai';
        body.appendChild(watermark);
      }
      
      // En-tête avec informations de l'expéditeur et destinataire
      const header = document.createElement('div');
      header.className = 'header';
      
      // Informations de l'expéditeur
      const senderInfo = document.createElement('div');
      senderInfo.className = 'sender-info';
      
      const senderName = document.createElement('div');
      senderName.className = 'sender-name';
      senderName.textContent = user?.displayName || 'Nom Prénom';
      senderInfo.appendChild(senderName);
      
      const senderEmail = document.createElement('div');
      senderEmail.textContent = user?.email || 'email@example.com';
      senderInfo.appendChild(senderEmail);
      
      const senderPhone = document.createElement('div');
      senderPhone.textContent = user?.phoneNumber || '+33 6 XX XX XX XX';
      senderInfo.appendChild(senderPhone);
      
      const senderAddress = document.createElement('div');
      senderAddress.textContent = user?.address || 'Adresse, Code Postal, Ville';
      senderInfo.appendChild(senderAddress);
      
      header.appendChild(senderInfo);
      
      // Informations du destinataire
      const recipientInfo = document.createElement('div');
      recipientInfo.className = 'recipient-info';
      
      const date = document.createElement('div');
      date.textContent = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      recipientInfo.appendChild(date);
      
      if (letter.recipient?.name || letter.company) {
        const recipient = document.createElement('div');
        recipient.className = 'sender-name';
        recipient.textContent = letter.recipient?.name || letter.company || '';
        recipientInfo.appendChild(recipient);
      }
      
      header.appendChild(recipientInfo);
      body.appendChild(header);
      
      // Ligne séparatrice
      const divider = document.createElement('div');
      divider.className = 'divider';
      body.appendChild(divider);
      
      // Objet de la lettre
      const object = document.createElement('div');
      object.className = 'object';
      let objectText = "Objet : ";
      if (letter.jobTitle) {
        objectText += `Candidature au poste de ${letter.jobTitle}`;
        if (letter.company) {
          objectText += ` chez ${letter.company}`;
        }
      } else {
        objectText += letter.title;
      }
      object.textContent = objectText;
      body.appendChild(object);
      
      // Formule d'introduction
      const intro = document.createElement('p');
      intro.textContent = "Madame, Monsieur,";
      body.appendChild(intro);
      
      // Contenu principal
      const content = document.createElement('div');
      content.className = 'content';
      content.textContent = letter.content;
      body.appendChild(content);
      
      // Formule de politesse
      const closing = document.createElement('p');
      closing.textContent = "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";
      body.appendChild(closing);
      
      // Signature
      const signature = document.createElement('div');
      signature.className = 'signature';
      signature.textContent = user?.displayName || 'Nom Prénom';
      body.appendChild(signature);
      
              // Pied de page avec métadonnées
      if (options.includeMetadata) {
        const footer = document.createElement('div');
        footer.className = 'footer';
        footer.textContent = `Créé le ${LetterService.firebaseTimeStamptoDate(letter.createdAt).toLocaleDateString('fr-FR')} - Dernière modification le ${LetterService.firebaseTimeStamptoDate(letter.updatedAt).toLocaleDateString('fr-FR')}`;
        body.appendChild(footer);
      }
      
      // Retourner le contenu HTML comme Buffer
      return Buffer.from(dom.serialize(), 'utf8');
    } catch (error) {
      console.error('Erreur lors de la génération du HTML:', error);
      throw error;
    }
  }

/**
 * Créer une lettre à partir d'un template avancé
 */
static async createLetterFromEnhancedTemplate(
  userId: string,
  templateInstanceId: string,
  letterTitle?: string
): Promise<Letter> {
  try {
    // Récupérer l'instance de template
    const instance = await EnhancedTemplateService.getInstanceById(templateInstanceId, userId);
    
    if (!instance) {
      throw new NotFoundError('Instance de template non trouvée');
    }

    if (instance.status !== 'completed' || !instance.generatedContent) {
      throw new ValidationError('Le template doit être complété avant de créer une lettre');
    }

    // Extraire les données pour la lettre
    const letterData: Partial<Letter> = {
      title: letterTitle || instance.title || 'Lettre depuis template',
      content: instance.generatedContent,
      jobTitle: instance.variableValues?.position || 
                instance.variableValues?.jobTitle || 
                instance.variableValues?.poste,
      company: instance.variableValues?.company || 
               instance.variableValues?.entreprise,
      recipient: {
        name: instance.variableValues?.recipientName || 
              instance.variableValues?.destinataire,
        email: instance.variableValues?.recipientEmail
      },
      status: 'draft',
      isAIGenerated: true,
      aiPromptUsed: instance.aiSettings?.customInstructions || 'Template avancé',
      aiModel: instance.aiSettings?.model || 'gemini-2.5-flash',
      templateId: instance.templateId,
      version: 1
    };

    // Créer la lettre
    const letter = await this.createLetter(userId, letterData);

    // Créer une notification
    await NotificationService.createNotification({
      userId,
      type: 'success',
      title: '📝 Lettre créée depuis template',
      message: `Votre lettre "${letter.title}" a été créée avec succès depuis le template.`,
      data: {
        letterId: letter.id,
        templateInstanceId,
        templateId: instance.templateId
      },
      action: {
        label: 'Voir la lettre',
        href: `/letters/${letter.id}`
      }
    });

    logger.info('Lettre créée depuis template avancé', {
      userId,
      letterId: letter.id,
      templateInstanceId,
      templateId: instance.templateId
    });

    return letter;
  } catch (error) {
    logger.error('Erreur création lettre depuis template avancé:', error);
    throw error;
  }
}

/**
 * Mettre à jour une lettre existante avec un nouveau template
 */
static async updateLetterFromTemplate(
  userId: string,
  letterId: string,
  templateInstanceId: string,
  mergeStrategy: 'replace' | 'merge' = 'merge'
): Promise<Letter> {
  try {
    // Récupérer la lettre existante
    const existingLetter = await this.getLetterById(letterId, userId);
    
    // Récupérer l'instance de template
    const instance = await EnhancedTemplateService.getInstanceById(templateInstanceId, userId);
    
    if (!instance.generatedContent) {
      throw new ValidationError('Le template doit avoir du contenu généré');
    }

    let newContent: string;
    let newTitle: string;

    if (mergeStrategy === 'replace') {
      // Remplacer complètement le contenu
      newContent = instance.generatedContent;
      newTitle = instance.title;
    } else {
      // Fusionner intelligemment
      newContent = this.mergeLetterContent(existingLetter.content, instance.generatedContent);
      newTitle = existingLetter.title; // Garder le titre existant
    }

    // Mettre à jour la lettre
    const updateData: Partial<Letter> = {
      content: newContent,
      title: newTitle,
      isAIGenerated: true,
      aiPromptUsed: instance.aiSettings?.customInstructions || 'Template avancé - Mise à jour',
      aiModel: instance.aiSettings?.model || 'gemini-2.5-flash',
      templateId: instance.templateId
    };

    const updatedLetter = await this.updateLetter(letterId, userId, updateData);

    logger.info('Lettre mise à jour depuis template', {
      userId,
      letterId,
      templateInstanceId,
      mergeStrategy
    });

    return updatedLetter;
  } catch (error) {
    logger.error('Erreur mise à jour lettre depuis template:', error);
    throw error;
  }
}

/**
 * Analyser une lettre et suggérer des templates pertinents
 */
static async suggestTemplatesForLetter(
  userId: string,
  letterId: string
): Promise<{
  suggestions: Array<{
    templateId: string;
    templateName: string;
    matchScore: number;
    reasons: string[];
    category: string;
    isPremium: boolean;
  }>;
  currentAnalysis: {
    detectedType: string;
    detectedIndustry: string;
    detectedLevel: string;
    keywords: string[];
  };
}> {
  try {
    const letter = await this.getLetterById(letterId, userId);
    
    // Analyser le contenu de la lettre pour détecter le type/industrie
    const analysis = await this.analyzeLetterContent(letter.content, letter.jobTitle, letter.company);
    
    // Rechercher des templates similaires
    const templates = await EnhancedTemplateService.searchTemplates({
      type: analysis.detectedType as any,
      category: analysis.detectedIndustry as any,
      experienceLevel: analysis.detectedLevel,
      keywords: analysis.keywords.slice(0, 3) // Top 3 keywords
    });

    // Calculer les scores de correspondance
    const suggestions = templates.templates
      .map(template => {
        let matchScore = 0;
        const reasons: string[] = [];

        // Score basé sur le type
        if (template.type.toString() === analysis.detectedType) {
          matchScore += 30;
          reasons.push('Type de document correspondant');
        }

        // Score basé sur l'industrie
        if (template.industry.includes(analysis.detectedIndustry)) {
          matchScore += 25;
          reasons.push('Secteur d\'activité correspondant');
        }

        // Score basé sur le niveau d'expérience
        if (template.experienceLevel === analysis.detectedLevel || template.experienceLevel === 'any') {
          matchScore += 20;
          reasons.push('Niveau d\'expérience adapté');
        }

        // Score basé sur les mots-clés
        const keywordMatches = template.keywords.filter(keyword => 
          analysis.keywords.some(letterKeyword => 
            letterKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        matchScore += Math.min(keywordMatches.length * 5, 25);
        if (keywordMatches.length > 0) {
          reasons.push(`${keywordMatches.length} mots-clés correspondants`);
        }

        return {
          templateId: template.id,
          templateName: template.name,
          matchScore,
          reasons,
          category: template.category,
          isPremium: template.isPremium
        };
      })
      .filter(suggestion => suggestion.matchScore > 20) // Seuil minimum
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Top 5 suggestions

    return {
      suggestions,
      currentAnalysis: analysis
    };
  } catch (error) {
    logger.error('Erreur suggestion templates pour lettre:', error);
    throw error;
  }
}

/**
 * Convertir une lettre existante en template personnalisé
 */
static async convertLetterToTemplate(
  userId: string,
  letterId: string,
  templateData: {
    name: string;
    description?: string;
    category: string;
    tags?: string[];
    isPublic?: boolean;
  }
): Promise<{
  templateId: string;
  variablesExtracted: number;
  templatePreview: string;
}> {
  try {
    const letter = await this.getLetterById(letterId, userId);
    
    // Extraire les variables du contenu de la lettre
    const extractedTemplate = this.extractVariablesFromLetter(letter);
    
    // Créer le template dans le système de templates avancés
    const template = {
      name: templateData.name,
      description: templateData.description || `Template créé depuis "${letter.title}"`,
      type: 'MOTIVATION_LETTER' as any,
      category: templateData.category as any,
      industry: letter.company ? [this.detectIndustryFromCompany(letter.company)] : [],
      experienceLevel: 'any' as any,
      sections: extractedTemplate.sections,
      globalVariables: extractedTemplate.globalVariables,
      preview: extractedTemplate.preview,
      isPublic: templateData.isPublic || false,
      isPremium: false,
      tags: templateData.tags || [],
      keywords: extractedTemplate.keywords,
      usageCount: 0,
      rating: 0,
      reviewCount: 0
    };

    // Sauvegarder le template (simulation - à implémenter selon votre système)
    const templateId = await this.saveUserTemplate(userId, template);

    logger.info('Lettre convertie en template', {
      userId,
      letterId,
      templateId,
      variablesCount: extractedTemplate.globalVariables.length
    });

    return {
      templateId,
      variablesExtracted: extractedTemplate.globalVariables.length,
      templatePreview: extractedTemplate.preview
    };
  } catch (error) {
    logger.error('Erreur conversion lettre en template:', error);
    throw error;
  }
}

/**
 * Comparer deux lettres et suggérer des améliorations
 */
static async compareLetters(
  userId: string,
  letterOneId: string,
  letterTwoId: string
): Promise<{
  comparison: {
    structure: { score1: number; score2: number; winner: string };
    content: { score1: number; score2: number; winner: string };
    length: { words1: number; words2: number; optimal: number };
    tone: { tone1: string; tone2: string; recommendation: string };
  };
  suggestions: string[];
  bestPractices: string[];
}> {
  try {
    const [letter1, letter2] = await Promise.all([
      this.getLetterById(letterOneId, userId),
      this.getLetterById(letterTwoId, userId)
    ]);

    // Analyser la structure
    const structure1 = this.analyzeLetterStructure(letter1.content);
    const structure2 = this.analyzeLetterStructure(letter2.content);

    // Analyser le contenu
    const content1 = await this.analyzeLetterContent(letter1.content, letter1.jobTitle, letter1.company);
    const content2 = await this.analyzeLetterContent(letter2.content, letter2.jobTitle, letter2.company);

    // Compter les mots
    const words1 = letter1.content.split(/\s+/).length;
    const words2 = letter2.content.split(/\s+/).length;
    const optimalWords = 300; // Longueur optimale pour une lettre

    const comparison = {
      structure: {
        score1: structure1.score,
        score2: structure2.score,
        winner: structure1.score > structure2.score ? 'Lettre 1' : 'Lettre 2'
      },
      content: {
        score1: content1.overallScore || 75,
        score2: content2.overallScore || 75,
        winner: (content1.overallScore || 75) > (content2.overallScore || 75) ? 'Lettre 1' : 'Lettre 2'
      },
      length: {
        words1,
        words2,
        optimal: optimalWords
      },
      tone: {
        tone1: structure1.detectedTone,
        tone2: structure2.detectedTone,
        recommendation: this.getRecommendedTone(letter1.jobTitle, letter1.company)
      }
    };

    // Générer des suggestions
    const suggestions = this.generateComparisonSuggestions(comparison, structure1, structure2);
    const bestPractices = this.getLetterBestPractices();

    return {
      comparison,
      suggestions,
      bestPractices
    };
  } catch (error) {
    logger.error('Erreur comparaison lettres:', error);
    throw error;
  }
}

// ==========================================
// MÉTHODES UTILITAIRES PRIVÉES
// ==========================================

/**
 * Fusionner intelligemment le contenu de deux lettres
 */
private static mergeLetterContent(existingContent: string, newContent: string): string {
  // Algorithme simple de fusion - peut être amélioré
  const existingParagraphs = existingContent.split('\n\n');
  const newParagraphs = newContent.split('\n\n');

  // Garder l'introduction de la nouvelle version
  const introduction = newParagraphs[0] || existingParagraphs[0];
  
  // Fusionner les paragraphes centraux
  const middleParagraphs = existingParagraphs.slice(1, -1);
  
  // Garder la conclusion de la nouvelle version
  const conclusion = newParagraphs[newParagraphs.length - 1] || existingParagraphs[existingParagraphs.length - 1];

  return [introduction, ...middleParagraphs, conclusion].join('\n\n');
}

/**
 * Analyser le contenu d'une lettre pour détecter le type/industrie
 */
private static async analyzeLetterContent(
  content: string, 
  jobTitle?: string, 
  company?: string
): Promise<{
  detectedType: string;
  detectedIndustry: string;
  detectedLevel: string;
  keywords: string[];
  overallScore?: number;
}> {
  // Analyse basique - peut être améliorée avec l'IA
  const contentLower = content.toLowerCase();
  
  // Détecter le type
  let detectedType = 'MOTIVATION_LETTER';
  if (contentLower.includes('stage') || contentLower.includes('internship')) {
    detectedType = 'INTERNSHIP';
  }

  // Détecter l'industrie
  let detectedIndustry = 'general';
  const industryKeywords = {
    tech: ['développeur', 'programmeur', 'informatique', 'software', 'tech', 'digital'],
    finance: ['finance', 'banque', 'comptabilité', 'audit', 'investment'],
    marketing: ['marketing', 'communication', 'publicité', 'brand', 'digital marketing'],
    healthcare: ['santé', 'médical', 'hospital', 'healthcare', 'médecin'],
    education: ['éducation', 'enseignement', 'formation', 'école', 'université']
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      detectedIndustry = industry;
      break;
    }
  }

  // Détecter le niveau d'expérience
  let detectedLevel = 'mid';
  if (contentLower.includes('junior') || contentLower.includes('débutant') || contentLower.includes('récent diplômé')) {
    detectedLevel = 'entry';
  } else if (contentLower.includes('senior') || contentLower.includes('expérience') || contentLower.includes('manager')) {
    detectedLevel = 'senior';
  }

  // Extraire les mots-clés
  const keywords = this.extractKeywordsFromText(content);

  return {
    detectedType,
    detectedIndustry,
    detectedLevel,
    keywords
  };
}

/**
 * Extraire les variables d'une lettre pour créer un template
 */
private static extractVariablesFromLetter(letter: Letter): {
  sections: any[];
  globalVariables: any[];
  preview: string;
  keywords: string[];
} {
  let content = letter.content;
  const globalVariables: any[] = [];
  const keywords = this.extractKeywordsFromText(content);

  // Remplacer les éléments variables par des placeholders
  if (letter.company) {
    content = content.replace(new RegExp(letter.company, 'g'), '{{company}}');
    globalVariables.push({
      name: 'company',
      type: 'text',
      label: 'Nom de l\'entreprise',
      required: true,
      placeholder: 'Ex: Google, Microsoft...'
    });
  }

  if (letter.jobTitle) {
    content = content.replace(new RegExp(letter.jobTitle, 'g'), '{{position}}');
    globalVariables.push({
      name: 'position',
      type: 'text',
      label: 'Intitulé du poste',
      required: true,
      placeholder: 'Ex: Développeur Full-Stack...'
    });
  }

  // Détecter d'autres patterns variables
  const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+/g;
  const names = content.match(namePattern);
  if (names && names.length > 0) {
    const mostCommonName = names[0]; // Simplification
    content = content.replace(new RegExp(mostCommonName, 'g'), '{{userName}}');
    globalVariables.push({
      name: 'userName',
      type: 'text',
      label: 'Votre nom complet',
      required: true,
      placeholder: 'Ex: Jean Dupont'
    });
  }

  const sections = [
    {
      id: 'main_content',
      name: 'Contenu principal',
      order: 1,
      required: true,
      content: content,
      variables: [],
      description: 'Contenu principal de la lettre'
    }
  ];

  const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;

  return {
    sections,
    globalVariables,
    preview,
    keywords
  };
}

/**
 * Analyser la structure d'une lettre
 */
private static analyzeLetterStructure(content: string): {
  score: number;
  detectedTone: string;
  paragraphs: number;
  hasOpening: boolean;
  hasClosing: boolean;
} {
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const contentLower = content.toLowerCase();

  // Vérifier l'ouverture
  const hasOpening = contentLower.includes('madame') || 
                    contentLower.includes('monsieur') || 
                    contentLower.includes('bonjour');

  // Vérifier la fermeture
  const hasClosing = contentLower.includes('salutations') || 
                    contentLower.includes('cordialement') || 
                    contentLower.includes('sincèrement');

  // Détecter le ton
  let detectedTone = 'professional';
  if (contentLower.includes('passionné') || contentLower.includes('enthousiaste')) {
    detectedTone = 'enthusiastic';
  } else if (contentLower.includes('bonjour') && !contentLower.includes('madame')) {
    detectedTone = 'casual';
  }

  // Calculer le score
  let score = 0;
  if (hasOpening) score += 25;
  if (hasClosing) score += 25;
  if (paragraphs.length >= 3 && paragraphs.length <= 6) score += 30;
  if (content.length >= 200 && content.length <= 500) score += 20;

  return {
    score,
    detectedTone,
    paragraphs: paragraphs.length,
    hasOpening,
    hasClosing
  };
}

/**
 * Extraire les mots-clés d'un texte
 */
private static extractKeywordsFromText(text: string): string[] {
  const commonWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));

  // Compter la fréquence
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Retourner les mots les plus fréquents
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Détecter l'industrie à partir du nom de l'entreprise
 */
private static detectIndustryFromCompany(company: string): string {
  const companyLower = company.toLowerCase();
  
  if (companyLower.includes('tech') || companyLower.includes('soft') || companyLower.includes('digital')) {
    return 'tech';
  }
  if (companyLower.includes('bank') || companyLower.includes('finance')) {
    return 'finance';
  }
  if (companyLower.includes('marketing') || companyLower.includes('agence')) {
    return 'marketing';
  }
  
  return 'general';
}

/**
 * Obtenir le ton recommandé selon le poste/entreprise
 */
private static getRecommendedTone(jobTitle?: string, company?: string): string {
  if (!jobTitle && !company) return 'professional';
  
  const context = `${jobTitle || ''} ${company || ''}`.toLowerCase();
  
  if (context.includes('startup') || context.includes('créatif')) {
    return 'casual';
  }
  if (context.includes('tech') || context.includes('innovation')) {
    return 'enthusiastic';
  }
  
  return 'professional';
}

/**
 * Générer des suggestions de comparaison
 */
private static generateComparisonSuggestions(
  comparison: any, 
  structure1: any, 
  structure2: any
): string[] {
  const suggestions: string[] = [];

  if (comparison.structure.score1 < 75 && comparison.structure.score2 < 75) {
    suggestions.push('Améliorez la structure en ajoutant une formule d\'ouverture et de fermeture appropriées');
  }

  if (comparison.length.words1 > 400 || comparison.length.words2 > 400) {
    suggestions.push('Raccourcissez le contenu - visez 250-350 mots pour une lettre optimale');
  }

  if (comparison.length.words1 < 200 || comparison.length.words2 < 200) {
    suggestions.push('Développez davantage votre argumentation - ajoutez des exemples concrets');
  }

  if (!structure1.hasOpening || !structure2.hasOpening) {
    suggestions.push('Utilisez une formule de politesse d\'ouverture appropriée');
  }

  return suggestions;
}

/**
 * Obtenir les bonnes pratiques pour les lettres
 */
private static getLetterBestPractices(): string[] {
  return [
    'Personnalisez chaque lettre selon l\'entreprise et le poste',
    'Utilisez des exemples concrets pour illustrer vos compétences',
    'Maintenez un ton professionnel adapté au secteur',
    'Structurez avec introduction, développement et conclusion',
    'Relisez attentivement pour éviter les fautes',
    'Adaptez la longueur selon le niveau du poste (250-350 mots)',
    'Montrez votre connaissance de l\'entreprise',
    'Mettez en avant votre valeur ajoutée',
    'Utilisez des mots-clés du secteur d\'activité',
    'Terminez par un appel à l\'action positif'
  ];
}

/**
 * Sauvegarder un template utilisateur (simulation)
 */
private static async saveUserTemplate(userId: string, template: any): Promise<string> {
  // Cette méthode devrait interagir avec le service de templates avancés
  // Pour l'instant, simulation d'un ID
  const templateId = `user_template_${Date.now()}`;
  
  // TODO: Implémenter la sauvegarde réelle
  logger.debug('Template utilisateur sauvegardé (simulation)', {
    userId,
    templateId,
    templateName: template.name
  });
  
  return templateId;
}

}