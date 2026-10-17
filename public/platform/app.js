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
import { classicPages } from "./classic.js";
const brand = `<span class="brand-mark">${icon("water", 25)}</span><span><strong>Peace in Blue App</strong></span>`;
let authTab = "login",
  signupRole = "client",
  renderId = 0;
function authScreen() {
  state.user = null;
  document.title = "Peace in Blue App : Gestion d’entretien";
  $("#app").innerHTML =
    `<div class="classic-auth"><section class="classic-login"><div class="login-brand"><span class="brand-mark">${icon("water", 32)}</span><h1>Peace in Blue App</h1><p>Gestion d’entretien de piscines</p></div><div class="auth-switch"><button data-action="auth-tab" data-tab="login" class="${authTab === "login" ? "active" : ""}">Se connecter</button><button data-action="auth-tab" data-tab="signup" class="${authTab === "signup" ? "active" : ""}">Créer mon compte</button></div><form id="auth-form">${authTab === "signup" ? `${field("Votre nom", "name", "", "text", 'required maxlength="80" autocomplete="name"')}<div class="auth-switch"><button type="button" data-action="signup-role" data-role="client" class="${signupRole === "client" ? "active" : ""}">J’ai une piscine</button><button type="button" data-action="signup-role" data-role="pro" class="${signupRole === "pro" ? "active" : ""}">Je suis pisciniste</button></div>` : ""}${field("Identifiant", "username", "", "text", 'required minlength="3" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ex. camille.martin"')}${field("Mot de passe", "password", "", "password", `required ${authTab === "signup" ? 'minlength="12" autocomplete="new-password"' : 'autocomplete="current-password"'} maxlength="128"`)}${authTab === "signup" ? '<p class="small-note">12 caractères minimum. Aucun email demandé. Un code personnel vous permettra de récupérer votre compte.</p>' : ""}<p class="form-error" role="alert"></p><button class="btn primary full" type="submit">${authTab === "login" ? "Entrer dans mon espace" : "Créer mon compte gratuit"} ${icon("arrow", 17)}</button></form><button class="text-btn" data-action="recover">Mot de passe oublié ?</button><div class="divider"></div><p class="small-note">Chaque piscine reste privée : ses propriétaires et un seul pisciniste principal.</p></section></div>`;
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
  if (!location.hash || location.hash === "#")
    location.hash = state.mode === "pro" ? "planning" : "home";
  else await route();
  updateUnread();
}
function shell() {
  const pro = state.mode === "pro";
  const nav = pro
    ? [
        ["planning", "calendar", "Agenda"],
        ["map", "map", "Carte"],
        ["clients", "users", "Clients"],
        ["tools", "book", "Pisciniste"],
      ]
    : [
        ["home", "pool", "Mes piscines"],
        ["settings", "settings", "Mon compte"],
      ];
  const links = nav
    .map(
      ([route, i, label]) =>
        `<a href="#${route}" data-nav="${route}">${icon(i)}<span>${label}</span></a>`,
    )
    .join("");
  $("#app").innerHTML =
    `<div class="classic-shell"><header class="classic-header"><div class="classic-header-inner"><a class="brand" href="#${pro ? "planning" : "home"}" aria-label="Peace in Blue App">${brand}</a><div class="classic-account"><a class="classic-profile" href="#settings"><span class="profile-dot"></span><span class="profile-name">${esc(state.user.name)}</span>${badge(pro ? "Pro" : "Client", "teal")}</a><button class="icon-btn" data-action="notifications" aria-label="Notifications" title="Notifications">${icon("bell")}<span id="unread"></span></button><a class="icon-btn" href="#settings" aria-label="Mon compte" title="Mon compte">${icon("settings")}</a><button class="icon-btn" data-action="logout" aria-label="Se déconnecter" title="Se déconnecter">${icon("logout")}</button></div></div><nav class="classic-nav" aria-label="Navigation principale"><div>${links}</div></nav></header><main id="main" class="main"></main><nav class="classic-mobile-nav" aria-label="Navigation mobile">${links}</nav></div>`;
}

