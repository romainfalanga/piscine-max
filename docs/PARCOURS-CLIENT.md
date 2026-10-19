# Simplification du parcours client, 19 octobre 2026

## Audit et choix retenus

Le compte client permettait d’activer un profil professionnel ; son identifiant était figé. La fiche affichait la préparation des interventions et les mêmes formulaires au client et au pisciniste. L’email n’était ni demandé ni stocké.

Le client doit pouvoir tenir son suivi seul, puis confier la même piscine à un professionnel sans changer de dossier. La séparation s’appuie sur le rôle dans la piscine : un professionnel propriétaire de sa piscine personnelle y suit également le parcours propriétaire.

| Écran | Client | Pisciniste principal |
| --- | --- | --- |
| Mon compte | Prénom, nom, identifiant, email, mot de passe | Même identité, plus profil professionnel |
| Suivi | Analyses personnelles, courbes et comptes rendus publiés | Entretiens, analyses et comptes rendus |
| En-tête piscine | Ajouter une analyse, ajouter un pisciniste si responsable et aucun principal | Commencer l’entretien, modifier la piscine |
| Le bassin | Informations et bouton Modifier unique | Informations, routine et notes internes privées |
| À prévoir / Planning | Aucun onglet de préparation ; prochains passages en lecture seule dans Suivi si programmés | Préparation, approvisionnements et planification |
| Accès | Copropriétaires, invitation du principal et révocation selon responsabilité | Membres autorisés, invitation du premier client pour une fiche en attente |

Sans pisciniste, les textes invitent à enregistrer une première analyse. Avec un pisciniste, les rapports publiés apparaissent dans le même historique. Les brouillons professionnels restent privés. Une invitation en attente est distinguée d’un accès déjà accepté.

## Identité et migration

La migration additive `0005_account_identity.sql` ajoute `first_name`, `last_name` et `email`. Les anciens noms ne sont pas découpés automatiquement : l’utilisateur renseigne son prénom et son nom. Les anciens emails restent absents ; l’interface l’indique et propose un ajout, confirmé par le mot de passe actuel. Les nouvelles inscriptions demandent ces trois champs.

L’identifiant devient modifiable, avec unicité, validation et confirmation par mot de passe. Un changement déconnecte les autres sessions. L’email enregistré est affiché en lecture seule. Il n’est pas exposé aux autres membres ni à la recherche de professionnels. L’authentification reste fondée sur l’identifiant et le mot de passe ; la récupération conserve le code personnel. L’ajout d’un email n’active aucun envoi ni récupération par email.

Le rôle est choisi à l’inscription. `/me` ne peut plus l’élever, même par un appel manuel à l’API.

## Séparation des outils

L’accès aux besoins d’approvisionnement et à leur modification exige le principal actif de la piscine. Le client conserve les notifications pertinentes sur les achats ou produits apportés, mais ne gère plus la préparation de tournée. Les anciennes URL `needs` et `planning` de la piscine reviennent au suivi côté client.

Le formulaire client conserve les informations de son bassin : adresse, volume, traitement, équipements, état saisonnier et repères de mesure. Il n’affiche ni tâches professionnelles supplémentaires ni conseils « au client ». Ces deux champs ne peuvent plus être modifiés par un propriétaire ; leur absence dans le formulaire ne les efface pas en base. Les conseils existants restent lisibles dans le suivi. La checklist métier n’est retournée qu’au principal.

## Direction visuelle

La palette du 17 octobre est conservée : bleu profond `#153d4c`, turquoise `#007d8c`, fond `#f3f7f8`, eau `#e3f4f3`, texte secondaire `#58717b`. Manrope reste la police unique. La simplification porte sur les actions : une action à son emplacement, un formulaire d’identité clair, la sécurité à côté, aucun nouveau décor. Les titres sont alignés à gauche et le mobile passe sur une colonne.

## Validation

Les tests couvrent l’identité privée, l’unicité de l’identifiant, la confirmation du mot de passe, la révocation des anciennes sessions, la migration des comptes sans email, le refus d’élévation de rôle et les droits sur les besoins. Les parcours navigateur utilisent désormais deux comptes réellement distincts pour le client autonome et le professionnel, puis valident un client associé au professionnel, avec reprise de brouillon et publication.
