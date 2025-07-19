export enum CVRegion {
  FRANCE = 'france',
  CANADA = 'canada', 
  USA = 'usa',
  UK = 'uk',
  GERMANY = 'germany',
  SPAIN = 'spain',
  ITALY = 'italy',
  INTERNATIONAL = 'international'
}

export enum CVStyle {
  MODERN = 'modern',
  CLASSIC = 'classic', 
  CREATIVE = 'creative',
  MINIMAL = 'minimal',
  EXECUTIVE = 'executive',
  TECH = 'tech',
  ACADEMIC = 'academic'
}

export enum CVSectionType {
  PERSONAL_INFO = 'personal_info',
  PROFESSIONAL_SUMMARY = 'professional_summary',
  WORK_EXPERIENCE = 'work_experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  LANGUAGES = 'languages',
  CERTIFICATIONS = 'certifications',
  PROJECTS = 'projects',
  VOLUNTEER = 'volunteer',
  HOBBIES = 'hobbies',
  REFERENCES = 'references',
  CUSTOM = 'custom'
}

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  region: CVRegion;
  style: CVStyle;
  industry?: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  
  // Structure du template
  sections: CVSection[];
  layout: CVLayout;
  styling: CVStyling;
  
  // Métadonnées
  isPublic: boolean;
  isPremium: boolean;
  creatorId?: string;
  usageCount: number;
  rating: number;
  tags: string[];
  
  // Conformité régionale
  culturalNotes: string[];
  requiredSections: CVSectionType[];
  optionalSections: CVSectionType[];
  prohibitedElements: string[]; // Ex: photo pour USA
  
  // AI Guidance
  aiOptimization: {
    keywords: string[];
    industryBest: string[];
    atsOptimized: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CVSection {
  id: string;
  type: CVSectionType;
  title: string;
  order: number;
  required: boolean;
  maxEntries?: number;
  
  // Configuration spécifique par région
  regionalConfig: Record<CVRegion, {
    title: string;
    format: string;
    required: boolean;
    guidelines: string[];
  }>;
  
  // Validation des données
  validation: {
    fields: CVFieldValidation[];
    maxLength?: number;
    minEntries?: number;
  };
}

export interface CVFieldValidation {
  name: string;
  type: 'text' | 'email' | 'phone' | 'url' | 'date' | 'number';
  required: boolean;
  pattern?: string;
  maxLength?: number;
  placeholder?: string;
  help?: string;
}

export interface CVLayout {
  type: 'single-column' | 'two-column' | 'three-column';
  header: 'centered' | 'left' | 'right' | 'banner';
  sectionSpacing: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  pageSize: 'A4' | 'Letter' | 'A3';
}

export interface CVStyling {
  fontFamily: string;
  fontSize: {
    header: number;
    title: number;
    content: number;
    small: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  spacing: {
    sectionGap: number;
    itemGap: number;
    lineHeight: number;
  };
}

// Interface principale pour les CV utilisateur
export interface CV {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  region: CVRegion;
  
  // Données du CV
  personalInfo: CVPersonalInfo;
  sections: CVUserSection[];
  
  // Métadonnées
  status: 'draft' | 'completed' | 'published';
  version: number;
  isAIOptimized: boolean;
  
  // Analyse et matching
  lastAnalysis?: CVAnalysis;
  jobMatchings: JobMatching[];
  
  // Export et partage
  exports: CVExport[];
  shareSettings: CVShareSettings;
  
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt: Date;
}

export interface CVPersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  
  // Optionnel selon la région
  dateOfBirth?: Date;
  nationality?: string;
  photo?: string; // URL de la photo
  
  // Liens professionnels
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
  
  // Résumé professionnel
  professionalSummary?: string;
  objective?: string;
}

export interface CVUserSection {
  sectionId: string;
  type: CVSectionType;
  title: string;
  content: CVSectionContent;
  order: number;
  isVisible: boolean;
}

export interface CVSectionContent {
  // Expérience professionnelle
  workExperience?: WorkExperience[];
  
  // Formation
  education?: Education[];
  
  // Compétences
  skills?: Skill[];
  
  // Langues
  languages?: Language[];
  
  // Certifications
  certifications?: Certification[];
  
  // Projets
  projects?: Project[];
  
  // Contenu personnalisé
  customContent?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: Date;
  endDate?: Date; // null si poste actuel
  isCurrent: boolean;
  description: string;
  achievements: string[];
  technologies?: string[];
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'volunteer';
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  maxGpa?: number;
  honors?: string[];
  coursework?: string[];
  thesis?: string;
}

export interface Skill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'other';
  level: 1 | 2 | 3 | 4 | 5; // 1 = débutant, 5 = expert
  yearsOfExperience?: number;
  certifications?: string[];
}

export interface Language {
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
  certifications?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  url?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  role?: string;
  technologies: string[];
  url?: string;
  repository?: string;
  startDate?: Date;
  endDate?: Date;
  achievements: string[];
}

// Interface pour l'analyse de CV
export interface CVAnalysis {
  id: string;
  cvId: string;
  userId: string;
  
