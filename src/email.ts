// ============================================================
// E-MAIL — Compte rendu de passage envoyé au client (via Resend)
// ============================================================
// Le client n'a plus de compte : après chaque passage validé par le
// pisciniste, un e-mail HTML structuré lui est envoyé automatiquement.
// On centralise tout ce qui a été relevé : état de l'eau, produits,
// photos, conseils. Tout est en styles inline (compatibilité clients mail).
// ============================================================

import type { WaterDiagnosis } from './water'

// Échappement HTML basique pour injecter du contenu utilisateur en sécurité
function esc(s: any): string {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any
  )[m])
}

const C = {
  ink: '#0f172a', sub: '#64748b', soft: '#94a3b8',
  brand: '#0891b2', brandDark: '#0e7490',
  ok: '#16a34a', okBg: '#dcfce7',
  warn: '#d97706', warnBg: '#fef3c7',
  alert: '#dc2626', alertBg: '#fee2e2',
  line: '#e2e8f0', card: '#ffffff', bg: '#f1f5f9',
}

export interface ReportData {
  log: any
  pool: any
  photos: { id: number; caption: string | null; url: string }[]
  diagnosis: WaterDiagnosis
}

// URL absolue d'une photo (les liens dans un mail doivent être absolus)
function absUrl(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return origin.replace(/\/$/, '') + path
}

function statusBadge(status: string): string {
  const map: Record<string, [string, string, string]> = {
    ok: [C.ok, C.okBg, 'Eau équilibrée'],
    warn: [C.warn, C.warnBg, 'À surveiller'],
    alert: [C.alert, C.alertBg, 'Action recommandée'],
    empty: [C.sub, '#f1f5f9', 'Pas de relevé'],
  }
  const [col, bg, label] = map[status] || map.empty
  return `<span style="display:inline-block;background:${bg};color:${col};font-weight:700;font-size:13px;padding:5px 12px;border-radius:999px">${label}</span>`
}

