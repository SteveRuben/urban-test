import { CVRegion } from "./cv.model";

export enum TemplateType {
  MOTIVATION_LETTER = 'motivation_letter',
  COVER_LETTER = 'cover_letter',
  CV = 'cv',
  RESIGNATION_LETTER = 'resignation_letter',
  RECOMMENDATION_LETTER = 'recommendation_letter'
}

export enum TemplateCategory {
  // Secteurs d'activité
  TECH = 'tech',
  FINANCE = 'finance',
  MARKETING = 'marketing',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  SALES = 'sales',
  HR = 'hr',
  CONSULTING = 'consulting',
  ENGINEERING = 'engineering',
  LEGAL = 'legal',
  CREATIVE = 'creative',
  RETAIL = 'retail',
  HOSPITALITY = 'hospitality',
  
  // Niveaux d'expérience
  ENTRY_LEVEL = 'entry_level',
  MID_LEVEL = 'mid_level',
  SENIOR_LEVEL = 'senior_level',
  EXECUTIVE = 'executive',
  
  // Types spéciaux
  CAREER_CHANGE = 'career_change',
  INTERNSHIP = 'internship',
  REMOTE_WORK = 'remote_work',
  FREELANCE = 'freelance',
  GENERAL = 'general'
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number' | 'boolean';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  placeholder?: string;
  help?: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  order: number;
  required: boolean;
  content: string; // Contenu avec variables {{variableName}}
  description?: string;
  variables: TemplateVariable[];
  
  // Configuration d'IA pour cette section
  aiGuidance?: {
    prompt: string;
    tone: 'professional' | 'friendly' | 'formal' | 'creative';
    length: 'short' | 'medium' | 'long';
    keywords: string[];
  };
  
  // Conseils contextuels
  tips?: string[];
  examples?: string[];
}

export interface Template {
  id: string;
  type: TemplateType;
  name: string;
  description: string;
  
  // Catégorisation
  category: TemplateCategory;
  subcategory?: string;
  industry: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive' | 'any';
  
  // Structure du template
  sections: TemplateSection[];
  globalVariables: TemplateVariable[]; // Variables utilisées dans plusieurs sections
  
  // Configuration d'affichage
  preview: string; // Aperçu du template généré
  thumbnail?: string; // Image d'aperçu
  
  // Métadonnées
  isPublic: boolean;
  isPremium: boolean;
  isAIGenerated: boolean;
  creatorId?: string;
  
  // Statistiques
  usageCount: number;
  rating: number;
  reviewCount: number;
  successRate?: number; // Taux de succès estimé
  
  // SEO et découvrabilité
  tags: string[];
  keywords: string[];
  
  // Configuration régionale pour les CV
  regions?: CVRegion[];
  
  // Configuration IA
  aiConfiguration?: {
    basePrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    systemInstructions: string;
  };
  
