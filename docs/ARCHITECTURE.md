# Architecture et droits

## Identité et propriété

Le rôle est choisi à l’inscription. Un compte client ne peut pas activer un espace professionnel depuis son profil ; un compte professionnel peut aussi suivre ses piscines personnelles. Ce drapeau n'autorise jamais l'accès à une piscine à lui seul. Le client et le professionnel peuvent créer un dossier. En mode client, le créateur devient propriétaire responsable ; en mode professionnel, il devient principal, sans propriété client. Aucun compte client n'est créé à sa place.

`pool_members` autorise seulement `owner` et `principal` pour les accès actifs. Les contraintes SQL imposent un principal unique et un responsable client unique. Les anciennes lignes `temporary` sont révoquées par la migration 0003, leurs récurrences arrêtées et leurs rendez-vous futurs annulés ; les comptes rendus publiés sont conservés. Des triggers empêchent la réactivation de ces accès.

Le client invite le professionnel depuis Accès avec son adresse email exacte. Le professionnel peut demander à un client de choisir sa piscine via `connection_requests`, sans voir ses dossiers avant acceptation. Il peut aussi préparer une piscine puis inviter le client à la récupérer. Tant que le dossier n'a aucun propriétaire, son professionnel créateur peut inviter le premier client et archiver sa fiche ; dès acceptation, le client gère les autorisations.

Le client qui possède déjà un dossier peut le sélectionner en acceptant une fiche préparée vide : le professionnel rejoint le dossier existant, la fiche préparée est archivée. Si elle contient déjà du suivi, la redirection est refusée pour préserver les historiques ; le client peut refuser cette invitation puis inviter le professionnel depuis son dossier existant. Aucun historique n'est fusionné silencieusement.

Les invitations et demandes expirent après sept jours et requièrent une acceptation explicite. Les réponses utilisent un nonce de résolution et revérifient les droits dans le batch transactionnel. Le client retire l'ancien principal avant d'en choisir un autre. La responsabilité peut être transférée à un autre copropriétaire.

| Opération                       | Copropriétaire | Responsable client | Principal                                     | Autre pro |
| ------------------------------- | -------------- | ------------------ | --------------------------------------------- | --------- |
| Lire journal partagé et photos  | Oui            | Oui                | Oui                                           | Non       |
| Ajouter une analyse             | Oui            | Oui                | Oui                                           | Non       |
| Produire un rapport d'entretien | Non            | Non                | Oui                                           | Non       |
| Modifier le dossier permanent   | Oui            | Oui                | Oui                                           | Non       |
| Gérer les accès                 | Non            | Oui                | Premier client uniquement, avant rattachement | Non       |
| Notes internes personnelles     | Non            | Non                | Ses notes                                     | Non       |
| Brouillon d'un autre auteur     | Non            | Non                | Non                                           | Non       |

Les besoins d’approvisionnement, la routine et les conseils professionnels se modifient uniquement par le principal actif. Les propriétaires conservent le suivi, les informations du bassin et les notifications pertinentes. Voir [PARCOURS-CLIENT.md](PARCOURS-CLIENT.md).

L’email est désormais l’identité de connexion unique, normalisée en minuscules. La migration 0006 conserve tous les comptes historiques et ne rattache automatiquement que les emails non ambigus ; le code de récupération ou une session avec mot de passe permet d’associer une adresse aux autres comptes. Aucun annuaire public de personnes n’est exposé.

## Historique

Un `record` appartient directement à la piscine ; un rendez-vous est facultatif. Supprimer/arrêter une récurrence n'efface donc pas le suivi. L'auteur et son nom au moment de la saisie sont conservés. La publication est explicite et les notifications sont créées dans le même batch D1. Une correction crée une version liée ; les courbes ignorent les versions remplacées publiées.

Un ancien professionnel perd l'accès API aux rapports, photos et planning du dossier. Le client conserve les relevés publiés. Les notes internes ne sont jamais mélangées aux rapports ni à l'export client.

## Outils professionnels et géographie

La carte affiche les piscines dont l’accès est actif, aux coordonnées de l’adresse sélectionnée auprès de l’IGN. Les fiches anciennes avec un centre communal restent signalées comme approximatives. Adresses et coordonnées ne sont accessibles qu’aux membres autorisés. Voir EXPERIENCE-ENTRETIEN.md pour la recherche et les prestataires cartographiques.

Les endpoints d’entraide, de missions, de modération et d’assistant IA sont retirés. Les anciennes tables communautaires restent inutilisées dans la base pour permettre un retour arrière sans destruction de données. Les anciennes notifications liées à l’entraide ne sont plus retournées.

Les progressions de procédures (`guide_progress`) sont privées, indexées par utilisateur/procédure/piscine. Une progression liée à un bassin nécessite un accès professionnel actif à chaque lecture/écriture. Validation des identifiants d’étapes, type de filtre et états ; révision optimiste pour rejeter une sauvegarde obsolète. Enregistrer une checklist ne publie jamais de compte rendu client.

Les calculateurs sont des fonctions locales sans transmission de données. Les notices et hypothèses restent affichées avec le résultat. Les quiz conservent un historique propre à chaque compte ; la session en cours est conservée dans l’onglet courant.

## Sécurité technique

- Sessions aléatoires de 256 bits, empreinte SHA-256 en base, cookies Secure/HttpOnly/SameSite=Strict ; expiration et statut du compte vérifiés à chaque requête.
- Mot de passe avec sel aléatoire, préhachage HMAC par secret serveur et PBKDF2 SHA-256 à 100 000 itérations (limite du runtime Workers). Faire auditer ce choix et le budget CPU avant ouverture large ; une authentification dédiée ou un KDF plus coûteux sur un runtime adapté reste une évolution possible. Le pepper ne remplace pas le coût d'un KDF.
- Code de récupération aléatoire à usage unique, empreinte en base, rotation et révocation des sessions. La récupération repose toujours sur ce code ; l’email de profil ne déclenche pas de récupération par email.
- Écritures protégées par vérification Origin, requêtes préparées, validation serveur, limitation par compte et IP sur l'authentification ; CSP et absence de script tiers.
- Images privées dans R2, contrôle de droits à chaque lecture, aucun bucket public ; formats JPEG/PNG/WebP, limites de taille, retrait des métadonnées connues.
- Aucun secret par défaut en production. Le runtime refuse l'authentification si le secret manque.

L'autorisation est vérifiée à chaque requête ; une réponse déjà téléchargée ne peut naturellement pas être effacée de l'appareil de son destinataire.

## Capacité

D1 reste une base SQLite gérée avec limites de stockage et de débit par base. Indexes ciblés, pagination par curseur, fenêtre d'agenda limitée à 62 jours et agrégation quotidienne des courbes évitent les chargements globaux. Photos hors base. Les listes professionnelles de sélection dans certains formulaires sont limitées à 50 piscines ; au-delà, ouvrir l'action depuis le dossier concerné. Ajouter une recherche paginée dans ces sélecteurs avant de viser de très gros portefeuilles.

Les limites protectrices ne doivent pas être présentées comme des données complètes : export plafonné à 10 000 relevés, besoins affichés à 200, agenda limité à 1 000 récurrences et 2 000 rendez-vous par période. Le journal et les piscines sont paginés. L'export par période et la pagination des grandes listes font partie de la préparation à l'ouverture massive.

Aucune promesse de dizaines de milliers de connexions simultanées ne découle du benchmark SQLite local. Le guide de déploiement définit la recette réelle à conduire.
