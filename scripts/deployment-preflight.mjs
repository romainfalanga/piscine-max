// Do not let an automatic Pages preview replace or reuse the legacy database.
import { readFileSync } from "node:fs";
if (process.env.CF_PAGES === "1" || process.argv.includes("--remote")) {
  const config = JSON.parse(
    readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  );
  const production = config.d1_databases?.[0],
    preview = config.env?.preview?.d1_databases?.[0];
  const oldDatabase = "d5b477c2-1899-481d-ab38-21b95ded5e10";
  const valid = (x) =>
    x && /^[a-f0-9-]{36}$/.test(x.database_id) && x.database_id !== oldDatabase;
  const prodBucket = config.r2_buckets?.[0]?.bucket_name,
    previewBucket = config.env?.preview?.r2_buckets?.[0]?.bucket_name;
  if (
    !valid(production) ||
    !valid(preview) ||
    production.database_id === preview.database_id ||
    !prodBucket ||
    prodBucket === previewBucket ||
    [prodBucket, previewBucket].includes("piscine-max-photos")
  ) {
    console.error(
      "Déploiement arrêté : configurer deux nouvelles bases D1 réelles et deux buckets R2 privés distincts dans wrangler.jsonc. Lire docs/DEPLOIEMENT.md. Les identifiants locaux ne sont pas déployables.",
    );
    process.exit(1);
  }
}
