// The Cloudflare credential stays inside GitHub Actions. Never print API payloads,
// response bodies, environment values, or secrets. Only this preview is writable.
import { randomBytes } from "node:crypto";
import { writeFileSync, appendFileSync } from "node:fs";
const account = "834ee251038ce2f923cba9847f973c40";
const project = "peaceinblue-recette",
  database = "peaceinblue-platform-preview",
  bucket = "peaceinblue-preview-photos";
const token = process.env.CLOUDFLARE_API_TOKEN;
const report = {
  account,
  project,
  database,
  bucket,
  checks: [],
  stage: "initialization",
  completed: false,
};
const save = () =>
  writeFileSync(
    "preview-resources.json",
    JSON.stringify(report, null, 2) + "\n",
  );
async function api(method, path, body, allow404 = false) {
  const r = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" + account + path,
    {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30000),
    },
  );
  const json = await r.json().catch(() => ({}));
  if (allow404 && r.status === 404) return null;
  if (!r.ok || json.success === false)
    throw new Error(
      `${method} ${path.split("?")[0]} : HTTP ${r.status}, codes ${(json.errors || []).map((e) => e.code).join(",") || "unknown"}`,
    );
  return json.result;
}
try {
  if (!token)
    throw new Error(
      "Secret CLOUDFLARE_API_TOKEN absent du contexte Actions de cette branche. Seul le nom exact et le niveau du secret sont nécessaires pour corriger cela ; ne jamais partager sa valeur.",
    );
  if (process.env.CLOUDFLARE_ACCOUNT_ID !== account)
    throw new Error("Unexpected Cloudflare account; stopped.");
  report.stage = "permissions";
  const databases = await api("GET", "/d1/database?name=" + database);
  report.checks.push("D1 read accepted");
  const existingProject = await api(
    "GET",
    "/pages/projects/" + project,
    undefined,
    true,
  );
  report.checks.push("Pages access accepted");
  const buckets = await api("GET", "/r2/buckets?per_page=1000");
  report.checks.push("R2 read accepted");
  let db = databases.find((d) => d.name === database);
  if (!db) {
    report.stage = "create D1";
    db = await api("POST", "/d1/database", {
      name: database,
      jurisdiction: "eu",
    });
    report.checks.push("Isolated D1 created");
  }
  if (!db?.uuid || db.uuid === "d5b477c2-1899-481d-ab38-21b95ded5e10")
    throw new Error("Preview database isolation failed");
  report.database_id = db.uuid;
  save();
  const bucketList = Array.isArray(buckets) ? buckets : buckets.buckets || [];
  if (!bucketList.some((b) => b.name === bucket)) {
    report.stage = "create R2";
    await api("POST", "/r2/buckets", {
      name: bucket,
      locationHint: "weur",
      storageClass: "Standard",
    });
    report.checks.push("Isolated R2 bucket created");
  }
  const managed = await api(
    "GET",
    "/r2/buckets/" + bucket + "/domains/managed",
  );
  const custom = await api("GET", "/r2/buckets/" + bucket + "/domains/custom");
  if (managed.enabled || (custom.domains || []).some((d) => d.enabled))
    throw new Error("Preview photos bucket has a public domain; stopped.");
  report.checks.push("Photos bucket is private");
  if (existingProject) {
    for (const cfg of Object.values(existingProject.deployment_configs || {})) {
      if (cfg.d1_databases?.DB?.id && cfg.d1_databases.DB.id !== db.uuid)
        throw new Error(
          "Existing preview project uses an unexpected D1; stopped.",
        );
      if (cfg.r2_buckets?.PHOTOS?.name && cfg.r2_buckets.PHOTOS.name !== bucket)
        throw new Error(
          "Existing preview project uses an unexpected R2; stopped.",
        );
    }
  }
  const envVars = { APP_STAGE: { type: "plain_text", value: "preview" } };
  // Preserve an existing secret: rotating the pepper would invalidate passwords.
  if (!existingProject) {
    envVars.SESSION_SECRET = {
      type: "secret_text",
      value: randomBytes(48).toString("hex"),
    };
  } else if (
    !existingProject.deployment_configs?.production?.env_vars?.SESSION_SECRET
  ) {
    const result = await api("POST", "/d1/database/" + db.uuid + "/query", {
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
    });
    if (result[0]?.results?.length) {
      const n = await api("POST", "/d1/database/" + db.uuid + "/query", {
        sql: "SELECT count(*) n FROM users",
      });
      if (n[0]?.results?.[0]?.n > 0)
        throw new Error(
          "Existing accounts but no authentication secret; manual recovery required.",
        );
    }
    envVars.SESSION_SECRET = {
      type: "secret_text",
      value: randomBytes(48).toString("hex"),
    };
  }
  const config = {
    compatibility_date: "2026-09-01",
    compatibility_flags: ["nodejs_compat"],
    d1_databases: { DB: { id: db.uuid } },
    r2_buckets: { PHOTOS: { name: bucket } },
    env_vars: envVars,
  };
  report.stage = "configure Pages";
  await api(
    existingProject ? "PATCH" : "POST",
    "/pages/projects" + (existingProject ? "/" + project : ""),
    {
      name: project,
      production_branch: "codex/peaceinblue-platform",
      deployment_configs: { production: config, preview: config },
    },
  );
  report.checks.push(
    existingProject
      ? "Preview Pages bindings verified"
      : "Separate Pages preview created",
  );
  // This file contains only resource metadata, never a secret. It is selected only
  // after the normal local build; no production deployment command is invoked.
  writeFileSync(
    "preview.wrangler.jsonc",
    JSON.stringify(
      {
        name: project,
        compatibility_date: "2026-09-01",
        compatibility_flags: ["nodejs_compat"],
        pages_build_output_dir: "./dist",
        d1_databases: [
          {
            binding: "DB",
            database_name: database,
            database_id: db.uuid,
            migrations_dir: "schema",
          },
        ],
        r2_buckets: [{ binding: "PHOTOS", bucket_name: bucket }],
        vars: { APP_STAGE: "preview" },
      },
      null,
      2,
    ) + "\n",
  );
  report.url = "https://" + project + ".pages.dev";
  report.stage = "resources ready";
  report.completed = true;
  save();
  console.log(JSON.stringify(report));
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Préproduction isolée\n\nProjet : ${project}\n\nBase : ${database}\n\nPhotos privées : ${bucket}\n\nLe projet piscine-max et ses données n'ont pas été modifiés.\n`,
    );
} catch (error) {
  report.error = error.message;
  save();
  console.error(error.message);
  process.exitCode = 1;
}
