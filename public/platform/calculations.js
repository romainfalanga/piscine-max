// Unit-explicit calculations. No default chemical target or product strength.
const n = (v, label, min = 0, max = 1e9) => {
  if (
    v === "" ||
    v == null ||
    !Number.isFinite(Number(v)) ||
    Number(v) < min ||
    Number(v) > max
  )
    throw new Error(`${label} : renseignez une valeur entre ${min} et ${max}.`);
  return Number(v);
};
const pos = (v, label) => n(v, label, 0.000001);
const f = (key, label, min = 0, max = 1000000, value = "") => ({
  key,
  label,
  min,
  max,
  value,
});
const s = (key, label, options, value) => ({ key, label, options, value });
const vol = f("volume", "Volume du bassin (m³)", 0.1, 100000);
const out = (value, unit, explanation, extra = []) => ({
  value,
  unit,
  explanation,
  extra,
});
export const CALCULATORS = [
  {
    id: "volume",
    category: "Bassin & eau",
    title: "Volume du bassin",
    description: "Rectangle, rond, ovale ou surface déjà mesurée.",
    fields: [
      s(
        "shape",
        "Forme",
        {
          rect: "Rectangulaire",
          round: "Ronde",
          oval: "Ovale",
          area: "Surface connue / forme libre",
        },
        "rect",
      ),
      f("length", "Longueur ou diamètre (m)", 0.1, 500),
      f("width", "Largeur (m)", 0.1, 500),
      f("area", "Surface mesurée (m²)", 0.01, 100000),
      f("depth", "Profondeur moyenne réelle (m)", 0.1, 50),
    ],
    note: "Profondeur d’eau, pas hauteur de paroi. Pour un fond complexe, additionnez les volumes des zones ; la moyenne de deux profondeurs ne convient qu’à une pente régulière.",
    formula: "Surface × profondeur moyenne",
    run(b) {
      const d = pos(b.depth, "Profondeur");
      let a;
      if (b.shape === "area") a = pos(b.area, "Surface");
      else {
        const l = pos(b.length, "Longueur");
        if (b.shape === "round") a = (Math.PI * l * l) / 4;
        else {
          const w = pos(b.width, "Largeur");
          a = l * w * (b.shape === "oval" ? Math.PI / 4 : 1);
        }
      }
      return out(a * d, "m³", "Volume géométrique estimé.", [
        { label: "Litres", value: a * d * 1000, unit: "L" },
        { label: "Surface", value: a, unit: "m²" },
      ]);
    },
  },
  {
    id: "dose",
    category: "Traitement",
    title: "Dose selon l’étiquette",
    description:
      "Chlore, anti-algues ou autre produit : adapter la dose fabricant au volume.",
    fields: [
      vol,
      f("dose", "Quantité indiquée sur la notice", 0.001),
      s("unit", "Unité du produit", { g: "g", ml: "mL" }, "g"),
      f("reference", "Pour quel volume d’eau ? (m³)", 0.001),
    ],
    note: "Recopiez la dose et les conditions de votre produit exact. Ce calcul ne choisit pas un traitement, ne valide pas la compatibilité et ne remplace pas les consignes d’ajout ou de baignade de la notice.",
    formula: "Dose notice × volume bassin ÷ volume de référence",
    run(b) {
      return out(
        (pos(b.dose, "Dose") * pos(b.volume, "Volume")) /
          pos(b.reference, "Volume de référence"),
        b.unit === "ml" ? "mL" : "g",
        "Quantité proportionnelle à la notice saisie.",
      );
    },
  },
  {
    id: "adjustment",
    category: "Traitement",
    title: "Correction pH ou TAC",
    description: "Calcul par palier à partir de la notice du correcteur.",
    fields: [
      s(
        "parameter",
        "Paramètre",
        { ph: "pH", tac: "TAC (mg/L en CaCO₃)" },
        "ph",
      ),
      s(
        "direction",
        "Sens de la correction",
        { up: "Augmenter", down: "Diminuer" },
        "down",
      ),
      vol,
      f("current", "Valeur mesurée", 0, 1000),
      f("target", "Valeur visée", 0, 1000),
      f("dose", "Dose fabricant par palier", 0.001),
      s("unit", "Unité du produit", { g: "g", ml: "mL" }, "g"),
      f("reference", "Volume de référence de la notice (m³)", 0.001),
      f("step", "Variation annoncée par cette dose", 0.001),
    ],
    note: "Le pH ne varie pas linéairement dans toutes les eaux : le TAC intervient. Résultat théorique à fractionner selon la notice, avec brassage puis nouveau contrôle. Ne mélangez jamais les produits.",
    formula: "Dose notice × V / Vréf × variation souhaitée / palier notice",
    run(b) {
      const max = b.parameter === "ph" ? 14 : 1000;
      const c = n(b.current, "Mesure", 0, max),
        t = n(b.target, "Cible", 0, max);
      if ((b.direction === "down" && t > c) || (b.direction === "up" && t < c))
        throw new Error(
          "Le sens du correcteur ne correspond pas à la variation demandée.",
        );
      return out(
        (Math.abs(t - c) * pos(b.dose, "Dose") * pos(b.volume, "Volume")) /
          pos(b.reference, "Volume de référence") /
          pos(b.step, "Palier"),
        b.unit === "ml" ? "mL" : "g",
        "Estimation à partir de la notice, à vérifier par une nouvelle mesure.",
      );
    },
  },
  {
    id: "salt",
    category: "Traitement",
    title: "Ajout de sel",
    description:
      "Calculer l’écart entre le sel mesuré et la consigne de l’électrolyseur.",
    fields: [
      vol,
      f("current", "Salinité mesurée (g/L)", 0, 100),
      f("target", "Consigne fabricant (g/L)", 0, 100),
      f("purity", "Pureté du sel (%)", 0.1, 100, 100),
    ],
    note: "Vérifiez les unités du testeur et la consigne du modèle. Pas de consigne générique. Respectez l’arrêt de la production et le temps de dissolution prévus par la notice.",
    formula: "V (m³) × écart (g/L) ÷ pureté",
    run(b) {
      const delta =
        n(b.target, "Consigne", 0, 100) - n(b.current, "Salinité", 0, 100);
      if (delta < 0)
        throw new Error(
          "La salinité dépasse la consigne : aucun ajout de sel. Vérifiez la mesure et la notice.",
        );
      return out(
        (pos(b.volume, "Volume") * delta) /
          (n(b.purity, "Pureté", 0.1, 100) / 100),
        "kg",
        "Masse théorique de sel à apporter pour l’écart saisi.",
      );
    },
  },
  {
    id: "chlorine",
    category: "Traitement",
    title: "Apport théorique de chlore",
    description:
      "Relier un écart en mg/L à la teneur réelle en chlore disponible.",
    fields: [
      vol,
      f("current", "Chlore libre mesuré (mg/L)", 0, 100),
      f("target", "Chlore libre visé (mg/L)", 0, 100),
      s(
        "form",
        "Teneur indiquée sur le produit",
        {
          liquid: "Liquide : chlore disponible en g/L",
          solid: "Solide : chlore disponible en % massique",
        },
        "liquid",
      ),
      f("strength", "Teneur en chlore disponible", 0.001, 1000),
    ],
    note: "Calcul de masse, pas une prescription de traitement choc. Il n’intègre ni la demande en chlore ni le stabilisant. Choisissez la cible et le produit selon les analyses et la notice. Un pourcentage commercial n’est pas forcément une teneur en chlore disponible.",
    formula: "Chlore disponible (g) = V (m³) × écart (mg/L)",
    run(b) {
      const delta = n(b.target, "Cible") - n(b.current, "Mesure");
      if (delta < 0)
        throw new Error(
          "La mesure est supérieure à la cible : aucun ajout calculé.",
        );
      const g = pos(b.volume, "Volume") * delta,
        strength = n(
          b.strength,
          "Teneur",
          0.001,
          b.form === "solid" ? 100 : 1000,
        );
      return out(
        b.form === "solid" ? (g * 100) / strength : (g * 1000) / strength,
        b.form === "solid" ? "g" : "mL",
        "Quantité théorique avant consommation du chlore par l’eau.",
        [{ label: "Chlore disponible correspondant", value: g, unit: "g" }],
      );
    },
  },
  {
    id: "combined",
    category: "Traitement",
    title: "Chlore combiné",
    description: "Faire la différence entre chlore total et chlore libre.",
    fields: [
      f("free", "Chlore libre (mg/L)", 0, 100),
      f("total", "Chlore total (mg/L)", 0, 100),
    ],
    note: "Mesurez avec des méthodes compatibles, sur un même prélèvement. Ce résultat seul ne certifie pas la qualité de baignade.",
    formula: "Chlore total − chlore libre",
    run(b) {
      const d = n(b.total, "Chlore total") - n(b.free, "Chlore libre");
      if (d < 0)
        throw new Error(
          "Le total est inférieur au libre : vérifiez les mesures et leur incertitude avant de conclure.",
        );
      return out(d, "mg/L", "Différence entre les deux analyses.");
    },
  },
  {
    id: "renewal",
    category: "Bassin & eau",
    title: "Renouvellement théorique d’eau",
    description: "Estimer une dilution du stabilisant ou de la salinité.",
    fields: [
      vol,
      f("current", "Concentration initiale", 0),
      f("target", "Concentration visée", 0),
      f("fill", "Concentration de l’eau d’appoint", 0),
    ],
    note: "Saisissez les trois concentrations dans la même unité. Modèle d’un retrait suivi d’un remplissage, sans autre apport. Ce n’est pas une consigne de vidange : un abaissement peut endommager le bassin selon sa structure, son revêtement ou la nappe. Vérifiez les contraintes et règles de rejet avant toute opération.",
    formula: "Fraction = (Cinitiale − Ccible) ÷ (Cinitiale − Cappoint)",
    run(b) {
      const c = n(b.current, "Initiale"),
        t = n(b.target, "Cible"),
        f = n(b.fill, "Appoint");
      if (t > c || f >= c || t < f)
        throw new Error(
          "Dilution impossible avec ces valeurs : la cible doit être comprise entre l’eau d’appoint et l’eau actuelle, et l’appoint doit être moins concentré.",
        );
      const ratio = (c - t) / (c - f);
      return out(
        ratio * 100,
        "%",
        "Fraction théorique à renouveler en une opération.",
        [
          {
            label: "Volume correspondant",
            value: pos(b.volume, "Volume") * ratio,
            unit: "m³",
          },
        ],
      );
    },
  },
  {
    id: "topup",
    category: "Bassin & eau",
    title: "Appoint et baisse de niveau",
    description: "Convertir une variation du niveau d’eau en litres.",
    fields: [
      f("area", "Surface à ce niveau (m²)", 0.01),
      f("height", "Variation du niveau (cm)", 0),
    ],
    note: "Hypothèse de parois verticales sur la hauteur considérée. Un appoint doit rester surveillé et être arrêté avant de quitter le site.",
    formula: "Surface × hauteur / 100",
    run(b) {
      const v = (pos(b.area, "Surface") * n(b.height, "Variation")) / 100;
      return out(
        v * 1000,
        "L",
        "Volume d’eau correspondant à la variation de niveau.",
        [{ label: "Volume", value: v, unit: "m³" }],
      );
    },
  },
  {
    id: "fill",
    category: "Bassin & eau",
    title: "Durée de remplissage",
    description: "Utiliser un débit mesuré au seau ou au compteur.",
    fields: [
      f("volume", "Volume à apporter (m³)", 0.001),
      f("flow", "Débit d’appoint mesuré (L/min)", 0.001),
    ],
    note: "Durée indicative si le débit reste constant. Elle ne remplace pas la surveillance du remplissage.",
    formula: "Volume × 1 000 ÷ débit",
    run(b) {
      const m = (pos(b.volume, "Volume") * 1000) / pos(b.flow, "Débit");
      return out(m / 60, "h", "Durée à débit constant.", [
        { label: "Minutes", value: m, unit: "min" },
      ]);
    },
  },
  {
    id: "turnover",
    category: "Filtration & équipements",
    title: "Temps de circulation",
    description:
      "Relier volume, débit réel et nombre de renouvellements hydrauliques.",
    fields: [
      vol,
      f("flow", "Débit réel de filtration (m³/h)", 0.01),
      f("cycles", "Nombre de renouvellements retenu", 0.1, 100, 1),
    ],
    note: "Temps hydraulique, pas garantie de désinfection. Le planning quotidien dépend aussi du traitement, de la fréquentation, de la température, des équipements et des règles du bassin. Utilisez le débit réel, pas le débit maximal publicitaire de la pompe.",
    formula: "Volume × nombre de renouvellements ÷ débit",
    run(b) {
      const h =
        (pos(b.volume, "Volume") * pos(b.cycles, "Renouvellements")) /
        pos(b.flow, "Débit");
      return out(
        h,
        "h",
        "Durée hydraulique correspondant aux hypothèses saisies.",
        h > 24
          ? [
              {
                label: "Attention",
                text: "Plus de 24 h : revoir les hypothèses et le dimensionnement.",
              },
            ]
          : [],
      );
    },
  },
  {
    id: "flow",
    category: "Filtration & équipements",
    title: "Débit nécessaire",
    description:
      "Calculer le débit pour faire circuler un volume en un temps donné.",
    fields: [
      vol,
      f("hours", "Temps disponible (h)", 0.01, 24),
      f("cycles", "Nombre de renouvellements retenu", 0.1, 100, 1),
    ],
    note: "Le choix d’une pompe exige aussi la HMT, les pertes de charge et la compatibilité du filtre. Ce résultat n’est pas un dimensionnement complet.",
    formula: "Volume × renouvellements ÷ durée",
    run(b) {
      return out(
        (pos(b.volume, "Volume") * pos(b.cycles, "Renouvellements")) /
          pos(b.hours, "Durée"),
        "m³/h",
        "Débit hydraulique nécessaire pour votre objectif.",
      );
    },
  },
  {
    id: "filter",
    category: "Filtration & équipements",
    title: "Vitesse dans un filtre à sable",
    description: "Calculer la charge hydraulique d’une cuve circulaire.",
    fields: [
      f("diameter", "Diamètre intérieur du filtre (cm)", 1, 1000),
      f("flow", "Débit traversant le filtre (m³/h)", 0.01),
    ],
    note: "Réservé aux filtres à lit granulaire (sable/verre). Comparez avec la plage constructeur du média et de la cuve. Ne pas appliquer à la surface dépliée d’une cartouche.",
    formula: "Débit ÷ [π × (diamètre / 2)²]",
    run(b) {
      const a = Math.PI * (pos(b.diameter, "Diamètre") / 200) ** 2;
      return out(
        pos(b.flow, "Débit") / a,
        "m/h",
        "Vitesse superficielle dans le lit filtrant.",
        [{ label: "Section du filtre", value: a, unit: "m²" }],
      );
    },
  },
  {
    id: "pressure",
    category: "Filtration & équipements",
    title: "Écart de pression du filtre",
    description: "Comparer la pression à celle du filtre propre.",
    fields: [
      f("clean", "Pression de référence, filtre propre (bar)", 0, 10),
      f("current", "Pression actuelle (bar)", 0, 10),
    ],
    note: "Comparez à même vitesse de pompe et même configuration des vannes. Le seuil de lavage dépend du modèle. Un débit faible ou une pression anormale demande une recherche de cause.",
    formula: "Pression actuelle − pression de référence",
    run(b) {
      const clean = n(b.clean, "Référence", 0, 10),
        now = n(b.current, "Pression", 0, 10);
      return out(
        now - clean,
        "bar",
        "Écart à comparer au seuil de la notice du filtre.",
        clean
          ? [
              {
                label: "Évolution",
                value: ((now - clean) / clean) * 100,
                unit: "%",
              },
            ]
          : [],
      );
    },
  },
  {
    id: "energy",
    category: "Organisation & coûts",
    title: "Consommation électrique",
    description: "Estimer le coût d’une pompe sur la période choisie.",
    fields: [
      f("power", "Puissance électrique absorbée (W)", 0, 100000),
      f("hours", "Fonctionnement quotidien (h)", 0, 24),
      f("days", "Nombre de jours", 1, 366),
      f("price", "Prix de l’électricité (€/kWh)", 0, 10),
    ],
    note: "Utilisez la puissance absorbée mesurée ou documentée au régime choisi. Pour une pompe variable, additionnez les périodes à chaque régime. Hors abonnement et autres équipements.",
    formula: "W ÷ 1 000 × heures × jours × prix du kWh",
    run(b) {
      const k =
        (n(b.power, "Puissance") / 1000) *
        n(b.hours, "Heures", 0, 24) *
        n(b.days, "Jours", 1, 366);
      return out(
        k * n(b.price, "Tarif", 0, 10),
        "€",
        "Estimation de la consommation au régime saisi.",
        [{ label: "Énergie", value: k, unit: "kWh" }],
      );
    },
  },
  {
    id: "heating",
    category: "Filtration & équipements",
    title: "Énergie de chauffage",
    description:
      "Estimer l’énergie thermique pour augmenter la température de l’eau.",
    fields: [
      vol,
      f("current", "Température initiale (°C)", 0, 60),
      f("target", "Température visée (°C)", 0, 60),
      f("power", "Puissance thermique utile (kW)", 0.01, 10000),
    ],
    note: "Estimation sans pertes par évaporation, vent ou parois. La puissance thermique d’une PAC varie avec l’air et l’eau ; ce n’est pas sa puissance électrique absorbée. La durée réelle sera généralement plus longue.",
    formula: "Énergie ≈ 1,163 × volume × hausse de température",
    run(b) {
      const d =
        n(b.target, "Cible", 0, 60) - n(b.current, "Température", 0, 60);
      if (d < 0)
        throw new Error(
          "La cible est inférieure à la température actuelle : aucun chauffage à calculer.",
        );
      const k = 1.163 * pos(b.volume, "Volume") * d;
      return out(k, "kWh thermiques", "Énergie théorique à fournir à l’eau.", [
        {
          label: "Durée sans pertes",
          value: k / pos(b.power, "Puissance"),
          unit: "h",
        },
      ]);
    },
  },
  {
    id: "tour",
    category: "Organisation & coûts",
    title: "Charge d’une tournée",
    description:
      "Additionner entretien, trajets et marge pour préparer une journée.",
    fields: [
      f("visits", "Nombre de passages", 1, 100),
      f("minutes", "Temps moyen par passage (min)", 1, 1440),
      f("travel", "Total des trajets de la journée (min)", 0, 1440),
      f("margin", "Pause et marge totale (min)", 0, 1440),
    ],
    note: "Estimation de charge, sans optimisation d’itinéraire. Ajustez les durées aux bassins et aux opérations prévues.",
    formula: "Passages × durée moyenne + trajets + marge",
    run(b) {
      const count = n(b.visits, "Passages", 1, 100);
      if (!Number.isInteger(count))
        throw new Error("Le nombre de passages doit être entier.");
      const minutes =
        count * pos(b.minutes, "Durée") +
        n(b.travel, "Trajets") +
        n(b.margin, "Marge");
      return out(minutes / 60, "h", "Temps total à réserver.", [
        { label: "Minutes", value: minutes, unit: "min" },
      ]);
    },
  },
];
export function calculate(id, values) {
  const calc = CALCULATORS.find((c) => c.id === id);
  if (!calc) throw new Error("Calculateur introuvable.");
  // Enforce advertised limits and choices independently of HTML validation.
  for (const field of calc.fields) {
    if (
      id === "volume" &&
      ((field.key === "area" && values.shape !== "area") ||
        (field.key === "length" && values.shape === "area") ||
        (field.key === "width" && ["round", "area"].includes(values.shape)))
    )
      continue;
    if (field.options) {
      if (!Object.hasOwn(field.options, values[field.key]))
        throw new Error(`${field.label} : choix invalide.`);
    } else n(values[field.key], field.label, field.min, field.max);
  }
  return calc.run(values);
}
