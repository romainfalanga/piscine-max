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
  return `<article class="agenda-visit ${a.status === "cancelled" ? "is-cancelled" : ""}"><div class="agenda-time"><time>${esc(a.time)}</time><span>${a.duration} min</span></div><div class="agenda-visit-body"><div class="agenda-visit-title"><h3><a href="#pool/${a.pool_id}">${esc(a.pool_name)}</a></h3>${badge(a.status === "done" ? "Effectué" : a.status === "cancelled" ? "Annulé" : "À venir", a.status === "done" ? "teal" : "")}</div><p>${a.schedule_id ? `<button type="button" class="schedule-title" data-action="edit-schedule" data-id="${a.schedule_id}" data-pool="${a.pool_id}">${esc(a.title)}</button>` : esc(a.title)}</p><p class="small-note">${icon("map", 14)} ${esc(a.city || "Commune à compléter")}</p>${a.reason ? `<p>${esc(a.reason)}</p>` : ""}${a.status === "planned" ? `<div class="agenda-visit-actions">${button("Commencer", "start-appointment", `data-id="${a.id}"`, "primary small")}${button("Déplacer", "move-appointment", `data-id="${a.id}"`, "ghost small")}</div>` : ""}</div></article>`;
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
  main.innerHTML = `<section class="agenda-heading"><div><h1>Agenda</h1><p>Votre tournée, jour après jour.</p></div>${button(icon("plus", 18) + " Planifier", "new-appointment")}</section><nav class="agenda-shortcuts" aria-label="Organisation de la tournée"><a href="#preparation">${icon("box", 20)}<span><strong>À préparer</strong><small>Produits et matériel</small></span>${icon("arrow", 16)}</a><a href="#stats">${icon("chart", 20)}<span><strong>Tableau de bord</strong><small>Demandes et activité</small></span>${icon("arrow", 16)}</a></nav>${invitationSection(inv.items)}<section class="agenda-calendar" aria-label="Calendrier des passages"><div class="agenda-calendar-tools"><div class="calendar-period"><button class="calendar-arrow" data-action="plan-prev" aria-label="Période précédente">‹</button><h2>${periodTitle}</h2><button class="calendar-arrow" data-action="plan-next" aria-label="Période suivante">›</button></div><div class="calendar-controls">${button("Aujourd’hui", "plan-today", "", "ghost small")}<label class="calendar-date">${icon("calendar", 18)}<input type="date" id="plan-date" value="${planDate}" aria-label="Début de période"></label><select id="plan-range" aria-label="Période"><option value="0" ${planRange === 0 ? "selected" : ""}>Jour</option><option value="6" ${planRange === 6 ? "selected" : ""}>Semaine</option><option value="29" ${planRange === 29 ? "selected" : ""}>Mois</option></select></div></div>${planRange ? `<div class="calendar-grid ${planRange === 29 ? "month-grid" : "week-grid"}">${planRange === 29 ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => `<span class="calendar-weekday" aria-hidden="true">${d}</span>`).join("") : ""}${cells}</div>` : ""}<section class="agenda-day" aria-label="Passages du jour"><div class="agenda-day-heading"><h2>${fmt(planDate, { weekday: "long", month: "long" })}</h2><span>${selected.length} passage${selected.length > 1 ? "s" : ""}</span></div>${selected.length ? selected.map(appointmentRow).join("") : `<div class="agenda-free">${icon("calendar", 32)}<h3>Aucun passage ce jour</h3><p>Choisissez une autre date ou planifiez un entretien.</p></div>`}</section></section>`;
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
async function scheduleForm(d, edit = false) {
  let existing = null;
  if (edit) {
    const r = await api("/pools/" + d.pool + "/schedules");
    existing = r.items.find((s) => s.id === d.id && s.pro_id === state.user.id);
    if (!existing) throw new Error("Cette récurrence n’est plus disponible.");
  }
  const pick = edit
    ? `<p class="small-note">${esc((await api("/pools/" + d.pool)).name)}</p>`
    : await poolSelect(d.pool);
  if (!pick) return;
  const v = existing || {},
    seasons = v.seasons || [];
  const standard =
    seasons.length === 0 ||
    (seasons.length === 2 &&
      seasons.every(
        (s) => String(s.weekday || "") === String(v.weekday || ""),
      ) &&
      seasons.some((s) => s.start === "04-01" && s.end === "10-31") &&
      seasons.some((s) => s.start === "11-01" && s.end === "03-31"));
  const seasonFields = standard
    ? `<p class="small-note">Laissez les deux périodes vides pour garder le même rythme toute l’année.</p><div class="grid two form-two">${field("Avril à octobre : tous les X jours", "summer", seasons.find((s) => s.start === "04-01")?.interval_days || "", "number", 'min="1" max="365"')}${field("Novembre à mars : tous les X jours", "winter", seasons.find((s) => s.start === "11-01")?.interval_days || "", "number", 'min="1" max="365"')}</div>`
    : seasons
        .map(
          (s, i) =>
            `<fieldset class="schedule-season"><legend>Saison ${i + 1}</legend><div class="grid two form-two">${field("Début (MM-JJ)", "season_start_" + i, s.start, "text", 'required pattern="[0-9]{2}-[0-9]{2}"')}${field("Fin (MM-JJ)", "season_end_" + i, s.end, "text", 'required pattern="[0-9]{2}-[0-9]{2}"')}${field("Intervalle en jours", "season_interval_" + i, s.interval_days, "number", 'required min="1" max="365"')}${select("Jour de cette saison", "season_weekday_" + i, { "": "Selon l’intervalle", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" }, s.weekday || "")}</div></fieldset>`,
        )
        .join("");
  modal(
    edit ? "Modifier la récurrence" : "Créer une récurrence",
    `${pick}${field("Intitulé", "title", v.title || "Entretien régulier", "text", 'required maxlength="120"')}<div class="grid two form-two">${field("À partir du", "start_date", v.start_date || today(), "date", "required")}${field("Jusqu’au : facultatif", "end_date", v.end_date || "", "date")}</div><div class="grid two form-two">${field("Tous les X jours", "interval_days", v.interval_days || 7, "number", 'required min="1" max="365"')}${select("Jour souhaité", "weekday", { "": "Selon l’intervalle", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" }, v.weekday || "")}</div><div class="grid two form-two">${field("Heure", "time", v.time || "09:00", "time", "required")}${field("Durée prévue (minutes)", "duration", v.duration || 45, "number", 'required min="5" max="1440"')}</div><details ${seasons.length ? "open" : ""}><summary>Adapter le rythme aux saisons</summary>${seasonFields}</details>${edit ? '<p class="small-note">Les prochains passages automatiques seront mis à jour. Les passages déjà réalisés ou enregistrés individuellement sont conservés.</p>' : ""}`,
    async (b) => {
      if (standard && Boolean(b.summer) !== Boolean(b.winter))
        throw new Error("Renseignez les deux périodes saisonnières.");
      const nextSeasons = standard
        ? b.summer
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
          : []
        : seasons.map((s, i) => ({
            ...s,
            start: b["season_start_" + i],
            end: b["season_end_" + i],
            interval_days: Number(b["season_interval_" + i]),
            weekday: b["season_weekday_" + i] || null,
          }));
      await api(
        edit
          ? "/schedules/" + existing.id
          : "/pools/" + b.pool_id + "/schedules",
        edit ? "PUT" : "POST",
        { ...b, seasons: nextSeasons },
      );
      closeModal();
      toast(edit ? "Récurrence modifiée." : "Récurrence enregistrée.");
      refresh();
    },
    edit ? "Enregistrer les modifications" : "Créer le rythme",
  );
}
on("new-schedule", (d) => scheduleForm(d));
on("edit-schedule", (d) => scheduleForm(d, true));
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
