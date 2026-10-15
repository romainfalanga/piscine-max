import { chromium } from "playwright-core";
import bundled from "@sparticuz/chromium";
import { mkdirSync } from "node:fs";
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
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  locale: "fr-FR",
});
const page = await context.newPage(),
  errors = [];
page.setDefaultTimeout(10000);
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:8788/");
  await page.screenshot({
    path: ".test-artifacts/login-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  const suffix = Date.now().toString().slice(-7);
  await page.getByLabel("Votre nom", { exact: true }).fill("Camille Martin");
  await page
    .getByLabel("Identifiant", { exact: true })
    .fill("camille-" + suffix);
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("Browser fixture password only!");
  await page
    .getByRole("button", { name: "Créer mon compte gratuit", exact: false })
    .click();
  await page.getByLabel("J’ai sauvegardé mon code personnel.").check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter une piscine", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Nom de la piscine", { exact: true })
    .fill("La piscine des Oliviers");
  await page.locator("#city-search").fill("Bandol");
  await page
    .getByRole("button", { name: "Rechercher", exact: true })
    .last()
    .click();
  await page.locator("[name=city_code]").selectOption("83009");
  await page
    .getByLabel("Adresse exacte", { exact: false })
    .fill("Adresse de démonstration");
  await page.getByLabel("Volume (m³)", { exact: false }).fill("48");
  await page.getByLabel("Traitement", { exact: true }).selectOption("salt");
  await page
    .getByRole("button", { name: "Créer ma piscine", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "La piscine des Oliviers", exact: true })
    .waitFor();
  const poolId = page.url().split("#pool/")[1];
  await page
    .getByRole("button", { name: "Ajouter une analyse", exact: false })
    .first()
    .click();
  await page.getByLabel("pH", { exact: true }).fill("7.3");
  await page.getByLabel("Chlore (mg/L)", { exact: true }).fill("1.8");
  await page.getByLabel("Température (°C)", { exact: true }).fill("25");
  await page
    .getByLabel("Observations partagées", { exact: false })
    .fill("Eau claire, filtration régulière. Le carnet commence ici.");
  await page
    .getByRole("button", { name: "Terminer et partager", exact: true })
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
  await page.getByRole("button", { name: "Accès", exact: true }).click();
  await page.getByText("Responsable des accès", { exact: false }).waitFor();
  await page
    .getByRole("link", { name: "Mon compte", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Je souhaite aussi activer mon espace pisciniste gratuit.")
    .check();
  await page
    .getByRole("button", { name: "Enregistrer mon profil", exact: true })
    .click();
  await page.getByLabel("Nom professionnel", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Mon espace pisciniste", exact: true })
    .click();
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
    username: "olivier-" + suffix,
    name: "Olivier Laurent",
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
    { username: "camille-" + suffix, kind: "principal" },
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
  await page
    .getByRole("button", { name: "Terminer et partager", exact: true })
    .click();
  await page.getByText("Partagé", { exact: true }).waitFor();
  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByText("Effectué", { exact: true }).waitFor();
  await nav.getByRole("link", { name: "Clients", exact: true }).click();
  await page
    .getByRole("heading", { name: "Olivier Laurent", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-clients-desktop.png",
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Carte", exact: true }).click();
  await page.locator(".classic-map-marker").waitFor();
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
  await page.goto("http://127.0.0.1:8788/#pool/" + poolId);
  await page
    .getByRole("heading", { name: "La piscine des Oliviers", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/client-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Mobile horizontal overflow",
  );
  await page
    .getByRole("button", { name: "Voir le détail", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Relevé d’analyse", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/report-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      flows: [
        "signup and recovery acknowledgement",
        "client pool creation",
        "self analysis and publication",
        "trends",
        "supplies",
        "members",
        "enable pro profile",
        "agenda default and four professional tabs",
        "client directory and map after explicit invitation",
        "plan, perform and publish a visit",
        "private activity statistics",
        "reference procedures",
        "professional mobile navigation",
        "calculators, guided maintenance and quiz",
        "mobile journal and report",
      ],
      screenshots: 10,
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
