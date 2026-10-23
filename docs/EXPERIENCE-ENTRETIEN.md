# Refonte du parcours piscine, 17 octobre 2026

## Audit et décisions

L’application utilise Hono sur Cloudflare Pages, D1 pour les comptes et les dossiers, R2 pour les photos et une interface JavaScript modulaire. L’audit a porté sur les routes de compte, les invitations et connexions, les piscines, les relevés, la publication, les photos, le planning, les guides et les ressources, ainsi que sur leurs parcours client/pro dans l’interface. Les comptes autonomes, la copropriété et le principal professionnel unique sont conservés.

Les problèmes du parcours étaient localisés : création trop chargée, écran vide qui proposait déjà une autre piscine, recherche limitée aux communes, liste générique d’entretien et absence de distinction nette entre tâche faite, non faite et non applicable. Les mesures secondaires encombraient la saisie.

## Plan appliqué

1. Afficher un vrai premier écran et une seule invitation à ajouter la première piscine. Supprimer le vocabulaire ambigu sur « son carnet ».
2. Demander le nom, le type d’usage et une adresse facultative à la création. Déplacer volume, traitement, filtre et équipements dans la fiche.
3. Rechercher les adresses françaises auprès de la Géoplateforme IGN, avec suggestions, clavier et repère Leaflet/OpenStreetMap. Enregistrer les coordonnées choisies dans le dossier privé. Conserver les anciennes coordonnées communales comme approximatives.
4. Donner à la fiche une hiérarchie claire : identité du bassin, dernières mesures, historique des entretiens, pisciniste, équipements et localisation. Conserver les quatre rubriques professionnelles.
5. Limiter les nouvelles analyses à pH et chlore, dans le formulaire et l’API. Conserver les valeurs historiques stockées et exportables.
6. Générer la checklist selon le traitement, le filtre et la présence de marches, skimmers et préfiltre. Ajouter les consignes particulières sans remplacer les tâches de base.
7. Enregistrer des brouillons privés, puis publier la checklist détaillée, les motifs, les mesures, les produits et les photos. Vérifier toutes les tâches avant publication, sans case « tout cocher ».
8. Tester le parcours du client au professionnel et retour, les équipements, l’adresse, les droits et le mobile avant le déploiement sur la recette existante.

## Direction visuelle

Le skill officiel `frontend-design` d’Anthropic a été examiné à la révision `dbd4588f9e1033efb41dad4bef2f7947c8993d44` et utilisé pour la conception. Choix adaptés à un outil de terrain :

- Encre bleu profond `#153d4c`, turquoise fonctionnel `#007d8c`, fond `#f3f7f8`, blanc `#ffffff`, eau claire `#e3f4f3`, texte secondaire `#58717b`.
- Manrope variable, auto-hébergée avec sa licence, pour les titres et le texte. Pas de dépendance à Google Fonts à l’exécution.
- Sur ordinateur : suivi central et colonne latérale de contexte. Sur mobile : une colonne, navigation conservée et actions tactiles lisibles.
- Un seul accent fort sur les dernières mesures. Pas de décoration animée, de promesse de qualité de l’eau calculée automatiquement ni de valeur inventée.
- Atelier d’entretien en deux colonnes sur ordinateur, checklist puis mesures sur mobile. Groupes numérotés car les gestes suivent réellement une séquence.
- Suppression des tirets cadratins dans les textes intégrés de l’application.

## Contrat du compte rendu

Les tâches sont générées par le serveur et photographiées dans chaque brouillon (snapshot). Les labels reçus du navigateur ne remplacent jamais les labels de référence. Une modification ultérieure des équipements ne réécrit pas un ancien compte rendu ni un brouillon existant. Les corrections conservent la checklist du relevé corrigé.

Chaque tâche est à faire, réalisée, ou non réalisée avec un motif. Les opérations non nécessaires ne sont jamais présentées comme effectuées. Le client voit le nombre réalisé et le détail. Une analyse déclarée réalisée nécessite le pH et le chlore. Un lavage réalisé exige le rinçage. La publication contrôle la révision du brouillon et l’autorisation active ; les photos et brouillons restent privés jusqu’au partage.

Le lavage du filtre sable/verre dépend du besoin constaté ; la cartouche suit son nettoyage propre. La checklist rappelle l’arrêt de pompe avant manipulation et l’isolation/dépressurisation avant ouverture. Elle ne remplace pas la notice de l’équipement. Les tâches de galets ne s’appliquent qu’au traitement chlore ; un système liquide peut être indiqué en non réalisé avec motif et sa consigne spécifique ajoutée au bassin.

## Géographie et données

La recherche envoie uniquement le texte d’adresse saisi à l’IGN, sans identité ni identifiant de dossier. Elle est limitée par compte et temporisée dans l’interface. Les réponses sont validées et les erreurs sont explicites. Un changement d’adresse libre efface les anciennes coordonnées pour éviter un repère trompeur.

Les cartes demandent les tuiles visibles à OpenStreetMap, avec attribution et Referer. Aucun téléchargement global ou cache hors ligne. Les itinéraires externes ne sont ouverts que par action de l’utilisateur. L’accès à la liste des piscines et à leurs adresses reste contrôlé par les membres du dossier.

Couverture de l’autocomplétion : France. Sans adresse, le dossier reste utilisable et pourra être complété. Les limites d’usage de l’IGN et d’OpenStreetMap doivent être réévaluées avant une ouverture massive ; aucun abonnement ni clé payante ajouté.

## Références consultées

- https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design
- https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/
- https://operations.osmfoundation.org/policies/tiles/
- https://www.bayrol.fr/conseils/filtration-piscine-entretien-du-filtre
