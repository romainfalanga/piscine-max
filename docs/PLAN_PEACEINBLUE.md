# Peace in Blue — plateforme partagée

Décisions validées avec Romain le 8 octobre 2026. Tous les parcours sont gratuits.

## Produit
- Tous types de bassins (particulier, location, copropriété, hôtel, camping, autre). Les repères techniques ne sont pas une certification sanitaire/réglementaire.
- Le client crée son compte puis sa piscine. Plusieurs clients peuvent être copropriétaires. Le créateur est responsable des invitations et changements de prestataire ; transfert de cette responsabilité possible à un copropriétaire.
- Une identité peut activer un profil professionnel et conserver son espace personnel. Aucun compte salarié/entreprise complexe.
- Un seul professionnel principal par piscine. Intervenants ponctuels avec mission et échéance. Fin de collaboration = révocation de l'accès au dossier et au suivi, y compris aux photos et aux futurs événements.
- Inscription professionnelle libre, sans badge vérifié. La déclaration professionnelle n'atteste pas d'une qualification. Aucun dossier de piscine accessible sur ce seul statut.
- Pas d'email : identifiant + mot de passe, code de récupération secret renouvelé à l'utilisation. Notifications exclusivement dans l'application ; pas de promesse de livraison hors connexion sans push configuré.
- Remise à zéro des anciennes données autorisée ; aucune reprise obligatoire. Créer et valider une nouvelle base avant la bascule. Pas de destruction pendant les essais.

## Parcours prioritaires
1. Inscription, conservation du code de récupération, création de piscine (informations inconnues acceptées), invitation d'un copropriétaire.
2. Invitation d'un pro existant, acceptation du client/pro, accès vérifié côté serveur à chaque opération. Aucun annuaire de piscines privées.
3. Analyse autonome sans rendez-vous ; suivi commun avec auteur, date, unités, méthode et version de correction.
4. Agenda, interventions récurrentes et saisonnières, report isolé, préparation de tournée, compte rendu brouillon puis « Terminer et partager ».
5. Besoin produit/matériel : responsable client ou professionnel ; quantités/unités ; statut à acheter/à préparer, prêt, livré. Notifications de demande, préparation et livraison distinctes. Ne pas confondre une livraison avec un ajout de produit dans l'eau.
6. Entraide : avis national possible ; renfort/remplacement/dépannage/transmission locale. Client voit uniquement ses demandes et les réponses destinées à lui ; pro voit les demandes éligibles, jamais les dossiers liés sans autorisation.
7. Proposition de mission -> accord du demandeur -> autorisation du responsable client -> accès borné -> intervention -> clôture/révocation. Les discussions entre pros restent internes même si le client autorise la mission.

## Données et permissions
Entités séparées : utilisateurs, sessions révocables, profils pro, piscines, membres, invitations, accès professionnels, récurrences, rendez-vous, rapports, relevés, photos privées, besoins, notifications, demandes d'entraide, réponses, propositions, signalements, blocages, journal d'audit.

- Le partage s'applique à une piscine, une personne, des droits et une durée.
- Le client conserve l'historique ; modifier/supprimer une récurrence n'efface pas les passages.
- Rapports pros : brouillon visible à l'auteur ; publication visible aux copropriétaires et pros autorisés. Notes internes séparées, jamais exportées dans le dossier client.
- Une analyse publiée ne s'efface pas silencieusement : correction liée à la version originale.
- Invitation liée à un identifiant, acceptation obligatoire et expiration. Pas de création de compte pour autrui.
- Retrait d'un accès invalide l'accès API aux données et aux photos ; aucun cache public pour les ressources privées.
- Publication entraide = données dédiées, zone approximative stable (centre communal), aucun pool_id, adresse, code portail ou coordonnées exactes dans les réponses réseau du fil.
- Photos de piscine privées ; médias d'entraide seulement après traitement et contrôle de confidentialité. Ne jamais réutiliser directement une photo privée dans un fil.
- Le dernier responsable ne peut pas quitter une piscine sans transférer sa responsabilité ou archiver.

