# 💧 Piscine Max

Plateforme SaaS multi-pisciniste de gestion d'entretien de piscines : un pisciniste gère ses clients et piscines, délègue à des intervenants, et offre à ses clients un espace de suivi en lecture seule (historique, relevés, photos, conseils).

## 🎯 Présentation
- **Nom** : Piscine Max
- **But** : Une plateforme où **n'importe quel pisciniste** peut s'inscrire, gérer ses clients/piscines, faire ses entretiens lui-même **ou les déléguer** à des intervenants, et donner à ses clients un accès pour suivre l'entretien de leurs piscines (passages, produits ajoutés, notes, photos, routine à respecter).
- **Stack** : Hono + TypeScript + Cloudflare Pages + D1 (SQLite) + R2 (photos) + TailwindCSS + Leaflet/OpenStreetMap + Chart.js + Open-Meteo (météo)

## 👥 Les rôles (modèle unifié)
> ⚡ **Il n'existe qu'UN seul type de compte humain : le `member`.** Tout member peut à la fois **avoir ses propres clients/piscines** ET **être intervenant pour d'autres** — il n'y a aucune différence de nature entre « pisciniste » et « intervenant ». La distinction n'est qu'une **relation** (`pro_workers`), pas un statut figé sur le compte.

- **Member (`member`)** — compte humain complet. Il peut :
  - créer/gérer **ses propres clients et piscines** (données isolées des autres members) ;
  - faire ses entretiens lui-même **et/ou** les déléguer à des intervenants ;
  - **être lui-même intervenant** pour d'autres members (il voit alors les piscines qui lui sont assignées chez eux) ;
  - voir **« mes intervenants »** + **« pour qui je bosse »** dans l'onglet **Équipe** ;
  - créer des **accès espace client** (mot de passe généré automatiquement).
- **Client (`client`)** — accès **en lecture seule** à un espace dédié : il voit ses piscines, l'historique complet des passages, les relevés d'eau, les produits ajoutés, les notes, les **photos**, et les **conseils/routine** transmis.

> 🔑 Concrètement : ce que vous voyez en détail = **tout ce qui vous appartient** (vos clients/piscines) **+ tout ce qui vous est assigné** chez les members pour qui vous bossez. L'isolation des données repose sur le **périmètre** (`owner_id` / `pro_workers`), jamais sur le « grade » du compte.

## 🏢 Multi-tenant (isolation des données)
Chaque client/piscine appartient à un pisciniste (`owner_id`). Un utilisateur ne voit que les données des piscinistes auxquels il est rattaché (`visibleProIds`) :
- un **member** voit ses propres données (`owner_id` = lui) + les données des members pour qui il est intervenant (limitées à ce qui lui est assigné) ;
- un **client** ne voit que ses propres piscines.

Résultat : deux members inscrits sur la plateforme ne voient **jamais** les données privées l'un de l'autre.

