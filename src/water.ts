// ============================================================
// Moteur de diagnostic & dosage de l'eau de piscine
// ============================================================
// Calcule, à partir d'un relevé + des seuils idéaux d'une piscine,
// un diagnostic par paramètre (ok / bas / haut) et une recommandation
// de correction chiffrée selon le volume.
//
// Les dosages sont des ESTIMATIONS de bon sens (ordres de grandeur usuels
// du métier). Ils servent d'aide à la décision, pas de prescription.
// On reste volontairement prudent (fourchettes, arrondis).
// ============================================================

export interface PoolThresholds {
  volume_m3?: number | null
  ideal_ph_min?: number | null
  ideal_ph_max?: number | null
  ideal_chlorine_min?: number | null
  ideal_chlorine_max?: number | null
  ideal_salt_min?: number | null
  ideal_salt_max?: number | null
  ideal_tac_min?: number | null
  ideal_tac_max?: number | null
  ideal_stabilizer_min?: number | null
  ideal_stabilizer_max?: number | null
}

export interface Reading {
  ph?: number | null
  chlorine?: number | null
  salt?: number | null
  water_temp?: number | null
  stabilizer?: number | null
  tac?: number | null
}

export type Verdict = 'ok' | 'low' | 'high'

export interface ParamDiagnosis {
  key: string
  label: string
  value: number
  unit: string
  min: number | null
  max: number | null
  verdict: Verdict
  severity: 'ok' | 'warn' | 'alert' // gravité (warn = léger écart, alert = écart important)
  message: string                    // explication courte
  action: string | null              // correction recommandée (chiffrée si volume connu)
}

export interface WaterDiagnosis {
  status: 'ok' | 'warn' | 'alert' | 'empty'
  summary: string
  params: ParamDiagnosis[]
  hasIssues: boolean
}

function n(v: any): number | null {
  if (v === '' || v == null || isNaN(parseFloat(v))) return null
  return parseFloat(v)
}

function round(v: number, step = 1): number {
  return Math.round(v / step) * step
}

// Renvoie un texte de quantité lisible (g ou kg, mL ou L)
function fmtGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)} kg`
  return `${round(g, 10)} g`
}
function fmtMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`
  return `${round(ml, 10)} mL`
}

// ============================================================
// Diagnostic d'un paramètre
// ============================================================
function diagPh(val: number, min: number, max: number, vol: number | null): ParamDiagnosis {
  let verdict: Verdict = 'ok', severity: ParamDiagnosis['severity'] = 'ok', message = 'pH équilibré', action: string | null = null
  if (val < min) {
    verdict = 'low'
    const ecart = min - val
    severity = ecart > 0.4 ? 'alert' : 'warn'
    message = 'pH trop bas (eau acide, agressive pour les équipements et la peau)'
    if (vol) {
      // ~ +0.1 de pH par 100 g de pH+ (carbonate de soude) pour 10 m³
      const g = ecart * 10 * 100 * (vol / 10)
      action = `Ajouter environ ${fmtGrams(g)} de pH+ (rehausseur)`
    } else action = 'Ajouter du pH+ (rehausseur de pH)'
  } else if (val > max) {
    verdict = 'high'
    const ecart = val - max
    severity = ecart > 0.4 ? 'alert' : 'warn'
    message = 'pH trop haut (eau calcaire, chlore moins efficace, risque de dépôts)'
    if (vol) {
      // ~ -0.1 de pH par 100 mL de pH- (acide) pour 10 m³
      const ml = ecart * 10 * 100 * (vol / 10)
      action = `Ajouter environ ${fmtMl(ml)} de pH- (réducteur)`
    } else action = 'Ajouter du pH- (réducteur de pH)'
  }
  return { key: 'ph', label: 'pH', value: val, unit: '', min, max, verdict, severity, message, action }
}

function diagChlorine(val: number, min: number, max: number, vol: number | null): ParamDiagnosis {
  let verdict: Verdict = 'ok', severity: ParamDiagnosis['severity'] = 'ok', message = 'Chlore correct', action: string | null = null
  if (val < min) {
    verdict = 'low'
    const ecart = min - val
    severity = val < min * 0.5 ? 'alert' : 'warn'
    message = 'Chlore insuffisant — risque de développement d\'algues et bactéries'
    if (vol) {
      // ~ +1 mg/L par 10 g de chlore choc / m³ (ordre de grandeur)
      const g = ecart * 10 * vol
      action = `Ajouter environ ${fmtGrams(g)} de chlore (choc ou lent selon besoin)`
    } else action = 'Ajouter du chlore'
  } else if (val > max) {
    verdict = 'high'
    severity = val > max * 2 ? 'alert' : 'warn'
    message = 'Chlore trop élevé — irritant, attendre avant la baignade'
    action = 'Stopper la chloration, laisser baisser (ne plus ajouter de chlore)'
  }
  return { key: 'chlorine', label: 'Chlore', value: val, unit: 'mg/L', min, max, verdict, severity, message, action }
}

