// ============================================================
// FONCTIONNALITÉS AVANCÉES
//  - Diagnostic eau intelligent + dosage (Tier 1)
//  - Centre d'alertes (Tier 1)
//  - Rapport de passage partageable (Tier 1)
//  - Stats business (Tier 3)
//  - Mode tournée intervenant (Tier 3)
//  - Météo + conseils saisonniers (Tier 3)
// ============================================================

// ---------- Helpers visuels partagés ----------
const SEVERITY_STYLE = {
  ok:    { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', icon: 'fa-circle-check',         dot: '#16a34a' },
  warn:  { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   icon: 'fa-triangle-exclamation', dot: '#f59e0b' },
  alert: { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     icon: 'fa-circle-exclamation',   dot: '#dc2626' },
  empty: { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-500',   icon: 'fa-circle-info',          dot: '#94a3b8' },
}

// Construit le HTML d'un bloc de diagnostic à partir d'un objet renvoyé par /api/diagnose
function diagnosisHtml(diag, opts = {}) {
  if (!diag || diag.status === 'empty') {
    return opts.silent ? '' : `<div class="text-xs text-slate-400 italic">${opts.emptyText || 'Saisis des relevés pour obtenir un diagnostic.'}</div>`
  }
  const s = SEVERITY_STYLE[diag.status] || SEVERITY_STYLE.ok
  const params = (diag.params || []).map(p => {
    const ps = SEVERITY_STYLE[p.severity] || SEVERITY_STYLE.ok
    const arrow = p.verdict === 'low' ? '<i class="fas fa-arrow-down text-xs"></i>' : p.verdict === 'high' ? '<i class="fas fa-arrow-up text-xs"></i>' : '<i class="fas fa-check text-xs"></i>'
    return `
      <div class="flex items-start gap-2 py-1.5 border-b border-black/5 last:border-0">
        <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${ps.dot}"></span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold ${ps.text}">${arrow} ${esc(p.label)} : ${esc(String(p.value))}${p.unit ? ' ' + esc(p.unit) : ''}
            <span class="text-[11px] font-normal text-slate-400">(cible ${p.min ?? '—'}–${p.max ?? '—'})</span>
          </div>
          <div class="text-xs text-slate-500">${esc(p.message)}</div>
          ${p.action ? `<div class="text-xs mt-0.5 ${ps.text} font-medium"><i class="fas fa-flask-vial mr-1"></i>${esc(p.action)}</div>` : ''}
        </div>
      </div>`
  }).join('')
  return `
    <div class="rounded-xl border ${s.border} ${s.bg} p-3">
      <div class="flex items-center gap-2 ${s.text} font-bold text-sm mb-1">
        <i class="fas ${s.icon}"></i><span>${esc(diag.summary)}</span>
      </div>
      ${params ? `<div class="mt-1">${params}</div>` : ''}
    </div>`
}
window.diagnosisHtml = diagnosisHtml

// Diagnostic en direct dans le formulaire de passage (debounced)
let _diagTimer = null
function liveDiagnose(poolId) {
  if (_diagTimer) clearTimeout(_diagTimer)
  _diagTimer = setTimeout(async () => {
    const box = el('live-diag')
    if (!box) return
    const reading = {
      ph: el('lf-ph')?.value, chlorine: el('lf-chlorine')?.value, salt: el('lf-salt')?.value,
      water_temp: el('lf-temp')?.value, stabilizer: el('lf-stab')?.value, tac: el('lf-tac')?.value,
    }
    const hasAny = Object.values(reading).some(v => v !== '' && v != null)
    if (!hasAny) { box.innerHTML = ''; return }
    try {
      const { data } = await API.post('/diagnose', { pool_id: poolId, reading })
      box.innerHTML = diagnosisHtml(data, { silent: true })
    } catch { box.innerHTML = '' }
  }, 450)
}
window.liveDiagnose = liveDiagnose

// ============================================================
// RAPPORT DE PASSAGE (partageable / imprimable)
// ============================================================
async function openReport(logId) {
  openModal('<i class="fas fa-file-lines text-cyan-500 mr-2"></i>Compte-rendu de passage', '<div class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>', { size: 'xl' })
  try {
    const { data } = await API.get(`/logs/${logId}/report`)
    const { log, pool, photos, diagnosis } = data
    const d = new Date(log.done_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const vals = []
    if (log.ph != null) vals.push(['pH', log.ph])
    if (log.chlorine != null) vals.push(['Chlore', log.chlorine + ' mg/L'])
    if (log.salt != null) vals.push(['Sel', log.salt + ' g/L'])
    if (log.water_temp != null) vals.push(['Température', log.water_temp + ' °C'])
    if (log.stabilizer != null) vals.push(['Stabilisant', log.stabilizer + ' mg/L'])
    if (log.tac != null) vals.push(['TAC', log.tac + ' mg/L'])

    const html = `
      <div id="report-content" class="space-y-4 text-slate-700">
        <div class="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <div class="text-lg font-extrabold text-slate-800"><i class="fas fa-water text-cyan-500 mr-1"></i>${esc(pool?.label || '')}</div>
            <div class="text-sm text-slate-400">${esc(pool?.client_name || '')}${pool?.address ? ' · ' + esc(pool.address) : ''}</div>
          </div>
          <div class="text-right text-xs text-slate-400">
            ${pool?.pro_company ? `<div class="font-bold text-slate-600">${esc(pool.pro_company)}</div>` : ''}
            ${pool?.pro_name ? `<div>${esc(pool.pro_name)}</div>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="px-2.5 py-1 rounded-lg ${log.status==='skipped'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'} font-semibold">
            <i class="fas ${log.status==='skipped'?'fa-forward':'fa-circle-check'} mr-1"></i>${log.status==='skipped'?'Passage reporté':'Passage effectué'}
          </span>
          <span class="text-slate-500 capitalize">${d}</span>
          ${log.done_by_name ? `<span class="text-slate-400">· par ${esc(log.done_by_name)}</span>` : ''}
          ${log.duration_min ? `<span class="text-slate-400">· ${log.duration_min} min</span>` : ''}
        </div>

        ${vals.length ? `
        <div>
          <div class="text-xs font-bold text-slate-400 uppercase mb-1">Relevés d'eau</div>
          <div class="grid grid-cols-3 gap-2">
            ${vals.map(([k,v]) => `<div class="bg-slate-50 rounded-lg p-2 text-center"><div class="text-[11px] text-slate-400">${k}</div><div class="font-bold text-slate-700">${esc(String(v))}</div></div>`).join('')}
          </div>
        </div>` : ''}

        ${diagnosis && diagnosis.status !== 'empty' ? `<div><div class="text-xs font-bold text-slate-400 uppercase mb-1">Diagnostic</div>${diagnosisHtml(diagnosis)}</div>` : ''}

        ${log.products_added ? `<div><div class="text-xs font-bold text-slate-400 uppercase mb-1">Produits ajoutés</div><div class="bg-sky-50 text-sky-700 rounded-lg p-2 text-sm"><i class="fas fa-flask-vial mr-1"></i>${esc(log.products_added)}</div></div>` : ''}
        ${log.notes ? `<div><div class="text-xs font-bold text-slate-400 uppercase mb-1">Notes</div><div class="text-sm italic text-slate-600">${esc(log.notes)}</div></div>` : ''}

        ${photos && photos.length ? `
        <div>
          <div class="text-xs font-bold text-slate-400 uppercase mb-1">Photos</div>
          <div class="grid grid-cols-3 gap-2">
            ${photos.map(p => `<img src="${p.url}" loading="lazy" onclick="openPhotoLightbox('${p.url}')" class="w-full h-24 object-cover rounded-lg cursor-pointer border border-slate-200">`).join('')}
          </div>
        </div>` : ''}
      </div>
      <div class="flex gap-2 pt-4 mt-2 border-t border-slate-100 no-print">
        <button onclick="printReport()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl"><i class="fas fa-print mr-1"></i>Imprimer / PDF</button>
        ${EMAIL_ENABLED
          ? `<button id="report-mail-btn" onclick="sendReportByMail(${logId})" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 rounded-xl"><i class="fas fa-envelope mr-1"></i>Envoyer au client</button>`
          : `<button disabled title="Bientôt disponible" class="flex-1 bg-slate-100 text-slate-400 font-semibold py-2.5 rounded-xl cursor-not-allowed"><i class="fas fa-envelope mr-1"></i>Envoyer au client · bientôt</button>`}
      </div>`
    el('modal-root').querySelector('.overflow-y-auto').innerHTML = html
  } catch (err) {
    el('modal-root').querySelector('.overflow-y-auto').innerHTML = '<p class="text-center text-red-500 py-6">Impossible de charger le rapport.</p>'
  }
}
window.openReport = openReport

function printReport() {
  const content = el('report-content')
  if (!content) return
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>Compte-rendu Piscine Max</title>
    <script src="https://cdn.tailwindcss.com"></scr`+`ipt>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head><body class="p-8 max-w-2xl mx-auto">${content.innerHTML}
    <div class="mt-6 text-center text-xs text-slate-400">Généré par Piscine Max · ${new Date().toLocaleDateString('fr-FR')}</div>
    </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 600)
}
window.printReport = printReport

// Envoie (ou renvoie) le compte rendu de ce passage au client, par e-mail.
async function sendReportByMail(logId) {
  const btn = el('report-mail-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Envoi...' }
  try {
    const { data } = await API.post(`/logs/${logId}/send-report`)
    toast('Compte rendu envoyé à ' + (data.to || 'au client') + ' 📧', 'success')
    if (btn) { btn.innerHTML = '<i class="fas fa-check mr-1"></i>Envoyé'; btn.classList.remove('bg-cyan-600','hover:bg-cyan-700'); btn.classList.add('bg-emerald-600') }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-envelope mr-1"></i>Réessayer' }
    toast(err.response?.data?.error || "Échec de l'envoi", 'error')
  }
}
window.sendReportByMail = sendReportByMail

// ============================================================
// STATISTIQUES
// ============================================================
let statsChart = null
async function renderStats(c) {
  c.innerHTML = `<h2 class="text-2xl font-extrabold text-slate-800 mb-4"><i class="fas fa-chart-line text-cyan-600 mr-2"></i>Statistiques</h2>
    <div class="text-center py-12 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>`
  let data
  try { data = (await API.get('/stats')).data } catch { c.innerHTML = '<p class="text-red-500 p-6">Erreur de chargement des stats.</p>'; return }
  const hrs = Math.round((data.totals.minutes || 0) / 60)
  const months = data.months || []
  const stat = (icon, val, label, color) => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white" style="background:${color}"><i class="fas ${icon}"></i></div>
      <div><div class="text-2xl font-extrabold text-slate-800 leading-none">${val}</div><div class="text-xs text-slate-400 mt-1">${label}</div></div>
    </div>`

  c.innerHTML = `
    <button onclick="navigate('home')" class="text-slate-400 hover:text-slate-600 mb-3 text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour à l'accueil</button>
    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800 mb-4"><i class="fas fa-chart-line text-cyan-600 mr-2"></i>Statistiques</h2>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
      ${stat('fa-clipboard-check', data.totals.passages || 0, 'Passages (12 mois)', '#0891b2')}
      ${stat('fa-clock', hrs + ' h', 'Temps total', '#16a34a')}
      ${stat('fa-water', (data.top_pools||[]).length, 'Piscines suivies', '#8b5cf6')}
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
      <h3 class="font-bold text-slate-700 mb-3">Passages par mois</h3>
      ${months.length ? '<canvas id="stats-chart" height="120"></canvas>' : '<p class="text-sm text-slate-400 py-6 text-center">Pas encore de données.</p>'}
    </div>
    <div class="grid sm:grid-cols-2 gap-4">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-user-group text-cyan-500 mr-1"></i>Par intervenant</h3>
        ${(data.by_user||[]).length ? (data.by_user).map(u => `
          <div class="flex items-center gap-2 py-1.5">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${u.color||'#94a3b8'}"></span>
            <span class="flex-1 text-sm text-slate-700">${esc(u.name || '—')}</span>
            <span class="text-sm font-bold text-slate-800">${u.count}</span>
            <span class="text-xs text-slate-400">${Math.round((u.minutes||0)/60)}h</span>
          </div>`).join('') : '<p class="text-sm text-slate-400">—</p>'}
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-trophy text-amber-400 mr-1"></i>Top piscines</h3>
        ${(data.top_pools||[]).length ? (data.top_pools).map((p,i) => `
          <div onclick="viewPool(${p.id})" class="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded-lg px-1">
            <span class="text-xs font-bold text-slate-300 w-4">${i+1}</span>
            <span class="flex-1 text-sm text-slate-700 truncate">${esc(p.label)} <span class="text-xs text-slate-400">${esc(p.client_name)}</span></span>
            <span class="text-sm font-bold text-cyan-600">${p.count}</span>
          </div>`).join('') : '<p class="text-sm text-slate-400">—</p>'}
      </div>
    </div>`

  if (months.length) {
    setTimeout(() => {
      const ctx = el('stats-chart'); if (!ctx) return
      if (statsChart) statsChart.destroy()
      statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months.map(m => { const [y,mo]=m.month.split('-'); return new Date(y,mo-1).toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}) }),
          datasets: [{ label: 'Passages', data: months.map(m => m.count), backgroundColor: '#0891b2', borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
      })
    }, 100)
  }
}
window.renderStats = renderStats