## ✨ Fonctionnalités
### Implémentées ✅
- **Inscription pisciniste** (signup public) + **connexion** par email/mot de passe (sessions cookie signé HMAC, 30 jours, secret en variable d'env Cloudflare `SESSION_SECRET`)
- **Changement de mot de passe** depuis l'interface
- **Espace Équipe** :
  - liste de **mes intervenants** + **pour qui je bosse**
  - **créer** un intervenant (mot de passe généré) ou **rattacher** un intervenant existant par email
  - réinitialiser le mot de passe d'un membre, détacher un intervenant
- **Accès espace client** : depuis la fiche client, créer un accès (email + mot de passe **généré automatiquement** à transmettre), ou le révoquer
- **Espace client (lecture seule)** : ses piscines, **timeline** des passages, relevés d'eau (colorés selon les valeurs idéales), produits ajoutés, notes, **photos** (lightbox), **conseils/routine** transmis par le pisciniste
- **Tableau de bord** : programme du jour, progression, stats, prochains jours
- **Clients & piscines** : fiches détaillées (adresse géolocalisée, type, volume, forme, traitement, filtration, code d'accès, routine checklist, valeurs idéales pH/chlore, conseils client, priorité, notes)
- **Géolocalisation** automatique des adresses via Nominatim (OpenStreetMap)
- **Recherche** de piscines (nom, client, adresse, traitement)
- **Agenda** : entretiens récurrents (jour + fréquence) ou ponctuels, attribution à un intervenant, vues Jour/Semaine, vue Liste/Carte, **parcours optimisé** (plus proche voisin + distance), statut Fait/Reporté, filtre par intervenant
- **Relevés d'eau** à chaque passage (pH, chlore, sel, température, stabilisant, TAC + produits + durée) avec **alertes couleur en temps réel** quand une valeur sort des idéales
- **Historique par piscine** + **graphique** d'évolution pH/chlore (Chart.js)
- **Photos** : upload (≤ 5 Mo) stockées sur **Cloudflare R2**, rattachées à une piscine et/ou à un passage, visibles côté pisciniste et côté client
- **Navigation GPS** : bouton « Y aller » (Google/Apple Maps)
- **Vue intervenant** dédiée : uniquement ses entretiens/piscines, checklist routine, code d'accès, contact, mini-carte, GPS

### 🆕 Fonctionnalités avancées (dernière itération)
- **🔒 Durcissement sécurité multi-tenant** : 6 routes corrigées (suppression passages/logs/photos, lecture logs/photos, upload photo) vérifient désormais que la ressource appartient bien au périmètre de l'utilisateur (`poolInScope` / `canAccessPool`). Un pisciniste ne peut **jamais** accéder à une ressource d'un autre (403).
- **💧 Diagnostic eau intelligent + dosage** (`src/water.ts`) : à partir des relevés et du **volume réel** de la piscine, le moteur évalue chaque paramètre (pH, chlore, sel, TAC, stabilisant), donne un verdict (ok/à surveiller/urgent) **et calcule la dose de produit à ajouter** (ex. « Ajouter environ 3,8 L de pH- » ou « 340 g de chlore »). Diagnostic **en temps réel** pendant la saisie du passage (`liveDiagnose`).
- **🚨 Centre d'alertes** : sur le tableau de bord, agrège automatiquement les **piscines en alerte eau** (paramètres hors normes) et les **passages en retard** (au-delà de l'intervalle attendu), trié par gravité.
- **📄 Rapport de passage** : génération d'un rapport détaillé par passage (relevés + diagnostic + dosage + produits + notes), **imprimable (PDF via impression)** et **partageable** (lien). Accessible côté pisciniste **et** côté client (pour ses propres piscines).
- **📊 Statistiques business** (pisciniste) : nb de passages, temps total, top piscines, évolution mensuelle — graphique Chart.js.
- **🗺️ Mode Tournée** : parcours pas-à-pas de la journée pour l'intervenant mobile (une piscine après l'autre, checklist + GPS + saisie passage), basé sur le parcours optimisé.
- **🌤️ Météo + conseils saisonniers** : widget météo (Open-Meteo, sans clé API) géolocalisé sur la piscine, avec **conseils d'entretien adaptés** à la température et à la saison.