  // Scores d'analyse
  overallScore: number; // 0-100
  regionalCompliance: number; // 0-100
  atsCompatibility: number; // 0-100
  keywordOptimization: number; // 0-100
  
  // Analyse détaillée
  strengths: AnalysisPoint[];
  weaknesses: AnalysisPoint[];
  suggestions: AnalysisPoint[];
  missingElements: string[];
  
  // Analyse par région
  regionalAnalysis: Record<CVRegion, {
    score: number;
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }>;
  
  // Analyse ATS
  atsAnalysis: {
    readabilityScore: number;
    formattingIssues: string[];
    keywordDensity: Record<string, number>;
    optimizationTips: string[];
  };
  
  createdAt: Date;
}

export interface AnalysisPoint {
  category: 'content' | 'format' | 'structure' | 'regional' | 'ats';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
}

// Interface pour le matching avec les offres d'emploi
export interface JobMatching {
  id: string;
  cvId: string;
  userId: string;
  
  // Informations de l'offre
  jobTitle: string;
  company?: string;
  location?: string;
  industry?: string;
  jobDescription: string;
  requirements: string[];
  
  // Résultats du matching
  matchingScore: number; // 0-100
  matchingDetails: {
    skillsMatch: SkillMatch[];
    experienceMatch: ExperienceMatch;
    educationMatch: EducationMatch;
    locationMatch?: LocationMatch;
    keywordsMatch: KeywordMatch[];
  };
  
  // Recommandations
  recommendations: MatchingRecommendation[];
  
  // Métadonnées
  source?: 'manual' | 'upload' | 'url' | 'api';
  sourceUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  userHas: boolean;
  userLevel?: number;
  requiredLevel?: number;
  match: 'perfect' | 'good' | 'partial' | 'missing';
}

export interface ExperienceMatch {
  yearsRequired?: number;
  yearsUser: number;
  match: 'exceeds' | 'meets' | 'close' | 'insufficient';
  relevantExperience: string[];
}

export interface EducationMatch {
  degreeRequired?: string;
  degreeUser: string[];
  match: 'exceeds' | 'meets' | 'equivalent' | 'insufficient';
  relevantEducation: string[];
}

export interface LocationMatch {
  preferredLocation: string;
  userLocation?: string;
  distance?: number;
  remote: boolean;
  match: 'perfect' | 'good' | 'moderate' | 'poor';
}

export interface KeywordMatch {
  keyword: string;
  frequency: number;
  importance: 'high' | 'medium' | 'low';
  inCV: boolean;
}

export interface MatchingRecommendation {
  type: 'skill' | 'experience' | 'education' | 'keyword' | 'format';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  implementation?: string;
}

// Interface pour l'export de CV
export interface CVExport {
  id: string;
  cvId: string;
  format: 'pdf' | 'docx' | 'html' | 'json';
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
  downloadCount: number;
  createdAt: Date;
}

export interface CVShareSettings {
  isPublic: boolean;
  shareUrl?: string;
  allowedViewers?: string[]; // emails autorisés
  expiresAt?: Date;
  passwordProtected: boolean;
  password?: string;
  trackViews: boolean;
  views: CVView[];
}

export interface CVView {
  id: string;
  viewerEmail?: string;
  ipAddress: string;
  userAgent: string;
  duration?: number; // en secondes
  viewedAt: Date;
}

// Classes utilitaires pour le CV
export class CVUtils {
  /**
   * Valider un CV selon les standards régionaux
   */
  static validateCVForRegion(cv: CV, region: CVRegion): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validation spécifique par région
    switch (region) {
      case CVRegion.USA:
        if (cv.personalInfo.photo) {
          errors.push('Les photos sont déconseillées sur les CV américains');
        }
        if (cv.personalInfo.dateOfBirth) {
          errors.push('La date de naissance ne doit pas figurer sur un CV américain');
        }
        break;
        
      case CVRegion.FRANCE:
        if (!cv.personalInfo.photo && cv.sections.some(s => s.type === CVSectionType.PERSONAL_INFO)) {
          warnings.push('Une photo est souvent attendue sur les CV français');
        }
        break;
        
      case CVRegion.GERMANY:
        if (!cv.personalInfo.photo) {
          warnings.push('Une photo professionnelle est recommandée sur les CV allemands');
        }
        if (!cv.personalInfo.dateOfBirth) {
          warnings.push('La date de naissance est souvent incluse sur les CV allemands');
        }
        break;
    }
    
