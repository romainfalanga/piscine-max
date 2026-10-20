# Peace in Blue App

Application de suivi des piscines et d’organisation des entretiens Peace in Blue. Tous les particuliers peuvent utiliser gratuitement leur carnet, avec ou sans entretien régulier par Peace in Blue.

**État : préproduction déployée, pas encore ouverte au grand public.** [Tester la plateforme](https://peaceinblue-recette.pages.dev). Le jeton `CLOUDFLARE_API_TOKEN` ajouté dans GitHub Actions a permis de créer une base D1, un bucket R2 privé et un projet Pages distincts. Le workflow `Cloudflare preview` déploie cette branche dans ce projet de recette ; aucun secret n'est exporté. Le schéma et les parcours API sont vérifiés sur Cloudflare. La base et le site historiques restent en place.

Les identifiants locaux de `wrangler.jsonc` restent destinés au développement. Le workflow génère sa propre configuration de recette depuis les identifiants réels vérifiés. Le déploiement de production reste bloqué jusqu'à la recette complète et la préparation de ses ressources dédiées.

## Parcours disponibles

- Inscription client unique, email/mot de passe et code personnel de récupération. Un seul compte professionnel, réservé au compte existant de Romain et identifié en base, jamais attribué par inscription publique.
- Piscines créées par le client ou par son pisciniste, demandes d’entretien client avec portable ou proposition de Peace in Blue par email, avec accord du client et rattachement au dossier existant. Plusieurs copropriétaires possibles, un responsable des accès et un seul pisciniste principal. Aucun autre professionnel ne peut consulter le dossier.
- Journal commun, analyses autonomes par appréciations du pH et du chlore, historique daté (anciennes mesures chiffrées conservées), comptes rendus avec photos privées, brouillons puis « Terminer et partager ». Corrections traçables, notes professionnelles séparées et tableau de bord avec dernière photo d’entretien.
- Planning individuel, récurrences, saisons, exceptions, passages réalisés et préparation des produits/matériels. Achat client ou approvisionnement pro, avec notifications distinctes dans la plateforme.
- Navigation professionnelle : Agenda (arrivée directe), Carte, Clients, Pisciniste. Préparation et tableau de bord depuis l’Agenda. Le tableau de bord distingue comptes inscrits, propriétaires et clients suivis et permet de traiter les demandes d’entretien.
- Code du pisciniste : sessions courtes ou complètes, thèmes, correction et historique privé.
- 16 calculateurs avec unités explicites, entrées contrôlées et hypothèses affichées. Dosages à partir de la notice réelle, sans cible chimique imposée.
- Bibliothèque classée en Informations métier, Procédures et fiches personnelles. Huit procédures guidées dont l’entretien courant, variantes sable/verre et cartouche, progression personnelle sauvegardée.
- L’entraide et l’assistant IA sont retirés de l’interface et de l’API. Aucun abonnement ni paiement.

## Documents

- [Plan produit et décisions](docs/PLAN_PEACEINBLUE.md)
- [Architecture, permissions et limites](docs/ARCHITECTURE.md)
- [Mise en ligne, recette et retour arrière](docs/DEPLOIEMENT.md)
- [Vérifications effectuées](docs/VALIDATION.md)

Les anciens `AUDIT.md` et `PLAN.md` décrivent la version historique ; le plan courant est celui indiqué ci-dessus. L'historique Git conserve l'ancien code et les anciennes migrations.

## Développement

Node.js 24 ou plus récent, npm et Python 3 pour le benchmark facultatif.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run db:migrate:local
```

Créer `.dev.vars` avec un `SESSION_SECRET` aléatoire d'au moins 32 caractères (ne jamais le versionner), puis `npm run preview`. Ce secret protège les mots de passe en plus du sel individuel : sa perte empêcherait la vérification des mots de passe existants. Utiliser des secrets différents pour production et préproduction et les conserver dans un coffre.

Pour une démonstration locale éphémère sans compte Cloudflare : `npm run dev:fixture`. Données en mémoire, commune fictive de test fixée à Bandol, stockage photos éphémère. Ce serveur est **exclusivement un outil de recette**, pas un hébergement.

Tests navigateur : `npx playwright-core install chromium`, puis `BROWSER_PLAYWRIGHT=1 npm run test:browser`. `BROWSER_BINARY` permet de sélectionner un binaire Chromium local. Captures dans `.test-artifacts/`, hors Git. `npm run test:capacity` crée un jeu SQLite synthétique local, sans appeler Cloudflare.

## Organisation du code

API Hono dans `src/platform/`, entrée et protections HTTP dans `src/index.tsx`. Frontend en modules JavaScript natifs dans `public/platform/`, sans CDN de code tiers. Migrations ordonnées dans `schema/`, tests de droits et métier dans `tests/platform.test.ts`. Base de questions conservée dans `src/quiz-data.ts`, guides dans `src/maintenance-guides.ts`, calculs purs dans `public/platform/calculations.js`.

Le build n'exécute aucune migration et ne réinitialise aucune base. Ne pas appliquer ce nouveau schéma à la base historique : utiliser les nouvelles bases dédiées décrites dans le guide de déploiement.

## Parcours entretien

Création simple, adresses IGN et carte privée, analyses pH/chlore, checklist selon équipements et compte rendu client détaillé. Voir [le plan et les choix de conception](docs/EXPERIENCE-ENTRETIEN.md).

Le parcours propriétaire et les choix de simplification sont décrits dans [docs/PARCOURS-CLIENT.md](docs/PARCOURS-CLIENT.md).

Le fonctionnement réservé à Peace in Blue, les règles de confidentialité et la migration sont détaillés dans [docs/ACTIVITE-PEACEINBLUE.md](docs/ACTIVITE-PEACEINBLUE.md).
