import { fail, str } from "./core";
export type Task = {
  id: string;
  group: string;
  label: string;
  done: boolean;
  skipped: boolean;
  reason: string;
};
export function maintenanceTasks(p: any): Task[] {
  const tasks: Task[] = [];
  const add = (id: string, group: string, label: string) =>
    tasks.push({ id, group, label, done: false, skipped: false, reason: "" });
  add(
    "level",
    "À l’arrivée",
    "Vérifier le niveau d’eau et faire l’appoint si nécessaire",
  );
  add(
    "algae",
    "À l’arrivée",
    "Rechercher un début d’algues et contrôler l’aspect de l’eau",
  );
  add(
    "analysis",
    "Analyse de l’eau",
    "Mesurer et renseigner le pH et le chlore",
  );
  add("waterline", "Nettoyage du bassin", "Nettoyer la ligne d’eau");
  add(
    "surface",
    "Nettoyage du bassin",
    "Retirer les feuilles et débris en surface",
  );
  add("floor", "Nettoyage du bassin", "Nettoyer le fond");
  add("walls", "Nettoyage du bassin", "Brosser les parois");
  if (p.has_steps) add("steps", "Nettoyage du bassin", "Brosser les marches");
  if (p.has_skimmers)
    add("skimmers", "Nettoyage du bassin", "Nettoyer les paniers de skimmer");
  if (p.has_prefilter)
    add(
      "prefilter",
      "Filtration et équipements",
      "Nettoyer le préfiltre de pompe",
    );
  add(
    "filter_check",
    "Filtration et équipements",
    "Contrôler la pression et l’état du filtre",
  );
  if (["sand", "glass"].includes(p.filter_type)) {
    add(
      "backwash",
      "Filtration et équipements",
      "Effectuer le lavage du filtre",
    );
    add(
      "rinse",
      "Filtration et équipements",
      "Effectuer le rinçage après le lavage",
    );
  } else if (p.filter_type === "cartridge")
    add(
      "cartridge",
      "Filtration et équipements",
      "Nettoyer et rincer la cartouche si nécessaire",
    );
  else
    add(
      "filter_service",
      "Filtration et équipements",
      "Entretenir le filtre selon son type et sa notice",
    );
  add(
    "pump",
    "Filtration et équipements",
    "Contrôler la pompe et l’absence de fuite visible",
  );
  if (p.treatment === "salt")
    add(
      "electrolyser",
      "Traitement",
      "Contrôler l’électrolyseur et sa cellule",
    );
  if (p.treatment === "chlorine")
    add(
      "tablets",
      "Traitement",
      "Contrôler les galets de chlore et compléter si nécessaire",
    );
  add(
    "treatment",
    "Traitement",
    "Ajuster le traitement si nécessaire selon les mesures et la notice",
  );
  add(
    "restore",
    "Avant de partir",
    "Rétablir les vannes, la filtration et les automatismes",
  );
  add(
    "water_stop",
    "Avant de partir",
    "Contrôler le niveau final et arrêter l’appoint d’eau",
  );
  add(
    "supplies",
    "Avant de partir",
    "Vérifier les produits et le matériel pour le prochain passage",
  );
  String(p.routine || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10)
    .forEach((label, i) =>
      add("custom_" + i, "Consignes de cette piscine", label.slice(0, 150)),
    );
  return tasks;
}
export function taskStates(template: Task[], input: any): Task[] {
  if (input != null && !Array.isArray(input)) fail("Liste de tâches invalide.");
  const items = input || [];
  if (items.length > 40) fail("Trop de tâches.");
  const ids = new Set(template.map((t) => t.id));
  if (
    items.some((i: any) => !i || !ids.has(i.id)) ||
    new Set(items.map((i: any) => i.id)).size !== items.length
  )
    fail("La liste des tâches a changé. Rouvrez le passage.");
  return template.map((t) => {
    const v = items.find((i: any) => i.id === t.id);
    const done = v?.done === true,
      skipped = v?.skipped === true;
    if (done && skipped)
      fail("Une tâche ne peut pas être réalisée et non réalisée.");
    return {
      ...t,
      label: t.id === "backwash" ? "Effectuer le lavage du filtre" : t.label,
      done,
      skipped,
      reason: skipped ? str(v?.reason, 250) : "",
    };
  });
}
export function validateCompletion(
  tasks: Task[],
  readings: any,
  assessments: Record<string, string> = {},
) {
  if (!tasks.length || tasks.some((t) => !t.done && !t.skipped))
    fail(
      "Vérifiez chaque tâche avant de partager : cochez-la ou indiquez pourquoi elle n’a pas été réalisée.",
    );
  if (tasks.some((t) => t.skipped && !t.reason.trim()))
    fail("Précisez le motif de chaque tâche non réalisée.");
  if (
    tasks.some((t) => t.id === "analysis" && t.done) &&
    ((readings.ph == null && !assessments.ph) ||
      (readings.chlorine == null && !assessments.chlorine))
  )
    fail("Renseignez le pH et le chlore pour valider l’analyse.");
  if (
    tasks.some((t) => t.id === "backwash" && t.done) &&
    !tasks.some((t) => t.id === "rinse" && t.done)
  )
    fail("Le rinçage doit être effectué après le lavage du filtre.");
}
