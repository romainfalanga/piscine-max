# 💧 Piscine Max

Outil de gestion d'entretien de piscines pour pisciniste et intervenants délégués.

## 🎯 Présentation
- **Nom** : Piscine Max
- **But** : Permettre à un pisciniste (Franck) de gérer ses clients, leurs piscines et son agenda d'entretien, puis de **déléguer** des entretiens simples à un intervenant (Romain) qui retrouve toutes les infos nécessaires de façon intuitive.
- **Stack** : Hono + TypeScript + Cloudflare Pages + D1 (SQLite) + TailwindCSS + Leaflet/OpenStreetMap

## ✨ Fonctionnalités

### Implémentées ✅
- **Authentification** par email + mot de passe (sessions par cookie signé HMAC, 30 jours). Secret HMAC stocké en **variable d'environnement Cloudflare** (`SESSION_SECRET`).
- **Changement de mot de passe** depuis l'interface (icône clé dans le header)
- **2 rôles** :
  - `admin` (Franck, le pisciniste) : accès complet
  - `worker` (Romain, l'intervenant) : voit uniquement les piscines qui lui sont attribuées
- **Tableau de bord (Accueil)** : programme du jour, progression (X/Y faits), stats, aperçu des prochains jours
- **Gestion des clients** (admin) : créer / modifier / supprimer, un client = plusieurs piscines
- **Fiches piscines détaillées** : adresse géolocalisée, type, volume, forme, traitement, filtration, code d'accès, notes d'accès, **routine d'entretien** (checklist), **valeurs idéales d'eau** (pH/chlore), **piscine prioritaire**, notes
- **Géolocalisation automatique** des adresses via Nominatim (OpenStreetMap) — aucune clé API requise
- **Recherche** de piscines (nom, client, adresse, traitement)
- **Agenda** :
  - Entretiens **récurrents** : choix du jour de la semaine + fréquence (toutes les 1/2/3/4 semaines)
  - Entretiens **ponctuels** : date précise
  - Attribution d'un entretien à un intervenant
  - **Vue Jour** et **vue Semaine**
  - **Vue Agenda (liste)** et **vue Carte**
  - **Parcours optimisé** sur la carte (algo du plus proche voisin) + distance totale estimée
  - Statut visuel **Fait / Reporté** sur l'agenda
  - Filtre par intervenant (admin)
- **Relevés d'eau** : à chaque passage, saisie pH / chlore / sel / température / stabilisant / TAC + produits ajoutés + durée
- **Historique par piscine** avec **graphique d'évolution** (Chart.js) du pH et du chlore
- **Navigation GPS** : bouton "Y aller" qui ouvre Google/Apple Maps vers la piscine
- **Vue intervenant** : Romain ne voit que ses entretiens et ses piscines, avec checklist de routine interactive, code d'accès mis en avant, contact client cliquable, mini-carte, GPS

### À envisager plus tard 🔜
- Photos de piscines (upload via Cloudflare R2)
- Optimisation du parcours via vrai routage routier (pas seulement à vol d'oiseau)
- Notifications / rappels (email ou push)
- Alertes automatiques quand un relevé sort des valeurs idéales
- Export PDF des fiches piscines et des relevés
- Gestion de stock de produits

## 🔗 URLs & Accès
- **Production** : https://piscine-max.pages.dev ✅ EN LIGNE
- **Local (dev)** : http://localhost:3000
- **GitHub** : https://github.com/romainfalanga/piscine-max (déploiement auto à chaque push sur `main`)

### Comptes de démonstration
| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Pisciniste (admin) | `franck@piscine-max.fr` | `piscine` |
| Intervenant (worker) | `romain@piscine-max.fr` | `piscine` |

## 🛠️ API (endpoints principaux)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/login` | Connexion |
| POST | `/api/logout` | Déconnexion |
| GET | `/api/me` | Profil courant |
| GET | `/api/users` | Liste des intervenants |
| GET/POST | `/api/clients` | Lister / créer un client |
| GET/PUT/DELETE | `/api/clients/:id` | Détail / modifier / supprimer |
| GET/POST | `/api/pools` | Lister / créer une piscine (géocodage auto) |
| GET/PUT/DELETE | `/api/pools/:id` | Détail / modifier / supprimer |
| POST | `/api/geocode` | Géocoder une adresse |
| GET/POST | `/api/maintenances` | Lister / créer un entretien |
| PUT/DELETE | `/api/maintenances/:id` | Modifier / supprimer |
| POST | `/api/maintenances/:id/log` | Marquer un passage effectué (+ relevés d'eau) |
| GET | `/api/maintenances/:id/logs` | Historique des passages |
| DELETE | `/api/logs/:id` | Supprimer un passage enregistré |
| GET | `/api/logs?from=&to=` | Passages sur une plage de dates (statut visuel agenda) |
| GET | `/api/pools/:id/history` | Historique + relevés d'une piscine (graphique) |
| GET | `/api/dashboard` | Données du tableau de bord (Accueil) |
| POST | `/api/change-password` | Changer son mot de passe |

## 🗄️ Modèle de données (Cloudflare D1 / SQLite)
- **users** : utilisateurs (admin / worker), couleur d'affichage
- **clients** : clients du pisciniste
- **pools** : piscines (liées à un client) + coordonnées GPS + caractéristiques + routine (JSON)
- **maintenances** : entretiens récurrents (jour de semaine + intervalle) ou ponctuels, attribués à un user
- **maintenance_logs** : historique des passages effectués

## 📖 Guide rapide
1. Connecte-toi avec un compte (voir tableau ci-dessus).
2. **En tant que Franck** : crée tes clients (onglet *Clients*), ajoute leurs piscines avec toutes les infos, puis planifie les entretiens dans l'*Agenda* en les attribuant à toi ou à Romain.
3. Bascule l'agenda en **vue Carte** pour visualiser ton parcours de la journée ou de la semaine.
4. **En tant que Romain** : tu retrouves uniquement tes piscines et entretiens, avec toutes les infos (code d'accès, routine, contact) prêtes à l'emploi.

## 🚀 Développement local
```bash
npm install
npm run db:migrate:local   # créer le schéma local
npm run db:seed            # données de démo
npm run build
pm2 start ecosystem.config.cjs
# → http://localhost:3000
```

## ☁️ Déploiement
- **Plateforme** : Cloudflare Pages (relié au repo GitHub, build auto à chaque push sur `main`)
- **Statut** : 🟢 EN LIGNE — https://piscine-max.pages.dev
- **Base D1 prod** : `piscine-max-production` (id `d5b477c2-1899-481d-ab38-21b95ded5e10`), binding `DB` détecté automatiquement par Cloudflare Pages via `wrangler.jsonc`
- **Mettre à jour le site** : il suffit de `git push origin main` → Cloudflare redéploie tout seul
- **Migrations prod** : `npx wrangler d1 migrations apply piscine-max-production --remote`
- **Dernière mise à jour** : 2026-06-27
