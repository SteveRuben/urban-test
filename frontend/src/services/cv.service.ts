import api from './api';
import type {
  CV,
  CVListResponse,
  CreateCVRequest,
  UpdateCVRequest,
  CVAnalysis,
  CVAnalysisRequest,
  JobMatching,
  JobMatchingRequest,
  CVOptimizationRequest,
  CVRegionAdaptationRequest,
  CVExport,
  CVExportRequest,
  CVTemplate
} from '../types/cv.types';

export class CVService {
  private static readonly BASE_URL = '/cv';

  /**
   * Créer un nouveau CV
   */
  static async createCV(data: CreateCVRequest): Promise<CV> {
    const response = await api.post(this.BASE_URL, data);
    return response.data.data;
  }

  /**
   * Obtenir tous les CV de l'utilisateur
   */
  static async getUserCVs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
  }): Promise<CVListResponse> {
    const response = await api.get(this.BASE_URL, { params });
    return response.data.data;
  }

  /**
   * Obtenir un CV par ID
   */
  static async getCVById(cvId: string): Promise<CV> {
    const response = await api.get(`${this.BASE_URL}/${cvId}`);
    return response.data.data;
  }

  /**
   * Mettre à jour un CV
   */
  static async updateCV(cvId: string, data: UpdateCVRequest): Promise<CV> {
    const response = await api.put(`${this.BASE_URL}/${cvId}`, data);
    return response.data.data;
  }

  /**
   * Supprimer un CV
   */
  static async deleteCV(cvId: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/${cvId}`);
  }

  /**
   * Dupliquer un CV
   */
  static async duplicateCV(cvId: string, title?: string): Promise<CV> {
    const response = await api.post(`${this.BASE_URL}/${cvId}/duplicate`, { title });
    return response.data.data;
  }

  /**
   * Analyser un CV avec l'IA
   */
  static async analyzeCV(cvId: string, data?: CVAnalysisRequest): Promise<{
    analysis: CVAnalysis;
    metadata: any;
  }> {
    const response = await api.post(`${this.BASE_URL}/${cvId}/analyze`, data);
    return {
      analysis: response.data.data,
      metadata: response.data.metadata
    };
  }

  /**
   * Analyser la correspondance avec une offre d'emploi
   */
  static async analyzeJobMatching(cvId: string, data: JobMatchingRequest): Promise<{
    matching: JobMatching;
    metadata: any;
  }> {
    const response = await api.post(`${this.BASE_URL}/${cvId}/job-matching`, data);
    return {
      matching: response.data.data,
      metadata: response.data.metadata
    };
  }

  /**
   * Optimiser un CV avec l'IA
   */
  static async optimizeCV(cvId: string, data?: CVOptimizationRequest): Promise<{
    suggestions: any;
    cvId: string;
    metadata: any;
  }> {
    const response = await api.post(`${this.BASE_URL}/${cvId}/optimize`, data);
    return response.data;
  }

  /**
   * Adapter un CV pour une région
   */
  static async adaptCVForRegion(cvId: string, data: CVRegionAdaptationRequest): Promise<{
    adaptedCV: any;
    metadata: any;
  }> {
    const response = await api.post(`${this.BASE_URL}/${cvId}/adapt-region`, data);
    return response.data;
  }

  /**
   * Exporter un CV
   */
  static async exportCV(cvId: string, format: string = 'pdf'): Promise<CVExport> {
    const response = await api.get(`${this.BASE_URL}/${cvId}/export`, {
      params: { format }
    });
    return response.data.data;
  }

  /**
   * Obtenir les templates CV
   */
  static async getCVTemplates(params?: {
    region?: string;
    style?: string;
    industry?: string;
    experienceLevel?: string;
  }): Promise<CVTemplate[]> {
    const response = await api.get(`${this.BASE_URL}/templates`, { params });
    console.log(response.data);
    return response.data.data.cvs;
  }

  /**
   * Analyser une URL d'offre d'emploi
   */
  static async analyzeJobURL(data: { url: string; cvId?: string }): Promise<any> {
    const response = await api.post(`${this.BASE_URL}/jobs/analyze-url`, data);
    return response.data.data;
  }

  /**
   * Upload et analyser un CV existant
   */
  static async uploadAndAnalyzeCV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('cv', file);
    
    const response = await api.post(`${this.BASE_URL}/upload-analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  }

  /**
   * Obtenir les statistiques CV de l'utilisateur
   */
  static async getUserCVStats(period: string = 'month'): Promise<any> {
    const response = await api.get(`${this.BASE_URL}/stats`, {
      params: { period }
    });
    return response.data.data;
  }
}

export default CVService;