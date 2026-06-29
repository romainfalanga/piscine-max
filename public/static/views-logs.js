// ============================================================
// RELEVÉS D'EAU & HISTORIQUE
// ============================================================

// ---- Sélecteur d'entretien pour une piscine (avant le formulaire de passage) ----
function openMaintenancePicker(poolId, poolLabel) {
  const maints = state.maintenances.filter(m => m.pool_id === poolId)
  const pool = (state.pools || []).find(p => p.id === poolId) || null
  if (maints.length === 0) {
    toast("Aucun entretien planifié pour cette piscine. Planifie-le d'abord.", 'info')
    return
  }
  if (maints.length === 1) { openLogForm(maints[0].id, poolLabel, pool, poolId); return }
  // Plusieurs entretiens : laisser choisir
  openModal('Quel entretien ?', `
    <div class="space-y-2">
      ${maints.map(m => `
        <button onclick="closeModal(); openLogForm(${m.id}, '${esc(poolLabel).replace(/'/g,'')}', null, ${poolId})" class="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-xl p-3 flex items-center justify-between">
          <span class="text-sm font-semibold">${m.kind === 'recurring' ? WEEKDAYS[m.weekday] + (m.interval_weeks > 1 ? ` (1/${m.interval_weeks} sem.)` : '') : 'Ponctuel ' + (m.oneshot_date||'')}${m.time ? ' · ' + esc(m.time) : ''}</span>
          <i class="fas fa-chevron-right text-slate-300"></i>
        </button>`).join('')}
    </div>`)
}
window.openMaintenancePicker = openMaintenancePicker

