# Peace in Blue App — plan courant au 15 octobre 2026

Ce document remplace les orientations communautaires précédentes, conformément à la dernière demande de Romain. L’application évolue dans le dépôt et sur la branche existants ; le nom exact est **Peace in Blue App**.

## Objectif

Un outil quotidien pour l’organisation du pisciniste et un carnet partagé permettant au client de suivre ses piscines. Conserver l’interface cyan/slate et la navigation de l’application originale en la simplifiant.

## Décisions maintenues

- Inscription autonome des clients et des professionnels, gratuite à ce stade, sans emails de suivi ni facturation.
- Chacun crée son compte. La piscine peut être créée par le client ou par le pisciniste ; le rattachement est accepté par l’autre personne. Si le dossier existe, le pisciniste le rejoint. Plusieurs copropriétaires peuvent partager le même dossier ; un responsable client gère les autorisations.
- Un seul pisciniste principal par bassin, seul professionnel autorisé. Les anciens accès temporaires sont retirés en préservant les comptes rendus. Le professionnel n’accède plus au dossier après révocation.
- Analyses personnelles ou professionnelles, historique, courbes, photos privées, notes internes séparées, brouillons et publication explicite « Terminer et partager ».
- Agenda, récurrences, exceptions et besoins d’approvisionnement distinguant achat client et apport professionnel.

## Plan d’implémentation du présent lot

1. Renommer l’interface et ses métadonnées. Retirer l’Accueil professionnel et ouvrir directement l’Agenda. Quatre onglets : Agenda, Carte, Clients, Pisciniste. Déplacer les invitations, la préparation et l’accès aux statistiques vers l’Agenda.
2. Supprimer les écrans et endpoints communautaires et l’assistant IA. Rediriger les anciens liens d’interface, masquer les notifications anciennes associées. Conserver les tables inutilisées pour un retour arrière sans destruction.
3. Construire le hub Pisciniste avec trois entrées : Code du pisciniste, Outils de calcul, Bibliothèque métier.
4. Exposer les types et catégories des fiches existantes, conserver les fiches personnelles et remplacer les fiches courantes couvertes par les nouveaux guides par leur version guidée.
5. Ajouter 16 calculateurs : volume, dose notice, correction pH/TAC par palier fabricant, sel, masse de chlore disponible, chlore combiné, dilution, appoint, remplissage, renouvellement hydraulique, débit, vitesse de filtration, écart de pression, coût d’énergie, chauffage théorique, charge de tournée. Aucun dosage universel de produit ni durée automatique fondée sur la seule température.
6. Proposer des entraînements courts ou de 40 questions, par thème, avec correction, historique privé et reprise dans le même onglet.
7. Ajouter huit guides : entretien courant, sable/verre, préfiltre, cartouche, repérage des vannes, analyses, nettoyage, électrolyseur. L’entretien comporte préparation, inspection, niveau/appoint, analyses, nettoyage, filtration adaptée, équipements, traitement, restauration des automatismes, approvisionnement, photos et compte rendu.
8. Enregistrer la progression personnelle avec contrôle d’accès, validation des étapes et protection contre les sauvegardes concurrentes. La checklist de travail ne valide pas automatiquement une intervention.
9. Vérifier calculs, droits et parcours navigateur, puis déployer la même branche sur `peaceinblue-recette.pages.dev` via le workflow existant.

## Ajustement : association client–pisciniste

- Permettre la création professionnelle et l’invitation du premier client, y compris après la création.
- Ajouter une demande professionnelle sans exposition des piscines du client ; celui-ci choisit le dossier à confier.
- Réutiliser le dossier client existant lors de l’acceptation d’une fiche préparée vide. Préserver les suivis lorsqu’il existe déjà des données des deux côtés.
- Retirer les accès professionnels temporaires, les choix d’intervenants et les formulations au pluriel. Garder les copropriétaires et le transfert de responsabilité.
- Tester les parcours dans les deux sens, l’unicité du principal, les invitations concurrentes, la migration et la révocation, sur API puis navigateur et Cloudflare de recette.

## Principes des procédures

Les opérations de vanne, d’ouverture et d’amorçage sont liées à la notice et au montage réel. Aucun schéma universel de positions de vannes. Arrêt de pompe avant chaque changement de vanne multivoies ; prévention du redémarrage et dépressurisation avant ouverture ; retour en service contrôlé. Le filtre à cartouche utilise une procédure distincte. Le lavage sable/verre dépend du besoin constaté et du modèle, pas systématiquement du passage.

Références fabricant : [Hayward filtre à sable](https://cdn.hayward.fr/production/media/3/4/6/6/6b626c.pdf), [Pentair Maestro](https://www.pentairpooleurope.com/sites/default/files/2023-07/im-maestro-full-fr.pdf), [Pentair sécurité cartouche](https://www.pentair.com/en-us/pool-spa/education-support/homeowner-support/pool-filter-product-safety-help-center/clean-clear-rp-product-support.html), [BAYROL entretien du filtre](https://www.bayrol.fr/conseils/filtration-piscine-entretien-du-filtre), [Hanna analyse piscine](https://www.hannainstruments.fr/applications/photometre-piscine-alcalinite-acide-cyanurique-chlore-et-ph-en-mallette-avec-reactifs-hi971044r/), [Zodiac assistance](https://www.zodiac-poolcare.fr/assistance/assistance-en-ligne). Les guides contiennent les liens utiles à chaque procédure. Les autres fiches historiques ne sont pas présentées comme toutes nouvellement auditées.

## Suite et limites

L’optimisation automatique de tournée et un centre d’alertes avancé restent des évolutions possibles. L’assistant IA et l’entraide sont désormais hors périmètre par décision explicite, et non des fonctions en attente de restauration.

La préproduction ne démontre pas la capacité à accueillir des dizaines de milliers de connexions simultanées. Avant ouverture large : essais de charge sur Cloudflare réel, restauration testée, budget/observabilité, audit de sécurité, politique de conservation et suppression de compte, adaptation des listes encore plafonnées. Voir `DEPLOIEMENT.md`.
