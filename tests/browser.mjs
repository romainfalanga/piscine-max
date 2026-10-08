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
  await page
    .getByRole("heading", { name: "Bonjour Camille.", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/pro-dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Entraide", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "Le métier gagne à se partager.",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Nouvelle demande", exact: false })
    .click();
  await page
    .getByLabel("En quelques mots", { exact: true })
    .fill("Filtration : vérifier un bruit intermittent");
  await page
    .getByLabel("Décrivez le problème", { exact: false })
    .fill(
      "Le panier est propre. Quels contrôles visuels conseillez-vous avant une intervention spécialisée ?",
    );
  await page.locator("#city-search").fill("Bandol");
  await page
    .getByRole("button", { name: "Rechercher", exact: true })
    .last()
    .click();
  await page.locator("[name=city_code]").selectOption("83009");
  await page
    .getByLabel("Portée de l’avis technique", { exact: true })
    .selectOption("national");
  await page
    .getByRole("button", { name: "Publier ma demande", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Filtration : vérifier un bruit intermittent",
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel("Votre réponse", { exact: true })
    .fill("Précision : le bruit apparaît uniquement après plusieurs minutes.");
  await page
    .getByRole("button", { name: "Publier ma réponse", exact: true })
    .click();
  await page
    .getByText(
      "Précision : le bruit apparaît uniquement après plusieurs minutes.",
      { exact: true },
    )
    .waitFor();
  await page.screenshot({
    path: ".test-artifacts/help-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
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
        "dashboard",
        "professional help and reply",
        "mobile journal and report",
      ],
      screenshots: 6,
      pageErrors: errors,
    }),
  );
} catch (error) {
  await page.screenshot({
    path: ".test-artifacts/failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
  server.close();
}
