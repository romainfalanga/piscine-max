// Géocodage d'adresses via Nominatim (OpenStreetMap) - gratuit, sans clé API

export interface GeoResult {
  lat: number
  lng: number
  display_name: string
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!address || address.trim().length < 3) return null
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(
    address
  )}`
  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim exige un User-Agent identifiant l'application
        'User-Agent': 'PiscineMax/1.0 (pool maintenance tool)',
        Accept: 'application/json'
      }
    })
    if (!res.ok) return null
    const data = (await res.json()) as any[]
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      display_name: first.display_name
    }
  } catch {
    return null
  }
}
