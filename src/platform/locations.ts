import { Hono } from "hono";
import { Env, fail, str, number, limit, who } from "./core";
export const locations = new Hono<Env>();
locations.get("/addresses", async (c) => {
  const q = str(c.req.query("q"), 200, true);
  if (q.length < 4) return c.json({ items: [] });
  await limit(c, `geocode:${who(c).id}`, 60, 60);
  const url = new URL("https://data.geopf.fr/geocodage/search");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("index", "address");
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { Accept: "application/json" },
    });
    if (!r.ok) throw new Error("upstream");
    const data: any = await r.json();
    const items = (data.features || [])
      .filter((f: any) => f.geometry?.type === "Point" && f.properties?.label)
      .map((f: any) => ({
        address: f.properties.label,
        city: f.properties.city || f.properties.city_name || "",
        city_code: f.properties.citycode || "",
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        type: f.properties.type || "address",
      }))
      .filter(
        (p: any) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
      );
    return c.json({ items });
  } catch {
    fail(
      "La recherche d’adresse est momentanément indisponible. Réessayez ou ajoutez l’adresse plus tard.",
      503,
    );
  }
});
export function locationBody(b: any, previous: any = null) {
  if (b.location !== undefined && b.location !== null) {
    const l = b.location;
    if (typeof l !== "object" || Array.isArray(l)) fail("Adresse invalide.");
    const lat = number(l.latitude, -90, 90),
      lng = number(l.longitude, -180, 180);
    if (lat == null || lng == null)
      fail("Choisissez une adresse dans les suggestions.");
    const address = str(l.address, 300, true),
      city = str(l.city, 100),
      code = str(l.city_code, 5);
    if (code && !/^\d[\dAB]\d{3}$/.test(code)) fail("Code commune invalide.");
    return {
      address,
      city,
      code: code || null,
      lat,
      lng,
      precision: l.type === "municipality" ? "municipality" : "address",
    };
  }
  if (previous && b.address === undefined && b.location !== null)
    return {
      address: previous.address,
      city: previous.city,
      code: previous.city_code,
      lat: previous.latitude,
      lng: previous.longitude,
      precision: previous.location_precision,
    };
  const address = str(b.address, 300);
  if (previous && address === previous.address && b.location !== null)
    return {
      address,
      city: previous.city,
      code: previous.city_code,
      lat: previous.latitude,
      lng: previous.longitude,
      precision: previous.location_precision,
    };
  return {
    address,
    city: "",
    code: null,
    lat: null,
    lng: null,
    precision: "none",
  };
}
