import {
  $,
  $$,
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
import { CALCULATORS, calculate } from "./calculations.js";
export const toolPages = { tools, calculators, library, code, guide };
const back = (route = "tools", label = "Retour à Pisciniste") =>
  `<a class="back-link" href="#${route}" ${route === "code" ? 'data-action="return-code"' : ""}>← ${label}</a>`;
on("return-code", () => (location.hash === "#code" ? refresh() : go("code")));
const heading = (title, description) =>
  `<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></div>`;
async function tools(main) {
  main.innerHTML =
    heading(
      "Pisciniste",
      "Vos outils pour préparer, réaliser et suivre chaque intervention.",
    ) +
    `<div class="tool-hub"><a href="#code" class="card tool-feature"><div class="pool-symbol">${icon("book", 28)}</div><div><span class="eyebrow">S’ENTRAÎNER AU MÉTIER</span><h2>Code du pisciniste</h2><p>Révisez par thème ou lancez une session complète. Retrouvez vos résultats et les explications après chaque entraînement.</p><span class="btn primary">Ouvrir le Code du pisciniste ${icon("arrow", 17)}</span></div></a><a href="#calculators" class="card tool-entry"><div class="pool-symbol">${icon("settings", 26)}</div><h2>Outils de calcul</h2><p>Volume, dosage, sel, filtration, appoint, énergie et préparation de tournée.</p><span class="text-btn">Explorer les 16 calculateurs →</span></a><a href="#library" class="card tool-entry"><div class="pool-symbol">${icon("book", 26)}</div><h2>Bibliothèque métier</h2><p>Informations métier, procédures détaillées et vos propres fiches, classées par catégorie.</p><span class="text-btn">Ouvrir la bibliothèque →</span></a></div>`;
}
async function calculators(main, id) {
  const def = CALCULATORS.find((x) => x.id === id);
  if (!def) {
    main.innerHTML =
      back() +
      heading(
        "Outils de calcul",
        "Choisissez ce que vous voulez estimer. Les unités et les hypothèses sont précisées dans chaque outil.",
      ) +
      `<label class="field"><span>Rechercher un calcul</span><input id="calculator-search" type="search" placeholder="Sel, volume, filtration…"></label><div id="calculator-list"></div>`;
    const show = () => {
      const q = $("#calculator-search").value.toLocaleLowerCase("fr");
      const list = CALCULATORS.filter((c) =>
        (c.title + " " + c.description + " " + c.category)
          .toLocaleLowerCase("fr")
          .includes(q),
      );
      $("#calculator-list").innerHTML = list.length
        ? [...new Set(list.map((c) => c.category))]
            .map(
              (cat) =>
                `<div class="section-heading"><h2>${esc(cat)}</h2></div><div class="grid three">${list
                  .filter((c) => c.category === cat)
                  .map(
                    (c) =>
                      `<a class="card calculator-tile" href="#calculators/${c.id}"><h3>${esc(c.title)}</h3><p class="small-note">${esc(c.description)}</p><span class="text-btn">Calculer →</span></a>`,
                  )
                  .join("")}</div>`,
            )
            .join("")
        : empty("Aucun calcul trouvé", "Essayez un autre mot-clé.");
    };
    $("#calculator-search").addEventListener("input", show);
    show();
    return;
  }
  main.innerHTML =
    back("calculators", "Tous les calculateurs") +
    heading(def.title, def.description) +
    `<div class="calculator-layout"><form id="calculation-form" class="card"><div class="grid two form-two">${def.fields.map((f) => (f.options ? select(f.label, f.key, f.options, f.value) : field(f.label, f.key, f.value, "number", `required min="${f.min}" max="${f.max}" step="any"`))).join("")}</div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">Calculer</button></form><aside><div id="calculation-result" class="card calculation-result" aria-live="polite"><h2>Votre résultat</h2><p>Renseignez les valeurs mesurées et lancez le calcul.</p></div><div class="card calculation-notice"><h3>Comment utiliser ce calcul</h3><p>${esc(def.note)}</p><p class="small-note"><strong>Formule :</strong> ${esc(def.formula)}</p></div></aside></div>`;
  const form = $("#calculation-form");
  const conditional = () => {
    if (id !== "volume") return;
    const shape = form.elements.namedItem("shape").value;
    for (const key of ["length", "width", "area"]) {
      const el = form.elements.namedItem(key),
        visible =
          key === "area"
            ? shape === "area"
            : key === "width"
              ? ["rect", "oval"].includes(shape)
              : shape !== "area";
      el.disabled = !visible;
      el.closest(".field").hidden = !visible;
    }
  };
  form.addEventListener("change", conditional);
  conditional();
  form.addEventListener("input", () => {
    $("#calculation-result").innerHTML =
      "<h2>Votre résultat</h2><p>Valeurs modifiées : relancez le calcul pour actualiser le résultat.</p>";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    $(".form-error", form).textContent = "";
    try {
      const r = calculate(id, Object.fromEntries(new FormData(form)));
      const num = (v) =>
        Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
      $("#calculation-result").innerHTML =
        `<div class="eyebrow">RÉSULTAT ESTIMÉ</div><strong class="calculation-value">${num(r.value)} <small>${esc(r.unit)}</small></strong><p>${esc(r.explanation)}</p>${r.extra.map((x) => `<div class="calculation-extra"><span>${esc(x.label)}</span><strong>${x.text ? esc(x.text) : num(x.value) + " " + esc(x.unit)}</strong></div>`).join("")}`;
    } catch (err) {
      $(".form-error", form).textContent = err.message;
      $("#calculation-result").innerHTML =
        "<h2>Calcul à vérifier</h2><p>Corrigez les valeurs indiquées avant de relancer.</p>";
    }
  });
}
async function library(main) {
  const [personal, reference, guides] = await Promise.all([
    api("/procedures"),
    api("/procedures/reference"),
    api("/guides"),
  ]);
  state.procedures = [...personal.items, ...reference.items];
  main.innerHTML =
    back() +
    heading(
      "Bibliothèque métier",
      "Retrouvez les connaissances et les procédures dont vous avez besoin sur le terrain.",
    ) +
    `<a class="card routine-feature" href="#guide/entretien"><span class="pool-symbol">${icon("check", 26)}</span><div><h2>Entretien courant · pas à pas</h2><p>Du niveau d’eau au compte rendu, avec une checklist adaptée au filtre et une progression enregistrable.</p></div><span class="btn primary">Ouvrir la procédure →</span></a><div class="library-filters"><label class="field"><span>Rechercher une fiche métier</span><input id="reference-search" type="search" placeholder="Filtre, analyse, entretien…"></label>${select("Type de fiche", "reference-type", { all: "Toutes les fiches", information: "Informations métier", procedure: "Procédures", personal: "Mes fiches" }, "all")}${select("Catégorie de fiche", "reference-category", { "": "Toutes les catégories", ...Object.fromEntries([...new Set([...reference.items, ...guides.items].map((p) => p.category))].sort((a, b) => a.localeCompare(b, "fr")).map((c) => [c, c])) })}</div><div class="section-heading"><h2 id="library-count">Les fiches</h2>${button("Créer une fiche", "new-procedure", "", "secondary")}</div><div id="reference-list" class="grid three"></div>`;
  const custom = personal.items.map((p) => ({
    ...p,
    type: "personal",
    category: "Mes fiches",
    summary: p.body.slice(0, 140),
  }));
  const items = [
    ...guides.items.map((p) => ({
      ...p,
      type: "procedure",
      guide_id: p.id,
      curated: true,
    })),
    ...custom,
    ...reference.items.filter((p) => !p.guide_id),
  ];
  const show = () => {
    const q = $("#reference-search").value.toLocaleLowerCase("fr"),
      t = $("[name=reference-type]").value,
      cat = $("[name=reference-category]").value;
    const filtered = items.filter(
      (p) =>
        (t === "all" || p.type === t) &&
        (!cat || p.category === cat) &&
        (p.title + " " + p.summary + " " + p.category)
          .toLocaleLowerCase("fr")
          .includes(q),
    );
    $("#library-count").textContent =
      `${filtered.length} fiche${filtered.length > 1 ? "s" : ""}`;
    $("#reference-list").innerHTML =
      filtered
        .map(
          (p) =>
            `<article class="card library-tile"><div class="eyebrow">${esc(p.category)}</div><div>${badge(p.type === "information" ? "Information métier" : p.type === "personal" ? "Votre fiche" : "Procédure", p.curated ? "teal" : "")}</div><h3>${esc(p.title)}</h3><p class="small-note">${esc(p.summary)}</p>${p.guide_id ? `<a class="btn secondary small" href="#guide/${p.guide_id}">Ouvrir la procédure</a>` : button("Lire la fiche", "procedure", `data-id="${esc(p.id)}"`, "secondary small")}</article>`,
        )
        .join("") ||
      empty(
        "Aucune fiche trouvée",
        "Modifiez le type, la catégorie ou votre recherche.",
      );
  };
  $("#reference-search").addEventListener("input", show);
  $("[name=reference-type]").addEventListener("change", show);
  $("[name=reference-category]").addEventListener("change", show);
  show();
}
function procedureForm(p = {}) {
  modal(
    p.id ? "Modifier une fiche" : "Votre nouvelle fiche",
    `${field("Titre", "title", p.title || "", "text", 'required maxlength="160"')}${area("Contenu — une étape par ligne pour une procédure", "body", p.body || "", 'required maxlength="12000" rows="10"')}<label class="check"><input type="checkbox" name="important" ${p.important ? "checked" : ""}> Garder cette fiche en tête de liste</label>`,
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
on("edit-procedure", (d) =>
  procedureForm(state.procedures.find((p) => p.id === d.id)),
);
on("procedure", (d) => {
  const p = state.procedures.find((x) => x.id === d.id);
  if (!p) return;
  if (p.guide_id) {
    go("guide/" + p.guide_id);
    return;
  }
  modal(
    p.title,
    `${p.type === "information" ? '<div class="eyebrow">INFORMATION MÉTIER</div>' : ""}<div class="prose">${p.body
      .split("\n")
      .map((line) => (line.trim() ? `<p>${esc(line)}</p>` : ""))
      .join(
        "",
      )}</div>${p.id.startsWith("reference-") ? '<p class="small-note">Fiche de référence de la bibliothèque initiale. Pour une intervention, vérifiez la notice du matériel et les conditions propres au bassin. Les procédures d’entretien mises à jour sont accessibles dans la bibliothèque.</p>' : button("Modifier", "edit-procedure", `data-id="${esc(p.id)}"`, "secondary")}`,
    null,
  );
});
let guideState = null;
window.addEventListener("beforeunload", (e) => {
  if (guideState?.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
async function guide(main, id, poolId = "") {
  const base = "/guides/" + encodeURIComponent(id),
    suffix = poolId ? "?pool_id=" + encodeURIComponent(poolId) : "";
  const [g, p] = await Promise.all([
    api(base),
    api(base + "/progress" + suffix),
  ]);
  guideState = { g, p, base, suffix, dirty: false };
  main.innerHTML =
    back(
      poolId ? "pool/" + poolId : "library",
      poolId ? "Retour au dossier piscine" : "Retour à la bibliothèque",
    ) +
    heading(g.title, g.summary) +
    `<p class="note">${esc(g.note)}</p><div class="guide-toolbar card">${g.variants ? select("Type de filtre", "guide-variant", g.variants, p.variant) : ""}<div class="guide-progress"><strong id="guide-count"></strong><progress id="guide-progress" value="0" max="1" aria-label="Progression de la procédure"></progress><span id="guide-status" role="status">${p.revision ? "Progression enregistrée retrouvée." : "Cochez les opérations réalisées, puis enregistrez avant de quitter."}</span></div><div class="actions">${button("Enregistrer la progression", "save-guide")}${button("Nouveau passage", "reset-guide", "", "secondary")}</div></div><div id="guide-sections"></div><div class="card guide-bottom"><span class="small-note">Pensez à enregistrer les étapes réalisées avant de quitter.</span>${button("Enregistrer la progression", "save-guide")}</div><div class="card guide-sources"><h2>Notices et références utiles</h2><p class="small-note">La notice exacte de votre équipement prime. Ces liens permettent de retrouver les principes et les précautions des fabricants.</p>${g.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join("")}<p class="small-note">Cette progression reste personnelle. Pour transmettre le suivi au client, complétez le compte rendu du passage et utilisez « Terminer et partager ».</p></div>`;
  const renderSteps = () => {
    const visible = g.sections.map((s) => ({
      ...s,
      steps: s.steps.filter((x) => !x.variant || x.variant === p.variant),
    }));
    $("#guide-sections").innerHTML = visible
      .map(
        (s) =>
          `<section class="card guide-section"><h2>${esc(s.title)}</h2>${s.steps.map((x) => `<div class="guide-step ${p.checks[x.id] ? "checked" : ""}" data-step="${x.id}"><div><h3>${esc(x.title)}</h3><p>${esc(x.detail)}</p></div><label class="field step-status"><span class="sr-only">État : ${esc(x.title)}</span><select data-guide-step="${x.id}" aria-label="État : ${esc(x.title)}"><option value="">À faire</option><option value="done" ${p.checks[x.id] === "done" ? "selected" : ""}>Fait</option><option value="na" ${p.checks[x.id] === "na" ? "selected" : ""}>Non applicable</option></select></label></div>`).join("")}</section>`,
      )
      .join("");
    $$("[data-guide-step]").forEach((el) =>
      el.addEventListener("change", () => {
        if (el.value) p.checks[el.dataset.guideStep] = el.value;
        else delete p.checks[el.dataset.guideStep];
        el.closest(".guide-step").classList.toggle("checked", !!el.value);
        guideState.dirty = true;
        update();
      }),
    );
    update();
  };
  function update() {
    const all = g.sections.flatMap((s) =>
        s.steps.filter((x) => !x.variant || x.variant === p.variant),
      ),
      done = all.filter((x) => p.checks[x.id] === "done").length,
      na = all.filter((x) => p.checks[x.id] === "na").length;
    $("#guide-count").textContent =
      `${done} fait${done > 1 ? "s" : ""} · ${na} non applicable${na > 1 ? "s" : ""} · ${all.length - done - na} à faire`;
    $("#guide-progress").max = all.length;
    $("#guide-progress").value = done + na;
    if (guideState.dirty)
      $("#guide-status").textContent =
        "Modifications à enregistrer avant de quitter.";
  }
  $("[name=guide-variant]")?.addEventListener("change", (e) => {
    p.variant = e.target.value;
    const allowed = new Set(
      g.sections.flatMap((s) =>
        s.steps
          .filter((x) => !x.variant || x.variant === p.variant)
          .map((x) => x.id),
      ),
    );
    p.checks = Object.fromEntries(
      Object.entries(p.checks).filter(([k]) => allowed.has(k)),
    );
    guideState.dirty = true;
    renderSteps();
  });
  on("save-guide", async () => {
    const current = guideState;
    const controls = $$(
      "[data-guide-step], [name=guide-variant], [data-action=save-guide], [data-action=reset-guide]",
      main,
    );
    controls.forEach((el) => (el.disabled = true));
    try {
      const r = await api(base + "/progress" + suffix, "PUT", {
        variant: p.variant,
        checks: p.checks,
        revision: p.revision,
      });
      p.revision = r.revision;
      current.dirty = false;
      if (guideState === current && $("#guide-status"))
        $("#guide-status").textContent = "Progression enregistrée.";
      toast("Progression enregistrée.");
    } finally {
      controls.forEach((el) => (el.disabled = false));
    }
  });
  on("reset-guide", () =>
    modal(
      "Commencer un nouveau passage ?",
      "<p>La progression enregistrée de cette procédure sera remise à zéro. Les comptes rendus déjà partagés restent dans le dossier piscine.</p>",
      async () => {
        const r = await api(base + "/progress" + suffix, "PUT", {
          variant: p.variant,
          checks: {},
          revision: p.revision,
        });
        p.revision = r.revision;
        p.checks = {};
        guideState.dirty = false;
        closeModal();
        renderSteps();
        $("#guide-status").textContent = "Nouveau passage prêt.";
      },
      "Recommencer",
    ),
  );
  renderSteps();
}
let quiz = null,
  quizIndex = 0;
const quizKey = () => `peace-blue-quiz-${state.user?.id}`;
const persistQuiz = () => {
  try {
    sessionStorage.setItem(
      quizKey(),
      JSON.stringify({ quiz, index: quizIndex }),
    );
  } catch {}
};
async function code(main) {
  const [history, sample] = await Promise.all([
    api("/quiz/history"),
    api("/quiz?count=10"),
  ]);
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(quizKey()) || "null");
  } catch {}
  main.innerHTML =
    back() +
    heading(
      "Code du pisciniste",
      "Révisez les gestes, les connaissances et les calculs utiles à votre métier.",
    ) +
    `<div class="split"><section class="card"><div class="pool-symbol">${icon("book", 30)}</div><h2>Votre prochaine session</h2><p>Un entraînement court ou une session de 40 questions, avec correction expliquée.</p><form id="quiz-start">${select("Format de révision", "count", { 10: "Révision rapide · jusqu’à 10 questions", 40: "Session complète · 40 questions" }, "10")}${select("Thème à réviser", "category", { "": "Tous les thèmes", ...Object.fromEntries(sample.categories.map((c) => [c, c])) })}<p class="small-note">Pour un thème précis, le nombre s’adapte aux questions disponibles. Cet entraînement ne délivre pas de qualification.</p><button class="btn primary" type="submit">Commencer la révision</button></form>${saved?.quiz?.items?.length ? button("Reprendre ma session", "resume-quiz", "", "secondary") : ""}</section><section class="card"><h2>Vos derniers résultats</h2>${
      history.items.length
        ? history.items
            .slice(0, 10)
            .map(
              (h) =>
                `<div class="row"><div><strong>${h.score} / ${h.total}</strong><p class="small-note">${fmt(h.created_at, { year: "numeric" })}</p></div>${badge(Math.round((h.score / h.total) * 100) + " %", "teal")}</div>`,
            )
            .join("")
        : '<p class="small-note">Votre historique apparaîtra ici après votre première session terminée.</p>'
    }</section></div>`;
  $("#quiz-start").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("[type=submit]", e.target);
    btn.disabled = true;
    try {
      const b = Object.fromEntries(new FormData(e.target));
      const r = await api(
        "/quiz?count=" +
          b.count +
          "&category=" +
          encodeURIComponent(b.category),
      );
      quiz = { items: r.items, answers: {} };
      quizIndex = 0;
      persistQuiz();
      showQuestion(main);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
  on("resume-quiz", () => {
    quiz = saved.quiz;
    quizIndex = Math.min(saved.index || 0, quiz.items.length - 1);
    showQuestion(main);
  });
}
function showQuestion(main) {
  const q = quiz.items[quizIndex],
    total = quiz.items.length;
  main.innerHTML =
    back("code", "Retour au Code du pisciniste") +
    heading("Code du pisciniste", `Question ${quizIndex + 1} sur ${total}`) +
    `<section class="card quiz-question"><progress value="${Object.keys(quiz.answers).length}" max="${total}" aria-label="Questions répondues"></progress><div class="eyebrow">${esc(q.category)}</div><h2>${esc(q.question)}</h2><div class="quiz-options">${Object.entries(
      q.options,
    )
      .map(
        ([key, text]) =>
          `<label class="check"><input type="radio" name="quiz-answer" value="${key}" ${quiz.answers[q.id] === key ? "checked" : ""}><span>${esc(text)}</span></label>`,
      )
      .join(
        "",
      )}</div><div class="inline between">${button("Précédente", "quiz-prev", quizIndex === 0 ? "disabled" : "", "secondary")}${quizIndex < total - 1 ? button("Suivante", "quiz-next") : button("Voir ma correction", "quiz-finish")}</div><p class="small-note">Votre session est conservée dans cet onglet jusqu’à sa correction.</p></section>`;
  $$("[name=quiz-answer]").forEach((el) =>
    el.addEventListener("change", () => {
      quiz.answers[q.id] = el.value;
      persistQuiz();
      $("progress", main).value = Object.keys(quiz.answers).length;
    }),
  );
  on("quiz-prev", () => {
    if (quizIndex > 0) quizIndex--;
    persistQuiz();
    showQuestion(main);
  });
  on("quiz-next", () => {
    if (quizIndex < total - 1) quizIndex++;
    persistQuiz();
    showQuestion(main);
  });
  on("quiz-finish", async (_, btn) => {
    const missing = quiz.items.findIndex((x) => !quiz.answers[x.id]);
    if (missing >= 0) {
      quizIndex = missing;
      persistQuiz();
      showQuestion(main);
      toast("Répondez à toutes les questions avant la correction.", "error");
      return;
    }
    btn.disabled = true;
    try {
      const r = await api("/quiz", "POST", {
        answers: quiz.items.map((x) => ({
          id: x.id,
          answer: quiz.answers[x.id],
        })),
      });
      sessionStorage.removeItem(quizKey());
      main.innerHTML =
        back("code", "Retour au Code du pisciniste") +
        heading(
          `Votre résultat : ${r.score} / ${r.total}`,
          "Relisez les explications pour consolider vos connaissances.",
        ) +
        r.results
          .map((x) => {
            const item = quiz.items.find((q) => q.id === x.id);
            return `<article class="card quiz-correction"><div>${badge(x.success ? "Bonne réponse" : "À revoir", x.success ? "teal" : "amber")}</div><h2>${esc(item.question)}</h2>${!x.success ? `<p>Votre réponse : ${esc(item.options[quiz.answers[x.id]])}</p>` : ""}<p><strong>Réponse attendue :</strong> ${esc(item.options[x.correct])}</p><p class="small-note">${esc(x.explanation || "Consultez la fiche métier correspondante pour approfondir ce thème.")}</p></article>`;
          })
          .join("");
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}
