# Suivi Club Deals

PWA de suivi de club deals avec gestion des prolongations, construite avec React + TypeScript + Vite + Dexie (IndexedDB).

## Démarrage

```bash
npm install
npm run dev
```

L'app est disponible sur http://localhost:5173

## Build de production

```bash
npm run build
npm run preview
```

## Structure du projet

```
src/
├── App.tsx                  # Routage (react-router-dom, gère le bouton retour Android)
├── main.tsx
├── db/
│   ├── database.ts           # Schéma Dexie (IndexedDB)
│   └── repositories.ts       # CRUD + recalcul auto des échéances
├── hooks/
│   ├── useDeals.ts            # Liste des deals enrichie (statut, échéances)
│   ├── useEcheances.ts        # Échéances d'un deal
│   ├── useProlongations.ts    # Historique + action "Prolonger"
│   └── useToutesLesEcheances.ts  # Pour un futur tableau de bord
├── components/
│   ├── DealList.tsx / DealCard.tsx
│   ├── DealForm.tsx
│   ├── DealDetail.tsx (+ EcheancesTab / ProlongationsTab / ExportTab)
│   └── ui/                   # Composants shadcn/ui (Button, Input, Select, AlertDialog...)
├── exporters/
│   ├── csvExporter.ts
│   └── icsExporter.ts        # Format RFC 5545 avec rappel VALARM -1 jour
└── utils/
    ├── dateUtils.ts
    ├── calculs.ts             # Logique métier pure (testable indépendamment)
    └── statusUtils.ts
```

## Règles métier

- Un deal a une durée initiale ; à la fin, il passe automatiquement au statut "terminé" **sauf** si l'utilisateur clique sur "Prolonger" avant l'échéance — aucune prolongation automatique.
- Modifier un deal (montant, rendement...) recalcule intégralement ses échéances, y compris rétroactivement sur les échéances déjà passées.
- Chaque échéance représente un versement d'intérêt (fréquence trimestrielle ou semestrielle) ; il n'y a pas d'échéance "fin de période" stockée séparément — la date de fin est calculée à la volée.
