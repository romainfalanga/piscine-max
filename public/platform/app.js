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
    `<div class="classic-auth"><section class="classic-login"><div class="login-brand"><span class="brand-mark">${icon("water", 32)}</span><h1>Peace in Blue App</h1><p>Gestion d’entretien de piscines</p></div><div class="auth-switch"><button data-action="auth-tab" data-tab="login" class="${authTab === "login" ? "active" : ""}">Se connecter</button><button data-action="auth-tab" data-tab="signup" class="${authTab === "signup" ? "active" : ""}">Créer mon compte</button></div><form id="auth-form">${authTab === "signup" ? `<div class="grid two form-two">${field("Prénom", "first_name", "", "text", 'required maxlength="40" autocomplete="given-name"')}${field("Nom", "last_name", "", "text", 'required maxlength="40" autocomplete="family-name"')}</div>${field("Adresse email", "email", "", "email", 'required maxlength="254" autocomplete="email" autocapitalize="none"')}<div class="auth-switch"><button type="button" data-action="signup-role" data-role="client" class="${signupRole === "client" ? "active" : ""}">J’ai une piscine</button><button type="button" data-action="signup-role" data-role="pro" class="${signupRole === "pro" ? "active" : ""}">Je suis pisciniste</button></div>` : ""}${field("Identifiant", "username", "", "text", 'required minlength="3" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ex. camille.martin"')}${field("Mot de passe", "password", "", "password", `required ${authTab === "signup" ? 'minlength="12" autocomplete="new-password"' : 'autocomplete="current-password"'} maxlength="128"`)}${authTab === "signup" ? '<p class="small-note">12 caractères minimum. Conservez le code de récupération remis après l’inscription.</p>' : ""}<p class="form-error" role="alert"></p><button class="btn primary full" type="submit">${authTab === "login" ? "Entrer dans mon espace" : "Créer mon compte gratuit"} ${icon("arrow", 17)}</button></form><button class="text-btn" data-action="recover">Mot de passe oublié ?</button><div class="divider"></div><p class="small-note">Chaque piscine reste privée : ses propriétaires et un seul pisciniste principal.</p></section></div>`;
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
    `<p>Conservez ce code dans votre gestionnaire de mots de passe ou dans un endroit sûr. Il permet de récupérer votre compte.</p><div class="code">${esc(code)}</div><p class="note amber" style="margin-top:16px">Sans votre mot de passe ni ce code, nous ne pourrons pas vous redonner automatiquement accès à votre compte.</p><label class="check"><input type="checkbox" required> J’ai sauvegardé mon code personnel.</label>`,
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
  if (
    !["client", "pro"].includes(d.mode) ||
    (d.mode === "pro" && !state.user.is_pro)
  )
    return;
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
  const u = state.user,
    professional = !!u.is_pro;
  main.innerHTML = `<div class="page-heading"><div><h1>Mon compte</h1><p>Vos informations personnelles et votre mot de passe.</p></div></div><div class="account-layout"><section class="card account-profile"><h2>Informations personnelles</h2>${!u.first_name && !u.last_name ? `<p class="small-note">Nom actuellement enregistré : ${esc(u.name)}. Renseignez votre prénom et votre nom pour les mettre à jour.</p>` : ""}<form id="settings-form"><div class="grid two form-two">${field("Prénom", "first_name", u.first_name, "text", 'required maxlength="40" autocomplete="given-name"')}${field("Nom", "last_name", u.last_name, "text", 'required maxlength="40" autocomplete="family-name"')}</div>${field("Identifiant", "username", u.username, "text", 'required minlength="3" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false"')}<p class="field-help">Votre identifiant sert à vous connecter et à recevoir une invitation.</p>${u.email ? `${field("Adresse email", "email", u.email, "email", 'readonly autocomplete="email"')}<p class="field-help">L’adresse enregistrée pour ce compte.</p>` : `${field("Adresse email", "email", "", "email", 'maxlength="254" autocomplete="email"')}<p class="field-help">Ce compte a été créé sans email. Vous pouvez en ajouter un.</p>`}<div id="identity-confirmation" hidden>${field("Mot de passe actuel", "current_password", "", "password", 'autocomplete="current-password" maxlength="128"')}<p class="field-help">Confirmez votre mot de passe pour modifier l’identifiant ou ajouter une adresse email.</p></div>${professional ? `<fieldset class="account-business"><legend>Profil professionnel</legend>${field("Nom professionnel", "company", u.company, "text", 'maxlength="100"')}${cityField(u.city_code, u.city)}</fieldset>` : ""}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">Enregistrer mes informations</button></form></section><aside class="stack"><section class="card account-security"><span class="account-lock">${icon("lock", 24)}</span><h2>Mot de passe</h2><p>Changer de mot de passe déconnecte vos autres appareils et renouvelle votre code de récupération.</p>${button("Changer mon mot de passe", "password", "", "secondary")}</section>${professional ? `<section class="card"><h2>Mes espaces</h2><div class="stack">${button("Mon espace personnel", "mode", 'data-mode="client"', "secondary")}${button("Mon espace pisciniste", "mode", 'data-mode="pro"', "secondary")}</div></section>` : ""}</aside></div>`;
  const form = $("#settings-form"),
    confirmation = $("#identity-confirmation");
  const syncConfirmation = () => {
    const sensitive =
      $("[name=username]", form).value.trim().toLowerCase() !== u.username ||
      (!u.email && $("[name=email]", form).value.trim() !== "");
    confirmation.hidden = !sensitive;
    $("[name=current_password]", form).required = sensitive;
  };
  form.addEventListener("input", syncConfirmation);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form)),
      btn = $("[type=submit]", form);
    btn.disabled = true;
    $(".form-error", form).textContent = "";
    try {
      state.user = { ...state.user, ...(await api("/me", "PUT", values)) };
      shell();
      await route();
      toast("Informations enregistrées.");
    } catch (err) {
      $(".form-error", form).textContent = err.message;
    } finally {
      btn.disabled = false;
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