// Génère le corps HTML complet de l'e-mail de compte rendu
export function renderReportEmail(data: ReportData, origin: string): string {
  const { log, pool, photos, diagnosis } = data
  const clientName = pool?.client_name || 'Cher client'
  const poolLabel = pool?.label || 'Votre piscine'
  const proName = pool?.pro_company || pool?.pro_name || 'Votre pisciniste'
  const proPhone = pool?.pro_phone
  const dateStr = log?.done_date
    ? new Date(log.done_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const skipped = log?.status === 'skipped'

  // --- Relevés d'eau ---
  const vals: [string, string][] = []
  if (log?.ph != null) vals.push(['pH', String(log.ph)])
  if (log?.chlorine != null) vals.push(['Chlore', log.chlorine + ' mg/L'])
  if (log?.salt != null) vals.push(['Sel', log.salt + ' g/L'])
  if (log?.water_temp != null) vals.push(['Température', log.water_temp + ' °C'])
  if (log?.stabilizer != null) vals.push(['Stabilisant', log.stabilizer + ' mg/L'])
  if (log?.tac != null) vals.push(['TAC', log.tac + ' mg/L'])

  const valsHtml = vals.length ? `
    <tr><td style="padding:0 24px 8px">
      <p style="margin:18px 0 8px;font-size:12px;font-weight:700;color:${C.soft};text-transform:uppercase;letter-spacing:.04em">Relevés de l'eau</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0">
        <tr>${vals.map(([k, v]) => `
          <td align="center" style="background:${C.bg};border-radius:10px;padding:12px 6px">
            <div style="font-size:11px;color:${C.soft}">${esc(k)}</div>
            <div style="font-size:17px;font-weight:800;color:${C.ink};margin-top:2px">${esc(v)}</div>
          </td>`).join('')}</tr>
      </table>
    </td></tr>` : ''

  // --- Diagnostic / conseils ---
  let diagHtml = ''
  if (diagnosis && diagnosis.status !== 'empty') {
    const issues = (diagnosis.params || []).filter((p: any) => p.severity !== 'ok')
    const rows = issues.map((p: any) => {
      const col = p.severity === 'alert' ? C.alert : C.warn
      const bg = p.severity === 'alert' ? C.alertBg : C.warnBg
      return `
        <div style="border-left:4px solid ${col};background:${bg};border-radius:8px;padding:10px 12px;margin-bottom:8px">
          <div style="font-weight:700;color:${C.ink};font-size:14px">${esc(p.label)} : ${esc(String(p.value))}${p.unit ? ' ' + esc(p.unit) : ''}</div>
          <div style="font-size:13px;color:${C.sub};margin-top:2px">${esc(p.message)}</div>
          ${p.action ? `<div style="font-size:13px;color:${col};font-weight:600;margin-top:4px">➜ ${esc(p.action)}</div>` : ''}
        </div>`
    }).join('')
    diagHtml = `
      <tr><td style="padding:8px 24px">
        <p style="margin:18px 0 8px;font-size:12px;font-weight:700;color:${C.soft};text-transform:uppercase;letter-spacing:.04em">Diagnostic de l'eau</p>
        <div style="background:${C.bg};border-radius:10px;padding:12px 14px;font-size:14px;color:${C.ink};margin-bottom:${issues.length ? '10px' : '0'}">${esc(diagnosis.summary)}</div>
        ${rows}
      </td></tr>`
  }

  // --- Produits ajoutés ---
  const productsHtml = log?.products_added ? `
    <tr><td style="padding:8px 24px">
      <p style="margin:18px 0 8px;font-size:12px;font-weight:700;color:${C.soft};text-transform:uppercase;letter-spacing:.04em">Produits ajoutés</p>
      <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:12px 14px;font-size:14px;color:${C.brandDark}">${esc(log.products_added)}</div>
    </td></tr>` : ''

  // --- Notes du pisciniste ---
  const notesHtml = log?.notes ? `
    <tr><td style="padding:8px 24px">
      <p style="margin:18px 0 8px;font-size:12px;font-weight:700;color:${C.soft};text-transform:uppercase;letter-spacing:.04em">Note du pisciniste</p>
      <div style="font-size:14px;color:${C.sub};font-style:italic;line-height:1.5">"${esc(log.notes)}"</div>
    </td></tr>` : ''

  // --- Photos ---
  const photosHtml = (photos && photos.length) ? `
    <tr><td style="padding:8px 24px">
      <p style="margin:18px 0 8px;font-size:12px;font-weight:700;color:${C.soft};text-transform:uppercase;letter-spacing:.04em">Photos du passage</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${photos.slice(0, 3).map(p => `
          <td width="33%" style="padding:3px">
            <img src="${esc(absUrl(origin, p.url))}" alt="${esc(p.caption || 'Photo')}" width="100%" style="display:block;border-radius:8px;border:1px solid ${C.line};max-width:100%;height:auto">
          </td>`).join('')}
      </tr></table>
    </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compte rendu de passage</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">

        <!-- En-tête -->
        <tr><td style="background:linear-gradient(135deg,${C.brand},${C.brandDark});padding:28px 24px">
          <table role="presentation" width="100%"><tr>
            <td>
              <div style="font-size:13px;color:#cffafe;font-weight:600;letter-spacing:.05em">COMPTE RENDU DE PASSAGE</div>
              <div style="font-size:22px;color:#ffffff;font-weight:800;margin-top:4px">${esc(poolLabel)}</div>
              <div style="font-size:13px;color:#e0f2fe;margin-top:2px;text-transform:capitalize">${esc(dateStr)}</div>
            </td>
            <td align="right" valign="top">
              <div style="font-size:32px">💧</div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Salutation + statut -->
        <tr><td style="padding:24px 24px 0">
          <p style="margin:0 0 6px;font-size:15px;color:${C.ink}">Bonjour ${esc(clientName)},</p>
          <p style="margin:0 0 14px;font-size:14px;color:${C.sub};line-height:1.5">
            ${skipped
              ? 'Le passage prévu a été reporté. Voici le récapitulatif.'
              : 'Votre piscine a été entretenue. Voici le détail de ce qui a été relevé et réalisé pendant le passage.'}
          </p>
          ${statusBadge(diagnosis?.status || 'empty')}
        </td></tr>

        ${valsHtml}
        ${diagHtml}
        ${productsHtml}
        ${notesHtml}
        ${photosHtml}

        <!-- Pied : pisciniste -->
        <tr><td style="padding:22px 24px 8px">
          <div style="border-top:1px solid ${C.line};padding-top:16px">
            <div style="font-size:13px;color:${C.sub}">Réalisé par</div>
            <div style="font-size:15px;font-weight:700;color:${C.ink};margin-top:2px">${esc(proName)}</div>
            ${log?.done_by_name && log.done_by_name !== proName ? `<div style="font-size:13px;color:${C.sub}">${esc(log.done_by_name)}</div>` : ''}
            ${proPhone ? `<div style="font-size:13px;color:${C.brand};margin-top:4px">📞 ${esc(proPhone)}</div>` : ''}
          </div>
        </td></tr>

        <tr><td style="padding:8px 24px 26px">
          <p style="margin:0;font-size:11px;color:${C.soft};line-height:1.5">
            Cet e-mail vous est envoyé automatiquement après le passage de votre pisciniste.
            Les dosages indiqués sont des estimations d'aide à la décision. Pour toute question, contactez directement votre pisciniste.
          </p>
        </td></tr>

      </table>
      <div style="font-size:11px;color:${C.soft};margin-top:14px">Piscine Max · Suivi d'entretien de piscines</div>
    </td></tr>
  </table>
</body></html>`
}

// Sujet de l'e-mail
export function reportEmailSubject(data: ReportData): string {
  const label = data.pool?.label || 'votre piscine'
  const dateStr = data.log?.done_date
    ? new Date(data.log.done_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : ''
  return `Compte rendu d'entretien — ${label}${dateStr ? ` (${dateStr})` : ''}`
}

export interface SendResult { ok: boolean; error?: string; id?: string }

// Envoie l'e-mail via l'API Resend. Renvoie un résultat exploitable côté route.
export async function sendReportEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    if (!res.ok) {
      let detail = ''
      try { const j = await res.json() as any; detail = j?.message || JSON.stringify(j) } catch { detail = await res.text() }
      return { ok: false, error: `Resend ${res.status}: ${detail}` }
    }
    const j = await res.json() as any
    return { ok: true, id: j?.id }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Échec de l\'envoi' }
  }
}