### 🆕 Dernière itération (procédures métier)
- **📚 Onglet Pisciniste (Important / Procédure / Information)** : centre de connaissances du métier. Trois onglets compacts dès l'arrivée sur la page :
  - **⭐ Important** : onglet par défaut — un sous-ensemble curaté des fiches (procédures **et** informations mélangées) jugées essentielles : bases de l'entretien courant (tournée type, tests pH/chlore, ajustement TAC/pH, préfiltre, skimmer, pression filtre), repérage des problèmes émergents (eau qui se trouble, pompe qui se désamorce, signaux d'alerte à surveiller à chaque passage) et fondamentaux du métier (valeurs idéales de l'eau, réglementation sécurité, stockage des produits, calculs de dosage, caisse à outils). Toute fiche peut être marquée « importante » depuis son formulaire de création/édition.
  - **Procédures** : modes opératoires pas à pas (tester pH/chlore au DPD ou au photomètre, tournée hebdomadaire type, changer un préfiltre, changer le sable du filtre, choc chlore, traiter une eau brune/tachée, entretenir un robot électrique/hydraulique, hivernage/remise en route, vidange réglementaire, carnet sanitaire, dépannage pompe, sécurité, repérage des signaux d'alerte...) — 41 fiches de démo.
  - **Informations** : connaissances de référence (valeurs idéales de l'eau, chimie du chlore/TAC/stabilisant, indice de Langelier, comparatif des méthodes de test et des filtrations, différences hors-sol/enterrée/débordement/naturelle, réglementation sécurité NF P90-306/307/308/309, norme électrique NF C15-100, réglementation piscines collectives ARS, stockage/incendie/premiers secours chlore, taches métalliques, formules de dosage, caisse à outils, glossaire...) — 38 fiches de démo.
  - Recherche plein texte + filtre par catégorie en scroll horizontal compact (propre à chaque onglet) + **regroupement automatique par catégorie** façon sommaire pour naviguer sans se perdre dans la masse + création/édition/suppression. Périmètre identique à clients/pools : visible par le pisciniste et ses intervenants, modifiable/supprimable par son auteur.

### 🆕 Itération précédente (cycles saisonniers + fusion des rôles)
- **🔗 Fusion des rôles pro/intervenant en `member`** : plus aucune différence figée. Tout compte humain peut gérer ses propres clients/piscines ET intervenir pour d'autres. Corrige le fait qu'un « intervenant » ne pouvait pas créer de clients. Le filtrage « je vois ce qui m'appartient + ce qui m'est assigné » remplace l'ancien filtre basé sur le grade.
- **🗓️ Cycles de passage saisonniers (par piscine)** : chaque piscine définit ses propres **saisons** (périodes de l'année par dates jour+mois répétables) avec **chacune sa fréquence**. Ex. Haute saison 1 juin→15 sept tous les 3 jours, Hivernage 1 nov→31 mars tous les 30 jours. L'agenda calcule automatiquement les passages selon la saison active à chaque date (gère les saisons à cheval sur l'année). Modèle type « été/hiver » fourni en 1 clic. Configuration : fiche piscine → « Cycle de passage saisonnier ».

### À envisager plus tard 🔜
- Optimisation du parcours via vrai routage routier (pas seulement à vol d'oiseau)
- Notifications / rappels (email ou push)
- Gestion de stock de produits
- Facturation / devis
- Notifications client par email

## 🔗 URLs & Accès
- **Production** : https://piscine-max.pages.dev ✅ EN LIGNE
- **Local (dev)** : http://localhost:3000
- **GitHub** : https://github.com/romainfalanga/piscine-max (déploiement auto à chaque push sur `main`)

### Comptes de démonstration (mot de passe : `piscine`)
| Compte | Email | Détail |
|--------|-------|--------|
| Member #1 | `franck@piscine-max.fr` | Piscine Max — plusieurs clients/piscines, a Romain comme intervenant. Pool 1 a un **cycle saisonnier** (été/hiver) |
| Member #2 | `romain@piscine-max.fr` | Intervenant **pour Franck ET pour Sophie**, mais peut aussi créer **ses propres** clients/piscines |
| Member #3 | `sophie@aquazur.fr` | AquaZur — données **isolées** de Franck, a Léo + Romain en intervenants |
| Client | `client1@piscine-max.fr` | Espace client en lecture seule (historique, relevés, photos, conseils) |

> Astuce démo : connecte-toi avec Franck puis Sophie pour voir l'isolation multi-tenant, puis avec Romain pour voir « pour qui je bosse », et enfin avec le client pour voir l'espace de suivi.

## 🛠️ API (endpoints principaux)
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/signup` | public | Inscription d'un pisciniste |
| POST | `/api/login` | public | Connexion |
| POST | `/api/logout` | tous | Déconnexion |
| GET/PUT | `/api/me` | tous | Profil courant / mise à jour |
| POST | `/api/change-password` | tous | Changer son mot de passe |
| GET | `/api/team` | pro/worker | Mes intervenants + pour qui je bosse |
| POST | `/api/team/workers` | pro | Créer ou rattacher un intervenant |
| DELETE | `/api/team/workers/:id` | pro | Détacher un intervenant |
| POST | `/api/team/reset-password/:id` | pro | Réinitialiser le mot de passe d'un membre |
| GET/POST | `/api/clients` | pro | Lister / créer un client (scoping owner) |
| GET/PUT/DELETE | `/api/clients/:id` | pro | Détail / modifier / supprimer |
| POST | `/api/clients/:id/account` | pro | Créer un accès espace client (mdp généré) |
| DELETE | `/api/clients/:id/account` | pro | Révoquer l'accès client |
| GET/POST | `/api/pools` | pro | Lister / créer une piscine (géocodage auto) |
| GET/PUT/DELETE | `/api/pools/:id` | pro | Détail / modifier / supprimer |
| POST | `/api/geocode` | pro | Géocoder une adresse |
| GET/POST | `/api/maintenances` | pro/worker | Lister / créer un entretien |
| PUT/DELETE | `/api/maintenances/:id` | pro | Modifier / supprimer |
| POST | `/api/maintenances/:id/log` | pro/worker | Marquer un passage (+ relevés d'eau) |
| GET | `/api/maintenances/:id/logs` | pro/worker | Historique des passages |
| GET | `/api/pools/:id/history` | pro/worker | Historique + relevés (graphique) |
| GET | `/api/logs?from=&to=` | pro/worker | Passages sur une plage de dates |
| GET | `/api/dashboard` | pro/worker | Données du tableau de bord |
| POST | `/api/photos` | pro/worker | Upload photo (multipart → R2, ≤ 5 Mo) |
| GET | `/api/photos/:id` | tous (scoped) | Servir une photo depuis R2 |
| GET | `/api/pools/:id/photos` | pro/worker | Photos d'une piscine |
| DELETE | `/api/photos/:id` | pro | Supprimer une photo |
| GET | `/api/my/pools` | client | Mes piscines (espace client) |
| GET | `/api/my/pools/:id/history` | client | Historique + relevés + photos |
| POST | `/api/diagnose` | pro/worker | Diagnostic eau + dosage (verdict par paramètre + dose à ajouter) |
| GET | `/api/alerts` | pro/worker | Centre d'alertes (piscines en alerte eau + passages en retard) |
| GET | `/api/logs/:id/report` | tous (scoped) | Rapport détaillé d'un passage (imprimable/partageable) |
| GET | `/api/stats` | pro | Statistiques business (passages, temps, top piscines, mensuel) |
| GET | `/api/weather?lat=&lng=` | member | Météo + conseils saisonniers (Open-Meteo) |
| GET | `/api/pools/:id/seasons` | member (scoped) | Saisons d'une piscine |
| PUT | `/api/pools/:id/seasons` | member (scoped) | Remplacer l'ensemble des saisons d'une piscine |
| GET | `/api/procedures?q=&category=&type=&important=1` | member | Lister / rechercher les fiches (procédure/information, importantes, périmètre) |
| GET | `/api/procedures/:id` | member (scoped) | Détail d'une procédure |
| POST | `/api/procedures` | member | Créer une procédure |
| PUT | `/api/procedures/:id` | member (auteur) | Modifier une procédure |
| DELETE | `/api/procedures/:id` | member (auteur) | Supprimer une procédure |

## 🗄️ Modèle de données (Cloudflare D1 / SQLite + R2)
- **users** : `pro` / `worker` / `client` + `phone`, `company`, `created_by`, couleur
- **pro_workers** : table N-N pisciniste ↔ intervenant (un worker peut bosser pour plusieurs pros)
- **clients** : clients d'un pisciniste (`owner_id`, `client_user_id` = compte client lié)
- **users** : `member` (compte humain : ex pro + ex worker fusionnés) ou `client` (lecture seule)
- **pools** : piscines (liées à un client) + GPS + caractéristiques + routine (JSON) + `routine_client` (conseils transmis au client) + `owner_id` + **seuils idéaux étendus** (sel, TAC, stabilisant min/max) + `depth_avg_m` (profondeur moyenne) + `expected_interval_days` (fréquence attendue → alertes de retard)
- **pool_seasons** : cycles saisonniers par piscine (`start_md`/`end_md` au format MM-DD, `interval_days`, `weekday` optionnel) — définit la fréquence de passage selon la période de l'année
- **maintenances** : entretiens récurrents/ponctuels, attribués à un user
- **maintenance_logs** : passages effectués + relevés d'eau + produits
- **photos** (R2) : métadonnées en D1 (`r2_key`, `pool_id`, `log_id`, `uploaded_by`, `caption`) + fichier binaire sur le bucket R2 `piscine-max-photos` (binding `PHOTOS`)
- **procedures** : bibliothèque de fiches pratiques métier (`owner_id`, `created_by`, `type` = `procedure`|`information`, `title`, `category`, `summary`, `content`, `tags`) — même périmètre que clients/pools

## 📖 Guide rapide
1. **Inscris-toi comme pisciniste** (ou connecte-toi avec un compte démo).
2. Crée tes **clients** et leurs **piscines** (toutes les infos : adresse, traitement, routine, valeurs idéales, conseils client…).
3. Dans **Agenda**, planifie les entretiens et attribue-les à toi ou à un **intervenant**.
4. Dans **Équipe**, crée/rattache tes intervenants et vois pour qui tu bosses.
5. Depuis une fiche client, crée un **accès espace client** : transmets l'email + le mot de passe généré.
6. À chaque passage, saisis les **relevés**, ajoute des **photos**, et ton client suit tout en lecture seule.

## 🚀 Développement local
```bash
npm install
npm run db:migrate:local   # schéma local (migrations 0001 → 0008)
npm run db:seed            # données de démo (ou: wrangler d1 execute piscine-max-production --local --file=./seed-demo.sql)
npm run build
pm2 start ecosystem.config.cjs
# → http://localhost:3000
```

## ☁️ Déploiement
- **Plateforme** : Cloudflare Pages (relié au repo GitHub, build auto à chaque push sur `main`)
- **Statut** : 🟢 EN LIGNE — https://piscine-max.pages.dev
- **Base D1 prod** : `piscine-max-production` (id `d5b477c2-1899-481d-ab38-21b95ded5e10`), binding `DB`
- **Bucket R2 prod** : `piscine-max-photos`, binding `PHOTOS`
- **Migrations prod** : `npx wrangler d1 migrations apply piscine-max-production --remote`
- **Déploiement direct** (garantit les bindings R2) : `npm run build && npx wrangler pages deploy dist --project-name piscine-max`
- **Dernière mise à jour** : 2026-07-03 — onglet **Pisciniste** : ajout de l'onglet **Important** (remplace la vue « Toutes ») qui réunit les 29 fiches jugées essentielles (bases de l'entretien, repérage des problèmes émergents, fondamentaux du métier), avec possibilité de marquer n'importe quelle fiche comme importante ; contenu métier très pratique (79 fiches de démo — analyse de l'eau sur le terrain, spécificités par type de bassin, réglementation collective/sécurité chlore...), quelques valeurs corrigées après recherche complémentaire (plage idéale du stabilisant et du TH) + refonte du design (filtres compacts, catégories en scroll horizontal, regroupement par catégorie) pour rester lisible malgré le volume + (itération précédente : distinction Procédure/Information, bibliothèque de procédures, fusion des rôles en `member`, cycles de passage saisonniers, sécurité durcie, diagnostic eau, alertes, rapport, stats, tournée, météo)
