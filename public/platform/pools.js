import {
  addressField,
  wireAddress,
  readAddress,
  mapAt,
  itinerary,
} from "./maps.js";
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
  kinds,
  treatments,
  metrics,
  today,
  addDays,
  confirmAction,
} from "./ui.js";
export const poolPages = { pools, pool };
let activeTab = "journal",
  poolCursor = null,
  morePoolCursor = null,
  trendData = [];
const filterTypes = {
  unknown: "À préciser",
  sand: "Sable",
  glass: "Verre",
  cartridge: "Cartouche",
  other: "Autre",
};
const managerKinds = {
  owner: "Copropriétaire",
  principal: "Pisciniste principal",
};
function poolCard(p) {
  return `<a class="pool-overview" href="#pool/${p.id}"><span class="pool-overview-icon">${icon("pool", 30)}</span><div><h2>${esc(p.name)}</h2><p>${esc(p.city || "Adresse à compléter")}</p><small>${p.last_reading ? "Dernier suivi le " + fmt(p.last_reading) : "Aucun suivi enregistré"}</small></div><span class="pool-open">${icon("arrow")}</span></a>`;
}
export async function pools(main) {
  const pro = state.mode === "pro";
  const [r, inv, connections] = await Promise.all([
    api("/pools?mode=" + state.mode),
    api("/invitations"),
    api("/connections"),
  ]);
  morePoolCursor = r.next;
  main.innerHTML = `<div class="page-heading"><div><h1>${pro ? "Mes piscines suivies" : "Mes piscines"}</h1><p>${pro ? "Les bassins de votre tournée." : "Retrouvez vos analyses et les comptes rendus de vos piscines."}</p></div>${r.items.length ? button(icon("plus", 17) + (pro ? " Ajouter un client" : " Ajouter une piscine"), pro ? "invite-client" : "new-pool") : ""}</div>${invitationSection(inv.items)}${connectionSection(connections.incoming)}${r.items.length ? `<div class="directory-toolbar"><input id="pool-search" class="search-input" placeholder="Rechercher une piscine ou une ville" aria-label="Rechercher une piscine">${button("Rechercher", "search-pools", "", "secondary")}</div><div id="pool-list" class="pool-overviews">${r.items.map(poolCard).join("")}</div>` : `<section class="first-pool"><div class="first-pool-symbol">${icon("pool", 66)}</div><h2>${pro ? "Ajoutez votre premier client" : "Ajoutez votre première piscine"}</h2><p>${pro ? "Créez sa piscine ou rejoignez le dossier qu’il possède déjà." : "Ajoutez votre piscine pour enregistrer vos analyses. Vous pourrez aussi inviter un pisciniste."}</p>${button(icon("plus", 18) + (pro ? " Ajouter un client" : " Ajouter une piscine"), pro ? "invite-client" : "new-pool")}</section>`}<div id="pool-more">${r.next ? button("Voir davantage de piscines", "more-pools", "", "secondary") : ""}</div>`;
}
on("search-pools", async () => {
  const r = await api(
    "/pools?mode=" +
      state.mode +
      "&q=" +
      encodeURIComponent($("#pool-search").value),
  );
  morePoolCursor = r.next;
  $("#pool-list").innerHTML =
    r.items.map(poolCard).join("") ||
    empty("Aucune piscine trouvée", "Essayez un autre nom.");
  $("#pool-more").innerHTML = r.next
    ? button("Voir davantage de piscines", "more-pools", "", "secondary")
    : "";
});
on("more-pools", async () => {
  if (!morePoolCursor) return;
  const r = await api(
    "/pools?mode=" +
      state.mode +
      "&cursor=" +
      morePoolCursor +
      "&q=" +
      encodeURIComponent($("#pool-search")?.value || ""),
  );
  morePoolCursor = r.next;
  $("#pool-list").insertAdjacentHTML(
    "beforeend",
    r.items.map(poolCard).join(""),
  );
  $("#pool-more").innerHTML = r.next
    ? button("Voir davantage de piscines", "more-pools", "", "secondary")
    : "";
});
on("open-pool", (d) => go("pool/" + d.id));
export function invitationSection(items) {
  return items.length
    ? `<section class="card" style="margin-bottom:20px"><h2>Invitations reçues</h2>${items.map((i) => `<div class="row"><div class="grow"><h3>${esc(i.pool_name)}</h3><p>${esc(i.sender_name)} · ${i.claim ? "Piscine préparée pour vous" : i.kind === "principal" ? "Invitation comme pisciniste principal" : "Invitation comme copropriétaire"}</p></div><div class="actions">${button("Accepter", "invitation", `data-id="${i.id}" data-accept="1" data-claim="${i.claim ? 1 : 0}"`, "primary small")}${button("Refuser", "invitation", `data-id="${i.id}" data-accept="0"`, "ghost small")}</div></div>`).join("")}</section>`
    : "";
}
export function connectionSection(items) {
  return items.length
    ? `<section class="card" style="margin-bottom:20px"><h2>Votre pisciniste souhaite vous rejoindre</h2>${items.map((r) => `<div class="row"><div class="grow"><h3>${esc(r.company || r.name)}</h3><p>Choisissez la piscine à lui confier.</p></div><div class="actions">${button("Choisir ma piscine", "accept-connection", `data-id="${r.id}"`, "primary small")}${button("Refuser", "decline-connection", `data-id="${r.id}"`, "ghost small")}</div></div>`).join("")}</section>`
    : "";
}
async function ownedPools() {
  const items = [];
  let next = "";
  do {
    const r = await api(
      "/pools?mode=client&limit=50" +
        (next ? "&cursor=" + encodeURIComponent(next) : ""),
    );
    items.push(...r.items);
    next = r.next;
  } while (next);
  return items.filter((p) => p.manager);
}
on("invite-client", () =>
  modal(
    "Ajouter un client",
    `<p>Un seul dossier par piscine, partagé avec son client.</p><div class="stack">${button("Rejoindre sa piscine existante", "request-client", "", "primary")}${button("Créer une piscine pour un client", "new-pool", 'data-mode="pro"', "secondary")}</div><p class="small-note">Le client peut aussi vous inviter avec votre identifiant : <strong>${esc(state.user.username)}</strong>.</p>`,
    null,
  ),
);
on("request-client", () =>
  modal(
    "Rejoindre la piscine d’un client",
    `${field("Identifiant du client", "username", "", "text", 'required maxlength="40" autocapitalize="none"')}<p class="small-note">Le client choisira sa piscine et acceptera votre accès.</p>`,
    async (b) => {
      await api("/connections", "POST", b);
      closeModal();
      toast("Demande envoyée au client.");
      refresh();
    },
    "Envoyer la demande",
  ),
);
on("cancel-connection", async (d) => {
  await api("/connections/" + d.id, "DELETE", {});
  refresh();
});
on("decline-connection", async (d) => {
  await api("/connections/" + d.id + "/respond", "POST", { accept: false });
  toast("Demande refusée.");
  refresh();
});
on("accept-connection", async (d) => {
  const items = (await ownedPools()).filter((p) => !p.principal_id);
  if (!items.length) {
    modal(
      "Choisir une piscine",
      `<p>Créez votre piscine pour accepter la demande. Si elle a déjà un pisciniste, retirez son accès depuis « Accès ».</p>${button("Créer ma piscine", "new-pool", 'data-mode="client"', "primary")}`,
      null,
    );
    return;
  }
  modal(
    "Confier ma piscine",
    `${select("Piscine à confier", "pool_id", Object.fromEntries(items.map((p) => [p.id, p.name])))}<p class="small-note">Ce pisciniste sera le seul professionnel à consulter et suivre cette piscine.</p>`,
    async (b) => {
      const r = await api("/connections/" + d.id + "/respond", "POST", {
        accept: true,
        pool_id: b.pool_id,
      });
      closeModal();
      toast("Votre pisciniste a rejoint la piscine.");
      go("pool/" + r.pool_id);
    },
    "Accepter le pisciniste",
  );
});
on("invitation", async (d) => {
  const respond = async (extra) => {
    const r = await api("/invitations/" + d.id + "/respond", "POST", {
      accept: d.accept === "1",
      ...extra,
    });
    closeModal();
    toast(d.accept === "1" ? "Invitation acceptée." : "Invitation refusée.");
    if (r.pool_id) go("pool/" + r.pool_id);
    else refresh();
  };
  if (d.accept === "1" && d.claim === "1") {
    const owned = await ownedPools();
    modal(
      "Retrouver ma piscine",
      `${select("Quel dossier utiliser ?", "existing_pool_id", { "": "La piscine préparée par mon pisciniste", ...Object.fromEntries(owned.filter((p) => !p.principal_id).map((p) => [p.id, "Mon dossier existant : " + p.name])) })}<p class="small-note">Si ce bassin a déjà un dossier, choisissez-le pour conserver son historique. Sinon, récupérez la piscine préparée pour vous.</p>`,
      respond,
      "Associer ma piscine",
    );
  } else await respond({});
});
on("new-pool", (d) => {
  const mode = d.mode || state.mode,
    pro = mode === "pro";
  modal(
    pro ? "Créer la piscine d’un client" : "Créer ma piscine",
    `<p class="form-intro">Le nom et l’adresse suffisent pour commencer.</p>${field("Nom de la piscine", "name", "", "text", 'required maxlength="80" placeholder="La piscine de la maison"')}${select("Type de bassin", "kind", kinds, "private")}${addressField()}${pro ? field("Identifiant du client (facultatif)", "client_username", "", "text", 'maxlength="40" autocapitalize="none"') : ""}<p class="small-note">Volume, traitement et équipements se complètent ensuite dans la fiche piscine.</p>`,
    async (b) => {
      const r = await api("/pools", "POST", {
        name: b.name,
        kind: b.kind,
        mode,
        client_username: b.client_username,
        location: readAddress(b),
      });
      closeModal();
      go("pool/" + r.id);
      toast("Votre piscine est créée.");
    },
    pro ? "Créer la piscine" : "Créer ma piscine",
  );
  wireAddress();
});
export async function pool(main, id, tab = "journal") {
  const [p, r] = await Promise.all([
    api("/pools/" + id),
    api("/pools/" + id + "/records"),
  ]);
  const isPro = p.membership === "principal";
  const n = isPro ? await api("/pools/" + id + "/needs") : { items: [] };
  const tabs = isPro
    ? [
        ["journal", "Suivi"],
        ["charts", "Évolution"],
        ["needs", "À prévoir"],
        ["planning", "Planning"],
        ["info", "Le bassin"],
        ["access", "Accès"],
      ]
    : [
        ["journal", "Suivi"],
        ["charts", "Évolution"],
        ["info", "Le bassin"],
        ["access", "Accès"],
      ];
  if (!tabs.some(([key]) => key === tab)) {
    history.replaceState(null, "", "#pool/" + id);
    tab = "journal";
  }
  state.pool = p;
  state.records = r.items;
  state.needs = n.items;
  poolCursor = r.next;
  activeTab = tab;
  const principal = p.members.find((m) => m.kind === "principal"),
    pending = p.invitations.some((i) => i.kind === "principal");
  const proAction =
    p.manager && !principal
      ? pending
        ? `<a class="btn secondary" href="#pool/${id}/access">Invitation en attente</a>`
        : button(
            "Ajouter un pisciniste",
            "invite-member",
            'data-kind="principal"',
            "secondary",
          )
      : "";
  main.innerHTML = `<a class="back-link" href="#${isPro ? "clients" : "home"}">${icon("arrow", 14)} ${isPro ? "Mes clients" : "Mes piscines"}</a><section class="pool-heading"><div><h1>${esc(p.name)}</h1><p>${icon("map", 16)} ${esc(p.address || p.city || "Adresse à compléter")}</p></div><div class="pool-heading-actions">${isPro ? button(icon("check", 18) + " Commencer l’entretien", "new-visit", `data-pool="${id}"`) + button("Modifier la piscine", "edit-pool", "", "secondary") : button(icon("plus", 18) + " Ajouter une analyse", "new-analysis", `data-pool="${id}"`) + proAction}</div></section>${p.claimable ? `<div class="claim-banner">Client à associer. ${p.invitations.length ? "Invitation en attente d’acceptation." : button("Inviter le client", "invite-member", "", "secondary small")}</div>` : ""}<div class="tabs pool-tabs" role="navigation" aria-label="Sections de la piscine">${tabs.map(([key, label]) => `<button class="${tab === key ? "active" : ""}" data-action="pool-tab" data-tab="${key}">${label}${key === "needs" && n.items.some((n) => n.status === "needed") ? " (" + n.items.filter((n) => n.status === "needed").length + ")" : ""}</button>`).join("")}</div><div id="pool-content"></div>`;
  await renderTab();
}

