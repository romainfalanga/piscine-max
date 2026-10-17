import { $, esc, api } from "./ui.js";
let maps = new Set();
const mounted = new WeakMap();
function removeMap(map) {
  if (!map || !maps.has(map)) return;
  const el = map.getContainer();
  if (mounted.get(el) === map) {
    map.remove();
    mounted.delete(el);
  }
  maps.delete(map);
}
export async function mapAt(
  el,
  lat,
  lng,
  { zoom = 16, approximate = false } = {},
) {
  if (!document.querySelector("[data-leaflet-style]")) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/platform/leaflet.css";
    css.dataset.leafletStyle = "true";
    document.head.prepend(css);
  }
  await import("./leaflet.js");
  if (!el.isConnected) return null;
  removeMap(mounted.get(el));
  const L = window.L,
    map = L.map(el, { scrollWheelZoom: false }).setView(
      [lat, lng],
      approximate ? 11 : zoom,
    );
  maps.add(map);
  mounted.set(el, map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    referrerPolicy: "strict-origin-when-cross-origin",
  })
    .on("tileerror", () => {
      const status = el.parentElement?.querySelector("[data-map-status]");
      if (status)
        status.textContent =
          "Fond de carte indisponible. L’adresse et l’itinéraire restent accessibles.";
    })
    .addTo(map);
  L.marker([lat, lng], {
    icon: L.divIcon({
      className: "address-pin",
      html: "<span></span>",
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    }),
  }).addTo(map);
  map.invalidateSize();
  return map;
}
function dispose() {
  for (const m of maps) {
    if (!m.getContainer().isConnected) {
      removeMap(m);
    }
  }
}
window.addEventListener("hashchange", () => setTimeout(dispose, 0));
export function addressField(p = {}) {
  const value =
    p.latitude != null && p.longitude != null
      ? {
          address: p.address,
          city: p.city,
          city_code: p.city_code,
          latitude: p.latitude,
          longitude: p.longitude,
          type:
            p.location_precision === "municipality"
              ? "municipality"
              : "address",
        }
      : null;
  return `<div class="address-field"><label class="field"><span>Adresse de la piscine</span><input id="pool-address" name="address" type="text" value="${esc(p.address || "")}" autocomplete="off" maxlength="300" placeholder="Numéro, rue et ville" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="address-results" aria-describedby="address-help"></label><input type="hidden" name="location_json" value="${esc(value ? JSON.stringify(value) : "")}"><div id="address-results" role="listbox" aria-label="Adresses proposées" hidden></div><p id="address-help" class="small-note" role="status">${value ? "Adresse enregistrée." : "Saisissez une adresse et choisissez une suggestion. Vous pourrez aussi l’ajouter plus tard."}</p><div id="address-preview" class="address-preview" ${value ? "" : "hidden"}></div><p class="small-note" data-map-status role="status"></p><p class="small-note address-credit">Recherche d’adresses en France avec l’IGN.</p></div>`;
}
export function readAddress(b) {
  if (b.address?.trim() && !b.location_json)
    throw new Error(
      "Choisissez une adresse dans les suggestions, ou laissez ce champ vide pour l’ajouter plus tard.",
    );
  return b.location_json ? JSON.parse(b.location_json) : null;
}
export function wireAddress() {
  const input = $("#pool-address"),
    results = $("#address-results"),
    preview = $("#address-preview"),
    hidden = $("[name=location_json]"),
    help = $("#address-help");
  let timer,
    ticket = 0,
    map = null,
    items = [];
  const showMap = async (l) => {
    if (map) {
      removeMap(map);
    }
    preview.hidden = false;
    map = await mapAt(preview, l.latitude, l.longitude, {
      approximate: l.type === "municipality",
    });
  };
  if (hidden.value) showMap(JSON.parse(hidden.value));
  input.addEventListener("input", () => {
    clearTimeout(timer);
    ticket++;
    hidden.value = "";
    results.hidden = true;
    input.setAttribute("aria-expanded", "false");
    preview.hidden = true;
    help.textContent = "";
    const q = input.value.trim();
    if (q.length < 4) {
      help.textContent = "Saisissez au moins 4 caractères.";
      return;
    }
    const current = ticket;
    timer = setTimeout(async () => {
      help.textContent = "Recherche de l’adresse…";
      try {
        const r = await api("/addresses?q=" + encodeURIComponent(q));
        if (current !== ticket || !input.isConnected) return;
        items = r.items;
        results.innerHTML = items
          .map(
            (p, i) =>
              `<button type="button" role="option" aria-selected="false" data-index="${i}">${esc(p.address)}</button>`,
          )
          .join("");
        results.hidden = !items.length;
        input.setAttribute("aria-expanded", String(!!items.length));
        help.textContent = items.length
          ? "Choisissez votre adresse."
          : "Aucune adresse trouvée. Précisez la rue et la ville.";
      } catch (e) {
        if (current === ticket) help.textContent = e.message;
      }
    }, 350);
  });
  results.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-index]");
    if (!btn) return;
    const l = items[Number(btn.dataset.index)];
    ticket++;
    input.value = l.address;
    hidden.value = JSON.stringify(l);
    results.hidden = true;
    input.setAttribute("aria-expanded", "false");
    help.textContent =
      l.type === "municipality"
        ? "Ville localisée. Précisez la rue pour positionner le bassin."
        : "Adresse localisée sur la carte.";
    showMap(l);
    input.focus();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && !results.hidden) {
      e.preventDefault();
      results.querySelector("button")?.focus();
    }
    if (e.key === "Escape") {
      results.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }
  });
  results.addEventListener("keydown", (e) => {
    const buttons = [...results.querySelectorAll("button")],
      i = buttons.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      buttons[
        (i + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length
      ]?.focus();
    }
    if (e.key === "Escape") {
      results.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.focus();
    }
  });
  input.closest("dialog").addEventListener(
    "close",
    () => {
      clearTimeout(timer);
      ticket++;
      if (map) {
        removeMap(map);
      }
    },
    { once: true },
  );
}
export const itinerary = (p) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.location_precision === "address" && p.latitude != null ? `${p.latitude},${p.longitude}` : [p.address, p.city].filter(Boolean).join(", "))}`;
