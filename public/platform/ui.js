export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const state = {
  user: null,
  mode: "client",
  route: "",
  pool: null,
  records: [],
  appointments: [],
  notices: [],
  needs: [],
  procedures: [],
};
const handlers = new Map();
export const on = (action, handler) => handlers.set(action, handler);
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  e.preventDefault();
  const fn = handlers.get(target.dataset.action);
  if (!fn) return;
  try {
    await fn(target.dataset, target);
  } catch (err) {
    toast(err.message, "error");
  }
});
export async function api(path, method = "GET", body) {
  const options = { method, credentials: "same-origin", headers: {} };
  if (body instanceof FormData) options.body = body;
  else if (body !== undefined) {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }
  const r = await fetch("/api" + path, options);
  const b = await r
    .json()
    .catch(() => ({ error: "Réponse inattendue. Réessaie." }));
  if (!r.ok) {
    const e = new Error(b.error || "Une erreur est survenue.");
    e.status = r.status;
    throw e;
  }
  return b;
}
export function toast(message, kind = "success") {
  const t = $("#toast");
  t.textContent = message;
  t.className = "show " + kind;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ""), 4500);
}
export const go = (route) => {
  location.hash = route;
};
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
export const addDays = (value, n) =>
  new Date(Date.parse(value + "T12:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const fmt = (value, options = {}) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        ...options,
      }).format(new Date(value.length === 10 ? value + "T12:00:00" : value))
    : "Non renseigné";
export const badge = (text, tone = "") =>
  `<span class="badge ${tone}">${esc(text)}</span>`;
export const empty = (title, text, action = "") =>
  `<div class="empty"><div class="empty-ripple">${icon("water", 36)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
export const button = (label, action, extra = "", kind = "primary") =>
  `<button class="btn ${kind}" data-action="${action}" ${extra}>${label}</button>`;
export const icon = (name, size = 20) => {
  const shapes = {
    water:
      '<path d="M2 8q3-4 6 0t6 0t6 0M2 14q3-4 6 0t6 0t6 0M2 20q3-4 6 0t6 0t6 0"/>',
    home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2"/>',
    pool: '<path d="M3 18q3-3 6 0t6 0t6 0M5 14V5a2 2 0 0 1 4 0m5 9V5a2 2 0 0 1 4 0M5 8h9m-9 4h9"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a6 6 0 0 1 3 5v2"/>',
    bell: '<path d="M5 17V9a7 7 0 0 1 14 0v8l2 2H3zm5 5h4"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    settings:
      '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    help: '<path d="M3 4h18v13H9l-6 4z"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4m0 2v.1"/>',
    chart: '<path d="M4 3v18h17M7 15l4-5 4 3 5-8"/>',
    box: '<path d="m3 7 9-4 9 4v11l-9 4-9-4zm0 0 9 4 9-4m-9 4v11M7 5l9 4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/>',
    book: '<path d="M12 5Q6 2 2 5v15q4-3 10 0 6-3 10 0V5q-4-3-10 0zm0 0v15"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    logout: '<path d="M9 4H3v16h6m2-8h11m-4-4 4 4-4 4"/>',
    close: '<path d="m5 5 14 14M5 19 19 5"/>',
    camera:
      '<path d="m8 5 2-3h4l2 3h5v15H3V5z"/><circle cx="12" cy="12" r="4"/>',
    map: '<path d="M19 9c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 14 0z"/><circle cx="12" cy="9" r="2"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.water}</svg>`;
};
export function field(label, name, value = "", type = "text", extra = "") {
  return `<label class="field"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
export function area(label, name, value = "", extra = "") {
  return `<label class="field"><span>${esc(label)}</span><textarea name="${name}" rows="3" ${extra}>${esc(value)}</textarea></label>`;
}
export function select(label, name, options, value = "") {
  return `<label class="field"><span>${esc(label)}</span><select name="${name}" aria-label="${esc(label)}">${Object.entries(
    options,
  )
    .map(
      ([k, v]) =>
        `<option value="${esc(k)}" ${k === String(value) ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join("")}</select></label>`;
}
export function modal(title, body, submit, label = "Enregistrer") {
  closeModal();
  const root = $("#modal");
  root.innerHTML = `<dialog><form id="mform"><div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body">${body}<p class="form-error" role="alert"></p></div>${submit ? `<div class="modal-foot"><button type="button" class="btn ghost" data-action="close">Annuler</button><button class="btn primary" type="submit">${esc(label)}</button></div>` : ""}</form></dialog>`;
  const d = $("dialog", root);
  d.addEventListener("close", () => d.remove());
  d.showModal();
  if (submit)
    $("#mform").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target,
        btn = $("[type=submit]", form);
      btn.disabled = true;
      $(".form-error", form).textContent = "";
      try {
        await submit(Object.fromEntries(new FormData(form)), form);
      } catch (err) {
        $(".form-error", form).textContent = err.message;
      } finally {
        if (btn.isConnected) btn.disabled = false;
      }
    });
  return d;
}
export function closeModal() {
  const d = $("dialog");
  if (d) d.close();
  $("#modal")?.replaceChildren();
}
on("close", closeModal);
export function cityField(code = "", name = "") {
  return `<div class="field"><label for="city-search">Commune <span class="muted">(localisation approximative)</span></label><div class="inline"><input id="city-search" placeholder="Ville ou code postal" value="${esc(name)}"><button class="btn secondary" type="button" data-action="find-city">Rechercher</button></div><select name="city_code" aria-label="Commune sélectionnée"><option value="${esc(code)}">${esc(name || "Choisir une commune")}</option></select></div>`;
}
on("find-city", async () => {
  const q = $("#city-search").value;
  if (q.length < 2) return;
  const cities = await api("/places?q=" + encodeURIComponent(q));
  const sel = $("[name=city_code]");
  sel.innerHTML = cities.length
    ? cities
        .map(
          (c) =>
            `<option value="${esc(c.code)}">${esc(c.nom)} · ${esc(c.codesPostaux?.[0] || "")}</option>`,
        )
        .join("")
    : '<option value="">Aucune commune trouvée</option>';
});
export const kinds = {
  private: "Particulier",
  rental: "Location",
  residence: "Copropriété",
  hotel: "Hôtel",
  camping: "Camping",
  public: "Bassin collectif",
  other: "Autre",
};
export const treatments = {
  unknown: "Je ne sais pas encore",
  chlorine: "Chlore",
  salt: "Sel / électrolyse",
  bromine: "Brome",
  oxygen: "Oxygène actif",
  other: "Autre",
};
export const specs = {
  maintenance: "Entretien",
  water: "Qualité de l’eau",
  filtration: "Filtration",
  electricity: "Électricité",
  leak: "Recherche de fuite",
  renovation: "Rénovation",
  winter: "Hivernage",
  opening: "Remise en route",
};
export const metrics = {
  ph: { label: "pH", unit: "", max: 14, color: "#0e7e89" },
  chlorine: { label: "Chlore", unit: "mg/L", max: 30, color: "#687abb" },
};
export const refresh = () =>
  window.dispatchEvent(new HashChangeEvent("hashchange"));
export function confirmAction(title, body, fn, label = "Confirmer") {
  modal(
    title,
    `<p>${esc(body)}</p>`,
    async () => {
      await fn();
      closeModal();
      refresh();
    },
    label,
  );
}
