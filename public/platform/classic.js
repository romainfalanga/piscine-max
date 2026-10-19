import { itinerary } from "./maps.js";
import {
  $,
  esc,
  state,
  on,
  api,
  icon,
  button,
  empty,
  badge,
  fmt,
  refresh,
} from "./ui.js";

export const classicPages = { clients, map: mapPage, stats };
let directory = [],
  next = null,
  query = "",
  currentMap = null;
let mapView = "list",
  mapExploring = false;
const routeLink = itinerary;
const heading = (title, subtitle, action = "") =>
  `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
function toolbar() {
  return `<form id="directory-search" class="directory-toolbar"><input name="q" class="search-input" aria-label="Rechercher un client, une piscine ou une ville" placeholder="Client, piscine ou ville…" value="${esc(query)}"><button class="btn secondary" type="submit">Rechercher</button></form>`;
}
async function loadDirectory(append = false) {
  const r = await api(
    "/pools?mode=pro&limit=50&q=" +
      encodeURIComponent(query) +
      (append && next ? "&cursor=" + encodeURIComponent(next) : ""),
  );
  directory = append ? [...directory, ...r.items] : r.items;
  next = r.next;
}
function wireSearch(main, renderer) {
  $("#directory-search", main).addEventListener("submit", async (e) => {
    e.preventDefault();
    query = new FormData(e.target).get("q").trim();
    await renderer(main);
  });
}
function poolLink(p) {
  return `<a href="#pool/${esc(p.id)}" class="client-pool"><span><strong>${esc(p.name)}</strong><small>${esc(p.city || "Commune à compléter")}${p.volume ? " · " + esc(p.volume) + " m³" : ""}</small><small>${p.last_reading ? "Dernier suivi : " + fmt(p.last_reading) : "Aucun relevé partagé"}</small></span>${icon("arrow", 17)}</a>`;
}
function clientCards() {
  // Shared pools appear under every owner; there is still only one pool dossier.
  const groups = new Map();
  for (const p of directory) {
    for (const owner of p.owners || []) {
      if (!groups.has(owner.id)) groups.set(owner.id, { ...owner, pools: [] });
      groups.get(owner.id).pools.push(p);
    }
  }
  const people = [...groups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
  return (
    directory
      .filter((p) => !p.owners?.length)
      .map(
        (p) =>
          `<section class="card"><h2>Client à associer</h2><p class="small-note">Invitez le client depuis la piscine.</p>${poolLink(p)}</section>`,
      )
      .join("") +
      people
        .map(
          (c) =>
            `<section class="card"><div class="client-header"><span class="client-avatar">${esc(c.name.slice(0, 2).toUpperCase())}</span><div><h2>${esc(c.name)}</h2></div></div>${c.pools.map(poolLink).join("")}</section>`,
        )
        .join("") ||
    empty(
      "Aucun client trouvé",
      "Créez une piscine ou demandez à rejoindre celle du client.",
      button("Ajouter un client", "invite-client", "", "secondary"),
    )
  );
}
function moreButton() {
  return next
    ? button(
        "Afficher les piscines suivantes",
        "directory-more",
        "",
        "secondary",
      )
    : "";
}
async function clients(main) {
  await loadDirectory();
  const pending = await api("/connections");
  main.innerHTML =
    heading(
      "Clients",
      "Vos clients et les piscines qu’ils vous ont confiées.",
      button(icon("plus", 16) + " Ajouter un client", "invite-client"),
    ) +
    toolbar() +
    (pending.outgoing.length
      ? `<section class="card" style="margin-bottom:20px"><h2>Demandes envoyées</h2>${pending.outgoing.map((r) => `<div class="row"><div class="grow"><strong>${esc(r.name)}</strong><p class="small-note">En attente du choix de sa piscine.</p></div>${button("Annuler", "cancel-connection", `data-id="${r.id}"`, "ghost small")}</div>`).join("")}</section>`
      : "") +
    `<div id="client-cards" class="clients-grid">${clientCards()}</div><div id="directory-more" style="margin-top:20px">${moreButton()}</div>`;
  wireSearch(main, clients);
}
on("directory-more", async () => {
  if (!next) return;
  await loadDirectory(true);
  if (state.route === "map") renderMapContent();
  else if ($("#client-cards")) $("#client-cards").innerHTML = clientCards();
  if ($("#directory-more")) $("#directory-more").innerHTML = moreButton();
});
async function mapPage(main) {
  await loadDirectory();
  main.innerHTML =
    heading(
      "Carte des piscines",
      "Retrouvez les bassins suivis et ouvrez votre itinéraire.",
    ) +
    toolbar() +
    `<div class="map-view-switch" role="group" aria-label="Affichage des piscines"><button data-action="map-view" data-view="list" aria-pressed="${mapView === "list"}">${icon("pool", 18)} Liste</button><button data-action="map-view" data-view="map" aria-pressed="${mapView === "map"}">${icon("map", 18)} Carte</button></div><div class="map-layout" data-view="${mapView}"><section class="map-panel" aria-label="Localisation des piscines"><div class="map-interaction-bar"><p>Faites défiler pour parcourir la page.</p><button data-action="map-explore" aria-pressed="false">Explorer la carte</button></div><div id="pool-map" class="pool-map" role="region" aria-label="Carte des piscines suivies"></div><p id="map-status" class="small-note" role="status"></p><p class="map-precision">Les fiches sans adresse précise sont placées au niveau de la commune.</p></section><section class="map-directory" aria-label="Piscines suivies"><h2 class="map-list-title">Vos piscines <span>${directory.length}${next ? "+" : ""}</span></h2><div id="map-pool-list" class="map-pool-list"></div></section></div><div id="directory-more" style="margin-top:20px">${moreButton()}</div>`;
  wireSearch(main, mapPage);
  if (!document.querySelector("[data-leaflet-style]")) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/platform/leaflet.css";
    css.dataset.leafletStyle = "true";
    // Classic overrides must retain precedence over vendor defaults.
    document.head.insertBefore(
      css,
      document.querySelector('link[href="/platform/classic.css"]'),
    );
  }
  await import("./leaflet.js");
  if (state.route !== "map" || !$("#pool-map")) return;
  renderMapContent();
}
function renderMapContent() {
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
  const L = window.L;
  currentMap = L.map("pool-map", {
    scrollWheelZoom: false,
    dragging: !matchMedia("(max-width: 700px)").matches,
    touchZoom: false,
    doubleClickZoom: !matchMedia("(max-width: 700px)").matches,
  }).setView([46.6, 2.3], 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    referrerPolicy: "strict-origin-when-cross-origin",
  })
    .on("tileerror", () => {
      const status = $("#map-status");
      if (status)
        status.textContent =
          "Le fond de carte n’a pas pu être chargé. Les fiches et itinéraires restent accessibles.";
    })
    .addTo(currentMap);
  const towns = new Map();
  for (const p of directory) {
    if (p.latitude == null || p.longitude == null) continue;
    const key = `${p.latitude},${p.longitude}`;
    if (!towns.has(key)) towns.set(key, []);
    towns.get(key).push(p);
  }
  const bounds = [];
  for (const pools of towns.values()) {
    const p = pools[0],
      coords = [p.latitude, p.longitude];
    bounds.push(coords);
    L.marker(coords, {
      title: p.location_precision === "address" ? p.name : p.city,
      icon: L.divIcon({
        className: "classic-map-marker",
        html: String(pools.length),
        iconSize: [32, 32],
      }),
    })
      .bindPopup(
        `<strong>${esc(p.location_precision === "address" ? p.address : p.city)}</strong>${pools.map(poolLink).join("")}`,
      )
      .addTo(currentMap);
  }
  if (bounds.length)
    currentMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  $("#map-pool-list").innerHTML =
    directory
      .map(
        (p) =>
          `<section class="card"><h3><a href="#pool/${esc(p.id)}">${esc(p.name)}</a></h3><p>${esc((p.owners || []).map((c) => c.name).join(", "))}</p><p>${esc(p.address || "Adresse non renseignée")}${p.city ? " · " + esc(p.city) : ""}</p>${p.city || p.address ? `<a class="btn secondary small" href="${esc(routeLink(p))}" target="_blank" rel="noopener noreferrer">${icon("map", 15)} Itinéraire</a>` : ""}</section>`,
      )
      .join("") ||
    empty("Aucune piscine suivie", "Vos piscines partagées apparaîtront ici.");
  mapExploring = false;
  syncMapInteraction();
  currentMap.invalidateSize();
}
function syncMapInteraction() {
  if (!currentMap) return;
  const mobile = matchMedia("(max-width: 700px)").matches;
  const enabled = !mobile || mapExploring;
  for (const handler of [
    currentMap.dragging,
    currentMap.touchZoom,
    currentMap.doubleClickZoom,
  ]) {
    if (enabled) handler.enable();
    else handler.disable();
  }
  currentMap.getContainer().classList.toggle("map-scrollable", !enabled);
  const control = $('[data-action="map-explore"]');
  if (control) {
    control.setAttribute("aria-pressed", String(mapExploring));
    control.textContent = mapExploring
      ? "Terminer l’exploration"
      : "Explorer la carte";
    control.previousElementSibling.textContent = mapExploring
      ? "Déplacez ou zoomez la carte."
      : "Faites défiler pour parcourir la page.";
  }
}
on("map-view", (d) => {
  mapView = d.view;
  mapExploring = false;
  const layout = $(".map-layout");
  if (!layout || !currentMap) return;
  layout.dataset.view = mapView;
  document
    .querySelectorAll('[data-action="map-view"]')
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.view === mapView)),
    );
  syncMapInteraction();
  requestAnimationFrame(() => {
    if (!currentMap) return;
    currentMap.invalidateSize();
    const points = directory
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude, p.longitude]);
    if (points.length)
      currentMap.fitBounds(points, { padding: [32, 32], maxZoom: 17 });
  });
});
on("map-explore", () => {
  mapExploring = !mapExploring;
  syncMapInteraction();
});
matchMedia("(max-width: 700px)").addEventListener("change", () => {
  mapExploring = false;
  syncMapInteraction();
  currentMap?.invalidateSize();
});
window.addEventListener("hashchange", () => {
  if (location.hash !== "#map" && currentMap) {
    currentMap.remove();
    currentMap = null;
  }
});
async function stats(main) {
  const r = await api("/activity-summary"),
    hours = (m) =>
      (m / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " h";
  main.innerHTML =
    heading(
      "Statistiques",
      "Vos comptes rendus publiés pour les piscines que vous suivez actuellement.",
      '<a href="#planning" class="btn secondary">Retour à l’agenda</a>',
    ) +
    `<div class="grid three"><div class="stat"><span>PASSAGES EFFECTUÉS</span><strong>${r.visits}</strong><small>${hours(r.minutes)} d’intervention enregistrées</small></div><div class="stat"><span>PISCINES SUIVIES</span><strong>${r.pools}</strong><small>Accès actifs uniquement</small></div><div class="stat"><span>CLIENTS</span><strong>${r.clients}</strong><small>Chaque copropriétaire est compté une fois</small></div></div><div class="grid two" style="margin-top:20px"><section class="card"><h2>Activité par mois</h2>${r.months.length ? `<table class="stats-table"><thead><tr><th>Mois</th><th>Passages</th><th>Durée</th></tr></thead><tbody>${r.months.map((m) => `<tr><td>${fmt(m.month + "-01", { month: "long", year: "numeric", day: undefined })}</td><td>${m.visits}</td><td>${hours(m.minutes)}</td></tr>`).join("")}</tbody></table>` : empty("Pas encore de passage publié", "Les statistiques se remplissent en terminant vos entretiens.")}</section><section class="card"><h2>Piscines les plus visitées</h2>${r.busiest.map((p) => `<a href="#pool/${esc(p.id)}" class="client-pool"><strong>${esc(p.name)}</strong><span>${p.visits} passage${p.visits > 1 ? "s" : ""} · ${hours(p.minutes)}</span></a>`).join("") || '<p class="small-note">Les visites terminées apparaîtront ici.</p>'}</section></div>`;
}
