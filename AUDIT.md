# AUDIT — Piscine Max

> Document d'audit complet (Analyse #1)
> Date : 2026-06-27 · Commit de référence : `a946d90`
> Auteur : audit technique & conceptuel à froid

---

## 0. Méthode

Audit en lecture seule de **tout** le code à l'instant T (aucune modification pendant l'analyse) :

- **Backend** : `src/index.tsx` (1036 lignes), `src/auth.ts`, `src/water.ts`, `src/geocode.ts`, `src/html.ts`
- **Frontend** : `public/static/app.js` + 8 vues (`views-*.js`)
- **Base de données** : 5 migrations (`0001` → `0005`), schéma + index
- **Outillage** : `scripts/gen-seed.mjs`, `wrangler.jsonc`, `vite.config.ts`, `ecosystem.config.cjs`

L'audit se structure en 3 axes demandés par Romain :
1. **Qualité de code & architecture** (comment c'est codé)
2. **Bugs potentiels** (ce qui peut casser)
3. **Concept & fonctionnalités** (ce qui manque vs. le métier du pisciniste)

Puis une **stratégie** priorisée.

---

## 1. Rappel du concept

**Piscine Max** = outil de gestion pour piscinistes / intervenants d'entretien de piscines.

Acteurs (post-fusion des rôles) :
- **`member`** : un humain qui gère ses propres clients/piscines ET peut être intervenant pour d'autres membres (relation N-N via `pro_workers`).
- **`client`** : accès lecture seule à ses propres piscines.

Briques métier existantes :
- Clients → Piscines → Entretiens (récurrents/ponctuels) → Relevés (logs) avec mesures d'eau.
- **Diagnostic eau** + **dosage** auto (pH, chlore, sel, TAC, stabilisant) scalé au volume.
- **Cycles saisonniers** par piscine (`pool_seasons`) : fréquence de passage variable selon la saison.
- **Centre d'alertes** (eau hors-norme + retards de passage).
- **Agenda** (jour/semaine), **mode tournée** (carte + optimisation d'itinéraire), **météo** (Open-Meteo).
- **Photos** (R2), **espace client**, **équipe**, **stats**, **rapport de passage**.

C'est déjà riche. L'audit vise donc surtout la **solidité** (cohérence du modèle après fusion) et la **profondeur métier** (ce qui ferait gagner du temps au pisciniste sur le terrain).

---

## 2. Axe A — Qualité de code & architecture

### A1. Incohérence de rôle à la création de compte ⚠️ CRITIQUE
Après la fusion `pro`/`worker` → `member`, **deux points d'entrée créent encore les anciens rôles** :
- `src/index.tsx:156` et `:158` → `signup` crée `role: 'pro'`.
- `src/index.tsx:250` → `POST /team/workers` crée `role: 'worker'`.

Conséquence : tout **nouveau** compte naît dans un rôle qui n'existe plus dans le modèle. Les comptes seedés sont `member`, mais la prod va se remplir de `pro`/`worker` au fil des inscriptions → bombe à retardement sur tous les filtres `role !== 'client'`.
**Gravité : haute.** À corriger en priorité absolue.

### A2. Requête N+1 sur `/api/alerts`
`src/index.tsx:830-868` : pour chaque piscine du périmètre, une requête séparée « dernier relevé ». Sur 50 piscines = 51 requêtes D1. D1 facture et latence par requête → l'écran d'alertes (chargé à chaque accueil) devient le goulet d'étranglement.
**Gravité : moyenne** (perf, monte avec le nombre de piscines).

### A3. Gestion d'erreur frontend « avale tout »
21 blocs `catch` qui, au mieux, affichent un toast générique « Erreur », au pire ne font rien (`catch {}`). Aucun feedback exploitable pour l'utilisateur ni pour le debug. Exemples : `views-extra.js:204`, `views-extra.js:409`, `views-logs.js:157`.
**Gravité : faible** (UX/maintenabilité), mais transverse.

### A4. CORS wildcard
`src/index.tsx:36` → `app.use('/api/*', cors())` sans origine restreinte. App same-origin (front servi par le même Worker) donc impact réel quasi nul, mais c'est une porte ouverte inutile.
**Gravité : faible.**

### A5. Monolithe `index.tsx` (1036 lignes)
Tout le backend dans un seul fichier : auth, clients, pools, seasons, maintenances, logs, photos, alerts, stats, météo, espace client. Lisible aujourd'hui, mais chaque ajout alourdit. Découpage en routeurs Hono (`routes/clients.ts`, `routes/pools.ts`…) faciliterait l'évolution.
**Gravité : faible** (dette, pas un bug).

### A6. `onclick` avec interpolation de chaînes
~12 `onclick="fn('${value}')"` dans le HTML généré. Mitigé par `esc()` + remplacement de quotes, mais fragile si un label contient une apostrophe non échappée. Préférer `data-*` + délégation d'événements.
**Gravité : faible** (robustesse).

### A7. Duplication des gardes `role === 'client'`
Le motif `if (user.role === 'client') return 403` est répété ~12 fois. Un middleware `requireMember` unique (déjà amorcé avec `requirePro`) éviterait les oublis.
**Gravité : faible** (DRY).

---

## 3. Axe B — Bugs potentiels

### B1. Label mort `'admin'` dans l'agenda 🐞
`public/static/views-agenda.js:349` : `u.role === 'admin' ? 'Pisciniste' : 'Intervenant'`. Le rôle `'admin'` n'existe pas → la branche est **morte**, l'étiquette affiche toujours « Intervenant » même pour le propriétaire. Vestige d'un modèle abandonné.
**Gravité : moyenne** (affichage trompeur).

### B2. Conflit conceptuel cadence entretien ↔ saisons 🐞
- L'entretien porte `weekday` + `interval_weeks`.
- La piscine porte `pool_seasons` (`interval_days` + `weekday` par saison).
- `occurrencesForDate` est **saison-aware** : dès qu'une piscine a des saisons, la cadence définie sur l'entretien est **silencieusement ignorée**.

Or le formulaire d'entretien (`views-agenda.js:366-388`) affiche **toujours** les champs jour/fréquence — l'utilisateur les règle en croyant agir, sans effet. Incohérence sournoise entre ce qu'on saisit et ce qui se passe.
**Gravité : moyenne** (UX trompeuse + risque d'erreur de planning).

### B3. Étiquettes figées côté accueil
`app.js:385-386` : ternaires `isAdmin()` pour les libellés (« Piscines »/« Mes piscines »…). Comme tous les membres sont désormais `isPro`, la branche « client » de ces ternaires est inatteignable → code mort + libellés qui ne reflètent plus la réalité d'un membre qui est aussi intervenant.
**Gravité : faible.**

### B4. Calcul de retard basé sur `expected_interval_days` global
`/api/alerts` (B2 lié) calcule le retard avec `p.expected_interval_days` (champ piscine global), **pas** avec la cadence saisonnière réelle. Une piscine en hiver (passage espacé) sera signalée « en retard » selon le rythme d'été. Faux positifs d'alerte en basse saison.
**Gravité : moyenne** (fiabilité des alertes, cœur de l'outil).

### B5. Pas de validation d'unicité/chevauchement des saisons
`PUT /api/pools/:id/seasons` valide le format MM-DD mais **pas** les chevauchements de périodes. Deux saisons qui se recouvrent → `activeSeasonFor` prend la première trouvée, comportement non déterministe pour l'utilisateur.
**Gravité : faible/moyenne.**

### B6. Fuseau horaire / `new Date(done_date)`
Les calculs de retard utilisent `new Date(iso)` côté Worker (UTC) vs. dates saisies localement. Décalage possible d'un jour selon le fuseau. À surveiller (cas limite minuit).
**Gravité : faible.**

---

## 4. Axe C — Concept & fonctionnalités manquantes

Lecture « métier pisciniste » : qu'est-ce qui ferait vraiment gagner du temps / de l'argent ?

### C1. Historique des dosages réellement appliqués
Le diagnostic propose un dosage, mais on n'enregistre pas ce qui a **réellement** été versé. Tracer « j'ai mis X kg de chlore » permettrait : suivi conso produits, refacturation client, détection de surdosage chronique.
**Valeur : forte.**

### C2. Gestion de stock de produits
Lié à C1 : suivi des produits (chlore, pH-, anti-algues…), seuils de réappro, coût. Le pisciniste sait quand recommander.
**Valeur : forte** (mais ampleur importante).

### C3. Notifications / rappels
Aujourd'hui les alertes sont « pull » (il faut ouvrir l'app). Un digest (email via API tierce, ou au moins un badge persistant) des passages du jour + alertes critiques = vrai usage terrain.
**Valeur : forte.**

### C4. Signature client / preuve de passage
Le rapport de passage existe mais sans preuve. Une signature (canvas) ou validation client horodatée = valeur juridique/commerciale.
**Valeur : moyenne/forte.**

### C5. Facturation / devis légers
Le pisciniste facture. Même minimal (montant par passage, export récap mensuel par client), ça boucle la boucle métier.
**Valeur : forte** (mais hors périmètre Cloudflare si lourd → rester léger).

### C6. Tendances eau par piscine (graph历)
Chart.js est déjà chargé. Tracer l'évolution pH/chlore d'une piscine dans le temps = anticipation des problèmes (ex. pH qui dérive lentement).
**Valeur : forte, coût faible** (la data existe déjà).

### C7. Modèles d'entretien / check-lists réutilisables
La `routine` (JSON) existe par entretien. Des **templates** réutilisables (« entretien hebdo standard », « hivernage », « remise en service ») éviteraient de tout re-saisir.
**Valeur : moyenne.**

### C8. Hivernage / remise en service comme états de piscine
Métier très saisonnier. Un état « hivernée » (passages suspendus) éviterait les fausses alertes de retard et clarifierait l'agenda. Complète parfaitement les saisons.
**Valeur : forte** (cohérent avec le travail déjà fait sur les saisons).

### C9. Export PDF du rapport / compte-rendu
Le rapport est HTML/partage natif. Un export propre (impression stylée → PDF) pour archivage client.
**Valeur : moyenne, coût faible.**

### C10. Recherche / filtres globaux
Au-delà de ~30 piscines, retrouver un client/une piscine devient pénible. Barre de recherche + filtres (en retard, eau KO, par client).
**Valeur : moyenne.**

---

## 5. Stratégie (issue de l'analyse)

Principe directeur : **fiabiliser le modèle d'abord** (sinon on construit sur du sable), **puis** capitaliser sur la data déjà présente (coût faible / valeur forte), **puis** ouvrir de nouveaux chantiers métier.

### Vague 1 — Cohérence & fiabilité (dette + bugs cœur)
Priorité maximale, faible coût, fort impact sur la confiance dans l'outil.
- A1 : `signup`/`team` créent `member` (pas `pro`/`worker`).
- B1 / B3 : purge des libellés morts (`'admin'`, ternaires `isAdmin`).
- B2 / B4 : réconcilier cadence entretien ↔ saisons (l'alerte de retard doit utiliser la cadence saisonnière réelle ; le formulaire doit dire la vérité sur ce qui pilote la planif).
- A7 : middleware `requireMember` unique.

### Vague 2 — Valoriser la data existante (quick wins métier)
- C6 : graphiques de tendance eau par piscine (Chart.js déjà là).
- C8 : état « hivernage » de piscine (suspend alertes + agenda) — prolonge les saisons.
- A2 : optimiser `/api/alerts` (supprimer le N+1).

### Vague 3 — Nouveaux chantiers métier (plus lourds)
- C1 : historique des dosages appliqués.
- C3 : digest/rappels.
- C4 : signature/preuve de passage.
- C5 / C2 / C9 / C10 : backlog, à arbitrer avec Romain.

### Robustesse transverse (au fil de l'eau)
- A3 (gestion d'erreur), A4 (CORS), A5 (découpage), A6 (`data-*`), B5/B6 (validations/fuseaux).

---

## 6. Synthèse priorisée

| ID | Sujet | Type | Gravité/Valeur | Vague |
|----|-------|------|----------------|-------|
| A1 | signup/team créent ancien rôle | Bug | 🔴 Haute | 1 |
| B2/B4 | cadence entretien vs saisons | Bug | 🟠 Moyenne | 1 |
| B1/B3 | libellés morts `admin`/`isAdmin` | Bug | 🟡 Faible | 1 |
| A7 | middleware `requireMember` | Code | 🟡 Faible | 1 |
| C6 | tendances eau (graph) | Feature | 🟢 Forte | 2 |
| C8 | hivernage piscine | Feature | 🟢 Forte | 2 |
| A2 | N+1 alertes | Code | 🟠 Moyenne | 2 |
| C1 | dosages appliqués | Feature | 🟢 Forte | 3 |
| C3 | rappels/digest | Feature | 🟢 Forte | 3 |
| C4 | signature passage | Feature | 🟢 Moy/Forte | 3 |
| A3/A4/A5/A6/B5/B6 | robustesse | Code | 🟡 Faible | continu |

**Conclusion Analyse #1 :** l'outil est fonctionnel et déjà dense, mais la **fusion des rôles a laissé des incohérences** (A1, B1, B3) et la **superposition saisons/entretiens crée un conflit non résolu** (B2, B4) qui touche le cœur (alertes). La priorité stratégique est donc : *fiabiliser le modèle unifié + réconcilier saisons/cadence*, avant d'exploiter la data déjà collectée (graphes, hivernage) puis d'ouvrir les chantiers métier lourds.
