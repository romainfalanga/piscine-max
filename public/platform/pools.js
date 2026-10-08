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
const managerKinds = {
  owner: "Copropriétaire",
  principal: "Pisciniste principal",
  temporary: "Intervenant ponctuel",
};
function poolCard(p) {
  return `<article class="card pool-card" data-action="open-pool" data-id="${p.id}" tabindex="0" role="button" aria-label="Ouvrir ${esc(p.name)}"><div class="pool-symbol">${icon("pool", 24)}</div><div class="tag">${badge(p.winterized ? "Hivernée" : managerKinds[p.membership], p.membership === "owner" ? "teal" : "")}</div><h3>${esc(p.name)}</h3><p>${esc(p.city || "Commune à compléter")} · ${esc(kinds[p.kind] || "Piscine")}</p><div class="bottom"><span>${p.last_reading ? "Dernier suivi · " + fmt(p.last_reading) : "Votre histoire commence ici"}</span>${icon("arrow", 17)}</div></article>`;
}
export async function pools(main) {
  const pro = state.mode === "pro";
  const [r, inv] = await Promise.all([
    api("/pools?mode=" + state.mode),
    api("/invitations"),
  ]);
  morePoolCursor = r.next;
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">${pro ? "VOTRE ACTIVITÉ" : "VOTRE CARNET DE PISCINE"}</div><h1>${pro ? "Chaque bassin, bien suivi." : "Le plaisir de l’eau, l’esprit libre."}</h1><p>${pro ? "Retrouvez les piscines qui vous sont confiées." : "Un même historique pour vous, vos proches et votre pisciniste."}</p></div>${button(pro ? "Comment ajouter un client ?" : icon("plus", 17) + " Ajouter une piscine", pro ? "invite-client" : "new-pool")}</div>${inv.items.length ? `<section class="card" style="margin-bottom:22px"><h2>On vous attend au bord du bassin.</h2>${inv.items.map((i) => `<div class="row"><div class="grow"><h3>${esc(i.pool_name)}</h3><p>${esc(i.sender_name)} vous invite comme ${managerKinds[i.kind].toLowerCase()}.</p></div>${button("Accepter", "invitation", `data-id="${i.id}" data-accept="1"`, "primary small")}${button("Refuser", "invitation", `data-id="${i.id}" data-accept="0"`, "ghost small")}</div>`).join("")}</section>` : ""}${!pro ? `<section class="welcome"><div><div class="eyebrow">UNE PISCINE QUI SE RACONTE</div><h2>Vos mesures d’aujourd’hui.<br>Votre tranquillité de demain.</h2><p>Ajoutez une analyse, retrouvez un passage, partagez votre piscine avec les bonnes personnes.</p></div><div class="welcome-icon">${icon("water", 56)}</div></section>` : ""}<div class="section-heading"><h2>${pro ? "Vos piscines suivies" : "Vos piscines"}</h2><span>${r.items.length}${r.next ? "+" : ""} bassin${r.items.length > 1 ? "s" : ""}</span></div><div class="inline" style="margin-bottom:18px"><input id="pool-search" class="search-input" placeholder="Rechercher une piscine ou une ville" aria-label="Rechercher une piscine"><button class="btn secondary" data-action="search-pools">Rechercher</button></div><div id="pool-list" class="grid three">${r.items.map(poolCard).join("")}${!pro ? `<button class="card pool-card pool-add" data-action="new-pool"><span class="circle">${icon("plus", 22)}</span><h3>Une autre piscine ?</h3><p>Créez son carnet en quelques instants.</p></button>` : ""}</div>${!r.items.length && pro ? empty("Votre première piscine vous attend", "Le client crée sa piscine, puis vous invite à la suivre.", button("Comment ça marche ?", "invite-client", "", "secondary")) : ""}<div id="pool-more" style="margin-top:20px">${r.next ? button("Voir davantage de piscines", "more-pools", "", "secondary") : ""}</div>`;
  $$("[data-action=open-pool]").forEach((x) =>
    x.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go("pool/" + x.dataset.id);
    }),
  );
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
on("invite-client", () =>
  modal(
    "Faire entrer un client dans votre suivi",
    `<p>Le client crée son compte et sa piscine, puis vous invite dans l’onglet <strong>Accès</strong>.</p><div class="note">Votre identifiant professionnel : <strong>${esc(state.user.username)}</strong><br>La plateforme : <strong>${esc(location.origin)}</strong></div><p class="small-note" style="margin-top:18px">Vous recevrez son invitation ici. Aucun dossier privé n’est accessible tant que le partage n’est pas accepté.</p>`,
    null,
  ),
);
on("invitation", async (d) => {
  await api("/invitations/" + d.id + "/respond", "POST", {
    accept: d.accept === "1",
  });
  toast(d.accept === "1" ? "Invitation acceptée." : "Invitation refusée.");
  refresh();
});
on("new-pool", () =>
  modal(
    "Le carnet de votre piscine",
    `${field("Nom de la piscine", "name", "", "text", 'required maxlength="80" placeholder="La piscine de la maison"')}${select("Type de bassin", "kind", kinds, "private")}${cityField()}${field("Adresse exacte — visible uniquement aux personnes autorisées", "address", "", "text", 'maxlength="300" autocomplete="street-address"')}<div class="grid two form-two">${field("Volume (m³) — facultatif", "volume", "", "number", 'min="0.1" max="100000" step="0.1" placeholder="Je ne sais pas"')}${select("Traitement", "treatment", treatments, "unknown")}</div><p class="small-note">Vous pourrez compléter les détails avec votre pisciniste. Vous êtes responsable des accès de cette piscine.</p>`,
    async (b) => {
      const r = await api("/pools", "POST", b);
      closeModal();
      go("pool/" + r.id);
      toast("Votre piscine est créée.");
    },
    "Créer ma piscine",
  ),
);
export async function pool(main, id, tab = "journal") {
  const [p, r, n] = await Promise.all([
    api("/pools/" + id),
    api("/pools/" + id + "/records"),
    api("/pools/" + id + "/needs"),
  ]);
  state.pool = p;
  state.records = r.items;
  state.needs = n.items;
  poolCursor = r.next;
  activeTab = tab;
  const isPro = ["principal", "temporary"].includes(p.membership);
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow"><a href="#pools" style="text-decoration:none">${icon("pool", 12)} VOS PISCINES</a> / ${esc(p.city || "CARNET")}</div><h1>${esc(p.name)}</h1><p>${esc(kinds[p.kind])} · ${p.volume ? esc(p.volume) + " m³" : "Volume à préciser"} · ${esc(treatments[p.treatment])}</p></div><div class="inline wrap">${button(icon("plus", 16) + " Ajouter une analyse", "new-analysis", `data-pool="${id}"`)}${isPro ? button("Enregistrer un passage", "new-visit", `data-pool="${id}"`, "secondary") : ""}</div></div><div class="tabs" role="navigation" aria-label="Sections de la piscine">${[
    ["journal", "Journal"],
    ["charts", "Évolution"],
    ["needs", "À prévoir"],
    ["planning", "Planning"],
    ["info", "Le bassin"],
    ["access", "Accès"],
  ]
    .map(
      ([key, label]) =>
        `<button class="${tab === key ? "active" : ""}" data-action="pool-tab" data-tab="${key}">${label}${key === "needs" && n.items.some((n) => n.status === "needed") ? " · " + n.items.filter((n) => n.status === "needed").length : ""}</button>`,
    )
    .join("")}</div><div id="pool-content"></div>`;
  await renderTab();
}
on("pool-tab", (d) => go("pool/" + state.pool.id + "/" + d.tab));
function recordCard(r) {
  const values = Object.entries(r.readings).filter(([k]) => metrics[k]);
  return `<article class="record"><div class="inline between"><div class="meta">${fmt(r.measured_at, { year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${esc(r.author_name)}</div>${badge(r.published_at ? (r.superseded_by ? "Version corrigée" : r.correction_of ? "Correction" : "Partagé") : "Brouillon", r.published_at ? "teal" : "amber")}</div><h3>${r.kind === "visit" ? "Passage d’entretien" : "Analyse de l’eau"}</h3>${values.length ? `<div class="values">${values.map(([k, v]) => `<span>${metrics[k].label} <strong>${esc(v)}</strong> ${metrics[k].unit}</span>`).join("")}</div>` : ""}${r.notes ? `<p class="body">${esc(r.notes)}</p>` : ""}${r.products ? `<p class="small-note"><strong>Produits ajoutés :</strong> ${esc(r.products)}</p>` : ""}<div class="inline wrap">${button("Voir le détail", "record-detail", `data-id="${r.id}"`, "secondary small")}${r.author_id === state.user.id && !r.published_at ? button("Reprendre le brouillon", "edit-record", `data-id="${r.id}"`, "secondary small") : ""}${r.author_id === state.user.id && r.published_at && !r.superseded_by ? button("Ajouter une correction", "correct-record", `data-id="${r.id}"`, "ghost small") : ""}</div></article>`;
}
async function renderTab() {
  const el = $("#pool-content"),
    p = state.pool;
  if (activeTab === "journal") {
    const latest = state.records.find(
      (r) => r.published_at && !r.superseded_by,
    );
    el.innerHTML = `<div class="split"><section>${state.records.length ? state.records.map(recordCard).join("") : empty("La première page de votre carnet", "Ajoutez une analyse, même sans rendez-vous avec un pisciniste.", button("Ajouter une analyse", "new-analysis", `data-pool="${p.id}"`))}<div id="record-more">${poolCursor ? button("Voir les passages précédents", "more-records", "", "secondary") : ""}</div></section><aside class="stack"><section class="card"><div class="eyebrow">LE DERNIER POINT</div><h2>${latest ? "Un suivi qui se construit." : "À votre rythme."}</h2><p class="muted" style="font-size:13px">${latest ? "Dernières mesures partagées le " + fmt(latest.measured_at) + ". Les valeurs décrivent cet instant et les seuls paramètres renseignés." : "Vos analyses et celles de votre pisciniste apparaissent dans un même journal."}</p>${p.client_advice ? `<div class="divider"></div><h3>Entre deux passages</h3><p class="prose">${esc(p.client_advice)}</p>` : ""}</section><section class="card"><h3>Une question sur ce bassin ?</h3><p class="muted" style="font-size:13px">Demandez un avis ou trouvez un professionnel pour une intervention.</p>${button("Demander de l’aide", "new-help", `data-pool="${p.id}"`, "secondary")}</section></aside></div>`;
  } else if (activeTab === "charts") {
    el.innerHTML = `<div class="card"><div class="inline between wrap"><div><h2>L’évolution de votre eau</h2><p class="small-note">Moyennes quotidiennes des analyses partagées. Les corrections remplacent les anciennes valeurs dans les courbes.</p></div><select id="chart-days" class="search-input" style="width:auto" aria-label="Période"><option value="30">30 jours</option><option value="180" selected>6 mois</option><option value="365">1 an</option><option value="1825">5 ans</option></select></div><div id="chart-content"></div></div>`;
    $("#chart-days").addEventListener("change", loadCharts);
    await loadCharts();
  } else if (activeTab === "needs") {
    el.innerHTML = `<div class="section-heading"><div><h2>Le prochain passage se prépare ici.</h2><p class="small-note">Ce qui doit être acheté, préparé ou apporté.</p></div>${button(icon("plus", 15) + " Ajouter un besoin", "new-need")}</div><div class="card">${state.needs.length ? state.needs.map(needRow).join("") : empty("Tout est prêt pour le moment", "Un produit ou du matériel manque ? Ajoutez-le ici.")}</div>`;
  } else if (activeTab === "info") {
    el.innerHTML = `<div class="grid two"><section class="card"><div class="inline between"><h2>Le bassin</h2>${p.membership !== "temporary" ? button("Compléter", "edit-pool", "", "secondary small") : ""}</div><dl>${[
      ["Type", kinds[p.kind]],
      ["Traitement", treatments[p.treatment]],
      ["Volume", p.volume ? p.volume + " m³" : "À préciser"],
      ["Filtration", p.filtration || "À préciser"],
      ["État saisonnier", p.winterized ? "Hivernée" : "En activité"],
      ["Adresse privée", p.address || "À préciser"],
    ]
      .map(
        ([k, v]) =>
          `<div class="row"><dt class="muted" style="font-size:12px;min-width:110px">${k}</dt><dd style="font-size:13px;margin:0">${esc(v)}</dd></div>`,
      )
      .join(
        "",
      )}</dl>${p.membership === "owner" ? `<a class="btn secondary" href="/api/pools/${p.id}/export" download>Exporter mon carnet</a>` : ""}${p.address ? `<a class="btn secondary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address + " " + (p.city || ""))}" target="_blank" rel="noopener noreferrer">${icon("map", 17)} Ouvrir l’itinéraire</a>` : ""}</section><div class="stack"><section class="card"><h2>Équipements & routine</h2><h3>Équipements</h3><p class="prose">${esc(p.equipment || "Marques, modèles et références à compléter.")}</p><h3>Routine d’entretien</h3><p class="prose">${esc(p.routine || "Les étapes propres à ce bassin apparaîtront ici.")}</p></section><section class="card"><h3>${icon("lock", 16)} Informations d’accès privées</h3><p class="prose">${esc(p.access_notes || "Aucune consigne renseignée.")}</p><p class="small-note">Visibles uniquement aux copropriétaires et professionnels autorisés.</p></section>${p.membership !== "owner" ? `<section class="card"><h3>Vos notes internes</h3><p class="small-note">Ces notes restent privées et ne sont pas partagées avec le client.</p>${button("Ouvrir mes notes", "private-notes", "", "secondary")}</section>` : ""}</div></div>`;
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
    ? button("Voir les passages précédents", "more-records", "", "secondary")
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
      `<details style="margin-top:25px"><summary>Consulter les valeurs en tableau</summary><div class="table-wrap"><table><thead><tr><th>Date</th>${keys.map((k) => `<th>${metrics[k].label}</th>`).join("")}</tr></thead><tbody>${d.items.map((v) => `<tr><td>${fmt(v.date)}</td>${keys.map((k) => `<td>${v[k] == null ? "—" : v[k].toFixed(2)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`
    : empty(
        "Vos premières courbes bientôt ici",
        "Partagez une analyse pour visualiser l’évolution de votre piscine.",
      );
}
async function accessTab(el) {
  const p = state.pool,
    approvals = p.manager
      ? (await api("/pools/" + p.id + "/approvals")).items
      : [];
  el.innerHTML = `<div class="section-heading"><div><h2>Les bonnes personnes, les bons accès.</h2><p class="small-note">Un seul pisciniste principal. Les interventions ponctuelles ont une date de fin.</p></div>${p.manager ? button("Inviter une personne", "invite-member") : ""}</div><section class="card">${p.members.map((m) => `<div class="row"><span class="avatar">${esc(m.name.slice(0, 2).toUpperCase())}</span><div class="grow"><h3>${esc(m.name)} ${m.user_id === state.user.id ? "(vous)" : ""}</h3><p>${managerKinds[m.kind]}${m.manager ? " · Responsable des accès" : ""}${m.expires_at ? " · jusqu’au " + fmt(m.expires_at) : ""}</p></div><div class="actions">${p.manager && m.kind === "owner" && !m.manager ? button("Transférer la responsabilité", "transfer-manager", `data-id="${m.id}" data-name="${esc(m.name)}"`, "ghost small") : ""}${!m.manager && (p.manager || m.user_id === state.user.id) ? button(m.user_id === state.user.id ? "Quitter" : "Retirer l’accès", "remove-member", `data-id="${m.id}" data-name="${esc(m.name)}"`, "ghost small") : ""}</div></div>`).join("")}</section>${p.invitations.length ? `<div class="section-heading"><h2>Invitations en attente</h2></div><section class="card">${p.invitations.map((i) => `<div class="row"><div class="grow"><h3>${esc(i.name)}</h3><p>${managerKinds[i.kind]} · expire le ${fmt(i.expires_at)}</p></div>${button("Annuler", "cancel-invite", `data-id="${i.id}"`, "ghost small")}</div>`).join("")}</section>` : ""}${approvals.length ? `<div class="section-heading"><h2>Interventions à autoriser ou à clôturer</h2></div><section class="card">${approvals.map((o) => `<div class="row"><div class="grow"><h3>${esc(o.company || o.name)}</h3><p>${o.kind === "transfer" ? "Changement de pisciniste principal" : "Intervention ponctuelle jusqu’au " + fmt(o.until_date)} · ${o.status === "accepted" ? "Active" : "Votre accord est attendu"}</p></div><div class="actions">${o.status === "awaiting_owner" ? button("Autoriser", "approve-offer", `data-id="${o.id}" data-accept="1" data-transfer="${o.kind === "transfer" ? "1" : "0"}"`, "primary small") + button("Refuser", "approve-offer", `data-id="${o.id}" data-accept="0"`, "ghost small") : button("Clôturer la mission", "finish-offer", `data-id="${o.id}"`, "secondary small")}</div></div>`).join("")}</section>` : ""}<div class="note" style="margin-top:22px">La suppression d’un accès empêche la consultation du dossier et de ses photos. Votre historique reste attaché à la piscine.</div>`;
}
on("invite-member", () => {
  const p = state.pool;
  modal(
    "Partager cette piscine",
    `${select("Accès à proposer", "kind", { owner: "Copropriétaire", principal: "Pisciniste principal", temporary: "Intervenant ponctuel" }, "owner")}${field("Identifiant exact de la personne", "username", "", "text", 'required maxlength="40" autocomplete="off" autocapitalize="none"')}<div class="inline" style="margin-bottom:16px"><input id="pro-search" class="search-input" placeholder="Trouver un pisciniste par nom" aria-label="Trouver un pisciniste"><button type="button" class="btn secondary" data-action="find-pro">Rechercher</button></div><div id="pro-results"></div>${field("Fin d’accès — uniquement pour un intervenant ponctuel", "until", addDays(today(), 14), "date", `min="${today()}" max="${addDays(today(), 90)}"`)}<p class="small-note">La personne doit avoir créé son compte et accepter l’invitation. Pour changer de pisciniste principal, retirez d’abord l’ancien accès ou utilisez une transmission de suivi.</p>`,
    async (b) => {
      await api("/pools/" + p.id + "/invitations", "POST", b);
      closeModal();
      toast("Invitation disponible dans son espace.");
      refresh();
    },
    "Envoyer l’invitation",
  );
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
on("approve-offer", (d) =>
  confirmAction(
    d.accept === "1"
      ? "Autoriser cette intervention"
      : "Refuser cette intervention",
    d.accept !== "1"
      ? "Le professionnel ne recevra aucun accès."
      : d.transfer === "1"
        ? "Le professionnel remplacera le pisciniste principal. L’ancien accès sera immédiatement retiré."
        : "Le professionnel pourra consulter le dossier et publier ses passages pendant la période indiquée.",
    () =>
      api("/offers/" + d.id + "/approve", "POST", { accept: d.accept === "1" }),
  ),
);
on("finish-offer", (d) =>
  confirmAction(
    "Clôturer la mission",
    "L’accès ponctuel sera retiré. Pour une transmission de suivi, le nouveau pisciniste principal restera en place.",
    () => api("/offers/" + d.id + "/finish", "POST", {}),
    "Clôturer",
  ),
);
on("edit-pool", () => {
  const p = state.pool;
  modal(
    "Compléter le dossier piscine",
    `${field("Nom", "name", p.name, "text", 'required maxlength="80"')}${select("Type de bassin", "kind", kinds, p.kind)}${cityField(p.city_code, p.city)}${field("Adresse privée", "address", p.address, "text", 'maxlength="300"')}<div class="grid two form-two">${field("Volume (m³)", "volume", p.volume, "number", 'min="0.1" max="100000" step="0.1"')}${select("Traitement", "treatment", treatments, p.treatment)}</div>${field("Filtration", "filtration", p.filtration, "text", 'maxlength="200"')}${area("Équipements, marques et références", "equipment", p.equipment, 'maxlength="4000"')}${area("Routine — une étape par ligne", "routine", p.routine, 'maxlength="2000"')}${area("Conseils au client entre deux passages", "client_advice", p.client_advice, 'maxlength="2000"')}${area("Consignes d’accès privées", "access_notes", p.access_notes, 'maxlength="1000"')}<label class="check"><input type="checkbox" name="winterized" ${p.winterized ? "checked" : ""}> Piscine actuellement hivernée</label><details><summary>Repères de suivi personnalisés</summary><p class="small-note">Renseignez uniquement des plages adaptées à ce bassin et à son usage. Aucun seuil générique ne certifie sa conformité.</p>${Object.entries(
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
        winterized: b.winterized === "on",
        thresholds,
      });
      closeModal();
      refresh();
      toast("Dossier mis à jour.");
    },
  );
});
on("private-notes", async () => {
  const r = await api("/pools/" + state.pool.id + "/notes");
  modal(
    "Vos notes internes",
    `${area("Notes personnelles — jamais partagées au client", "body", r.body, 'maxlength="4000"')}`,
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
  const p = await api("/pools/" + poolId);
  const actualKind = record?.kind || kind,
    id = record?.id || crypto.randomUUID();
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const value = record?.measured_at
    ? new Date(
        new Date(record.measured_at).getTime() -
          new Date().getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : local;
  const checklist = record?.checklist?.length
    ? record.checklist
    : (
        p.routine ||
        "Nettoyage du bassin\nContrôle de la filtration\nContrôle visuel des équipements"
      )
        .split("\n")
        .filter(Boolean)
        .map((label) => ({ label, done: false }));
  const draftKey =
    "pib-draft:" + state.user.id + ":" + poolId + ":" + actualKind;
  modal(
    actualKind === "visit"
      ? "Votre passage, en quelques gestes"
      : "Ajouter une analyse",
    `${record?.correction_of ? '<div class="note">Cette correction conservera la version originale dans le journal.</div>' : ""}${field("Date et heure de la mesure", "measured_at", value, "datetime-local", "required")}<div class="eyebrow">MESURES RELEVÉES</div><div class="grid two form-two">${Object.entries(
      metrics,
    )
      .filter(([k]) => k !== "bromine" || p.treatment === "bromine")
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
      )}</div>${field("Méthode de mesure — facultatif", "method", record?.method || "", "text", 'maxlength="100" placeholder="Bandelette, photomètre…"')}${actualKind === "visit" ? `<div class="eyebrow">LES GESTES EFFECTUÉS</div>${checklist.map((c, i) => `<label class="check"><input type="checkbox" name="check_${i}" ${c.done ? "checked" : ""}>${esc(c.label)}</label>`).join("")}${field("Durée du passage (minutes)", "duration", record?.duration || "", "number", 'min="1" max="1440"')}` : ""}${area("Produits effectivement ajoutés dans l’eau", "products", record?.products || "", 'maxlength="2000" placeholder="Produit exact, quantité et unité"')}${area("Observations partagées avec les personnes autorisées", "notes", record?.notes || "", 'maxlength="4000"')}<label class="field"><span>Photos du bassin (maximum 6 · 4 Mo chacune)</span><input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp"></label>${record?.photos?.length ? `<p class="small-note">${record.photos.length} photo(s) déjà attachée(s).</p>` : ""}<p class="small-note">Les champs non renseignés restent « non mesurés ». Les observations sont partagées ; utilisez les notes internes du dossier pour vos notes privées.</p><label class="check"><input type="checkbox" name="draft"> Conserver un brouillon, sans partager pour le moment</label>`,
    async (b, form) => {
      const values = {};
      for (const k of Object.keys(metrics)) if (b[k] !== "") values[k] = b[k];
      const payload = {
        id,
        kind: actualKind,
        measured_at: new Date(b.measured_at).toISOString(),
        readings: values,
        method: b.method,
        notes: b.notes,
        products: b.products,
        duration: b.duration,
        checklist:
          actualKind === "visit"
            ? checklist.map((c, i) => ({
                label: c.label,
                done: b["check_" + i] === "on",
              }))
            : [],
        appointment_id: appointment || record?.appointment_id,
        correction_of: record?.correction_of,
        revision: record?.revision || 1,
      };
      if (record?.id) await api("/records/" + id, "PUT", payload);
      else await api("/pools/" + poolId + "/records", "POST", payload);
      const files = $("[name=photos]", form).files;
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await api("/records/" + id + "/photos", "POST", fd);
      }
      if (b.draft !== "on")
        await api("/records/" + id + "/publish", "POST", {});
      sessionStorage.removeItem(draftKey);
      closeModal();
      toast(
        b.draft === "on"
          ? "Brouillon enregistré."
          : "Votre suivi a été partagé.",
      );
      if (location.hash.startsWith("#pool/" + poolId)) refresh();
      else go("pool/" + poolId);
    },
    "Terminer et partager",
  );
  const form = $("#mform");
  $("[name=draft]", form).addEventListener(
    "change",
    (e) =>
      ($("[type=submit]", form).textContent = e.target.checked
        ? "Enregistrer le brouillon"
        : "Terminer et partager"),
  );
  if (!record) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey));
      if (
        saved &&
        confirm("Reprendre la saisie non envoyée de cette piscine ?")
      )
        for (const [k, v] of Object.entries(saved)) {
          const input = $(`[name="${k}"]`, form);
          if (input && input.type !== "file")
            input.type === "checkbox"
              ? (input.checked = v === "on")
              : (input.value = v);
        }
    } catch {}
  }
  form.addEventListener("input", () => {
    const b = Object.fromEntries(new FormData(form));
    delete b.photos;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(b));
    } catch {}
  });
}
on("record-detail", async (d) => {
  const r = await api("/records/" + d.id);
  modal(
    r.kind === "visit" ? "Compte rendu de passage" : "Relevé d’analyse",
    `<div class="inline between"><p class="small-note">${fmt(r.measured_at, { year: "numeric", hour: "2-digit", minute: "2-digit" })}<br>${esc(r.author_name)}</p>${badge(r.published_at ? "Partagé" : "Brouillon", r.published_at ? "teal" : "amber")}</div><div class="metric-grid">${Object.entries(
      r.readings,
    )
      .map(([k, v]) =>
        metrics[k]
          ? `<div class="stat"><span>${metrics[k].label}</span><strong>${esc(v)}</strong><small>${metrics[k].unit}</small></div>`
          : "",
      )
      .join(
        "",
      )}</div>${r.method ? `<p class="small-note">Méthode : ${esc(r.method)}</p>` : ""}${r.checklist.length ? `<h3>Gestes effectués</h3>${r.checklist.map((c) => `<p class="small-note">${c.done ? "✓" : "—"} ${esc(c.label)}</p>`).join("")}` : ""}<h3>Observations</h3><p class="prose">${esc(r.notes || "Aucune observation complémentaire.")}</p>${r.products ? `<h3>Produits ajoutés</h3><p class="prose">${esc(r.products)}</p>` : ""}<div class="photo-grid">${r.photos.map((p) => `<a href="/api/photos/${p.id}" target="_blank" rel="noopener"><img src="/api/photos/${p.id}" alt="${esc(p.caption || "Photo du bassin lors du passage")}" loading="lazy"></a>`).join("")}</div><p class="small-note">Ce compte rendu décrit les mesures renseignées à la date indiquée. Il ne constitue pas une certification de conformité.</p>${button("Imprimer ce compte rendu", "print", "", "secondary")}`,
    null,
  );
});
on("print", () => window.print());
