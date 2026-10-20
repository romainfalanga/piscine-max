# Peace in Blue : une application pour l’activité de Romain

La plateforme accueille tous les particuliers qui souhaitent suivre leur piscine. L’entretien professionnel est assuré uniquement par Peace in Blue. Elle ne vend pas d’accès à d’autres professionnels et ne propose aucun annuaire de piscinistes.

## Compte réservé

La migration 0007 rattache `business_provider` au compte existant identifié et vérifié de Romain, `romainfalanga83@gmail.com`. L’identifiant du compte est fixé, pas déduit d’une future inscription à cette adresse. Les inscriptions publiques créent toujours des comptes clients, quelles que soient les propriétés envoyées. Des contraintes de base empêchent de promouvoir un autre compte ou de lui attribuer un accès professionnel. L’adresse du compte professionnel ne se change pas dans le profil.

La migration retire les autres droits professionnels, ferme leurs accès de principal, désactive leurs récurrences et annule leurs futurs rendez-vous. Les comptes, piscines, analyses et comptes rendus publiés sont conservés. Aucun autre professionnel ne devient propriétaire des anciennes piscines par cette opération.

Une installation vide n’a aucun intervenant par défaut. La désignation d’un compte nécessite une opération de configuration privilégiée après vérification de son identité, pas une inscription publique. Les tests locaux provisionnent un seul compte fictif directement dans leur base isolée ; aucune route de provisionnement n’est déployée.

## Parcours client

L’inscription et la connexion demandent uniquement email et mot de passe. Le client peut créer une piscine et tenir son carnet sans entretien professionnel.

Les sections sont Suivi, Évolution, Le bassin et Intervenant. La page Intervenant explique l’entretien régulier Peace in Blue, recueille le téléphone portable et demande une autorisation explicite d’accès au dossier en cas d’acceptation. Le responsable de la piscine envoie ou annule la demande. Les copropriétaires voient son état, sans accès au téléphone de demande. Leurs invitations et la gestion des propriétaires se trouvent dans une section dépliable du Bassin.

L’envoi ne programme pas de passage. Il ne donne pas non plus accès au dossier à Romain. Une notification dans la plateforme lui signale la demande. Son tableau de bord affiche le nom du bassin, la commune, l’email et le téléphone pour rappeler le client ; il n’expose pas l’adresse précise, les photos ni le carnet avant acceptation. La prise en charge par Romain active son accès de principal et informe le client. Les dates et modalités restent à convenir.

Une demande en attente par piscine est autorisée. Une annulation, un archivage ou une perte de responsabilité rend l’ancien consentement inutilisable. L’acceptation est atomique et à usage unique. Retirer Peace in Blue de la piscine ferme immédiatement l’accès tout en conservant les rapports partagés. Un nouveau suivi exige un nouvel accord.

## Proposition initiée par Romain

Depuis Clients ou Tableau de bord, Romain peut saisir l’email d’un client inscrit. Celui-ci reçoit une notification, choisit la piscine et accepte ou refuse. Cette proposition ne donne aucun accès avant son acceptation. Romain peut aussi préparer un dossier à faire accepter par son client. Un dossier existant peut être conservé selon les règles de rattachement déjà présentes.

## Tableau de bord

Accessible depuis l’Agenda, il affiche :

- Comptes clients : comptes actifs de la plateforme, hors le compte professionnel.
- Propriétaires de piscines : comptes clients actifs possédant au moins une piscine non archivée, comptés une seule fois.
- Mes clients suivis : propriétaires actifs d’au moins une piscine actuellement confiée à Peace in Blue. Un copropriétaire est compté une fois même s’il possède plusieurs piscines suivies.
- Piscines en entretien : dossiers non archivés actuellement suivis par Romain.
- Demandes d’entretien en attente, paginées et avec actions de traitement.
- Passages publiés et activité par mois sur les piscines actuellement suivies.

Les indicateurs globaux sont des agrégats. Ils n’ouvrent aucun accès aux données des utilisateurs autonomes.

## Vérification et publication

Tests API et migrations sur SQLite transactionnel, parcours navigateur client/intervenant sur mobile et ordinateur, compilation TypeScript et production. Le workflow déploie sur `peaceinblue-recette.pages.dev`, applique la migration et vérifie les parcours clients, les photos privées, les demandes et la désignation du compte réservé dans D1. Il ne crée aucun second compte professionnel et ne modifie jamais temporairement le compte réservé en ligne. Les notifications de demandes de recette sont reliées aux demandes et supprimées avec leurs seules données de test.
