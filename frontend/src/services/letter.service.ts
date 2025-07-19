import api from './api';
import type { AIAnalysis, ExportOptions, Letter, LetterTemplate, ShareOptions } from '../types';

class LetterService {
  /**
   * Récupère toutes les lettres de l'utilisateur
   */
  async getLetters(): Promise<Letter[]> {
    try {
      const response = await api.get('/letters');
      return response.data;
    } catch (error) {
      console.error('Error fetching letters:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Récupère une lettre spécifique par son ID
   */
  async getLetter(id: string): Promise<Letter> {
    try {
      const response = await api.get(`/letters/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching letter ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Crée une nouvelle lettre
   */
  async createLetter(letterData: {
    title: string;
    content: string;
    jobPosition?: string;
    company?: string;
    recipient?: {
      name?: string;
      email?: string;
    };
    status?: 'draft' | 'final';
  }): Promise<Letter> {
    try {
      const response = await api.post('/letters', letterData);
      return response.data;
    } catch (error) {
      console.error('Error creating letter:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Met à jour une lettre existante
   */
  async updateLetter(id: string, updates: {
    title?: string;
    content?: string;
    jobPosition?: string;
    company?: string;
    recipient?: {
      name?: string;
      email?: string;
    };
    status?: 'draft' | 'final';
  }): Promise<Letter> {
    try {
      const response = await api.put(`/letters/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating letter ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Supprime une lettre
   */
  async deleteLetter(id: string): Promise<void> {
    try {
      await api.delete(`/letters/${id}`);
    } catch (error) {
      console.error(`Error deleting letter ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Récupère tous les modèles de lettres disponibles
   */
  async getLetterTemplates(): Promise<LetterTemplate[]> {
    try {
      const response = await api.get('/letter-templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching letter templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Génère une lettre à partir d'un modèle et de données
   */
  async generateLetterFromTemplate(templateId: string, data: any): Promise<string> {
    try {
      const response = await api.post('/generate-letter', {
        templateId,
        data
      });
      return response.data.content;
    } catch (error) {
      console.error('Error generating letter from template:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Génère une lettre à l'aide de l'IA
   */
  async generateLetterWithAI(prompt: string, jobPosition: string, company: string): Promise<string> {
    try {
      const response = await api.post('/letters/generate', {
        prompt,
        jobPosition,
        company
      });
      return response.data.content;
    } catch (error) {
      console.error('Error generating letter with AI:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Exporte une lettre au format PDF ou DOCX
   */
  async exportLetter(id: string, options: ExportOptions): Promise<Blob> {
    try {
      const response = await api.post(`/letters/${id}/export`, {
        body: options
      });
      const binaryString = window.atob(response.data.data.blob);

      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      let mimeType: string;
      switch (options.format) {
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          mimeType = 'text/plain';
          break;
        case 'html':
          mimeType = 'text/html';
          break;
        default:
          mimeType = 'application/octet-stream';
      }
      const blob = new Blob([bytes.buffer], { type: mimeType });
      return blob;//response.data.data.blob;
    } catch (error) {
      console.error(`Error exporting letter ${id} as ${options}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Gestion d'erreur standardisée
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Erreur avec réponse du serveur
      const status = error.response.status;
      const message = error.response.data?.error || 'Une erreur est survenue';

      switch (status) {
        case 400:
          return new Error('Requête invalide: ' + message);
        case 401:
          return new Error('Authentification requise. Veuillez vous reconnecter.');
        case 403:
          return new Error('Vous n\'avez pas les permissions nécessaires pour cette action.');
        case 404:
          return new Error('Lettre non trouvée.');
        case 409:
          return new Error('Conflit avec une ressource existante: ' + message);
        case 500:
          return new Error('Erreur serveur. Veuillez réessayer plus tard.');
        default:
          return new Error(`Erreur (${status}): ${message}`);
      }
    } else if (error.request) {
      // Requête envoyée mais pas de réponse
      return new Error('Impossible de contacter le serveur. Veuillez vérifier votre connexion.');
    } else {
      // Erreur dans la configuration de la requête
      return new Error('Erreur de requête: ' + error.message);
    }
  }

  async incrementViews(letterId: string): Promise<void> {
    await api.post(`/letters/${letterId}/increment-views`);
  }

  async createShareLink(letterId: string, options: ShareOptions): Promise<{ url: string }> {
    // Mock implementation or actual API call
    return Promise.resolve({ url: `https://example.com/share/${letterId}?options=${JSON.stringify(options)}` });
  }

  async analyzeWithAI(letterId: string): Promise<AIAnalysis> {
    // Replace with actual API call
    return api.post(`/letters/${letterId}/analyze`).then(res => res.data);
  }

  async toggleBookmark(letterId: string): Promise<{ bookmarked: boolean }> {
    // Replace with your actual API call
    return api.post(`/letters/${letterId}/toggle-bookmark`).then(res => res.data);
  }

  async cloneLetter(letterId: string): Promise<Letter> {
    // Replace with your actual API call
    return api.post(`/letters/${letterId}/clone`).then(res => res.data);
  }

}

export default new LetterService();