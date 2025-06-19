# CoverLetter Pro - Frontend

## Synthèse du projet

### Ce qui est en train d’être fait

- Développement d’une application SaaS permettant aux utilisateurs de créer, personnaliser et gérer des lettres de motivation professionnelles.
- Frontend React/TypeScript avec gestion d’état via Zustand, intégration de Firebase Auth pour l’authentification, et préparation de l’intégration backend (Firestore, Stripe).
- Pages principales déjà en place : accueil, inscription, connexion, éditeur de lettres, gestion du profil, etc.
- Fonctionnalités clés : modèles de lettres, export PDF/Word, suggestions d’amélioration, gestion des abonnements (plans gratuits/premium à venir).

### Points forts

- **Expérience utilisateur moderne** : UI responsive, parcours simple (3 étapes), feedback instantané.
- **Gestion d’état centralisée** (Zustand) et persistance de session.
- **Intégration prévue avec des services robustes** : Firebase (auth, base de données), Stripe (paiements).
- **Architecture modulaire** : séparation claire des services, stores, composants.
- **Prise en charge de l’authentification sociale** (Google, GitHub).

### Points faibles

- **Intégration backend incomplète** : la logique métier (création de lettres, abonnements, etc.) n’est pas encore connectée au backend.
- **Sécurité côté client** : la logique d’authentification et de gestion des rôles reste basique.
- **Gestion des erreurs perfectible** : feedback utilisateur limité en cas d’échec d’action.
- **Manque de différenciation fonctionnelle** : fonctionnalités avancées (analyse sémantique, scoring de lettre, IA) absentes ou non visibles.
- **Analytics et suivi utilisateur non implémentés**.

### Comment rendre le produit plus compétitif

- **Finaliser l’intégration backend** : connecter toutes les pages et actions au backend pour rendre l’application pleinement fonctionnelle.
- **Ajouter des fonctionnalités différenciantes** :
  - Génération assistée par IA (suggestions, corrections automatiques, scoring).
  - Analyse sémantique et conseils personnalisés.
  - Modèles sectoriels premium.
- **Renforcer la sécurité** :
  - Gestion avancée des rôles et permissions.
  - Déconnexion automatique à l’expiration du token.
  - Validation renforcée côté backend.
- **Optimiser l’expérience utilisateur** :
  - Sauvegarde automatique, historique des versions.
  - Notifications en temps réel (succès, erreurs, rappels).
  - Onboarding interactif.
- **Développer l’aspect communautaire** :
  - Partage de lettres (anonymisées) pour inspiration.
  - Système de feedback/notation entre utilisateurs.
- **Suivi et analytics** :
  - Tableau de bord d’utilisation.
  - Suivi des conversions (lettres envoyées, entretiens obtenus).
- **Internationalisation** :
  - Support multilingue pour toucher un public plus large.

---

## Structure du Projet

```
cover-letter-gen/frontend/
├── public/            # Fichiers statiques
│   ├── favicon.svg
│   └── index.html
├── src/               # Code source
│   ├── components/    # Composants React
│   │   ├── common/    # Composants réutilisables
│   │   │   └── Button.tsx
│   │   └── layout/    # Composants de mise en page
│   │       ├── Footer.tsx
│   │       └── Navbar.tsx
│   ├── pages/         # Pages de l'application
│   │   └── HomePage.tsx
│   ├── styles/        # Styles CSS
│   │   ├── globals.css
│   │   └── theme.ts
│   ├── App.tsx        # Composant principal
│   ├── main.tsx       # Point d'entrée
│   └── vite-env.d.ts  # Types pour TypeScript
├── package.json       # Dépendances et scripts
├── tsconfig.json      # Configuration TypeScript
└── vite.config.ts     # Configuration Vite
```

## Technologies utilisées

- React 18
- TypeScript
- Vite
- tailwindcss (pour le styling)
- React Router (pour la navigation)
- React Icons

## Installation

1. Clonez ce dépôt
2. Installez les dépendances

```bash
npm install
```

3. Créez un fichier `.env` à la racine du projet avec les variables d'environnement nécessaires :

```env
VITE_API_URL=http://localhost:5001/your-project-id/europe-west1/api
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
```

## Développement

Pour lancer le serveur de développement :

```bash
npm run dev
```

Le site sera accessible à l'adresse [http://localhost:3000](http://localhost:3000).

## Build

Pour construire l'application pour la production :

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist`.

## Preview

Pour prévisualiser la version de production :

```bash
npm run preview
```

## Déploiement

Le frontend peut être déployé sur :
- Firebase Hosting
- Vercel
- Netlify
- GitHub Pages
- Ou tout autre service d'hébergement statique

### Déploiement sur Firebase Hosting

1. Assurez-vous d'avoir Firebase CLI installé
```bash
npm install -g firebase-tools
```

2. Connectez-vous à Firebase
```bash
firebase login
```

3. Initialisez Firebase Hosting
```bash
firebase init hosting
```

4. Déployez votre application
```bash
npm run build
firebase deploy --only hosting
```

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.
