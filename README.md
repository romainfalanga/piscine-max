# 💧 Piscine Max

Plateforme SaaS multi-pisciniste de gestion d'entretien de piscines : un pisciniste gère ses clients et piscines, délègue à des intervenants, et offre à ses clients un espace de suivi en lecture seule (historique, relevés, photos, conseils).

## 🎯 Présentation
- **Nom** : Piscine Max
- **But** : Une plateforme où **n'importe quel pisciniste** peut s'inscrire, gérer ses clients/piscines, faire ses entretiens lui-même **ou les déléguer** à des intervenants, et donner à ses clients un accès pour suivre l'entretien de leurs piscines (passages, produits ajoutés, notes, photos, routine à respecter).
- **Stack** : Hono + TypeScript + Cloudflare Pages + D1 (SQLite) + R2 (photos) + TailwindCSS + Leaflet/OpenStreetMap + Chart.js + Open-Meteo (météo)

## 👥 Les 3 rôles
- **Pisciniste (`pro`)** — accès complet à **ses propres données** (isolées des autres piscinistes). Il peut :
  - faire ses entretiens lui-même **et/ou** les déléguer à des intervenants ;
  - voir **« mes intervenants »** (ceux qui bossent pour lui) ;
  - créer/rattacher des intervenants, réinitialiser leur mot de passe ;
  - créer des **accès espace client** (mot de passe généré automatiquement).
- **Intervenant (`worker`)** — ne voit que les entretiens/piscines qui lui sont attribués. Un intervenant peut travailler pour **plusieurs piscinistes** à la fois, et voit **« pour qui je bosse »**. Un compte peut être **uniquement intervenant** (sans être pisciniste).
- **Client (`client`)** — accès **en lecture seule** à un espace dédié : il voit ses piscines, l'historique complet des passages, les relevés d'eau, les produits ajoutés, les notes, les **photos**, et les **conseils/routine** transmis par son pisciniste.

> 🔑 Un même compte pisciniste peut être **à la fois auto-entrepreneur (fait ses entretiens)** ET **avoir des intervenants**. La distinction « mes intervenants » / « pour qui je bosse » est affichée explicitement dans l'onglet **Équipe**.

## 🏢 Multi-tenant (isolation des données)
Chaque client/piscine appartient à un pisciniste (`owner_id`). Un utilisateur ne voit que les données des piscinistes auxquels il est rattaché (`visibleProIds`) :
- un **pro** voit ses propres données + celles des pros pour qui il est aussi intervenant ;
- un **worker** voit les données des pros pour qui il bosse ;
- un **client** ne voit que ses propres piscines.

Résultat : deux piscinistes inscrits sur la plateforme ne voient **jamais** les données l'un de l'autre.

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
| Rôle | Email | Détail |
|------|-------|--------|
| Pisciniste #1 | `franck@piscine-max.fr` | Piscine Max — a Romain comme intervenant, plusieurs clients/piscines |
| Intervenant | `romain@piscine-max.fr` | Bosse **pour Franck ET pour Sophie** (multi-employeurs) |
| Pisciniste #2 | `sophie@aquazur.fr` | AquaZur — données **isolées** de Franck, a Léo + Romain en intervenants |
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
| GET | `/api/weather?lat=&lng=` | pro/worker | Météo + conseils saisonniers (Open-Meteo) |

## 🗄️ Modèle de données (Cloudflare D1 / SQLite + R2)
- **users** : `pro` / `worker` / `client` + `phone`, `company`, `created_by`, couleur
- **pro_workers** : table N-N pisciniste ↔ intervenant (un worker peut bosser pour plusieurs pros)
- **clients** : clients d'un pisciniste (`owner_id`, `client_user_id` = compte client lié)
- **pools** : piscines (liées à un client) + GPS + caractéristiques + routine (JSON) + `routine_client` (conseils transmis au client) + `owner_id` + **seuils idéaux étendus** (sel, TAC, stabilisant min/max) + `depth_avg_m` (profondeur moyenne) + `expected_interval_days` (fréquence attendue → alertes de retard)
- **maintenances** : entretiens récurrents/ponctuels, attribués à un user
- **maintenance_logs** : passages effectués + relevés d'eau + produits
- **photos** (R2) : métadonnées en D1 (`r2_key`, `pool_id`, `log_id`, `uploaded_by`, `caption`) + fichier binaire sur le bucket R2 `piscine-max-photos` (binding `PHOTOS`)

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
npm run db:migrate:local   # schéma local (migrations 0001 → 0004)
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
- **Dernière mise à jour** : 2026-06-27 — sécurité multi-tenant durcie + diagnostic eau/dosage + centre d'alertes + rapport de passage + stats business + mode tournée + météo (Open-Meteo)
