// Original field procedures, tied to the actual equipment notice rather than a universal valve diagram.
export type GuideStep = {
  id: string;
  title: string;
  detail: string;
  variant?: string;
};
export type MaintenanceGuide = {
  id: string;
  title: string;
  category: string;
  summary: string;
  note: string;
  sections: { title: string; steps: GuideStep[] }[];
  sources: { title: string; url: string }[];
  variants?: Record<string, string>;
};
const step = (
  id: string,
  title: string,
  detail: string,
  variant?: string,
): GuideStep => ({ id, title, detail, ...(variant ? { variant } : {}) });
const sand = {
  title: "Hayward — notice de filtre à sable",
  url: "https://cdn.hayward.fr/production/media/3/4/6/6/6b626c.pdf",
};
const cartridge = {
  title: "Pentair — sécurité des filtres à cartouche",
  url: "https://www.pentair.com/en-us/pool-spa/education-support/homeowner-support/pool-filter-product-safety-help-center/clean-clear-rp-product-support.html",
};
const filtration = {
  title: "BAYROL — entretien du filtre",
  url: "https://www.bayrol.fr/conseils/filtration-piscine-entretien-du-filtre",
};
const water = {
  title: "Hanna — méthode et notice du photomètre piscine",
  url: "https://www.hannainstruments.fr/applications/photometre-piscine-alcalinite-acide-cyanurique-chlore-et-ph-en-mallette-avec-reactifs-hi971044r/",
};
const salt = {
  title: "Zodiac — assistance des équipements",
  url: "https://www.zodiac-poolcare.fr/assistance/assistance-en-ligne",
};
const cleaning = {
  title: "BAYROL — entretien de la piscine",
  url: "https://www.bayrol.fr/nos-conseils/entretenir-sa-piscine",
};
const valves = {
  title: "Hayward — fonctions de la vanne multivoies",
  url: "https://www.hayward.fr/article/videos/la-vanne-d-un-filtre",
};
const backwash = [
  step(
    "identify",
    "Identifier le filtre et le besoin de lavage",
    "Cette séquence concerne un filtre à sable ou à verre avec vanne multivoies. Comparer la pression au repère filtre propre, le débit et la notice. Un lavage ne s’impose pas automatiquement à chaque passage.",
  ),
  step(
    "waste",
    "Vérifier le rejet et le niveau d’eau",
    "Repérer la conduite d’égout, son évacuation autorisée et les vannes utiles sur ce montage. Prévoir la perte d’eau ; garder un niveau suffisant pour éviter toute prise d’air.",
  ),
  step(
    "stop",
    "Arrêter la pompe avant la vanne",
    "Empêcher un redémarrage automatique pendant les manipulations. Attendre l’arrêt de la circulation. Ne jamais déplacer la poignée sous débit, ni faire tourner la pompe en position fermée.",
  ),
  step(
    "wash",
    "Laver à contre-courant",
    "Pompe arrêtée, sélectionner LAVAGE / BACKWASH selon la notice et vérifier le circuit de rejet. Redémarrer puis surveiller le voyant ou l’eau rejetée jusqu’au critère de fin du fabricant. Arrêter immédiatement en cas de défaut de débit ou d’aspiration d’air.",
  ),
  step(
    "rinse",
    "Arrêter, puis rincer",
    "Arrêter la pompe. Sélectionner RINÇAGE / RINSE, redémarrer et respecter la durée ou le critère du modèle. Puis arrêter de nouveau la pompe.",
  ),
  step(
    "restore",
    "Revenir en filtration et contrôler",
    "Pompe arrêtée, remettre FILTRATION / FILTER et la position de service des vannes repérées. Redémarrer, vérifier débit, fuites, pression et absence de rejet anormal. Noter la pression propre et rétablir l’automatisme et le niveau d’eau.",
  ),
];
const prefilter = [
  step(
    "identify",
    "Vérifier la présence du panier de pompe",
    "Identifier le préfiltre de pompe, son couvercle, les joints et les vannes d’isolement sur la notice. Ne pas confondre avec le panier du skimmer.",
  ),
  step(
    "isolate",
    "Mettre à l’arrêt et supprimer la pression",
    "Couper et empêcher le redémarrage de la pompe. Isoler hydrauliquement seulement selon le montage et la notice. Relâcher la pression comme prévu par le fabricant avant toute ouverture ; ne pas forcer un couvercle sous pression.",
  ),
  step(
    "basket",
    "Nettoyer le panier et la portée du joint",
    "Ouvrir suivant la notice, retirer les débris, rincer le panier, contrôler son état et nettoyer la portée. Vérifier le joint et utiliser uniquement un lubrifiant compatible si la notice le prévoit.",
  ),
  step(
    "close",
    "Refermer et réamorcer selon le modèle",
    "Reposer correctement le panier et le couvercle, sans serrage excessif. Remplir le corps de pompe si la procédure d’amorçage le demande. Rouvrir les voies nécessaires avant le démarrage : ne jamais laisser la pompe tourner à sec.",
  ),
  step(
    "check",
    "Contrôler le retour en service",
    "Vérifier amorçage, circulation, bulles persistantes et fuites. Si l’amorçage échoue, arrêter et diagnostiquer suivant la notice. Remettre l’automatisme après contrôle.",
  ),
];
const cardSteps = [
  step(
    "identify",
    "Vérifier le modèle et l’encrassement",
    "Une cartouche ne se contre-lave pas par une séquence de filtre à sable. Se référer au modèle, à son débit et à sa pression propre.",
  ),
  step(
    "safe",
    "Arrêter, isoler et dépressuriser",
    "Couper l’alimentation et prévenir tout redémarrage automatique. Ouvrir la purge prévue par la notice, rester à l’écart et attendre la disparition complète de la pression ; vérifier le manomètre à zéro avant d’ouvrir le filtre.",
  ),
  step(
    "open",
    "Démonter selon la notice",
    "Repérer le collier ou la fermeture, retirer la cartouche et contrôler les plis, les extrémités et les joints. Si le mécanisme est endommagé ou incertain, ne pas remettre sous pression.",
  ),
  step(
    "clean",
    "Rincer entre les plis",
    "Rincer avec un jet doux adapté, sans nettoyeur haute pression. Pour un nettoyage chimique, utiliser seulement un produit compatible et suivre sa notice, puis rincer complètement.",
  ),
  step(
    "restore",
    "Remonter et purger l’air",
    "Remonter la fermeture exactement selon la notice. Rétablir les voies de circulation, purger l’air pendant la remise en service selon le modèle, puis contrôler l’étanchéité, le débit et la pression propre. Se tenir à l’écart pendant la montée en pression.",
  ),
];
export const MAINTENANCE_GUIDES: MaintenanceGuide[] = [
  {
    id: "entretien",
    title: "Entretien courant · du premier contrôle au compte rendu",
    category: "Analyse & routine",
    summary:
      "Une tournée guidée : eau, bassin, filtration, équipements et prochain passage.",
    note: "Adapter cette trame au contrat, au revêtement et aux notices du bassin. « Non applicable » doit correspondre à un équipement absent ou à une opération non nécessaire. En cas de danger, de pièce inconnue ou d’anomalie persistante, arrêter l’opération concernée et consigner le besoin de diagnostic.",
    variants: {
      sand: "Filtre à sable ou à verre",
      cartridge: "Filtre à cartouche",
      other: "Autre filtre / modèle à identifier",
    },
    sections: [
      {
        title: "1. Arriver et préparer",
        steps: [
          step(
            "arrival",
            "Lire le dossier avant d’agir",
            "Consulter le dernier compte rendu, les mesures, les anomalies, les produits à apporter et les consignes du client. Identifier le revêtement, le traitement, la pompe, le filtre et la position habituelle des vannes.",
          ),
          step(
            "safety",
            "Sécuriser la zone et inspecter",
            "Vérifier accès, protection du bassin, fuites visibles, bruit inhabituel et état apparent du local. Ne pas ouvrir de coffret électrique. Éloigner les baigneurs des opérations d’entretien et garder les produits séparés.",
          ),
          step(
            "level",
            "Contrôler le niveau d’eau et lancer l’appoint si nécessaire",
            "Comparer le niveau au repère prévu par le fabricant du skimmer. Si l’aspiration prend de l’air, arrêter la pompe et corriger avant reprise. Si un appoint est nécessaire et autorisé, le démarrer sous surveillance ; prévoir son arrêt avant de partir.",
          ),
          step(
            "visual",
            "Observer l’eau et les algues",
            "Noter clarté, coloration, dépôts, parois glissantes et zones peu brassées. Prendre une photo utile. Une eau claire ne suffit pas à conclure que le traitement est correct.",
          ),
        ],
      },
      {
        title: "2. Mesurer avant de traiter",
        steps: [
          step(
            "sample",
            "Prélever une eau représentative",
            "Prélever avant ajout de produit, loin d’un refoulement et selon la méthode du test. Noter si l’appoint a déjà démarré. Utiliser du matériel propre ; vérifier péremption, cuvettes et étalonnage des appareils concernés.",
          ),
          step(
            "analysis",
            "Mesurer et enregistrer les valeurs utiles",
            "Consigner pH, désinfectant adapté et température ; selon le bassin, contrôler aussi chlore total, TAC, stabilisant, sel ou dureté. Respecter les unités et temps de réaction du test. Comparer aux consignes applicables à ce bassin et à ses équipements, sans convertir un ORP en taux de chlore.",
          ),
          step(
            "plan",
            "Décider de l’action à partir des mesures",
            "Vérifier volume, traitement déjà présent et notice du produit. Planifier une correction compatible et fractionnée si nécessaire. Une valeur incohérente doit être remesurée avant tout dosage.",
          ),
        ],
      },
      {
        title: "3. Nettoyer le bassin",
        steps: [
          step(
            "surface",
            "Retirer les déchets en surface",
            "Passer l’épuisette dans l’eau pour récupérer feuilles et débris sans abîmer le revêtement. Vider régulièrement le filet.",
          ),
          step(
            "waterline",
            "Nettoyer la ligne d’eau",
            "Utiliser une éponge ou une brosse et, si nécessaire, un produit compatibles avec le revêtement. Ne pas utiliser d’abrasif inadapté ; suivre les conditions de rinçage du produit.",
          ),
          step(
            "brush",
            "Brosser les parois et les marches",
            "Insister sur angles, marches et zones mortes avec la brosse adaptée. Laisser les débris se déposer ou les diriger vers la reprise prévue, puis nettoyer le fond.",
          ),
          step(
            "floor",
            "Nettoyer le fond",
            "Utiliser robot ou aspiration selon le bassin. Pour une aspiration manuelle, amorcer le tuyau et identifier le circuit avant de modifier des vannes. Une aspiration vers l’égout consomme de l’eau : surveiller le niveau et les conditions de rejet.",
          ),
          step(
            "skimmers",
            "Nettoyer les paniers de skimmer",
            "Retirer les débris, rincer, vérifier l’état des paniers et le mouvement du volet. Manipuler selon les consignes du bassin ; ne jamais mettre la main dans un orifice d’aspiration en fonctionnement.",
          ),
        ],
      },
      {
        title: "4. Contrôler la filtration",
        steps: [
          step(
            "pressure",
            "Relever la pression et le débit apparent",
            "Comparer à la valeur filtre propre et à la notice. Rechercher une cause avant d’agir : panier encombré, filtre chargé, vanne mal positionnée, fuite ou prise d’air.",
          ),
          step(
            "prefilter",
            "Nettoyer le préfiltre de pompe s’il est présent",
            "Arrêter et empêcher tout redémarrage, isoler et dépressuriser selon le montage avant d’ouvrir. Nettoyer panier et portée du joint, remonter et réamorcer conformément au modèle. Voir la fiche « Préfiltre de pompe » pour la séquence complète.",
          ),
          ...backwash
            .slice(1)
            .map((s) => ({ ...s, id: "sand-" + s.id, variant: "sand" })),
          ...cardSteps
            .slice(1)
            .map((s) => ({
              ...s,
              id: "cartridge-" + s.id,
              variant: "cartridge",
            })),
          step(
            "other-filter",
            "Utiliser la procédure du filtre exact",
            "Identifier le modèle et consulter sa notice avant toute ouverture ou changement de cycle. Ne pas appliquer une séquence sable/verre à un autre type de filtre. Consigner le travail restant si le modèle ne peut pas être confirmé.",
            "other",
          ),
        ],
      },
      {
        title: "5. Vérifier les équipements et le traitement",
        steps: [
          step(
            "pump",
            "Contrôler pompe, circulation et étanchéité",
            "Après remise en service, vérifier amorçage, débit aux refoulements, bruit, vibration, fuites et bulles anormales. Ne pas faire fonctionner une pompe à sec ou contre un circuit fermé.",
          ),
          step(
            "electrolyser",
            "Contrôler l’électrolyseur s’il est présent",
            "Lire alarmes et consigne de production, vérifier le débit et la salinité par rapport au modèle. Observer l’état de la cellule sans l’ouvrir en service. Un démontage ou nettoyage suit exclusivement sa notice ; ne pas augmenter la production pour masquer un défaut de circulation.",
          ),
          step(
            "treatment",
            "Réaliser la correction validée et noter la dose",
            "Suivre la notice du produit exact et les conditions de circulation et de baignade. Ne jamais mélanger les produits ou les introduire au même point simultanément. Consigner produit, dose, heure et contrôle prévu après brassage.",
          ),
        ],
      },
      {
        title: "6. Terminer et partager",
        steps: [
          step(
            "restore",
            "Vérifier toutes les positions de service",
            "Comparer les vannes au repérage initial adapté au fonctionnement normal. Contrôler filtration, automatismes, absence de rejet à l’égout, pression et circulation. Ne pas partir en laissant une temporisation ou un mode manuel involontaire.",
          ),
          step(
            "topup-stop",
            "Arrêter l’appoint et contrôler le niveau final",
            "Fermer l’arrivée ajoutée pour l’intervention, ranger le tuyau et vérifier le niveau. Consigner tout appoint anormalement important ou suspicion de fuite.",
          ),
          step(
            "supplies",
            "Préparer le prochain passage",
            "Vérifier les stocks réellement présents et le matériel nécessaire. Créer un besoin « À acheter par le client » ou « À apporter par le pisciniste », avec quantité et échéance utiles.",
          ),
          step(
            "report",
            "Photographier et terminer le compte rendu",
            "Photographier le résultat et les anomalies utiles sans données privées superflues. Reporter mesures, opérations réellement réalisées, réserves et actions à suivre dans le passage, puis « Terminer et partager ». Cette checklist de travail ne publie pas automatiquement de compte rendu.",
          ),
          step(
            "leave",
            "Ranger et sécuriser avant de partir",
            "Ranger les produits selon leurs notices, retirer les déchets, fermer le local et rétablir la protection du bassin convenue avec le client. Vérifier une dernière fois que l’eau d’appoint est arrêtée.",
          ),
        ],
      },
    ],
    sources: [cleaning, water, sand, cartridge, salt],
  },
  {
    id: "filtre-sable",
    title: "Lavage et rinçage · filtre à sable ou à verre",
    category: "Filtration",
    summary:
      "Une séquence complète, avec un arrêt de pompe à chaque changement de position.",
    note: "Les durées et seuils de pression sont propres au modèle. Se fier à la notice et au repère filtre propre, pas à un temps unique pour tous les filtres.",
    sections: [
      { title: "Du contrôle au retour en filtration", steps: backwash },
    ],
    sources: [
      sand,
      {
        title: "Pentair — séquence de lavage assistée Maestro",
        url: "https://www.pentairpooleurope.com/sites/default/files/2023-07/im-maestro-full-fr.pdf",
      },
    ],
  },
  {
    id: "prefiltre",
    title: "Nettoyer le préfiltre de pompe",
    category: "Filtration",
    summary: "Panier, joint, amorçage et vérification des fuites.",
    note: "Repérer les vannes et la procédure d’amorçage du modèle avant de commencer. Si l’isolement ou la dépressurisation est incertain, ne pas ouvrir.",
    sections: [{ title: "Nettoyage et remise en service", steps: prefilter }],
    sources: [
      {
        title: "Pentair — notice Poseidon",
        url: "https://www.pentairpooleurope.com/sites/default/files/documents/manuals/1999__Poseidon_Manual_6_Lang_Rev._06.2017.pdf",
      },
      sand,
    ],
  },
  {
    id: "filtre-cartouche",
    title: "Nettoyer un filtre à cartouche",
    category: "Filtration",
    summary: "Dépressurisation, nettoyage doux et remontage conforme.",
    note: "La pression emprisonnée peut projeter une fermeture. La notice exacte du modèle prime pour la purge, le collier et la remise en service.",
    sections: [
      { title: "Séquence pour un filtre compatible", steps: cardSteps },
    ],
    sources: [cartridge, filtration],
  },
  {
    id: "vannes",
    title: "Repérer les vannes avant une intervention",
    category: "Équipements",
    summary: "Construire un repérage fiable de l’installation réelle.",
    note: "Il n’existe pas une position universelle « toutes ouvertes » ou « toutes fermées ». Ne jamais improviser un chemin hydraulique.",
    sections: [
      {
        title: "Préparer et vérifier le circuit",
        steps: [
          step(
            "map",
            "Identifier chaque conduite",
            "Repérer skimmers, bonde de fond, prise balai, aspiration, refoulements, égout, éventuel by-pass et équipements. Si une conduite reste inconnue, suspendre la manœuvre concernée.",
          ),
          step(
            "record",
            "Photographier la position de service",
            "Photographier et étiqueter selon l’autorisation du client. Noter le mode de pompe et les automatismes. Conserver le schéma dans le dossier du bassin.",
          ),
          step(
            "flow",
            "Définir le chemin de l’eau",
            "Pour l’opération prévue, vérifier aspiration, passage dans le filtre ou by-pass et sortie. Éviter toute mise en route sans arrivée d’eau ou sans sortie disponible.",
          ),
          step(
            "stop",
            "Arrêter avant de changer la vanne multivoies",
            "Attendre l’arrêt de la circulation et empêcher un redémarrage automatique. Suivre la notice pour chaque sélection ; ne pas utiliser la position fermée avec la pompe en marche.",
          ),
          step(
            "restore",
            "Revenir au fonctionnement prévu",
            "Rétablir les positions relevées qui correspondent au fonctionnement normal, remettre les automatismes, puis vérifier débit, pression, absence de fuite et de rejet inattendu.",
          ),
        ],
      },
    ],
    sources: [valves, sand],
  },
  {
    id: "analyses",
    title: "Réaliser et consigner une analyse fiable",
    category: "Analyse & routine",
    summary: "Prélèvement, méthode, unités et traçabilité des mesures.",
    note: "Une valeur précise affichée n’est fiable que si la méthode, les réactifs et le prélèvement le sont. Les exigences des bassins collectifs doivent être traitées selon leur cadre propre.",
    sections: [
      {
        title: "De la mesure au carnet",
        steps: [
          step(
            "prepare",
            "Préparer le matériel",
            "Identifier les paramètres à mesurer et les plages du test. Vérifier réactifs non périmés, cuvettes propres, appareils entretenus et étalonnage requis.",
          ),
          step(
            "sample",
            "Prélever avant un ajout de produit",
            "Choisir un point représentatif selon la notice, éloigné des refoulements et produits en cours d’ajout. Noter heure, température et contexte d’appoint.",
          ),
          step(
            "test",
            "Respecter la méthode du test",
            "Respecter volume d’échantillon, réactifs, ordre et temps de réaction. Pour un photomètre, réaliser le zéro et essuyer la cuvette comme prévu. Ne pas lire une couleur hors de sa plage.",
          ),
          step(
            "validate",
            "Vérifier les incohérences",
            "Répéter une valeur inattendue et vérifier unités ou interférences indiquées par la notice. Le chlore total doit être cohérent avec le libre ; un ORP ne donne pas directement un taux de chlore.",
          ),
          step(
            "record",
            "Enregistrer avant correction",
            "Saisir les valeurs mesurées, la méthode dans les observations et toute limite de mesure. Après traitement et brassage prévus par la notice, refaire un contrôle distinct au lieu d’écraser la mesure initiale.",
          ),
        ],
      },
    ],
    sources: [water],
  },
  {
    id: "nettoyage",
    title: "Nettoyer surface, parois, marches et fond",
    category: "Nettoyage",
    summary: "Les gestes utiles avec un matériel adapté au revêtement.",
    note: "Identifier liner, membrane, coque, carrelage ou autre revêtement avant de choisir brosse et produit.",
    sections: [
      {
        title: "Ordre de travail",
        steps: [
          step(
            "surface",
            "Épuiser les débris flottants",
            "Passer le filet dans l’eau et vider les feuilles hors du bassin.",
          ),
          step(
            "line",
            "Nettoyer la ligne d’eau",
            "Décoller les dépôts avec un outil compatible, sans abrasif agressif ni produit non prévu pour ce revêtement.",
          ),
          step(
            "walls",
            "Brosser parois, marches et angles",
            "Traiter les zones peu brassées. Noter tout dépôt qui revient ou revêtement endommagé.",
          ),
          step(
            "bottom",
            "Retirer les débris du fond",
            "Employer le robot ou l’aspiration adaptée. Nettoyer le panier ou le sac du robot selon sa notice et contrôler son câble avant rangement.",
          ),
          step(
            "baskets",
            "Finir par les paniers et le contrôle visuel",
            "Nettoyer les paniers de skimmer, vérifier leur état et le niveau d’eau. Contrôler le résultat sans déduire la qualité chimique de la seule transparence.",
          ),
        ],
      },
    ],
    sources: [cleaning],
  },
  {
    id: "electrolyseur",
    title: "Contrôler l’électrolyseur sans masquer une panne",
    category: "Équipements",
    summary: "Débit, salinité, alarmes, cellule et production.",
    note: "Les consignes de sel, de température et de nettoyage varient selon le fabricant. Aucune dose d’acide ni consigne de production universelle.",
    sections: [
      {
        title: "Contrôles au passage",
        steps: [
          step(
            "model",
            "Identifier le modèle et sa consigne",
            "Lire la notice du modèle, le mode de fonctionnement et les alarmes en cours. Consigner l’état avant modification.",
          ),
          step(
            "flow",
            "Confirmer la circulation",
            "Vérifier pompe, filtre et débit requis. Ne jamais contourner un détecteur de débit ni une sécurité.",
          ),
          step(
            "measure",
            "Mesurer chlore et sel",
            "Comparer l’analyse de l’eau à la consigne adaptée au bassin et la salinité à celle du modèle. Vérifier les unités g/L ou ppm. Un taux de sel correct ne garantit pas un chlore correct.",
          ),
          step(
            "cell",
            "Observer la cellule",
            "Rechercher dépôts visibles ou défaut signalé. Si démontage requis, arrêter électrolyseur et circulation, isoler et dépressuriser suivant la notice. Nettoyer uniquement selon ses instructions, sans gratter les plaques ni improviser une dilution.",
          ),
          step(
            "restore",
            "Remettre en service et contrôler",
            "Rétablir le circuit et les réglages adaptés, contrôler l’absence de fuite et d’alarme. Noter les valeurs et prévoir une nouvelle mesure après le délai de brassage nécessaire.",
          ),
        ],
      },
    ],
    sources: [salt],
  },
];
export const REFERENCE_GUIDES: Record<number, string> = {
  5: "prefiltre",
  11: "entretien",
  13: "filtre-sable",
  17: "vannes",
  21: "nettoyage",
  22: "nettoyage",
  33: "analyses",
  45: "electrolyseur",
  66: "filtre-cartouche",
  92: "analyses",
};
