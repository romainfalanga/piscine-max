// ============================================================
// src/seasons.ts — logique saisonnière côté backend
// ============================================================
// Port minimal de la logique front (views-agenda.js) pour que les ALERTES
// (retard de passage) utilisent la cadence de la saison ACTIVE plutôt que
// l'intervalle global expected_interval_days.
//
// Une "saison" (pool_seasons) = une période de l'année (MM-DD répétable)
// avec sa propre fréquence interval_days. La période peut "boucler" l'année
// (ex. 11-01 -> 03-31 = hivernage).

export interface Season {
  id?: number
  pool_id?: number
  label?: string | null
  start_md: string        // "MM-DD"
  end_md: string          // "MM-DD"
  interval_days: number
  weekday?: number | null
  sort_order?: number
  active?: number
}

function mdToNum(md: string): number | null {
  if (!md || !/^\d{2}-\d{2}$/.test(md)) return null
  const [mm, dd] = md.split('-').map(Number)
  return mm * 100 + dd
}

// La date tombe-t-elle dans la plage [start_md, end_md] (gère le passage d'année) ?
export function dateInSeason(date: Date, season: Season): boolean {
  const cur = (date.getMonth() + 1) * 100 + date.getDate()
  const s = mdToNum(season.start_md), e = mdToNum(season.end_md)
  if (s == null || e == null) return false
  if (s <= e) return cur >= s && cur <= e   // ex. 06-01 -> 09-30 (même année)
  return cur >= s || cur <= e                // ex. 11-01 -> 03-31 (boucle l'année)
}

// Renvoie la saison active pour une date (la première qui matche), ou null.
export function activeSeasonFor(seasons: Season[], date: Date): Season | null {
  for (const s of seasons || []) {
    if (s.active !== 0 && dateInSeason(date, s)) return s
  }
  return null
}

// Intervalle effectif (en jours) pour une date :
// - si la piscine a des saisons : interval_days de la saison active,
//   ou null si on est hors de toute saison (= pas de passage attendu → pas de retard).
// - sinon : l'intervalle global fourni en repli (fallbackDays).
export function effectiveIntervalForDate(
  seasons: Season[],
  date: Date,
  fallbackDays: number | null
): number | null {
  if (seasons && seasons.length) {
    const s = activeSeasonFor(seasons, date)
    if (!s) return null  // hors saison : aucune attente de passage
    const n = Number(s.interval_days)
    return n > 0 ? n : (fallbackDays && fallbackDays > 0 ? fallbackDays : null)
  }
  return fallbackDays && fallbackDays > 0 ? fallbackDays : null
}

// Libellé de la saison active à une date (pour affichage), ou null.
export function effectiveSeasonLabel(seasons: Season[], date: Date): string | null {
  const s = activeSeasonFor(seasons, date)
  if (!s) return null
  return s.label || `${s.start_md}→${s.end_md}`
}

// Vérifie qu'une liste de saisons ne contient pas de chevauchement de périodes.
// Renvoie un message d'erreur (string) si chevauchement, sinon null.
export function findSeasonOverlap(seasons: Season[]): string | null {
  const active = (seasons || []).filter(s => s.active !== 0)
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (seasonsOverlap(active[i], active[j])) {
        const a = active[i].label || `${active[i].start_md}→${active[i].end_md}`
        const b = active[j].label || `${active[j].start_md}→${active[j].end_md}`
        return `Les saisons « ${a} » et « ${b} » se chevauchent.`
      }
    }
  }
  return null
}

// Deux saisons se chevauchent-elles ? On échantillonne chaque jour de l'année
// (366 points) : si un même jour appartient aux deux, il y a chevauchement.
// Robuste au passage d'année, simple et suffisant (366 itérations).
function seasonsOverlap(a: Season, b: Season): boolean {
  const year = 2024 // année bissextile pour couvrir le 29/02
  const d = new Date(year, 0, 1)
  for (let i = 0; i < 366; i++) {
    if (dateInSeason(d, a) && dateInSeason(d, b)) return true
    d.setDate(d.getDate() + 1)
  }
  return false
}
