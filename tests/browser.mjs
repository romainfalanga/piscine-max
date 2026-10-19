import { chromium } from "playwright-core";
import bundled from "@sparticuz/chromium";
import { mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
mkdirSync(".test-artifacts", { recursive: true });
const { server } = await import("./server.ts");
if (!server.listening)
  await new Promise((resolve) => server.once("listening", resolve));
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_BINARY ||
    (process.env.BROWSER_PLAYWRIGHT
      ? chromium.executablePath()
      : await bundled.executablePath()),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
  ],
  headless: true,
});
let context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  locale: "fr-FR",
});
let page = await context.newPage();
const errors = [];
async function verifyPersistentPoolSections(target) {
  await target.waitForFunction(() => {
    const sections = [...document.querySelectorAll("[data-pool-panel]")];
    return (
      sections.length && sections.every((el) => el.dataset.ready === "true")
    );
  });
  const heading = await target.locator(".pool-heading").elementHandle();
  const navigation = await target.locator(".pool-tabs").elementHandle();
  assert.equal(await target.locator(".pool-tabs svg").count(), 0);
  await target.getByRole("button", { name: "Évolution", exact: true }).click();
  const curveResponse = target.waitForResponse((r) =>
    r.url().includes("/trends?days=365"),
  );
  await target.getByLabel("Période", { exact: true }).selectOption("365");
  await curveResponse;
  let reads = 0;
  const countReads = (request) => {
    if (
      request.resourceType() === "document" ||
      /\/api\/pools\/[^/]+\/(records|overview|trends|needs)(\?|$)/.test(
        request.url(),
      )
    )
      reads++;
  };
  target.on("request", countReads);
  for (const name of ["Le bassin", "Accès", "Suivi", "Évolution"]) {
    await target.getByRole("button", { name, exact: true }).click();
    await target.waitForFunction(
      (name) =>
        document.querySelector('.pool-tabs [aria-current="page"]')
          ?.textContent === name,
      name,
    );
    assert.equal(await heading.evaluate((el) => el.isConnected), true);
    assert.equal(await navigation.evaluate((el) => el.isConnected), true);
    assert.equal(await target.locator("#main>.loading").count(), 0);
  }
  assert.equal(
    await target.getByLabel("Période", { exact: true }).inputValue(),
    "365",
  );
  assert.equal(
    reads,
    0,
    "Changing prepared sections must not fetch their content again or navigate the document",
  );
  target.off("request", countReads);
  await target.getByRole("button", { name: "Suivi", exact: true }).click();
}