## Expérience
Client : Mes piscines, Suivi, Demandes. Pro : Aujourd'hui, Planning, Piscines, Entraide. Cloche commune. Outils/formations dans un espace secondaire. Interface mobile, contrastée, utilisable au clavier, libellés explicites, données inconnues distinctes de zéro. Reprise de saisie après erreur réseau, sans annoncer une sauvegarde serveur avant confirmation.

## Architecture et mise en œuvre
1. Base neuve, clés étrangères, contraintes d'unicité (un pro principal actif), indexes par droits, piscine/date et statut. API Hono modulaire et même origine. Fermeture des anciens endpoints.
2. Sessions opaques hachées côté base, cookies HttpOnly/Secure/SameSite ; CSRF par vérification d'origine ; secrets requis sans valeur de secours ; validation serveur ; limites de taille et de fréquence.
3. Journal lié directement à la piscine. Pagination et courbes bornées, chargement du planning par période. Écritures répétées idempotentes et changements sensibles atomiques.
4. Notifications transactionnelles, champs de visibilité explicites, approvisionnement et suivi des tâches.
5. Entraide structurée, acceptations explicites, droits temporaires, signalements/blocages. Admin via configuration sûre et identité vérifiée hors parcours public, jamais « premier inscrit = admin ».
6. Tests d'isolation clients/pros, invitations concurrentes, révocation, confidentialité des brouillons et notes, médias, récupération, doublons et changement de pro. Tests UI sur mobile et bureau.
7. Préproduction distincte (base/stockage/secrets), déploiement GitHub -> Cloudflare, vérifications puis bascule. Sauvegarde/restauration et retour arrière documentés.

## Capacité et ouverture
Objectif initial de dimensionnement : 50 000 comptes, 30 000 piscines, historique paginé, photos hors base. Il s'agit d'un scénario de test, pas d'une capacité démontrée.

- Tests reproductibles sur données synthétiques, lectures mixtes et écritures concurrentes ; mesure p50/p95/p99, erreurs, débit, lignes D1 lues et écrites et coût.
- Objectifs de recette : aucune fuite entre utilisateurs ; aucune perte/duplication d'intervention ; p95 API courante < 500 ms sous charge cible, erreurs serveur < 0,5 % hors saturation volontaire. Charge cible à mesurer sur hébergement de préproduction, pas extrapolée des tests locaux.
- D1 : stockage et débit par base bornés ; indexes et EXPLAIN QUERY PLAN avant ouverture ; surveiller saturation et taille. Prévoir évolution vers PostgreSQL ou partitionnement si les mesures le justifient.
- Quotas de fichiers, protection antispam, nettoyage des sessions/limiteurs expirés, suivi erreurs sans secrets. Budgets d'hébergement distincts de la gratuité pour les utilisateurs.
- Ouverture progressive : Romain + comptes de recette, cercle de clients/pros pilotes, puis public. Ne pas annoncer « prêt pour des dizaines de milliers » avant essais représentatifs et restauration validée.

## Hors périmètre du lancement
Abonnements/paiements, salariés, comptabilité, gestion d'entrepôt, objets connectés, notation publique et fil social généraliste. Prévoir une couche de droits fonctionnels pour la future offre gratuite/payante sans déployer de facturation. L'entraide restera accessible à l'offre gratuite.

## Parité avec Piscine Max avant remplacement définitif

Cette branche est une refonte en cours de recette. La bibliothèque métier et la banque de questions existantes sont conservées, avec sessions de 40 questions. La création de comptes pour autrui, la lecture seule imposée aux clients et les emails sont remplacés conformément aux décisions de Romain.

Les fonctions suivantes de l'ancienne interface ne sont pas encore reportées à l'identique et doivent faire l'objet d'un lot de parité avant remplacement définitif : assistant multimodal en conversation/streaming et contexte des fiches, carte et optimisation de tournée, statistiques d'activité détaillées, centre d'alertes consolidé, outils de filtration et dosage. Pour les dosages, ne pas reprendre une quantité générique de correcteur pH sans produit/concentration/notice connus ; conserver la valeur métier avec un calcul fondé sur la notice réelle.

Ces écarts ne bloquent pas la recette des nouveaux parcours comptes/piscines/entraide, mais interdisent de présenter la branche comme un remplacement intégral finalisé ou de fusionner automatiquement sur la production existante.