// ---- Formulaire : marquer un passage effectué ----
function openLogForm(maintenanceId, poolLabel, pool = null, poolId = null) {
  const today = isoDate(new Date())
  // Récupère les seuils idéaux depuis la piscine connue (pour les alertes)
  if (!pool && poolId) pool = (state.pools || []).find(p => p.id === poolId) || null
  if (!pool) { const m = state.maintenances.find(x => x.id === maintenanceId); if (m) pool = (state.pools || []).find(p => p.id === m.pool_id) || null; if (m) poolId = m.pool_id }
  const ph = pool || {}
  const phMin = ph.ideal_ph_min ?? 7.0, phMax = ph.ideal_ph_max ?? 7.4
  const clMin = ph.ideal_chlorine_min ?? 1.0, clMax = ph.ideal_chlorine_max ?? 2.0
  openModal(`<i class="fas fa-clipboard-check text-emerald-500 mr-2"></i>Passage — ${esc(poolLabel)}`, `
    <form id="log-form" class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Date du passage</label>
          <input id="lf-date" type="date" value="${today}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Statut</label>
          <select id="lf-status" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
            <option value="done">✅ Effectué</option>
            <option value="skipped">⏭️ Reporté / non fait</option>
          </select>
        </div>
      </div>

      <div class="bg-sky-50 rounded-xl p-3">
        <div class="text-sm font-bold text-sky-800 mb-2"><i class="fas fa-flask mr-1"></i>Relevés d'eau <span class="font-normal text-xs text-sky-600">(optionnel)</span></div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">pH <span class="text-slate-300">(${phMin}–${phMax})</span></label>
            <input id="lf-ph" type="number" step="0.1" inputmode="decimal" oninput="checkReading('lf-ph', ${phMin}, ${phMax}); liveDiagnose(${poolId || 'null'})" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="7.2">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Chlore <span class="text-slate-300">(${clMin}–${clMax})</span></label>
            <input id="lf-chlorine" type="number" step="0.1" inputmode="decimal" oninput="checkReading('lf-chlorine', ${clMin}, ${clMax}); liveDiagnose(${poolId || 'null'})" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="1.5">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Sel (g/L)</label>
            <input id="lf-salt" type="number" step="0.1" inputmode="decimal" oninput="liveDiagnose(${poolId || 'null'})" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="4.0">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Temp. (°C)</label>
            <input id="lf-temp" type="number" step="0.5" inputmode="decimal" oninput="liveDiagnose(${poolId || 'null'})" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="26">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Stabilisant</label>
            <input id="lf-stab" type="number" step="1" inputmode="decimal" oninput="liveDiagnose(${poolId || 'null'})" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="30">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">TAC</label>
            <input id="lf-tac" type="number" step="1" inputmode="decimal" oninput="liveDiagnose(${poolId || 'null'})" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="100">
          </div>
        </div>
        <div id="live-diag" class="mt-2"></div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Produits ajoutés</label>
        <input id="lf-products" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="ex: 500g chlore choc, 1L pH-">
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2">
          <label class="block text-sm font-semibold text-slate-600 mb-1">Note</label>
          <input id="lf-notes" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="Filtre nettoyé, RAS...">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Durée (min)</label>
          <input id="lf-duration" type="number" step="5" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="30">
        </div>
      </div>

      <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-600 ${poolId ? '' : 'hidden'}">
        <input type="checkbox" id="lf-addphoto" class="w-5 h-5 rounded accent-cyan-600">
        <span><i class="fas fa-camera text-cyan-500 mr-1"></i>Ajouter une photo après validation</span>
      </label>

      ${EMAIL_ENABLED ? `
      <label class="flex items-start gap-2 cursor-pointer text-sm text-slate-600 bg-cyan-50 border border-cyan-100 rounded-xl p-3">
        <input type="checkbox" id="lf-sendmail" checked class="w-5 h-5 mt-0.5 rounded accent-cyan-600 shrink-0">
        <span><i class="fas fa-envelope text-cyan-500 mr-1"></i><b>Envoyer le compte rendu au client par e-mail</b><br><span class="text-xs text-slate-400">Relevés, produits, photos et conseils — automatiquement, sans compte à créer côté client.</span></span>
      </label>` : `
      <div class="flex items-start gap-2 text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 opacity-90">
        <i class="fas fa-envelope text-slate-400 mt-0.5"></i>
        <span class="text-slate-500"><b>Compte rendu par e-mail</b> <span class="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-1">Bientôt disponible</span><br><span class="text-xs text-slate-400">L'envoi automatique au client arrive très bientôt.</span></span>
      </div>`}

      <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow"><i class="fas fa-check mr-1"></i>Valider le passage</button>
    </form>`)

  el('log-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const wantPhoto = el('lf-addphoto') && el('lf-addphoto').checked
    const wantMail = EMAIL_ENABLED && el('lf-sendmail') && el('lf-sendmail').checked
    // On n'envoie pas l'e-mail tout de suite si on ajoute une photo après :
    // la photo doit figurer dans le compte rendu. Dans ce cas, l'envoi se fera
    // après l'upload de la photo (voir openPhotoUploadForLog).
    const sendNow = wantMail && !wantPhoto
    const payload = {
      done_date: el('lf-date').value, status: el('lf-status').value,
      ph: el('lf-ph').value, chlorine: el('lf-chlorine').value, salt: el('lf-salt').value,
      water_temp: el('lf-temp').value, stabilizer: el('lf-stab').value, tac: el('lf-tac').value,
      products_added: el('lf-products').value, notes: el('lf-notes').value, duration_min: el('lf-duration').value,
      send_email: sendNow
    }
    try {
      const { data } = await API.post(`/maintenances/${maintenanceId}/log`, payload)
      await loadLogs()
      if (wantPhoto && poolId) {
        // On mémorise l'intention d'envoyer le mail après ajout de la photo
        openPhotoUploadForLog(poolId, data.log_id, wantMail)
      } else {
        closeModal(); renderView()
      }
      toast('Passage enregistré ✅')
      // Retour d'envoi e-mail (best-effort côté serveur)
      if (sendNow && data.email) {
        if (data.email.sent) toast('Compte rendu envoyé au client 📧', 'success')
        else if (data.email.error) toast('Passage OK, mais e-mail non envoyé : ' + data.email.error, 'info')
      }
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openLogForm = openLogForm

// Colore le champ en rouge/vert selon les seuils idéaux
function checkReading(id, min, max) {
  const inp = el(id)
  if (!inp) return
  const v = parseFloat(inp.value)
  inp.classList.remove('border-red-400', 'bg-red-50', 'border-emerald-400', 'bg-emerald-50')
  if (isNaN(v) || inp.value === '') return
  if (v < min || v > max) inp.classList.add('border-red-400', 'bg-red-50')
  else inp.classList.add('border-emerald-400', 'bg-emerald-50')
}
window.checkReading = checkReading

// Upload photo lié à un passage qu'on vient de créer (réutilise le flow de pool)
// wantMail : si vrai, le compte rendu sera envoyé au client APRÈS l'upload (photo incluse).
function openPhotoUploadForLog(poolId, logId, wantMail = false) {
  if (typeof openPhotoUpload === 'function') {
    openPhotoUpload(poolId, logId, wantMail)
  } else {
    closeModal(); renderView()
  }
}
window.openPhotoUploadForLog = openPhotoUploadForLog

// ---- Historique + graphique d'une piscine ----
let historyChart = null

async function openPoolHistory(poolId, poolLabel, pool = null) {
  let logs = []
  try { const { data } = await API.get(`/pools/${poolId}/history`); logs = data } catch (e) { console.warn('history:', e) }

  const rows = logs.length ? logs.map(l => {
    const vals = []
    if (l.ph != null) vals.push(`pH ${l.ph}`)
    if (l.chlorine != null) vals.push(`Cl ${l.chlorine}`)
    if (l.salt != null) vals.push(`Sel ${l.salt}`)
    if (l.water_temp != null) vals.push(`${l.water_temp}°C`)
    const d = new Date(l.done_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
    return `
      <div class="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
        <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${l.status === 'skipped' ? '#f59e0b' : (l.done_by_color || '#16a34a')}"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-700">${d} ${l.status === 'skipped' ? '<span class="text-amber-500 text-xs">(reporté)</span>' : ''}</span>
            <span class="text-xs text-slate-400">${esc(l.done_by_name || '—')}</span>
          </div>
          ${vals.length ? `<div class="text-xs text-slate-500 mt-0.5">${vals.join(' · ')}</div>` : ''}
          ${l.products_added ? `<div class="text-xs text-sky-600 mt-0.5"><i class="fas fa-flask-vial mr-1"></i>${esc(l.products_added)}</div>` : ''}
          ${l.notes ? `<div class="text-xs text-slate-400 mt-0.5 italic">${esc(l.notes)}</div>` : ''}
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <button onclick="openReport(${l.id})" class="text-slate-300 hover:text-cyan-600 text-xs" title="Voir le compte-rendu"><i class="fas fa-file-lines"></i></button>
          ${isAdmin() ? `<button onclick="deleteLog(${l.id}, ${poolId}, '${esc(poolLabel).replace(/'/g,"")}')" class="text-slate-300 hover:text-red-500 text-xs" title="Supprimer"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>`
  }).join('') : '<p class="text-sm text-slate-400 text-center py-6">Aucun passage enregistré pour le moment</p>'

  const hasChartData = logs.some(l => l.ph != null || l.chlorine != null)

  openModal(`<i class="fas fa-clock-rotate-left text-cyan-500 mr-2"></i>Historique — ${esc(poolLabel)}`, `
    ${hasChartData ? '<div class="bg-white rounded-xl mb-4"><canvas id="history-chart" height="180"></canvas></div>' : ''}
    <div class="max-h-[50vh] overflow-y-auto">${rows}</div>
  `, { size: 'xl' })

  if (hasChartData) {
    setTimeout(() => drawHistoryChart(logs, pool), 100)
  }
}
window.openPoolHistory = openPoolHistory

function drawHistoryChart(logs, pool) {
  const ctx = el('history-chart')
  if (!ctx) return
  if (historyChart) { historyChart.destroy(); historyChart = null }
  // Ordre chronologique
  const chrono = [...logs].reverse()
  const labels = chrono.map(l => new Date(l.done_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }))
  const n = chrono.length
  const p = pool || {}

  const datasets = []
  // Datasets de mesure (axe principal y) — seuls ceux avec des données s'affichent
  const measures = [
    { key: 'ph', label: 'pH', color: '#0891b2', min: p.ideal_ph_min, max: p.ideal_ph_max },
    { key: 'chlorine', label: 'Chlore (mg/L)', color: '#16a34a', min: p.ideal_chlorine_min, max: p.ideal_chlorine_max },
    { key: 'tac', label: 'TAC (mg/L)', color: '#8b5cf6', min: p.ideal_tac_min, max: p.ideal_tac_max, hidden: true },
    { key: 'stabilizer', label: 'Stabilisant (mg/L)', color: '#f59e0b', min: p.ideal_stabilizer_min, max: p.ideal_stabilizer_max, hidden: true },
    { key: 'salt', label: 'Sel (g/L)', color: '#e11d48', min: p.ideal_salt_min, max: p.ideal_salt_max, hidden: true }
  ]
  for (const meas of measures) {
    if (!chrono.some(l => l[meas.key] != null)) continue
    datasets.push({
      label: meas.label, data: chrono.map(l => l[meas.key]),
      borderColor: meas.color, backgroundColor: meas.color + '20',
      tension: 0.3, spanGaps: true, yAxisID: 'y', hidden: !!meas.hidden, pointRadius: 2
    })
    // N3 : bandes de zone idéale (min/max) en fond, pour pH et chlore (affichés par défaut)
    if (!meas.hidden && meas.min != null && meas.max != null && n > 0) {
      datasets.push({
        label: meas.label + ' min idéal', data: Array(n).fill(meas.min),
        borderColor: meas.color + '55', borderDash: [4, 4], borderWidth: 1,
        pointRadius: 0, fill: false, yAxisID: 'y'
      })
      datasets.push({
        label: meas.label + ' max idéal', data: Array(n).fill(meas.max),
        borderColor: meas.color + '55', borderDash: [4, 4], borderWidth: 1,
        pointRadius: 0, fill: '-1', backgroundColor: meas.color + '0f', yAxisID: 'y'
      })
    }
  }

  historyChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12, font: { size: 11 },
            // On masque les entrées "min/max idéal" de la légende pour ne pas la surcharger
            filter: (item) => !/idéal/.test(item.text)
          }
        }
      },
      scales: { y: { beginAtZero: false, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 }, maxRotation: 0 } } }
    }
  })
}

async function deleteLog(logId, poolId, poolLabel) {
  if (!confirm('Supprimer ce relevé ?')) return
  try {
    await API.delete(`/logs/${logId}`)
    await loadLogs()
    openPoolHistory(poolId, poolLabel)
    toast('Relevé supprimé')
  } catch { toast('Erreur', 'error') }
}
window.deleteLog = deleteLog

// ---- Changement de mot de passe ----
function openPasswordForm() {
  openModal('<i class="fas fa-lock text-cyan-500 mr-2"></i>Changer mon mot de passe', `
    <form id="pwd-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
        <input id="pwd-current" type="password" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-cyan-500">
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Nouveau mot de passe</label>
        <input id="pwd-new" type="password" required minlength="4" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-cyan-500">
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Confirmer le nouveau mot de passe</label>
        <input id="pwd-confirm" type="password" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-cyan-500">
      </div>
      <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">Enregistrer</button>
    </form>`)
  el('pwd-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    if (el('pwd-new').value !== el('pwd-confirm').value) { toast('Les mots de passe ne correspondent pas', 'error'); return }
    try {
      await API.post('/change-password', { current_password: el('pwd-current').value, new_password: el('pwd-new').value })
      closeModal(); toast('Mot de passe modifié ✅')
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openPasswordForm = openPasswordForm
