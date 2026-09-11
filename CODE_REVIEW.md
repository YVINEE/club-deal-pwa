# Revue de code — Club Deal PWA

> **Objet** : revue approfondie du dépôt `YVINEE/club-deal-pwa` (React 18 + TypeScript, Vite + vite-plugin-pwa, Dexie/IndexedDB, React Router, Tailwind, Vitest, Playwright).
>
> **Base analysée** : clone local `/home/doku/Git/club-deal-pwa`, branche `main`, état de travail après le commit `6ffc007`.
> **Note** : le code source devait être fourni dans le prompt initial, mais le bloc était vide. La revue a donc été réalisée directement depuis le clone local. Si le dépôt distant a divergé, certaines remarques peuvent ne plus s'appliquer.
>
> **Vérifications exécutées sur ce commit**
> - `npm run lint` : ✅ aucune erreur
> - `npm test` : ✅ 40 tests / 8 fichiers
> - `npm run build` : ✅ build OK, ⚠️ chunk unique de 508 kB (164 kB gzip)
>
> **But de ce document** : servir de base de vérification/correction (Codex ou humain). Chaque affirmation cite `fichier:ligne`. La dernière section liste ce qui n'est pas vérifiable depuis le code seul.

---

## Résumé exécutif

Le projet est propre, cohérent et bien plus abouti que la moyenne des PWA locales : socle TypeScript strict, séparation `utils`/`db`/`hooks`/`components` respectée, chiffrement AES-GCM + PBKDF2 correctement implémenté, tests unitaires sur toute la logique métier pure, e2e Playwright riche, CI de déploiement fonctionnelle. Les problèmes réels ne sont pas dans les fondamentaux mais dans les **frontières** : validation de l'import JSON trop faible, **injection CSV/ICS** non échappée, **fuseaux horaires** (`new Date("YYYY-MM-DD")` = UTC, mélangé à des dates locales), erreurs d'écriture **avalées puis navigation** (fausse réussite), et une **session globale mutable** (`secureStorage.ts:40`) qui rend l'architecture fragile. La couverture de tests s'arrête brutalement avant `secureStorage`/`repositories`/hooks/composants, et la CI ne lance ni lint, ni tests.

**Priorités** : sécuriser l'import, échapper les exports, corriger le traitement des dates, ne plus avaler les erreurs, puis renforcer tests et CI.

---

## 1. Architecture et organisation

### Points forts
- Arborescence conforme au README/AGENTS : `db/`, `hooks/`, `components/`, `exporters/`, `utils/`, `types/`.
- Repositories centralisés (`db/repositories.ts`) et logique métier pure isolée (`utils/`), testable sans DOM.
- Routage `BrowserRouter` avec `basename={import.meta.env.BASE_URL}` (`App.tsx:227`) cohérent avec le base path.

### Problèmes
- **État global mutable hors React** : `secureStorage.ts:47` (`let session`), `:218` (`session.data = data`). `lirePortefeuille()` renvoie la référence directe au tableau (`secureStorage.ts:192-196`), que les repositories mutent en place (`repositories.ts:29,57`). Singleton implicite qui contourne React : toute divergence (deux onglets, réentrance) entraîne des pertes de mises à jour silencieuses.
- **Pas de source de vérité unique** : chaque écran rappelle `useDeals()` indépendamment (`DashboardPage.tsx:12`, `DealList.tsx:40`, `DealDetail.tsx:39`, `App.tsx:325`). Chaque hook relit **tout** le portefeuille (`useDeals.ts:24`, `useEcheances.ts:12`, `useProlongations.ts:15`, `useToutesLesEcheances.ts:17`). Aucun cache, aucune invalidation partagée.
- **`App.tsx` (346 lignes) est un monolithe** : routage, thème, auto-lock, orchestration chiffrement, import/export, notifications dans un seul composant.
- **Bus d'événement fait main** via `refreshKey` (`useProlongations.ts:35,47` propagé à `useEcheances`). Fragile et non documenté.
- **`getDealsAvecEcheances` en O(n²)** : pour chaque deal, deux `filter` sur les tableaux complets (`repositories.ts:92-102`), et un `Promise.all` inutile autour de `map` synchrones.
- Code mort de migration : `localStorage.removeItem("club-deal-security")` (`App.tsx:52-54`).