on("pool-tab", (d) => go("pool/" + state.pool.id + "/" + d.tab));
function taskSummary(list) {
  const done = list.filter((t) => t.done).length,
    skipped = list.filter((t) => t.skipped).length;
  return `${done} tâche${done > 1 ? "s" : ""} réalisée${done > 1 ? "s" : ""} sur ${list.length}${skipped ? " • " + skipped + " non réalisée" + (skipped > 1 ? "s" : "") : ""}`;
}
function taskReport(list) {
  return `<ul class="task-report">${list.map((c) => `<li class="${c.done ? "completed" : c.skipped ? "skipped" : "pending"}"><span class="task-status-icon">${c.done ? icon("check", 15) : icon("close", 15)}</span><div><span>${esc(c.label)}</span>${!c.done ? `<small>${c.skipped ? "Non réalisé : " + esc(c.reason) : "Non renseigné"}</small>` : ""}</div></li>`).join("")}</ul>`;
}
function recordCard(r) {
  const values = Object.entries(r.readings).filter(([k]) => metrics[k]);
  return `<article class="record"><div class="record-date">${icon(r.kind === "visit" ? "check" : "water", 18)}<time>${fmt(r.measured_at, { year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>${badge(r.published_at ? (r.superseded_by ? "Version corrigée" : r.correction_of ? "Correction" : r.kind === "visit" ? "Partagé" : "Enregistrée") : "Brouillon", r.published_at ? "teal" : "amber")}</div><h3>${r.kind === "visit" ? "Entretien de la piscine" : "Analyse de l’eau"}</h3><p class="record-author">${esc(r.author_name)}${r.duration ? " • " + r.duration + " min" : ""}</p>${r.checklist.length ? `<p class="task-total">${esc(taskSummary(r.checklist))}</p><details class="record-tasks"><summary>Voir les tâches du passage</summary>${taskReport(r.checklist)}</details>` : ""}${values.length ? `<div class="values">${values.map(([k, v]) => `<span>${metrics[k].label} <strong>${esc(v)}</strong> ${metrics[k].unit}</span>`).join("")}</div>` : ""}${r.notes ? `<p class="body">${esc(r.notes)}</p>` : ""}${r.products ? `<p class="small-note"><strong>Produits ajoutés :</strong> ${esc(r.products)}</p>` : ""}<div class="inline wrap">${button("Voir le détail", "record-detail", `data-id="${r.id}"`, "secondary small")}${r.author_id === state.user.id && !r.published_at ? button("Reprendre le brouillon", "edit-record", `data-id="${r.id}"`, "secondary small") : ""}${r.author_id === state.user.id && r.published_at && !r.superseded_by ? button("Ajouter une correction", "correct-record", `data-id="${r.id}"`, "ghost small") : ""}</div></article>`;
}
async function renderTab() {
  const el = $("#pool-content"),
    p = state.pool;
  if (activeTab === "journal") {
    const published = state.records.filter(
        (r) => r.published_at && !r.superseded_by,
      ),
      latest = published[0],
      pro = p.members.find((m) => m.kind === "principal");
    const readings = Object.keys(metrics)
      .map((k) => {
        const r = published.find((r) => r.readings[k] != null);
        return `<div class="water-reading"><span>${metrics[k].label}</span><strong class="${r ? "" : "unmeasured"}">${r ? esc(r.readings[k]) : "Non mesuré"} <small>${r ? metrics[k].unit : ""}</small></strong><small>${r ? "Mesuré le " + fmt(r.measured_at) : "Ajoutez votre première mesure"}</small></div>`;
      })
      .join("");
    const professional = p.membership === "principal";
    let upcoming = [];
    if (!professional && pro) {
      const agenda = await api(
        "/planning?pool_id=" +
          p.id +
          "&from=" +
          today() +
          "&to=" +
          addDays(today(), 30),
      );
      upcoming = agenda.items.filter((a) => a.status === "planned").slice(0, 3);
    }
    const accompaniment = professional
      ? `<section class="aside-section"><h2>Votre entretien</h2><p>Retrouvez les gestes à effectuer pour ce bassin et partagez votre compte rendu.</p>${button("Commencer l’entretien", "new-visit", `data-pool="${p.id}"`, "primary full")}</section>`
      : `<section class="aside-section client-accompaniment"><h2>${pro ? "Votre pisciniste" : "Votre suivi personnel"}</h2>${pro ? `<div class="person-line"><span class="avatar">${esc(pro.name.slice(0, 2).toUpperCase())}</span><div><strong>${esc(pro.company || pro.name)}</strong><small>Pisciniste principal</small></div></div><p>Ses comptes rendus apparaissent ici après chaque entretien partagé.</p>` : `<p>Enregistrez vos analyses et retrouvez l’évolution de votre eau dans ce suivi.</p>`}</section>`;
    const nextVisits = upcoming.length
      ? `<section class="aside-section"><h2>Prochains passages</h2>${upcoming.map((a) => `<div class="client-appointment"><strong>${fmt(a.date, { day: "numeric", month: "long" })} à ${esc(a.time)}</strong><span>${esc(a.title)}</span></div>`).join("")}</section>`
      : "";
    const facts = `<section class="aside-section"><h2>La piscine</h2><dl class="pool-facts"><div><dt>Volume</dt><dd>${p.volume ? esc(p.volume) + " m³" : "À renseigner"}</dd></div><div><dt>Traitement</dt><dd>${p.treatment === "unknown" ? "À renseigner" : esc(treatments[p.treatment])}</dd></div><div><dt>Filtre</dt><dd>${filterTypes[p.filter_type] || "À préciser"}</dd></div></dl><a class="text-btn" href="#pool/${p.id}/info">Voir le bassin</a></section>`;
    const location = professional
      ? `<section class="aside-section"><h2>Localisation</h2>${p.latitude != null ? '<div id="dossier-map" class="dossier-map" aria-label="Position de la piscine"></div><p class="small-note" data-map-status role="status"></p>' : ""}<p>${esc(p.address || p.city || "Adresse à compléter")}${p.location_precision === "municipality" ? "<small>Position approximative de la commune</small>" : ""}</p>${p.address || p.city ? `<a class="text-btn" target="_blank" rel="noopener" href="${esc(itinerary(p))}">Ouvrir l’itinéraire</a>` : ""}</section>`
      : "";
    el.innerHTML = `<div class="pool-layout"><section class="pool-feed"><div class="water-panel"><div class="water-panel-title"><h2>Les dernières mesures</h2>${professional ? button("Ajouter une analyse", "new-analysis", `data-pool="${p.id}"`, "ghost small") : `<a class="reading-history" href="#pool/${p.id}/charts">Voir l’évolution</a>`}</div><div class="water-readings">${readings}</div></div><div class="section-heading"><h2>${professional ? "Historique des passages" : "Historique du suivi"}</h2><span class="small-note">${latest ? "Dernier suivi le " + fmt(latest.measured_at) : "Votre suivi commence ici"}</span></div>${state.records.length ? state.records.map(recordCard).join("") : empty("Aucun suivi pour le moment", professional ? "Commencez un entretien pour renseigner les tâches et les analyses." : pro ? "Les comptes rendus de votre pisciniste apparaîtront ici. Vous pouvez aussi ajouter vos propres analyses." : "Ajoutez une analyse pour commencer le suivi de votre eau.")}<div id="record-more">${poolCursor ? button("Voir les suivis précédents", "more-records", "", "secondary") : ""}</div></section><aside class="pool-aside">${accompaniment}${nextVisits}${facts}${p.client_advice ? `<section class="aside-section"><h2>${pro ? "Conseils de votre pisciniste" : "Conseils pour la piscine"}</h2><p>${esc(p.client_advice)}</p></section>` : ""}${location}</aside></div>`;
    if (professional && p.latitude != null)
      await mapAt($("#dossier-map"), p.latitude, p.longitude, {
        approximate: p.location_precision !== "address",
      });
  } else if (activeTab === "charts") {
    el.innerHTML = `<div class="card"><div class="inline between wrap"><div><h2>L’évolution de votre eau</h2><p class="small-note">Moyennes quotidiennes des analyses enregistrées. Les corrections remplacent les anciennes valeurs dans les courbes.</p></div><select id="chart-days" class="search-input" style="width:auto" aria-label="Période"><option value="30">30 jours</option><option value="180" selected>6 mois</option><option value="365">1 an</option><option value="1825">5 ans</option></select></div><div id="chart-content"></div></div>`;
    $("#chart-days").addEventListener("change", loadCharts);
    await loadCharts();
  } else if (activeTab === "needs") {
    el.innerHTML = `<div class="section-heading"><div><h2>Le prochain passage se prépare ici.</h2><p class="small-note">Ce qui doit être acheté, préparé ou apporté.</p></div>${button(icon("plus", 15) + " Ajouter un besoin", "new-need")}</div><div class="card">${state.needs.length ? state.needs.map(needRow).join("") : empty("Tout est prêt pour le moment", "Un produit ou du matériel manque ? Ajoutez-le ici.")}</div>`;
  } else if (activeTab === "info") {
    el.innerHTML = `<div class="grid two"><section class="card"><div class="inline between"><h2>Le bassin</h2>${button("Modifier", "edit-pool", "", "secondary small")}</div><dl>${[
      ["Type", kinds[p.kind]],
      ["Traitement", treatments[p.treatment]],
      ["Volume", p.volume ? p.volume + " m³" : "À préciser"],
      [
        "Filtration",
        filterTypes[p.filter_type] + (p.filtration ? " / " + p.filtration : ""),
      ],
      ["État saisonnier", p.winterized ? "Hivernée" : "En activité"],
      ["Adresse privée", p.address || "À préciser"],
    ]
      .map(
        ([k, v]) =>
          `<div class="row"><dt class="muted" style="font-size:12px;min-width:110px">${k}</dt><dd style="font-size:13px;margin:0">${esc(v)}</dd></div>`,
      )
      .join(
        "",
      )}</dl>${p.membership === "owner" ? `<a class="btn secondary" href="/api/pools/${p.id}/export" download>Exporter mon carnet</a>` : ""}${p.membership === "principal" && p.address ? `<a class="btn secondary" href="${esc(itinerary(p))}" target="_blank" rel="noopener noreferrer">${icon("map", 17)} Ouvrir l’itinéraire</a>` : ""}</section><div class="stack"><section class="card"><h2>Équipements</h2><p class="prose">${esc(p.equipment || "Marques, modèles et références à compléter.")}</p>${p.membership === "principal" ? `<h3>Routine d’entretien</h3><p class="prose">${esc(p.routine || "Les étapes propres à ce bassin apparaîtront ici.")}</p>` : ""}</section><section class="card"><h3>${icon("lock", 16)} Informations d’accès privées</h3><p class="prose">${esc(p.access_notes || "Aucune consigne renseignée.")}</p><p class="small-note">Privées : uniquement les propriétaires et leur pisciniste principal.</p></section>${p.membership !== "owner" ? `<section class="card"><h3>Vos notes internes</h3><p class="small-note">Ces notes restent privées et ne sont pas partagées avec le client.</p>${button("Ouvrir mes notes", "private-notes", "", "secondary")}</section>` : ""}</div></div>`;
  } else if (activeTab === "access") {
    await accessTab(el);
  } else if (activeTab === "planning") {
    const [r, ss] = await Promise.all([
      api(
        "/planning?pool_id=" +
          p.id +
          "&from=" +
          today() +
          "&to=" +
          addDays(today(), 30),
      ),
      api("/pools/" + p.id + "/schedules"),
    ]);
    el.innerHTML = `<div class="section-heading"><h2>Les prochains passages</h2>${p.membership !== "owner" ? button("Planifier un passage", "new-appointment", `data-pool="${p.id}"`) : ""}</div><div class="card">${r.items.length ? r.items.map((a) => `<div class="row"><div class="time">${fmt(a.date)}<small style="display:block;margin-top:5px">${esc(a.time)}</small></div><div class="grow"><h3>${esc(a.title)}</h3><p>${esc(a.pro_name)}</p></div>${badge(a.status === "done" ? "Effectué" : a.status === "cancelled" ? "Annulé" : "Prévu", a.status === "done" ? "teal" : "")}</div>`).join("") : empty("Pas encore de passage prévu", "Votre pisciniste pourra programmer ses interventions ici.")}</div><div class="section-heading"><h2>Rythmes d’entretien</h2>${p.membership !== "owner" ? button("Créer une récurrence", "new-schedule", `data-pool="${p.id}"`, "secondary") : ""}</div><div class="card">${ss.items.map((s) => `<div class="row"><div class="grow"><h3>${esc(s.title)}</h3><p>${esc(s.pro_name)} · tous les ${s.interval_days} jours${s.seasons.length ? " · saisons personnalisées" : ""}</p></div>${s.pro_id === state.user.id ? button("Arrêter", "stop-schedule", `data-id="${s.id}"`, "ghost small") : ""}</div>`).join("") || '<p class="small-note">Aucune récurrence active.</p>'}</div>`;
  }
}
on("more-records", async () => {
  if (!poolCursor) return;
  const r = await api(
    "/pools/" + state.pool.id + "/records?cursor=" + poolCursor,
  );
  state.records.push(...r.items);
  poolCursor = r.next;
  const m = $("#record-more");
  m.insertAdjacentHTML("beforebegin", r.items.map(recordCard).join(""));
  m.innerHTML = r.next
    ? button("Voir les suivis précédents", "more-records", "", "secondary")
    : "";
});
async function loadCharts() {
  const d = await api(
    "/pools/" + state.pool.id + "/trends?days=" + $("#chart-days").value,
  );
  trendData = d.items;
  const keys = Object.keys(metrics).filter((k) =>
    d.items.some((x) => x[k] != null),
  );
  $("#chart-content").innerHTML = keys.length
    ? keys
        .map((k) => {
          const values = d.items.filter((x) => x[k] != null),
            raw = values.map((x) => x[k]),
            lo = Math.min(...raw),
            hi = Math.max(...raw),
            pad = Math.max((hi - lo) * 0.2, 0.2),
            min = lo - pad,
            max = hi + pad;
          const pts = values.map(
            (x, i) =>
              `${40 + (i / Math.max(values.length - 1, 1)) * 570},${145 - ((x[k] - min) / (max - min)) * 120}`,
          );
          return `<section style="margin-top:25px"><div class="inline between"><h3>${metrics[k].label} <small>${metrics[k].unit}</small></h3><span class="small-note">${values.length} jour${values.length > 1 ? "s" : ""} mesuré${values.length > 1 ? "s" : ""}</span></div><svg class="chart" viewBox="0 0 650 180" role="img" aria-label="Évolution ${metrics[k].label}"><path d="M40 145H620M40 85H620M40 25H620" stroke="#e5eeee" stroke-dasharray="3 4"/><text x="0" y="30">${max.toFixed(1)}</text><text x="0" y="145">${min.toFixed(1)}</text><polyline points="${pts.join(" ")}" fill="none" stroke="${metrics[k].color}" stroke-width="2.5"/>${pts.map((p, i) => `<circle cx="${p.split(",")[0]}" cy="${p.split(",")[1]}" r="3" fill="${metrics[k].color}"><title>${fmt(values[i].date)} : ${values[i][k].toFixed(2)} ${metrics[k].unit}</title></circle>`).join("")}<text x="40" y="173">${fmt(values[0].date)}</text><text x="570" y="173">${fmt(values.at(-1).date)}</text></svg>${d.thresholds[k] ? `<p class="small-note">Repère propre au bassin : ${d.thresholds[k][0]} à ${d.thresholds[k][1]} ${metrics[k].unit}.</p>` : ""}</section>`;
        })
        .join("") +
      `<details style="margin-top:25px"><summary>Consulter les valeurs en tableau</summary><div class="table-wrap"><table><thead><tr><th>Date</th>${keys.map((k) => `<th>${metrics[k].label}</th>`).join("")}</tr></thead><tbody>${d.items.map((v) => `<tr><td>${fmt(v.date)}</td>${keys.map((k) => `<td>${v[k] == null ? "Non renseigné" : v[k].toFixed(2)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`
    : empty(
        "Vos premières courbes bientôt ici",
        "Ajoutez une analyse pour visualiser l’évolution de votre eau.",
      );
}
async function accessTab(el) {
  const p = state.pool;
  el.innerHTML = `<div class="section-heading"><div><h2>Les bonnes personnes, les bons accès.</h2><p class="small-note">Le dossier est privé : les propriétaires et un seul pisciniste principal.</p></div>${p.manager || p.claimable ? button(p.claimable ? "Inviter le client" : "Inviter", "invite-member") : ""}</div><section class="card">${p.members.map((m) => `<div class="row"><span class="avatar">${esc(m.name.slice(0, 2).toUpperCase())}</span><div class="grow"><h3>${esc(m.name)} ${m.user_id === state.user.id ? "(vous)" : ""}</h3><p>${managerKinds[m.kind]}${m.manager ? " · Responsable des accès" : ""}${m.expires_at ? " · jusqu’au " + fmt(m.expires_at) : ""}</p></div><div class="actions">${p.manager && m.kind === "owner" && !m.manager ? button("Transférer la responsabilité", "transfer-manager", `data-id="${m.id}" data-name="${esc(m.name)}"`, "ghost small") : ""}${!m.manager && !p.claimable && (p.manager || m.user_id === state.user.id) ? button(m.user_id === state.user.id ? "Quitter" : "Retirer l’accès", "remove-member", `data-id="${m.id}" data-name="${esc(m.name)}"`, "ghost small") : ""}</div></div>`).join("")}</section>${p.invitations.length ? `<div class="section-heading"><h2>Invitations en attente</h2></div><section class="card">${p.invitations.map((i) => `<div class="row"><div class="grow"><h3>${esc(i.name)}</h3><p>${managerKinds[i.kind]} · expire le ${fmt(i.expires_at)}</p></div>${button("Annuler", "cancel-invite", `data-id="${i.id}"`, "ghost small")}</div>`).join("")}</section>` : ""}<div class="note" style="margin-top:22px">La suppression d’un accès empêche la consultation du dossier et de ses photos. Votre historique reste attaché à la piscine.</div>${p.claimable ? button("Archiver cette fiche en attente", "archive-pool", "", "ghost") : ""}`;
}
on("archive-pool", () =>
  confirmAction(
    "Archiver cette fiche ?",
    "Elle sera retirée de votre tournée et ses invitations seront annulées.",
    async () => {
      await api("/pools/" + state.pool.id + "/archive", "POST", {});
      go("clients");
    },
    "Archiver",
  ),
);
on("invite-member", (d) => {
  const p = state.pool,
    hasPro = p.members.some((m) => m.kind === "principal");
  const options =
    d.kind === "principal" && !hasPro && p.manager
      ? { principal: "Mon pisciniste" }
      : p.claimable
        ? { owner: "Client propriétaire" }
        : hasPro
          ? { owner: "Copropriétaire" }
          : { principal: "Mon pisciniste", owner: "Copropriétaire" };
  modal(
    p.claimable
      ? "Inviter le client"
      : d.kind === "principal"
        ? "Ajouter mon pisciniste"
        : "Partager cette piscine",
    `${select("Inviter", "kind", options, p.claimable || hasPro ? "owner" : "principal")}${field("Identifiant exact de la personne", "username", "", "text", 'required maxlength="40" autocapitalize="none"')}<div id="find-pro-section" ${p.claimable || hasPro ? "hidden" : ""}><div class="inline"><input id="pro-search" class="search-input" placeholder="Nom du pisciniste" aria-label="Trouver un pisciniste"><button type="button" class="btn secondary" data-action="find-pro">Rechercher</button></div><div id="pro-results"></div></div><p class="small-note">${p.claimable ? "Le client accepte l’invitation depuis son compte." : "L’invitation doit être acceptée. Pour changer de pisciniste, retirez d’abord l’ancien accès."}</p>`,
    async (b) => {
      await api("/pools/" + p.id + "/invitations", "POST", b);
      closeModal();
      toast("Invitation envoyée.");
      refresh();
    },
    "Envoyer l’invitation",
  );
  $("[name=kind]").addEventListener("change", (e) => {
    $("#find-pro-section").hidden = e.target.value !== "principal";
  });
});
on("find-pro", async () => {
  const r = await api(
    "/professionals?q=" + encodeURIComponent($("#pro-search").value),
  );
  $("#pro-results").innerHTML =
    r.items
      .map(
        (u) =>
          `<div class="row"><div class="grow"><h3>${esc(u.company || u.name)}</h3><p>@${esc(u.username)} · ${esc(u.city || "Zone non renseignée")}</p></div>${button("Choisir", "choose-pro", `data-username="${esc(u.username)}"`, "secondary small")}</div>`,
      )
      .join("") || '<p class="small-note">Aucun professionnel trouvé.</p>';
});
on("choose-pro", (d) => {
  $("[name=username]").value = d.username;
  $("[name=kind]").value = "principal";
  $("#pro-results").innerHTML = "";
});
on("remove-member", (d) =>
  confirmAction(
    "Retirer cet accès",
    `${d.name} ne pourra plus consulter le dossier. Les interventions et analyses restent dans le journal.`,
    () => api("/pools/" + state.pool.id + "/members/" + d.id, "DELETE", {}),
    "Retirer l’accès",
  ),
);
on("transfer-manager", (d) =>
  confirmAction(
    "Transférer la responsabilité",
    `${d.name} gérera désormais les invitations et le choix du pisciniste. Vous restez copropriétaire. Les invitations en attente seront annulées.`,
    () =>
      api("/pools/" + state.pool.id + "/manager", "POST", { member_id: d.id }),
    "Transférer",
  ),
);
on("cancel-invite", async (d) => {
  await api("/pools/" + state.pool.id + "/invitations/" + d.id, "DELETE", {});
  refresh();
});
on("edit-pool", () => {
  const p = state.pool;
  modal(
    "Modifier la piscine",
    `${field("Nom", "name", p.name, "text", 'required maxlength="80"')}${select("Type de bassin", "kind", kinds, p.kind)}${addressField(p)}<div class="grid two form-two">${field("Volume (m³)", "volume", p.volume, "number", 'min="0.1" max="100000" step="0.1"')}${select("Traitement", "treatment", treatments, p.treatment)}</div>${select("Type de filtre", "filter_type", filterTypes, p.filter_type)}${field("Modèle du filtre (facultatif)", "filtration", p.filtration, "text", 'maxlength="200"')}<fieldset class="equipment-options"><legend>Équipements présents</legend>${[
      ["has_steps", "Marches"],
      ["has_skimmers", "Skimmers"],
      ["has_prefilter", "Préfiltre de pompe"],
    ]
      .map(
        ([key, label]) =>
          `<label class="check"><input type="checkbox" name="${key}" ${p[key] ? "checked" : ""}>${label}</label>`,
      )
      .join(
        "",
      )}</fieldset>${area("Équipements, marques et références", "equipment", p.equipment, 'maxlength="4000"')}${p.membership === "principal" ? `${area("Tâches supplémentaires (une par ligne)", "routine", p.routine, 'maxlength="2000"')}${area("Conseils au client entre deux passages", "client_advice", p.client_advice, 'maxlength="2000"')}` : ""}${area("Consignes d’accès privées", "access_notes", p.access_notes, 'maxlength="1000"')}<label class="check"><input type="checkbox" name="winterized" ${p.winterized ? "checked" : ""}> Piscine actuellement hivernée</label><details><summary>Repères de suivi personnalisés</summary><p class="small-note">Renseignez uniquement des plages adaptées à ce bassin et à son usage. Aucun seuil générique ne certifie sa conformité.</p>${Object.entries(
      metrics,
    )
      .filter(([k]) => k !== "water_temp")
      .map(
        ([k, m]) =>
          `<div class="grid two form-two">${field(m.label + " minimum", "min_" + k, p.thresholds[k]?.[0] ?? "", "number", `step="0.1" min="0" max="${m.max}"`)}${field(m.label + " maximum", "max_" + k, p.thresholds[k]?.[1] ?? "", "number", `step="0.1" min="0" max="${m.max}"`)}</div>`,
      )
      .join("")}</details>`,
    async (b) => {
      const thresholds = {};
      for (const k of Object.keys(metrics))
        if (
          b["min_" + k] !== undefined &&
          b["min_" + k] !== "" &&
          b["max_" + k] !== ""
        )
          thresholds[k] = [Number(b["min_" + k]), Number(b["max_" + k])];
      await api("/pools/" + p.id, "PUT", {
        ...b,
        location: readAddress(b),
        has_steps: b.has_steps === "on",
        has_skimmers: b.has_skimmers === "on",
        has_prefilter: b.has_prefilter === "on",
        winterized: b.winterized === "on",
        thresholds,
      });
      closeModal();
      refresh();
      toast("Dossier mis à jour.");
    },
  );
  wireAddress();
});
on("private-notes", async () => {
  const r = await api("/pools/" + state.pool.id + "/notes");
  modal(
    "Vos notes internes",
    `${area("Notes personnelles : jamais partagées au client", "body", r.body, 'maxlength="4000"')}`,
    async (b) => {
      await api("/pools/" + state.pool.id + "/notes", "PUT", b);
      closeModal();
      toast("Notes enregistrées.");
    },
  );
});
export function needRow(n) {
  const labels = {
    needed: n.responsible === "client" ? "À acheter" : "À préparer",
    ready: n.responsible === "client" ? "Acheté" : "Prêt à apporter",
    delivered: "Disponible sur place",
    cancelled: "Annulé",
  };
  return `<div class="row"><span class="avatar">${icon(n.category === "equipment" ? "settings" : "box", 18)}</span><div class="grow"><h3>${esc(n.title)} ${n.quantity ? '<span class="muted">· ' + esc(n.quantity) + "</span>" : ""}</h3><p>${n.responsible === "client" ? "Achat par le client" : "Apport par le pisciniste"}${n.due_date ? " · pour le " + fmt(n.due_date) : ""}${n.pool_name ? " · " + esc(n.pool_name) : ""}</p></div>${badge(labels[n.status], n.status === "needed" ? "amber" : n.status === "delivered" ? "teal" : "")}<div class="actions">${n.status === "needed" ? button("Marquer prêt", "need-status", `data-id="${n.id}" data-status="ready" data-revision="${n.revision}"`, "secondary small") : ""}${n.status === "ready" ? button("Disponible sur place", "need-status", `data-id="${n.id}" data-status="delivered" data-revision="${n.revision}"`, "primary small") : ""}${["needed", "ready"].includes(n.status) ? button("Annuler", "need-status", `data-id="${n.id}" data-status="cancelled" data-revision="${n.revision}"`, "ghost small") : ""}</div></div>`;
}
on("new-need", () =>
  modal(
    "Préparer le prochain passage",
    `${field("Produit ou matériel", "title", "", "text", 'required maxlength="120" placeholder="Ex. cartouche de filtration"')}<div class="grid two form-two">${select("Catégorie", "category", { product: "Produit", equipment: "Matériel" }, "product")}${field("Quantité et unité", "quantity", "", "text", 'maxlength="60" placeholder="Ex. 1 pièce"')}</div>${select("Qui s’en occupe ?", "responsible", { client: "Le client achète", pro: "Le pisciniste apporte" }, "pro")}${field("À prévoir pour", "due_date", addDays(today(), 7), "date")}<p class="note">Les copropriétaires seront informés de l’achat à effectuer ou de l’approvisionnement prévu par le pisciniste.</p>`,
    async (b) => {
      await api("/pools/" + state.pool.id + "/needs", "POST", b);
      closeModal();
      refresh();
      toast("Besoin ajouté et notification créée.");
    },
    "Ajouter le besoin",
  ),
);
on("need-status", async (d) => {
  await api("/needs/" + d.id, "PUT", {
    status: d.status,
    revision: Number(d.revision),
  });
  toast("Besoin mis à jour.");
  refresh();
});
on("new-analysis", async (d) =>
  openRecordForm(d.pool || state.pool.id, "analysis"),
);
on("new-visit", async (d) =>
  openRecordForm(d.pool || state.pool.id, "visit", null, d.appointment),
);
on("edit-record", async (d) =>
  openRecordForm(state.pool.id, "analysis", await api("/records/" + d.id)),
);
on("correct-record", async (d) => {
  const r = await api("/records/" + d.id);
  openRecordForm(state.pool.id, r.kind, {
    ...r,
    id: null,
    published_at: null,
    correction_of: r.id,
    photos: [],
    revision: 1,
  });
});
export async function openRecordForm(
  poolId,
  kind,
  record = null,
  appointment = null,
) {
  const p = await api("/pools/" + poolId),
    actualKind = record?.kind || kind,
    visit = actualKind === "visit";
  const uploadedFiles = new Set();
  let id = record?.id || crypto.randomUUID(),
    persisted = !!record?.id,
    revision = record?.revision || 1;
  const localDate = (d) =>
    new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  const value = localDate(record?.measured_at || Date.now());
  const checklist = visit
    ? record?.checklist?.length
      ? record.checklist
      : p.maintenance_tasks
    : [];
  const draftKey =
    "pib-draft:" +
    state.user.id +
    ":" +
    poolId +
    ":" +
    actualKind +
    ":" +
    (record?.id || record?.correction_of || "new");
  const groups = [
    ...new Set(checklist.map((t) => t.group || "Tâches du passage")),
  ];
  const taskMarkup = groups
    .map(
      (group, index) =>
        `<fieldset class="maintenance-group"><legend><span>${index + 1}</span>${esc(group)}</legend>${checklist
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => (c.group || "Tâches du passage") === group)
          .map(
            ({ c, i }) =>
              `<div class="maintenance-task ${c.done ? "is-done" : ""}"><label class="task-checkbox"><input type="checkbox" name="check_${i}" ${c.done ? "checked" : ""}><span>${esc(c.label)}</span></label><button type="button" class="task-exception" data-task-skip="${i}" aria-expanded="${!!c.skipped}">${c.skipped ? "Annuler le motif" : "Non réalisé"}</button><div class="task-reason" ${c.skipped ? "" : "hidden"}><label>Pourquoi ?<input name="reason_${i}" maxlength="250" value="${esc(c.reason || "")}" placeholder="Ex. filtre propre, lavage non nécessaire" ${c.skipped ? "required" : ""}></label><input type="hidden" name="skip_${i}" value="${c.skipped ? "1" : "0"}"></div></div>`,
          )
          .join("")}</fieldset>`,
    )
    .join("");
  const measurements = `<section class="visit-measures"><h3>Analyse de l’eau</h3><div class="grid two form-two">${Object.entries(
    metrics,
  )
    .map(([k, m]) =>
      field(
        m.label + (m.unit ? " (" + m.unit + ")" : ""),
        k,
        record?.readings?.[k] ?? "",
        "number",
        `step="0.01" min="0" max="${m.max}" inputmode="decimal" placeholder="Non mesuré"`,
      ),
    )
    .join(
      "",
    )}</div>${field("Méthode de mesure (facultatif)", "method", record?.method || "", "text", 'maxlength="100" placeholder="Gouttes, photomètre…"')}</section>`;
  const dialog = modal(
    visit ? "Entretien de la piscine" : "Ajouter une analyse",
    `<p class="form-intro">${esc(p.name)}</p>${record?.correction_of ? '<p class="note">La version originale restera dans l’historique.</p>' : ""}${visit ? `<div class="visit-progress"><span id="task-progress" aria-live="polite"></span><progress id="task-progress-bar" max="${checklist.length}" value="0"></progress></div>` : ""}<div class="${visit ? "visit-workspace" : ""}">${visit ? `<section class="visit-checklist">${p.filter_type === "unknown" ? '<p class="note">Type de filtre à préciser dans la fiche piscine pour adapter les tâches.</p>' : ""}<p class="safety-inline">Arrêtez la pompe avant de changer la position de la vanne. Isolez et dépressurisez avant toute ouverture.</p>${taskMarkup}<a class="text-btn" href="#guide/entretien/${p.id}" target="_blank" rel="noopener">Consulter la procédure d’entretien</a></section>` : ""}<aside class="visit-details">${measurements}${field("Date et heure de la mesure", "measured_at", value, "datetime-local", "required")}${visit ? field("Durée du passage (minutes)", "duration", record?.duration || "", "number", 'min="1" max="1440"') : ""}${area("Produits ajoutés", "products", record?.products || "", 'maxlength="2000" placeholder="Produit, quantité et unité"')}${area(p.membership === "principal" ? "Observations partagées avec le client" : "Observations", "notes", record?.notes || "", 'maxlength="4000" placeholder="État du bassin, point à surveiller…"')}<label class="field"><span>Photos du bassin (6 maximum, 4 Mo chacune)</span><input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp"></label>${record?.photos?.length ? `<p class="small-note">${record.photos.length} photo(s) déjà enregistrée(s).</p>` : ""}<p class="small-note">${visit ? "Le client verra les tâches réalisées, les éventuels motifs et les mesures après le partage." : "Vos mesures seront ajoutées à l’historique de votre piscine."}</p><label class="check"><input type="checkbox" name="draft"> Conserver un brouillon</label></aside></div>`,
    async (b, form) => {
      const values = {};
      for (const k of Object.keys(metrics))
        if (b[k] !== "" && b[k] != null) values[k] = b[k];
      const list = checklist.map((c, i) => ({
        ...c,
        done: b["check_" + i] === "on",
        skipped: b["skip_" + i] === "1",
        reason: b["skip_" + i] === "1" ? b["reason_" + i] : "",
      }));
      if (visit && b.draft !== "on") {
        if (list.some((t) => !t.done && !t.skipped))
          throw new Error(
            "Cochez chaque tâche réalisée ou indiquez le motif d’une tâche non réalisée.",
          );
        if (list.some((t) => t.skipped && !t.reason.trim()))
          throw new Error("Précisez les motifs des tâches non réalisées.");
        if (
          list.some((t) => t.id === "analysis" && t.done) &&
          (values.ph == null || values.chlorine == null)
        )
          throw new Error(
            "Renseignez le pH et le chlore pour valider l’analyse.",
          );
      }
      const payload = {
        id,
        kind: actualKind,
        measured_at: new Date(b.measured_at).toISOString(),
        readings: values,
        method: b.method,
        notes: b.notes,
        products: b.products,
        duration: b.duration,
        checklist: visit ? list : [],
        appointment_id: appointment || record?.appointment_id,
        correction_of: record?.correction_of,
        revision,
      };
      if (persisted) {
        const r = await api("/records/" + id, "PUT", payload);
        revision = r.revision;
      } else {
        const r = await api("/pools/" + poolId + "/records", "POST", payload);
        persisted = true;
        if (r.replayed) {
          const saved = await api("/records/" + id);
          revision = saved.revision;
          const updated = await api("/records/" + id, "PUT", {
            ...payload,
            revision,
          });
          revision = updated.revision;
        }
      }
      const files = $("[name=photos]", form);
      for (const file of files.files) {
        if (uploadedFiles.has(file)) continue;
        const fd = new FormData();
        fd.append("file", file);
        await api("/records/" + id + "/photos", "POST", fd);
        uploadedFiles.add(file);
      }
      files.value = "";
      if (b.draft !== "on")
        await api("/records/" + id + "/publish", "POST", {});
      sessionStorage.removeItem(draftKey);
      closeModal();
      toast(
        b.draft === "on"
          ? "Brouillon enregistré."
          : visit
            ? "Compte rendu partagé avec le client."
            : "Analyse enregistrée.",
      );
      if (location.hash.startsWith("#pool/" + poolId)) refresh();
      else go("pool/" + poolId);
    },
    visit ? "Terminer et partager" : "Enregistrer l’analyse",
  );
  if (visit) dialog.classList.add("maintenance-dialog");
  const form = $("#mform");
  const update = () => {
    for (let i = 0; i < checklist.length; i++)
      $(`[name=reason_${i}]`, form).required =
        $(`[name=skip_${i}]`, form).value === "1" &&
        !$("[name=draft]", form).checked;
    if (visit) {
      const done = checklist.filter(
          (c, i) => $(`[name=check_${i}]`, form).checked,
        ).length,
        skipped = checklist.filter(
          (c, i) => $(`[name=skip_${i}]`, form).value === "1",
        ).length;
      $("#task-progress").textContent =
        `${done} sur ${checklist.length} réalisées${skipped ? " • " + skipped + " non réalisées" : ""}`;
      $("#task-progress-bar").value = done + skipped;
    }
    $("[type=submit]", form).textContent = $("[name=draft]", form).checked
      ? "Enregistrer le brouillon"
      : visit
        ? "Terminer et partager"
        : "Enregistrer l’analyse";
    for (const row of $$(".maintenance-task", form))
      row.classList.toggle("is-done", $("[type=checkbox]", row).checked);
  };
  form.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-task-skip]");
    if (!btn) return;
    const i = btn.dataset.taskSkip,
      reason = $(`[name=reason_${i}]`, form),
      skip = $(`[name=skip_${i}]`, form),
      expanded = skip.value !== "1";
    skip.value = expanded ? "1" : "0";
    reason.closest(".task-reason").hidden = !expanded;
    reason.required = expanded;
    btn.setAttribute("aria-expanded", String(expanded));
    btn.textContent = expanded ? "Annuler le motif" : "Non réalisé";
    if (expanded) {
      $(`[name=check_${i}]`, form).checked = false;
      reason.focus();
    }
    update();
    saveLocal();
  });
  form.addEventListener("change", (e) => {
    if (e.target.name?.startsWith("check_") && e.target.checked) {
      const i = e.target.name.slice(6),
        reason = $(`[name=reason_${i}]`, form);
      $(`[name=skip_${i}]`, form).value = "0";
      reason.required = false;
      reason.closest(".task-reason").hidden = true;
      const btn = $(`[data-task-skip="${i}"]`, form);
      btn.textContent = "Non réalisé";
      btn.setAttribute("aria-expanded", "false");
    }
    update();
    saveLocal();
  });
  const saveLocal = () => {
    const b = Object.fromEntries(new FormData(form));
    delete b.photos;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          fields: b,
          taskIds: checklist.map((t) => t.id || t.label),
        }),
      );
    } catch {}
  };
  if (!record) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey));
      if (
        saved &&
        JSON.stringify(saved.taskIds) ===
          JSON.stringify(checklist.map((t) => t.id || t.label)) &&
        confirm("Reprendre la saisie non envoyée de cette piscine ?")
      ) {
        for (const [k, v] of Object.entries(saved.fields)) {
          const input = $(`[name="${k}"]`, form);
          if (input && input.type !== "file")
            input.type === "checkbox"
              ? (input.checked = v === "on")
              : (input.value = v);
        }
        for (let i = 0; i < checklist.length; i++) {
          const skipped = $(`[name=skip_${i}]`, form).value === "1",
            reason = $(`[name=reason_${i}]`, form);
          reason.required = skipped;
          reason.closest(".task-reason").hidden = !skipped;
          const btn = $(`[data-task-skip="${i}"]`, form);
          btn.textContent = skipped ? "Annuler le motif" : "Non réalisé";
          btn.setAttribute("aria-expanded", String(skipped));
        }
      }
    } catch {}
  }
  form.addEventListener("input", saveLocal);
  update();
}
on("record-detail", async (d) => {
  const r = await api("/records/" + d.id);
  modal(
    r.kind === "visit" ? "Compte rendu de passage" : "Relevé d’analyse",
    `<div class="inline between"><p class="small-note">${fmt(r.measured_at, { year: "numeric", hour: "2-digit", minute: "2-digit" })}<br>${esc(r.author_name)}</p>${badge(r.published_at ? (r.kind === "visit" ? "Partagé" : "Enregistrée") : "Brouillon", r.published_at ? "teal" : "amber")}</div><div class="metric-grid">${Object.entries(
      r.readings,
    )
      .map(([k, v]) =>
        metrics[k]
          ? `<div class="stat"><span>${metrics[k].label}</span><strong>${esc(v)}</strong><small>${metrics[k].unit}</small></div>`
          : "",
      )
      .join(
        "",
      )}</div>${r.method ? `<p class="small-note">Méthode : ${esc(r.method)}</p>` : ""}${r.checklist.length ? `<h3>${esc(taskSummary(r.checklist))}</h3>${taskReport(r.checklist)}` : ""}<h3>Observations</h3><p class="prose">${esc(r.notes || "Aucune observation complémentaire.")}</p>${r.products ? `<h3>Produits ajoutés</h3><p class="prose">${esc(r.products)}</p>` : ""}<div class="photo-grid">${r.photos.map((p) => `<a href="/api/photos/${p.id}" target="_blank" rel="noopener"><img src="/api/photos/${p.id}" alt="${esc(p.caption || "Photo du bassin lors du passage")}" loading="lazy"></a>`).join("")}</div><p class="small-note">Ce compte rendu décrit les mesures renseignées à la date indiquée. Il ne constitue pas une certification de conformité.</p>${button("Imprimer ce compte rendu", "print", "", "secondary")}`,
    null,
  );
});
on("print", () => window.print());
