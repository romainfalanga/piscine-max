# Interface de référence : Piscine Max

La demande de Romain est de faire évoluer Piscine Max, en conservant son interface, et non de concevoir une autre application. La référence visuelle est `main` au commit `54d939ae` : connexion centrée sur fond cyan, en-tête blanc, navigation horizontale, cinq onglets et navigation mobile en bas.

La branche de travail conserve les comptes clients/pros, les piscines partagées et les autorisations de la plateforme. L'interface doit utiliser ces fonctions sans remplacer les habitudes de navigation :

- **Accueil** : activité du jour, raccourcis, préparation des produits et entraide.
- **Agenda** : vue jour par défaut, périodes semaine/mois, passages et récurrences.
- **Carte** : piscines auxquelles le professionnel a un accès actif, regroupées par commune, accès à un itinéraire à la demande. Les coordonnées de commune ne sont pas des coordonnées exactes du bassin.
- **Clients** : propriétaires des piscines partagées, recherche par client/piscine/commune. Le professionnel ne crée pas de compte client. Une piscine détenue en commun apparaît chez chacun de ses propriétaires, avec un dossier unique.
- **Pisciniste** : bibliothèque existante, catégories, fiches personnelles, quiz et outils.

L'espace client utilise les mêmes couleurs, composants et principes de navigation, avec ses propres rubriques. L'entraide professionnelle reste protégée côté serveur. Les statistiques et le répertoire excluent les accès expirés ou révoqués.

## Réalisation

`public/platform/classic.css` reprend les principes de l'interface d'origine ; `app.js` fournit son en-tête et sa navigation. `classic.js` ajoute les vues clients, carte et statistiques aux modules existants. Leaflet 1.9.4 est distribué localement avec sa licence : aucun script tiers ni CDN de scripts n'est requis. Les tuiles OpenStreetMap conservent leur attribution et envoient le référent d'origine ; pas de préchargement ni téléchargement hors ligne. Pour un lancement à grande échelle, choisir un fournisseur de tuiles avec un niveau de service approprié (https://operations.osmfoundation.org/policies/tiles/).

## Périmètre et déploiement

La correction est publiée sur le déploiement de travail existant `peaceinblue-recette.pages.dev`, dans le même dépôt `romainfalanga/piscine-max`, PR 15. Aucun troisième projet ni nouveau déploiement indépendant n'est créé. La base historique de `piscine-max.pages.dev` reste intacte. La bascule finale vers cette adresse doit suivre `DEPLOIEMENT.md`, car le schéma de comptes et de permissions a changé.

Cette correction ne prétend pas avoir rétabli tous les outils historiques : optimisation des tournées, assistant multimodal et calculateurs de dosage/filtration restent à porter. Ne pas les supprimer du suivi de parité ni les présenter comme terminés.

## Vérification

Les tests API couvrent notamment l'annuaire des copropriétaires, la recherche, les agrégats privés, les brouillons et la révocation. Le parcours navigateur teste l'inscription client, les analyses, le suivi partagé, l'ajout d'un passage depuis l'agenda, sa publication, les cinq onglets, la carte, les fiches, les statistiques et le mobile.
