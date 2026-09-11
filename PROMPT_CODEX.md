# Prompt Codex — Vérification et correction de la revue de code

> À coller tel quel dans Codex, à la racine du dépôt `club-deal-pwa`.
> La revue à vérifier est `CODE_REVIEW.md`.

---

## Contexte

Tu interviens sur le dépôt **club-deal-pwa** (React 18 + TypeScript, Vite + vite-plugin-pwa, Dexie/IndexedDB, React Router, Tailwind, Vitest, Playwright). Le fichier `CODE_REVIEW.md` à la racine est une revue de code produite par un autre agent. Ta mission : **VÉRIFIER** chaque affirmation, **CORRIGER** les vrais problèmes, puis **METTRE À JOUR** `CODE_REVIEW.md` en cochant la checklist.

**Règle d'or** : ne fais confiance à aucune affirmation de `CODE_REVIEW.md` avant de l'avoir confrontée au code réel. La revue peut contenir des faux positifs, des numéros de ligne obsolètes ou des erreurs d'interprétation.

## Étape 1 — Audit de vérification (aucune modification de code à ce stade)

Pour **CHAQUE** point de la revue (sections 1 à 10 et checklist) :

1. Ouvre les fichiers cités et vérifie le comportement réel.
2. Classe le point dans une de ces catégories :
   - **CONFIRMÉ** : le problème existe tel que décrit.
   - **PARTIEL** : existe mais avec une nuance (précise laquelle, corrige le texte/les lignes).
   - **RÉFUTÉ** : faux positif (explique pourquoi avec preuves).
   - **NON VÉRIFIABLE** : dépend de l'infra (GitHub Pages, versions d'Actions, etc.).
3. Pour CONFIRMÉ/PARTIEL, propose le correctif minimal et idiomatique.

## Étape 2 — Corrections

Corrige uniquement les points CONFIRMÉ/PARTIEL, en respectant :

- **AGENTS.md** : indentation 2 espaces, PascalCase composants, camelCase fonctions, noms métier français existants (`echeances`, `prolongations`), logique métier pure dans `src/utils/`.
- Edits **étroitement ciblés** ; ne refactorise pas au-delà du nécessaire.
- Pas de nouvelles dépendances sans justification ni vérification que le projet les utilise déjà.
- Ajoute/adapte des **tests Vitest** pour toute logique corrigée (notamment : échappement CSV/ICS, validation d'import JSON, fuseaux horaires avec `TZ=America/New_York`, prochaine échéance avec encaissement, prolongation < fréquence).
- Traite en priorité les **5 points BLOQUANTS**, puis les **IMPORTANTS**. Ne touche pas aux nice-to-have sauf s'ils sont triviaux et sans risque.

## Étape 3 — Validation obligatoire

Exécute et rapporte les résultats exacts :

```bash
npm run lint
npm test
npm run build
```

Corrige toute régression. **Ne déclare un point réglé que si lint + tests + build passent.**

## Étape 4 — Mise à jour de CODE_REVIEW.md

- Coche `[x]` **UNIQUEMENT** les items réellement corrigés ET validés.
- Pour les RÉFUTÉS, ne les coche pas : ajoute `~~texte~~` ou `> RÉFUTÉ : ...` avec la preuve.
- Pour les PARTIELS, corrige la description et/ou les numéros de ligne.
- Ajoute en fin de document une section **« Journal de vérification »** : un tableau

  | Point | Statut (CONFIRMÉ/PARTIEL/RÉFUTÉ/NON VÉRIFIABLE) | Action | Fichiers modifiés | Tests |

  et une ligne **« Commandes exécutées »** avec les résultats.
- Ne supprime aucun point : la traçabilité doit rester.

## Contraintes

- N'exécute **AUCUN** commit, push ou changement de config git.
- Ne modifie pas les fichiers hors du périmètre de la revue.
- Si un correctif est risqué ou ambigu, **NE le fais pas** : documente-le dans le journal et propose l'option recommandée.
- Si tu ne peux pas exécuter une commande, dis-le explicitement au lieu d'inventer un résultat.

## Livrable final

1. Le diff des corrections (résumé par fichier).
2. `CODE_REVIEW.md` mis à jour avec la checklist cochée et le Journal de vérification.
3. La liste des points non traités avec la raison.

---

**Astuce d'exécution** : lance Codex par lots (« traite d'abord les 5 bloquants, montre-moi le diff, puis continue ») pour éviter un refactor trop large.