---

## 2. Qualité TypeScript

### Points forts
- `strict`, `noImplicitAny`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch` activés (`tsconfig.json:16-21`).
- Types de domaine clairs (`types/index.ts`), `FormState` typé, ESLint `typescript-eslint` recommandé passe sans erreur.

### Problèmes
- **Casts qui contournent la sûreté** : `as unknown as Deal[]` / `Prolongation[]` / `Echeance[]` (`secureStorage.ts:125,130,135`). Le typage prétend valider alors que non.
- **`validerDonnees` trop partielle** (`secureStorage.ts:142-166`) : ne vérifie ni `rendementAnnuel`, ni `frequence` (enum), ni `dureeInitiale`, ni `nombreMaxProlongations`, ni `dureeProlongationMois`, ni l'unicité des ids. Un fichier importé peut produire `NaN`, une fréquence inconnue (retombe sur 6 mois via `frequenceEnMois`, `dateUtils.ts:17-19`), ou une durée absurde.
- **Absence de type de retour explicite** sur `getDealsAvecEcheances` (`repositories.ts:90`).
- **Erreurs avalées** : `catch` qui `console.error` sans remonter dans `useDeals.ts:42,59,72,86`, `useEcheances.ts:16`, `useToutesLesEcheances.ts:29`. Le composant appelant ne peut pas savoir que ça a échoué (voir §9).
- `EncryptedVault.formatVersion` typé littéral `1` mais jamais validé à la lecture (`database.ts:41-50`).

---

## 3. Logique métier (coupons, échéances, prolongations, dates)

### Point fort majeur
La fiscalité CSG 2026 est modélisée finement et testée (`calculs.ts:5-59`, `calculs.test.ts:53-77`), avec montant personnalisable (`DealForm.tsx:268-313`).

### Problèmes réels
- **Fuseaux horaires — bug latent** : `new Date("2025-01-15")` est interprété en **UTC**, puis affiché/comparé en heure locale (`DealForm.tsx:51,152`, `calculs.ts:10,15,33,53`), alors que `date-fns` travaille en local et que le cutover fiscal est en local (`new Date(DATE_CHANGEMENT_FISCALITE + "T00:00:00")`). En France (UTC+1) ça « tombe juste par chance » ; dans tout fuseau à l'ouest d'UTC, les dates affichées **reculent d'un jour** et un deal démarrant le 2026-01-01 peut être jugé éligible à tort. `toISOString().slice(0,10)` (`DealForm.tsx:32`) est le symétrique fautif. Les tests passent car la CI est en UTC.
- **« Prochaine échéance » fausse** : `useDeals.ts:28` filtre `e.date >= maintenant` et **ignore `encaissee`**. Conséquences : une échéance échue non pointée n'est jamais « la prochaine », et la branche « En retard de X jours » de `DealCard.tsx:101-106` est **du code mort** (`joursAvantEcheance` est toujours ≥ 0). Incohérent avec `calculerSyntheseDashboard` qui, lui, tient compte de `encaissee` (`dashboard.ts:61-63`).
- **Règle « prolongation avant échéance » non appliquée au domaine** : `creerProlongation` ne vérifie que le compteur (`calculs.ts:120-134` via `statusUtils.ts:19-21`). Le garde-fou est purement UI (`ProlongationsTab.tsx:16`). `repositories.prolongerDeal` (`repositories.ts:49-60`) est appelable sans contrôle de statut. La règle du README n'est donc pas garantie.
- **Prolongation plus courte que la fréquence → 0 coupon** : si `dureeProlongationMois < frequenceEnMois`, la boucle `calculs.ts:97-100` ne s'exécute jamais (ex. trimestriel + prolongation 2 mois : dates étendues, aucun intérêt généré). Aucune validation.
- **Pas de borne supérieure aux durées** : `dureeInitiale`/`dureeProlongationMois` validées seulement `> 0` (`DealForm.tsx:122,127`). La boucle `calculs.ts:100` peut générer des millions d'échéances et figer l'onglet (DoS local).
- **Perte silencieuse des pointages au recalcul** : `recalculerEcheances` apparie par `getTime()` exact (`repositories.ts:13-21`) ; toute modification de dates (durée, prolongation) déplace les dates et **efface les pointages** sans avertissement, alors que le montant des encaissées est, lui, préservé (ligne 20) — incohérence volontaire mais non documentée pour l'utilisateur.
- **`filtrerPointsCourbe`** : avec suivi actif, une échéance passée non pointée est `projection=true` et `date <= maintenant`, donc exclue à la fois des historiques (`dashboard.ts:114`) et des futurs (`:116`) → point manquant et ancrage possiblement erroné en vue « 1A ».
- **Arrondis** : taux arrondi à 1 décimale (`calculs.ts:38`) mais montants non arrondis (float) ; `dashboard.ts:31-33` arrondit au centime. Risque d'écarts de centimes, non couvert par des tests de propriétés.

---

## 4. Sécurité

### Points forts
- Chiffrement sérieux : AES-GCM 256, clé non extractible, PBKDF2-SHA-256, sel 16 octets aléatoire, **IV 12 octets régénéré à chaque écriture** (`crypto.ts:62,79`), bonne pratique respectée.
- Le coffre est stocké dans IndexedDB (`db.vault`), pas en clair ; les tables claires sont vidées après activation (`secureStorage.ts:234,215`).
- Auto-verrouillage après 60 s en arrière-plan (`App.tsx:35,70-109`), clé gardée en mémoire uniquement.
- Import : rejette un mauvais mot de passe via l'échec GCM (`crypto.test.ts:26-30`).

### Failles / faiblesses
- **Injection CSV** : `genererCsv` (`csvExporter.ts:6-7`) n'échappe rien. Un nom de deal `=HYPERLINK(...)`, `+`, `-`, `@` déclenche l'exécution de formule à l'ouverture dans Excel/Sheets ; un `;`, un guillemet ou un saut de ligne casse le fichier. Les tests ne couvrent que le cas nominal (`csvExporter.test.ts`).
- **Injection / non-conformité ICS** : `icsExporter.ts:18` injecte `deal.nom` sans échapper `,` `;` `\` ni les retours à la ligne, et **sans repli de ligne à 75 octets** (RFC 5545). Un ICS avec un nom long ou accentué peut être rejeté par certains clients.
- **Validation d'import insuffisante** (voir §2) : un fichier JSON peut injecter des valeurs invalides et corrompre l'état local. Surface d'attaque la plus exploitable car l'import est une entrée externe explicitement mentionnée dans AGENTS.md.
- **`window.prompt` pour le mot de passe d'un fichier chiffré** (`App.tsx:185`) : non masqué, bloquant, mauvais pattern sécurité/UX.
- **PBKDF2 310 000 itérations** (`crypto.ts:1`) : en dessous de la recommandation OWASP actuelle (600 000 pour SHA-256). Mot de passe minimum 8 caractères, sans politique de robustesse (`crypto.ts:30-32`).
- **Pas de timeout d'inactivité** tant que l'onglet reste visible ; le déverrouillage reste valable indéfiniment.
- `localStorage` `ENVOYEES_KEY` grossit sans purge (`notifications.ts:73`).
- Pas de CSP (`index.html`), `formatVersion` non validé, réécriture du vault hors transaction IndexedDB (`secureStorage.ts:213`) — en cas d'échec, vault remplacé mais état incohérent possible.

---

## 5. Performance

- **Bundle unique de 508 kB minifié (164 kB gzip)** : warning Vite explicite, aucun `lazy()` de routes, aucun `manualChunks` (`vite.config.ts`). `date-fns` (dont `locale/fr`), Radix et `lucide-react` pèsent lourd ; les pages Paramètres/Échéances sont chargées même pour consulter le dashboard.
- **Écriture O(n) systématique** : chaque mutation vide et réinsère toutes les tables (`secureStorage.ts:65-74`). En mode chiffré, chaque sauvegarde implémente en plus un **stringify + AES-GCM complet + déchiffrement de vérification** (`secureStorage.ts:206-214`). Coût acceptable à petite échelle, non scalable.
- **Index IndexedDB déclarés et jamais utilisés** : `deals`, `prolongations.dealId`, `echeances.dealId`, `.date` (`database.ts:13-37`) ; toute la lecture passe par `toArray()` puis filtres JS (`repositories.ts:90-102`, hooks). L'indexation est purement décorative.
- **O(n²)** : `getDealsAvecEcheances` et `useToutesLesEcheances.ts:20-21` (`dealIds.includes` dans un `filter`).
- Recalculs de tri/agrégats à chaque rendu (`DealList.tsx:45-65`, `EcheancesPage.tsx:28-35,48-66`) sans `useMemo` pour `totauxParEcheance`.
- Aucune virtualisation (justifié vu la volumétrie), mais aucune limite/mesure.

---

## 6. PWA et offline

### Points forts
- `generateSW`, `autoUpdate`, `skipWaiting` + `clientsClaim`, pré-cache de 8 entrées ; `navigateFallback: "index.html"` **correctement résolu** (`dist/sw.js` : `createHandlerBoundToURL("index.html")`). Le commentaire `vite.config.ts:27-28` est exact.
- `start_url`/`scope`/base path cohérents `/club-deal-pwa/` (`vite.config.ts:6,19`), enregistrement SW généré (`dist/registerSW.js`).

### Problèmes
- **Manifest `"lang":"en"`** (généré, `dist/manifest.webmanifest:1`) alors que l'app est française ; non défini dans `vite.config.ts`. Défaut vite-plugin-pwa. Impact i18n/PWA.
- **Deep links en démarrage à froid = 404 sur GitHub Pages** : `navigateFallback` ne fonctionne **qu'après installation du SW**. Première visite sur `/club-deal-pwa/deal/xxx` (ou clic sur une notification si l'app n'a jamais été installée) → 404 GitHub Pages. Il manque un `404.html` de redirection ou un fallback statique.
- **Notifications limitées à l'onglet ouvert** : `new Notification` dans le contexte window (`notifications.ts:60`), pas de `ServiceWorkerRegistration.showNotification`, pas de push. Documenté dans le README, mais l'UI se présente comme active dès que `Notification.permission !== "denied"` (`App.tsx:48-50`) alors que l'envoi exige `granted` (`notifications.ts:49`) → **état UI trompeur** si permission `default`.
- Pas d'`apple-touch-icon`, pas de meta `apple-mobile-web-app-*` : installation iOS dégradée. `maskable` réutilise `icon-512.png` sans zone de sécurité (risque de rognage du logo).
- Pas d'UI « nouvelle version disponible » (autoUpdate recharge sans prévenir).
- Pas de test offline réel (voir §7).

---

## 7. Tests

### Points forts
47 tests, 9 fichiers, très bonne couverture de la logique pure — fiscalité CSG, génération d'échéances/prolongations, dashboard/courbe, formats de date, statuts, notifications (`localStorage`/`Notification` mockés), crypto, validation d'import et exports CSV/ICS. E2E Playwright : 14 scénarios de parcours (CRUD, tri, filtres, pointage, scroll, thème, notifications, chiffrement + auto-lock, export/import JSON, CSG).

### Manques structurels
- **Aucun test de `secureStorage` / `repositories`** : activation/désactivation/changement de mot de passe, mode clair vs chiffré, `recalculerEcheances` (préservation des pointages), suppressions en cascade, import chiffré, validation d'import — c'est précisément le code le plus risqué.
- **Aucun test de composants/hooks** (pas de React Testing Library, pas de `jsdom`). `vitest.config.ts` ne définit ni `environment: "jsdom"` ni l'alias `@`, donc **tout test de composant échouerait dès qu'il importerait `@/components/...`**. La config Vitest n'étend pas `vite.config.ts`.
- Pas de seuil de couverture, pas de `@vitest/coverage`.
- E2E lancés sur **`npm run dev`** (`playwright.config.ts:17`), pas sur `preview` : le build de production, le service worker, l'offline et le base path réel **ne sont jamais testés**. L'import d'un JSON **chiffré** n'est pas couvert ; pas de test fuseaux horaires ; pas de test d'échappement CSV/ICS ; pas de test de validation d'import malveillant.

---

## 8. CI/CD

### Points forts
`.github/workflows/deploy.yml` correct — permissions Pages/`id-token`, `npm ci` avec cache, Node 22, build, `configure-pages` + `upload-pages-artifact` + `deploy-pages`, base path `/club-deal-pwa/` cohérent. Le build casse bien le déploiement en cas d'erreur TS.

### Problèmes
- **Le workflow ne lançait initialement ni lint, ni tests, ni PR.** Corrigé dans l'état de travail : lint et tests unitaires sont exécutés sur push/PR ; les e2e restent à ajouter à la CI.
- **Pas de `concurrency`** : deux pushes rapprochés peuvent lancer deux déploiements concurrents.
- Pas de cache Playwright, pas d'artifact de rapport de tests, pas d'audit `npm audit`/Dependabot.
- `tsc -b` fonctionne (vérifié) malgré l'absence de `composite`/`references` ; les fichiers de config (`vite.config.ts`, `playwright.config.ts`, `vitest.config.ts`) **ne sont couverts par aucun tsconfig** (`include: ["src"]`).
- À vérifier : validité de `deploy-pages@v5` (la branche stable connue est `v4`). Non confirmable sans accès au registre Actions.

---

## 9. Accessibilité et UX

### Points forts
`lang="fr"` (`index.html:2`), switches avec `role="switch"`/`aria-checked`/`aria-label`, boutons icônes `aria-label`, safe areas iOS, contrastes dark/light travaillés, labels de sections `aria-labelledby`, `role="alert"` sur erreurs de formulaire.

### Problèmes
- **`DealCard` non accessible au clavier** : `<div onClick>` sans `role`, `tabIndex` ni `onKeyDown` (`DealCard.tsx:48-52`) → impossible d'ouvrir un deal avec Tab/Entrée. Composant de navigation central.
- **Labels non associés aux champs** : le composant `Champ` rend un `Label` Radix **sans `htmlFor`** et les `Input` sans `id` (`DealForm.tsx:178-334`) ; ailleurs compensé par `aria-label`. Association lecteur d'écran/clic sur label non garantie.
- **Barre de progression purement visuelle** : `div` avec `aria-label` mais sans `role="progressbar"`/`aria-valuenow` (`DealCard.tsx:133-144`).
- **Filtres d'échéances en `role="tab"`/`tablist` incomplets** (`EcheancesPage.tsx:116-139`) : pas de `tabpanel`, pas d'`aria-controls`, pas de navigation clavier par flèches. Préférer des boutons `aria-pressed`.
- Graphique SVG sans alternative tabulaire (`Dashboard.tsx:242-262`).
- **`window.confirm` / `window.alert` / `window.prompt`** (`App.tsx:176,184-185,204`) : bloquants, non stylés, non cohérents avec les `AlertDialog` Radix utilisés ailleurs.
- **Fausse réussite** : `useDeals.creer/modifier/supprimer` avalent l'erreur ; `EcranFormulaire.gererSoumission` et `DealDetail.gererSuppression` naviguent ensuite sans condition (`App.tsx:329-337`, `DealDetail.tsx:66-70`) → l'utilisateur croit avoir enregistré/supprimé alors que non. `pointerEcheance` (`DealDetail.tsx:72-80`) peut produire un rejet non capturé (échéance future).
- Incohérence de formatage : `DealCard.tsx:62` (`toLocaleString` sans décimales) vs ailleurs 2 décimales (`DealDetail.tsx:233`).
- Pas de gestion du focus au changement de route ni de lien d'évitement.

---

## 10. Checklist actionnable priorisée

### 🔴 Bloquant
- [x] **Échapper CSV/ICS** : les champs texte sont neutralisés/échappés et les lignes ICS sont repliées à 75 octets. Tests d'injection ajoutés.
- [x] **Durcir `validerDonnees`** : fréquence, bornes numériques, dates, ids, relations et longueurs sont validés avant écriture. Tests unitaires ajoutés.
- [x] **Ne plus avaler les erreurs puis naviguer** : les mutations `useDeals` relancent l'erreur et les écrans restent en place en cas d'échec.
- [x] **Corriger les dates** : les dates de formulaire et le cutover fiscal sont construits en heure locale. Test exécuté avec `TZ=America/New_York`.
- [x] **Traiter le 404 GitHub Pages** : `public/404.html` redirige les deep links vers le shell SPA et `index.html` restaure le chemin.

### 🟠 Important
- [x] **Appliquer la règle « prolonger avant échéance »** dans le repository `prolongerDeal`, avant l'appel à `creerProlongation`.
- [x] **Corriger la « prochaine échéance »** : la première échéance non encaissée est retenue, y compris si elle est en retard.
- [x] **Valider la cohérence fréquence/prolongation** et **borner les durées** dans le formulaire et à l'import.
- [ ] **Tests sécurité/stockage** : `secureStorage` (activate/lock/change/import/export, auto-lock), `repositories` (recalcul/pointages), + `vitest.config.ts` avec `environment: "jsdom"` et alias `@`.
- [ ] **CI** : lint, tests unitaires, build, déclenchement PR et concurrence ont été ajoutés ; les e2e ne sont pas encore exécutés dans la CI.
- [ ] **E2E sur build de production** (`playwright.config.ts:17` → `npm run preview`), tester l'import chiffré et un scénario offline/SW.
- [ ] **Manifest** : `lang: "fr"`, `id`, `orientation` et `apple-touch-icon` sont ajoutés ; l'icône maskable dédiée avec padding reste à produire.
- [ ] **A11y** : `DealCard`, la progression et les filtres d'échéances sont corrigés ; l'association systématique `htmlFor`/`id` des champs et l'alternative tabulaire du graphique restent à traiter.
- [ ] **Réduire le bundle** : `React.lazy` sur les routes secondaires / `manualChunks`.
- [ ] **Éviter la réécriture complète** : utiliser les index Dexie (`where('dealId')`), transactions ciblées, et supprimer le singleton `session` au profit d'un store explicite.

### 🟡 Nice-to-have
- [ ] PBKDF2 600 000 itérations (`crypto.ts:1`) + politique de mot de passe.
- [ ] Remplacer `window.confirm/alert/prompt` par des dialogues UI (surtout le mot de passe, `App.tsx:185`).
- [ ] Purger `ENVOYEES_KEY` (`notifications.ts:73`) et ne marquer « notifications actives » que si `permission === "granted"` (`App.tsx:48-50`).
- [ ] Supprimer le code mort `club-deal-security` (`App.tsx:52-54`).
- [ ] Seuils de couverture, Dependabot/`npm audit`, CSP, gestion des échecs de migration Dexie.
- [ ] Homogénéiser le formatage monétaire et ajouter un timeout d'inactivité.

---

## Informations manquantes / non vérifiables

- Le contenu collé dans le prompt initial était vide : pas de comparaison possible avec le dépôt distant `YVINEE/club-deal-pwa` (divergence possible).
- Non vérifiables depuis le code seul : configuration réelle de GitHub Pages, protection de branche/rulesets, secrets, audience cible (fuseaux horaires réels), volumétrie de données attendue, audit de vulnérabilités des dépendances (`npm audit` non exécuté).

## Journal de vérification

| Point | Statut | Action | Fichiers modifiés | Tests |
|---|---|---|---|---|
| 1. Architecture | CONFIRMÉ | Risques structurels conservés, car refactor risqué hors périmètre minimal | — | — |
| 2. TypeScript/import | CONFIRMÉ | Validation d'import durcie et retour de type ajouté | `src/db/secureStorage.ts`, `src/db/repositories.ts` | `secureStorage.test.ts`, lint, build |
| 3. Métier/dates | CONFIRMÉ | Dates locales, prochaine échéance dépendante du suivi, prolongation contrôlée au repository et bornes corrigées | `src/utils/dateUtils.ts`, `src/utils/calculs.ts`, `src/utils/statusUtils.ts`, `src/db/repositories.ts`, `src/hooks/useDeals.ts`, `src/components/DealForm.tsx` | 46 tests, `TZ=America/New_York`, e2e |
| 4. Sécurité exports/import | CONFIRMÉ | CSV/ICS échappés et import validé | `src/exporters/*`, `src/db/secureStorage.ts` | tests d'injection et validation |
| 5. Performance | CONFIRMÉ | Bundle et écritures complètes non refactorés, car non nécessaires à la correction fonctionnelle immédiate | — | build : warning chunk 510 kB |
| 6. PWA/offline | PARTIEL | Manifest, apple-touch-icon et deep-link 404 corrigés ; maskable dédié et UI de mise à jour non traités | `vite.config.ts`, `index.html`, `public/404.html` | build |
| 7. Tests | PARTIEL | Tests de validation/dates/exports ajoutés et 14 e2e passent ; stockage Dexie complet et preview/offline restent à couvrir | `src/db/secureStorage.test.ts`, `src/utils/dateUtils.test.ts`, `tests/e2e/app.spec.ts` | 47 unitaires, 14 e2e |
| 8. CI/CD | PARTIEL | CI PR séparée avec lint/tests/build ; déploiement Pages conservé sur push main ; e2e/audit dépendances non ajoutés | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` | workflows non exécutés localement |
| 9. Accessibilité/UX | PARTIEL | DealCard, progression, filtres et faux succès corrigés ; labels de champs, focus global et alternative graphique restent à faire | `src/components/DealCard.tsx`, `src/components/EcheancesPage.tsx`, `src/components/DealDetail.tsx` | e2e |
| 10. Checklist | CONFIRMÉ | Cases cochées uniquement pour les corrections validées | `CODE_REVIEW.md` | lint, tests, build, e2e |

**Commandes exécutées**

- `npm run lint` : ✅ aucune erreur.
- `npm test` : ✅ 47 tests / 9 fichiers.
- `TZ=America/New_York npm test` : ✅ 47 tests / 9 fichiers.
- `npm run build` : ✅ build OK ; avertissement Vite sur le chunk JS de 510 kB (165 kB gzip).
- `npm run test:e2e` : ✅ 14 scénarios passés.

**Vérification complémentaire** : le retour externe a identifié une régression dans la première correction de la prochaine échéance et une dépendance à l'horloge dans `peutProlonger`. Ces deux points ont été corrigés avant clôture : le hook tient compte de `suiviEncaissements`, la fonction métier reste pure et le repository refuse une prolongation après la date de fin. La CI PR a également été séparée du workflow Pages.

La validation legacy accepte désormais les anciennes durées hors des nouvelles bornes au déverrouillage, tout en conservant la validation stricte des imports JSON. Les scénarios Playwright utilisent des dates futures calculées à l'exécution.

### Points non traités

- Refactor du singleton de session, cache partagé, transactions Dexie ciblées et découpage du bundle : amélioration d'architecture/performance à planifier séparément.
- Tests complets de `secureStorage`/repositories, test sur `preview`/service worker/offline et import JSON chiffré : non bloquants pour cette correction, mais prioritaires pour la suite.
- Icône maskable dédiée, labels `htmlFor`/`id`, alternative tabulaire du graphique, dialogues non bloquants, PBKDF2 600 000, CSP et audit des dépendances : non traités pour limiter le risque et le périmètre.
