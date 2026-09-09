# Suivi Club Deals

PWA mobile-first pour suivre des investissements en club deals : capital investi, intérêts encaissés, échéances à venir, prolongations et trajectoire du portefeuille.

Application déployée sur [GitHub Pages](https://yvinee.github.io/club-deal-pwa/).

## Fonctionnalités

- Tableau de bord avec valeur actuelle, gains acquis, gains futurs et total final prévu.
- Liste des deals triée par prochaine échéance.
- Création, modification et suppression de deals.
- Rendements trimestriels ou semestriels et calcul automatique des coupons.
- Suivi des échéances avec pointage et dépointage des encaissements.
- Gestion des prolongations avec suivi de la maturité contractuelle.
- Graphique de trajectoire du portefeuille avec vues « Tout » et « 1A ».
- Export CSV et calendrier ICS depuis le détail d’un deal.
- Export et import JSON pour sauvegarder ou restaurer les données locales.
- Notifications locales le jour des échéances, activables dans les paramètres.
- Stockage local Dexie/IndexedDB, utilisable hors ligne.
- Chiffrement optionnel de la base locale par mot de passe.
- Thème sombre par défaut et thème clair disponible dans les paramètres.
- Navigation mobile par onglets : Vue, Deals, Échéances et Paramètres.

> Les données sont conservées localement sur l’appareil. Il n’y a pas de serveur de synchronisation. En cas d’activation du chiffrement, le mot de passe ne peut pas être récupéré par l’application.

## Technologies

- React 18 + TypeScript
- Vite et `vite-plugin-pwa`
- Dexie / IndexedDB
- React Router
- Tailwind CSS
- Vitest pour les tests unitaires
- Playwright pour les tests de parcours utilisateur

## Installation et développement

Prérequis : Node.js récent et npm.

```bash
npm install
npm run dev
```

L’application est disponible sur <http://localhost:5173/club-deal-pwa/>.

## Commandes

```bash
npm run dev       # serveur de développement Vite
npm run build     # vérification TypeScript et build de production
npm run preview   # prévisualisation du build
npm run lint      # ESLint
npm test          # tests unitaires Vitest
npm run test:e2e  # tests Playwright avec Chromium
```

Les tests Playwright démarrent automatiquement le serveur Vite local. Le navigateur Chromium peut être installé avec :

```bash
npx playwright install chromium
```

## Déploiement GitHub Pages

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit et publie automatiquement l’application à chaque push sur `main`.

Pour activer GitHub Pages :

1. Ouvrir **Settings → Pages** dans le dépôt Github.
2. Sélectionner **GitHub Actions** comme source de publication.
3. Pousser les changements sur `main`.

Le site est ensuite accessible à l’adresse :

<https://yvinee.github.io/club-deal-pwa/>

## Organisation du projet

```text
src/
├── App.tsx                  # Routage et initialisation du stockage
├── db/                      # Schéma Dexie, stockage sécurisé et repositories
├── hooks/                   # État des deals, échéances et prolongations
├── components/              # Écrans, formulaires et composants UI
├── exporters/               # Exports CSV et ICS
└── utils/                   # Calculs métier, dates, statuts et chiffrement

tests/e2e/                   # Parcours Playwright
```

## Règles métier principales

- Un deal peut être trimestriel ou semestriel.
- Les échéances sont recalculées lorsque les paramètres financiers du deal sont modifiés.
- Un deal arrivé à son terme devient terminé, sauf prolongation déclenchée manuellement avant l’échéance.
- Le pointage des échéances est optionnel dans les paramètres.
- Les notifications d’échéances sont désactivées par défaut et nécessitent l’autorisation du navigateur.
- L’import JSON remplace les données locales existantes après confirmation.

## Sécurité et sauvegardes

Le chiffrement protège les données stockées localement sur l’appareil, mais ne remplace pas une sauvegarde. Exportez régulièrement un fichier JSON et conservez-le dans un emplacement sûr. Les fichiers JSON chiffrés nécessitent leur mot de passe pour être importés.

## Notifications

Les notifications d’échéances sont optionnelles et s’activent depuis **Paramètres**. La PWA vérifie les échéances non encaissées le jour prévu :

- à l’ouverture de l’application ;
- lorsque l’application redevient visible ou active ;
- une seule fois par échéance et par jour.

Le navigateur doit autoriser les notifications. Le clic sur une notification ouvre l’écran **Échéances**. Comme les données sont locales, une PWA complètement fermée ne garantit pas une notification en arrière-plan sur tous les appareils ; cette garantie nécessiterait un service Push et un serveur.
