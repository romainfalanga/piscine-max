# Agenda, carte et navigation des piscines

## Direction visuelle

Palette conservée : marine #0A2540, cyan #12B5C9, pétrole #007D8C, fond #F4FAFB, texte secondaire #58717B, séparateurs #CFDEE3. Manrope porte les commandes et les données, Sora reste réservé à la marque.

L’agenda est un outil de tournée : alignement à gauche des passages, heures dans une colonne étroite, une seule action principale « Planifier ». La préparation des produits et les statistiques sont des destinations secondaires nommées, sans trois boutons concurrents. La structure reste calme autour du calendrier, qui est le repère visuel de la page.

Les semaines vont du lundi au dimanche. Les mois utilisent leur vraie durée. Une date choisie affiche ses passages dans l’ordre horaire ; les cellules indiquent le nombre de passages non annulés. Les journées sans intervention sont explicites. Les calculs de dates civiles sont indépendants du changement d’heure. La navigation mensuelle conserve le numéro du jour quand il existe et le borne au dernier jour sinon.

La page Carte est un canevas plein écran, sans liste, titre visible ni sélecteur. La barre de recherche flottante filtre automatiquement les piscines suivies par nom, ville ou email client. Toutes les pages de résultats sont chargées, sans limite silencieuse aux 50 premiers bassins. Les réponses de recherche dépassées sont ignorées. Un appui sur un repère ouvre la fiche et son itinéraire. Déplacement et zoom tactiles sont immédiatement actifs.

Sur mobile, l’en-tête est masqué sur cette page pour laisser toute la hauteur à la carte ; la navigation inférieure reste accessible. Sur ordinateur, la carte remplit l’espace sous l’en-tête. Le conteneur suit la hauteur disponible et les changements d’orientation.

Les quatre sections client et six sections professionnelles du bassin sont regroupées dans une navigation visible : deux colonnes côté client, trois côté professionnel sur mobile, une rangée sur ordinateur. La section active combine fond, couleur et `aria-current`.

## Recherche et validation

Références : W3C WCAG Reflow https://www.w3.org/WAI/WCAG21/Understanding/reflow/ ; Target Size https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced/ ; API des interactions Leaflet https://leafletjs.com/reference.html .

Vérifications : 320, 390, 768 et 1440 px pour les périodes et sections de piscine ; vrais gestes tactiles via Chromium pour déplacer directement la carte ; filtre automatique, absence de résultats, absence de défilement de page et retour à l’agenda ; dates de fin de mois, année bissextile et changement d’heure. Les photos, droits et parcours métier existants restent couverts par les tests d’intégration.
