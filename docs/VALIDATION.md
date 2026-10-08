# Vérifications du 8 octobre 2026

## Résultats locaux

- 16 tests API/métier réussis avec le même routeur Hono et un adaptateur transactionnel SQLite pour D1 : séparation des comptes, copropriété, principal unique, invitations, brouillons, photos, révocation, récupération de compte, corrections, pagination, approvisionnement, récurrences, missions, secteur géographique et transfert de responsabilité.
- Vérification TypeScript et build Vite réussis.
- Schéma initial exécuté avec succès via D1 local/Wrangler. Le serveur Pages local ne démarre pas dans ce conteneur (restriction des interfaces réseau) ; le test navigateur utilise le même Hono dans un serveur Node local, pas le runtime Cloudflare déployé.
- Parcours Playwright réussi sur Chromium, bureau 1440 px et mobile 390 px : inscription et code de récupération, piscine, analyse publiée, courbes, besoin produit, accès, activation du profil pro, tableau de bord, entraide et réponse, lecture mobile du rapport. Aucune erreur JavaScript et aucun débordement horizontal global constatés. Six captures vérifiées, les principales conservées dans `docs/screenshots`.

## Jeu volumineux synthétique

50 000 utilisateurs, 30 000 piscines, 600 000 relevés et 30 000 récurrences, base SQLite locale d'environ 197 Mo. Voir `capacity-results.json` pour p50/p95/p99 et plans d'exécution. Les requêtes mesurées utilisent les indexes ; les cinq p95 locaux sont inférieurs à 1 ms sur cette machine.

**Ce benchmark n'est ni un test de charge Cloudflare ni une preuve de capacité en production.** Il n'exécute pas 50 000 connexions, ne mesure pas le réseau, les limites CPU Workers, la concurrence D1, l'upload R2 ni l'authentification sous charge. Les gates de préproduction sont détaillés dans `DEPLOIEMENT.md`.

## Reproduction

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright-core install chromium
BROWSER_PLAYWRIGHT=1 npm run test:browser
npm run test:capacity
```

Les captures et bases de tests sont générées dans `.test-artifacts/`, sans données réelles et exclues de Git. La CI relance typecheck, tests, build et parcours navigateur sur les pull requests. Son résultat distant doit être vérifié séparément : la présence du workflow ne prouve pas son exécution.
