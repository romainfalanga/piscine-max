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
} from "./ui.js";
import { poolPages } from "./pools.js";
import { proPages } from "./pro.js";
import { toolPages } from "./tools.js";
const brand = `<span class="brand-mark">${icon("water", 25)}</span><span><strong>Peace in Blue</strong><small>Le suivi, simplement.</small></span>`;
let authTab = "login",
  signupRole = "client",
  renderId = 0;
function authScreen() {
  state.user = null;
  document.title = "Peace in Blue — Votre piscine, en confiance";
  $("#app").innerHTML =
    `<div class="auth"><section class="auth-story"><a href="#" class="brand">${brand}</a><div class="eyebrow" style="margin-top:65px">LE PLAISIR D’UNE PISCINE SEREINE</div><h1 style="margin-top:0">Un bassin.<br>Une histoire.<br><em>Le même suivi.</em></h1><p>Vos analyses, vos entretiens et les bonnes personnes, réunis au même endroit.</p><div class="water-art" aria-hidden="true"></div><div class="auth-bottom"><span>01 &nbsp; Un carnet qui reste</span><span>02 &nbsp; Des accès choisis</span><span>03 &nbsp; L’entraide métier</span></div></section><section class="auth-form"><div><div class="eyebrow">BIENVENUE CHEZ VOUS</div><h2>${authTab === "login" ? "Ravi de vous retrouver." : "Votre piscine commence ici."}</h2><p class="subtitle">${authTab === "login" ? "Retrouvez votre espace et votre suivi." : "Un compte gratuit pour prendre soin de votre piscine."}</p><div class="auth-switch"><button data-action="auth-tab" data-tab="login" class="${authTab === "login" ? "active" : ""}">Se connecter</button><button data-action="auth-tab" data-tab="signup" class="${authTab === "signup" ? "active" : ""}">Créer mon compte</button></div><form id="auth-form">${authTab === "signup" ? `${field("Votre nom", "name", "", "text", 'required maxlength="80" autocomplete="name"')}<div class="auth-switch"><button type="button" data-action="signup-role" data-role="client" class="${signupRole === "client" ? "active" : ""}">J’ai une piscine</button><button type="button" data-action="signup-role" data-role="pro" class="${signupRole === "pro" ? "active" : ""}">Je suis pisciniste</button></div>` : ""}${field("Identifiant", "username", "", "text", 'required minlength="3" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ex. camille.martin"')}${field("Mot de passe", "password", "", "password", `required ${authTab === "signup" ? 'minlength="12" autocomplete="new-password"' : 'autocomplete="current-password"'} maxlength="128"`)}${authTab === "signup" ? '<p class="small-note">12 caractères minimum. Aucun email demandé. Un code personnel vous permettra de récupérer votre compte.</p>' : ""}<p class="form-error" role="alert"></p><button class="btn primary full" type="submit">${authTab === "login" ? "Entrer dans mon espace" : "Créer mon compte gratuit"} ${icon("arrow", 17)}</button></form><button class="text-btn" data-action="recover">Mot de passe oublié ?</button><div class="divider"></div><p class="small-note">Vos piscines restent privées. Vous choisissez les personnes qui peuvent consulter leur dossier.</p></div></section></div>`;
  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target,
      b = Object.fromEntries(new FormData(form)),
      btn = $("[type=submit]", form);
    btn.disabled = true;
    $(".form-error", form).textContent = "";
    try {
      const r = await api("/auth/" + authTab, "POST", {
        ...b,
        role: signupRole,
      });
      if (r.recovery_code) recovery(r.recovery_code, () => start(r.user));
      else await start(r.user);
    } catch (err) {
      $(".form-error", form).textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
}
on("auth-tab", (d) => {
  authTab = d.tab;
  authScreen();
});
on("signup-role", (d) => {
  const vals = Object.fromEntries(new FormData($("#auth-form")));
  signupRole = d.role;
  authScreen();
  for (const [key, v] of Object.entries(vals))
    if ($(`[name=${key}]`)) $(`[name=${key}]`).value = v;
});
function recovery(code, next) {
  modal(
    "Votre code de récupération",
    `<p>Conservez ce code dans votre gestionnaire de mots de passe ou dans un endroit sûr. Il remplace la récupération par email.</p><div class="code">${esc(code)}</div><p class="note amber" style="margin-top:16px">Sans votre mot de passe ni ce code, nous ne pourrons pas vous redonner automatiquement accès à votre compte.</p><label class="check"><input type="checkbox" required> J’ai sauvegardé mon code personnel.</label>`,
    async () => {
      closeModal();
      await next();
    },
    "Continuer",
  );
  const close = $("dialog [data-action=close]");
  close.hidden = true;
  const cancel = $(".modal-foot [data-action=close]");
  cancel.hidden = true;
  $("dialog").addEventListener("cancel", (e) => e.preventDefault());
}
on("recover", () =>
  modal(
    "Récupérer mon compte",
    `${field("Identifiant", "username", "", "text", 'required autocomplete="username"')}${field("Code de récupération", "code", "", "text", 'required maxlength="64" autocomplete="off" spellcheck="false"')}${field("Nouveau mot de passe", "password", "", "password", 'required minlength="12" maxlength="128" autocomplete="new-password"')}`,
    async (b) => {
      const r = await api("/auth/recover", "POST", b);
      recovery(r.recovery_code, () => start(r.user));
    },
    "Récupérer mon compte",
  ),
);
async function start(user) {
  state.user = await api("/me");
  state.mode =
    localStorage.getItem("pib-mode:" + user.id) ||
    (user.is_pro ? "pro" : "client");
  if (!user.is_pro) state.mode = "client";
  shell();
  if (!location.hash || location.hash === "#") location.hash = "home";
  else await route();
  updateUnread();
}
function shell() {
  const pro = state.mode === "pro";
  const nav = pro
    ? [
        ["home", "home", "Aujourd’hui"],
        ["planning", "calendar", "Planning"],
        ["pools", "pool", "Piscines"],
        ["help", "help", "Entraide"],
        ["tools", "book", "Ressources"],
      ]
    : [
        ["home", "pool", "Mes piscines"],
        ["help", "help", "Mes demandes"],
        ["settings", "settings", "Mon compte"],
      ];
  $("#app").innerHTML =
    `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#home">${brand}</a>${state.user.is_pro ? `<div class="mode-switch"><button data-action="mode" data-mode="client" class="${pro ? "" : "active"}">Personnel</button><button data-action="mode" data-mode="pro" class="${pro ? "active" : ""}">Professionnel</button></div>` : ""}<nav class="nav" aria-label="Navigation principale">${nav.map(([route, i, label]) => `<a href="#${route}" data-nav="${route}">${icon(i)}<span>${label}</span></a>`).join("")}</nav><div class="side-bottom"><div class="free-label">${icon("check", 14)} &nbsp; Votre espace est gratuit<span>Le suivi et l’entraide, accessibles à tous.</span></div><a href="#settings" class="account-mini" style="text-decoration:none"><span class="avatar">${esc(state.user.name.slice(0, 2).toUpperCase())}</span><span>${esc(state.user.name)}<small style="display:block;margin-top:4px;color:#93b6bb">${pro ? "Espace pisciniste" : "Espace personnel"}</small></span></a><button class="icon-btn" data-action="logout" style="font-size:11px;color:#93b6bb">${icon("logout", 17)} Se déconnecter</button></div></aside><div class="workspace"><header class="topbar"><span class="crumb">Votre espace <strong>${pro ? "professionnel" : "personnel"}</strong></span><a href="#home" class="brand mobile-brand"><span class="brand-mark">${icon("water", 22)}</span><strong>Peace in Blue</strong></a><div class="topbar-right"><span class="profile-name">${esc(state.user.name)}</span><button class="icon-btn" data-action="notifications" aria-label="Notifications">${icon("bell")}<span id="unread"></span></button><a class="icon-btn" href="#settings" aria-label="Mon compte">${icon("settings")}</a></div></header><main id="main" class="main"></main></div></div>`;
}
on("mode", async (d) => {
  state.mode = d.mode;
  localStorage.setItem("pib-mode:" + state.user.id, d.mode);
  shell();
  if (location.hash === "#home") await route();
  else go("home");
});
on("logout", async () => {
  await api("/logout", "POST", {});
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith("pib-draft:")) sessionStorage.removeItem(key);
  state.pool = null;
  state.records = [];
  state.notices = [];
  closeModal();
  history.replaceState(null, "", location.pathname);
  authScreen();
});
async function updateUnread() {
  if (!state.user || document.hidden) return;
  try {
    const r = await api("/notifications");
    state.notices = r.items;
    const el = $("#unread");
    if (el) {
      el.className = r.unread ? "notification-dot" : "";
      el.textContent = r.unread > 99 ? "99+" : r.unread || "";
    }
  } catch {}
}
setInterval(updateUnread, 60000);
document.addEventListener("visibilitychange", updateUnread);
on("notifications", async () => {
  await updateUnread();
  modal(
    "Vos notifications",
    state.notices.length
      ? state.notices
          .map(
            (n) =>
              `<div class="notice ${n.read_at ? "read" : ""}"><span class="dot"></span><div class="grow"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${fmt(n.created_at, { hour: "2-digit", minute: "2-digit" })}</small>${n.pool_id || n.request_id ? `<div style="margin-top:10px">${button("Consulter", "notice-open", `data-pool="${esc(n.pool_id || "")}" data-request="${esc(n.request_id || "")}"`, "secondary small")}</div>` : ""}</div></div>`,
          )
          .join("")
      : empty(
          "Vous êtes à jour",
          "Les comptes rendus, achats et invitations apparaîtront ici.",
        ),
    null,
  );
  await api("/notifications/read", "POST", {});
  updateUnread();
});
on("notice-open", (d) => {
  closeModal();
  go(d.pool ? "pool/" + d.pool : "request/" + d.request);
});
async function settings(main) {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">VOTRE ESPACE</div><h1>Les bons réglages.</h1><p>Votre profil, votre zone et la sécurité de votre compte.</p></div></div><div class="grid two"><section class="card"><h2>Votre profil</h2><form id="settings-form">${field("Nom", "name", state.user.name, "text", 'required maxlength="80"')}${field("Identifiant", "username", state.user.username, "text", "disabled")}${
    state.user.is_pro
      ? `${field("Nom professionnel", "company", state.user.company, "text", 'maxlength="100"')}${cityField(state.user.city_code, state.user.city)}${field("Rayon d’intervention (km)", "radius_km", state.user.radius_km, "number", 'min="5" max="150" required')}<div class="field"><span>Vos prestations</span><div class="inline wrap">${Object.entries(
          specs,
        )
          .map(
            ([k, v]) =>
              `<label class="chip"><input type="checkbox" name="specialties" value="${k}" ${state.user.specialties?.includes(k) ? "checked" : ""}>${v}</label>`,
          )
          .join(
            "",
          )}</div></div><p class="small-note">Les prestations sont déclarées par le professionnel. Votre profil ne comporte pas de badge de qualification vérifiée.</p>`
      : '<label class="check"><input name="enable_pro" type="checkbox"> Je souhaite aussi activer mon espace pisciniste gratuit.</label>'
  }<p class="form-error"></p><button class="btn primary">Enregistrer mon profil</button></form></section><div class="stack"><section class="card"><h2>Un compte, vos deux usages</h2><p class="muted" style="font-size:13px">Vous pouvez suivre vos piscines personnelles et exercer comme pisciniste avec la même connexion.</p>${state.user.is_pro ? `<div class="inline wrap">${button("Mon espace personnel", "mode", 'data-mode="client"', "secondary")}${button("Mon espace pisciniste", "mode", 'data-mode="pro"', "secondary")}</div>` : ""}</section><section class="card"><h2>Accès et sécurité</h2><p class="muted" style="font-size:13px">Changer de mot de passe déconnecte vos autres appareils et renouvelle votre code de récupération.</p>${button("Changer mon mot de passe", "password", "", "secondary")}<div class="divider"></div>${button("Se déconnecter", "logout", "", "ghost")}</section>${state.user.is_admin ? `<section class="card"><h2>Modération</h2>${button("Consulter les signalements", "moderation", "", "secondary")}</section>` : ""}</div></div>`;
  $("#settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target,
      values = Object.fromEntries(new FormData(f));
    try {
      state.user = {
        ...state.user,
        ...(await api("/me", "PUT", {
          ...values,
          enable_pro: values.enable_pro === "on",
          specialties: new FormData(f).getAll("specialties"),
        })),
      };
      shell();
      await route();
      toast("Profil enregistré.");
    } catch (err) {
      $(".form-error", f).textContent = err.message;
    }
  });
}
on("password", () =>
  modal(
    "Changer mon mot de passe",
    `${field("Mot de passe actuel", "current_password", "", "password", 'required autocomplete="current-password"')}${field("Nouveau mot de passe", "password", "", "password", 'required minlength="12" maxlength="128" autocomplete="new-password"')}`,
    async (b) => {
      const r = await api("/password", "POST", b);
      recovery(r.recovery_code, async () =>
        toast("Votre mot de passe a été modifié."),
      );
    },
  ),
);
on("moderation", async () => {
  const r = await api("/admin/flags");
  modal(
    "Signalements",
    r.items
      .map(
        (f) =>
          `<div class="card"><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p><p class="note">${esc(f.reason)}</p>${button("Masquer cette demande", "moderate", `data-id="${f.id}" data-hide="1"`, "danger small")} ${button("Classer sans masquer", "moderate", `data-id="${f.id}" data-hide="0"`, "secondary small")}</div>`,
      )
      .join("") ||
      empty(
        "Aucun signalement",
        "Les nouvelles demandes de modération apparaîtront ici.",
      ),
    null,
  );
});
on("moderate", async (d) => {
  await api("/admin/flags/" + d.id, "POST", { hide: d.hide === "1" });
  closeModal();
  toast("Signalement traité.");
});
async function route() {
  if (!state.user) return;
  const current = ++renderId;
  const parts = location.hash.slice(1).split("/"),
    name = parts[0] || "home";
  state.route = name;
  const main = $("#main");
  if (!main) return;
  $$("[data-nav]").forEach((a) =>
    a.classList.toggle(
      "active",
      a.dataset.nav ===
        (name === "pool" ? "pools" : name === "request" ? "help" : name),
    ),
  );
  main.innerHTML = '<div class="loading">Votre espace se prépare…</div>';
  try {
    const pages = { ...poolPages, ...proPages, ...toolPages, settings };
    if (name === "home") {
      if (state.mode === "pro") await proPages.dashboard(main);
      else await poolPages.pools(main);
    } else if (pages[name]) await pages[name](main, parts[1], parts[2]);
    else go("home");
    if (current === renderId)
      document.title =
        "Peace in Blue — " +
        (name === "pool"
          ? state.pool?.name || "Piscine"
          : state.mode === "pro"
            ? "Espace pisciniste"
            : "Mon espace");
  } catch (err) {
    if (err.status === 401) {
      authScreen();
      return;
    }
    if (current === renderId)
      main.innerHTML = `<div class="card">${empty("Cet espace est indisponible", err.message, button("Retour à mon espace", "home", "", "secondary"))}</div>`;
  }
  updateUnread();
}
on("home", () => go("home"));
window.addEventListener("hashchange", route);
try {
  await start(await api("/me"));
} catch {
  authScreen();
}
