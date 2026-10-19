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
import { period, shiftPeriod, calendarDays } from "./calendar.js";
export const proPages = { planning, preparation };
let planDate = today(),
  planRange = 0;
const heading = (eye, title, sub, actions = "") =>
  `<div class="page-heading"><div><div class="eyebrow">${eye}</div><h1>${title}</h1><p>${sub}</p></div>${actions}</div>`;
function appointmentRow(a) {
  return `<article class="agenda-visit ${a.status === "cancelled" ? "is-cancelled" : ""}"><div class="agenda-time"><time>${esc(a.time)}</time><span>${a.duration} min</span></div><div class="agenda-visit-body"><div class="agenda-visit-title"><h3><a href="#pool/${a.pool_id}">${esc(a.pool_name)}</a></h3>${badge(a.status === "done" ? "Effectué" : a.status === "cancelled" ? "Annulé" : "À venir", a.status === "done" ? "teal" : "")}</div><p>${esc(a.title)}</p><p class="small-note">${icon("map", 14)} ${esc(a.city || "Commune à compléter")}</p>${a.reason ? `<p>${esc(a.reason)}</p>` : ""}${a.status === "planned" ? `<div class="agenda-visit-actions">${button("Commencer", "start-appointment", `data-id="${a.id}"`, "primary small")}${button("Déplacer", "move-appointment", `data-id="${a.id}"`, "ghost small")}</div>` : ""}</div></article>`;
}
async function planning(main) {
  const { from, to } = period(planDate, planRange),
    [r, inv] = await Promise.all([
      api("/planning?from=" + from + "&to=" + to),
      api("/invitations"),
    ]);
  if (state.route !== "planning") return;
  state.appointments = r.items;
  const selected = r.items
    .filter((a) => a.date === planDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const count = (day) =>
    r.items.filter((a) => a.date === day && a.status !== "cancelled").length;
  const periodTitle =
    planRange === 29
      ? fmt(from, { month: "long", year: "numeric", day: undefined })
      : planRange === 6
        ? `${fmt(from)} au ${fmt(to, { year: "numeric" })}`
        : fmt(planDate, { weekday: "long", month: "long", year: "numeric" });
  const cells = planRange
    ? calendarDays(planDate, planRange)
        .map((day) => {
          const outside = day < from || day > to,
            n = count(day);
          return `<button class="calendar-day ${day === planDate ? "is-selected" : ""} ${day === today() ? "is-today" : ""} ${outside ? "is-outside" : ""}" data-action="plan-day" data-date="${day}" aria-pressed="${day === planDate}" ${day === today() ? 'aria-current="date"' : ""} aria-label="${esc(fmt(day, { weekday: "long", month: "long", year: "numeric" }))}, ${outside ? "ouvrir ce mois" : n + " passage" + (n > 1 ? "s" : "")}">${planRange === 6 ? `<span class="calendar-weekday">${fmt(day, { weekday: "short", day: undefined, month: undefined })}</span>` : ""}<span class="calendar-number">${Number(day.slice(8))}</span><span class="calendar-load" aria-hidden="true">${n ? `<span>${n}</span>` : ""}</span></button>`;
        })
        .join("")
    : "";
  main.innerHTML = `<section class="agenda-heading"><div><h1>Agenda</h1><p>Votre tournée, jour après jour.</p></div>${button(icon("plus", 18) + " Planifier", "new-appointment")}</section><nav class="agenda-shortcuts" aria-label="Organisation de la tournée"><a href="#preparation">${icon("box", 20)}<span><strong>À préparer</strong><small>Produits et matériel</small></span>${icon("arrow", 16)}</a><a href="#stats">${icon("chart", 20)}<span><strong>Statistiques</strong><small>Votre activité</small></span>${icon("arrow", 16)}</a></nav>${invitationSection(inv.items)}<section class="agenda-calendar" aria-label="Calendrier des passages"><div class="agenda-calendar-tools"><div class="calendar-period"><button class="calendar-arrow" data-action="plan-prev" aria-label="Période précédente">‹</button><h2>${periodTitle}</h2><button class="calendar-arrow" data-action="plan-next" aria-label="Période suivante">›</button></div><div class="calendar-controls">${button("Aujourd’hui", "plan-today", "", "ghost small")}<label class="calendar-date">${icon("calendar", 18)}<input type="date" id="plan-date" value="${planDate}" aria-label="Début de période"></label><select id="plan-range" aria-label="Période"><option value="0" ${planRange === 0 ? "selected" : ""}>Jour</option><option value="6" ${planRange === 6 ? "selected" : ""}>Semaine</option><option value="29" ${planRange === 29 ? "selected" : ""}>Mois</option></select></div></div>${planRange ? `<div class="calendar-grid ${planRange === 29 ? "month-grid" : "week-grid"}">${planRange === 29 ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => `<span class="calendar-weekday" aria-hidden="true">${d}</span>`).join("") : ""}${cells}</div>` : ""}<section class="agenda-day" aria-label="Passages du jour"><div class="agenda-day-heading"><h2>${fmt(planDate, { weekday: "long", month: "long" })}</h2><span>${selected.length} passage${selected.length > 1 ? "s" : ""}</span></div>${selected.length ? selected.map(appointmentRow).join("") : `<div class="agenda-free">${icon("calendar", 32)}<h3>Aucun passage ce jour</h3><p>Choisissez une autre date ou planifiez un entretien.</p></div>`}</section></section>`;
  $("#plan-date").addEventListener("change", (e) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) return;
    planDate = e.target.value;
    refresh();
  });
  $("#plan-range").addEventListener("change", (e) => {
    planRange = Number(e.target.value);
    refresh();
  });
}
on("plan-day", (d) => {
  planDate = d.date;
  refresh();
});
on("plan-prev", () => {
  planDate = shiftPeriod(planDate, planRange, -1);
  refresh();
});
on("plan-next", () => {
  planDate = shiftPeriod(planDate, planRange, 1);
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