  // Versioning
  version: string;
  changelog?: TemplateChange[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateChange {
  version: string;
  date: Date;
  changes: string[];
  author?: string;
}

// Instance d'utilisation d'un template par un utilisateur
export interface TemplateInstance {
  id: string;
  templateId: string;
  userId: string;
  type: TemplateType;
  
  // Données remplies par l'utilisateur
  variableValues: Record<string, any>;
  sectionContents: Record<string, string>; // Contenu généré pour chaque section
  
  // Contenu final
  generatedContent: string;
  title: string;
  
  // Statut de génération
  status: 'draft' | 'generating' | 'completed' | 'error';
  generationProgress?: number; // 0-100
  
  // Configuration IA utilisée
  aiSettings?: {
    model: string;
    tone: string;
    length: string;
    customInstructions?: string;
  };
  
  // Métadonnées de génération
  generationMetadata?: {
    tokensUsed: number;
    processingTime: number;
    cost: number;
    aiModel: string;
    promptVersion: string;
  };
  
  // Historique des versions
  versions: TemplateInstanceVersion[];
  currentVersion: number;
  
  createdAt: Date;
  updatedAt: Date;
  lastGeneratedAt?: Date;
}

export interface TemplateInstanceVersion {
  version: number;
  content: string;
  variableValues: Record<string, any>;
  generatedAt: Date;
  aiSettings?: any;
  metadata?: any;
}

// Templates prédéfinis pour les lettres de motivation
export const PREDEFINED_LETTER_TEMPLATES: Partial<Template>[] = [
  {
    name: "Lettre de Motivation Tech - Développeur",
    description: "Template optimisé pour les postes de développement logiciel",
    type: TemplateType.MOTIVATION_LETTER,
    category: TemplateCategory.TECH,
    industry: ['technology', 'software', 'startup'],
    experienceLevel: 'any',
    tags: ['développeur', 'programmation', 'tech', 'startup'],
    keywords: ['développement', 'programmation', 'agile', 'innovation'],
    sections: [
      {
        id: 'introduction',
        name: 'Introduction',
        order: 1,
        required: true,
        content: "Madame, Monsieur,\n\nPassionné(e) par {{domain}} et fort(e) de {{experience}} années d'expérience en développement logiciel, je vous adresse ma candidature pour le poste de {{position}} au sein de {{company}}.",
        variables: [
          {
            name: 'domain',
            type: 'select',
            label: 'Domaine de spécialisation',
            required: true,
            options: [
              { value: 'développement web', label: 'Développement Web' },
              { value: 'développement mobile', label: 'Développement Mobile' },
              { value: 'intelligence artificielle', label: 'Intelligence Artificielle' },
              { value: 'cybersécurité', label: 'Cybersécurité' },
              { value: 'data science', label: 'Data Science' }
            ]
          },
          {
            name: 'experience',
            type: 'number',
            label: 'Années d\'expérience',
            required: true,
            validation: { min: 0, max: 50 }
          }
        ],
        aiGuidance: {
          prompt: "Créer une introduction percutante qui montre la passion pour la tech et l'adéquation avec le poste",
          tone: 'professional',
          length: 'short',
          keywords: ['passion', 'innovation', 'expertise technique']
        }
      },
      {
        id: 'experience',
        name: 'Expérience et Compétences',
        order: 2,
        required: true,
        content: "Au cours de mon parcours chez {{previousCompany}}, j'ai eu l'opportunité de travailler sur {{projects}} en utilisant {{technologies}}. Cette expérience m'a permis de développer une expertise solide en {{mainSkills}}.",
        variables: [
          {
            name: 'previousCompany',
            type: 'text',
            label: 'Entreprise précédente',
            required: true,
            placeholder: 'Ex: Google, Startup innovante...'
          },
          {
            name: 'projects',
            type: 'textarea',
            label: 'Projets principaux',
            required: true,
            placeholder: 'Décrivez vos projets les plus significatifs',
            validation: { maxLength: 200 }
          },
          {
            name: 'technologies',
            type: 'multiselect',
            label: 'Technologies maîtrisées',
            required: true,
            options: [
              { value: 'JavaScript', label: 'JavaScript' },
              { value: 'Python', label: 'Python' },
              { value: 'React', label: 'React' },
              { value: 'Node.js', label: 'Node.js' },
              { value: 'Docker', label: 'Docker' },
              { value: 'AWS', label: 'AWS' },
              { value: 'MongoDB', label: 'MongoDB' },
              { value: 'PostgreSQL', label: 'PostgreSQL' }
            ]
          },
          {
            name: 'mainSkills',
            type: 'textarea',
            label: 'Compétences principales',
            required: true,
            placeholder: 'Ex: architecture logicielle, optimisation de performance...'
          }
        ],
        aiGuidance: {
          prompt: "Mettre en valeur l'expérience technique de manière concrète avec des exemples quantifiés",
          tone: 'professional',
          length: 'medium',
          keywords: ['résultats', 'impact', 'innovation', 'expertise']
        }
      },
      {
        id: 'motivation',
        name: 'Motivation et Projet',
        order: 3,
        required: true,
        content: "Votre entreprise {{company}} m'attire particulièrement par {{companyAttraction}}. Je suis convaincu(e) que mon expertise en {{relevantSkills}} et ma passion pour {{interests}} seraient des atouts précieux pour contribuer à {{companyGoals}}.",
        variables: [
          {
            name: 'companyAttraction',
            type: 'textarea',
            label: 'Ce qui vous attire chez cette entreprise',
            required: true,
            placeholder: 'Vision, projets, culture, technologies utilisées...',
            help: 'Montrez que vous connaissez l\'entreprise'
          },
          {
            name: 'relevantSkills',
            type: 'text',
            label: 'Compétences les plus pertinentes pour ce poste',
            required: true
          },
          {
            name: 'interests',
            type: 'text',
            label: 'Centres d\'intérêt professionnels',
            required: true,
            placeholder: 'Ex: IA, blockchain, développement durable...'
          },
          {
            name: 'companyGoals',
            type: 'text',
            label: 'Objectifs de l\'entreprise auxquels vous voulez contribuer',
            required: true
          }
        ],
        aiGuidance: {
          prompt: "Créer une connexion authentique entre le candidat et l'entreprise en montrant une vraie compréhension des enjeux",
          tone: 'professional',
          length: 'medium',
          keywords: ['contribution', 'valeur ajoutée', 'alignement']
        }
      },
      {
        id: 'conclusion',
        name: 'Conclusion',
        order: 4,
        required: true,
        content: "Je serais ravi(e) de vous rencontrer pour échanger sur les défis techniques de {{company}} et vous présenter plus en détail comment mon profil pourrait s'intégrer dans vos équipes. Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.",
        variables: [],
        aiGuidance: {
          prompt: "Conclure de manière professionnelle et engageante avec un call-to-action subtil",
          tone: 'professional',
          length: 'short',
          keywords: ['échange', 'rencontre', 'collaboration']
        }
      }
    ],
    globalVariables: [
      {
        name: 'position',
        type: 'text',
        label: 'Intitulé du poste',
        required: true,
        placeholder: 'Ex: Développeur Full-Stack Senior'
      },
      {
        name: 'company',
        type: 'text',
        label: 'Nom de l\'entreprise',
        required: true,
        placeholder: 'Ex: Google, Startup innovante...'
      }
    ]
  },
  
  {
    name: "Lettre de Motivation Finance - Analyste",
    description: "Template pour les postes d'analyse financière et conseil",
    type: TemplateType.MOTIVATION_LETTER,
    category: TemplateCategory.FINANCE,
    industry: ['finance', 'banking', 'consulting'],
    experienceLevel: 'mid',
    tags: ['finance', 'analyse', 'investissement', 'conseil'],
    keywords: ['analyse financière', 'modélisation', 'risque', 'performance'],
    sections: [
      {
        id: 'introduction',
        name: 'Introduction',
        order: 1,
        required: true,
        content: "Madame, Monsieur,\n\nDiplômé(e) de {{education}} et passionné(e) par l'analyse financière, je souhaite rejoindre {{company}} en tant que {{position}} pour contribuer à l'excellence de vos services de {{serviceType}}.",
        variables: [
          {
            name: 'education',
            type: 'text',
            label: 'Formation',
            required: true,
            placeholder: 'Ex: Master Finance, École de Commerce...'
          },
          {
            name: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: [
              { value: 'gestion d\'actifs', label: 'Gestion d\'actifs' },
              { value: 'conseil en investissement', label: 'Conseil en investissement' },
              { value: 'analyse crédit', label: 'Analyse crédit' },
              { value: 'risk management', label: 'Risk Management' },
              { value: 'audit financier', label: 'Audit financier' }
            ]
          }
        ],
        aiGuidance: {
          prompt: "Créer une introduction qui démontre la rigueur et l'expertise financière",
          tone: 'formal',
          length: 'short',
          keywords: ['rigueur', 'analyse', 'expertise financière']
        }
      }
    ]
  }
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Interface pour les statistiques de templates
export interface TemplateStats {
  totalTemplates: number;
  templatesByType: Record<TemplateType, number>;
  templatesByCategory: Record<TemplateCategory, number>;
  mostUsedTemplates: Array<{
    template: Template;
    usageCount: number;
  }>;
  topRatedTemplates: Array<{
    template: Template;
    rating: number;
  }>;
  usageByMonth: Record<string, number>;
  conversionRate: number; // Taux de conversion template vers lettre finalisée
}

export const AI_PROMPTS_CONFIG = {
  [TemplateType.MOTIVATION_LETTER]: {
    systemPrompt: `Tu es un expert en recrutement et rédaction de lettres de motivation. 
    Ton rôle est d'aider à créer des lettres personnalisées, percutantes et professionnelles.
    
    Principes à respecter :
    - Personnalisation maximale selon le poste et l'entreprise
    - Ton professionnel mais authentique
    - Structure claire et logique
    - Mise en valeur des compétences pertinentes
    - Éviter les clichés et formules toutes faites
    - Adapter au secteur d'activité`,
    
    generatePrompt: (context: any) => `
    Génère une lettre de motivation pour :
    - Poste : ${context.position}
    - Entreprise : ${context.company}
    - Secteur : ${context.industry}
    - Niveau : ${context.experienceLevel}
    
    Profil candidat :
    ${JSON.stringify(context.userProfile, null, 2)}
    
    Instructions spéciales : ${context.customInstructions || 'Aucune'}
    
    La lettre doit être authentique, personnalisée et convaincante.`
  },
  
  [TemplateType.CV]: {
    systemPrompt: `Tu es un expert en rédaction de CV et recrutement international.
    Tu connais les standards et attentes de chaque région du monde.
    
    Principes à respecter :
    - Adaptation aux standards régionaux
    - Optimisation pour les ATS (Applicant Tracking Systems)
    - Mise en valeur des réalisations quantifiées
    - Structure claire et scannable
    - Langage orienté résultats`,
    
    generatePrompt: (context: any) => `
    Optimise ce CV pour :
    - Région : ${context.region}
    - Secteur : ${context.industry}
    - Poste visé : ${context.targetPosition}
    
    Données utilisateur :
    ${JSON.stringify(context.cvData, null, 2)}
    
    Focus sur l'optimisation ATS et l'adaptation régionale.`
  }
};