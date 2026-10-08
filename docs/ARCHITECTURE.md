# Architecture et droits

## Identité et propriété

Une identité possède un espace client ; `is_pro` active l'espace professionnel. Ce drapeau n'autorise jamais l'accès à une piscine à lui seul. Le créateur d'une piscine devient son copropriétaire responsable. Aucun endpoint de création d'un compte client par un professionnel n'est conservé.

`pool_members` relie une personne à une piscine : `owner`, `principal` ou `temporary`. Les contraintes SQL imposent un seul principal actif et un seul responsable ; un temporaire a obligatoirement une échéance. La responsabilité peut être transférée à un autre copropriétaire. Les invitations ciblent un compte existant, expirent et nécessitent acceptation.

| Opération | Copropriétaire | Responsable client | Principal | Temporaire | Autre pro |
|---|---|---|---|---|---|
| Lire journal partagé et photos | Oui | Oui | Oui | Pendant l'accès | Non |
| Ajouter une analyse | Oui | Oui | Oui | Pendant l'accès | Non |
| Produire un rapport d'entretien | Non | Non | Oui | Pendant l'accès | Non |
| Modifier le dossier permanent | Oui | Oui | Oui | Non | Non |
| Gérer les accès | Non | Oui | Non | Non | Non |
| Notes internes personnelles | Non | Non | Ses notes | Ses notes | Non |
| Brouillon d'un autre auteur | Non | Non | Non | Non | Non |
| Demande privée entre professionnels | Non | Non | Si éligible | Si éligible | Si éligible |

Le responsable peut autoriser une mission proposée dans un fil professionnel sans lire la discussion entre professionnels. L'approbation expose seulement le type de mission, le professionnel et l'échéance.

## Historique

Un `record` appartient directement à la piscine ; un rendez-vous est facultatif. Supprimer/arrêter une récurrence n'efface donc pas le suivi. L'auteur et son nom au moment de la saisie sont conservés. La publication est explicite et les notifications sont créées dans le même batch D1. Une correction crée une version liée ; les courbes ignorent les versions remplacées publiées.

Un ancien professionnel perd l'accès API aux rapports, photos et planning du dossier. Le client conserve les relevés publiés. Les notes internes ne sont jamais mélangées aux rapports ni à l'export client.

## Entraide et géographie

Les coordonnées stockées pour la proximité correspondent au centre communal, pas à l'adresse de la piscine. Les réponses du fil n'incluent pas `pool_id`, l'adresse, les consignes d'accès ou les coordonnées. Les demandes locales sont filtrées par le secteur du professionnel, y compris lors d'un accès direct à leur URL. Un avis technique peut être national ; une mission reste locale.

Les textes saisis restent sous la responsabilité de leur auteur : un filtre bloque emails, téléphones et liens évidents, mais ne peut pas garantir la détection de toute adresse écrite librement. L'interface rappelle de ne pas publier d'information permettant d'identifier le client. Signalements et blocages disponibles ; modération réservée à `ADMIN_USER_ID`, configuré côté serveur.

## Sécurité technique

- Sessions aléatoires de 256 bits, empreinte SHA-256 en base, cookies Secure/HttpOnly/SameSite=Strict ; expiration et statut du compte vérifiés à chaque requête.
- Mot de passe avec sel aléatoire, préhachage HMAC par secret serveur et PBKDF2 SHA-256 à 100 000 itérations (limite du runtime Workers). Faire auditer ce choix et le budget CPU avant ouverture large ; une authentification dédiée ou un KDF plus coûteux sur un runtime adapté reste une évolution possible. Le pepper ne remplace pas le coût d'un KDF.
- Code de récupération aléatoire à usage unique, empreinte en base, rotation et révocation des sessions. Sans email, sa perte avec celle du mot de passe empêche une récupération autonome.
- Écritures protégées par vérification Origin, requêtes préparées, validation serveur, limitation par compte et IP sur l'authentification ; CSP et absence de script tiers.
- Images privées dans R2, contrôle de droits à chaque lecture, aucun bucket public ; formats JPEG/PNG/WebP, limites de taille, retrait des métadonnées connues. Les pièces jointes d'entraide ne sont pas activées.
- Aucun secret par défaut en production. Le runtime refuse l'authentification si le secret manque.

L'autorisation est vérifiée à chaque requête ; une réponse déjà téléchargée ne peut naturellement pas être effacée de l'appareil de son destinataire.

## Capacité

D1 reste une base SQLite gérée avec limites de stockage et de débit par base. Indexes ciblés, pagination par curseur, fenêtre d'agenda limitée à 62 jours et agrégation quotidienne des courbes évitent les chargements globaux. Photos hors base. Les listes professionnelles de sélection dans certains formulaires sont limitées à 50 piscines ; au-delà, ouvrir l'action depuis le dossier concerné. Ajouter une recherche paginée dans ces sélecteurs avant de viser de très gros portefeuilles.

Les limites protectrices ne doivent pas être présentées comme des données complètes : export plafonné à 10 000 relevés, réponses d'un fil plafonnées à 200, besoins affichés à 200, agenda limité à 1 000 récurrences et 2 000 rendez-vous par période. Le journal, les piscines et le fil principal sont paginés. L'export par période et la pagination des fils très longs font partie de la préparation à l'ouverture massive.

Aucune promesse de dizaines de milliers de connexions simultanées ne découle du benchmark SQLite local. Le guide de déploiement définit la recette réelle à conduire.
