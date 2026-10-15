import {
  $,
  esc,
  state,
  on,
  api,
  go,
  toast,
  icon,
  field,
  area,
  select,
  modal,
  closeModal,
  button,
  badge,
  empty,
  fmt,
  refresh,
} from "./ui.js";
export const toolPages = { tools };
let quiz = null;
async function tools(main) {
  const [p, config, reference] = await Promise.all([
    api("/procedures"),
    api("/tools/config"),
    api("/procedures/reference"),
  ]);
  state.procedures = [...p.items, ...reference.items];
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">VOS RESSOURCES MÉTIER</div><h1>Pisciniste</h1><p>Procédures, outils et entraînement métier.</p></div>${button("Créer une fiche", "new-procedure")}</div><div class="grid three"><section class="card"><div class="pool-symbol">${icon("settings", 26)}</div><h3 style="margin-top:20px">Estimer un volume</h3><p class="small-note">Dimensions et profondeur moyenne, pour mieux connaître le bassin.</p>${button("Ouvrir le calculateur", "calculator", "", "secondary")}</section><section class="card"><div class="pool-symbol">${icon("book", 26)}</div><h3 style="margin-top:20px">Réviser le métier</h3><p class="small-note">40 questions issues de votre banque existante. Un entraînement, sans badge de qualification.</p>${button("Commencer une session", "quiz", "", "secondary")}</section><section class="card"><div class="pool-symbol">${icon("help", 26)}</div><h3 style="margin-top:20px">Assistant documentaire</h3><p class="small-note">Une piste de réflexion pour une question métier. ${config.assistant_available ? "10 demandes maximum par jour." : "Le service sera accessible lorsqu’il sera configuré."}</p>${button("Poser une question", "assistant", "", "secondary")}</section></div><div class="section-heading"><h2>Votre bibliothèque personnelle</h2><span>${p.items.length} fiche${p.items.length > 1 ? "s" : ""}</span></div><div class="grid two">${p.items.map((p) => `<article class="card"><div class="inline between"><h3>${esc(p.title)}</h3>${p.important ? badge("À garder sous la main", "teal") : ""}</div><p class="small-note">${esc(p.body.slice(0, 160))}${p.body.length > 160 ? "…" : ""}</p>${button("Lire la fiche", "procedure", `data-id="${p.id}"`, "secondary small")}</article>`).join("")}</div><div class="section-heading"><h2>Les fiches métier de Piscine Max</h2></div><p class="small-note">Votre bibliothèque existante est conservée. Vérifiez les notices fabricant et les références réglementaires selon le bassin concerné.</p><input id="reference-search" class="search-input" aria-label="Rechercher une fiche métier" placeholder="Filtration, pompe, vanne…"><select id="reference-category" class="search-input" aria-label="Catégorie de fiche"><option value="">Toutes les catégories</option>${[...new Set(reference.items.map((p) => p.category || p.type))].map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select><div id="reference-list" class="grid two" style="margin-top:18px"></div>${p.items.length ? "" : empty("Vos méthodes, à votre façon", "Conservez vos checklists et vos notes de référence dans cet espace.", button("Créer ma première fiche", "new-procedure", "", "secondary"))}`;
  function showReferences() {
    const q = $("#reference-search").value.toLocaleLowerCase("fr");
    const items = reference.items.filter(
      (p) =>
        (!$("#reference-category").value ||
          (p.category || p.type) === $("#reference-category").value) &&
        (p.title + " " + p.category + " " + p.summary)
          .toLocaleLowerCase("fr")
          .includes(q),
    );
    $("#reference-list").innerHTML = items
      .map(
        (p) =>
          `<article class="card"><div class="eyebrow">${esc(p.category || p.type)}</div><h3>${esc(p.title)}</h3><p class="small-note">${esc(p.summary || "")}</p>${button("Lire la fiche", "procedure", `data-id="${p.id}"`, "secondary small")}</article>`,
      )
      .join("");
  }
  $("#reference-search").addEventListener("input", showReferences);
  $("#reference-category").addEventListener("change", showReferences);
  showReferences();
}
function procedureForm(p = {}) {
  modal(
    p.id ? "Modifier une fiche" : "Votre nouvelle fiche",
    `${field("Titre", "title", p.title || "", "text", 'required maxlength="160"')}${area("Contenu — une étape par ligne pour une checklist", "body", p.body || "", 'required maxlength="12000" rows="10"')}<label class="check"><input type="checkbox" name="important" ${p.important ? "checked" : ""}> Garder cette fiche en tête de liste</label>`,
    async (b) => {
      await api(
        "/procedures" + (p.id ? "/" + p.id : ""),
        p.id ? "PUT" : "POST",
        { ...b, important: b.important === "on" },
      );
      closeModal();
      refresh();
      toast("Fiche enregistrée.");
    },
  );
}
on("new-procedure", () => procedureForm());
on("procedure", (d) => {
  const p = state.procedures.find((p) => p.id === d.id);
  if (!p) return;
  modal(
    p.title,
    `${p.body
      .split("\n")
      .map((line) =>
        line.trim()
          ? `<label class="check"><input type="checkbox">${esc(line)}</label>`
          : "<br>",
      )
      .join(
        "",
      )}<p class="small-note">Cette checklist accompagne votre lecture. Les gestes du passage sont enregistrés dans son compte rendu.</p>${!p.id.startsWith("reference-") ? button("Modifier", "edit-procedure", `data-id="${p.id}"`, "secondary") : ""}`,
    null,
  );
});
on("edit-procedure", (d) =>
  procedureForm(state.procedures.find((p) => p.id === d.id)),
);
on("calculator", () => {
  modal(
    "Estimer le volume du bassin",
    `${select("Forme", "shape", { rect: "Rectangulaire", round: "Ronde", oval: "Ovale" }, "rect")}<div class="grid two form-two">${field("Longueur ou diamètre (m)", "length", "", "number", 'required min="0.1" max="500" step="0.01"')}${field("Largeur (m)", "width", "", "number", 'min="0.1" max="500" step="0.01"')}</div>${field("Profondeur moyenne (m)", "depth", "", "number", 'required min="0.1" max="50" step="0.01"')}<div id="volume-result" class="note">Renseignez les dimensions mesurées. Cette estimation ne remplace pas le volume constructeur.</div>`,
    async (b) => {
      const l = Number(b.length),
        w = Number(b.width),
        d = Number(b.depth);
      if (b.shape !== "round" && !w)
        throw new Error("Renseignez aussi la largeur.");
      const v =
        (b.shape === "round"
          ? (Math.PI * l * l) / 4
          : b.shape === "oval"
            ? (Math.PI * l * w) / 4
            : l * w) * d;
      $("#volume-result").textContent =
        "Volume estimé : " +
        v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) +
        " m³.";
    },
    "Calculer",
  );
});
on("assistant", () =>
  modal(
    "Un avis documentaire",
    `<p class="note">Votre question sera transmise au service d’IA OpenRouter. Ne renseignez aucune coordonnée privée de client. Aucun dossier piscine n’est envoyé automatiquement.</p>${area("Votre question métier", "question", "", 'required maxlength="3000"')}<div id="assistant-answer" class="prose"></div>`,
    async (b) => {
      const r = await api("/assistant", "POST", b);
      $("#assistant-answer").textContent = r.answer;
    },
    "Demander une piste",
  ),
);
on("quiz", async () => {
  quiz = await api("/quiz");
  modal(
    "Votre session de révision",
    quiz.items
      .map(
        (q, n) =>
          `<section style="margin-bottom:28px"><div class="eyebrow">QUESTION ${n + 1} / 40 · ${esc(q.category)}</div><h3>${esc(q.question)}</h3>${Object.entries(
            q.options,
          )
            .map(
              ([key, text]) =>
                `<label class="check"><input type="radio" name="q_${q.id}" value="${key}" required>${esc(text)}</label>`,
            )
            .join("")}</section>`,
      )
      .join(""),
    async (b) => {
      const r = await api("/quiz", "POST", {
        answers: quiz.items.map((q) => ({ id: q.id, answer: b["q_" + q.id] })),
      });
      modal(
        "Votre résultat : " + r.score + " / " + r.total,
        `<p class="note">Cet entraînement utilise la banque de questions du projet. Il ne constitue ni une qualification ni une validation réglementaire.</p>${
          r.results
            .filter((x) => !x.success)
            .map((x) => {
              const q = quiz.items.find((q) => q.id === x.id);
              return `<div class="row"><div><h3>${esc(q.question)}</h3><p>Réponse attendue : ${esc(q.options[x.correct])}</p><p class="small-note">${esc(x.explanation)}</p></div></div>`;
            })
            .join("") || "<p>Toutes les réponses sont correctes.</p>"
        }`,
        null,
      );
    },
    "Voir ma correction",
  );
});