on("mode", async (d) => {
  state.mode = d.mode;
  localStorage.setItem("pib-mode:" + state.user.id, d.mode);
  shell();
  const destination = state.mode === "pro" ? "planning" : "home";
  if (location.hash === "#" + destination) await route();
  else go(destination);
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
              `<div class="notice ${n.read_at ? "read" : ""}"><span class="dot"></span><div class="grow"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${fmt(n.created_at, { hour: "2-digit", minute: "2-digit" })}</small>${n.pool_id ? `<div style="margin-top:10px">${button("Consulter", "notice-open", `data-pool="${esc(n.pool_id || "")}"`, "secondary small")}</div>` : ""}</div></div>`,
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
  if (d.pool) go("pool/" + d.pool);
});
async function settings(main) {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">VOTRE ESPACE</div><h1>Mon compte</h1><p>Votre profil et la sécurité de votre compte.</p></div></div><div class="grid two"><section class="card"><h2>Votre profil</h2><form id="settings-form">${field("Nom", "name", state.user.name, "text", 'required maxlength="80"')}${field("Identifiant", "username", state.user.username, "text", "disabled")}${
    state.user.is_pro
      ? `${field("Nom professionnel", "company", state.user.company, "text", 'maxlength="100"')}${cityField(state.user.city_code, state.user.city)}`
      : '<label class="check"><input name="enable_pro" type="checkbox"> Je souhaite aussi activer mon espace pisciniste gratuit.</label>'
  }<p class="form-error"></p><button class="btn primary">Enregistrer mon profil</button></form></section><div class="stack"><section class="card"><h2>Un compte, vos deux usages</h2><p class="muted" style="font-size:13px">Vous pouvez suivre vos piscines personnelles et exercer comme pisciniste avec la même connexion.</p>${state.user.is_pro ? `<div class="inline wrap">${button("Mon espace personnel", "mode", 'data-mode="client"', "secondary")}${button("Mon espace pisciniste", "mode", 'data-mode="pro"', "secondary")}</div>` : ""}</section><section class="card"><h2>Accès et sécurité</h2><p class="muted" style="font-size:13px">Changer de mot de passe déconnecte vos autres appareils et renouvelle votre code de récupération.</p>${button("Changer mon mot de passe", "password", "", "secondary")}<div class="divider"></div>${button("Se déconnecter", "logout", "", "ghost")}</section></div></div>`;
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
async function route() {
  if (!state.user) return;
  const current = ++renderId;
  const parts = location.hash.slice(1).split("/"),
    name = parts[0] || "home";
  if (
    state.mode !== "pro" &&
    [
      "clients",
      "map",
      "planning",
      "preparation",
      "tools",
      "stats",
      "code",
      "calculators",
      "library",
      "guide",
    ].includes(name)
  ) {
    go("home");
    return;
  }
  if (
    ["help", "request", "assistant", "dashboard"].includes(name) ||
    (name === "home" && state.mode === "pro")
  ) {
    go(state.mode === "pro" ? "planning" : "home");
    return;
  }
  state.route = name;
  const main = $("#main");
  if (!main) return;
  $$("[data-nav]").forEach((a) =>
    a.classList.toggle(
      "active",
      a.dataset.nav ===
        (name === "pool" || name === "pools"
          ? state.mode === "pro"
            ? "clients"
            : "home"
          : ["stats", "preparation"].includes(name)
            ? "planning"
            : ["code", "calculators", "library", "guide"].includes(name)
              ? "tools"
              : name),
    ),
  );
  main.innerHTML = '<div class="loading">Votre espace se prépare…</div>';
  try {
    const pages = {
      ...poolPages,
      ...proPages,
      ...toolPages,
      ...classicPages,
      settings,
    };
    if (name === "home") {
      await poolPages.pools(main);
    } else if (pages[name]) await pages[name](main, parts[1], parts[2]);
    else go(state.mode === "pro" ? "planning" : "home");
    if (current === renderId)
      document.title =
        "Peace in Blue App : " +
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
on("home", () => go(state.mode === "pro" ? "planning" : "home"));
window.addEventListener("hashchange", route);
try {
  await start(await api("/me"));
} catch {
  authScreen();
}
