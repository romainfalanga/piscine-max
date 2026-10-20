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
  go,
  toast,
  confirmAction,
} from "./ui.js";

export const classicPages = { clients, map: mapPage, stats };
let directory = [],
  next = null,
  query = "",
  currentMap = null;
let mapQuery = "",
  mapRequest = 0,
  mapTimer,
  mapMarkers,
  mapResize;
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
  if ($("#client-cards")) $("#client-cards").innerHTML = clientCards();
  if ($("#directory-more")) $("#directory-more").innerHTML = moreButton();
});
export function disposeMap(resetSearch = false) {
  if (resetSearch) mapQuery = "";
  clearTimeout(mapTimer);
  mapRequest++;
  mapResize?.disconnect();
  mapResize = null;
  currentMap?.remove();
  currentMap = null;
  mapMarkers = null;
}
async function mapPage(main) {
  disposeMap();
  main.innerHTML = `<section class="full-map" aria-label="Carte des piscines"><h1 class="sr-only">Carte des piscines</h1><div id="pool-map" role="region" aria-label="Carte des piscines suivies"></div><form id="map-search" class="map-search" role="search">${icon("map", 20)}<input type="search" name="q" maxlength="100" aria-label="Rechercher un client, une piscine ou une ville" placeholder="Client, piscine ou ville…" autocomplete="off" value="${esc(mapQuery)}"><button type="submit" aria-label="Rechercher">${icon("search", 20)}</button></form><p id="map-results" class="sr-only" role="status"></p><p id="map-status" class="map-notice" role="status" hidden></p></section>`;
  if (!document.querySelector("[data-leaflet-style]")) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/platform/leaflet.css";
    css.dataset.leafletStyle = "true";
    document.head.insertBefore(
      css,
      document.querySelector('link[href="/platform/classic.css"]'),
    );
  }
  await import("./leaflet.js");
  if (state.route !== "map" || !$("#pool-map")) return;
  const L = window.L;
  currentMap = L.map("pool-map", {
    scrollWheelZoom: true,
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    zoomControl: false,
  }).setView([46.6, 2.3], 5);
  L.control.zoom({ position: "bottomright" }).addTo(currentMap);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    referrerPolicy: "strict-origin-when-cross-origin",
  })
    .on("tileerror", () => {
      const status = $("#map-status");
      if (status) {
        status.hidden = false;
        status.textContent =
          "Le fond de carte est indisponible. Les repères des piscines restent accessibles.";
      }
    })
    .addTo(currentMap);
  mapMarkers = L.layerGroup().addTo(currentMap);
  mapResize = new ResizeObserver(() => currentMap?.invalidateSize());
  mapResize.observe($("#pool-map"));
  const search = $("#map-search"),
    input = $("input", search);
  const filter = () => {
    clearTimeout(mapTimer);
    mapQuery = input.value.trim();
    return filterMap();
  };
  search.addEventListener("submit", (e) => {
    e.preventDefault();
    filter();
  });
  input.addEventListener("input", () => {
    clearTimeout(mapTimer);
    mapRequest++; // Ignore a previous response as soon as the text changes.
    mapTimer = setTimeout(filter, 250);
  });
  await filterMap();
}
async function filterMap() {
  const request = ++mapRequest,
    q = mapQuery;
  const results = $("#map-results");
  if (results) results.textContent = "Recherche des piscines…";
  $("#map-search")?.setAttribute("aria-busy", "true");
  try {
    let cursor = null;
    const pools = [];
    do {
      const r = await api(
        "/pools?mode=pro&limit=50&q=" +
          encodeURIComponent(q) +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (request !== mapRequest || state.route !== "map" || !currentMap)
        return;
      pools.push(...r.items);
      cursor = r.next;
    } while (cursor);
    mapMarkers.clearLayers();
    const groups = new Map();
    for (const p of pools) {
      if (p.latitude == null || p.longitude == null) continue;
      const key = `${p.latitude},${p.longitude}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    const bounds = [];
    for (const group of groups.values()) {
      const p = group[0],
        coords = [p.latitude, p.longitude];
      bounds.push(coords);
      window.L.marker(coords, {
        title: p.location_precision === "address" ? p.name : p.city,
        icon: window.L.divIcon({
          className: "classic-map-marker",
          html: String(group.length),
          iconSize: [36, 36],
        }),
      })
        .bindPopup(
          `<strong>${esc(p.location_precision === "address" ? p.address : p.city)}</strong>${group.map((p) => poolLink(p) + (p.address || p.city ? `<a class="map-route-link" href="${esc(routeLink(p))}" target="_blank" rel="noopener noreferrer">${icon("map", 16)} Itinéraire</a>` : "")).join("")}`,
        )
        .addTo(mapMarkers);
    }
    if (bounds.length)
      currentMap.fitBounds(bounds, {
        paddingTopLeft: [30, 95],
        paddingBottomRight: [45, 55],
        maxZoom: 17,
      });
    results.textContent = `${pools.length} piscine${pools.length > 1 ? "s" : ""} trouvée${pools.length > 1 ? "s" : ""}.`;
    results.className = pools.length ? "sr-only" : "map-empty";
    if (!pools.length)
      results.textContent = q
        ? "Aucune piscine ne correspond à votre recherche."
        : "Vos piscines apparaîtront ici une fois ajoutées dans Clients.";
    else if (!bounds.length) {
      results.className = "map-empty";
      results.textContent =
        "Ajoutez une adresse aux piscines pour les situer sur la carte.";
    }
  } catch (err) {
    if (request !== mapRequest || state.route !== "map") return;
    results.className = "map-empty";
    results.textContent = err.message;
  } finally {
    if (request === mapRequest)
      $("#map-search")?.setAttribute("aria-busy", "false");
  }
}
window.addEventListener("hashchange", () => {
  if (location.hash.split("/")[0] !== "#map") disposeMap();
});
let businessCursor = null;
function demandRows(items) {
  return items
    .map(
      (r) =>
        `<article class="maintenance-demand"><div><p class="small-note">Demande du ${fmt(r.created_at)}</p><h3>${esc(r.pool_name)}</h3><p>${esc(r.city || "Commune à préciser")}</p><p>${esc(r.email)}</p><a class="demand-phone" href="tel:${esc(r.phone)}">${esc(r.phone)}</a></div><div class="actions">${button("Prendre en charge", "accept-maintenance", `data-id="${r.id}"`, "primary small")}${button("Ne pas donner suite", "decline-maintenance", `data-id="${r.id}"`, "ghost small")}</div></article>`,
    )
    .join("");
}
async function stats(main) {
  const [b, activity] = await Promise.all([
    api("/business-summary"),
    api("/activity-summary"),
  ]);
  businessCursor = b.requests.next;
  const metrics = [
    [
      b.platform_accounts,
      "Comptes clients",
      "Tous les comptes inscrits, hors votre compte",
    ],
    [
      b.pool_owners,
      "Propriétaires de piscines",
      "Au moins une piscine active, chacun compté une fois",
    ],
    [
      b.maintenance_clients,
      "Mes clients suivis",
      "Propriétaires des piscines dont vous assurez l’entretien",
    ],
    [
      b.followed_pools,
      "Piscines en entretien",
      "Les bassins de votre tournée actuelle",
    ],
  ];
  main.innerHTML =
    heading(
      "Tableau de bord",
      "Votre activité Peace in Blue et les demandes d’entretien régulier.",
      button("Ajouter un client", "request-client", "", "secondary"),
    ) +
    `<section class="business-metrics" aria-label="Utilisation de la plateforme">${metrics.map(([value, label, help]) => `<div><strong>${value}</strong><h2>${label}</h2><p>${help}</p></div>`).join("")}</section><section class="business-requests"><div class="section-heading"><div><h2>Demandes d’entretien régulier <span class="request-count">${b.pending_requests}</span></h2><p class="small-note">Contactez le client pour convenir des modalités. Prendre en charge ouvre son dossier, sans programmer de passage.</p></div></div><div id="maintenance-demands">${b.requests.items.length ? demandRows(b.requests.items) : '<p class="business-empty">Aucune demande en attente. Les nouvelles demandes apparaîtront ici.</p>'}</div><div id="maintenance-more">${businessCursor ? button("Voir les demandes suivantes", "more-maintenance", "", "secondary") : ""}</div></section><section class="business-activity"><div class="section-heading"><h2>Votre activité d’entretien</h2><a href="#planning" class="btn secondary small">Ouvrir l’agenda</a></div><p><strong>${activity.visits}</strong> passage${activity.visits > 1 ? "s" : ""} publié${activity.visits > 1 ? "s" : ""} sur vos piscines actuellement suivies.</p>${activity.months.length ? `<table class="stats-table"><thead><tr><th>Mois</th><th>Passages</th></tr></thead><tbody>${activity.months.map((m) => `<tr><td>${fmt(m.month + "-01", { month: "long", year: "numeric", day: undefined })}</td><td>${m.visits}</td></tr>`).join("")}</tbody></table>` : '<p class="small-note">Terminez votre premier entretien pour retrouver votre activité ici.</p>'}</section>`;
}
on("more-maintenance", async () => {
  if (!businessCursor) return;
  const b = await api(
    "/business-summary?cursor=" + encodeURIComponent(businessCursor),
  );
  businessCursor = b.requests.next;
  $("#maintenance-demands").insertAdjacentHTML(
    "beforeend",
    demandRows(b.requests.items),
  );
  $("#maintenance-more").innerHTML = businessCursor
    ? button("Voir les demandes suivantes", "more-maintenance", "", "secondary")
    : "";
});
on("accept-maintenance", (d) =>
  confirmAction(
    "Prendre en charge cette piscine ?",
    "Le client vous a autorisé à accéder à son dossier pour l’entretien régulier. Convenez des modalités avec lui avant de planifier un passage.",
    async () => {
      const r = await api(
        "/maintenance-requests/" + d.id + "/respond",
        "POST",
        { accept: true },
      );
      toast("Piscine ajoutée à votre tournée.");
      go("pool/" + r.pool_id);
    },
    "Prendre en charge",
  ),
);
on("decline-maintenance", (d) =>
  confirmAction(
    "Ne pas donner suite à cette demande ?",
    "Le client sera informé dans son espace. Son carnet restera autonome.",
    async () => {
      await api("/maintenance-requests/" + d.id + "/respond", "POST", {
        accept: false,
      });
      refresh();
    },
    "Confirmer",
  ),
);
