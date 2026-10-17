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
  cityField,
  button,
  badge,
  empty,
  fmt,
  refresh,
  specs,
  today,
  addDays,
  confirmAction,
} from "./ui.js";
import { needRow, openRecordForm, invitationSection } from "./pools.js";
export const proPages = { planning, preparation };
let planDate = today(),
  planRange = 0;
const heading = (eye, title, sub, actions = "") =>
  `<div class="page-heading"><div><div class="eyebrow">${eye}</div><h1>${title}</h1><p>${sub}</p></div>${actions}</div>`;
function appointmentRow(a) {
  return `<div class="row"><div class="time">${esc(a.time)}</div><div class="grow"><h3><a href="#pool/${a.pool_id}" style="text-decoration:none">${esc(a.pool_name)}</a></h3><p>${esc(a.title)} · ${esc(a.city || "Commune à compléter")} · ${a.duration} min</p>${a.reason ? `<p>${esc(a.reason)}</p>` : ""}</div>${badge(a.status === "done" ? "Effectué" : a.status === "cancelled" ? "Annulé" : "À venir", a.status === "done" ? "teal" : "")}<div class="actions">${a.status === "planned" ? button("Commencer", "start-appointment", `data-id="${a.id}"`, "primary small") + button("Déplacer", "move-appointment", `data-id="${a.id}"`, "ghost small") : ""}</div></div>`;
}
async function planning(main) {
  const to = addDays(planDate, planRange),
    [r, inv] = await Promise.all([
      api("/planning?from=" + planDate + "&to=" + to),
      api("/invitations"),
    ]);
  state.appointments = r.items;
  main.innerHTML =
    heading(
      "VOTRE ORGANISATION",
      "Agenda",
      "Récurrences saisonnières, visites ponctuelles et changements de dernière minute.",
      `<div class="inline wrap"><a href="#preparation" class="btn secondary">${icon("box", 16)} À préparer</a><a href="#stats" class="btn secondary">${icon("chart", 16)} Statistiques</a>${button("Planifier", "new-appointment")}</div>`,
    ) +
    `${invitationSection(inv.items)}<div class="card"><div class="inline between wrap toolbar"><div class="inline"><button class="btn secondary small" data-action="plan-prev" aria-label="Période précédente">←</button><input type="date" id="plan-date" value="${planDate}" class="search-input" aria-label="Début de période"><button class="btn secondary small" data-action="plan-next" aria-label="Période suivante">→</button></div><div class="inline">${button("Aujourd’hui", "plan-today", "", "ghost small")}<select id="plan-range" class="search-input" aria-label="Période"><option value="0" ${planRange === 0 ? "selected" : ""}>Jour</option><option value="6" ${planRange === 6 ? "selected" : ""}>Semaine</option><option value="29" ${planRange === 29 ? "selected" : ""}>Mois</option></select></div></div><div style="margin-top:20px">${
      r.items.length
        ? [...new Set(r.items.map((a) => a.date))]
            .map(
              (day) =>
                `<div class="section-heading"><h3 style="margin:0">${fmt(day, { weekday: "long" })}</h3>${day === today() ? badge("Aujourd’hui", "teal") : ""}</div>${r.items
                  .filter((a) => a.date === day)
                  .map(appointmentRow)
                  .join("")}`,
            )
            .join("")
        : empty(
            "Aucun passage prévu",
            "Ajoutez un passage ponctuel ou une récurrence depuis la fiche d’une piscine.",
          )
    }</div></div>`;
  $("#plan-date").addEventListener("change", (e) => {
    planDate = e.target.value;
    refresh();
  });
  $("#plan-range").addEventListener("change", (e) => {
    planRange = Number(e.target.value);
    refresh();
  });
}
on("plan-prev", () => {
  planDate = addDays(planDate, -(planRange + 1));
  refresh();
});
on("plan-next", () => {
  planDate = addDays(planDate, planRange + 1);
  refresh();
});
on("plan-today", () => {
  planDate = today();
  refresh();
});
async function actualAppointment(id) {
  const a = state.appointments.find((a) => a.id === id);
  if (!a) throw new Error("Rechargez votre planning.");
  return a.virtual
    ? await api("/schedules/" + a.schedule_id + "/occurrence", "POST", {
        date: a.date,
      })
    : a;
}
on("start-appointment", async (d) => {
  const a = await actualAppointment(d.id);
  await openRecordForm(a.pool_id, "visit", null, a.id);
});
on("move-appointment", async (d) => {
  const a = await actualAppointment(d.id);
  modal(
    "Adapter ce passage",
    `${field("Date", "date", a.date, "date", "required")}${field("Heure", "time", a.time, "time", "required")}${select("Statut", "status", { planned: "Passage prévu / reporté", cancelled: "Passage annulé" }, "planned")}${area("Motif partagé au client", "reason", a.reason || "", 'maxlength="500"')}<p class="small-note">Les autres dates de la récurrence restent identiques.</p>`,
    async (b) => {
      await api("/appointments/" + a.id, "PUT", b);
      closeModal();
      refresh();
      toast("Le client a été informé du changement.");
    },
    "Mettre à jour",
  );
});
async function poolSelect(preset) {
  const r = await api("/pools?mode=pro&limit=50");
  if (preset && !r.items.some((p) => p.id === preset))
    r.items.push(await api("/pools/" + preset));
  if (!r.items.length) {
    toast(
      "Ajoutez une piscine depuis Clients, puis planifiez votre passage.",
      "error",
    );
    return null;
  }
  return select(
    "Piscine",
    "pool_id",
    Object.fromEntries(r.items.map((p) => [p.id, p.name])),
    preset || r.items[0].id,
  );
}
on("new-appointment", async (d) => {
  const pick = await poolSelect(d.pool);
  if (!pick) return;
  modal(
    "Planifier un passage",
    `${pick}${field("Intitulé", "title", "Entretien", "text", 'required maxlength="120"')}<div class="grid two form-two">${field("Date", "date", planDate, "date", "required")}${field("Heure", "time", "09:00", "time", "required")}</div>${field("Durée prévue (minutes)", "duration", 45, "number", 'required min="5" max="1440"')}`,
    async (b) => {
      await api("/pools/" + b.pool_id + "/appointments", "POST", b);
      closeModal();
      toast("Passage planifié.");
      refresh();
    },
    "Planifier",
  );
});
on("new-schedule", async (d) => {
  const pick = await poolSelect(d.pool);
  if (!pick) return;
  modal(
    "Un rythme adapté à la piscine",
    `${pick}${field("Intitulé", "title", "Entretien régulier", "text", 'required maxlength="120"')}<div class="grid two form-two">${field("À partir du", "start_date", today(), "date", "required")}${field("Jusqu’au : facultatif", "end_date", "", "date")}</div><div class="grid two form-two">${field("Tous les X jours", "interval_days", 7, "number", 'required min="1" max="365"')}${select("Jour souhaité", "weekday", { "": "Selon l’intervalle", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" }, "")}</div><div class="grid two form-two">${field("Heure", "time", "09:00", "time", "required")}${field("Durée (minutes)", "duration", 45, "number", 'required min="5" max="1440"')}</div><details><summary>Adapter le rythme aux saisons</summary><p class="small-note">Laissez vide pour conserver le même rythme toute l’année. Renseignez les deux périodes pour activer la saisonnalité.</p><div class="grid two form-two">${field("Avril → octobre : tous les X jours", "summer", "", "number", 'min="1" max="365"')}${field("Novembre → mars : tous les X jours", "winter", "", "number", 'min="1" max="365"')}</div></details>`,
    async (b) => {
      if (Boolean(b.summer) !== Boolean(b.winter))
        throw new Error("Renseignez les deux périodes saisonnières.");
      const seasons = b.summer
        ? [
            {
              start: "04-01",
              end: "10-31",
              interval_days: Number(b.summer),
              weekday: b.weekday || null,
            },
            {
              start: "11-01",
              end: "03-31",
              interval_days: Number(b.winter),
              weekday: b.weekday || null,
            },
          ]
        : [];
      await api("/pools/" + b.pool_id + "/schedules", "POST", {
        ...b,
        seasons,
      });
      closeModal();
      toast("Récurrence enregistrée.");
      refresh();
    },
    "Créer le rythme",
  );
});
on("stop-schedule", (d) =>
  confirmAction(
    "Arrêter cette récurrence",
    "Les passages effectués restent dans le journal. Les prochaines occurrences automatiques disparaîtront du planning.",
    () => api("/schedules/" + d.id, "DELETE", {}),
    "Arrêter",
  ),
);

async function preparation(main) {
  const r = await api("/preparation?to=" + addDays(today(), 7));
  state.needs = r.items;
  main.innerHTML =
    heading(
      "",
      "Préparer mes passages",
      "Produits et matériel à prévoir pour les sept prochains jours.",
      '<a href="#planning" class="btn secondary">Retour à l’agenda</a>',
    ) +
    `<div class="grid two">${[
      ["pro", "À emporter"],
      ["client", "Achats des clients"],
    ]
      .map(
        ([kind, title]) =>
          `<section class="card"><h2>${title}</h2>${
            r.items
              .filter((n) => n.responsible === kind)
              .map(needRow)
              .join("") ||
            empty(
              "Rien à prévoir",
              "Les besoins saisis dans les dossiers piscine apparaîtront ici.",
            )
          }</section>`,
      )
      .join("")}</div>`;
}
