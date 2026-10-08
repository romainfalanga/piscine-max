# Déploiement Cloudflare

## État constaté le 8 octobre 2026

Projet Pages `piscine-max`, déploiement GitHub depuis `main`, commande `npm run build`, sortie `dist`. Le site historique est servi sur `piscine-max.pages.dev`. Son environnement de preview utilisait la même base D1 et le même bucket R2 que la production ; il ne faut pas y appliquer la refonte.

Le connecteur Cloudflare avait refusé la création de la base avec l'erreur `10000: Authentication error`. **Ce blocage est résolu via GitHub Actions**, qui utilise le secret `CLOUDFLARE_API_TOKEN` ajouté par Romain, sans lire ni exporter sa valeur dans la conversation.

Préproduction effective :
- Projet Pages : `peaceinblue-recette`, https://peaceinblue-recette.pages.dev
- Base D1 : `peaceinblue-platform-preview`, ID `b7415569-af9c-49de-a692-0feb65730962` (juridiction UE)
- Bucket R2 privé : `peaceinblue-preview-photos`
- Secret d'authentification propre à la recette, généré dans le runner et enregistré chiffré dans Pages. Il est conservé lors des exécutions suivantes.
- [Exécution initiale réussie](https://github.com/romainfalanga/piscine-max/actions/runs/37774033970) : création, migration, déploiement, parcours API avec photos puis nettoyage des seuls comptes/fichiers synthétiques de cet essai.

Le workflow ne dispose d'aucune opération de mutation sur `piscine-max` et ses ressources. Son fichier de configuration temporaire vise uniquement `peaceinblue-recette` ; les environnements production/preview de ce **projet de recette dédié** pointent sur les mêmes ressources de test, distinctes du projet public existant. Aucune nouvelle base de production n'est créée par ce workflow et aucun changement de plan payant n'est demandé.

## Reproduction et prochaine bascule

Le workflow `.github/workflows/cloudflare-preview.yml` se déclenche sur les modifications de ses scripts dans la branche `codex/peaceinblue-platform`. Il conserve les comptes présents et le secret existant. `preview-resources.json` et `preview-validation.json` sont ses seuls artefacts ; ils ne contiennent aucun jeton ni mot de passe. Les données synthétiques sont nettoyées à la fin des tests.

Les étapes ci-dessous décrivent la séparation à maintenir pour préparer la production et terminer la recette :

1. Créer deux nouvelles bases D1 : `peaceinblue-platform-preview` et `peaceinblue-platform`. Créer deux buckets R2 privés distincts pour les photos. Ne pas activer de domaine public R2.
2. Remplacer les identifiants `local-*` et noms de buckets de `wrangler.jsonc` par ceux réellement retournés par Cloudflare. Vérifier que production et preview sont différentes et ne réutilisent pas les ressources historiques. Le script `deployment-preflight.mjs` arrête les builds Pages et les déploiements manuels si ces conditions minimales ne sont pas remplies.
3. Configurer des `SESSION_SECRET` différents (aléatoires, au moins 32 caractères), sauvegardés dans un coffre, dans Pages production/preview. Définir `ADMIN_USER_ID` après avoir créé et vérifié le compte de Romain ; aucun administrateur n'est désigné automatiquement.
4. `OPENROUTER_API_KEY` est facultatif ; sans clé, l'assistant affiche son indisponibilité sans bloquer les autres fonctions. Définir un modèle disponible via `OPENROUTER_MODEL` et un budget fournisseur. L'application limite l'assistant à 10 requêtes par utilisateur/jour et 100 globales/jour ; cela ne garantit pas un coût nul.
5. Appliquer `schema/0001_platform.sql` via `npm run db:migrate:preview` sur la base neuve, puis déployer la branche de recette. Contrôler les bindings réellement utilisés par le déploiement, les cookies HTTPS, une photo privée et les refus entre deux comptes.
6. Créer uniquement des comptes de recette, effectuer les parcours client/pro/second propriétaire/transfert/révocation, puis faire essayer à Romain sur téléphone. Ne pas envoyer de vrais clients vers cette préproduction.

Les builds n'exécutent aucune migration automatiquement. Le guard de build est une protection contre une configuration connue dangereuse, pas une vérification exhaustive des secrets ou des permissions Cloudflare.

## Gates avant ouverture publique

- [x] Parcours API initial du Worker réel, D1 et R2 sur préproduction distincte : inscription, invitation, brouillon, publication, photo privée, révocation, maintien de l’historique client et rejet CSRF. La recette métier complète reste nécessaire.
- [ ] Restauration testée : export D1 et copie/manifest des objets R2, vérification des rapports et médias restaurés dans un environnement isolé. Sauvegarder séparément le secret d'authentification.
- [ ] Charge mixte sur D1 réel (lectures, saisies, publications, invitations, connexions), p50/p95/p99, débit et erreurs. D'abord 10 puis 50 puis 100 utilisateurs virtuels ; interrompre si saturation. Objectif initial p95 des API courantes < 500 ms et erreurs serveur < 0,5 %, puis ajuster selon les mesures.
- [ ] Mesurer coût CPU du KDF d'authentification sur le plan Workers choisi ; revue de sécurité et essais de concurrence des changements de droits. La suite locale ne reproduit pas l'ordonnancement réseau D1/R2.
- [ ] Définir alertes de latence/erreurs, consommation D1/R2, budget d'hébergement et procédure d'incident ; ne pas journaliser mots de passe, codes de récupération, cookies ni contenu privé.
- [ ] Programmer quotidiennement `scripts/maintenance.sql` avec une tâche dédiée contrôlée. Pages n'exécute pas ce nettoyage tout seul. Définir aussi une politique de conservation des notifications, audits, comptes et médias orphelins.
- [ ] Finaliser identité de l'éditeur, documents d'information et parcours de suppression/export des données. L'export du carnet existe ; la suppression autonome du compte n'est pas encore exposée. Les paramètres techniques des bassins collectifs ne constituent pas une certification réglementaire.
- [ ] Faire évoluer les listes encore plafonnées si le pilote rencontre ces limites (voir architecture).

## Bascule et retour arrière

Après validation de la préproduction, appliquer le schéma sur la nouvelle base de production vide, vérifier secrets/bindings, fusionner la branche et contrôler le déploiement Pages. L'autorisation de repartir de zéro ne nécessite pas de détruire immédiatement l'ancienne base : la conserver isolée le temps de la recette facilite le retour arrière.

Avant la bascule, conserver l'identifiant du dernier déploiement valide et les anciennes références de bindings (sans secrets dans Git). Un retour arrière doit restaurer **ensemble** le code et les bindings correspondant à son schéma ; l'ancien code ne doit jamais être dirigé vers la nouvelle base. Toute donnée créée dans la nouvelle version pendant un essai doit être exportée avant un retour arrière.

`PeaceInBlue.app` n'a pas été relié et sa disponibilité/propriété n'est pas confirmée ici. Ajouter le domaine dans Pages et le DNS uniquement après validation du nom détenu. `PeaceInBlue.fr` reste le site vitrine et n'est pas modifié par cette branche.

## Gratuité

Aucun utilisateur n'est facturé et aucun abonnement n'est implémenté. Cela ne signifie pas que l'hébergement, le stockage, l'IA ou la montée en charge seront gratuits pour l'exploitant. Les dépenses et éventuels changements de plan fournisseur restent à décider sur des mesures réelles.

Le lot de parité décrit dans `PLAN_PEACEINBLUE.md` reste également nécessaire avant de remplacer définitivement l'outil métier existant. La branche est livrée en pull request brouillon pour cette raison et pour les gates d'infrastructure ci-dessus.
