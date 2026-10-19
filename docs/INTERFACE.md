# Interface et navigation de la piscine

## Direction

L’identité reste celle de Peace in Blue : marine #0A2540, bleu d’action #0A3851, cyan de marque #12B5C9, blanc #FFFFFF, texte secondaire #566B7B et séparations #DDE5E9. Manrope porte l’interface, Sora reste réservé au lettrage de marque.

Les mesures et les photographies réelles du bassin portent le contenu. Les sections de piscine sont nommées en texte, sans pictogrammes ni pastilles. Les actions sont distinguées de la navigation. Les historiques et les listes se lisent comme des documents, avec des espacements et des lignes, plutôt qu’une succession de grandes cartes colorées. La page Pisciniste privilégie le Code puis présente calculs et bibliothèque comme des destinations lisibles.

La révision a écarté une nouvelle famille de cartes, une image décorative et une typographie fantaisie : aucune de ces solutions ne rendait les mesures, les passages ou les outils plus faciles à utiliser. Les symboles purement décoratifs ont été retirés ; les commandes utilitaires et les états des tâches restent identifiables.

## Sections persistantes

À l’ouverture d’une piscine, l’en-tête et le menu sont montés une seule fois. Les sections autorisées sont préparées en arrière-plan et conservées dans ce dossier affiché. Changer de section modifie la zone visible et l’URL, sans remplacer la fiche ni redemander les courbes, relevés et aperçus déjà préparés. Les filtres de courbe et les éléments déjà ouverts sont conservés.

Chaque changement vérifie néanmoins l’accès auprès du serveur. Les comptes clients ne préparent aucune section professionnelle. Le contenu n’est pas conservé dans un stockage persistant. Une modification déclenche le rechargement explicite des données ; au-delà de 45 secondes, un changement de section revalide le contenu en arrière-plan sans supprimer l’en-tête. Un changement de piscine reconstruit le dossier, les réponses anciennes ne peuvent pas remplacer une nouvelle fiche.

La méthode de mesure n’apparaît plus dans les formulaires ni dans les détails affichés. Les métadonnées historiques restent stockées sans imposer une saisie.

## Vérification

Les tests navigateur vérifient que l’en-tête et le menu gardent leurs mêmes éléments DOM, qu’un filtre de courbe demeure sélectionné et que le passage entre sections déjà préparées ne recharge ni le document ni leur contenu. Les parcours d’ajout, reprise et publication vérifient l’actualisation après modification. Les variantes client et pisciniste, les quatre tailles d’écran et la carte plein écran restent couvertes.