function diagSalt(val: number, min: number, max: number, vol: number | null): ParamDiagnosis {
  let verdict: Verdict = 'ok', severity: ParamDiagnosis['severity'] = 'ok', message = 'Taux de sel correct', action: string | null = null
  if (val < min) {
    verdict = 'low'
    severity = 'warn'
    message = 'Sel insuffisant — l\'électrolyseur produit mal le chlore'
    if (vol) {
      // pour remonter de (min-val) g/L : (min-val) kg de sel par m³
      const kg = (min - val) * vol
      action = `Ajouter environ ${kg >= 1 ? kg.toFixed(1) + ' kg' : fmtGrams(kg * 1000)} de sel`
    } else action = 'Ajouter du sel'
  } else if (val > max) {
    verdict = 'high'
    severity = 'warn'
    message = 'Sel trop élevé — diluer en renouvelant une partie de l\'eau'
    action = 'Vidanger partiellement et compléter en eau claire'
  }
  return { key: 'salt', label: 'Sel', value: val, unit: 'g/L', min, max, verdict, severity, message, action }
}

function diagTac(val: number, min: number, max: number): ParamDiagnosis {
  let verdict: Verdict = 'ok', severity: ParamDiagnosis['severity'] = 'ok', message = 'TAC (alcalinité) correct', action: string | null = null
  if (val < min) {
    verdict = 'low'; severity = 'warn'
    message = 'TAC bas — le pH devient instable (effet yo-yo)'
    action = 'Ajouter du correcteur d\'alcalinité (TAC+ / bicarbonate)'
  } else if (val > max) {
    verdict = 'high'; severity = 'warn'
    message = 'TAC élevé — difficile d\'ajuster le pH'
    action = 'Baisser progressivement avec du pH- (correcteur acide)'
  }
  return { key: 'tac', label: 'TAC', value: val, unit: 'mg/L', min, max, verdict, severity, message, action }
}

function diagStabilizer(val: number, min: number, max: number): ParamDiagnosis {
  let verdict: Verdict = 'ok', severity: ParamDiagnosis['severity'] = 'ok', message = 'Stabilisant correct', action: string | null = null
  if (val < min) {
    verdict = 'low'; severity = 'warn'
    message = 'Stabilisant bas — le chlore est détruit trop vite par le soleil'
    action = 'Ajouter du stabilisant (acide cyanurique)'
  } else if (val > max) {
    verdict = 'high'; severity = val > max * 1.5 ? 'alert' : 'warn'
    message = 'Stabilisant trop élevé — le chlore devient inactif (blocage)'
    action = 'Renouveler une partie de l\'eau pour diluer le stabilisant'
  }
  return { key: 'stabilizer', label: 'Stabilisant', value: val, unit: 'mg/L', min, max, verdict, severity, message, action }
}

// ============================================================
// Diagnostic global d'un relevé
// ============================================================
export function diagnoseWater(reading: Reading, pool: PoolThresholds): WaterDiagnosis {
  const vol = n(pool.volume_m3)
  const params: ParamDiagnosis[] = []

  const ph = n(reading.ph)
  if (ph != null) params.push(diagPh(ph, n(pool.ideal_ph_min) ?? 7.0, n(pool.ideal_ph_max) ?? 7.4, vol))

  const cl = n(reading.chlorine)
  if (cl != null) params.push(diagChlorine(cl, n(pool.ideal_chlorine_min) ?? 1.0, n(pool.ideal_chlorine_max) ?? 2.0, vol))

  const salt = n(reading.salt)
  if (salt != null) params.push(diagSalt(salt, n(pool.ideal_salt_min) ?? 3.0, n(pool.ideal_salt_max) ?? 5.0, vol))

  const tac = n(reading.tac)
  if (tac != null) params.push(diagTac(tac, n(pool.ideal_tac_min) ?? 80, n(pool.ideal_tac_max) ?? 120))

  const stab = n(reading.stabilizer)
  if (stab != null) params.push(diagStabilizer(stab, n(pool.ideal_stabilizer_min) ?? 30, n(pool.ideal_stabilizer_max) ?? 50))

  if (params.length === 0) {
    return { status: 'empty', summary: 'Aucun relevé saisi', params: [], hasIssues: false }
  }

  const alerts = params.filter(p => p.severity === 'alert')
  const warns = params.filter(p => p.severity === 'warn')
  const hasIssues = alerts.length > 0 || warns.length > 0

  let status: WaterDiagnosis['status'] = 'ok'
  let summary = 'Eau équilibrée 👍 Tous les paramètres sont dans les normes.'
  if (alerts.length) {
    status = 'alert'
    summary = `${alerts.length} paramètre(s) à corriger d'urgence` + (warns.length ? ` et ${warns.length} à surveiller.` : '.')
  } else if (warns.length) {
    status = 'warn'
    summary = `${warns.length} paramètre(s) à surveiller / ajuster.`
  }

  return { status, summary, params, hasIssues }
}