    return { errors, warnings, isValid: errors.length === 0 };
  }
  
  /**
   * Calculer le score de compatibilité ATS
   */
  static calculateATSScore(cv: CV): number {
    let score = 100;
    
    // Vérifications de format
    const personalInfo = cv.personalInfo;
    if (!personalInfo.email || !personalInfo.phone) score -= 20;
    
    // Vérifications de contenu
    const workExp = cv.sections.find(s => s.type === CVSectionType.WORK_EXPERIENCE);
    if (!workExp || !workExp.content.workExperience?.length) score -= 30;
    
    const education = cv.sections.find(s => s.type === CVSectionType.EDUCATION);
    if (!education || !education.content.education?.length) score -= 20;
    
    const skills = cv.sections.find(s => s.type === CVSectionType.SKILLS);
    if (!skills || !skills.content.skills?.length) score -= 20;
    
    return Math.max(0, score);
  }
  
  /**
   * Extraire les mots-clés d'un CV
   */
  static extractKeywords(cv: CV): string[] {
    const keywords = new Set<string>();
    
    // Extraire des compétences
    cv.sections.forEach(section => {
      if (section.content.skills) {
        section.content.skills.forEach(skill => {
          keywords.add(skill.name.toLowerCase());
        });
      }
      
      if (section.content.workExperience) {
        section.content.workExperience.forEach(exp => {
          exp.technologies?.forEach(tech => keywords.add(tech.toLowerCase()));
        });
      }
    });
    
    return Array.from(keywords);
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration des templates par région
export const REGIONAL_CV_CONFIGS: Record<CVRegion, {
  requiredSections: CVSectionType[];
  optionalSections: CVSectionType[];
  prohibitedElements: string[];
  culturalNotes: string[];
  maxPages: number;
}> = {
  [CVRegion.FRANCE]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION,
      CVSectionType.SKILLS
    ],
    optionalSections: [
      CVSectionType.LANGUAGES,
      CVSectionType.HOBBIES,
      CVSectionType.CERTIFICATIONS
    ],
    prohibitedElements: [],
    culturalNotes: [
      'Une photo professionnelle est souvent appréciée',
      'Les loisirs peuvent montrer votre personnalité',
      'Format anti-chronologique privilégié'
    ],
    maxPages: 2
  },
  [CVRegion.USA]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.PROFESSIONAL_SUMMARY,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION
    ],
    optionalSections: [
      CVSectionType.SKILLS,
      CVSectionType.CERTIFICATIONS,
      CVSectionType.PROJECTS
    ],
    prohibitedElements: ['photo', 'dateOfBirth', 'maritalStatus', 'nationality'],
    culturalNotes: [
      'Pas de photo pour éviter les discriminations',
      'Focus sur les résultats quantifiés',
      'Une page recommandée pour les débutants'
    ],
    maxPages: 1
  },
  [CVRegion.UK]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.PROFESSIONAL_SUMMARY,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION
    ],
    optionalSections: [
      CVSectionType.SKILLS,
      CVSectionType.REFERENCES,
      CVSectionType.HOBBIES
    ],
    prohibitedElements: ['photo'],
    culturalNotes: [
      'Les références sont importantes',
      'Style concis et factuel',
      'Maximum 2 pages'
    ],
    maxPages: 2
  },
  [CVRegion.GERMANY]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION,
      CVSectionType.SKILLS
    ],
    optionalSections: [
      CVSectionType.LANGUAGES,
      CVSectionType.CERTIFICATIONS,
      CVSectionType.HOBBIES
    ],
    prohibitedElements: [],
    culturalNotes: [
      'Photo professionnelle recommandée',
      'Détails complets attendus',
      'Format tabulaire accepté'
    ],
    maxPages: 3
  },
  [CVRegion.CANADA]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.PROFESSIONAL_SUMMARY,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION
    ],
    optionalSections: [
      CVSectionType.SKILLS,
      CVSectionType.LANGUAGES,
      CVSectionType.VOLUNTEER
    ],
    prohibitedElements: ['photo', 'dateOfBirth', 'maritalStatus'],
    culturalNotes: [
      'Bilinguisme valorisé',
      'Expérience bénévole appréciée',
      'Format similaire aux USA'
    ],
    maxPages: 2
  },
  [CVRegion.SPAIN]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION,
      CVSectionType.SKILLS
    ],
    optionalSections: [
      CVSectionType.LANGUAGES,
      CVSectionType.HOBBIES,
      CVSectionType.REFERENCES
    ],
    prohibitedElements: [],
    culturalNotes: [
      'Photo souvent incluse',
      'Informations personnelles détaillées',
      'Format Europass accepté'
    ],
    maxPages: 2
  },
  [CVRegion.ITALY]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION,
      CVSectionType.SKILLS
    ],
    optionalSections: [
      CVSectionType.LANGUAGES,
      CVSectionType.HOBBIES,
      CVSectionType.CERTIFICATIONS
    ],
    prohibitedElements: [],
    culturalNotes: [
      'Format Europass recommandé',
      'Détails sur la formation',
      'Langues importantes'
    ],
    maxPages: 2
  },
  [CVRegion.INTERNATIONAL]: {
    requiredSections: [
      CVSectionType.PERSONAL_INFO,
      CVSectionType.PROFESSIONAL_SUMMARY,
      CVSectionType.WORK_EXPERIENCE,
      CVSectionType.EDUCATION,
      CVSectionType.SKILLS
    ],
    optionalSections: [
      CVSectionType.LANGUAGES,
      CVSectionType.CERTIFICATIONS,
      CVSectionType.PROJECTS
    ],
    prohibitedElements: [],
    culturalNotes: [
      'Format universel et neutre',
      'Focus sur les compétences transférables',
      'Anglais recommandé'
    ],
    maxPages: 2
  }
};