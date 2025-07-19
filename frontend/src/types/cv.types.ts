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
  dateOfBirth?: Date;
  nationality?: string;
  photo?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
  professionalSummary?: string;
  objective?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
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
  level: 1 | 2 | 3 | 4 | 5;
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

export interface CVSectionContent {
  workExperience?: WorkExperience[];
  education?: Education[];
  skills?: Skill[];
  languages?: Language[];
  certifications?: Certification[];
  projects?: Project[];
  customContent?: string;
}

export interface CVUserSection {
  sectionId: string;
  type: CVSectionType;
  title: string;
  content: CVSectionContent;
  order: number;
  isVisible: boolean;
}

export interface CVShareSettings {
  isPublic: boolean;
  shareUrl?: string;
  allowedViewers?: string[];
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
  duration?: number;
  viewedAt: Date;
}

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

export interface CV {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  region: CVRegion;
  personalInfo: CVPersonalInfo;
  sections: CVUserSection[];
  status: 'draft' | 'completed' | 'published';
  version: number;
  isAIOptimized: boolean;
  lastAnalysis?: CVAnalysis;
  jobMatchings: JobMatching[];
  exports: CVExport[];
  shareSettings: CVShareSettings;
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt: Date;
}

export interface CVAnalysis {
  id: string;
  cvId: string;
  userId: string;
  overallScore: number;
  regionalCompliance: number;
  atsCompatibility: number;
  keywordOptimization: number;
  strengths: AnalysisPoint[];
  weaknesses: AnalysisPoint[];
  suggestions: AnalysisPoint[];
  missingElements: string[];
  regionalAnalysis: Record<CVRegion, {
    score: number;
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }>;
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

export interface JobMatching {
  id: string;
  cvId: string;
  userId: string;
  jobTitle: string;
  company?: string;
  location?: string;
  industry?: string;
  jobDescription: string;
  requirements: string[];
  matchingScore: number;
  matchingDetails: {
    skillsMatch: SkillMatch[];
    experienceMatch: ExperienceMatch;
    educationMatch: EducationMatch;
    locationMatch?: LocationMatch;
    keywordsMatch: KeywordMatch[];
  };
  recommendations: MatchingRecommendation[];
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

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  region: CVRegion;
  style: CVStyle;
  industry?: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  isPublic: boolean;
  isPremium: boolean;
  creatorId?: string;
  usageCount: number;
  rating: number;
  tags: string[];
  culturalNotes: string[];
  requiredSections: CVSectionType[];
  optionalSections: CVSectionType[];
  prohibitedElements: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les formulaires
export interface CreateCVRequest {
  templateId: string;
  title: string;
  region: CVRegion;
}

export interface UpdateCVRequest {
  title?: string;
  personalInfo?: Partial<CVPersonalInfo>;
  sections?: CVUserSection[];
  status?: 'draft' | 'completed' | 'published';
}

export interface CVListResponse {
  cvs: CV[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CVAnalysisRequest {
  targetRegion?: CVRegion;
}

export interface JobMatchingRequest {
  jobDescription: string;
  jobTitle: string;
  company?: string;
}

export interface CVOptimizationRequest {
  targetJob?: string;
  targetRegion?: CVRegion;
}

export interface CVRegionAdaptationRequest {
  targetRegion: CVRegion;
}

export interface CVExportRequest {
  format: 'pdf' | 'docx' | 'html' | 'json';
}