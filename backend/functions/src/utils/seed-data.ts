// src/utils/seed-data.ts
import { db, COLLECTIONS } from '../config/firebase';
import { Plan } from '../models/subscription.model';

/**
 * Créer les plans par défaut dans Firestore
 */
export async function seedDefaultPlans(): Promise<void> {

  
  const defaultPlans: Plan[] = [
    {
      id: 'free',
      name: 'Gratuit',
      description: 'Plan gratuit avec fonctionnalités essentielles',
      features: [
        'Jusqu\'à 3 lettres',
        'Modèles de base',
        'Export PDF',
        'Support communautaire'
      ],
      price: 0,
      currency: 'eur',
      interval: 'month',
      trialDays: 0,
      isActive: true,
      monthlyAILimit: 0,
      unlimitedAI: false,
    },
    {
      id: 'basic',
      name: 'Basique',
      description: 'Parfait pour les demandeurs d\'emploi occasionnels',
      features: [
        'Lettres illimitées',
        '5 générations IA par mois',
        'Tous les modèles',
        'Export PDF et DOCX',
        'Support email'
      ],
      price: 9.99,
      currency: 'eur',
      interval: 'month',
      trialDays: 7,
      isActive: true,
      monthlyAILimit: 5,
      unlimitedAI: false,
    },
    {
      id: 'pro',
      name: 'Professionnel',
      description: 'Idéal pour les professionnels en reconversion',
      features: [
        'Lettres illimitées',
        '20 générations IA par mois',
        'Modèles premium exclusifs',
        'Analytiques détaillées',
        'Export multiple formats',
        'Support prioritaire'
      ],
      price: 19.99,
      currency: 'eur',
      interval: 'month',
      trialDays: 14,
      isActive: true,
      monthlyAILimit: 20,
      unlimitedAI: false,
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Solution complète pour les recruteurs et consultants',
      features: [
        'Lettres illimitées',
        'Générations IA illimitées',
        'Accès anticipé aux nouvelles fonctionnalités',
        'Analytiques avancées avec insights',
        'API access',
        'Support VIP 24/7',
        'Formation personnalisée'
      ],
      price: 39.99,
      currency: 'eur',
      interval: 'month',
      trialDays: 30,
      isActive: true,
      monthlyAILimit: 15,
      unlimitedAI: true
    }
  ];

  const batch = db.batch();

  for (const plan of defaultPlans) {
    const planRef = db.collection(COLLECTIONS.PLANS).doc(plan.id);
    batch.set(planRef, plan);
  }

  await batch.commit();
  console.log('✅ Plans par défaut créés avec succès');
}

/**
 * Créer des modèles de lettres par défaut
 */
export async function seedDefaultTemplates(): Promise<void> {
  const now = new Date();
  
  const templates = [
    {
      id: 'template-basic-job',
      type: 'job',
      title: 'Lettre de motivation standard',
      template: `Madame, Monsieur,

Suite à votre annonce pour le poste de {{position}} au sein de {{company}}, je vous adresse ma candidature.

Diplômé(e) en {{formation}}, j'ai acquis {{experience}} d'expérience dans le domaine de {{domaine}}. Mes compétences en {{competences}} et ma motivation pour {{secteur}} font de moi un candidat idéal pour ce poste.

Je serais ravi(e) de vous rencontrer pour discuter de ma candidature lors d'un entretien.

Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.

{{signature}}`,
      isPublic: true,
      isPremium: false,
      useCount: 0,
      rating: 4.2,
      tags: ['standard', 'professionnel', 'généraliste'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'template-tech-job',
      type: 'job',
      title: 'Lettre pour poste technique',
      template: `Madame, Monsieur,

Passionné(e) par les technologies {{technologies}} et fort(e) de {{annees_experience}} années d'expérience en développement, je souhaite rejoindre l'équipe {{company}} en tant que {{position}}.

Mon expertise technique inclut :
- {{competence_1}}
- {{competence_2}}
- {{competence_3}}

J'ai notamment contribué à {{projet_marquant}} chez {{entreprise_precedente}}, ce qui m'a permis de développer une approche {{methodologie}} et une capacité à {{soft_skill}}.

Votre stack technique {{stack}} et votre vision {{vision_entreprise}} correspondent parfaitement à mes aspirations professionnelles.

Je reste à votre disposition pour un échange technique approfondi.

Cordialement,
{{signature}}`,
      isPublic: true,
      isPremium: true,
      useCount: 0,
      rating: 4.7,
      tags: ['technique', 'développement', 'it', 'premium'],
      createdAt: now,
      updatedAt: now
    }
  ];

  const batch = db.batch();

  for (const template of templates) {
    const templateRef = db.collection(COLLECTIONS.TEMPLATES).doc(template.id);
    batch.set(templateRef, template);
  }

  await batch.commit();
  console.log('✅ Modèles par défaut créés avec succès');
}

/**
 * Initialiser toutes les données de test
 */
export async function initializeTestData(): Promise<void> {
  try {
    await seedDefaultPlans();
    await seedDefaultTemplates();
    console.log('🎉 Toutes les données de test ont été initialisées');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des données:', error);
    throw error;
  }
}