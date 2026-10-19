# Vérifications du parcours client, 19 octobre 2026

- 29 tests API/métier réussis : identité privée, modification de l’identifiant, confirmation du mot de passe, migration des comptes sans email, refus d’activation professionnelle, besoins réservés au principal, suivi autonome et publication des entretiens.
- Vérification TypeScript et compilation réussies.
- Parcours navigateur réussi sans erreur JavaScript et sans débordement horizontal mobile. Les scénarios couvrent des inscriptions distinctes client/pro, le compte client simplifié, les quatre onglets client, le bouton d’ajout du pisciniste dans l’en-tête, la modification dans Le bassin, les anciennes URL de préparation et le partage du compte rendu.
- Le workflow Cloudflare applique la migration additive 0005 et contrôle les identités et les rôles en plus des contrôles existants. Son résultat distant est vérifié après déploiement.

---

# Vérifications du 17 octobre 2026

- 26 tests API et calculs, dont trois nouveaux parcours : adresse privée et remise à zéro des anciennes coordonnées ; checklist selon équipements, validation et conservation de l’historique ; restriction des nouvelles analyses à pH/chlore sans effacer l’ancien suivi.
- Les fixtures existantes de passage effectuent désormais les tâches avant publication. La migration d’anciens accès est testée sur un schéma historique réel puis amenée au schéma courant.
- Le navigateur couvre la création avec autocomplétion, l’absence de volume/traitement au départ, la modification des équipements, le brouillon d’entretien privé, sa reprise et le détail publié côté client. Contrôle sur ordinateur et mobile, absence de débordement et d’erreur JavaScript.
- Le service IGN a aussi été interrogé réellement sur une adresse publique et a renvoyé ses coordonnées. Les tests locaux utilisent une réponse fixe pour rester reproductibles. Le workflow de recette vérifie les API sur Cloudflare après déploiement.

## Historique : vérifications du 15 octobre 2026 — Peace in Blue App

- 23 tests de calculs et d’API réussis : formules et unités des 16 outils, entrées incohérentes, droits, révocation, comptes rendus, création client/pro, demande professionnelle et invitation client, reprise d’un dossier existant sans perte d’historique, principal unique, invitations concurrentes, migration des anciens accès temporaires, suppression des routes communautaires/IA, progression des guides privée et sauvegardes concurrentes, révision courte/par thème et historique privé.
- TypeScript et build Vite réussis. Les migrations 0001, 0002 et 0003 sont appliquées dans chaque base de test.
- Parcours Chromium réussi sur bureau 1440 px et mobile 390 px : création client, analyse, courbes, approvisionnement, activation pro, quatre onglets et arrivée Agenda, invitation, visite publiée, carte/clients, calculateurs volume/sel, catégories de fiches, changement de type de filtre, sauvegarde/rechargement de progression, quiz corrigé et statistiques. Les nouveaux parcours vérifient la récupération mobile d’une piscine créée par le professionnel, la demande de rattachement à un dossier existant et l’invitation émise par le client. Aucun échec JavaScript. Captures contrôlées pour le hub, le calculateur et les guides ; navigation mobile vérifiée.
- Le workflow de recette contrôle désormais aussi sur D1 réel la migration de progression, son isolation, le rejet d’une révision obsolète et la révocation, ainsi que le renommage et l’absence des endpoints supprimés. Il contrôle aussi la demande professionnelle, la récupération d’une piscine préparée et le refus des accès temporaires.

Ces contrôles ne constituent pas un test de montée en charge. Les conditions d’ouverture publique restent décrites dans `DEPLOIEMENT.md`.

---

## Historique : vérifications du 8 octobre 2026

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

## Vérifications réelles sur Cloudflare

Le 8 octobre, le workflow [Cloudflare preview](https://github.com/romainfalanga/piscine-max/actions/runs/37774033970) a terminé avec succès : provisioning D1/R2/Pages, schéma, build et déploiement. Les neuf premiers groupes de contrôles distants passent : santé du Worker, refus anonyme, inscription client/pro et code de récupération, isolation des piscines, invitation/acceptation, confidentialité des brouillons et photos, publication, révocation avec historique conservé pour le client, refus des écritures d'une autre origine. Les comptes et photos synthétiques ont été nettoyés avec succès.

Les tests GitHub `Platform checks` ont également terminé avec succès sur le premier commit livré. Cette validation confirme le fonctionnement du runtime réel pour les parcours testés ; elle ne remplace pas une épreuve de charge, un audit de sécurité ou un test de restauration.
