// Génère seed-quiz.sql : banque de questions du "Code du pisciniste"
import { writeFileSync } from 'node:fs'

// correct: 'a' | 'b' | 'c' | 'd'
const Q = [
  // ============================================================
  // CHIMIE DE L'EAU
  // ============================================================
  { cat: "Chimie de l'eau", q: "Quelle est la plage idéale de pH pour l'eau d'une piscine ?", a: "6.8 à 7.0", b: "7.2 à 7.4", c: "7.6 à 8.0", d: "8.2 à 8.6", correct: 'b', exp: "7.2-7.4 est la zone où le désinfectant est le plus efficace et l'eau la plus confortable." },
  { cat: "Chimie de l'eau", q: "Que se passe-t-il si le pH est trop haut (> 7.6) ?", a: "Le chlore devient plus efficace", b: "L'eau devient plus agressive pour les équipements", c: "Le chlore devient moins efficace et des dépôts calcaires apparaissent", d: "Rien, ce n'est jamais un problème", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Quelle est la teneur idéale en chlore libre pour une piscine privée en usage courant ?", a: "0.2 mg/L", b: "2 mg/L", c: "5 mg/L", d: "10 mg/L", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Le chlore combiné (chloramines) résulte de la réaction du chlore avec :", a: "Le sel", b: "Les matières organiques apportées par les baigneurs", c: "Le stabilisant", d: "Le calcaire", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Une eau qui sent très fort le chlore est en réalité souvent le signe :", a: "D'un excès de chlore libre", b: "D'une eau parfaitement désinfectée", c: "D'un taux de chlore combiné élevé (sous-chloration)", d: "D'un TAC trop bas", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Au-delà de quel taux de chlore combiné faut-il faire un traitement choc ?", a: "0.1 mg/L", b: "0.4-0.6 mg/L", c: "2 mg/L", d: "5 mg/L", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Que mesure le TAC ?", a: "La température de l'eau", b: "Le taux de sel", c: "La capacité de l'eau à résister aux variations de pH", d: "La turbidité de l'eau", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Quelle est la plage idéale du TAC ?", a: "10-30 mg/L", b: "80-120 mg/L", c: "200-300 mg/L", d: "500-600 mg/L", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Pourquoi faut-il toujours régler le TAC avant le pH ?", a: "Ce n'est pas nécessaire, l'ordre n'a pas d'importance", b: "Le TAC stabilise le pH, sinon la correction du pH est inefficace", c: "Le pH influence le TAC", d: "Le TAC se règle automatiquement avec le chlore", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un TAC trop bas entraîne :", a: "Un pH stable", b: "Une eau entartrante", c: "Un pH instable (effet yo-yo)", d: "Une surconsommation de chlore uniquement", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Quelle est la plage idéale de TH (dureté) recommandée ?", a: "10 à 20 °f (100-200 mg/L)", b: "50 à 60 °f", c: "1 à 5 °f", d: "80 à 100 °f", correct: 'a' },
  { cat: "Chimie de l'eau", q: "Un TH trop élevé (> 25 °f) favorise :", a: "La corrosion des équipements", b: "L'entartrage et une eau trouble", c: "Une baisse du chlore", d: "Une hausse du pH incontrôlable", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un TH trop bas expose plutôt à :", a: "L'entartrage", b: "La corrosion des équipements et du revêtement", c: "Une odeur de chlore", d: "Une eau plus claire", correct: 'b' },
  { cat: "Chimie de l'eau", q: "À quoi sert le stabilisant (acide cyanurique) ?", a: "À augmenter le pH", b: "À protéger le chlore de la dégradation par les UV du soleil", c: "À remplacer le TAC", d: "À adoucir l'eau", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Sans stabilisant, le chlore libre en plein soleil d'été est détruit par les UV en environ :", a: "2 à 3 heures", b: "2 à 3 jours", c: "2 à 3 semaines", d: "Il n'est jamais détruit", correct: 'a' },
  { cat: "Chimie de l'eau", q: "Quelle est la plage idéale de stabilisant selon la norme DIN EN 16713:2016 ?", a: "0-5 mg/L", b: "30 à 50 mg/L", c: "150-200 mg/L", d: "500 mg/L minimum", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Quel est le maximum réglementaire français pour le stabilisant ?", a: "10 mg/L", b: "30 mg/L", c: "75 mg/L", d: "500 mg/L", correct: 'c' },
  { cat: "Chimie de l'eau", q: "La sur-stabilisation de l'eau provoque :", a: "Un chlore de plus en plus efficace", b: "Un effet de 'verrouillage' rendant le chlore moins efficace à dose égale", c: "Une baisse du TAC", d: "Une hausse automatique du pH", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Comment corriger une eau sur-stabilisée ?", a: "Ajouter encore plus de chlore stabilisé", b: "Renouveler une partie de l'eau du bassin ou passer au chlore non stabilisé", c: "Baisser le pH uniquement", d: "Ajouter du sel", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Que signale un indice de Langelier (LSI) proche de 0 (± 0,3) ?", a: "Une eau très corrosive", b: "Une eau entartrante", c: "Une eau à l'équilibre calco-carbonique", d: "Une eau non désinfectée", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Un indice de Langelier positif signale une eau :", a: "Corrosive", b: "Entartrante", c: "Sans chlore", d: "Trop acide", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un indice de Langelier négatif signale une eau :", a: "Entartrante", b: "Corrosive/agressive", c: "Parfaitement équilibrée", d: "Trop riche en stabilisant", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Dans quel ordre faut-il corriger les paramètres de l'eau ?", a: "Chlore, puis pH, puis TAC", b: "TAC, puis pH, puis TH, puis chlore", c: "TH, puis chlore, puis TAC", d: "Peu importe l'ordre", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Quel réactif est utilisé pour tester le pH avec un kit à pastilles ?", a: "DPD1", b: "DPD3", c: "Phenol Red", d: "Orthotolidine", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Quel réactif est utilisé pour tester le chlore libre ?", a: "Phenol Red", b: "DPD1", c: "DPD3", d: "Bleu de bromothymol", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Quel outil de mesure offre la plus grande précision, multi-paramètres ?", a: "Bandelette réactive", b: "Trousse à gouttes", c: "Photomètre électronique", d: "Le simple aspect visuel de l'eau", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Pourquoi ne faut-il jamais toucher l'embout d'un flacon réactif avec les doigts ?", a: "Cela n'a aucune conséquence", b: "Cela contamine le réactif et fausse les tests suivants", c: "Cela accélère la réaction", d: "Cela stérilise le réactif", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Combien de temps se conservent généralement les réactifs liquides (DPD, phénol red) ?", a: "1 semaine", b: "1 mois", c: "Environ 1 an", d: "10 ans", correct: 'c' },
  { cat: "Chimie de l'eau", q: "Où doit-on prélever l'échantillon d'eau pour un test fiable ?", a: "En surface, près du bord", b: "À 30-40 cm de profondeur, loin des buses et skimmers", c: "Juste après avoir versé un produit", d: "N'importe où, cela n'a pas d'importance", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un pH très bas (< 7,0) fausse la lecture de quel autre paramètre ?", a: "Le chlore", b: "Le sel", c: "La température", d: "Aucun", correct: 'a' },
  { cat: "Chimie de l'eau", q: "Le chlore choc (dichlore, hypochlorite de calcium) est-il stabilisé ?", a: "Oui, toujours", b: "Non, il est non stabilisé", c: "Cela dépend uniquement de la marque", d: "Le chlore choc n'existe pas", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Les galets de chlore lent (trichlore) sont :", a: "Non stabilisés", b: "Stabilisés (contiennent de l'acide cyanurique)", c: "Sans effet sur le pH", d: "Interdits en France", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un floculant sert à :", a: "Désinfecter l'eau à la place du chlore", b: "Clarifier l'eau en agglomérant les particules en suspension", c: "Augmenter le TAC", d: "Remplacer le stabilisant", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un séquestrant métaux doit être ajouté :", a: "Après un traitement choc uniquement", b: "Avant tout traitement choc, pour éviter que les métaux ne précipitent en taches", c: "Jamais avec du chlore", d: "Uniquement en hiver", correct: 'b' },
  { cat: "Chimie de l'eau", q: "pH+ et pH- doivent être versés :", a: "Ensemble pour un effet plus rapide", b: "Directement dans l'eau, jamais l'inverse, et jamais mélangés entre eux", c: "Directement sur le liner", d: "Dans le panier du skimmer, filtration coupée", correct: 'b' },

  // ============================================================
  // TRAITEMENT DE L'EAU & ALGUES
  // ============================================================
  { cat: "Traitement de l'eau", q: "Quelle est la dose de référence couramment utilisée pour un chlore choc standard ?", a: "2 g/m³", b: "20 g/m³", c: "200 g/m³", d: "2 kg/m³", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Avant un traitement choc, il faut d'abord :", a: "Vider la moitié du bassin", b: "Ramener le pH entre 7.2 et 7.4", c: "Couper la filtration", d: "Ajouter du sel", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Après un choc chlore, la filtration doit tourner en continu pendant au moins :", a: "1 heure", b: "24 heures", c: "10 minutes", d: "1 semaine", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Les algues vertes sont le plus souvent liées à :", a: "Un excès de stabilisant uniquement", b: "Un manque de désinfectant ou un pH déséquilibré", c: "Un TH trop bas", d: "Un excès de sel", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Comment reconnaît-on les algues moutarde (jaunes) ?", a: "Elles forment des taches noires dans les joints", b: "Aspect poudreux jaunâtre qui se redépose vite après brossage", c: "Elles ne se trouvent que sur les margelles", d: "Elles rendent l'eau bleue", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Pourquoi les algues moutarde résistent-elles au chlore classique ?", a: "Elles ne résistent pas, un chlore normal suffit toujours", b: "Elles nécessitent un produit anti-algues moutarde spécifique en complément", c: "Elles disparaissent seules en 24h", d: "Elles ne sont pas de vraies algues", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Les algues noires se logent principalement :", a: "En surface de l'eau", b: "Dans les joints et micro-fissures, très résistantes", c: "Uniquement sur les liners neufs", d: "Dans le stabilisant", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Pour traiter les algues noires, il faut d'abord :", a: "Ajouter du sel", b: "Brosser vigoureusement pour casser leur membrane protectrice avant traitement", c: "Vider le bassin", d: "Baisser le pH sous 6", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Les algues roses sont en réalité :", a: "De vraies algues très rares", b: "Des bactéries, pas de vraies algues", c: "Un dépôt de calcaire coloré", d: "Un signe de sur-chloration", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Les algues roses colonisent surtout :", a: "Le fond du bassin uniquement", b: "Les surfaces plastiques (liner, joints, paniers de skimmer)", c: "Les margelles en pierre", d: "L'eau en suspension uniquement", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Pour rattraper une eau trouble ou laiteuse, on utilise principalement :", a: "Du sel", b: "Un floculant", c: "Du stabilisant", d: "De l'antigel", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Après floculation avec un filtre à sable, il ne faut surtout pas :", a: "Nettoyer le filtre après", b: "Faire un backwash qui renverrait les flocons déposés au fond", c: "Aspirer les dépôts", d: "Attendre quelques heures", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Une eau verte translucide (sans dépôt) évoque souvent la présence de :", a: "Fer", b: "Cuivre (corrosion de canalisations ou électrolyseur en fin de vie)", c: "Manganèse", d: "Calcaire", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Une teinte rouille ou brune de l'eau évoque la présence de :", a: "Fer", b: "Cuivre", c: "Chlore en excès", d: "Stabilisant", correct: 'a' },
  { cat: "Traitement de l'eau", q: "Des dépôts noirs dans l'eau évoquent la présence de :", a: "Manganèse", b: "Sel", c: "Chlore combiné", d: "TAC élevé", correct: 'a' },
  { cat: "Traitement de l'eau", q: "Que faut-il faire avant de traiter une eau tachée par des métaux ?", a: "Un choc chlore immédiat", b: "Ramener le pH entre 7.0 et 7.4 puis ajouter un séquestrant, sans choc immédiat", c: "Vidanger complètement le bassin", d: "Augmenter le stabilisant", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Le chlore stabilisé (galets) est adapté :", a: "Uniquement au traitement choc ponctuel", b: "À la désinfection continue d'une piscine extérieure", c: "Uniquement aux spas", d: "Il est interdit en France", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Le chlore non stabilisé est surtout utilisé pour :", a: "L'entretien quotidien de routine", b: "Le rattrapage ponctuel (eau verte) sans augmenter le stabilisant déjà présent", c: "Remplacer le TAC", d: "Hiverner la piscine", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Le brome, comparé au chlore, est plutôt :", a: "Moins cher et identique en tout point", b: "Mieux toléré par les peaux sensibles et plus stable en eau chaude", c: "Interdit dans les spas", d: "Impossible à doser", correct: 'b' },
  { cat: "Traitement de l'eau", q: "L'oxygène actif est plutôt adapté :", a: "Aux grandes piscines collectives", b: "Aux petits bassins/spas familiaux, sans odeur", c: "Au traitement au sel uniquement", d: "Aux piscines à débordement uniquement", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Le taux de sel idéal pour une piscine à électrolyse est généralement de :", a: "0.5 à 1 g/L", b: "3 à 5 g/L", c: "20 à 30 g/L", d: "50 g/L", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Un électrolyseur qui ne produit pas assez de chlore doit d'abord être vérifié pour :", a: "Un dépôt de tartre sur les cellules", b: "Un excès de stabilisant uniquement", c: "Un TAC trop bas", d: "Une eau trop froide toujours", correct: 'a' },
  { cat: "Traitement de l'eau", q: "Le PHMB (polymère) est-il compatible avec un passage direct au chlore ?", a: "Oui, sans aucune précaution", b: "Non, incompatible sans vidange complète préalable", c: "Oui, c'est même recommandé", d: "Le PHMB contient déjà du chlore", correct: 'b' },
  { cat: "Traitement de l'eau", q: "UV et ozone sont des traitements :", a: "Rémanents à eux seuls, remplaçant tout désinfectant", b: "Complémentaires, réduisant la consommation de désinfectant chimique", c: "Interdits sur les piscines privées", d: "Réservés à l'eau de mer", correct: 'b' },

  // ============================================================
  // FILTRATION & ÉQUIPEMENTS
  // ============================================================
  { cat: 'Filtration', q: "Quelle est la finesse de filtration approximative d'un filtre à sable ?", a: "1-3 microns", b: "15-20 microns", c: "30-40 microns", d: "100 microns", correct: 'c' },
  { cat: 'Filtration', q: "Quelle est la finesse de filtration d'un filtre à cartouche ?", a: "1-3 microns", b: "15-20 microns", c: "30-40 microns", d: "200 microns", correct: 'b' },
  { cat: 'Filtration', q: "Quel filtre offre l'eau la plus limpide (1-3 microns) ?", a: "Filtre à sable", b: "Filtre à cartouche", c: "Filtre à diatomées", d: "Aucun filtre n'atteint cette finesse", correct: 'c' },
  { cat: 'Filtration', q: "Un filtre à cartouche se nettoie :", a: "Par backwash comme le sable", b: "Manuellement, sans backwash", c: "Il ne se nettoie jamais", d: "Uniquement par un professionnel agréé", correct: 'b' },
  { cat: 'Filtration', q: "Le sable d'un filtre doit être remplacé environ tous les :", a: "6 mois", b: "1 an", c: "5 à 7 ans", d: "20 ans", correct: 'c' },
  { cat: 'Filtration', q: "Une cartouche de filtration doit être remplacée environ tous les :", a: "1 mois", b: "2 à 3 ans", c: "10 ans", d: "Jamais", correct: 'b' },
  { cat: 'Filtration', q: "Le filtre à verre recyclé, comparé au sable, offre :", a: "Une filtration plus grossière", b: "Une meilleure résistance à l'entartrage et une filtration plus fine", c: "Aucune différence", d: "Un besoin de backwash quotidien", correct: 'b' },
  { cat: 'Filtration', q: "Que signifie 'HMT' pour une pompe de filtration ?", a: "Hauteur Manométrique Totale", b: "Haute Maintenance Technique", c: "Humidité Maximale Tolérée", d: "Une unité de volume", correct: 'a' },
  { cat: 'Filtration', q: "Une pompe surdimensionnée par rapport au filtre risque de :", a: "Ne rien changer", b: "User prématurément le filtre", c: "Réduire la consommation électrique", d: "Améliorer la filtration sans inconvénient", correct: 'b' },
  { cat: 'Filtration', q: "Quel est l'avantage principal d'une pompe à vitesse variable ?", a: "Elle ne s'use jamais", b: "Elle adapte le débit aux besoins réels, avec un gain énergétique important", c: "Elle ne nécessite aucun entretien", d: "Elle remplace le filtre", correct: 'b' },
  { cat: 'Filtration', q: "Que signifie le COP d'une pompe à chaleur ?", a: "Coefficient de Performance (chaleur restituée / énergie consommée)", b: "Coût Officiel de Production", c: "Le volume d'eau chauffé par heure", d: "La durée de vie de la PAC", correct: 'a' },
  { cat: 'Filtration', q: "Le COP d'une pompe à chaleur varie en fonction :", a: "De la couleur du bassin", b: "De la température extérieure (il chute quand l'air se refroidit)", c: "Du prix de l'électricité uniquement", d: "Il est toujours constant", correct: 'b' },
  { cat: 'Filtration', q: "Dimensionnement indicatif d'une PAC : environ combien de kW pour 10 m³ d'eau ?", a: "0.1 kW", b: "1 kW", c: "10 kW", d: "100 kW", correct: 'b' },
  { cat: 'Filtration', q: "Quelle est la règle professionnelle de durée de filtration selon la température ?", a: "Température × 2", b: "Température ÷ 2", c: "Toujours 24h/24", d: "Toujours 4h/jour", correct: 'b' },
  { cat: 'Filtration', q: "Pour une eau à 28°C, quelle filtration continue est recommandée ?", a: "2h/jour", b: "7h/jour", c: "14h/jour, voire continue au-delà", d: "Aucune filtration nécessaire", correct: 'c' },
  { cat: 'Filtration', q: "Le robot hydraulique fonctionne grâce à :", a: "Une batterie intégrée", b: "Le débit d'eau généré par la pompe de filtration existante", c: "L'énergie solaire", d: "Un moteur diesel", correct: 'b' },
  { cat: 'Filtration', q: "Le robot électrique, comparé à l'hydraulique, est :", a: "Totalement autonome (aspiration et filtration embarquées)", b: "Toujours moins cher", c: "Incapable de nettoyer les parois", d: "Interdit sur liner", correct: 'a' },
  { cat: 'Filtration', q: "Quel robot sollicite le plus le préfiltre et le filtre du bassin ?", a: "Le robot électrique", b: "Le robot hydraulique", c: "Aucun des deux", d: "Les deux de manière identique", correct: 'b' },
  { cat: 'Filtration', q: "Quel robot est réputé le plus fiable mécaniquement (moins de composants électroniques) ?", a: "Le robot électrique", b: "Le robot hydraulique", c: "Ils sont identiques", d: "Aucun robot n'est fiable", correct: 'b' },
  { cat: 'Filtration', q: "Une bonde de fond doit être équipée d'un dispositif :", a: "Anti-vortex / anti-entraînement", b: "Anti-gel uniquement", c: "Anti-calcaire", d: "Il n'y a aucune obligation", correct: 'a' },
  { cat: 'Filtration', q: "Une vanne multivoie de filtre à sable permet de sélectionner notamment :", a: "Uniquement filtration ou arrêt", b: "Filtration, lavage, rinçage, vidange, recirculation, hivernage", c: "Uniquement le chauffage", d: "Le dosage du chlore", correct: 'b' },

  // ============================================================
  // NETTOYAGE & ENTRETIEN COURANT
  // ============================================================
  { cat: 'Nettoyage', q: "À quelle fréquence minimale faut-il vider le panier du skimmer en pleine saison ?", a: "Une fois par an", b: "Une fois par semaine minimum", c: "Une fois toutes les deux heures", d: "Jamais si le robot fonctionne", correct: 'b' },
  { cat: 'Nettoyage', q: "Pour nettoyer une ligne d'eau, il faut utiliser :", a: "Une brosse métallique quel que soit le revêtement", b: "Un nettoyant adapté au revêtement et une éponge/pierre non abrasive", c: "De l'eau de javel concentrée versée directement", d: "Un nettoyeur haute pression toujours", correct: 'b' },
  { cat: 'Nettoyage', q: "Pour nettoyer des margelles en pierre naturelle, il faut éviter :", a: "L'eau tiède savonneuse", b: "Le nettoyeur haute pression et les produits acides", c: "La brosse à poils souples", d: "Le bicarbonate de soude", correct: 'b' },
  { cat: 'Nettoyage', q: "Sur du béton/carrelage, on peut utiliser une brosse plus agressive qu'un liner car :", a: "Le carrelage est plus fragile que le liner", b: "Le revêtement est plus résistant mais plus poreux (accroche des algues)", c: "Le liner ne se salit jamais", d: "Le béton n'accroche jamais les algues", correct: 'b' },
  { cat: 'Nettoyage', q: "Après chaque cycle d'un robot électrique, il faut :", a: "Le laisser dans l'eau en permanence", b: "Le sortir, l'égoutter, rincer le(s) filtre(s)/panier(s)", c: "Le stocker mouillé sans l'ouvrir", d: "Le brancher immédiatement en charge dans l'eau", correct: 'b' },
  { cat: 'Nettoyage', q: "Les brosses mousse d'un robot électrique se remplacent environ :", a: "Toutes les semaines", b: "Après une saison", c: "Tous les 10 ans", d: "Jamais", correct: 'b' },
  { cat: 'Nettoyage', q: "Une piscine hors-sol/tubulaire nécessite un contrôle pH/chlore :", a: "Moins fréquent qu'un bassin enterré", b: "Plus fréquent (minimum 2 fois/semaine en pleine saison)", c: "Une fois par an suffit", d: "Ce n'est jamais nécessaire", correct: 'b' },
  { cat: 'Nettoyage', q: "Pourquoi une piscine hors-sol se déséquilibre-t-elle plus vite qu'un bassin enterré ?", a: "Elle a un plus grand volume", b: "Son faible volume la rend plus sensible aux variations", c: "Elle n'a jamais de traitement", d: "Elle n'a pas de filtration", correct: 'b' },
  { cat: 'Nettoyage', q: "Le bac tampon d'une piscine à débordement représente environ quelle part du volume du bassin ?", a: "1%", b: "10%", c: "50%", d: "100%", correct: 'b' },
  { cat: 'Nettoyage', q: "Un bac tampon mal entretenu devient rapidement :", a: "Un simple réservoir sans conséquence", b: "Un foyer de prolifération d'algues qui contamine le bassin", c: "Plus propre que le bassin lui-même", d: "Inutile à vérifier", correct: 'b' },
  { cat: 'Nettoyage', q: "À quelle fréquence recommande-t-on de nettoyer un bac tampon en saison ?", a: "Une fois par jour", b: "Environ une fois par mois", c: "Une fois tous les 5 ans", d: "Jamais, il s'autonettoie", correct: 'b' },
  { cat: 'Nettoyage', q: "Pour un spa/bain à remous, l'entretien du filtre doit être :", a: "Moins fréquent que pour une piscine", b: "Plus rapproché que pour une piscine (faible volume, forte fréquentation)", c: "Inutile", d: "Fait une fois par an", correct: 'b' },
  { cat: 'Nettoyage', q: "Une piscine naturelle/biologique fonctionne principalement grâce :", a: "À un traitement chloré renforcé", b: "Au lagunage (plantes + micro-organismes filtrants)", c: "À l'eau de mer", d: "À l'ozone uniquement", correct: 'b' },

  // ============================================================
  // HIVERNAGE / ESTIVAGE
  // ============================================================
  { cat: 'Hivernage / Estivage', q: "Avant l'hivernage, il faut d'abord :", a: "Vider complètement le bassin dans tous les cas", b: "Nettoyer, équilibrer l'eau et faire un traitement choc", c: "Couper l'électricité du local technique uniquement", d: "Ajouter du sable dans le bassin", correct: 'b' },
  { cat: 'Hivernage / Estivage', q: "En hivernage passif, le niveau d'eau doit être :", a: "Au maximum", b: "Abaissé sous les skimmers", c: "Complètement vidé", d: "Inchangé", correct: 'b' },
  { cat: 'Hivernage / Estivage', q: "Les gizzmos/flotteurs anti-gel se placent :", a: "Dans le local technique uniquement", b: "Dans les skimmers et refoulements", c: "Sur les margelles", d: "Dans le filtre à sable", correct: 'b' },
  { cat: 'Hivernage / Estivage', q: "Au printemps, avant de relancer la filtration, il faut d'abord :", a: "Faire un backwash complet du filtre", b: "Ajouter directement du chlore choc sans rien vérifier", c: "Couper l'eau du réseau", d: "Retirer le stabilisant du bassin", correct: 'a' },
  { cat: 'Hivernage / Estivage', q: "Après la remise en route, la filtration doit tourner en continu pendant environ :", a: "10 minutes", b: "24 à 48 heures", c: "1 mois", d: "Ce n'est pas nécessaire", correct: 'b' },
  { cat: 'Hivernage / Estivage', q: "Pourquoi hiverner une piscine hors-sol nécessite-t-il de la vidanger et sécher avant stockage ?", a: "Ce n'est pas nécessaire", b: "Pour éviter moisissures et détérioration du PVC", c: "Pour recharger la structure en eau", d: "Pour économiser de l'eau uniquement", correct: 'b' },
  { cat: 'Hivernage / Estivage', q: "Que faut-il éviter avec un hors-sol vidé en plein soleil ?", a: "Rien, c'est sans risque", b: "Le laisser vide trop longtemps : le PVC peut se déformer", c: "Le couvrir", d: "Le stocker au sec", correct: 'b' },

  // ============================================================
  // DÉPANNAGE MATÉRIEL
  // ============================================================
  { cat: 'Dépannage matériel', q: "Une pompe qui ne s'amorce plus doit d'abord faire vérifier :", a: "Le stabilisant de l'eau", b: "Une prise d'air (joint de préfiltre, niveau d'eau, vannes)", c: "Le taux de sel", d: "La couleur du liner", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Un bruit de 'gargouillis' au niveau de la pompe évoque :", a: "Un fonctionnement normal", b: "Une prise d'air", c: "Un excès de chlore", d: "Un TAC trop haut", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Une pompe qui chauffe anormalement peut être due à :", a: "Une ventilation insuffisante du local technique", b: "Un excès de stabilisant", c: "Un TAC trop bas", d: "Une eau trop froide", correct: 'a' },
  { cat: 'Dépannage matériel', q: "Une pression de filtre qui augmente de 0,2-0,3 bar signale généralement :", a: "Un manque d'eau dans le bassin", b: "Un filtre encrassé nécessitant un lavage", c: "Un excès de chlore", d: "Rien d'anormal", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Si la pression du filtre est anormalement basse, le problème est plutôt :", a: "En aval du filtre", b: "En amont du filtre (manque de débit, préfiltre bouché)", c: "Toujours le sable à changer", d: "Un excès de chlore", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Pour détecter une fuite, la méthode de référence est :", a: "Le test du seau (bucket test)", b: "Le test du pH", c: "Le test DPD1", d: "Un simple contrôle visuel suffit toujours", correct: 'a' },
  { cat: 'Dépannage matériel', q: "Si la fuite persiste filtration coupée, elle se situe plutôt :", a: "Sur le circuit hydraulique (canalisations, pompe, filtre)", b: "Sur la structure du bassin (liner, coque, pièces à sceller)", c: "Elle n'existe pas", d: "Dans le local technique uniquement", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Si la fuite n'apparaît qu'en filtration, elle se situe plutôt :", a: "Sur la structure du bassin", b: "Sur le circuit hydraulique", c: "Elle est impossible à localiser", d: "Toujours sur le liner", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Avant d'étalonner une sonde pH, il faut :", a: "La laisser sous tension et en régulation active", b: "Couper ou mettre en pause la régulation automatique", c: "La tremper directement dans le bassin", d: "Ne jamais la rincer", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Une sonde redox s'étalonne généralement avec une solution étalon proche de :", a: "465 mV", b: "7 pH", c: "0 mg/L", d: "100°C", correct: 'a' },
  { cat: 'Dépannage matériel', q: "Une PAC ne chauffe que lorsque :", a: "La filtration est en marche (contact de débit)", b: "Il fait nuit", c: "Le pH est à 7.4 exactement", d: "Le bassin est vide", correct: 'a' },
  { cat: 'Dépannage matériel', q: "En dessous de quelle température d'air extérieur un cycle de dégivrage de PAC est-il normal ?", a: "10-12°C", b: "25°C", c: "35°C", d: "Ce n'est jamais normal", correct: 'a' },
  { cat: 'Dépannage matériel', q: "Si une PAC disjoncte, il faut d'abord vérifier :", a: "L'absence d'humidité dans le boîtier électrique", b: "Le taux de sel de l'eau", c: "Le stabilisant", d: "La couleur du bassin", correct: 'a' },
  { cat: 'Dépannage matériel', q: "Pour remplacer un spot/projecteur de piscine, la première règle est :", a: "Travailler avec de l'eau pour refroidir", b: "Couper impérativement l'alimentation électrique au disjoncteur dédié", c: "Le faire sous tension pour tester immédiatement", d: "Retirer le hublot sans jamais couper le courant", correct: 'b' },

  // ============================================================
  // SÉCURITÉ & RÉGLEMENTATION
  // ============================================================
  { cat: 'Réglementation & sécurité', q: "Depuis quelle loi les piscines privées enterrées doivent-elles avoir un dispositif de sécurité ?", a: "Loi du 3 janvier 2003", b: "Loi du 1er janvier 2010", c: "Loi de 1995", d: "Il n'existe aucune loi de ce type", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "Quelle norme encadre les barrières de protection de piscine ?", a: "NF P90-306", b: "NF P90-307", c: "NF P90-308", d: "NF C15-100", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "Quelle norme encadre les alarmes de piscine ?", a: "NF P90-306", b: "NF P90-307", c: "NF P90-309", d: "NF C15-100", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Quelle norme encadre les couvertures de sécurité ?", a: "NF P90-306", b: "NF P90-307", c: "NF P90-308", d: "NF P90-309", correct: 'c' },
  { cat: 'Réglementation & sécurité', q: "Quelle norme encadre les abris de piscine ?", a: "NF P90-306", b: "NF P90-308", c: "NF P90-309", d: "NF C15-100", correct: 'c' },
  { cat: 'Réglementation & sécurité', q: "Quelle est la hauteur minimale réglementaire d'une barrière de piscine ?", a: "0.50 m", b: "1.10 m", c: "2.00 m", d: "3.00 m", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Combien de dispositifs de sécurité normalisés sont légalement obligatoires au minimum ?", a: "Aucun", b: "Un seul", c: "Les quatre en même temps", d: "Deux minimum", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Un dispositif de sécurité normalisé dispense-t-il de la surveillance d'un adulte ?", a: "Oui, totalement", b: "Non, il réduit le risque mais ne remplace jamais la surveillance active", c: "Oui, si c'est une alarme", d: "Oui, uniquement pour les piscines collectives", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Quelle amende maximale risque un propriétaire sans dispositif de sécurité obligatoire ?", a: "150 €", b: "1 500 €", c: "45 000 €", d: "Aucune amende n'est prévue", correct: 'c' },
  { cat: 'Réglementation & sécurité', q: "Quelle norme encadre les installations électriques à proximité d'un bassin ?", a: "NF C15-100 (section 702)", b: "NF P90-306", c: "NF EN 16713", d: "Il n'existe aucune norme électrique spécifique", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "Le tableau électrique dédié à la piscine doit comporter un différentiel de :", a: "10 mA", b: "30 mA", c: "300 mA", d: "Aucun différentiel n'est requis", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "À quelle distance minimale du bassin le local technique doit-il idéalement être installé pour limiter les contraintes électriques ?", a: "0.50 m", b: "1 m", c: "3.50 m", d: "20 m", correct: 'c' },
  { cat: 'Réglementation & sécurité', q: "Peut-on stocker du chlore et de l'acide côte à côte ?", a: "Oui, sans problème", b: "Non, jamais : risque de dégagement de gaz toxique ou réaction violente", c: "Oui, si le local est aéré", d: "Uniquement en petite quantité", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Lors d'une dilution, il faut toujours :", a: "Verser l'eau dans le produit concentré", b: "Verser le produit dans l'eau, jamais l'inverse", c: "Mélanger les produits d'abord", d: "Chauffer le mélange", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Le chlore peut libérer un composé dangereux en cas de mélange/humidification : lequel ?", a: "Le dioxyde de carbone", b: "Le trichlorure d'azote", c: "L'ozone", d: "Le méthane", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Pour un stockage de chlore gazeux en grande quantité, le cadre ICPE impose une déclaration à partir de :", a: "1 kg", b: "100 kg", c: "10 tonnes", d: "Aucune déclaration n'est jamais nécessaire", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "En cas d'inhalation de chlore, le premier réflexe est :", a: "Faire boire la victime immédiatement", b: "Évacuer la victime à l'air frais et la mettre au repos", c: "La faire marcher rapidement pour évacuer le gaz", d: "Ne rien faire, cela passe seul", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Le chlore gazeux, plus lourd que l'air, a tendance à :", a: "S'élever rapidement", b: "Stagner au sol", c: "Se disperser instantanément sans risque", d: "Ne jamais se propager", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Quel numéro appeler en cas de symptômes respiratoires graves après exposition au chlore ?", a: "Le 15 ou le 112", b: "Le service client du fabricant", c: "Aucun numéro n'est nécessaire", d: "Le numéro de la mairie", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "Le rejet direct des eaux de vidange dans un cours d'eau est :", a: "Autorisé sans condition", b: "Interdit (article L211-2 du Code de l'environnement)", c: "Obligatoire", d: "Sans réglementation particulière", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Avant une vidange, il faut arrêter le traitement au chlore pendant environ :", a: "1 jour", b: "15 jours", c: "1 heure", d: "Ce n'est pas nécessaire", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Le rejet au réseau collectif d'eaux usées est :", a: "Systématiquement autorisé", b: "En principe interdit sauf dérogation du service d'assainissement", c: "Interdit dans tous les cas sans exception", d: "Non réglementé", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Quel document obligatoire doit être tenu à jour pour une piscine collective ?", a: "Le carnet sanitaire", b: "Le carnet d'entretien du robot", c: "Le contrat d'assurance uniquement", d: "Aucun document n'est requis", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "Dans une piscine collective, la fréquence minimale d'autocontrôle interne est :", a: "Une fois par mois", b: "Une fois par jour minimum", c: "Une fois par saison", d: "Il n'y a pas d'obligation", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Le contrôle sanitaire externe d'une piscine collective est réalisé par :", a: "Le pisciniste lui-même uniquement", b: "Un laboratoire agréé, pour le compte de l'ARS", c: "La mairie directement", d: "Aucun contrôle externe n'existe", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Les établissements collectifs sont classés selon combien de types (A à D) déterminant la fréquence de contrôle ?", a: "2", b: "4", c: "10", d: "Il n'y a pas de classification", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "La légionellose est causée par :", a: "Un excès de chlore", b: "La bactérie Legionella pneumophila", c: "Un manque de sel", d: "Le stabilisant", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Pourquoi les spas sont-ils particulièrement à risque de légionellose ?", a: "Leur température (30-40°C) favorise la prolifération de la bactérie", b: "Ils ne contiennent jamais de chlore", c: "Ils sont toujours en extérieur", d: "Ce risque n'existe pas dans les spas", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "La prévention de la légionellose passe notamment par :", a: "Un contrôle rigoureux du désinfectant et une vidange/nettoyage réguliers des canalisations", b: "Une température plus élevée du spa", c: "L'arrêt total de la filtration", d: "L'ajout de sel uniquement", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "La noyade est la première cause de mort accidentelle chez :", a: "Les adolescents de plus de 15 ans", b: "Les enfants de moins de 5 ans disposant d'une piscine privée", c: "Les adultes de plus de 60 ans", d: "Ce n'est pas une cause de mortalité notable", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Que faut-il faire systématiquement après chaque utilisation d'une alarme ou couverture de sécurité ?", a: "Rien, elles se réarment seules toujours", b: "La réarmer / refermer systématiquement", c: "La débrancher", d: "La ranger définitivement", correct: 'b' },

  // ============================================================
  // CALCULS & FORMULES
  // ============================================================
  { cat: 'Calculs & formules', q: "Quelle formule permet de calculer le volume d'un bassin rectangulaire ?", a: "Longueur × Largeur × Profondeur moyenne", b: "Longueur + Largeur + Profondeur", c: "Longueur × Largeur uniquement", d: "Rayon² × π", correct: 'a' },
  { cat: 'Calculs & formules', q: "Quelle formule permet de calculer le volume d'un bassin rond ?", a: "Diamètre × Profondeur", b: "Rayon² × π × Profondeur moyenne", c: "Longueur × Largeur × 0.89", d: "Rayon × Profondeur", correct: 'b' },
  { cat: 'Calculs & formules', q: "Quel coefficient applique-t-on pour un bassin ovale ?", a: "0.5", b: "0.89", c: "1.5", d: "3.14", correct: 'b' },
  { cat: 'Calculs & formules', q: "Pour une forme libre, quelle estimation rapide utilise-t-on ?", a: "Longueur max × Largeur max × Profondeur moyenne × 0.85", b: "Longueur × Largeur × 2", c: "Uniquement la profondeur maximale", d: "Il n'existe aucune méthode d'estimation", correct: 'a' },
  { cat: 'Calculs & formules', q: "1 m³ correspond à combien de litres ?", a: "10 litres", b: "100 litres", c: "1 000 litres", d: "10 000 litres", correct: 'c' },
  { cat: 'Calculs & formules', q: "Pour calculer un volume, il faut privilégier :", a: "La profondeur maximale", b: "La profondeur moyenne", c: "La profondeur minimale", d: "Une profondeur fixe de 1 m toujours", correct: 'b' },
  { cat: 'Calculs & formules', q: "La dose d'un produit de traitement est généralement indiquée sur l'emballage en :", a: "g ou mL par m³", b: "kg par piscine, sans rapport au volume", c: "Litres par jour", d: "Aucune indication n'est jamais donnée", correct: 'a' },
  { cat: 'Calculs & formules', q: "Pour un gros écart à corriger, il vaut mieux :", a: "Verser toute la dose d'un coup", b: "Fractionner en plusieurs apports espacés de quelques heures", c: "Ne jamais dépasser une seule dose par semaine", d: "Ignorer la dose indiquée", correct: 'b' },
  { cat: 'Calculs & formules', q: "La formule générale de dosage du chlore choc est :", a: "Dose = Volume × Concentration visée ÷ Concentration du produit", b: "Dose = Volume + Concentration", c: "Dose = Profondeur × pH", d: "Dose = TAC × Volume", correct: 'a' },
  { cat: 'Calculs & formules', q: "Une eau très verte peut nécessiter de monter ponctuellement le chlore choc jusqu'à :", a: "1-2 g/m³", b: "25-30 g/m³", c: "500 g/m³", d: "Aucune augmentation n'est jamais possible", correct: 'b' },
  { cat: 'Calculs & formules', q: "Quelle est la règle simplifiée de durée de filtration ?", a: "Température (°C) ÷ 2 = heures de filtration", b: "Température × 2 = heures de filtration", c: "Toujours 8h par jour, quelle que soit la température", d: "Toujours 24h par jour", correct: 'a' },
  { cat: 'Calculs & formules', q: "À 24°C, quelle durée de filtration la règle professionnelle recommande-t-elle ?", a: "6h", b: "12h", c: "20h", d: "24h obligatoirement", correct: 'b' },
  { cat: 'Calculs & formules', q: "En dessous de quelle température la filtration peut-elle être fortement réduite ?", a: "12°C", b: "20°C", c: "25°C", d: "30°C", correct: 'a' },

  // ============================================================
  // TYPES DE BASSINS & GLOSSAIRE
  // ============================================================
  { cat: 'Glossaire', q: "Qu'est-ce qu'un skimmer ?", a: "Une pompe de filtration", b: "Une écumoire intégrée à la paroi qui aspire l'eau de surface", c: "Un produit chimique", d: "Un type de revêtement", correct: 'b' },
  { cat: 'Glossaire', q: "Qu'est-ce que le 'backwash' ?", a: "Un type d'algue", b: "Le contre-lavage : inversion du sens de circulation pour nettoyer un filtre", c: "Une norme de sécurité", d: "Un produit anti-calcaire", correct: 'b' },
  { cat: 'Glossaire', q: "Que désigne la 'ligne d'eau' ?", a: "Le tuyau d'aspiration principal", b: "La bande à la surface où se déposent calcaire, graisses et pollens", c: "Le niveau maximal légal de remplissage", d: "Une norme de filtration", correct: 'b' },
  { cat: 'Glossaire', q: "Qu'est-ce que le 'refoulement' ?", a: "La buse qui renvoie l'eau filtrée dans le bassin", b: "Un défaut du filtre", c: "Le rejet des eaux usées", d: "Un type d'algue", correct: 'a' },
  { cat: 'Glossaire', q: "Qu'est-ce qu'une piscine à débordement/miroir utilise pour capter l'eau de surface ?", a: "Un skimmer classique uniquement", b: "Des goulottes menant à un bac tampon", c: "Une bonde de fond uniquement", d: "Rien de spécifique", correct: 'b' },
  { cat: 'Glossaire', q: "Une piscine 'miroir' se caractérise par :", a: "Un débordement total sur tous les côtés, eau au niveau du sol", b: "Une couleur miroir du liner", c: "L'absence totale de filtration", d: "Un traitement obligatoire au brome", correct: 'a' },
  { cat: 'Glossaire', q: "Un revêtement liner (PVC souple) est sensible à :", a: "Rien, il est increvable", b: "Aux perforations et à la décoloration", c: "Uniquement au gel", d: "Uniquement au chlore choc", correct: 'b' },
  { cat: 'Glossaire', q: "Le PVC armé, comparé au liner classique, est :", a: "Moins résistant", b: "Plus résistant et étanche, soudé", c: "Identique en tout point", d: "Interdit pour les formes complexes", correct: 'b' },
  { cat: 'Glossaire', q: "Un bassin en coque polyester est réputé pour :", a: "Être très rugueux et accrocher les algues", b: "Être très lisse, avec peu d'accroche pour les algues", c: "Ne jamais pouvoir être réparé", d: "Nécessiter un traitement spécial obligatoire", correct: 'b' },
  { cat: 'Glossaire', q: "Un revêtement en béton/carrelage est plus sujet aux :", a: "Algues noires dans les joints (surface poreuse)", b: "Perforations comme un liner", c: "Décolorations rapides", d: "Aucun risque particulier", correct: 'a' },
  { cat: 'Glossaire', q: "Une piscine gonflable se caractérise par :", a: "Un grand volume et une forte inertie", b: "Un très faible volume, souvent renouvelé plutôt que traité en continu", c: "Un équipement fixe obligatoire", d: "Un traitement au sel systématique", correct: 'b' },
  { cat: 'Glossaire', q: "La caisse à outils d'un pisciniste doit contenir en priorité :", a: "Un testeur d'eau, des produits de traitement de base et des EPI", b: "Uniquement un maillot de bain", c: "Rien de spécifique n'est nécessaire", d: "Uniquement des produits de nettoyage ménager", correct: 'a' },
  { cat: 'Glossaire', q: "Les EPI indispensables lors de la manipulation de produits concentrés sont :", a: "Gants et lunettes de protection", b: "Un casque de chantier uniquement", c: "Aucun EPI n'est nécessaire", d: "Une combinaison intégrale toujours obligatoire", correct: 'a' },
  { cat: 'Glossaire', q: "Que signifie l'abréviation TAC ?", a: "Titre Alcalimétrique Complet", b: "Taux Automatique de Chlore", c: "Test d'Analyse Chimique", d: "Traitement Anti-Calcaire", correct: 'a' },
  { cat: 'Glossaire', q: "Que signifie l'abréviation TH ?", a: "Température Hydraulique", b: "Titre Hydrotimétrique (dureté de l'eau)", c: "Test Hebdomadaire", d: "Traitement Hivernal", correct: 'b' },
  { cat: 'Glossaire', q: "Que signifie DPD dans le contexte de l'analyse d'eau ?", a: "Le nom du réactif utilisé pour mesurer le chlore", b: "Un type de robot", c: "Une norme de sécurité électrique", d: "Un type de filtre", correct: 'a' },
  { cat: 'Glossaire', q: "Que signifie 'ppm' ?", a: "Parties par million (équivalent à mg/L pour l'eau)", b: "Pression Par Minute", c: "Un type de pompe", d: "Un produit chimique spécifique", correct: 'a' },

  // ============================================================
  // ANALYSE & ROUTINE (pratique terrain)
  // ============================================================
  { cat: 'Analyse & routine', q: "Dans quel ordre se déroule logiquement une tournée d'entretien type ?", a: "Test pH/chlore d'abord, puis tout le reste au hasard", b: "Contrôle visuel, niveau d'eau, skimmers/préfiltre, brossage, puis tests et ajustements", c: "Uniquement passer le robot", d: "Uniquement remplir le carnet de suivi", correct: 'b' },
  { cat: 'Analyse & routine', q: "Un léger trouble naissant de l'eau, même faible, doit :", a: "Être ignoré jusqu'au prochain passage", b: "Être corrigé avant qu'il ne s'aggrave", c: "Toujours être traité par une vidange complète", d: "Être signalé uniquement s'il devient vert foncé", correct: 'b' },
  { cat: 'Analyse & routine', q: "Une baisse de niveau d'eau plus rapide que d'habitude, sans explication, doit faire suspecter :", a: "Une simple évaporation normale à ignorer", b: "Une fuite potentielle", c: "Un excès de chlore", d: "Un TAC trop haut", correct: 'b' },
  { cat: 'Analyse & routine', q: "Une pompe qui se désamorce fréquemment est un signe :", a: "Sans importance", b: "À ne jamais laisser filer, précurseur d'une panne plus lourde", c: "De TAC trop bas", d: "D'un excès de stabilisant", correct: 'b' },
  { cat: 'Analyse & routine', q: "Une odeur de chlore inhabituellement forte doit plutôt faire penser à :", a: "Un manque réel de chlore libre (chlore combiné élevé)", b: "Un excès de chlore actif sans aucun souci", c: "Un TH trop bas", d: "Rien de particulier", correct: 'a' },
  { cat: 'Analyse & routine', q: "Face à un doute sur un signal d'alerte pendant une visite, le bon réflexe est :", a: "Attendre le prochain passage sans rien dire", b: "Faire un test complémentaire ou prévenir le client tout de suite", c: "Ignorer et continuer la tournée", d: "Vidanger immédiatement le bassin", correct: 'b' },
  { cat: 'Analyse & routine', q: "Des fissures ou décolorations sur le revêtement observées lors d'une visite doivent être :", a: "Ignorées si elles ne s'aggravent pas immédiatement", b: "Signalées et surveillées d'un passage à l'autre", c: "Réparées immédiatement sans en avertir le client", d: "Cachées pour ne pas inquiéter le client", correct: 'b' },
  { cat: 'Analyse & routine', q: "L'état des joints, vannes et raccords doit être vérifié :", a: "Une seule fois à l'installation", b: "Régulièrement, car ils se dégradent progressivement même avec un bon entretien", c: "Jamais, ce n'est pas nécessaire", d: "Uniquement en cas de fuite déjà visible", correct: 'b' },

  // ============================================================
  // QUESTIONS COMPLÉMENTAIRES (culture générale du métier)
  // ============================================================
  { cat: "Chimie de l'eau", q: "Le chlore total correspond à :", a: "Chlore libre seulement", b: "Chlore libre + chlore combiné", c: "Chlore combiné seulement", d: "Le TAC additionné au chlore", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Un pH trop bas rend l'eau :", a: "Calcaire et douce pour la peau", b: "Acide, agressive pour les équipements et la peau", c: "Sans aucun effet notable", d: "Automatiquement plus riche en chlore", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Pour augmenter le pH, on utilise :", a: "Du pH- (réducteur)", b: "Du pH+ (rehausseur)", c: "Du sel", d: "Du floculant", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Pour baisser le pH, on utilise :", a: "Du pH+ (rehausseur)", b: "Du pH- (réducteur)", c: "Du stabilisant", d: "Du chlore choc uniquement", correct: 'b' },
  { cat: "Chimie de l'eau", q: "Combien de temps faut-il généralement attendre, filtration en marche, avant de recontrôler après un ajustement de pH ?", a: "10 secondes", b: "2 à 4 heures", c: "1 mois", d: "Aucune attente n'est nécessaire", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Avant de traiter des algues moutarde, il faut aussi penser à laver soigneusement :", a: "Uniquement les margelles", b: "Le filtre, où elles se logent", c: "Uniquement le robot", d: "Rien d'autre que le bassin", correct: 'b' },
  { cat: "Traitement de l'eau", q: "Sur quel type de revêtement ne faut-il jamais utiliser de brosse inox ?", a: "Le béton", b: "Le carrelage", c: "Le liner", d: "Aucune restriction n'existe", correct: 'c' },
  { cat: "Traitement de l'eau", q: "La cellule d'un électrolyseur doit être :", a: "Jamais entretenue", b: "Détartrée périodiquement en cas de dépôt blanchâtre", c: "Remplacée chaque semaine", d: "Nettoyée à l'eau de javel concentrée", correct: 'b' },
  { cat: 'Filtration', q: "Un filtre à diatomées nécessite :", a: "Un entretien plus technique avec rechargement périodique", b: "Aucun entretien", c: "Un remplacement complet chaque mois", d: "Le même entretien qu'un filtre à cartouche", correct: 'a' },
  { cat: 'Filtration', q: "Le rechargement d'un filtre à diatomées se fait généralement :", a: "Par le fond du bassin", b: "Par le skimmer, pompe en marche", c: "Directement dans le local technique sans eau", d: "Ce n'est jamais nécessaire", correct: 'b' },
  { cat: 'Filtration', q: "Purger l'air d'un circuit de filtration se fait via :", a: "Le purgeur d'air situé sur le dessus du filtre", b: "Le skimmer uniquement", c: "Le tableau électrique", d: "Il n'existe pas de purgeur", correct: 'a' },
  { cat: 'Nettoyage', q: "Le préfiltre de la pompe doit être nettoyé :", a: "Jamais", b: "Régulièrement, notamment quand il se colmate", c: "Uniquement après un choc chlore", d: "Uniquement en hiver", correct: 'b' },
  { cat: 'Nettoyage', q: "Un clapet anti-retour situé au fond d'un skimmer sert à :", a: "Empêcher l'eau de repartir dans le mauvais sens", b: "Chauffer l'eau", c: "Mesurer le pH", d: "Rien de particulier", correct: 'a' },
  { cat: 'Dépannage matériel', q: "Un condensateur défectueux peut expliquer :", a: "Une eau trop verte", b: "Qu'un moteur monophasé peine à démarrer", c: "Un excès de stabilisant", d: "Une fuite sur le bassin", correct: 'b' },
  { cat: 'Dépannage matériel', q: "Pour rechercher une fuite plus finement qu'avec le test du seau, on peut utiliser :", a: "Un colorant traceur ou une électro-détection spécialisée", b: "Uniquement l'odorat", c: "Un test de pH", d: "Aucune méthode complémentaire n'existe", correct: 'a' },
  { cat: 'Hivernage / Estivage', q: "L'hivernage actif, comparé au passif, consiste à :", a: "Vider totalement le bassin", b: "Laisser tourner la filtration au ralenti plutôt que de tout arrêter", c: "Retirer tous les équipements", d: "Ne jamais traiter l'eau", correct: 'b' },
  { cat: 'Hivernage / Estivage', q: "Pourquoi hiverner une piscine dans les régions à gel est-il important ?", a: "Pour éviter l'éclatement des canalisations gelées", b: "Pour économiser de l'eau uniquement", c: "Pour changer la couleur du liner", d: "Ce n'est utile que pour les piscines collectives", correct: 'a' },
  { cat: 'Réglementation & sécurité', q: "Le port de gants et lunettes est particulièrement requis lors de :", a: "La lecture du carnet sanitaire", b: "La manipulation de produits chimiques concentrés", c: "Le passage du robot", d: "Le brossage des parois", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Un local technique doit être :", a: "Fermé hermétiquement sans aucune aération", b: "Aéré, à l'abri du soleil et d'une chaleur excessive", c: "Toujours humide en permanence", d: "Sans contrainte particulière", correct: 'b' },
  { cat: 'Réglementation & sécurité', q: "Le portillon d'une barrière de piscine doit avoir :", a: "Une fermeture et un verrouillage automatiques", b: "Aucune fermeture nécessaire", c: "Un simple loquet manuel suffit toujours", d: "Une hauteur inférieure à la barrière", correct: 'a' },
  { cat: 'Calculs & formules', q: "Le volume d'un bassin ovale de 8m × 4m × 1.5m de profondeur moyenne est environ :", a: "16 m³", b: "42.7 m³", c: "48 m³", d: "96 m³", correct: 'b' },
  { cat: 'Calculs & formules', q: "Pourquoi utilise-t-on un coefficient réducteur (0.85, 0.89) pour les formes ovales/libres ?", a: "Pour majorer le volume par sécurité", b: "Car ces formes contiennent moins d'eau qu'un simple rectangle de mêmes dimensions", c: "Ce coefficient n'a aucune justification", d: "Pour compenser le stabilisant", correct: 'b' },
  { cat: 'Glossaire', q: "Qu'appelle-t-on communément le 'local technique' ?", a: "L'endroit où se trouvent pompe, filtre et éventuellement PAC/électrolyseur", b: "Le vestiaire du client", c: "Le skimmer principal", d: "La zone de baignade peu profonde", correct: 'a' },
  { cat: 'Glossaire', q: "Que désigne une 'plage' de piscine ?", a: "Le pourtour aménagé autour du bassin", b: "Une zone de baignade peu profonde", c: "Un type de filtre", d: "Un produit de traitement", correct: 'a' },
  { cat: 'Glossaire', q: "Qu'est-ce qu'un 'diffuseur flottant' ?", a: "Un accessoire flottant contenant des galets de chlore lent", b: "Un type de robot", c: "Un instrument de mesure du pH", d: "Une pièce du filtre à sable", correct: 'a' },
  { cat: 'Glossaire', q: "Une 'pièce à sceller' désigne :", a: "Un élément fixé dans la structure du bassin (skimmer, buse, projecteur...)", b: "Un outil de mesure", c: "Un produit chimique", d: "Un type de couverture de sécurité", correct: 'a' },
]

const lines = []
lines.push('-- ============================================================')
lines.push('-- SEED : Banque de questions "Code du pisciniste"')
lines.push('-- ============================================================')
lines.push('DELETE FROM quiz_questions;')
lines.push("DELETE FROM sqlite_sequence WHERE name = 'quiz_questions';")
lines.push('')

const esc = (s) => (s || '').replace(/'/g, "''")
Q.forEach((item) => {
  lines.push(`INSERT INTO quiz_questions (category, question, option_a, option_b, option_c, option_d, correct, explanation) VALUES ('${esc(item.cat)}', '${esc(item.q)}', '${esc(item.a)}', '${esc(item.b)}', '${esc(item.c)}', '${esc(item.d)}', '${item.correct}', ${item.exp ? `'${esc(item.exp)}'` : 'NULL'});`)
})

lines.push('')
lines.push('-- Fin du seed quiz')

writeFileSync(new URL('../seed-quiz.sql', import.meta.url), lines.join('\n'))
console.log(`seed-quiz.sql généré : ${Q.length} questions, ${lines.length} lignes`)
