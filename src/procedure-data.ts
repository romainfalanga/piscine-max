// Historical reference sheets from the existing repository. Review technical/regulatory content before broad release.
export const REFERENCE_PROCEDURES = [
  {
    "title": "Ajuster le TAC (alcalinité)",
    "category": "Traitement de l'eau",
    "summary": "Toujours le premier paramètre à corriger, avant le pH.",
    "body": "1. Mesurer le TAC (cible 80-120 mg/L / 8-12 °f) avant toute autre correction : c'est toujours le premier paramètre à régler.\n2. Si le TAC est trop bas : ajouter un rehausseur de TAC (bicarbonate de sodium), filtration en marche, en une ou plusieurs fois selon la dose totale à apporter.\n3. Si le TAC est trop haut : ajouter un réducteur de TAC (acide) par petites doses successives, en laissant agir et recirculer entre chaque ajout.\n4. Attendre plusieurs heures (idéalement 24h) filtration en marche avant de recontrôler.\n5. Une fois le TAC stabilisé, passer au réglage du pH.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Ajuster le pH (hausse et baisse)",
    "category": "Traitement de l'eau",
    "summary": "À régler après le TAC, en plusieurs petits ajouts.",
    "body": "1. Mesurer le pH (cible 7.2-7.4) après avoir réglé le TAC.\n2. Pour baisser le pH : verser le pH- (liquide ou poudre) directement dans le bassin, filtration en marche, en respectant la dose indiquée sur l'emballage pour le volume du bassin.\n3. Pour augmenter le pH : verser le pH+ de la même façon.\n4. Ne jamais mélanger pH- et pH+ dans le même traitement, et ne jamais verser un produit concentré directement sur le revêtement ou dans le skimmer.\n5. Attendre au moins 2 à 4h, filtration en marche, avant de recontrôler et ajuster à nouveau si besoin.\n6. Répartir en plusieurs petits ajouts plutôt qu'une grosse dose unique pour éviter les à-coups.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Calculer le dosage d'un produit selon le volume du bassin",
    "category": "Calculs & formules",
    "summary": "Méthode en 4 étapes pour doser correctement.",
    "body": "La quasi-totalité des produits de traitement (pH+/pH-, chlore choc, rehausseur/réducteur de TAC, anti-algues) sont dosés en fonction du volume d'eau du bassin, indiqué sur l'emballage en g ou mL par m³.\nMéthode : 1) connaître le volume exact du bassin (voir fiche calcul de volume) ; 2) mesurer l'écart entre la valeur actuelle et la valeur cible du paramètre ; 3) appliquer la dose indiquée par le fabricant pour cet écart et ce volume ; 4) fractionner les doses importantes en plusieurs apports espacés de quelques heures plutôt qu'un apport unique, pour limiter les à-coups et mieux contrôler le résultat.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Calculer le volume d'un bassin selon sa forme",
    "category": "Calculs & formules",
    "summary": "Formules par forme + conversion en litres.",
    "body": "Rectangulaire : Longueur × Largeur × Profondeur moyenne.\nRonde : Rayon × Rayon × 3,14 × Profondeur moyenne.\nOvale : Longueur × Largeur × Profondeur moyenne × 0,89.\nForme libre : décomposer le bassin en formes géométriques simples et additionner les volumes obtenus, ou utiliser l'estimation rapide Longueur max × Largeur max × Profondeur moyenne × 0,85.\nToujours privilégier la profondeur moyenne (et non la profondeur maximale) pour un résultat fiable. Conversion : 1 m³ = 1 000 litres.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Cavitation et prise d'air : comprendre et différencier",
    "category": "Équipements",
    "summary": "Deux pathologies d'aspiration souvent confondues, aux causes et remèdes différents.",
    "body": "La cavitation : quand la pression à l'aspiration descend trop bas, l'eau \"bout\" localement et forme des bulles de vapeur qui implosent sur la turbine. Symptômes : bruit de graviers/cailloux dans la pompe, vibrations, débit qui chute, turbine érodée à terme. Causes typiques : aspiration trop longue ou de section trop faible, pompe placée trop haut au-dessus du plan d'eau (limite pratique ~3 m en piscine), vanne d'aspiration à moitié fermée. Remède : redonner de la section/de la charge à l'aspiration, ouvrir les vannes en grand, rapprocher/abaisser la pompe.\nLa prise d'air : de l'air entre dans le circuit d'aspiration par un défaut d'étanchéité. Symptômes : bulles aux buses de refoulement, couvercle de préfiltre jamais complètement plein, pompe qui se désamorce, bruit de gargouillis. Causes typiques : niveau d'eau trop bas au skimmer, joint de couvercle de préfiltre sec ou encrassé, raccord union desserré, vanne fuyarde. Remède : niveau d'eau à mi-skimmer, joint de couvercle propre et graissé (silicone), contrôle des raccords un à un.\nComment les différencier sur le terrain : la prise d'air se voit (air dans le préfiltre, bulles au refoulement) ; la cavitation s'entend (bruit de cailloux) avec un préfiltre pourtant plein d'eau.\nLes deux détruisent la pompe à petit feu : turbine pour la cavitation, garniture et amorçage pour la prise d'air. Ne jamais laisser durer.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Changer le préfiltre de la pompe",
    "category": "Filtration",
    "summary": "Nettoyer ou remplacer le panier du préfiltre pompe.",
    "body": "1. Couper l'alimentation électrique de la pompe.\n2. Fermer les vannes d'aspiration si présentes.\n3. Dévisser et retirer le couvercle transparent du préfiltre.\n4. Sortir le panier, le vider et le rincer au jet.\n5. Vérifier l'état du joint torique, le graisser légèrement si besoin.\n6. Remettre le panier, refermer le couvercle, réamorcer la pompe (remplir d'eau avant de redémarrer).\n7. Rouvrir les vannes puis remettre sous tension.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Chlore libre, combiné et total : bien comprendre les chloramines",
    "category": "Chimie de l'eau",
    "summary": "Le chlore combiné ne désinfecte plus et sent fort : c'est un signe de sous-chloration.",
    "body": "Le chlore libre est la fraction active du chlore, celle qui désinfecte réellement l'eau. Le chlore combiné (chloramines) résulte de la réaction du chlore avec les matières organiques apportées par les baigneurs (sueur, urée, crèmes solaires) : il ne désinfecte plus et c'est lui qui est responsable de l'odeur de \"chlore\" typique et des irritations des yeux : une eau qui sent fort le chlore est en réalité souvent sous-chlorée.\nLe chlore total = chlore libre + chlore combiné. Un chlore combiné supérieur à 0,4-0,6 mg/L impose un traitement choc pour \"casser\" les chloramines et retrouver du chlore libre actif.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Comparatif des méthodes de test d'eau",
    "category": "Chimie de l'eau",
    "summary": "Bandelettes, gouttes, pastilles DPD, photomètre : précision et usage.",
    "body": "Bandelettes réactives : trempette de 5 secondes, lecture après 10-15 secondes par comparaison colorimétrique. Rapides et pratiques pour un contrôle quotidien, mais précision limitée et sensibles à la péremption.\nTrousse à gouttes (réactifs liquides) : quelques gouttes de réactif dans une éprouvette d'eau, lecture par comparaison de couleur. Un peu plus précises que les bandelettes, matériel économique.\nPastilles DPD (Phenol Red pour le pH, DPD1 pour le chlore libre, DPD3 pour le chlore total) : méthode de référence des professionnels sur le terrain, bon compromis précision/rapidité.\nPhotomètre électronique : lecture optique numérique, la plus précise, multi-paramètres (pH, chlore libre/total, TAC, TH, stabilisant, sel...), incontournable pour un usage professionnel régulier ou une piscine collective.\nPour un résultat fiable quelle que soit la méthode : prélever l'échantillon à 30-40 cm de profondeur, loin des points d'injection de produit, et tester rapidement après le prélèvement.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Contrôler et purger la pression du filtre",
    "category": "Filtration",
    "summary": "Surveillance du manomètre pour anticiper le colmatage du filtre.",
    "body": "1. Relever la pression au manomètre en filtration normale (valeur de référence à noter dès l'installation, ex. 0,6 à 0,8 bar).\n2. Si la pression a augmenté de 0,2 à 0,3 bar par rapport à la valeur de référence, le filtre est encrassé : procéder à un lavage (backwash pour sable/diatomées, nettoyage pour cartouche).\n3. Si la pression est anormalement basse, vérifier qu'il n'y a pas de manque de débit en amont (préfiltre bouché, vanne fermée).\n4. Après un backwash, purger l'air résiduel du filtre via le purgeur avant de remettre en filtration.\n5. Noter la pression après nettoyage pour garder une référence à jour.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Dimensionner pompe et filtre : débit, HMT, vitesse de filtration",
    "category": "Calculs & formules",
    "summary": "Le trio débit requis / HMT / débit admissible du filtre : et pourquoi une pompe trop puissante filtre MOINS bien.",
    "body": "Débit requis : l'eau du bassin doit être recyclée en 4 heures. Débit (m³/h) = Volume (m³) ÷ 4, majoré d'environ 20% pour les pertes de charge. Exemple : 48 m³ → 12 m³/h → pompe de 14-15 m³/h.\nHMT (hauteur manométrique totale) : la \"résistance\" que la pompe doit vaincre = hauteur géométrique + pertes de charge (longueur de tuyaux, coudes, filtre, PAC, traitement). Le débit annoncé en gros sur le carton est souvent donné à HMT faible : toujours lire la COURBE de la pompe et choisir au point de fonctionnement réel (souvent ~10 m CE en piscine).\nAdéquation pompe/filtre : le débit de la pompe ne doit JAMAIS dépasser le débit admissible du filtre. La vitesse de filtration maximale est de 50 m³/h par m² de surface filtrante : filtre Ø500 → ~9,8 m³/h max ; Ø600 → ~14 m³/h ; Ø750 → ~22 m³/h. Une pompe trop puissante fait passer les impuretés à travers le média, creuse des canaux dans le sable et peut casser les crépines : filtrer plus vite = filtrer moins bien.\nVitesses d'eau en canalisation : viser au maximum 1,5 m/s à l'aspiration et 2 à 2,5 m/s au refoulement : d'où les diamètres Ø50 (jusqu'à ~7-8 m³/h par ligne) et Ø63 (11-12 m³/h).\nEn cas de doute : surdimensionner le FILTRE (meilleure finesse, lavages espacés), jamais la pompe.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Durée de filtration recommandée selon la température de l'eau",
    "category": "Calculs & formules",
    "summary": "La règle professionnelle : température divisée par 2.",
    "body": "Règle professionnelle simple : durée de filtration (en heures) = température de l'eau (°C) ÷ 2. Exemple : 24°C → 12h de filtration/jour, 28°C → 14h, 30°C → 15h.\nEn dessous de 12°C, les micro-organismes ne prolifèrent quasiment plus : la filtration peut être fortement réduite. Au-dessus de 28°C, la filtration doit tourner en continu (24h/24) pour éviter qu'une eau chaude ne verdisse en 24 à 48h.\nCette règle reste indicative : l'adapter à la fréquentation du bassin (plus de baigneurs = plus de filtration) et à l'environnement (végétation, exposition au vent).",
    "type": "information",
    "important": 1
  },
  {
    "title": "Effectuer une tournée d'entretien hebdomadaire type",
    "category": "Analyse & routine",
    "summary": "L'ordre d'intervention standard d'un professionnel sur un bassin, en moins de 30 minutes.",
    "body": "1. Contrôle visuel général en arrivant : couleur de l'eau, niveau, propreté de la plage, état de la couverture/alarme.\n2. Vérifier et ajuster le niveau d'eau (idéalement à mi-hauteur des skimmers).\n3. Vider et rincer les paniers de skimmer et le préfiltre de la pompe.\n4. Brosser les parois, le fond et la ligne d'eau si nécessaire.\n5. Passer l'épuisette de surface ou lancer le robot électrique.\n6. Contrôler la pression au filtre, faire un backwash si besoin.\n7. Tester pH et chlore (et TAC une fois par mois), ajuster les produits en conséquence.\n8. Vérifier le bon fonctionnement des équipements (pompe, PAC, électrolyseur, éclairage).\n9. Consigner l'intervention (relevés, produits ajoutés, anomalies constatées) dans le carnet de suivi ou l'application.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Erreurs courantes de mesure du pH et du chlore",
    "category": "Chimie de l'eau",
    "summary": "La majorité des résultats aberrants viennent d'une erreur de prélèvement ou de réactif, pas de l'eau elle-même.",
    "body": "Réactifs périmés : les réactifs liquides (DPD, phénol red) se conservent environ un an ; passé ce délai, les résultats deviennent peu fiables.\nContamination : toucher l'embout du flacon ou la bandelette avec les doigts, ou mal refermer un bouchon, contamine le réactif et fausse durablement les tests suivants.\nStockage inadapté : conserver les réactifs à l'abri de la lumière et de la chaleur (5 à 22°C) ; un flacon laissé au soleil dans la caisse à outils se dégrade vite.\nMauvais timing de lecture : lire trop tôt ou trop tard après la réaction chimique change la couleur perçue et donc la valeur lue.\npH trop bas ou trop haut faussant la lecture du chlore : en dessous de 7,0 ou au-dessus de 7,8, l'efficacité et la détection du chlore par les réactifs se dégradent : toujours contrôler le pH en même temps que le chlore.\nPrélèvement non représentatif : un échantillon pris en surface ou juste après un ajout de produit ne reflète pas l'état réel du bassin.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Faire un contre-lavage (backwash) et un rinçage dans les règles",
    "category": "Filtration",
    "summary": "La manœuvre la plus fréquente du métier : et celle où l'on abîme le plus de vannes multivoies.",
    "body": "1. Relever la pression au manomètre : un lavage se déclenche quand elle dépasse de 0,3 à 0,5 bar la pression de référence (filtre propre), ou au moins une fois par mois en saison.\n2. ARRÊTER LA POMPE. Ne jamais manœuvrer une vanne multivoies pompe en marche : sous pression, le boisseau cisaille le joint étoile et le coup de bélier peut fissurer la vanne.\n3. Tourner la poignée en position \"Lavage\" (Backwash) d'un geste franc, en la verrouillant bien dans son cran.\n4. Redémarrer la pompe : l'eau traverse le filtre à contre-courant et part à l'égout avec les impuretés. Laisser tourner 2 à 3 minutes, jusqu'à ce que l'eau redevienne claire dans le voyant de la vanne.\n5. Arrêter la pompe, passer en position \"Rinçage\" (Rinse), redémarrer 15 à 30 secondes : cela retasse le média filtrant et évacue les résidus du lavage à l'égout au lieu de les renvoyer au bassin.\n6. Arrêter la pompe, repasser en \"Filtration\", redémarrer.\n7. Purger l'air du filtre via le purgeur, noter la nouvelle pression de référence, et vérifier le niveau d'eau du bassin (un lavage consomme plusieurs centaines de litres : faire l'appoint si besoin).",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Formule précise de dosage du chlore choc",
    "category": "Calculs & formules",
    "summary": "La règle des 20 g/m³, et comment l'ajuster.",
    "body": "Formule générale : dose (kg) = volume du bassin (m³) × concentration visée (ppm) ÷ concentration du produit (%).\nRègle simplifiée couramment utilisée par les professionnels : environ 20 g de chlore choc par m³ pour un traitement standard : avec un produit à 60-70% de chlore actif, cela représente environ 12-14 ppm (mg/L) de chlore dans l'eau, un niveau curatif suffisant pour éliminer algues, bactéries et virus. Cette valeur est indicative : elle varie selon la concentration réelle du produit (hypochlorite de calcium 60-70% de chlore actif) indiquée sur l'emballage, de 5-15 g/m³ pour les produits très concentrés jusqu'à 30 g/m³ pour les moins concentrés : toujours vérifier l'étiquette avant de doser.\nEn cas d'eau très verte, très trouble, ou après une forte fréquentation ponctuelle (fête, forte chaleur), le dosage peut être ponctuellement monté à 25-30 g/m³, en recontrôlant impérativement le taux de chlore avant toute nouvelle baignade.\nRappel indispensable : le choc n'est pleinement efficace que si le pH est préalablement ramené entre 7.2 et 7.4, et la filtration doit tourner en continu pendant au moins 24h après l'application.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Inhalation de chlore : symptômes et premiers secours",
    "category": "Réglementation & sécurité",
    "summary": "Réagir vite et bien en cas d'exposition accidentelle en local technique.",
    "body": "Symptômes d'une exposition au chlore : picotements de gorge, toux, sensation d'étouffement, maux de tête, larmoiement, irritation cutanée et oculaire, douleurs thoraciques dans les cas plus sérieux.\nPremiers gestes : évacuer immédiatement la victime à l'air frais, si possible en hauteur (le chlore gazeux est plus lourd que l'air et stagne au sol), et la mettre au repos sans la faire marcher inutilement.\nRetirer les vêtements contaminés et laver abondamment les zones de peau exposées.\nEn cas de projection dans les yeux : rincer abondamment à l'eau tiède pendant plusieurs minutes.\nIl n'existe pas de traitement spécifique à l'inhalation de chlore : appeler les secours (15 ou 112) en cas de symptômes respiratoires marqués ou persistants, une prise en charge médicale peut être nécessaire.",
    "type": "information",
    "important": 1
  },
  {
    "title": "La caisse à outils du pisciniste : le matériel indispensable",
    "category": "Calendrier & organisation",
    "summary": "Regrouper le nécessaire dans une caisse dédiée fait gagner un temps précieux à chaque intervention.",
    "body": "Analyse de l'eau : testeur à pastilles DPD (voire photomètre électronique), bandelettes de dépannage, réactifs de rechange non périmés.\nNettoyage : épuisette de surface, brosse pour parois (adaptée au revêtement), balai aspirateur manuel, éponge/pierre à récurer pour la ligne d'eau.\nProduits : pH+, pH-, chlore choc, rehausseur/réducteur de TAC, floculant, séquestrant métaux : en quantités adaptées à la tournée du jour.\nPetit outillage technique : tournevis, pince, joints toriques de rechange, graisse silicone, ruban téflon, clé de vidange de filtre.\nProtection individuelle : gants résistants aux produits chimiques, lunettes de protection, indispensables dès qu'un produit concentré est manipulé.\nSuivi : carnet de suivi ou application mobile pour consigner les relevés et interventions à chaque passage.",
    "type": "information",
    "important": 1
  },
  {
    "title": "La vanne multivoies (6 positions) : rôle exact de chaque position",
    "category": "Équipements",
    "summary": "Filtration, Lavage, Rinçage, Circulation, Égout, Fermé : et la règle d'or qui sauve le joint étoile.",
    "body": "FILTRATION : trajet normal : pompe → haut du filtre → traversée du média → crépines → refoulements. La position de 95% du temps.\nLAVAGE (Backwash) : le flux est inversé : pompe → bas du filtre → remontée à contre-courant à travers le média → égout. Décolmate le filtre en 2-3 minutes (jusqu'à eau claire au voyant).\nRINÇAGE (Rinse) : même trajet que la filtration mais la sortie part à l'égout. 15-30 secondes après chaque lavage pour retasser le média et évacuer les résidus sans les renvoyer au bassin.\nCIRCULATION : l'eau va de la pompe directement aux refoulements SANS passer par le filtre. Utile pour brasser un produit après traitement, dépanner avec un filtre HS, ou diagnostiquer (si le débit revient en circulation, le filtre est colmaté).\nÉGOUT (Vidange/Waste) : l'eau part de la pompe directement à l'égout sans passer par le filtre. Pour baisser le niveau, vidanger par la bonde de fond, ou aspirer au balai une eau très chargée (algues mortes, floculant déposé) sans encrasser le filtre.\nFERMÉ : tout est obturé. Pour intervenir sur le préfiltre de la pompe sans retour d'eau. Jamais pompe en marche.\nHIVERNAGE : position intermédiaire (entre deux crans, ou cran dédié selon modèle) qui décolle le boisseau du joint étoile pour qu'il ne reste pas comprimé tout l'hiver.\nFonctionnement interne : sous la poignée, un boisseau plaqué par un ressort sur le joint étoile (joint plat à branches qui cloisonne les chambres). La poignée aligne les lumières du boisseau avec les bons orifices.\nRÈGLE D'OR : ne JAMAIS manœuvrer la vanne pompe en marche : sous ~1 bar de pression, le boisseau cisaille le joint étoile et le coup de bélier peut fissurer la vanne. Arrêt pompe, manœuvre franche verrouillée dans le cran, puis redémarrage.\nMontage TOP (sur le dôme du filtre, compact) ou SIDE (latéral, média accessible sans démonter la vanne) : positions et fonctionnement identiques.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Le TAC et son rôle de tampon du pH",
    "category": "Chimie de l'eau",
    "summary": "Pourquoi le TAC doit toujours être réglé avant le pH.",
    "body": "Le TAC (Titre Alcalimétrique Complet) mesure la capacité de l'eau à résister aux variations de pH : c'est l'effet \"tampon\". Un TAC trop bas rend le pH instable (il varie fortement au moindre ajout de produit ou apport extérieur), tandis qu'un TAC trop élevé rend le pH difficile à corriger et favorise l'entartrage.\nC'est pourquoi le TAC doit toujours être réglé en premier, avant le pH : régler le pH sur un TAC déséquilibré est inefficace, le pH \"revient\" rapidement à sa valeur d'origine.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Le circuit hydraulique d'une piscine de A à Z",
    "category": "Équipements",
    "summary": "L'ordre des équipements n'est pas négociable : et chaque ligne d'aspiration a une raison d'être.",
    "body": "Le trajet complet de l'eau : skimmers + bonde de fond + prise balai (aspiration) → vannes d'isolement (une par ligne) → pompe (avec son préfiltre) → filtre (via la vanne multivoies) → chauffage (monté en by-pass) → traitement (électrolyseur, puis injection pH/chlore le plus en aval possible) → buses de refoulement.\nRépartition de l'aspiration en saison : environ 2/3 par les skimmers (écrémage de la surface, là où arrivent feuilles et pollutions) et 1/3 par la bonde de fond : réglable aux vannes selon le besoin (plus de bonde pour brasser le fond ou homogénéiser la température, plus de skimmers en période de feuilles).\nPourquoi la bonde de fond : elle aspire l'eau du fond (la plus froide et la plus chargée), homogénéise le bassin thermiquement et chimiquement, permet la vidange complète, et sécurise la pompe (elle continue d'alimenter l'aspiration si le niveau passe sous les skimmers).\nDiamètres courants : Ø50 mm par ligne de skimmer (jusqu'à ~7-8 m³/h), Ø63 mm pour bonde de fond, collecteurs et refoulement général (11-12 m³/h) : et plus gros (Ø75-110) pour NCC et débordement. Les pertes de charge varient en 1/D⁵ : mieux vaut trop gros que trop petit.\nVitesses d'eau cibles : max 1,5 m/s à l'aspiration, 2 à 2,5 m/s au refoulement.\nPose : PVC pression rigide PN16 en enterré, hors gel, chaque ligne ramenée individuellement au local technique sur sa propre vanne (équilibrage + diagnostic), coudes 90° évités au profit de 2×45°.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Les types de pompes de piscine et le rôle de chacune",
    "category": "Équipements",
    "summary": "Filtration, vitesse variable, surpresseur, NCC, PAC, relevage : chaque pompe a un métier précis.",
    "body": "Pompe de filtration mono-vitesse : le cœur du circuit. Pompe centrifuge auto-amorçante (grâce à son préfiltre qui garde une réserve d'eau) qui aspire skimmers/bonde de fond et pousse l'eau à travers le filtre. Tourne à vitesse fixe (~2850 tr/min) : simple et robuste, mais consomme la même chose quel que soit le besoin.\nPompe à vitesse variable : même rôle, mais moteur à aimants permanents piloté par variateur. On filtre plus longtemps à basse vitesse pour une consommation bien moindre et une meilleure finesse de filtration (voir fiche dédiée).\nSurpresseur : petite pompe dédiée qui prélève l'eau APRÈS le filtre et la renvoie sous pression (2 à 2,6 bar) par la prise balai pour propulser un robot hydraulique à pression (type Polaris). Faible débit / forte pression : l'inverse d'une pompe de filtration. Ne doit jamais tourner sans la filtration en marche.\nPompe de nage à contre-courant (NCC) : circuit totalement indépendant de la filtration. Très gros débit (30-40 m³/h pour la détente, 50-60 m³/h pour nager, 70-90 m³/h et plus pour un sportif) refoulé par une buse ~30 cm sous la surface, en gros diamètre (Ø63 minimum, souvent Ø75/90).\nPompe à chaleur : ce n'est pas une pompe hydraulique mais un système thermodynamique raccordé en by-pass (voir fiche PAC).\nPompe de relevage / vide-cave : pompe submersible autonome (avec flotteur) posée au fond du bassin pour les vidanges, baisses de niveau d'hivernage ou vidage de couverture. Ordre de grandeur : 10-14 m³/h, hauteur de refoulement 7-9 m, eaux claires.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Nettoyage de la ligne d'eau",
    "category": "Nettoyage",
    "summary": "Retirer les traces de calcaire, graisses et pollens à la ligne de flottaison.",
    "body": "1. Baisser légèrement le niveau d'eau si les traces sont importantes.\n2. Utiliser un nettoyant spécial ligne d'eau adapté au revêtement (liner, carrelage, coque).\n3. Frotter avec une éponge non abrasive ou une pierre à récurer pour le carrelage.\n4. Rincer abondamment pour ne pas polluer l'eau du bassin.\n5. Remettre le niveau d'eau au bon repère.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Nettoyer le panier du skimmer",
    "category": "Filtration",
    "summary": "Entretien hebdomadaire de base, à faire plus souvent en période de feuilles/pollens.",
    "body": "1. Couper la filtration.\n2. Ouvrir le couvercle du skimmer et retirer le panier.\n3. Vider les débris et rincer le panier au jet.\n4. Vérifier le clapet anti-retour (volet) situé au fond du skimmer.\n5. Vérifier le joint du couvercle et l'état du skimmer (fissures).\n6. Remettre le panier en place, refermer le couvercle, relancer la filtration.\n7. À faire au minimum une fois par semaine en pleine saison.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Ordre de correction des paramètres de l'eau",
    "category": "Chimie de l'eau",
    "summary": "La méthode professionnelle : TAC, puis pH, puis TH, puis chlore.",
    "body": "Lorsque plusieurs paramètres sont à corriger en même temps, respecter systématiquement cet ordre :\n1) TAC (alcalinité) : il stabilise le pH et doit être réglé en premier.\n2) pH : une fois le TAC dans la cible.\n3) TH (dureté) si nécessaire.\n4) Chlore et stabilisant en dernier, une fois pH/TAC stabilisés (le chlore est plus efficace et plus facile à ajuster sur une eau déjà équilibrée).\nAttendre systématiquement quelques heures filtration en marche entre chaque correction avant de recontrôler.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Perte de pression ou débit insuffisant malgré filtration",
    "category": "Dépannage matériel",
    "summary": "Méthode de diagnostic étape par étape.",
    "body": "1. Vérifier le panier du préfiltre pompe et celui des skimmers : un colmatage réduit fortement le débit.\n2. Contrôler la pression au manomètre : si elle est haute, le filtre est encrassé (backwash/nettoyage nécessaire) ; si elle est basse, le souci est en amont du filtre.\n3. Vérifier les vannes (position, ouverture complète) et l'absence de vanne partiellement fermée par erreur.\n4. Rechercher un colmatage dans les canalisations (feuilles, racines sur réseau enterré ancien).\n5. Vérifier que la pompe est bien dimensionnée par rapport au filtre et au volume du bassin.\n6. Contrôler l'état de la turbine (usure, entartrage) si le débit reste faible après élimination des autres causes.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Pompe qui ne s'amorce plus",
    "category": "Dépannage matériel",
    "summary": "Diagnostic rapide en cas de pompe qui tourne mais n'aspire pas l'eau.",
    "body": "1. Vérifier qu'il n'y a pas de prise d'air : contrôler le joint du couvercle du préfiltre et le niveau d'eau du bassin.\n2. Nettoyer le panier du préfiltre s'il est colmaté.\n3. Vérifier que les vannes d'aspiration sont bien ouvertes.\n4. Remplir le préfiltre d'eau manuellement pour réamorcer, remettre le couvercle, redémarrer.\n5. Si toujours rien : contrôler le clapet anti-retour et la canalisation d'aspiration pour une fuite d'air.\n6. Si le souci persiste, vérifier l'état de la turbine et du moteur (bruit anormal, échauffement).",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Rattraper une eau verte",
    "category": "Traitement de l'eau",
    "summary": "Protocole complet de traitement curatif contre les algues vertes.",
    "body": "1. Analyser pH, TAC et chlore avant toute intervention.\n2. Ramener le pH entre 7.0 et 7.4 (l'eau verte fait souvent suite à un pH mal réglé ou un manque de chlore).\n3. Brosser énergiquement parois et fond pour décoller les algues.\n4. Faire un traitement choc au chlore non stabilisé (dose renforcée selon le volume, voir fiche dosage).\n5. Laisser tourner la filtration en continu 24 à 48h, nettoyer le filtre à mi-parcours si la pression grimpe vite.\n6. Aspirer les dépôts d'algues mortes au fond à l'évacuation (pas à travers le filtre si les dépôts sont importants).\n7. Recontrôler chlore et pH le lendemain, renouveler le choc si l'eau reste trouble.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Reconnaître les différents types d'algues",
    "category": "Algues & pathologies de l'eau",
    "summary": "Vertes, moutarde, noires, roses : identification rapide.",
    "body": "Algues vertes : les plus courantes, eau uniformément verte et/ou parois glissantes, liées à un manque de désinfectant ou un déséquilibre du pH.\nAlgues moutarde (jaunes) : aspect poudreux jaunâtre, se redéposent vite après brossage, résistantes au chlore classique, nécessitent un produit spécifique.\nAlgues noires : taches noires incrustées très résistantes, se logent dans les joints et micro-fissures, demandent un brossage mécanique pour casser leur membrane avant traitement.\nAlgues roses : en réalité des bactéries (et non de vraies algues), colonisent surtout les surfaces plastiques (liner, joints, paniers de skimmer), traitement bactéricide spécifique nécessaire en complément du chlore.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Remplacer le joint étoile d'une vanne multivoies (fuite à l'égout)",
    "category": "Dépannage matériel",
    "summary": "Un écoulement continu vers l'égout en position filtration = joint étoile usé dans 90% des cas.",
    "body": "1. Confirmer le diagnostic : en position \"Filtration\", de l'eau s'écoule en continu vers l'égout (perte de niveau \"invisible\"). Obturer la ligne égout et surveiller le niveau du bassin pour confirmer.\n2. Arrêter la pompe, fermer les vannes d'isolement (ou baisser le niveau d'eau sous les skimmers si le circuit n'a pas de vannes).\n3. Dévisser les vis périphériques du capot de la vanne (noter leur position) et sortir l'ensemble poignée + boisseau + ressort.\n4. Extraire le vieux joint étoile de son logement et nettoyer soigneusement les portées (sans outil coupant).\n5. Positionner le joint étoile neuf à sec ou avec un voile de graisse silicone UNIQUEMENT (jamais de graisse minérale sur un joint EPDM, elle le fait gonfler).\n6. Profiter du démontage pour remplacer les autres joints de la vanne (kit complet) : joint de tige de poignée et joint de capot vieillissent à la même vitesse.\n7. Remonter le capot en serrant les vis en croix, progressivement et sans excès (le plastique fend facilement).\n8. Remettre en eau, redémarrer et vérifier qu'il ne coule plus rien à l'égout en position filtration.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Repérer les signaux d'alerte pendant un entretien",
    "category": "Analyse & routine",
    "summary": "Les points de vigilance à observer à chaque passage pour anticiper une panne ou un déséquilibre avant qu'il ne s'aggrave.",
    "body": "1. Couleur et clarté de l'eau : un léger trouble ou verdissement naissant, même léger, signale généralement un début de déséquilibre du traitement ou un problème de filtration/débit : à corriger avant que ça ne s'aggrave, pas au prochain passage.\n2. Niveau d'eau : une baisse plus rapide que d'habitude malgré une évaporation normale doit alerter sur une fuite potentielle, même si rien n'est visible.\n3. Comportement de la pompe : une pompe qui se désamorce fréquemment, qui devient bruyante ou qui chauffe anormalement sont des signes à ne jamais laisser filer, ils précèdent souvent une panne plus lourde.\n4. Pression au manomètre : une pression qui grimpe plus vite qu'à l'accoutumée entre deux nettoyages de filtre indique un encrassement anormal, parfois lié à un problème d'eau en amont.\n5. Inspection visuelle du bassin : fissures, craquelures, cloques ou décoloration sur le revêtement (coque, liner, carrelage) sont à signaler et à surveiller d'un passage à l'autre pour suivre leur évolution.\n6. Odeur de chlore inhabituellement forte : contrairement à l'idée reçue, ce n'est pas un signe de trop de chlore mais souvent de chlore combiné élevé (désinfection insuffisante) : à vérifier avec un test.\n7. État des équipements annexes : joints, vannes, raccords à vérifier régulièrement, ils se dégradent progressivement même avec un entretien correct et peuvent devenir des points de fuite.\n8. Le réflexe à avoir : en cas de doute sur un signal, mieux vaut effectuer un test complémentaire ou prévenir le client tout de suite que d'attendre le passage suivant.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Réagir en cas de fuite ou d'odeur de chlore gazeux",
    "category": "Sécurité",
    "summary": "Procédure d'urgence à connaître pour toute intervention en local technique.",
    "body": "1. Ne jamais chercher à identifier ou colmater seul une fuite de chlore gazeux : évacuer immédiatement la zone.\n2. Faire sortir toute personne à proximité à l'air libre, de préférence en hauteur (le chlore gazeux est plus lourd que l'air et stagne au sol).\n3. Ne pas retourner dans le local avant l'intervention des secours ou d'un professionnel équipé (appareil respiratoire isolant).\n4. En cas d'exposition (toux, picotements de gorge, larmoiement, difficultés respiratoires) : évacuer la victime à l'air frais, la mettre au repos, ne pas la faire marcher inutilement.\n5. Rincer abondamment les yeux à l'eau tiède en cas de projection, retirer les vêtements contaminés.\n6. Appeler les secours (15 ou 112) en cas de symptômes respiratoires ou d'exposition prolongée.\n7. Ne jamais utiliser d'eau pour \"laver\" une fuite de produit chloré solide/granulés à proximité d'un autre produit chimique : risque de réaction violente.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Réglementation sécurité des piscines privées",
    "category": "Réglementation & sécurité",
    "summary": "Loi du 3 janvier 2003 et normes NF P90-306/307/308/309.",
    "body": "Depuis la loi n°2003-9 du 3 janvier 2003, toute piscine enterrée ou semi-enterrée non close à usage individuel ou collectif doit être équipée d'au moins un dispositif de sécurité normalisé, en vue de prévenir les noyades d'enfants de moins de 6 ans.\nQuatre normes définissent ces dispositifs : NF P90-306 (barrières de protection, hauteur minimale 1,10 m, portillon à fermeture et verrouillage automatiques), NF P90-307 (alarmes, détection périmétrique ou d'immersion), NF P90-308 (couvertures de sécurité) et NF P90-309 (abris de piscine).\nLe non-respect de cette obligation expose le propriétaire à une amende pouvant atteindre 45 000 €. Ces dispositifs réduisent le risque mais ne remplacent jamais la surveillance active d'un adulte.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Stockage et manipulation des produits chimiques",
    "category": "Réglementation & sécurité",
    "summary": "Ne jamais mélanger chlore et acide : consignes de sécurité essentielles.",
    "body": "Ne jamais stocker le chlore et l'acide côte à côte, ni mélanger différents types de chlore entre eux : le contact accidentel entre chlore et acide peut générer un dégagement de gaz toxique voire une réaction violente.\nConserver chaque produit dans son emballage d'origine, étiqueté, dans un local frais, sec, aéré et à l'abri du soleil direct. Prévoir un espace entre les différents contenants et une bonne ventilation pour éviter toute accumulation de vapeurs.\nStocker hors de portée des enfants et des animaux. Porter des gants et des lunettes de protection lors de toute manipulation de produits concentrés, et toujours verser le produit dans l'eau (jamais l'inverse) lors d'une dilution.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Tester le pH et le chlore avec un kit à pastilles (DPD)",
    "category": "Analyse & routine",
    "summary": "La méthode de référence sur le terrain : Phenol Red pour le pH, DPD1 pour le chlore libre.",
    "body": "1. Rincer l'éprouvette du testeur avec l'eau du bassin avant le prélèvement.\n2. Prélever l'eau à environ 30-40 cm de profondeur, loin des buses de refoulement et des skimmers, pour un échantillon représentatif.\n3. Remplir les deux cupules du comparateur jusqu'au repère indiqué.\n4. Déposer une pastille Phenol Red dans la cupule pH, une pastille DPD1 dans la cupule chlore.\n5. Refermer, agiter légèrement jusqu'à dissolution complète des pastilles.\n6. Comparer immédiatement les couleurs obtenues à l'échelle colorimétrique du testeur, à la lumière du jour (jamais en plein soleil direct ni à l'ombre trop sombre).\n7. Noter les valeurs et les comparer aux cibles (pH 7.2-7.4, chlore libre 1-3 mg/L).\n8. Rincer immédiatement le testeur à l'eau claire après lecture pour éviter toute contamination du test suivant.",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Valeurs idéales de l'équilibre de l'eau",
    "category": "Chimie de l'eau",
    "summary": "Tableau de référence des paramètres clés à contrôler à chaque analyse.",
    "body": "pH : 7.2 à 7.4 (zone où le désinfectant est le plus efficace et l'eau confortable pour la peau/yeux).\nChlore libre : 1,0 à 3,0 mg/L (2 mg/L en usage courant, jusqu'à 3-5 mg/L en traitement choc temporaire).\nChlore combiné (chloramines) : doit rester proche de 0, idéalement inférieur à 0,4 mg/L : un taux élevé signale une eau mal désinfectée malgré un chlore libre correct.\nTAC (alcalinité) : 80 à 120 mg/L (8 à 12 °f).\nTH (dureté) : 100 à 200 mg/L de CaCO3, soit 10 à 20 °f (au-delà de 25 °f, risque d'eau trouble et d'entartrage ; en dessous de 10 °f, risque de corrosion).\nStabilisant (acide cyanurique) : idéalement 30 à 50 mg/L pour un traitement au chlore stabilisé (norme DIN EN 16713:2016, tolérance jusqu'à 100 mg/L, maximum réglementaire français 75 mg/L) ; proche de 0 pour un traitement non stabilisé (sel, oxygène actif).\nTempérature : 26 à 28°C pour un confort de baignade classique, au-delà de 28°C la vigilance sur le traitement doit augmenter.",
    "type": "information",
    "important": 1
  },
  {
    "title": "Vérifier les dispositifs de sécurité obligatoires",
    "category": "Sécurité",
    "summary": "Contrôle périodique des équipements normalisés (barrière, alarme, couverture, abri).",
    "body": "1. Identifier le(s) dispositif(s) normalisé(s) installé(s) sur le bassin (barrière NF P90-306, alarme NF P90-307, couverture NF P90-308 ou abri NF P90-309).\n2. Barrière : vérifier la hauteur (≥1,10 m), l'absence de prise d'escalade, et surtout le bon fonctionnement du portillon à fermeture et verrouillage automatiques.\n3. Alarme : tester le déclenchement (immersion ou périmétrique) et vérifier l'état des piles ; s'assurer qu'elle est réarmée après chaque baignade.\n4. Couverture de sécurité : vérifier la tension, l'état des sangles/ancrages, l'absence de déchirure, et sa capacité à supporter le poids d'un enfant.\n5. Abri : vérifier le bon coulissement et le verrouillage effectif de la fermeture.\n6. Rappeler au client qu'aucun dispositif ne remplace la surveillance active d'un adulte.\n7. Consigner la vérification dans la fiche piscine (date, dispositif, état constaté).",
    "type": "procedure",
    "important": 1
  },
  {
    "title": "Anatomie d'une pompe de filtration : préfiltre, turbine, garniture, condensateur",
    "category": "Équipements",
    "summary": "Connaître les organes internes, c'est diagnostiquer une panne en quelques minutes.",
    "body": "Préfiltre + panier : cuve transparente en amont de la turbine. Retient cheveux et débris avant la turbine ET sert de réserve d'eau pour l'amorçage : c'est lui qui rend la pompe \"auto-amorçante\". Préfiltre vide = pompe qui tourne à sec = garniture détruite en quelques minutes.\nTurbine (roue) : pièce en plastique technique (Noryl chargé fibre de verre) montée sur l'arbre moteur, qui projette l'eau en périphérie par force centrifuge. Une turbine encrassée de cheveux fait chuter le débit.\nDiffuseur : pièce fixe autour de la turbine qui convertit la vitesse de l'eau en pression et empêche le flux de revenir en arrière. Il participe à l'auto-amorçage (séparation air/eau).\nGarniture mécanique : l'étanchéité tournante de l'arbre, entre corps hydraulique et moteur. Deux faces en friction (carbone contre céramique) plaquées par un ressort, lubrifiées par l'eau pompée. Sa défaillance = goutte à goutte entre pompe et moteur.\nCondensateur (moteurs monophasés uniquement) : cylindre de 12,5 à 40 µF qui crée le déphasage nécessaire au démarrage du moteur. Panne électrique n°1 : moteur qui bourdonne sans se lancer. Se remplace à capacité identique (±5%).\nMoteur : monophasé 230 V (le plus courant, avec condensateur) ou triphasé 400 V (sans condensateur, mais sens de rotation à vérifier au branchement : un tri qui tourne à l'envers débite mal sans bruit anormal).",
    "type": "information",
    "important": 0
  },
  {
    "title": "Calendrier annuel d'entretien d'une piscine",
    "category": "Calendrier & organisation",
    "summary": "Checklist saisonnière pour organiser sa tournée sur l'année.",
    "body": "Printemps (remise en route) : retrait de la bâche, remontage du matériel, nettoyage complet, backwash, remise à niveau des paramètres, choc si besoin.\nÉté (haute saison) : contrôle des paramètres 1 à 2 fois par semaine, nettoyage skimmers/ligne d'eau hebdomadaire, filtration selon la règle température/2, vigilance accrue lors des orages et fortes chaleurs.\nAutomne : réduction progressive de la filtration à mesure que la température baisse, nettoyage renforcé (feuilles), dernière analyse complète avant hivernage.\nHiver (hivernage) : mise en hivernage passif ou actif selon la région et le type de bassin, surveillance ponctuelle du niveau d'eau et de l'état de la couverture pendant la période fermée.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Changer le sable du filtre à sable",
    "category": "Filtration",
    "summary": "Remplacement complet de la charge de sable du filtre, à faire tous les 5 à 7 ans.",
    "body": "1. Couper la pompe et mettre la vanne multivoie sur \"Fermé\".\n2. Vidanger la cuve du filtre (vanne de vidange ou tuyau).\n3. Ouvrir la trappe supérieure et retirer l'ancien sable à l'aide d'une pelle/aspirateur à sable (attention à ne pas abîmer la crépine centrale).\n4. Rincer soigneusement la cuve.\n5. Verser un fond d'eau, puis remplir avec le sable neuf (granulométrie adaptée) jusqu'au niveau indiqué par le fabricant.\n6. Refermer la trappe, mettre la vanne sur \"Lavage\" (backwash) 2-3 minutes.\n7. Passer en \"Rinçage\" 30 secondes, puis repasser en \"Filtration\".",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Chlore stabilisé vs non stabilisé : lequel utiliser",
    "category": "Chimie de l'eau",
    "summary": "Stabilisé pour le traitement continu, non stabilisé pour le rattrapage.",
    "body": "Le chlore stabilisé (galets, pastilles, dichlore) contient de l'acide cyanurique qui protège le chlore des UV : c'est la solution adaptée à la désinfection continue d'une piscine extérieure.\nLe chlore non stabilisé (hypochlorite de calcium en poudre/granulés) agit vite et ne contient pas de stabilisant : il est réservé au traitement choc ponctuel, notamment pour rattraper une eau verte, sans faire grimper davantage le taux de stabilisant déjà présent.\nUne piscine déjà sur-stabilisée doit systématiquement être traitée avec du chlore non stabilisé jusqu'à dilution du stabilisant en excès.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Choc chlore (traitement choc)",
    "category": "Traitement de l'eau",
    "summary": "Procédure à appliquer en cas d'eau trouble, verte ou après une forte affluence.",
    "body": "1. Tester le pH et le ramener entre 7.2 et 7.4 avant le choc.\n2. Calculer la dose de chlore choc selon le volume du bassin (voir dosage produit).\n3. Diluer le chlore choc dans un seau d'eau si c'est un produit en poudre/granulés.\n4. Verser progressivement au bord du bassin, filtration en marche.\n5. Laisser tourner la filtration en continu au moins 24h.\n6. Ne pas se baigner tant que le taux de chlore n'est pas redescendu sous 3 mg/L.\n7. Recontrôler pH et chlore le lendemain et ajuster.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Coller du PVC pression sans fuite",
    "category": "Mise en service",
    "summary": "La soudure à froid du PVC : 90% des fuites de collage viennent du non-respect de ces étapes.",
    "body": "1. Couper le tube d'équerre (scie à denture fine ou coupe-tube), ébavurer et réaliser un léger chanfrein extérieur pour ne pas racler la colle à l'emboîtement.\n2. Vérifier l'emboîtement à sec, marquer la profondeur au feutre.\n3. Décaper les DEUX surfaces (extérieur du tube + intérieur du raccord) au décapant PVC : il ramollit la matière et conditionne la soudure à froid. Ne pas zapper cette étape, même sur du neuf.\n4. Encoller uniformément les deux parties (colle gel PVC-U pression), en couche régulière, dans le sens de la longueur.\n5. Emboîter À FOND dans les 30 secondes, d'un mouvement droit, SANS TOURNER : la rotation détruit le film de colle et crée des micro-canaux de fuite. Maintenir quelques secondes (le tube a tendance à ressortir).\n6. Essuyer le bourrelet de colle. Travailler gants + zone ventilée (solvants).\n7. Respecter le séchage avant mise en pression : 24h minimum avant la mise en pression complète du circuit, 48h par temps froid (moins de 10°C), avec une montée en pression progressive.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Comparatif des systèmes de filtration",
    "category": "Équipements",
    "summary": "Sable, cartouche, diatomées, verre : finesse et entretien.",
    "body": "Sable : le plus répandu et économique, finesse de filtration 30-40 microns, entretien par backwash toutes les 1 à 2 semaines en saison (ou dès que la pression dépasse de 0,3-0,5 bar la référence), sable à remplacer tous les 5-7 ans.\nCartouche : finesse 15-20 microns, pas de backwash (économie d'eau), nettoyage manuel 1 à 2 fois par semaine en pleine saison, cartouche à remplacer tous les 2-3 ans, réservé aux bassins jusqu'à ~60 m³, incompatible floculant.\nDiatomées : finesse 2-5 microns, eau la plus limpide du marché, entretien plus technique (rechargement périodique du précoat en terre de diatomées), bac décanteur souvent exigé au rejet, recommandé pour un professionnel.\nVerre recyclé : alternative au sable, finesse ~15-20 microns en usage courant (les \"1-5 microns\" annoncés correspondent au verre activé haut de gamme avec floculation), pas de prise en masse ni de biofilm, backwash plus courts (20-50% d'eau économisée), durée de vie 5-10 ans.\nZéolite : roche volcanique, finesse ~5 microns, adsorbe aussi l'ammonium (moins de chloramines), durée de vie 5-9 ans, se dose à environ la moitié du poids de sable équivalent.\nPoche/chaussette (type Desjoyaux) : finesses 6, 15 ou 30 microns selon la poche, nettoyage hebdomadaire au jet, durée de vie ~3 saisons, pas d'eau de lavage perdue.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Comprendre une pompe de filtration",
    "category": "Équipements",
    "summary": "Débit, HMT et dimensionnement.",
    "body": "Une pompe de filtration se caractérise par son débit (m³/h) et sa hauteur manométrique totale (HMT, la capacité à \"pousser\" l'eau en compensant les pertes de charge du circuit).\nLe dimensionnement doit permettre de filtrer l'intégralité du volume du bassin dans le temps de filtration quotidien visé, tout en tenant compte des pertes de charge du filtre, des canalisations et des accessoires.\nUne pompe surdimensionnée use prématurément le filtre et consomme inutilement ; une pompe sous-dimensionnée ne brasse pas assez l'eau et laisse le traitement moins efficace. Les pompes à vitesse variable permettent d'adapter le débit aux besoins réels avec un gain énergétique important.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Comprendre une pompe à chaleur piscine",
    "category": "Équipements",
    "summary": "COP, dimensionnement et plage de fonctionnement.",
    "body": "Une pompe à chaleur (PAC) capte les calories de l'air extérieur pour chauffer l'eau du bassin. Sa performance se mesure par le COP (Coefficient de Performance) : un COP de 4 signifie 4 kW de chaleur restitués pour 1 kW électrique consommé.\nLe COP varie fortement avec la température extérieure : il chute quand l'air se refroidit, ce qui explique une chauffe moins efficace en intersaison. La Fédération des Professionnels de la Piscine impose deux mesures de référence pour comparer les modèles (air 15°C/eau 26°C, et air 28°C/eau 28°C).\nDimensionnement indicatif : environ 1 kW de puissance pour 10 m³ d'eau, à affiner selon le volume exact, l'exposition, la couverture du bassin et la vitesse de montée en température souhaitée.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Contrôle électrolyseur au sel",
    "category": "Traitement de l'eau",
    "summary": "Vérification mensuelle d'une installation de traitement au sel.",
    "body": "1. Vérifier le taux de sel avec un testeur dédié (cible générale 3 à 5 g/L, voir notice du bassin).\n2. Contrôler les cellules de l'électrolyseur : détartrer si dépôt blanchâtre visible.\n3. Vérifier l'affichage du boîtier (% de production, alarme éventuelle).\n4. Ajuster la production selon la température de l'eau et la fréquentation.\n5. Recontrôler pH et chlore générés après réglage.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Différences pratiques : piscine hors-sol, gonflable, tubulaire, enterrée",
    "category": "Équipements",
    "summary": "Le faible volume et la structure légère changent radicalement le rythme d'entretien.",
    "body": "Piscine gonflable : installation/désinstallation saisonnière voire ponctuelle, très faible volume, eau souvent simplement renouvelée plutôt que traitée en continu, structure fragile sensible à l'usure.\nPiscine tubulaire/autoportée : installation plus durable sur la saison, nécessite une vraie filtration et un suivi régulier de l'eau comme un bassin enterré, mais avec un volume réduit qui se déséquilibre et se réchauffe beaucoup plus vite (contrôles plus fréquents nécessaires).\nPiscine enterrée : volume plus important qui offre une meilleure inertie et stabilité des paramètres, mais nécessite des équipements fixes (filtration, éventuellement PAC/électrolyseur) et le nettoyage de tous ses recoins fixes (skimmers, ligne d'eau, margelles).\nDans tous les cas, le principe reste le même (filtration + équilibre de l'eau + désinfection) mais la fréquence et l'intensité des gestes doivent être adaptées au volume et à la stabilité thermique du bassin.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Détecter une fuite sur le circuit hydraulique",
    "category": "Dépannage matériel",
    "summary": "Méthode du test du seau et recherche de fuite.",
    "body": "1. Constater une baisse anormale du niveau d'eau (plus de 2 à 3 cm/jour hors évaporation naturelle) : suspecter une fuite.\n2. Faire le test du seau (bucket test) : comparer la baisse de niveau du bassin à celle d'un seau rempli posé sur une marche, filtration coupée, sur 24h.\n3. Si la fuite persiste filtration coupée : elle est sur la structure du bassin (liner, coque, joints de pièces à sceller).\n4. Si la fuite n'apparaît qu'en filtration : elle est sur le circuit hydraulique (canalisations, vannes, joints de pompe/filtre).\n5. Inspecter visuellement le local technique et les raccords apparents à la recherche de traces d'humidité.\n6. Pour une recherche plus poussée : test à la fumée, colorant traceur sur les points suspects (pièces à sceller, skimmer), ou intervention d'un spécialiste avec électro-détection.\n7. Réparer localement (joint, collage, résine étanche) ou faire appel à un professionnel pour une fuite structurelle.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Entretenir un robot hydraulique",
    "category": "Nettoyage",
    "summary": "Moins de pannes électroniques, mais un circuit de filtration à surveiller de près.",
    "body": "1. Vérifier le raccordement à la prise balai ou au skimmer : un joint usé réduit fortement l'aspiration.\n2. Contrôler que le sac ou le filtre du robot (selon modèle) n'est pas colmaté, sinon la puissance d'aspiration chute.\n3. Nettoyer plus fréquemment le préfiltre de la pompe et le filtre principal : un robot hydraulique sollicite davantage le système de filtration qu'un robot électrique autonome.\n4. Vérifier l'absence de plis ou de vrilles sur le tuyau flottant, qui gênent le déplacement aléatoire du robot.\n5. Contrôler l'état des membranes/soupapes internes (selon technologie), pièces d'usure à remplacer périodiquement.\n6. Ranger le robot et son tuyau à l'ombre hors saison pour limiter le vieillissement du plastique et du caoutchouc.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Entretenir une piscine hors-sol, tubulaire ou autoportée",
    "category": "Nettoyage",
    "summary": "Spécificités liées à la structure légère et au volume réduit.",
    "body": "1. Vérifier régulièrement la tension de la structure (tubulaire) ou le gonflage (autoportée) : une structure détendue accélère l'usure du liner.\n2. Nettoyer plus fréquemment qu'un bassin enterré : le faible volume d'eau se déséquilibre et se réchauffe plus vite, favorisant algues et bactéries.\n3. Utiliser une épuisette et un balai manuel adaptés à la taille réduite du bassin plutôt qu'un robot surdimensionné.\n4. Contrôler pH et chlore au minimum 2 fois par semaine en pleine saison (contre 1 fois pour un bassin enterré plus stable).\n5. Couvrir le bassin hors utilisation pour limiter l'évaporation, les salissures et le réchauffement excessif de l'eau.\n6. En fin de saison, vidanger complètement, nettoyer et sécher avant pliage/stockage pour éviter moisissures et détérioration du PVC.\n7. Ne jamais laisser un hors-sol totalement vide en plein soleil longtemps : le PVC peut se déformer.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Entretien et désinfection d'un spa ou bain à remous",
    "category": "Nettoyage",
    "summary": "Entretien renforcé du fait du faible volume et de la température élevée.",
    "body": "1. Couper la filtration/chauffage avant intervention.\n2. Nettoyer le filtre (cartouche le plus souvent) selon la fréquence préconisée, plus rapprochée que pour une piscine.\n3. Contrôler et ajuster pH, TAC et désinfectant (chlore ou brome, souvent privilégié pour les eaux chaudes) à chaque intervention.\n4. Vérifier la température (30-40°C typiquement) : cette plage favorise la prolifération de légionelles si l'entretien est négligé.\n5. Réaliser une vidange complète et un nettoyage des canalisations avec un produit dégraissant spécial spa tous les 3 à 4 mois.\n6. Nettoyer la ligne d'eau et les buses de massage à la brosse douce.\n7. Remplir, réajuster les paramètres et relancer avant remise en service.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Fiches produits : rôle et précautions des principaux produits de traitement",
    "category": "Chimie de l'eau",
    "summary": "Chlore choc, galets, pH+/pH-, floculant, séquestrant.",
    "body": "Chlore choc (dichlore/hypochlorite) : désinfection rapide et rattrapage, à diluer avant usage pour la poudre, jamais en contact direct avec la peau.\nGalets de chlore lent (trichlore stabilisé) : diffusion progressive sur 7-10 jours en skimmer ou diffuseur flottant, jamais dans le panier du skimmer si filtration coupée (concentration dangereuse localisée).\npH+/pH- : produits acido-basiques concentrés, toujours verser dans l'eau et non l'inverse, stocker séparément l'un de l'autre.\nAnti-algues : à utiliser en traitement préventif régulier ou curatif ciblé selon le type d'algue, vérifier la compatibilité avec le désinfectant utilisé.\nFloculant : agent clarifiant à action physique (agglomération des particules), sans effet désinfectant, à utiliser en complément du chlore et non à sa place.\nSéquestrant/anti-calcaire : limite la précipitation du calcaire et des métaux responsables de taches et d'eau trouble/colorée, à renouveler régulièrement.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Filtre à sable : fonctionnement détaillé et choix du média (silice, verre, zéolite)",
    "category": "Équipements",
    "summary": "Ce qui se passe dans la cuve, et ce que change réellement le média.",
    "body": "Fonctionnement : l'eau entre par le haut de la cuve via le diffuseur, traverse la masse filtrante qui retient les particules, et ressort par les crépines (petits doigts fendus en fond de cuve) vers les refoulements. Le nettoyage se fait par contre-lavage : le flux est inversé par la vanne multivoies et les impuretés partent à l'égout.\nCharge type : sable silice 0,4-0,8 mm pour la couche filtrante (environ 2/3 de la charge) posé sur du gravier 2-4 mm qui protège les crépines (1/3 restant). Durée de vie du sable : environ 5 ans (3 à 7 selon l'eau) ; détartrage annuel conseillé en eau dure.\nFinesse de filtration réelle : 30-40 microns pour le sable (améliorable à ~10-15 microns avec un floculant : le filtre à sable est le seul compatible floculant).\nVerre recyclé/activé : finesse d'environ 15-20 microns en usage courant (les \"1-5 microns\" des publicités correspondent au verre activé haut de gamme AVEC floculation). Surface lisse et chargée négativement : pas de prise en masse ni de biofilm, backwash plus courts (20 à 50% d'eau économisée), durée de vie 5-10 ans, charge ~15-20% plus légère que le sable.\nZéolite : roche volcanique, finesse ~5 microns, qui adsorbe aussi l'ammonium (moins de chloramines et d'odeur de chlore). Durée de vie 5-9 ans. Se dose à environ la moitié du poids de sable équivalent.\nDans tous les cas : surveiller le manomètre (lavage à +0,3/+0,5 bar au-dessus de la référence) et vérifier l'état du sable au changement (sable pris en masse ou canalisé = filtration fantôme).",
    "type": "information",
    "important": 0
  },
  {
    "title": "Fréquence des tests d'eau : piscine privée vs collective",
    "category": "Chimie de l'eau",
    "summary": "Les obligations de contrôle changent radicalement selon le type d'établissement.",
    "body": "Piscine privée familiale : contrôle du pH et du chlore recommandé de façon hebdomadaire au minimum en pleine saison, davantage après une forte fréquentation, un orage ou une chaleur intense. Le TAC et le stabilisant se contrôlent plus ponctuellement (mensuel).\nPiscine collective (hôtel, camping, résidence, établissement recevant du public) : contrôle interne obligatoire au minimum une fois par jour (température, pH, désinfectant, transparence), consigné dans le carnet sanitaire. À cela s'ajoute un contrôle sanitaire externe par un laboratoire agréé mandaté par l'ARS, à fréquence réglementaire selon la classification de l'établissement (type A à D).\nUn professionnel intervenant sur un parc de piscines privées doit adapter sa fréquence de passage à la saison, au volume, à la fréquentation et aux paramètres constatés lors du dernier passage plutôt qu'à un rythme rigide.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Glossaire des termes techniques du métier",
    "category": "Glossaire",
    "summary": "Vocabulaire de base à connaître.",
    "body": "Backwash (contre-lavage) : inversion du sens de circulation de l'eau dans un filtre à sable/diatomées pour évacuer les impuretés retenues.\nSkimmer : écumoire intégrée à la paroi du bassin qui aspire l'eau de surface.\nBonde de fond : prise d'aspiration au point le plus bas du bassin, soumise à un dispositif anti-vortex/anti-entraînement.\nVanne multivoie : vanne du filtre à sable permettant de sélectionner le mode (filtration, lavage, rinçage, vidange, recirculation, hivernage).\nRefoulement : buse qui renvoie l'eau filtrée dans le bassin.\nLigne d'eau : bande à la surface du bassin où se déposent calcaire, graisses et pollens.\nHMT : Hauteur Manométrique Totale, capacité d'une pompe à vaincre les pertes de charge du circuit.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Hivernage d'une piscine",
    "category": "Hivernage / Estivage",
    "summary": "Mise en hivernage passif ou actif avant l'arrêt saisonnier.",
    "body": "1. Nettoyer soigneusement le bassin (brossage parois + fond, aspiration).\n2. Équilibrer l'eau (pH 7.2-7.4, TAC correct) et faire un traitement choc.\n3. Ajouter un produit d'hivernage adapté au traitement (chlore, sel, brome...).\n4. Baisser le niveau d'eau sous les skimmers (hivernage passif) ou laisser tourner la filtration au ralenti (hivernage actif, climat doux).\n5. Vider les canalisations exposées au gel, poser les gizzmos/flotteurs anti-gel dans skimmers et refoulements.\n6. Démonter, vidanger et stocker au sec la pompe et le filtre si hivernage passif complet.\n7. Couvrir le bassin (bâche d'hivernage ou volet).",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Identifier et comprendre les taches métalliques (fer, cuivre, manganèse)",
    "category": "Algues & pathologies de l'eau",
    "summary": "La couleur de l'eau ou des taches oriente directement le diagnostic.",
    "body": "Eau verte translucide (à ne pas confondre avec des algues) : signe de présence de cuivre, souvent lié à la corrosion de canalisations en cuivre ou d'une cellule d'électrolyse en fin de vie.\nTeinte rouille ou brune : présence de fer, fréquente sur les eaux de forage ou de puits utilisées pour le remplissage.\nNuances noires en dépôt : présence de manganèse.\nCes métaux, une fois oxydés (notamment après un choc chlore mal anticipé), précipitent et se déposent sous forme de taches sur les parois, le fond et les équipements : d'où l'importance de traiter les métaux avec un séquestrant avant tout traitement choc plutôt qu'après.",
    "type": "information",
    "important": 0
  },
  {
    "title": "L'indice de Langelier et l'équilibre calco-carbonique",
    "category": "Chimie de l'eau",
    "summary": "Détermine si une eau est entartrante, corrosive, ou équilibrée.",
    "body": "L'indice de Langelier (LSI) synthétise pH, TAC, TH et température pour déterminer si une eau est entartrante, corrosive, ou équilibrée. Un résultat proche de 0 (± 0,3) signale une eau à l'équilibre : c'est l'objectif à viser.\nUn indice positif indique une eau entartrante (dépôts de calcaire sur parois, canalisations, cellule d'électrolyse). Un indice négatif indique une eau corrosive/agressive (attaque des joints, du revêtement, des pièces métalliques).\nUne eau durablement déséquilibrée abîme aussi bien le bassin que les équipements de filtration et de traitement : l'équilibre calco-carbonique doit donc être surveillé au même titre que la désinfection.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Le by-pass : pourquoi 3 vannes et comment ça marche",
    "category": "Équipements",
    "summary": "Le montage obligé des PAC et recommandé pour tout équipement sensible du circuit.",
    "body": "Principe : un by-pass est une dérivation qui permet de faire passer tout ou partie du débit dans un appareil (PAC, réchauffeur, électrolyseur...) : ou de l'isoler complètement : sans jamais interrompre la filtration.\nConstitution : 3 vannes. La vanne centrale est montée sur la canalisation principale entre deux tés ; les vannes d'entrée et de sortie encadrent l'appareil sur la dérivation.\nFonctionnement : vannes entrée/sortie ouvertes + centrale fermée progressivement = l'eau est forcée de traverser l'appareil, et le degré de fermeture de la centrale règle finement le débit qui le traverse. Vannes entrée/sortie fermées + centrale ouverte = l'appareil est isolé, la filtration continue.\nPourquoi c'est indispensable pour une PAC : l'échangeur titane a un débit optimal précis, souvent inférieur au débit total de filtration (trop peu de débit = défaut \"flow\" et arrêts ; trop de débit = pression excessive sur l'échangeur et ΔT trop faible pour la régulation, hors préconisations constructeur). Et l'isolement permet la maintenance et surtout la vidange de l'échangeur avant l'hiver : un échangeur qui gèle est détruit.\nPosition dans le circuit : toujours APRÈS le filtre et AVANT le traitement (électrolyseur, injection) : l'eau fortement chlorée ne doit jamais stagner dans l'échangeur (corrosion). Un clapet anti-retour entre la PAC et le point d'injection est recommandé.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Le stabilisant (acide cyanurique) : rôle et risque de sur-stabilisation",
    "category": "Chimie de l'eau",
    "summary": "Le stabilisant protège le chlore des UV mais ne se dégrade jamais naturellement.",
    "body": "Le stabilisant protège le chlore des UV du soleil, qui le détruisent sinon en 2 à 3h en plein été. Il est indispensable pour une piscine extérieure traitée au chlore.\nMais il présente un piège : il s'accumule dans l'eau au fil des ajouts de chlore stabilisé et ne se dégrade pas naturellement : seule une dilution (renouvellement d'eau) le fait baisser. Au-delà de 50 mg/L, on parle de sur-stabilisation : le chlore devient de moins en moins efficace à dose égale (\"effet de verrouillage\"), ce qui pousse à sur-doser, aggravant le problème.\nRepères réglementaires : la norme DIN EN 16713:2016 tolère jusqu'à 100 mg/L (idéal 30-50 mg/L) ; la réglementation française (arrêté du 7 avril 1981 modifié) fixe un maximum de 75 mg/L.\nSolution : renouveler une partie de l'eau du bassin, ou passer temporairement à un chlore non stabilisé.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Les différents revêtements de piscine et leur entretien",
    "category": "Équipements",
    "summary": "Liner, PVC armé, coque, béton/carrelage, enduit : spécificités d'entretien.",
    "body": "Liner (PVC souple) : économique, confortable, mais sensible aux perforations et à la décoloration ; nettoyage à la brosse douce, jamais de brosse métallique ou de produit abrasif.\nPVC armé : plus résistant et étanche que le liner classique, soudé, adapté aux formes complexes, entretien similaire au liner.\nCoque polyester : très lisse (peu d'accroche pour les algues), durable, mais réparation délicate en cas de fissure (résine spécifique).\nBéton/carrelage : très résistant et personnalisable, mais surface plus poreuse et rugueuse propice à l'accroche des algues (notamment noires dans les joints) ; supporte le brossage avec une brosse plus agressive.\nEnduit : intermédiaire, à réimperméabiliser périodiquement, sensible à l'équilibre de l'eau (indice de Langelier à surveiller de près).",
    "type": "information",
    "important": 0
  },
  {
    "title": "Les différents systèmes de traitement de l'eau",
    "category": "Équipements",
    "summary": "Chlore, brome, sel, oxygène actif, PHMB, UV, ozone : avantages et inconvénients.",
    "body": "Chlore (galets/liquide) : référence historique, efficace et économique, nécessite une gestion régulière du stabilisant.\nBrome : mieux toléré par les peaux sensibles, plus stable en eau chaude (adapté aux spas), mais plus coûteux.\nSel/électrolyse : production de chlore in situ par une cellule, confort de baignade apprécié, nécessite un contrôle régulier du taux de sel (généralement 3 à 5 g/L) et un détartrage périodique de la cellule.\nOxygène actif : sans odeur, doux pour la peau, adapté aux petits bassins/spas familiaux, mais moins rémanent et plus cher à l'usage.\nPHMB (polymère) : sans chlore, incompatible avec un passage ultérieur au chlore sans vidange complète.\nUV et ozone : traitements complémentaires (pas des désinfectants rémanents à eux seuls) qui réduisent la consommation de désinfectant chimique.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Les vannes du circuit : arrêt, clapets anti-retour, 3 voies, motorisées",
    "category": "Équipements",
    "summary": "Chaque organe de ligne a un rôle précis : et quelques règles d'entretien simples.",
    "body": "Vanne à bille (quart de tour) : une sphère percée en PVC-U tourne d'un quart de tour pour ouvrir/fermer. La plus répandue en Ø50/63, avec écrous-unions pour démonter sans couper le tube. Usage : isoler pompe, filtre, PAC, électrolyseur, et équilibrer grossièrement les débits d'aspiration. Entretien : la manœuvrer 2-3 fois par saison pour éviter le grippage ; en hivernage, la laisser à 45° (semi-ouverte) pour ménager les joints.\nVanne guillotine : une lame coulissante, économique, courante en hors-sol. Étanchéité moins durable sous pression qu'une vanne à bille.\nClapet anti-retour : n'autorise le passage que dans un sens (à battant ou à ressort, versions transparentes pour contrôle visuel). Emplacements types : aspiration longue ou pompe au-dessus du plan d'eau (maintient l'amorçage), protection d'équipements au refoulement, ligne d'injection de régulation pH/chlore.\nVanne 3 voies (type Jandy) : un boisseau à 3 orifices qui répartit un flux entre deux directions (tout A, tout B, ou mélange). Remplace deux vannes 2 voies : arbitrage bonde de fond/skimmers, by-pass, circuits solaires.\nVannes motorisées : une vanne Jandy équipée d'un actionneur électrique (souvent 24 V) piloté par un coffret domotique, pour basculer automatiquement des circuits (chauffage solaire, débordement, balnéo).\nRègle transversale : chaque ligne d'aspiration et de refoulement doit avoir sa propre vanne d'isolement au local technique : c'est ce qui permet de diagnostiquer, d'équilibrer et d'intervenir sans vider le bassin.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Mettre en service un surpresseur et son robot à pression",
    "category": "Mise en service",
    "summary": "Le surpresseur ne doit JAMAIS tourner sans la filtration en marche.",
    "body": "1. Vérifier le principe d'installation : le surpresseur prélève l'eau APRÈS le filtre et la renvoie sous pression vers la prise balai (transformée en refoulement) par une canalisation dédiée en PVC rigide pression.\n2. Contrôler l'asservissement électrique : le surpresseur doit être câblé pour ne fonctionner QUE si la pompe de filtration tourne (il aspire l'eau du circuit : jamais à sec). Un coffret avec horloge dédiée gère ses cycles (typiquement 2 à 3h par jour).\n3. Raccorder le robot à la prise balai avec son tuyau flottant, sections bien clipsées, sans vrille.\n4. Filtration en marche, démarrer le surpresseur et vérifier la pression de service du robot (ordre de grandeur 2 à 2,6 bar pour un robot type Polaris) et sa vitesse de déplacement (réglable par les gicleurs/la vis de dérivation selon modèle).\n5. Vérifier le bon fonctionnement du sac collecteur du robot (il capte les gros débris AVANT le filtre du bassin, c'est son gros avantage).\n6. À chaque visite : vider le sac du robot, contrôler l'usure des pneus/patins, vérifier que le tuyau n'est pas vrillé et que la pression reste stable.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Mise en eau d'une piscine neuve",
    "category": "Mise en service",
    "summary": "Premier remplissage et équilibrage d'un bassin neuf.",
    "body": "1. Vérifier que le bassin est propre (aucun débris de chantier) avant le premier remplissage.\n2. Remplir progressivement en surveillant la stabilité de la structure (coque/liner) en respectant les préconisations du poseur.\n3. Une fois remplie, mettre en route la filtration en continu pendant 24 à 48h pour homogénéiser l'eau.\n4. Réaliser une analyse complète (pH, TAC, TH, chlore, stabilisant) : l'eau de remplissage est rarement équilibrée d'origine.\n5. Corriger dans l'ordre : TAC, puis pH, puis TH si besoin.\n6. Mettre en route le traitement choisi (chlore, sel...) et laisser le système se stabiliser plusieurs jours avant de considérer l'eau baignable en continu.\n7. Ne pas se baigner avant validation des paramètres et respect des délais de sécurité après un traitement choc.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Nettoyer des margelles en pierre naturelle",
    "category": "Nettoyage",
    "summary": "Un entretien doux, sans acide ni haute pression, pour ne pas endommager la pierre.",
    "body": "1. Balayer ou aspirer les margelles pour retirer les débris avant lavage.\n2. Préparer un mélange d'eau tiède et de savon noir (ou liquide vaisselle doux).\n3. Frotter avec une brosse à poils souples, jamais de brosse métallique qui raye la pierre.\n4. Pour les taches tenaces, appliquer une pâte de bicarbonate de soude directement sur la tache, laisser agir puis frotter.\n5. Rincer abondamment à l'eau claire et sécher avec un chiffon propre pour éviter les traces de calcaire.\n6. Ne jamais utiliser de nettoyeur haute pression ni de produit acide sur une pierre naturelle : ils attaquent la surface et le jointoiement.\n7. Appliquer un traitement hydrofuge/anti-tache une à deux fois par an pour protéger durablement la pierre.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Nettoyer et détartrer un filtre à cartouche",
    "category": "Filtration",
    "summary": "Entretien régulier de la ou des cartouches filtrantes.",
    "body": "1. Couper la pompe et fermer les vannes si présentes.\n2. Ouvrir la cuve du filtre et sortir la ou les cartouches.\n3. Rincer au jet d'eau en insistant entre les plis, du haut vers le bas.\n4. Si la cartouche est encrassée ou entartrée, la tremper une nuit dans un bain de détartrant/dégraissant spécial cartouche.\n5. Rincer à nouveau abondamment avant remontage.\n6. Vérifier l'état du joint de cuve, le remplacer si craquelé.\n7. Remonter, réamorcer la pompe et relancer la filtration.\n8. Prévoir le remplacement complet de la cartouche tous les 2 à 3 ans ou dès qu'elle est déformée/percée.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Nettoyer et entretenir un robot électrique",
    "category": "Nettoyage",
    "summary": "Entretien du robot lui-même, en complément du nettoyage du bassin.",
    "body": "1. Après chaque cycle, sortir le robot de l'eau et le laisser égoutter quelques minutes avant de l'ouvrir.\n2. Retirer et rincer le(s) filtre(s)/panier(s) de récupération des déchets à chaque utilisation.\n3. Inspecter et nettoyer les brosses : remplacer les brosses mousse après une saison, les brosses PVC après deux saisons environ.\n4. Vérifier l'hélice/turbine 1 à 2 fois par saison (davantage en cas d'usage intensif estival) et retirer les débris coincés.\n5. Dérouler uniquement la longueur de câble nécessaire au bassin et le stocker toujours bien enroulé, sans le nouer.\n6. Stocker le robot au sec, à l'abri du gel et du soleil direct, si possible sur un chariot de transport dédié.\n7. Ne jamais faire fonctionner le robot hors de l'eau : cela endommage le moteur.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Nettoyer le bac tampon d'une piscine à débordement ou miroir",
    "category": "Filtration",
    "summary": "Le bac tampon concentre toutes les impuretés de surface : un entretien négligé y favorise vite les algues.",
    "body": "1. Couper la pompe avant intervention si le bac tampon nécessite un accès direct.\n2. Ouvrir le regard/trappe d'accès au bac tampon (généralement à proximité du local technique).\n3. Retirer manuellement les feuilles, insectes et débris flottants accumulés.\n4. Vérifier l'état de la sonde de niveau et de l'électrovanne de régulation (trop-plein/appoint) : les nettoyer si elles sont entartrées ou encrassées.\n5. Brosser les parois du bac tampon si un dépôt ou un début d'algue est visible, puis passer un coup d'épuisette fine.\n6. Profiter de l'intervention pour contrôler le bon fonctionnement de la pompe de reprise du bac tampon vers la filtration.\n7. À prévoir en moyenne une fois par mois en saison, plus souvent en cas de forte présence de végétation aux abords du bassin.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Norme électrique des piscines (NF C15-100)",
    "category": "Réglementation & sécurité",
    "summary": "Volumes de protection et règles pour le local technique.",
    "body": "La norme NF C15-100 (section 702) encadre les installations électriques à proximité d'un bassin. Elle définit des volumes de protection autour de la piscine (0, 1 et 2) : plus on est proche de l'eau, plus les restrictions sur le matériel électrique autorisé sont sévères.\nLe tableau électrique dédié à la piscine doit être séparé de celui de l'habitation et comporter un interrupteur différentiel 30 mA. Pour s'affranchir des contraintes des volumes de protection, le local technique (et donc la pompe en 230V) doit idéalement être installé à plus de 3,50 m du bord du bassin ; la ventilation et l'étanchéité du local sont essentielles.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Piscine naturelle / biologique : principe et entretien",
    "category": "Équipements",
    "summary": "Une filtration par les plantes et les bactéries, sans chlore.",
    "body": "Une piscine naturelle (ou biologique) fonctionne sans traitement chimique : elle repose sur le principe du lagunage, avec une zone de baignade et une zone de régénération (lagunage) où plantes aquatiques et micro-organismes assurent l'épuration de l'eau.\nL'eau circule en permanence entre les deux zones grâce à une pompe, imitant le fonctionnement d'un écosystème naturel.\nL'entretien reste nécessaire mais différent d'un bassin classique : vidage régulier des skimmers, aspiration ou retrait manuel des algues sur les galets et parois, nettoyage du fond environ une fois par semaine, et surtout entretien de la zone plantée (taille, retrait des plantes mortes) pour garantir l'efficacité de la filtration biologique.\nL'équilibre de ce type de bassin est plus lent à s'installer (souvent une saison complète) mais, une fois stabilisé, demande moins de gestes chimiques qu'une piscine traditionnelle.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Piscine à débordement / miroir : fonctionnement du bac tampon",
    "category": "Équipements",
    "summary": "Le bac tampon, spécificité technique de ces bassins, s'entretient comme un skimmer géant.",
    "body": "Dans une piscine à débordement, l'eau s'écoule en continu par une ou plusieurs goulottes vers un bac tampon (ou bac de rétention), un réservoir indépendant du bassin qui reçoit toute l'eau de surface avec les déchets qu'elle transporte (feuilles, pollens, résidus de crème solaire...). Ce bac représente généralement environ 10% du volume total du bassin.\nLe bac tampon est équipé d'une sonde de niveau et d'une électrovanne d'appoint qui régulent automatiquement le niveau d'eau (compensant l'évaporation et les éclaboussures).\nQuand le débordement est total sur tous les côtés du bassin, on parle de piscine \"miroir\" : l'eau affleure exactement le niveau du sol pour un effet visuel de reflet.\nL'entretien du bac tampon (nettoyage régulier des déchets accumulés, contrôle de la sonde et de l'électrovanne) est indispensable : négligé, il devient un foyer de prolifération d'algues qui contamine ensuite tout le bassin.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Pompe bruyante ou qui chauffe anormalement",
    "category": "Dépannage matériel",
    "summary": "Diagnostic des causes courantes de bruit et surchauffe moteur.",
    "body": "1. Couper l'alimentation avant toute intervention.\n2. Vérifier une prise d'air (bruit de \"gargouillis\") : contrôler joint de préfiltre, niveau d'eau, vannes d'aspiration.\n3. Vérifier qu'aucun corps étranger n'est coincé dans la turbine (démontage du corps de pompe si besoin).\n4. Contrôler que la pompe n'est pas désamorcée ou qu'elle ne fonctionne pas à sec.\n5. Vérifier l'état des roulements moteur (bruit métallique aigu = roulements à changer, intervention SAV).\n6. Vérifier la ventilation du local technique : un moteur qui chauffe dans un local mal ventilé disjoncte par sécurité thermique.\n7. Contrôler la tension d'alimentation et l'état du condensateur si moteur monophasé qui peine à démarrer.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Pompe à chaleur qui ne chauffe plus ou disjoncte",
    "category": "Dépannage matériel",
    "summary": "Points de contrôle avant intervention d'un frigoriste agréé.",
    "body": "1. Vérifier que la filtration est bien en marche : une PAC ne chauffe que lorsque l'eau circule (contact de débit).\n2. Contrôler la température de consigne et le mode (chauffage/éco) sur le panneau de commande.\n3. Vérifier qu'aucun code défaut n'est affiché ; noter le code pour diagnostic ou SAV.\n4. Contrôler que l'unité extérieure n'est pas obstruée (feuilles, végétation) et que l'air circule librement autour de l'évaporateur.\n5. Vérifier le dégivrage : en dessous de 10-12°C d'air extérieur, un cycle de dégivrage périodique est normal.\n6. Si la PAC disjoncte : couper, vérifier l'absence d'humidité dans le boîtier électrique, contrôler le différentiel dédié ; ne pas forcer une remise sous tension répétée, faire intervenir un frigoriste agréé si le défaut persiste.\n7. Vérifier le dimensionnement : une PAC sous-dimensionnée peine à maintenir la température par temps frais, ce n'est pas toujours une panne.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Pompe à vitesse variable : fonctionnement, loi d'affinité et économies",
    "category": "Équipements",
    "summary": "Diviser la vitesse par 2 divise la consommation par 8 : la physique derrière l'argument commercial.",
    "body": "Fonctionnement : moteur synchrone à aimants permanents piloté par un variateur de fréquence intégré. La vitesse est réglable (typiquement de ~1000 à ~3000 tr/min) et programmable par plages horaires.\nLa loi d'affinité des pompes (la base physique) : quand la vitesse de rotation N varie, le débit varie proportionnellement à N, la pression varie comme N², et la puissance absorbée varie comme N³. Concrètement : vitesse ÷ 2 = débit ÷ 2 mais consommation ÷ 8.\nConséquence : filtrer 24h à basse vitesse consomme nettement moins que 4 à 8h à pleine vitesse, pour un volume d'eau filtré équivalent ou supérieur : avec en prime une meilleure finesse de filtration (l'eau traverse le média plus lentement) et beaucoup moins de bruit. Économies constatées : 65 à 85% selon usage et réglages, amortissement en moins de 3 saisons en général.\nUsage type : basse vitesse pour la filtration quotidienne, vitesse moyenne quand la PAC ou l'électrolyseur fonctionnent (attention à respecter le débit minimum de leur contacteur débitmétrique), pleine vitesse pour le backwash et le robot hydraulique.\nPièges qui ruinent les économies : pompe qui tourne surtout à haute vitesse, filtre encrassé, hydraulique sous-dimensionnée. Note réglementaire : la vitesse variable est de fait imposée aux États-Unis (règle DOE 2021) mais reste un simple argument d'économie en France/UE, pas une obligation.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Premiers secours et prévention de la noyade",
    "category": "Réglementation & sécurité",
    "summary": "La noyade reste la 1ère cause de mort accidentelle chez les moins de 6 ans avec piscine.",
    "body": "La noyade reste la première cause de mort accidentelle chez les enfants de moins de 6 ans en France disposant d'une piscine privée.\nRappels essentiels à transmettre systématiquement aux clients : surveillance active et continue d'un adulte dès qu'un enfant est à proximité de l'eau, même équipée d'un dispositif de sécurité normalisé (aucun dispositif n'est infaillible ni ne dispense de surveillance) ; ne jamais laisser un enfant seul même quelques instants ; réarmer systématiquement alarme/couverture après chaque utilisation.\nEn cas de noyade : sortir la victime de l'eau, alerter les secours (15 ou 112), débuter une réanimation cardio-pulmonaire (RCP) si la victime ne respire pas : la formation aux gestes qui sauvent (PSC1) est vivement recommandée pour tout professionnel intervenant sur des piscines.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Purger l'air et réamorcer le circuit de filtration",
    "category": "Filtration",
    "summary": "À faire après toute intervention sur le circuit hydraulique ou en cas de prise d'air.",
    "body": "1. Couper la pompe et fermer les vannes d'aspiration/refoulement.\n2. Ouvrir le purgeur d'air du filtre (vis ou bouchon sur le dessus de la cuve).\n3. Remplir le préfiltre de la pompe avec de l'eau avant de refermer le couvercle.\n4. Rouvrir les vannes, remettre la pompe sous tension.\n5. Laisser le purgeur ouvert jusqu'à ce qu'un filet d'eau continu (sans air) en sorte, puis le refermer.\n6. Vérifier la pression au manomètre : une pression normale confirme l'amorçage réussi.\n7. Si l'air revient en continu, rechercher une prise d'air (joint de préfiltre, raccord, niveau d'eau du bassin insuffisant).",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Rattraper une eau trouble ou laiteuse (floculation)",
    "category": "Traitement de l'eau",
    "summary": "Clarification d'une eau trouble par floculation.",
    "body": "1. Vérifier et équilibrer pH (7.2-7.4) et chlore avant floculation (le floculant est inefficace si le pH est déséquilibré).\n2. Nettoyer le filtre avant traitement pour repartir sur une filtration efficace.\n3. Verser le floculant liquide directement devant les buses de refoulement, filtration en marche, ou utiliser des cartouches/galets de floculant dans le skimmer selon le produit.\n4. Laisser agir avec une filtration continue de plusieurs heures : les particules en suspension s'agglomèrent en flocons.\n5. Pour un filtre à sable : baisser le débit ou passer en position \"Recirculation\" quelques minutes pour laisser les flocons se déposer, puis repasser en \"Filtration\" en douceur (éviter le backwash qui renvoie tout au fond).\n6. Aspirer manuellement à l'évacuation (hors filtre) les dépôts qui se sont déposés au fond.\n7. Nettoyer le filtre une fois l'eau limpide.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Recharger un filtre à diatomées",
    "category": "Filtration",
    "summary": "Nettoyage des éléments filtrants et rechargement en terre de diatomées.",
    "body": "1. Couper la pompe, fermer les vannes, mettre la vanne multivoie sur \"Vidange\".\n2. Vidanger la cuve et retirer les grilles (éléments filtrants).\n3. Rincer soigneusement les éléments filtrants au jet, en éliminant tous les résidus de terre de diatomées.\n4. Vérifier l'état des toiles/grilles et les remplacer si déchirées.\n5. Remonter les éléments, refermer la cuve.\n6. Mettre en \"Filtration\", démarrer la pompe et introduire la nouvelle charge de diatomées par le skimmer, dosée selon la surface filtrante du filtre (voir notice fabricant).\n7. Vérifier que l'eau ressort claire avant de considérer l'opération terminée.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Remise en route au printemps",
    "category": "Hivernage / Estivage",
    "summary": "Réouverture de la piscine après hivernage.",
    "body": "1. Retirer la bâche/volet d'hivernage, la nettoyer avant stockage.\n2. Retirer les gizzmos et remonter pompe/filtre si démontés.\n3. Remonter le niveau d'eau au-dessus des skimmers.\n4. Nettoyer le bassin (brossage, aspiration des feuilles et dépôts hivernaux).\n5. Faire un backwash complet du filtre avant remise en route.\n6. Relancer la filtration en continu 24-48h.\n7. Tester et rééquilibrer TAC, pH puis chlore ; refaire un choc si l'eau est trouble.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Remplacer la garniture mécanique d'une pompe qui fuit",
    "category": "Dépannage matériel",
    "summary": "Une goutte à goutte entre le corps de pompe et le moteur = garniture mécanique morte.",
    "body": "1. Confirmer : fuite d'eau entre le corps hydraulique et le moteur (dessous de pompe humide en marche). C'est la garniture mécanique : l'étanchéité tournante de l'arbre : qui est usée (marche à sec, calcaire ou eau agressive).\n2. Couper l'alimentation, fermer les vannes, vidanger le corps de pompe (bouchon de purge).\n3. Séparer le bloc moteur du corps de pompe (vis d'assemblage), puis déposer le diffuseur pour accéder à la turbine.\n4. Bloquer l'arbre (méplat côté ventilateur) et dévisser la turbine dans le sens anti-horaire (filetage standard, conçu pour que la rotation du moteur la serre). Attention : certains modèles ont un filetage inversé ou une vis centrale à pas inversé : toujours vérifier la notice avant de forcer.\n5. Retirer les DEUX parties de la garniture : la partie tournante sur l'arbre derrière la turbine, et la partie fixe (grain céramique) logée dans le fond du corps ou le support.\n6. Nettoyer l'arbre et les logements, monter la garniture neuve complète (jamais un seul côté) sans toucher les faces de friction avec les doigts : eau savonneuse pour faciliter l'emmanchement, pas de graisse.\n7. Remonter turbine, diffuseur et corps avec des joints toriques neufs, réamorcer (préfiltre rempli d'eau) et vérifier l'absence de fuite en marche.\n8. Prévention : ne jamais faire tourner une pompe à sec : la garniture est lubrifiée par l'eau et se détruit en quelques minutes sans elle.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Remplacer une ampoule ou un spot LED étanche",
    "category": "Dépannage matériel",
    "summary": "Intervention sur un projecteur de piscine, hors tension impérative.",
    "body": "1. Couper impérativement l'alimentation électrique du projecteur au disjoncteur dédié (jamais d'intervention sous tension en milieu humide).\n2. Baisser le niveau d'eau sous le niveau du projecteur si celui-ci doit être sorti de sa niche.\n3. Dévisser la vis de sécurité (souvent imperdable) et sortir délicatement le hublot sans tirer sur le câble.\n4. Remplacer l'ampoule/le bloc LED par un modèle strictement identique (culot, puissance, tension : 12V pour la plupart des piscines privées).\n5. Vérifier et remplacer le joint torique d'étanchéité du hublot avant remontage (graisse silicone légère).\n6. Revisser en croix pour une pression homogène, remettre l'eau à niveau, puis remettre sous tension et tester.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Renseigner le carnet sanitaire d'une piscine collective",
    "category": "Sécurité",
    "summary": "Obligation quotidienne pour tout établissement recevant du public avec piscine.",
    "body": "1. Relever au minimum une fois par jour (davantage en cas de forte fréquentation) : température de l'eau et de l'air, pH, teneur en désinfectant (chlore libre et combiné, ou brome), transparence de l'eau.\n2. Consigner chaque relevé avec l'heure et l'identité de la personne ayant réalisé le contrôle.\n3. Noter tout incident (dépassement de paramètre, panne, intervention corrective) et l'action corrective mise en œuvre.\n4. Conserver le carnet sanitaire sur site : il doit être présenté à toute demande de l'ARS ou du laboratoire agréé lors des contrôles sanitaires.\n5. Vérifier la classification de l'établissement (types A à D selon fréquentation) qui détermine la fréquence des prélèvements réglementaires effectués par un laboratoire agréé.\n6. Archiver les résultats d'analyses du laboratoire agréé avec le carnet : ils font partie intégrante du dossier sanitaire de l'établissement.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Risque de légionellose dans les spas et bains à remous",
    "category": "Réglementation & sécurité",
    "summary": "La plage de température des spas est aussi celle de prolifération de la bactérie.",
    "body": "La légionellose est une infection pulmonaire grave provoquée par l'inhalation d'aérosols contenant la bactérie Legionella pneumophila. Les spas et bains à remous sont particulièrement à risque : leur température de fonctionnement (30 à 40°C) se situe précisément dans la zone de multiplication optimale de la bactérie (25-45°C, avec un pic entre 32 et 42°C où la population double toutes les 3-4h), combinée à un faible volume d'eau et une forte agitation générant des aérosols.\nLa prévention passe par un contrôle rigoureux et permanent du désinfectant, une vidange et un nettoyage complet des canalisations réguliers (tous les 3-4 mois), et la lutte contre l'entartrage/la corrosion qui favorisent la formation de biofilm, terrain propice à la bactérie.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Robot électrique vs robot hydraulique : comparatif",
    "category": "Équipements",
    "summary": "Autonomie, capacités de nettoyage et entretien : deux logiques différentes.",
    "body": "Robot hydraulique : se raccorde à la prise balai ou au skimmer, fonctionne grâce au débit d'eau généré par la pompe de filtration existante. Nettoie principalement le fond (rarement les parois). Peu de composants électroniques donc grande fiabilité mécanique, mais sollicite davantage le préfiltre et le filtre du bassin qu'il faut nettoyer plus souvent.\nRobot électrique : totalement autonome, se branche simplement sur une prise électrique (ou fonctionne sur batterie), possède son propre système d'aspiration et de filtration embarqué. Nettoie fond, parois et parfois ligne d'eau en 1h30 à 2h. Entretien limité au nettoyage du filtre/des brosses après chaque cycle, mais coût d'achat nettement plus élevé et plus de composants électroniques pouvant tomber en panne.\nLe choix dépend du budget, du niveau d'exigence de propreté recherché et de la sollicitation acceptable du système de filtration existant.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Réaliser une vidange de piscine dans les règles",
    "category": "Mise en service",
    "summary": "Une vidange mal préparée peut polluer le milieu naturel et endommager le bassin.",
    "body": "1. Arrêter tout traitement au chlore au moins 15 jours avant la vidange pour laisser le temps au chlore de se neutraliser naturellement.\n2. Vérifier auprès de la commune/du service d'assainissement si un rejet au réseau d'eaux usées est autorisé (dérogation possible selon la capacité des ouvrages) ; à défaut, prévoir une infiltration dans le sol via un puits de décantation.\n3. Ne jamais rejeter l'eau de vidange directement dans un cours d'eau, un fossé ou le réseau d'eaux pluviales sans neutralisation préalable du chlore.\n4. Vidanger progressivement pour un bassin béton/carrelage (risque de soulèvement de la structure en terrain humide si vidé trop vite) ; pour un liner, éviter de laisser le bassin vide trop longtemps (rétractation).\n5. Profiter de la vidange pour inspecter et nettoyer en profondeur le fond, les parois et les pièces à sceller.\n6. Reremplir et rééquilibrer l'eau selon la procédure de mise en eau (TAC, pH, puis traitement).",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Réglementation des piscines collectives (ARS)",
    "category": "Réglementation & sécurité",
    "summary": "Carnet sanitaire, classification des établissements et contrôle sanitaire externe.",
    "body": "Toute piscine à usage collectif (hôtel, camping, résidence de tourisme, centre de vacances...) est soumise à une obligation de moyens et de résultats en matière de sécurité sanitaire de l'eau, encadrée notamment par l'arrêté du 26 mai 2021.\nLes établissements sont classés en 4 types (A à D) selon leur nature et leur fréquentation, ce qui détermine la fréquence du contrôle sanitaire réalisé par un laboratoire agréé pour le compte de l'ARS (Agence Régionale de Santé) : environ 8 prélèvements par an pour les piscines de type A (les plus fréquentées), environ 4 par an pour le type B, et une fréquence réduite pouvant aller jusqu'à un contrôle annuel pour les plus petits établissements ; les établissements saisonniers (ouverture ≤ 6 mois) doivent être contrôlés au moins 2 fois par période d'ouverture.\nEn complément du contrôle externe, l'exploitant doit assurer un autocontrôle quotidien (température, pH, désinfectant, transparence) consigné dans le carnet sanitaire, document obligatoire à présenter lors de toute inspection.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Réglementation du rejet des eaux de vidange",
    "category": "Réglementation & sécurité",
    "summary": "Un rejet mal préparé est une infraction et un risque environnemental.",
    "body": "Le rejet des eaux de vidange d'un bassin dans le réseau collectif d'eaux usées est en principe interdit (article R.1331-2 du Code de la santé publique), sauf dérogation accordée par le service d'assainissement si la capacité de ses ouvrages le permet sans nuire au milieu récepteur : une autorisation préalable doit donc être demandée.\nLe rejet sauvage dans la nature (cours d'eau, fossé) est interdit et pénalement sanctionné par l'article L216-6 du Code de l'environnement (jusqu'à 2 ans d'emprisonnement et 75 000 € d'amende en cas de pollution), complété par l'article L432-2 lorsque le rejet nuit au poisson.\nQuand elle est possible, l'évacuation se fait de préférence par infiltration dans le sol, via un puits de décantation, après neutralisation complète du chlore.\nPrécaution essentielle : arrêter tout traitement au chlore au moins 15 jours avant la vidange pour laisser le temps aux résidus de se neutraliser naturellement et protéger la faune/flore aquatique du milieu récepteur.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Régler le by-pass d'une pompe à chaleur",
    "category": "Mise en service",
    "summary": "Trois vannes à orchestrer pour donner à la PAC exactement le débit qu'elle demande.",
    "body": "1. Identifier les 3 vannes du by-pass : vanne centrale (n°1) sur la canalisation principale entre les deux tés, vanne d'entrée PAC (n°2), vanne de sortie PAC (n°3).\n2. Filtration en marche, ouvrir en grand les vannes d'entrée (2) et de sortie (3) de la PAC.\n3. Fermer PROGRESSIVEMENT la vanne centrale (1) : l'eau est forcée de traverser la PAC. Plus la centrale est fermée, plus le débit dans la PAC augmente.\n4. Ajuster jusqu'au débit préconisé par le constructeur : la PAC ne doit afficher aucun défaut de débit (code \"FL\"/\"flow\") et l'écart de température entrée/sortie doit rester autour de 1 à 2°C (un écart trop grand = débit insuffisant).\n5. Marquer la position finale de la vanne centrale (trait au feutre) pour la retrouver après toute manipulation.\n6. Pour isoler la PAC (maintenance, hivernage) : fermer les vannes 2 et 3, ouvrir la centrale en grand : la filtration continue sans passer par la PAC, et l'échangeur peut être vidangé (protection gel indispensable : un échangeur titane qui gèle est détruit).",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Stockage du chlore : risques d'incendie et cadre ICPE",
    "category": "Réglementation & sécurité",
    "summary": "Le chlore est un comburant : mal stocké, il peut provoquer un incendie ou une explosion.",
    "body": "Les produits chlorés de traitement de piscine présentent un risque chimique spécifique (incendie, dégagement de gaz toxiques) renforcé depuis les évolutions réglementaires de janvier 2020 sur le stockage des produits de traitement de l'eau.\nCertains produits chlorés peuvent libérer du trichlorure d'azote en cas de mélange accidentel ou d'humidification, en quantité suffisante pour déclencher un incendie voire une explosion.\nPour un stockage de chlore gazeux en grande quantité (installations collectives), le cadre ICPE impose une déclaration à partir de 100 kg et une autorisation à partir de 500 kg de capacité totale.\nRègles de base pour tout local technique : ne jamais stocker de matières combustibles à proximité du chlore, local clos, aéré, à l'abri du soleil et d'une température ambiante ne dépassant pas 50°C, produits toujours dans leur emballage d'origine étiqueté.",
    "type": "information",
    "important": 0
  },
  {
    "title": "Sécurité anti-emprisonnement : bondes de fond et aspirations",
    "category": "Réglementation & sécurité",
    "summary": "L'aspiration d'une piscine peut plaquer ou happer un baigneur : les parades sont normalisées.",
    "body": "Les risques : placage du corps sur une grille d'aspiration, succion par vortex, happement des cheveux ou d'un membre. Des accidents graves, notamment sur les fortes aspirations (balnéo, NCC, piscines collectives).\nGrille anti-vortex : obligatoire sur la bonde de fond : sa forme bombée et ses ouvertures empêchent la formation d'un tourbillon et le placage complet du corps (référentiels : XP P90-314 côté France, ASME A112.19.8 pour les équipements importés). Une grille cassée ou manquante = remplacement immédiat, baignade interdite en attendant.\nVitesse de passage : au maximum 0,5 m/s à travers la grille d'aspiration : c'est ce qui dimensionne la taille de la grille par rapport au débit.\nDouble bonde : pour les fortes aspirations, deux bondes espacées d'au moins 2 m (référentiel européen EN 16713-2 ; la règle américaine VGB descend à ~0,9 m) raccordées sur la même ligne, chacune dimensionnée pour le débit total : si l'une est obstruée par un corps, l'autre casse la dépression.\nArrêt d'urgence : un bouton coup-de-poing coupant la ou les pompes, accessible près du bassin : obligatoire en piscine recevant du public, fortement recommandé en privé dès qu'il y a NCC ou balnéo.\nRègles d'intervention : jamais de baignade pendant une aspiration prise balai ou une vidange, et vérifier l'état des grilles à chaque passage (c'est un contrôle de 10 secondes qui engage la responsabilité du professionnel).",
    "type": "information",
    "important": 0
  },
  {
    "title": "Tester et remplacer le condensateur d'une pompe qui bourdonne",
    "category": "Dépannage matériel",
    "summary": "Le condensateur est la panne n°1 des pompes monophasées : bourdonnement sans démarrage.",
    "body": "1. Symptôme typique : la pompe bourdonne à la mise sous tension mais le moteur ne se lance pas (ou disjoncte après quelques secondes). Couper l'alimentation au disjoncteur avant toute intervention.\n2. Écarter d'abord un blocage mécanique : capot ventilateur déposé, lancer l'arbre à la main. S'il est bloqué (calcaire après hivernage), le débloquer ; s'il tourne librement, suspecter le condensateur.\n3. Localiser le condensateur (cylindre dans le capot arrière ou la boîte à bornes) et le DÉCHARGER en court-circuitant ses bornes avec un tournevis isolé : il peut conserver une charge électrique dangereuse même hors tension.\n4. Le tester au multimètre en mode capacimètre : la valeur mesurée doit correspondre à celle marquée sur le boîtier (couramment 12,5 à 40 µF). Une valeur effondrée, un boîtier gonflé ou une fuite d'huile = condensateur mort.\n5. Remplacer par un condensateur de MÊME capacité (tolérance ±5%) et même tension : trop faible, le moteur ne démarre pas ; trop fort, il chauffe et s'abîme.\n6. Rebrancher à l'identique, remonter, remettre sous tension et vérifier le démarrage franc du moteur.\n7. Si le moteur grésille toujours ou disjoncte avec un condensateur neuf : suspecter les enroulements (mesure de résistance/isolement) : intervention SAV ou remplacement moteur.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Tester l'eau avec un photomètre électronique",
    "category": "Analyse & routine",
    "summary": "Outil professionnel pour une lecture précise et multi-paramètres.",
    "body": "1. Vérifier que la cuve de mesure est propre et sèche, sans rayure sur les faces optiques.\n2. Réaliser un \"blanc\" avec de l'eau du bassin seule (sans réactif) pour calibrer l'appareil sur cet échantillon avant chaque série de mesures.\n3. Ajouter le réactif adapté au paramètre recherché (DPD1 pour chlore libre, DPD3 pour chlore total, phénol red pour pH, etc.).\n4. Refermer, agiter doucement pour dissoudre sans faire mousser (la mousse fausse la lecture optique).\n5. Essuyer l'extérieur de la cuve avant de l'insérer dans l'appareil.\n6. Lancer la mesure et lire directement la valeur numérique affichée (généralement en mg/L ou ppm).\n7. Nettoyer systématiquement la cuve après chaque test et étalonner l'appareil selon la périodicité du fabricant.\n8. Le photomètre permet en général de mesurer en série pH, chlore libre/total, TAC, TH, stabilisant, sel, avec une précision bien supérieure aux bandelettes.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Traiter les algues moutarde (jaunes)",
    "category": "Traitement de l'eau",
    "summary": "Algues jaunâtres résistantes au chlore classique, souvent dans les zones ombragées.",
    "body": "1. Identifier : dépôt jaunâtre, poudreux, qui se redépose vite après brossage, souvent dans les zones ombragées et les paniers de skimmer.\n2. Brosser énergiquement toutes les surfaces touchées et les accessoires (échelle, jouets, maillots à laver aussi car elles s'y accrochent).\n3. Réaliser un traitement choc avec un produit anti-algues moutarde spécifique en complément du chlore choc.\n4. Nettoyer soigneusement le filtre pendant le traitement (elles s'y logent).\n5. Filtration continue 24 à 48h, recontrôler et répéter le brossage/choc si nécessaire.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Traiter les algues noires",
    "category": "Traitement de l'eau",
    "summary": "Les plus résistantes, incrustées dans les joints et micro-fissures.",
    "body": "1. Identifier : taches noires/bleu-vert incrustées, résistantes au brossage simple, souvent sur joints de carrelage ou liner abîmé.\n2. Brosser vigoureusement avec une brosse adaptée au revêtement (brosse inox pour béton/carrelage uniquement, jamais sur liner) pour casser la membrane protectrice de l'algue.\n3. Appliquer un traitement anti-algues noires concentré directement sur les taches (produit à action choc localisée).\n4. Compléter par un traitement choc chlore de l'ensemble du bassin.\n5. Filtration continue, renouveler l'opération après quelques jours si les taches persistent.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Traiter une eau brune ou tachée (fer, cuivre, manganèse)",
    "category": "Traitement de l'eau",
    "summary": "Identifier la cause avant de traiter, sous peine d'aggraver les taches.",
    "body": "1. Identifier la teinte : eau verte translucide (cuivre, souvent lié à la corrosion de canalisations ou d'une cellule d'électrolyse), teinte rouille/brune (fer), nuances noires (manganèse).\n2. Ramener le pH entre 7.0 et 7.4 avant tout traitement : l'efficacité du séquestrant en dépend directement.\n3. Ne pas faire de choc chlore avant d'avoir traité les métaux : un choc sur une eau chargée en métaux précipite et fixe les taches sur les parois.\n4. Ajouter un séquestrant métaux (produit \"anti-métaux\" complexant) selon le dosage indiqué pour le volume du bassin.\n5. Laisser agir avec la filtration en marche, sans choc chlore pendant ce délai.\n6. Une fois l'eau limpide, reprendre un traitement chlore normal, et renouveler le séquestrant à chaque appoint d'eau important si l'eau du réseau est chargée en métaux.\n7. En prévention sur une eau connue pour être chargée en fer/cuivre : ajouter systématiquement le séquestrant à chaque remplissage.",
    "type": "procedure",
    "important": 0
  },
  {
    "title": "Étalonner une sonde de régulation pH/redox",
    "category": "Dépannage matériel",
    "summary": "Étalonnage recommandé tous les 1 à 3 mois pour une régulation fiable.",
    "body": "1. Couper ou mettre en pause la régulation automatique (pH, chlore/redox) avant l'étalonnage.\n2. Démonter la sonde et la rincer à l'eau claire.\n3. Tremper la sonde dans une solution étalon pH 7, attendre la stabilisation de la mesure, ajuster si l'appareil le permet (bouton \"cal\").\n4. Rincer puis tremper dans une solution étalon pH 4 (ou 10 selon la plage utilisée), ajuster la pente.\n5. Pour une sonde redox : utiliser une solution étalon redox dédiée (souvent 465 mV) et ajuster de la même façon.\n6. Rincer, remonter la sonde, relancer la régulation et vérifier la cohérence avec une mesure manuelle (test kit ou photomètre).",
    "type": "procedure",
    "important": 0
  }
] as const;
