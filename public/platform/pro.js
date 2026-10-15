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
  helpKinds,
  confirmAction,
} from "./ui.js";
import { needRow, openRecordForm } from "./pools.js";
export const proPages = { dashboard, planning, help, request };
let planDate = today(),
  planRange = 0,
  feedOwn = false,
  feedCursor = null,
  currentRequest = null;
const heading = (eye, title, sub, actions = "") =>
  `<div class="page-heading"><div><div class="eyebrow">${eye}</div><h1>${title}</h1><p>${sub}</p></div>${actions}</div>`;
function appointmentRow(a) {
  return `<div class="row"><div class="time">${esc(a.time)}</div><div class="grow"><h3><a href="#pool/${a.pool_id}" style="text-decoration:none">${esc(a.pool_name)}</a></h3><p>${esc(a.title)} · ${esc(a.city || "Commune à compléter")} · ${a.duration} min</p>${a.reason ? `<p>${esc(a.reason)}</p>` : ""}</div>${badge(a.status === "done" ? "Effectué" : a.status === "cancelled" ? "Annulé" : "À venir", a.status === "done" ? "teal" : "")}<div class="actions">${a.status === "planned" ? button("Commencer", "start-appointment", `data-id="${a.id}"`, "primary small") + button("Déplacer", "move-appointment", `data-id="${a.id}"`, "ghost small") : ""}</div></div>`;
}
async function dashboard(main) {
  const day = today(),
    [r, prep, inv] = await Promise.all([
      api("/planning?from=" + day + "&to=" + day),
      api("/preparation?to=" + addDays(day, 7)),
      api("/invitations"),
    ]);
  state.appointments = r.items;
  state.needs = prep.items;
  const done = r.items.filter((a) => a.status === "done").length,
    pending = r.items.filter((a) => a.status === "planned");
  main.innerHTML =
    heading(
      fmt(day, { weekday: "long", year: "numeric" }).toUpperCase(),
      "Bonjour " + esc(state.user.name.split(" ")[0]) + ".",
      "Retrouvez vos entretiens et préparez votre tournée.",
      button(icon("plus", 16) + " Planifier un passage", "new-appointment"),
    ) +
    `${!state.user.city_code ? `<div class="note" style="margin-bottom:22px">${icon("map", 17)} &nbsp; Renseignez votre commune et vos prestations pour voir les demandes d’intervention proches de vous. <a href="#settings"><strong>Compléter mon profil</strong></a></div>` : ""}${inv.items.length ? `<section class="card" style="margin-bottom:23px"><h2>${inv.items.length} invitation(s) à rejoindre une piscine</h2>${inv.items.map((i) => `<div class="row"><div class="grow"><h3>${esc(i.pool_name)}</h3><p>${esc(i.sender_name)}</p></div>${button("Accepter", "invitation", `data-id="${i.id}" data-accept="1"`, "primary small")}${button("Refuser", "invitation", `data-id="${i.id}" data-accept="0"`, "ghost small")}</div>`).join("")}</section>` : ""}<div class="grid three" style="margin-bottom:26px"><div class="stat"><span>PASSAGES AUJOURD’HUI</span><strong>${r.items.filter((a) => a.status !== "cancelled").length}</strong><small>${done} effectué${done > 1 ? "s" : ""}</small></div><div class="stat"><span>ENCORE À VISITER</span><strong>${pending.length}</strong><small>${pending.reduce((n, a) => n + a.duration, 0)} minutes prévues sur place</small></div><div class="stat"><span>À PRÉPARER CETTE SEMAINE</span><strong>${prep.items.filter((n) => n.responsible === "pro" && n.status === "needed").length}</strong><small>produits ou matériels à emporter</small></div></div><div class="classic-shortcuts"><a href="#stats" class="shortcut"><span class="shortcut-icon violet">${icon("chart")}</span><span><strong>Statistiques</strong><small>Passages et temps d’intervention</small></span></a><a href="#help" class="shortcut"><span class="shortcut-icon green">${icon("users")}</span><span><strong>Entraide</strong><small>Conseils et missions à transmettre</small></span></a><button data-action="calculator" class="shortcut"><span class="shortcut-icon sky">${icon("settings")}</span><span><strong>Mes outils</strong><small>Calculer le volume d’un bassin</small></span></button><button data-action="assistant" class="shortcut"><span class="shortcut-icon purple">${icon("help")}</span><span><strong>Assistant IA</strong><small>Poser une question métier</small></span></button></div><div class="split"><section><div class="section-heading"><h2>Au programme aujourd’hui</h2><a href="#planning" class="text-btn">Voir l’agenda →</a></div><div class="card">${r.items.length ? r.items.map(appointmentRow).join("") : empty("Une journée encore libre", "Planifiez un passage ou profitez-en pour préparer vos prochaines visites.", button("Voir mes piscines", "home-pools", "", "secondary"))}</div><div class="section-heading"><h2>À préparer avant de partir</h2></div><div class="card">${
      prep.items.filter((n) => n.responsible === "pro").length
        ? prep.items
            .filter((n) => n.responsible === "pro")
            .map(needRow)
            .join("")
        : empty(
            "La préparation est à jour",
            "Les besoins saisis au fil de vos passages se regrouperont ici.",
          )
    }</div></section><aside class="stack"><section class="welcome" style="display:block;margin-top:27px"><h2>Besoin d’un coup de main ?</h2><p>Un avis, un renfort ou une mission à transmettre : échangez avec d’autres piscinistes.</p><a href="#help" class="btn secondary" style="margin-top:20px">Ouvrir l’entraide ${icon("arrow", 15)}</a></section><section class="card"><h3>Achats côté clients</h3><p class="small-note">Les demandes d’achat restent visibles pour que rien ne manque au prochain passage.</p>${
      prep.items
        .filter((n) => n.responsible === "client")
        .slice(0, 6)
        .map(
          (n) =>
            `<div class="row"><div class="grow"><h3>${esc(n.title)}</h3><p>${esc(n.pool_name)} · ${n.status === "ready" ? "Achat prêt" : "À acheter"}</p></div></div>`,
        )
        .join("") || '<p class="small-note">Aucun achat client en attente.</p>'
    }</section></aside></div>`;
}
on("home-pools", () => go("clients"));
async function planning(main) {
  const to = addDays(planDate, planRange),
    r = await api("/planning?from=" + planDate + "&to=" + to);
  state.appointments = r.items;
  main.innerHTML =
    heading(
      "VOTRE ORGANISATION",
      "Agenda",
      "Récurrences saisonnières, visites ponctuelles et changements de dernière minute.",
      button("Planifier", "new-appointment"),
    ) +
    `<div class="card"><div class="inline between wrap toolbar"><div class="inline"><button class="btn secondary small" data-action="plan-prev" aria-label="Période précédente">←</button><input type="date" id="plan-date" value="${planDate}" class="search-input" aria-label="Début de période"><button class="btn secondary small" data-action="plan-next" aria-label="Période suivante">→</button></div><div class="inline">${button("Aujourd’hui", "plan-today", "", "ghost small")}<select id="plan-range" class="search-input" aria-label="Période"><option value="0" ${planRange === 0 ? "selected" : ""}>Jour</option><option value="6" ${planRange === 6 ? "selected" : ""}>Semaine</option><option value="29" ${planRange === 29 ? "selected" : ""}>Mois</option></select></div></div><div style="margin-top:20px">${
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
    toast("Un client doit vous inviter à suivre sa piscine.", "error");
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
    `${pick}${field("Intitulé", "title", "Entretien régulier", "text", 'required maxlength="120"')}<div class="grid two form-two">${field("À partir du", "start_date", today(), "date", "required")}${field("Jusqu’au — facultatif", "end_date", "", "date")}</div><div class="grid two form-two">${field("Tous les X jours", "interval_days", 7, "number", 'required min="1" max="365"')}${select("Jour souhaité", "weekday", { "": "Selon l’intervalle", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" }, "")}</div><div class="grid two form-two">${field("Heure", "time", "09:00", "time", "required")}${field("Durée (minutes)", "duration", 45, "number", 'required min="5" max="1440"')}</div><details><summary>Adapter le rythme aux saisons</summary><p class="small-note">Laissez vide pour conserver le même rythme toute l’année. Renseignez les deux périodes pour activer la saisonnalité.</p><div class="grid two form-two">${field("Avril → octobre : tous les X jours", "summer", "", "number", 'min="1" max="365"')}${field("Novembre → mars : tous les X jours", "winter", "", "number", 'min="1" max="365"')}</div></details>`,
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
function helpCard(h) {
  return `<article class="card help-card"><div class="inline between">${badge(helpKinds[h.kind], h.kind === "advice" ? "teal" : "")}${h.urgent ? badge("Besoin rapide", "amber") : ""}</div><h3>${esc(h.title)}</h3><p>${esc(h.body)}</p><div class="inline wrap"><span class="small-note">${icon("map", 12)} ${esc(h.city)}${h.scope === "national" ? " · Avis à distance" : ""}</span>${h.status !== "open" ? badge({ assigned: "Mission en cours", resolved: "Résolu", closed: "Clôturé" }[h.status] || h.status) : ""}</div><div class="foot"><span>${esc(h.author_label)}<br>${fmt(h.created_at)}</span>${button("Consulter", "open-request", `data-id="${h.id}"`, "secondary small")}</div></article>`;
}
async function help(main) {
  const pro = state.mode === "pro";
  const mine = !pro || feedOwn;
  const r = await api("/help?mine=" + (mine ? "1" : "0"));
  state.requests = r.items;
  feedCursor = r.next;
  main.innerHTML =
    heading(
      pro ? "ENTRE PROFESSIONNELS" : "VOS DEMANDES",
      pro
        ? "Entraide entre piscinistes"
        : "Un problème ? Vous êtes accompagné.",
      pro
        ? "Des avis utiles, des renforts et des missions près de vous."
        : "Vos demandes sont visibles par les piscinistes. Vous gardez la main sur les accès.",
      button(icon("plus", 16) + " Nouvelle demande", "new-help"),
    ) +
    `${pro ? `<div class="tabs"><button data-action="feed-tab" data-mine="0" class="${mine ? "" : "active"}">Autour de moi & avis à distance</button><button data-action="feed-tab" data-mine="1" class="${mine ? "active" : ""}">Mes demandes</button></div>${!state.user.city_code && !mine ? '<div class="note amber" style="margin-bottom:20px">Choisissez votre commune et votre rayon dans <a href="#settings">votre profil</a> pour voir les interventions proches. Les avis nationaux restent accessibles.</div>' : ""}` : ""}<div class="note" style="margin-bottom:23px">${icon("lock", 15)} &nbsp; Les demandes affichent une commune, jamais l’adresse du bassin. Proposer son aide ne donne aucun accès au dossier.</div><div class="grid two" id="feed-list">${r.items.map(helpCard).join("")}</div>${!r.items.length ? empty(mine ? "Aucune demande pour le moment" : "Les premiers échanges commencent avec vous", mine ? "Votre suivi et vos échanges resteront accessibles ici." : "Partagez une question ou une mission avec les autres piscinistes.", button("Publier une demande", "new-help", "", "secondary")) : ""}<div id="feed-more" style="margin-top:20px">${r.next ? button("Voir plus de demandes", "more-help", "", "secondary") : ""}</div>`;
}
on("feed-tab", (d) => {
  feedOwn = d.mine === "1";
  refresh();
});
on("open-request", (d) => go("request/" + d.id));
on("more-help", async () => {
  if (!feedCursor) return;
  const r = await api(
    "/help?mine=" +
      (!state.user.is_pro || feedOwn ? "1" : "0") +
      "&cursor=" +
      feedCursor,
  );
  feedCursor = r.next;
  $("#feed-list").insertAdjacentHTML(
    "beforeend",
    r.items.map(helpCard).join(""),
  );
  $("#feed-more").innerHTML = r.next
    ? button("Voir plus de demandes", "more-help", "", "secondary")
    : "";
});
on("new-help", async (d) => {
  const r = await api("/pools?mode=" + state.mode + "&limit=50");
  const options = Object.fromEntries(r.items.map((p) => [p.id, p.name]));
  if (state.mode === "pro") options[""] = "Avis général sans dossier associé";
  if (!r.items.length && state.mode !== "pro") {
    toast("Créez votre piscine avant de demander de l’aide.", "error");
    go("pools");
    return;
  }
  const preset = d.pool || r.items[0]?.id || "";
  const p = preset ? await api("/pools/" + preset) : null;
  modal(
    "Une demande claire, une aide utile",
    `${select("Type de demande", "kind", helpKinds, "advice")}${select("Dossier privé concerné", "pool_id", options, preset)}<p class="small-note">Le dossier et son adresse ne seront pas publiés. Ils serviront uniquement à autoriser une éventuelle intervention.</p>${field("En quelques mots", "title", "", "text", 'required maxlength="120" placeholder="Ex. bruit inhabituel au niveau de la pompe"')}${area("Décrivez le problème et ce qui a déjà été vérifié", "body", "", 'required maxlength="3000"')}${select("Compétence recherchée", "specialty", specs, "maintenance")}${cityField(p?.city_code || state.user.city_code, p?.city || state.user.city)}${select("Portée de l’avis technique", "scope", { local: "Dans mon secteur", national: "Avis à distance, partout en France" }, "local")}<p class="small-note">Les demandes d’intervention restent locales, quelle que soit cette option.</p><label class="check"><input type="checkbox" name="urgent"> Une réponse rapide serait utile</label><div class="note amber">Ne saisissez ni adresse, ni nom de client, ni téléphone, ni code d’accès. La description sera visible aux professionnels. Les échanges publiés par un pisciniste restent invisibles aux clients.</div>`,
    async (b) => {
      const n = await api("/help", "POST", {
        ...b,
        as_pro: state.mode === "pro",
        urgent: b.urgent === "on",
      });
      closeModal();
      go("request/" + n.id);
      toast("Demande publiée.");
    },
    "Publier ma demande",
  );
});
async function request(main, id) {
  const r = await api("/help/" + id);
  currentRequest = r;
  const status = {
    open: "Discussion ouverte",
    assigned: "Mission en cours",
    resolved: "Résolu",
    closed: "Clôturé",
  };
  main.innerHTML =
    heading(
      "ENTRAIDE / " + esc(helpKinds[r.kind]).toUpperCase(),
      esc(r.title),
      `${esc(r.city)} · ${esc(r.author_label)} · ${fmt(r.created_at)}`,
      badge(status[r.status], r.status === "resolved" ? "teal" : ""),
    ) +
    `<div class="split"><section class="stack"><article class="card"><p class="prose">${esc(r.body)}</p><div class="inline wrap">${badge(specs[r.specialty])}${badge(r.scope === "national" ? "Avis à distance" : "Secteur local")}${r.urgent ? badge("Besoin rapide", "amber") : ""}</div></article><section class="card"><h2>Les échanges</h2>${r.replies.length ? r.replies.map((x) => `<div class="row"><div class="grow"><h3>${esc(x.author_label)} ${x.mine ? "· vous" : ""}</h3><p class="prose" style="color:var(--ink)">${esc(x.body)}</p><small>${fmt(x.created_at, { hour: "2-digit", minute: "2-digit" })}</small></div></div>`).join("") : '<p class="small-note">La première réponse fera avancer la situation.</p>'}${r.status === "open" ? `<form id="reply-form" style="margin-top:22px">${area("Votre réponse", "body", "", 'required maxlength="2000" placeholder="Partagez un avis utile, sans coordonnées privées."')}<p class="form-error"></p><button class="btn primary">Publier ma réponse</button></form>` : ""}</section></section><aside class="stack"><section class="card"><h2>${r.mine ? "Les propositions" : "Prêter main-forte"}</h2><p class="small-note">Une proposition doit être choisie, puis autorisée par le responsable du bassin. L’adresse reste privée jusque-là.</p>${r.offers.map((o) => `<div class="row"><div class="grow"><h3>${esc(o.company || o.name)}</h3><p class="prose">${esc(o.message)}</p><p>Jusqu’au ${fmt(o.until_date)} · ${esc({ pending: "En attente", awaiting_owner: "Accord client attendu", accepted: "Autorisée", declined: "Non retenue", finished: "Terminée", cancelled: "Annulée" }[o.status])}</p>${r.mine && o.status === "pending" ? button("Retenir cette proposition", "select-offer", `data-id="${o.id}"`, "primary small") : ""}${o.mine && o.status === "accepted" ? button("Terminer ma mission", "finish-offer", `data-id="${o.id}"`, "secondary small") : ""}</div></div>`).join("")}${!r.mine && r.kind !== "advice" && r.status === "open" && !r.offers.some((o) => o.mine) ? button("Proposer une intervention", "offer", "", "primary full") : ""}${r.mine && r.status === "open" ? `<div class="divider"></div>${button("Marquer comme résolu", "resolve-help", "", "secondary full")}` : ""}</section><section class="card"><h3>${icon("lock", 16)} Un espace de confiance</h3><p class="small-note">Gardez les coordonnées personnelles dans le dossier privé. Les prestations sont déclarées par chaque professionnel.</p>${!r.mine ? button("Signaler la demande", "flag-help", "", "ghost small") + button("Bloquer son auteur", "block-help", "", "ghost small") : ""}</section></aside></div>`;
  const form = $("#reply-form");
  if (form)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button", form);
      btn.disabled = true;
      try {
        await api(
          "/help/" + r.id + "/replies",
          "POST",
          Object.fromEntries(new FormData(form)),
        );
        refresh();
      } catch (err) {
        $(".form-error", form).textContent = err.message;
        btn.disabled = false;
      }
    });
}
on("offer", () =>
  modal(
    "Proposer votre intervention",
    `${area("Votre proposition", "message", "", 'required maxlength="1000" placeholder="Expliquez ce que vous pouvez prendre en charge et vos disponibilités."')}${field("Fin de mission ou de disponibilité", "until_date", addDays(today(), 14), "date", `required min="${today()}" max="${addDays(today(), 90)}"`)}<p class="small-note">Vous n’accédez au dossier qu’après autorisation du responsable. Les conditions de la prestation restent à convenir ensemble.</p>`,
    async (b) => {
      await api("/help/" + currentRequest.id + "/offers", "POST", b);
      closeModal();
      refresh();
      toast("Proposition transmise.");
    },
    "Envoyer ma proposition",
  ),
);
on("select-offer", (d) =>
  confirmAction(
    "Retenir cette proposition",
    "Le responsable du bassin devra confirmer l’accès. Aucune adresse ne sera transmise avant son accord.",
    () => api("/offers/" + d.id + "/select", "POST", {}),
    "Demander l’autorisation",
  ),
);
on("resolve-help", () =>
  confirmAction(
    "Votre problème est résolu ?",
    "La discussion sera clôturée et les propositions en attente annulées.",
    () =>
      api("/help/" + currentRequest.id + "/status", "POST", {
        status: "resolved",
      }),
    "Marquer résolu",
  ),
);
on("flag-help", () =>
  modal(
    "Signaler cette demande",
    area(
      "Pourquoi souhaitez-vous la signaler ?",
      "reason",
      "",
      'required maxlength="1000"',
    ),
    async (b) => {
      await api("/help/" + currentRequest.id + "/flag", "POST", b);
      closeModal();
      toast("Signalement enregistré.");
    },
    "Envoyer le signalement",
  ),
);
on("block-help", () =>
  confirmAction(
    "Bloquer cet auteur",
    "Ses demandes ne seront plus visibles dans votre fil et il ne pourra plus consulter les vôtres.",
    async () => {
      await api("/help/" + currentRequest.id + "/block", "POST", {});
      go("help");
    },
    "Bloquer",
  ),
);
