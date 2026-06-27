# PLAN D'ACTION v2 — Piscine Max

> Plan d'action **v2** issu de l'Analyse #2 (relecture du code à la lumière de `AUDIT.md`).
> Date : 2026-06-27 · Commit de référence : `a946d90`
> Ce document est le contrat d'implémentation : il dit **quoi**, **pourquoi**, **comment** (techniquement) et **comment vérifier**.

---

## 0. Ce que l'Analyse #2 change par rapport à l'audit

La relecture ciblée du code a révélé des **opportunités et contraintes** qui réordonnent le plan :

| Découverte (Analyse #2) | Impact sur le plan |
|--------------------------|--------------------|
| `drawHistoryChart()` existe déjà (`views-logs.js:198`) et trace pH + chlore par piscine | **C6 passe de « gros chantier » à « enrichissement »** : coût divisé. On l'inclut en Vague 1. |
| `requirePro` gère déjà `member` proprement (alias) | **A7 quasi fait** : on se contente d'un renommage/commentaire, pas de refonte. |
| `pools` n'a aucune colonne d'état | **C8 (hivernage)** nécessite la migration `0006` (nouvelle colonne `winterized`). |
| `occurrencesForDate` (saisons) vit côté front, mais `/api/alerts` calcule le retard avec `expected_interval_days` global | **B4** demande de porter la cadence saisonnière côté backend (ou d'exposer la saison active). |
| Le formulaire d'entretien montre `weekday`/`interval_weeks` même quand des saisons existent | **B2** : rendre ces champs conditionnels + message explicite. |

**Nouvelles idées trouvées en Analyse #2 (non présentes dans l'audit) :**
- **N1 — Saison active visible** : afficher sur la fiche piscine quelle saison est active *aujourd'hui* et la prochaine échéance calculée. Réutilise `activeSeasonFor` + `occurrencesForDate` déjà écrits. Coût quasi nul, clarté énorme.
- **N2 — Bandeau « hiverné »** sur la piscine + exclusion automatique de l'agenda et des alertes (cohérent avec C8).
- **N3 — Zones idéales sur le graphe** : tracer les bandes min/max idéales (déjà en BDD : `ideal_ph_min/max`, etc.) en fond du graphe de tendance → lecture instantanée « dans/hors norme ».

---

## 1. Périmètre de CETTE implémentation

On implémente **la Vague 1 complète + les quick wins Vague 2 à coût faible**, en restant dans les contraintes Cloudflare Pages (pas de process serveur, pas de fs). Les chantiers lourds (facturation, stock, digest email, signature) restent **backlog documenté** (section 6) pour arbitrage avec Romain.

### Lot 1 — Fiabilité du modèle unifié (bugs cœur)
1. **A1** — `signup` (`index.tsx:154-158`) et `POST /team/workers` (`:250`) créent désormais `role: 'member'`. La session reflète `member`.
2. **B1** — `views-agenda.js:349` : supprimer la branche morte `'admin'`, afficher un libellé correct (propriétaire vs intervenant déterminé via la donnée réelle, sinon libellé neutre « Membre »).
3. **B3** — `app.js:385-386` : retirer les ternaires `isAdmin()` morts, libellés stables.
4. **A7** — renommer conceptuellement `requirePro` → garder l'alias mais documenter ; ajouter `requireMember` comme nom canonique (alias export) pour la lisibilité future. (Pas de refonte, zéro risque.)

### Lot 2 — Réconcilier saisons ↔ cadence (cœur métier)
5. **B2** — formulaire d'entretien : si la piscine a des saisons définies, masquer/désactiver `weekday`+`interval_weeks` et afficher un message « La fréquence est pilotée par les saisons de cette piscine » + lien vers l'éditeur de saisons. Sinon, comportement actuel.
6. **B4** — `/api/alerts` : le retard de passage doit utiliser la **cadence de la saison active** quand la piscine en a, au lieu de `expected_interval_days` global. Implémentation : charger les saisons des piscines du périmètre, calculer l'intervalle effectif du jour (port léger de `activeSeasonFor`/`occurrencesForDate` côté backend dans `src/seasons.ts`), et baser le retard dessus.
7. **A2** — au passage, supprimer le N+1 de `/api/alerts` : remplacer la boucle « dernier relevé par piscine » par **une seule requête** agrégée (dernier log par piscine via fenêtre/`GROUP BY`).

### Lot 3 — Quick wins valeur (data déjà présente)
8. **C6 + N3** — enrichir `drawHistoryChart` : ajouter sel/TAC/stabilisant en option + bandes de zones idéales (annotation simple via datasets de fond) ; rendre le graphe accessible aussi depuis la fiche piscine.
9. **C8 + N2** — **hivernage** : migration `0006` ajoute `pools.winterized INTEGER DEFAULT 0` (+ `winterized_at`). Route `POST /api/pools/:id/winterize` (toggle, member only, périmètre). Effets : piscine hivernée → exclue des alertes de retard + signalée dans l'agenda + bandeau sur la fiche.
10. **N1** — fiche piscine : encart « Saison active aujourd'hui : <label> · prochaine échéance : <date> ».

### Lot 4 — Robustesse transverse (faible coût, fait au passage)
11. **A3** — remplacer les `catch {}` muets les plus critiques par un toast explicite + `console.warn`. (Pas les 21 d'un coup : cibler alerts, stats, history, seasons.)
12. **B5** — `PUT /api/pools/:id/seasons` : refuser les chevauchements de périodes (validation backend) avec message clair.

---

## 2. Détail technique par tâche

### A1 — Rôle `member` à la création
- `src/index.tsx` ligne 154 : `.bind(..., 'pro', ...)` → `'member'`.
- ligne 156 : `createSession({ ..., role: 'pro', ... })` → `'member'`.
- ligne 158 : `role: 'pro'` dans la réponse JSON → `'member'`.
- ligne 250 (`/team/workers`) : `.bind(..., 'worker', ...)` → `'member'`.
- **Vérif** : `curl POST /api/signup` → réponse `role:"member"` ; nouvel intervenant créé → `SELECT role FROM users` = `member`.

### B1 — Libellé agenda
- `views-agenda.js:349` : remplacer `u.role === 'admin' ? 'Pisciniste' : 'Intervenant'` par une logique basée sur la donnée réelle (le membre est-il propriétaire de la piscine de l'entretien ?) ou, si non disponible dans ce contexte, libellé neutre.
- **Vérif** : ouvrir un entretien → libellé cohérent, plus jamais « admin ».

### B3 — Libellés accueil
- `app.js:385-386` : retirer ternaires `isAdmin()`, garder « Piscines » / « Clients » (vue membre unique).
- **Vérif** : accueil membre → libellés stables.

### A7 — `requireMember`
- `src/index.tsx` : ajouter `const requireMember = requirePro` (ou renommer + alias) + commentaire. Aucune route changée fonctionnellement.

### B2 — Formulaire entretien conditionnel
- `views-agenda.js` `openMaintenanceForm` (~366-388) : connaître si la piscine a des saisons (déjà dans `state.pools[].seasons` via l'API). Si `seasons.length > 0` → cacher bloc fréquence + afficher note.
- **Vérif** : piscine avec saisons → champs fréquence cachés + message ; piscine sans saison → champs visibles.

### B4 + A2 — Alertes saison-aware + sans N+1
- Créer `src/seasons.ts` : `effectiveIntervalForDate(seasons, date, fallbackDays)` (port minimal de la logique front : trouver la saison active à `date`, renvoyer son `interval_days`, sinon `fallbackDays`).
- `/api/alerts` :
  - 1 requête piscines (déjà le cas) **+ charger les saisons** des piscines du périmètre en une requête (`WHERE pool_id IN (...)`).
  - Remplacer la boucle « dernier log » par **une requête unique** : dernier log par `pool_id` (sous-requête `MAX(done_date)` ou `ROW_NUMBER`-like via `GROUP BY`).
  - Retard = jours depuis dernier passage vs `effectiveIntervalForDate(...)`.
  - Si piscine `winterized` → on **n'émet pas** d'alerte de retard.
- **Vérif** : piscine en hiver (cadence espacée) ne déclenche plus de faux retard ; nombre de requêtes D1 constant quel que soit le nombre de piscines.

### C6 + N3 — Graphe enrichi
- `views-logs.js drawHistoryChart` : ajouter datasets sel/TAC/stabilisant (axe secondaire) + bandes idéales (datasets `fill` translucides entre min/max).
- Exposer le graphe sur la fiche piscine (`views-pools.js renderPoolDetail`) via le même historique déjà chargé.
- **Vérif** : graphe affiche les params disponibles + zones idéales lisibles.

### C8 + N2 — Hivernage
- `migrations/0006_winterize.sql` : `ALTER TABLE pools ADD COLUMN winterized INTEGER DEFAULT 0;` + `ALTER TABLE pools ADD COLUMN winterized_at DATETIME;`
- Backend : `POST /api/pools/:id/winterize` (member, périmètre) → toggle `winterized`, set/clear `winterized_at`.
- Effets : exclusion des alertes de retard (B4) + agenda affiche « hivernée » + fiche affiche bandeau + bouton toggle.
- **Vérif** : hiverner une piscine → disparaît des retards + bandeau visible ; déshiverner → revient.

### N1 — Saison active sur la fiche
- `views-pools.js renderPoolDetail` : calculer (front) la saison active du jour + prochaine occurrence et l'afficher dans l'encart saisons existant (`seasonsSummaryHtml`).
- **Vérif** : la fiche montre « Saison active : Haute saison · prochain passage : 02/07 ».

### A3 — Catch explicites (ciblés)
- `views-extra.js` (alerts/stats), `views-logs.js` (history), `views-pools.js` (seasons) : `catch (e) { console.warn(e); toast('...', 'error') }`.

### B5 — Validation chevauchement saisons
- `PUT /api/pools/:id/seasons` : après parse, vérifier qu'aucune paire de périodes ne se chevauche (en tenant compte du wrap d'année). Si chevauchement → 400 message clair.
- **Vérif** : envoyer 2 saisons qui se recouvrent → 400.

---

## 3. Ordre d'exécution (pour limiter le risque)

1. **DB d'abord** : migration `0006` (local) → build OK.
2. **Backend** : A1, A7, B4+A2 (+ `src/seasons.ts`), hivernage route, B5.
3. **Front** : B1, B3, B2, C6+N3, C8+N2 (bandeau/bouton), N1, A3.
4. **Seed** : ajouter une piscine hivernée + des relevés variés pour tester graphes/alertes.
5. **Build + tests locaux** (curl + unitaire occurrences/intervalle + JS `node -c`).
6. **Déploiement** : migration `0006` remote + seed + `wrangler pages deploy` + vérif prod.
7. **Git** : commit + push `main`. **Backup**. **README** mis à jour. Rapport à Romain.

---

## 4. Critères de validation (Definition of Done)

- [ ] `signup` et `team/workers` créent `member` (vérif SQL).
- [ ] Plus aucune référence morte à `'admin'`/`isAdmin` côté libellés.
- [ ] Formulaire entretien : fréquence masquée si saisons présentes.
- [ ] `/api/alerts` : retard basé sur la saison active + piscines hivernées exclues + nombre de requêtes constant.
- [ ] Graphe de tendance enrichi (params + zones idéales) accessible depuis fiche piscine et historique.
- [ ] Hivernage : toggle fonctionnel + effets sur agenda/alertes/fiche.
- [ ] Fiche piscine : saison active + prochaine échéance affichées.
- [ ] Chevauchement de saisons refusé (400).
- [ ] Build OK, JS `node -c` OK, isolation multi-tenant toujours respectée (Sophie 403/404 sur données de Franck).
- [ ] Déployé en prod + vérifié + commit/push + backup + README à jour.

---

## 5. Risques & garde-fous

- **Régression isolation multi-tenant** : toute nouvelle route (winterize) passe par les helpers `canAccessPool`/`poolInScope` existants. Test Sophie/Franck obligatoire avant push.
- **Migration sur prod** : `0006` est additive (ALTER ADD COLUMN avec DEFAULT) → non destructive, rejouable.
- **Port de logique saison front→back** : risque de divergence. Mitigation : `src/seasons.ts` testé par un mini script unitaire reproduisant les cas connus (juillet=11, janvier=1, mai=0, décembre=2).
- **Graphe surchargé** : limiter les datasets affichés par défaut (pH+chlore), les autres en option, pour ne pas alourdir.

---

## 6. Backlog (chantiers lourds — à arbitrer avec Romain, hors de cette implémentation)

| ID | Sujet | Pourquoi reporté |
|----|-------|------------------|
| C1 | Historique des dosages réellement appliqués | Nouveau modèle de données + UI saisie ; mérite cadrage. |
| C2 | Gestion de stock produits | Ampleur (catalogue, seuils, coûts). |
| C3 | Rappels / digest | Nécessite API tierce (email) + token → décision Romain. |
| C4 | Signature / preuve de passage | UI canvas + valeur juridique à cadrer. |
| C5 | Facturation / devis | Risque de sortir du périmètre « léger ». |
| C7 | Templates d'entretien | Utile mais non bloquant. |
| C9 | Export PDF | Faisable (impression stylée) — petit lot futur. |
| C10 | Recherche / filtres globaux | À faire quand le volume de piscines le justifie. |

---

**Conclusion v2 :** ce plan **fiabilise d'abord le modèle unifié** (rôles, libellés), **résout le conflit saisons/cadence** au cœur des alertes (le vrai risque métier), **exploite la data déjà collectée** (graphes quasi gratuits) et **ajoute l'hivernage** qui prolonge naturellement le travail saisonnier — le tout sans sortir des contraintes Cloudflare. Les gros chantiers métier sont documentés en backlog pour décision.