page.setDefaultTimeout(10000);
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:8788/");
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const manifestResponse = await context.request.get(
    "http://127.0.0.1:8788" + manifestHref,
  );
  assert.ok(
    manifestResponse
      .headers()
      ["content-type"].includes("application/manifest+json"),
  );
  const manifest = await manifestResponse.json();
  assert.equal(manifest.name, "Peace in Blue App");
  assert.equal(manifest.display, "standalone");
  for (const entry of manifest.icons) {
    const dimensions = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return `${img.naturalWidth}x${img.naturalHeight}`;
    }, entry.src);
    assert.equal(dimensions, entry.sizes);
  }
  for (const path of ["/favicon.png", "/platform/brand-logo.png"]) {
    const response = await context.request.get("http://127.0.0.1:8788" + path);
    assert.equal(response.status(), 200);
    assert.equal(
      createHash("sha256")
        .update(await response.body())
        .digest("hex"),
      "1f344c03e3d9a518cd920a002c255e0006ab40f904a14f66b1aa4db640f88e0c",
    );
  }
  await page.locator(".brand-image").evaluate((img) => img.decode());
  assert.equal(
    await page.locator(".brand-image").evaluate((img) => img.naturalWidth),
    256,
  );

  await page.screenshot({
    path: ".test-artifacts/login-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  const suffix = Date.now().toString().slice(-7);
  await page
    .getByLabel("Adresse email", { exact: true })
    .fill("camille-client@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("Browser fixture password only!");
  await page
    .getByRole("button", { name: "Créer mon compte gratuit", exact: false })
    .click();
  await page.getByLabel("J’ai sauvegardé mon code personnel.").check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  assert.equal(
    await page.locator(".classic-mobile-nav, .classic-nav").count(),
    0,
  );
  await page.getByRole("link", { name: "Mon compte", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Mon compte", exact: true }).count(),
    1,
  );

  await page
    .getByRole("button", { name: "Ajouter une piscine", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Nom de la piscine", { exact: true })
    .fill("La piscine des Oliviers");
  assert.equal(
    await page.getByText("Une autre piscine ?", { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator("[name=volume]").count(), 0);
  assert.equal(await page.locator("[name=treatment]").count(), 0);
  await page
    .getByLabel("Adresse de la piscine", { exact: true })
    .fill("12 rue republique Bandol");
  await page
    .getByRole("option", {
      name: "12 Rue de la République 83150 Bandol",
      exact: true,
    })
    .click();
  await page.locator("#address-preview .address-pin").waitFor();
  await page.screenshot({
    path: ".test-artifacts/create-address.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Créer ma piscine", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "La piscine des Oliviers", exact: true })
    .waitFor();
  const poolId = page.url().split("#pool/")[1];
  await verifyPersistentPoolSections(page);
  await page
    .getByRole("button", { name: "Ajouter une analyse", exact: false })
    .first()
    .click();
  assert.equal(await page.locator("[name=method]").count(), 0);
  await page.getByLabel("pH", { exact: true }).fill("7.3");
  await page.getByLabel("Chlore (mg/L)", { exact: true }).fill("1.8");
  assert.equal(
    await page.getByLabel("Température (°C)", { exact: true }).count(),
    0,
  );
  await page
    .getByLabel("Observations", { exact: true })
    .fill("Eau claire, filtration régulière. Le carnet commence ici.");
  await page
    .getByRole("button", { name: "Enregistrer l’analyse", exact: true })
    .click();
  await page
    .getByText("Eau claire, filtration régulière. Le carnet commence ici.")
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/client-journal-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Évolution", exact: true }).click();
  await page
    .getByRole("heading", { name: "L’évolution de votre eau", exact: true })
    .waitFor();
  await page.locator("svg.chart").first().waitFor();
  await page.screenshot({
    path: ".test-artifacts/client-trends-desktop.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:8788/#pool/" + poolId + "/needs");
  await page
    .getByRole("heading", { name: "Historique du suivi", exact: true })
    .waitFor();
  assert.deepEqual(await page.locator(".pool-tabs button").allTextContents(), [
    "Suivi",
    "Évolution",
    "Le bassin",
    "Accès",
  ]);
  assert.equal(
    await page
      .getByRole("button", { name: "Modifier la piscine", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Commencer l’entretien", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByText("Le prochain passage se prépare ici.").count(),
    0,
  );
  assert.equal(
    await page
      .locator(".pool-heading-actions [data-action=invite-member]")
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Accès", exact: true }).click();
  await page.getByRole("button", { name: "Inviter", exact: true }).click();
  assert.deepEqual(
    await page
      .getByLabel("Inviter", { exact: true })
      .locator("option")
      .allTextContents(),
    ["Mon pisciniste", "Copropriétaire"],
  );
  assert.equal(
    await page
      .getByLabel("Adresse email de la personne", { exact: true })
      .count(),
    1,
  );
  assert.equal(await page.locator("[name=username], #pro-search").count(), 0);
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Le bassin", exact: true }).click();
  await page.getByRole("button", { name: "Modifier", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Modifier", exact: true }).count(),
    1,
  );
  assert.equal(
    await page.getByText("Exporter mon carnet", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByText("Informations d’accès privées", { exact: false })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  assert.equal(
    await page.locator("[name=routine],[name=client_advice]").count(),
    0,
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Accès", exact: true }).click();
  await page.getByText("Responsable des accès", { exact: false }).waitFor();
  await page
    .getByRole("link", { name: "Mon compte", exact: true })
    .first()
    .click();
  assert.equal(await page.locator("[name=enable_pro]").count(), 0);
  assert.equal(
    await page.getByText("Un compte, vos deux usages", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .locator("[name=username],[name=first_name],[name=last_name]")
      .count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Adresse email", { exact: true }).inputValue(),
    "camille-client@example.test",
  );
  await page
    .getByLabel("Adresse email", { exact: true })
    .fill("camille-updated@example.test");
  await page
    .getByLabel("Mot de passe actuel", { exact: true })
    .fill("Browser fixture password only!");
  await page
    .getByRole("button", { name: "Enregistrer mon adresse email", exact: true })
    .click();
  await page.getByText("Adresse email enregistrée.", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Adresse email", { exact: true }).inputValue(),
    "camille-updated@example.test",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".test-artifacts/client-account-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({
    path: ".test-artifacts/client-account-desktop.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:8788/#tools");
  await page
    .getByRole("heading", { name: "Mes piscines", exact: true })
    .waitFor();
  const selfContext = context,
    selfPage = page;
  context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    locale: "fr-FR",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(10000);
  await page.goto("http://127.0.0.1:8788/");
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  await page
    .getByLabel("Adresse email", { exact: true })
    .fill("camille-pro@example.test");
  await page
    .getByRole("button", { name: "Je suis pisciniste", exact: true })
    .click();
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("Browser fixture password only!");
  await page
    .getByRole("button", { name: "Créer mon compte gratuit", exact: false })
    .click();
  await page.getByLabel("J’ai sauvegardé mon code personnel.").check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
  // A second, independently registered client grants access to the professional.
  const ownerContext = await browser.newContext();
  const apiPost = async (ctx, path, body) => {
    const response = await ctx.request.post(
      "http://127.0.0.1:8788/api" + path,
      {
        data: body,
        headers: {
          Origin: "http://127.0.0.1:8788",
          Cookie: (await ctx.cookies())
            .map((c) => `${c.name}=${c.value}`)
            .join("; "),
        },
      },
    );
    assert.ok(response.ok(), await response.text());
    return response.json();
  };
  await apiPost(ownerContext, "/auth/signup", {
    email: "olivier@example.test",
    password: "Browser fixture password only!",
    role: "client",
  });
  const assigned = await apiPost(ownerContext, "/pools", {
    name: "Le bassin des Pins",
    city_code: "83009",
    address: "Adresse de démonstration",
    volume: 54,
    treatment: "salt",
  });
  const invitation = await apiPost(
    ownerContext,
    `/pools/${assigned.id}/invitations`,
    { email: "camille-pro@example.test", kind: "principal" },
  );
  await apiPost(context, `/invitations/${invitation.id}/respond`, {
    accept: true,
  });
  await ownerContext.close();
  const nav = page.getByRole("navigation", {
    name: "Navigation principale",
    exact: true,
  });
  assert.deepEqual(await nav.locator("a").allTextContents(), [
    "Agenda",
    "Carte",
    "Clients",
    "Pisciniste",
  ]);
  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Période", { exact: true }).inputValue(),
    "0",
  );
  await page.getByRole("button", { name: "Planifier", exact: true }).click();
  await page.getByLabel("Piscine", { exact: true }).selectOption(assigned.id);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Planifier", exact: true })
    .click();
  await page.getByRole("button", { name: "Commencer", exact: true }).waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-agenda-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Commencer", exact: true }).click();
  await page.getByLabel("pH", { exact: true }).fill("7.2");
  await page.getByLabel("Chlore (mg/L)", { exact: true }).fill("1.6");
  await page.screenshot({
    path: ".test-artifacts/visit-workspace-desktop.png",
    fullPage: true,
  });
  for (const checkbox of await page.locator(".task-checkbox input").all())
    await checkbox.check();

  await page
    .getByRole("button", { name: "Terminer et partager", exact: true })
    .click();
  await page.getByText("Partagé", { exact: true }).waitFor();
  await page.getByRole("button", { name: "À prévoir", exact: false }).click();
  await page
    .getByRole("button", { name: "Ajouter un besoin", exact: false })
    .click();
  await page
    .getByLabel("Produit ou matériel", { exact: true })
    .fill("Cartouche de filtration");
  await page.getByLabel("Quantité et unité", { exact: true }).fill("1 pièce");
  await page
    .getByRole("button", { name: "Ajouter le besoin", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Cartouche de filtration", exact: false })
    .waitFor();

  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByText("Effectué", { exact: true }).waitFor();
  await nav.getByRole("link", { name: "Clients", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "olivier@example.test",
      exact: true,
    })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-clients-desktop.png",
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Carte", exact: true }).click();
  await page.locator(".classic-map-marker").waitFor();
  await page.locator(".classic-map-marker").first().click();
  assert.equal(
    await page.getByRole("link", { name: "Itinéraire", exact: true }).count(),
    1,
  );
  assert.ok(
    (
      await page
        .getByRole("link", { name: "Itinéraire", exact: true })
        .getAttribute("href")
    ).includes("Adresse%20de%20d%C3%A9monstration"),
  );
  // Create, reopen and edit a recurrence without leaving the application.
  await page.goto(`http://127.0.0.1:8788/#pool/${assigned.id}/planning`);
  await page
    .getByRole("button", { name: "Créer une récurrence", exact: true })
    .click();
  await page.getByLabel("À partir du", { exact: true }).fill("2027-04-01");
  await page.getByLabel("Heure", { exact: true }).fill("10:30");
  await page
    .getByRole("button", { name: "Créer le rythme", exact: true })
    .click();
  const tabCount = context.pages().length;
  await page
    .getByRole("button", { name: "Entretien régulier", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Modifier la récurrence", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Heure", { exact: true }).inputValue(),
    "10:30",
  );
  await page.getByLabel("Tous les X jours", { exact: true }).fill("14");
  await page.getByLabel("Heure", { exact: true }).fill("11:15");
  await page
    .getByText("Adapter le rythme aux saisons", { exact: true })
    .click();
  await page
    .getByLabel("Avril à octobre : tous les X jours", { exact: true })
    .fill("14");
  await page
    .getByLabel("Novembre à mars : tous les X jours", { exact: true })
    .fill("28");
  await page
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Entretien régulier", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  assert.equal(
    await page.getByLabel("Heure", { exact: true }).inputValue(),
    "11:15",
  );
  assert.equal(
    await page
      .getByLabel("Avril à octobre : tous les X jours", { exact: true })
      .inputValue(),
    "14",
  );
  assert.equal(
    await page
      .getByLabel("Novembre à mars : tous les X jours", { exact: true })
      .inputValue(),
    "28",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".test-artifacts/schedule-edit-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.goto("http://127.0.0.1:8788/#planning");
  await page.getByLabel("Début de période", { exact: true }).fill("2027-04-01");
  await page
    .getByLabel("Début de période", { exact: true })
    .dispatchEvent("change");
  await page.locator(".agenda-visit .schedule-title").click();
  await page
    .getByRole("heading", { name: "Modifier la récurrence", exact: true })
    .waitFor();
  assert.equal(context.pages().length, tabCount);
  assert.ok(page.url().startsWith("http://127.0.0.1:8788/#planning"));
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1080 });
  await nav.getByRole("link", { name: "Pisciniste", exact: true }).click();

  await page
    .getByRole("link", { name: "Code du pisciniste", exact: false })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-workbench-desktop.png",
    fullPage: true,
  });
  assert.equal(
    await page.getByText("Assistant documentaire", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("link", { name: "Entraide", exact: true }).count(),
    0,
  );
  await page
    .getByRole("link", { name: "Outils de calcul", exact: false })
    .click();
  await page.locator(".calculator-tile").first().waitFor();
  assert.equal(await page.locator(".calculator-tile").count(), 16);
  await page
    .getByRole("link", { name: "Volume du bassin", exact: false })
    .click();
  await page.getByLabel("Longueur ou diamètre (m)", { exact: true }).fill("8");
  await page.getByLabel("Largeur (m)", { exact: true }).fill("4");
  await page
    .getByLabel("Profondeur moyenne réelle (m)", { exact: true })
    .fill("1.5");
  await page.getByRole("button", { name: "Calculer", exact: true }).click();
  assert.equal(
    (await page.locator(".calculation-value").textContent()).trim(),
    "48 m³",
  );
  await page.getByLabel("Forme", { exact: true }).selectOption("round");
  assert.equal(
    await page.getByLabel("Largeur (m)", { exact: true }).isVisible(),
    false,
  );
  await page.goto("http://127.0.0.1:8788/#calculators/salt");
  await page.getByLabel("Volume du bassin (m³)", { exact: true }).fill("50");
  await page.getByLabel("Salinité mesurée (g/L)", { exact: true }).fill("3");
  await page.getByLabel("Consigne fabricant (g/L)", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Calculer", exact: true }).click();
  assert.equal(
    (await page.locator(".calculation-value").textContent()).trim(),
    "50 kg",
  );
  await page.screenshot({
    path: ".test-artifacts/calculator-desktop.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:8788/#library");
  await page.getByLabel("Catégorie de fiche").waitFor();
  assert.ok((await page.locator("#reference-list article").count()) > 90);
  await page
    .getByLabel("Type de fiche", { exact: true })
    .selectOption("information");
  assert.ok((await page.locator("#reference-list article").count()) > 0);
  assert.equal(
    await page
      .locator("#reference-list")
      .getByText("Procédure", { exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("link", { name: "Entretien courant · pas à pas", exact: false })
    .click();
  await page.getByLabel("Type de filtre", { exact: true }).selectOption("sand");
  assert.equal(
    await page
      .getByRole("heading", { name: "Laver à contre-courant", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Rincer entre les plis", exact: true })
      .count(),
    0,
  );
  await page
    .getByLabel("État : Lire le dossier avant d’agir", { exact: true })
    .selectOption("done");
  await page
    .getByRole("button", { name: "Enregistrer la progression", exact: true })
    .first()
    .click();
  await page
    .locator("#guide-status")
    .getByText("Progression enregistrée.", { exact: true })
    .waitFor();
  await page.reload();
  await page.getByLabel("Type de filtre", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("État : Lire le dossier avant d’agir", { exact: true })
      .inputValue(),
    "done",
  );
  await page
    .getByLabel("Type de filtre", { exact: true })
    .selectOption("cartridge");
  assert.equal(
    await page
      .getByRole("heading", { name: "Laver à contre-courant", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Rincer entre les plis", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Enregistrer la progression", exact: true })
    .first()
    .click();
  await page
    .locator("#guide-status")
    .getByText("Progression enregistrée.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/maintenance-desktop.png",
    fullPage: false,
  });
  await page.goto("http://127.0.0.1:8788/#code");
  await page
    .getByRole("button", { name: "Commencer la révision", exact: true })
    .click();
  for (let i = 0; i < 10; i++) {
    await page.locator("input[name=quiz-answer]").first().check();
    await page
      .getByRole("button", {
        name: i === 9 ? "Voir ma correction" : "Suivante",
        exact: true,
      })
      .click();
  }
  await page.getByRole("heading", { name: /Votre résultat :/ }).waitFor();
  assert.equal(await page.locator(".quiz-correction").count(), 10);
  await page
    .getByRole("link", { name: "Retour au Code du pisciniste", exact: false })
    .click();
  await page
    .getByRole("heading", { name: "Vos derniers résultats", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/code-desktop.png",
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("link", { name: "Statistiques", exact: false }).click();
  await page
    .getByRole("heading", { name: "Statistiques", exact: true })
    .waitFor();
  assert.equal(await page.locator(".stat strong").first().textContent(), "1");
  await page
    .getByRole("link", { name: "Retour à l’agenda", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8788/#home");
  await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
  const mobileNav = page.getByRole("navigation", {
    name: "Navigation mobile",
    exact: true,
  });
  await mobileNav.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
  // Exercise the actual controls at narrow phone, tablet and desktop widths.
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const range of ["0", "6", "29"]) {
      await page.getByLabel("Période", { exact: true }).selectOption(range);
      await page.waitForFunction(
        (r) =>
          document.querySelector("#plan-range")?.value === r &&
          !!document.querySelector(".calendar-grid") === (r !== "0"),
        range,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Agenda ${range} overflow at ${width}px`,
      );
      if (range === "6")
        assert.equal(await page.locator(".calendar-day").count(), 7);
      if (range === "29") {
        await page
          .getByLabel("Début de période", { exact: true })
          .fill("2026-02-12");
        await page
          .getByLabel("Début de période", { exact: true })
          .dispatchEvent("change");
        await page.locator('.calendar-day[data-date="2026-02-28"]').waitFor();
        assert.equal(await page.locator(".calendar-day").count(), 35);
        await page.locator('.calendar-day[data-date="2026-02-18"]').click();
        await page.waitForFunction(
          () => document.querySelector("#plan-date")?.value === "2026-02-18",
        );
        assert.equal(
          await page
            .locator('.calendar-day[aria-pressed="true"]')
            .getAttribute("data-date"),
          "2026-02-18",
        );
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: `.test-artifacts/agenda-month-${width}.png`,
            fullPage: true,
          });
        await page
          .getByRole("button", { name: "Période suivante", exact: true })
          .click();
        await page.waitForFunction(
          () => document.querySelector("#plan-date")?.value === "2026-03-18",
        );
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
  await page.getByLabel("Période", { exact: true }).selectOption("6");
  await page.locator(".week-grid").waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-agenda-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Pro agenda mobile overflow",
  );
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 640 },
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    storageState: await context.storageState(),
  });
  const touchPage = await touchContext.newPage();
  touchPage.on("pageerror", (e) => errors.push(e.message));
  await touchPage.goto("http://127.0.0.1:8788/#map");
  await touchPage.locator(".classic-map-marker").first().waitFor();
  assert.equal(
    await touchPage
      .locator("#map-pool-list, .map-view-switch, [data-action=map-explore]")
      .count(),
    0,
  );
  assert.equal(await touchPage.locator(".classic-header").isVisible(), false);
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [844, 390],
    [1440, 900],
  ]) {
    await touchPage.setViewportSize({ width, height });
    const box = await touchPage.locator("#pool-map").boundingBox();
    assert.ok(Math.abs(box.width - width) < 2, `Full map width at ${width}`);
    const header = await touchPage.locator(".classic-header").boundingBox();
    const nav = await touchPage.locator(".classic-mobile-nav").boundingBox();
    assert.ok(
      Math.abs(
        box.height - (height - (header?.height || 0) - (nav?.height || 0)),
      ) < 3,
      `Full map height at ${width}`,
    );
    assert.equal(
      await touchPage.evaluate(
        () =>
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      ),
      false,
    );
  }
  await touchPage.setViewportSize({ width: 390, height: 640 });
  await touchPage.screenshot({
    path: ".test-artifacts/full-map-mobile.png",
    fullPage: true,
  });
  const search = touchPage.getByRole("searchbox", {
    name: "Rechercher un client, une piscine ou une ville",
    exact: true,
  });
  await search.fill("inexistant-sans-resultat");
  await touchPage
    .getByText("Aucune piscine ne correspond à votre recherche.", {
      exact: true,
    })
    .waitFor();
  assert.equal(await touchPage.locator(".classic-map-marker").count(), 0);
  await search.fill("Pins");
  await touchPage.locator(".classic-map-marker").first().waitFor();
  assert.equal(await search.inputValue(), "Pins");
  await search.fill("");
  await touchPage.waitForFunction(
    () =>
      document.querySelector("#map-search")?.getAttribute("aria-busy") ===
      "false",
  );
  const session = await touchContext.newCDPSession(touchPage);
  const box = await touchPage.locator("#pool-map").boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height * 0.65;
  const before = await touchPage
    .locator(".leaflet-map-pane")
    .getAttribute("style");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let n = 1; n <= 8; n++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + n * 12, y: y - n * 8 }],
    });
    await touchPage.waitForTimeout(20);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await touchPage.waitForFunction(
    (before) =>
      document.querySelector(".leaflet-map-pane")?.getAttribute("style") !==
      before,
    before,
  );
  assert.equal(await touchPage.evaluate(() => scrollY), 0);
  await touchPage
    .getByRole("navigation", { name: "Navigation mobile", exact: true })
    .getByRole("link", { name: "Agenda", exact: true })
    .click();
  await touchPage
    .getByRole("heading", { name: "Agenda", exact: true })
    .waitFor();
  assert.equal(await touchPage.locator(".classic-header").isVisible(), true);
  await touchContext.close();
  // All six sections must remain visible on a professional pool at every width.
  await page.goto(`http://127.0.0.1:8788/#pool/${assigned.id}`);
  await page.locator('.pool-tabs[data-count="6"]').waitFor();
  await verifyPersistentPoolSections(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.locator(".pool-tabs button").evaluateAll((els) =>
      els.map((el) => ({
        x: el.getBoundingClientRect().x,
        right: el.getBoundingClientRect().right,
        height: el.getBoundingClientRect().height,
      })),
    );
    assert.ok(
      bounds.every((b) => b.x >= 0 && b.right <= width && b.height >= 44),
      `Pool tabs clipped at ${width}px`,
    );
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `.test-artifacts/pool-navigation-${width}.png`,
        fullPage: false,
      });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileNav
    .getByRole("link", { name: "Pisciniste", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Pisciniste", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-workbench-mobile.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:8788/#guide/entretien/" + assigned.id);
  await page.getByLabel("Type de filtre", { exact: true }).waitFor();
  await page.screenshot({
    path: ".test-artifacts/maintenance-mobile.png",
    fullPage: false,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Guide mobile overflow",
  );
  await selfPage.setViewportSize({ width: 390, height: 844 });
  await selfPage.goto("http://127.0.0.1:8788/#pool/" + poolId);
  await selfPage
    .getByRole("heading", { name: "La piscine des Oliviers", exact: true })
    .waitFor();
  await selfPage.screenshot({
    path: ".test-artifacts/client-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await selfPage.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Mobile horizontal overflow",
  );
  await selfPage
    .getByRole("button", { name: "Voir le détail", exact: true })
    .click();
  await selfPage
    .getByRole("heading", { name: "Relevé d’analyse", exact: true })
    .waitFor();
  await selfPage.screenshot({
    path: ".test-artifacts/report-mobile.png",
    fullPage: true,
  });

  await selfPage.getByRole("button", { name: "Fermer", exact: true }).click();
  await selfPage.setViewportSize({ width: 1440, height: 1080 });
  await page.setViewportSize({ width: 1440, height: 1080 });
  const linkedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
  });
  await apiPost(linkedContext, "/auth/signup", {
    email: "lucie@example.test",
    password: "Browser fixture password only!",
    role: "client",
  });
  const clientPage = await linkedContext.newPage();
  clientPage.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8788/#clients");
  await page
    .getByRole("button", { name: "Ajouter un client", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", {
      name: "Créer une piscine pour un client",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Nom de la piscine", { exact: true })
    .fill("Le bassin de Lucie");
  await page
    .getByLabel("Adresse email du client (facultatif)", { exact: true })
    .fill("lucie@example.test");
  await page
    .getByRole("button", { name: "Créer la piscine", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Le bassin de Lucie", exact: true })
    .waitFor();
  await page.getByText("Client à associer.", { exact: false }).waitFor();
  await clientPage.goto("http://127.0.0.1:8788/#home");
  await clientPage
    .getByRole("button", { name: "Accepter", exact: true })
    .click();
  await clientPage
    .getByRole("button", { name: "Associer ma piscine", exact: true })
    .click();
  await clientPage
    .getByRole("heading", { name: "Le bassin de Lucie", exact: true })
    .waitFor();
  await clientPage.getByRole("button", { name: "Accès", exact: true }).click();
  await clientPage
    .getByText("Responsable des accès", { exact: false })
    .waitFor();
  assert.equal(
    await clientPage
      .getByText("Intervenant ponctuel", { exact: false })
      .count(),
    0,
  );
  await clientPage.screenshot({
    path: ".test-artifacts/single-professional-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await clientPage.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.goto("http://127.0.0.1:8788/#clients");
  await page
    .getByRole("heading", {
      name: "lucie@example.test",
      exact: true,
    })
    .waitFor();
  const existingPool = await apiPost(linkedContext, "/pools", {
    name: "Le bassin déjà suivi par Lucie",
  });
  await page
    .getByRole("button", { name: "Ajouter un client", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", {
      name: "Rejoindre sa piscine existante",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Adresse email du client", { exact: true })
    .fill("lucie@example.test");
  await page
    .getByRole("button", { name: "Envoyer la demande", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Demandes envoyées", exact: true })
    .waitFor();
  await clientPage.goto("http://127.0.0.1:8788/#home");
  await clientPage
    .getByRole("button", { name: "Choisir ma piscine", exact: true })
    .click();
  await clientPage
    .getByLabel("Piscine à confier", { exact: true })
    .selectOption(existingPool.id);
  await clientPage
    .getByRole("button", { name: "Accepter le pisciniste", exact: true })
    .click();
  await clientPage
    .getByRole("heading", {
      name: "Le bassin déjà suivi par Lucie",
      exact: true,
    })
    .waitFor();
  await page.goto("http://127.0.0.1:8788/#clients");
  await page.reload();
  await page
    .getByRole("link", { name: "Le bassin déjà suivi par Lucie", exact: false })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/linked-clients-desktop.png",
    fullPage: true,
  });
  const invitedPool = await apiPost(linkedContext, "/pools", {
    name: "Bassin invité par Lucie",
  });
  await clientPage.goto(
    "http://127.0.0.1:8788/#pool/" + invitedPool.id + "/access",
  );
  await clientPage
    .getByRole("button", { name: "Inviter", exact: true })
    .click();
  await clientPage
    .getByLabel("Adresse email de la personne", { exact: true })
    .fill("camille-pro@example.test");
  await clientPage
    .getByRole("button", { name: "Envoyer l’invitation", exact: true })
    .click();
  await clientPage
    .getByRole("heading", { name: "Invitations en attente", exact: true })
    .waitFor();
  await page.goto("http://127.0.0.1:8788/#planning");
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await page
    .getByRole("heading", { name: "Bassin invité par Lucie", exact: true })
    .waitFor();
  await clientPage.goto("http://127.0.0.1:8788/#pool/" + invitedPool.id);
  await clientPage
    .getByRole("button", { name: "Le bassin", exact: true })
    .click();
  await clientPage
    .getByRole("button", { name: "Modifier", exact: true })
    .click();
  assert.equal(
    await clientPage.locator("[name=routine],[name=client_advice]").count(),
    0,
  );
  await clientPage.getByLabel("Volume (m³)", { exact: true }).fill("48");
  await clientPage
    .getByLabel("Traitement", { exact: true })
    .selectOption("chlorine");
  await clientPage
    .getByLabel("Type de filtre", { exact: true })
    .selectOption("glass");
  await clientPage.getByLabel("Marches", { exact: true }).uncheck();
  await clientPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await clientPage
    .getByRole("heading", { name: "Bassin invité par Lucie", exact: true })
    .waitFor();
  await clientPage.goto("http://127.0.0.1:8788/#pool/" + invitedPool.id);
  await clientPage
    .getByRole("heading", { name: "Historique du suivi", exact: true })
    .waitFor();
  assert.deepEqual(
    await clientPage.locator(".pool-tabs button").allTextContents(),
    ["Suivi", "Évolution", "Le bassin", "Accès"],
  );
  assert.equal(
    await clientPage
      .getByRole("button", { name: "Ajouter un pisciniste", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await clientPage
      .getByRole("button", { name: "Modifier la piscine", exact: true })
      .count(),
    0,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Commencer l’entretien", exact: true })
    .first()
    .click();
  assert.equal(
    await page.getByLabel("Brosser les marches", { exact: true }).count(),
    0,
  );
  await page.getByLabel("Nettoyer la ligne d’eau", { exact: true }).check();
  await page.locator("[name=photos]").setInputFiles({
    name: "entretien.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Conserver un brouillon", { exact: true }).check();
  await page
    .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reprendre le brouillon", exact: true })
    .waitFor();
  await clientPage.reload();
  assert.equal(
    await clientPage.getByText("Brouillon", { exact: true }).count(),
    0,
  );
  assert.equal(await clientPage.locator(".water-photo").count(), 0);
  await page
    .getByRole("button", { name: "Reprendre le brouillon", exact: true })
    .click();
  assert.equal(
    await page
      .getByLabel("Nettoyer la ligne d’eau", { exact: true })
      .isChecked(),
    true,
  );
  for (const c of await page.locator(".task-checkbox input").all())
    await c.check();
  for (const text of [
    "Effectuer le lavage du filtre",
    "Effectuer le rinçage après le lavage",
  ]) {
    const row = page
      .locator(".maintenance-task")
      .filter({ has: page.getByText(text, { exact: true }) });
    await row.getByRole("button", { name: "Non réalisé", exact: true }).click();
    await row
      .getByLabel("Pourquoi ?", { exact: true })
      .fill("Vanne bloquée, entretien du filtre reporté");
  }
  await page.getByLabel("pH", { exact: true }).fill("7.3");
  await page.getByLabel("Chlore (mg/L)", { exact: true }).fill("1.7");
  assert.equal(await page.locator("[name=duration]").count(), 0);
  assert.equal(await page.locator("[name=method]").count(), 0);
  assert.equal(
    await page
      .locator('.maintenance-task[data-task-id="analysis"] [name=ph]')
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator('.maintenance-task[data-task-id="analysis"] [name=chlorine]')
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator('.maintenance-task[data-task-id="treatment"] [name=products]')
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByLabel("Mesurer et renseigner le pH et le chlore", { exact: true })
      .isChecked(),
    true,
  );
  await page
    .getByLabel("Observations partagées", { exact: false })
    .fill(
      "Bassin nettoyé, eau claire. Produits disponibles pour le prochain passage.",
    );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".modal-body").evaluate((e) => (e.scrollTop = 0));
  assert.equal(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.scrollWidth > e.clientWidth),
    false,
  );
  await page.screenshot({
    path: ".test-artifacts/visit-workspace-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Terminer et partager", exact: true })
    .click();
  await page.getByText("Partagé", { exact: true }).waitFor();
  await clientPage.reload();
  await clientPage.locator(".water-photo img").waitFor();
  await clientPage.locator(".water-photo img").evaluate((img) => img.decode());
  assert.ok(
    await clientPage
      .locator(".water-photo img")
      .evaluate((img) => img.naturalWidth > 0),
  );
  await clientPage
    .getByRole("heading", { name: "Dernier entretien", exact: true })
    .waitFor();
  await clientPage
    .getByText(
      "Bassin nettoyé, eau claire. Produits disponibles pour le prochain passage.",
      { exact: true },
    )
    .first()
    .waitFor();
  await clientPage
    .getByText("Voir les tâches du passage", { exact: true })
    .click();
  assert.equal(
    await clientPage
      .getByText("Non réalisé : Vanne bloquée, entretien du filtre reporté", {
        exact: true,
      })
      .count(),
    2,
  );
  await clientPage.screenshot({
    path: ".test-artifacts/client-maintenance-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await clientPage.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await clientPage.evaluate(() => document.body.innerText.includes("—")),
    false,
  );
  await clientPage.setViewportSize({ width: 1440, height: 1080 });
  await clientPage.evaluate(() => scrollTo(0, 0));
  await clientPage.screenshot({
    path: ".test-artifacts/client-photo-desktop.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768, 1440]) {
    await clientPage.setViewportSize({ width, height: 844 });
    assert.equal(
      await clientPage.locator('.pool-tabs[data-count="4"] button').count(),
      4,
    );
    const clipped = await clientPage
      .locator(".pool-tabs button")
      .evaluateAll((els) =>
        els.some((el) => {
          const b = el.getBoundingClientRect();
          return b.x < 0 || b.right > innerWidth || b.height < 44;
        }),
      );
    assert.equal(clipped, false, `Client pool sections clipped at ${width}px`);
  }
  await linkedContext.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      flows: [
        "signup and recovery acknowledgement",
        "client pool creation",
        "self analysis and publication",
        "trends",
        "email-only account and authenticated email update",
        "client routes exclude professional preparation",
        "members",
        "independent professional signup",
        "agenda default and four professional tabs",
        "client directory and map after explicit invitation",
        "plan, perform and publish a visit",
        "inline analysis and products in maintenance task order, no duration field",
        "create and edit recurring schedules from pool and agenda",
        "client account access in header without navigation menus",
        "private activity statistics",
        "reference procedures",
        "professional mobile navigation",
        "day, Monday week and civil month at 320, 390, 768 and 1440px",
        "full-screen map, live filtering and direct touch dragging",
        "client and professional pool sections remain visible",
        "pool header and navigation persist, sections reuse prepared content and retain chart filters",
        "measurement method removed from client and professional forms",
        "calculators, guided maintenance and quiz",
        "mobile journal and report",
        "professional pool creation and client claim",
        "professional request joins existing client pool",
        "client invitation accepted by principal",
      ],
      pageErrors: errors,
    }),
  );
} catch (error) {
  console.error("Browser errors:", errors);
  await page.screenshot({
    path: ".test-artifacts/failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
  server.close();
}
