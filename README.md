# Peace in Blue

Plateforme de suivi partagé entre propriétaires de piscines et piscinistes. Refonte de `piscine-max`, gratuite pour tous les utilisateurs à ce stade.

**État : version de développement testée localement, pas encore ouverte au public.** La création de la base Cloudflare de préproduction a été refusée par le connecteur (`10000: Authentication error`). Les identifiants de `wrangler.jsonc` sont volontairement locaux ; le build Cloudflare est bloqué tant que les environnements réels ne sont pas isolés.

## Parcours disponibles

- Inscription autonome client ou pisciniste, identifiant/mot de passe et code de récupération sans email. Un professionnel peut aussi gérer sa piscine personnelle.
- Piscines créées par leur propriétaire, copropriétaires invités, un responsable des accès et un seul pisciniste principal. Acceptation explicite des invitations, droits temporaires et révocation.
- Journal commun, analyses autonomes, courbes, comptes rendus avec photos privées, brouillons puis « Terminer et partager ». Corrections traçables, notes professionnelles séparées, export du carnet.
- Planning individuel, récurrences, saisons, exceptions, passages réalisés et préparation des produits/matériels. Achat client ou approvisionnement pro, avec notifications distinctes dans la plateforme.
- Demandes d'entraide, dépannage, renfort, remplacement et transmission de suivi. Secteur communal approximatif, aucune adresse privée transmise au fil. Le client voit ses demandes ; les échanges entre pros restent réservés aux pros.
- Proposition d'intervention, accord du demandeur puis autorisation du responsable de la piscine. Accès ponctuel borné ou remplacement du professionnel principal.
- Procédures personnelles, quiz existant, calcul de volume, météo et assistant textuel optionnel. Aucun abonnement ni paiement.

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

API Hono dans `src/platform/`, entrée et protections HTTP dans `src/index.tsx`. Frontend en modules JavaScript natifs dans `public/platform/`, sans CDN de code tiers. Nouveau schéma dans `schema/0001_platform.sql`, tests de droits et métier dans `tests/platform.test.ts`. Base de questions conservée dans `src/quiz-data.ts`.

Le build n'exécute aucune migration et ne réinitialise aucune base. Ne pas appliquer ce nouveau schéma à la base historique : utiliser les nouvelles bases dédiées décrites dans le guide de déploiement.
