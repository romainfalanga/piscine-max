# Comptes par email et suivi de piscine

## Identité

Les seuls éléments demandés à l’inscription sont l’adresse email et le mot de passe, avec le choix client ou pisciniste. Aucun prénom, nom ou identifiant personnel n’est demandé. L’email est normalisé en minuscules et unique. Le compte affiche l’email et le changement de mot de passe. Modifier l’email exige le mot de passe actuel et révoque les autres sessions.

Le code de récupération personnel reste nécessaire pour un mot de passe oublié. Aucun envoi de mail n’est activé par cette évolution. Le rôle ne se transforme pas depuis Mon compte.

La migration additive `0006_email_login.sql` rattache les adresses déjà enregistrées lorsqu’elles sont uniques. Elle conserve les piscines, membres, photos et rapports. Pour un compte sans adresse unique, l’utilisateur peut associer son email depuis une session existante, avec son mot de passe, ou récupérer son compte avec son code personnel. Les doublons historiques ne sont jamais fusionnés ou attribués arbitrairement. Les anciens champs d’identité restent en base pour compatibilité, mais ne sont plus demandés ni renvoyés dans le profil.

## Piscine et invitations

Les quatre onglets client sont Suivi, Évolution, Le bassin et Accès. L’ajout d’une personne se trouve uniquement dans Accès. Le responsable choisit Mon pisciniste ou Copropriétaire et saisit son adresse email exacte. Aucune recherche publique de personnes par nom ou liste d’emails n’est proposée. La personne doit avoir créé son compte et accepter l’invitation dans la plateforme.

| Rôle dans la piscine | Consultation | Analyses et bassin | Entretiens et préparation | Invitations |
| --- | --- | --- | --- | --- |
| Responsable propriétaire | Historique et photos publiés | Oui | Non | Oui |
| Copropriétaire | Historique et photos publiés | Oui | Non | Non, sauf transfert de responsabilité |
| Pisciniste principal | Historique et photos, ses brouillons | Oui | Oui, pour ses piscines attribuées | Premier client d’une fiche préparée uniquement |
| Autre utilisateur | Aucun accès | Non | Non | Non |

Le rattachement professionnel peut aussi partir du pisciniste : demande au client par email ou création d’une fiche avec son email. L’acceptation conserve un seul dossier par piscine et un seul principal. Les invitations ne créent jamais de compte à la place du client. La révocation retire l’accès aux photos, au tableau de bord et aux outils du dossier.

Le bassin regroupe les informations modifiables et les équipements. L’export du carnet et les consignes d’accès privées sont retirés de l’interface. Les anciennes consignes ne sont pas effacées par une modification du bassin.

## Tableau de bord

Le suivi présente dans le même panneau la dernière photo d’entretien publiée par un professionnel et les dernières valeurs de pH et de chlore. Chaque élément porte sa propre date : une analyse personnelle récente ne redonne pas artificiellement une date récente à une photo plus ancienne.

Un résumé du dernier entretien rend visibles sa date, son auteur, sa durée, les tâches réalisées ou non, les observations et les produits ajoutés. Le compte rendu complet et son historique restent accessibles.

`GET /pools/:id/overview` contrôle l’appartenance active puis recherche séparément les deux dernières mesures, le dernier entretien et la dernière photo d’entretien. Il exclut les brouillons et les versions remplacées par une correction publiée. La recherche ne dépend pas de la pagination du journal. Une photo d’analyse personnelle n’est pas présentée comme une réalisation du pisciniste. La lecture de chaque image repasse par le contrôle privé R2 existant.

## Vérifications

31 tests métier et de permissions : connexion par email, unicité sans distinction de casse, changement sécurisé, migration des comptes historiques, récupération, invitations et droits des copropriétaires/principaux, refus des accès hors dossier, photo de brouillon, conservation de la photo et du chlore malgré plus d’une page d’analyses personnelles.

Le parcours navigateur couvre l’inscription email/mot de passe, le compte simplifié, les invitations par email dans Accès, Le bassin sans export/consignes privées, la préparation professionnelle et la publication d’une photo. Les contrôles Cloudflare testent également la connexion par email, les rôles acceptés et l’aperçu des photos publiées.
