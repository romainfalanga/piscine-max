// ============================================================
// RELEVÉS D'EAU & HISTORIQUE
// ============================================================

// ---- Sélecteur d'entretien pour une piscine (avant le formulaire de passage) ----
function openMaintenancePicker(poolId, poolLabel) {
  const maints = state.maintenances.filter(m => m.pool_id === poolId)
  if (maints.length === 0) {
    // Pas d'entretien planifié : on permet quand même un passage "libre" via un entretien fictif ?
    // On demande à l'admin de planifier d'abord.
    toast("Aucun entretien planifié pour cette piscine. Planifie-le d'abord.", 'info')
    return
  }
  if (maints.length === 1) { openLogForm(maints[0].id, poolLabel); return }
  // Plusieurs entretiens : laisser choisir
  openModal('Quel entretien ?', `
    <div class="space-y-2">
      ${maints.map(m => `
        <button onclick="closeModal(); openLogForm(${m.id}, '${esc(poolLabel).replace(/'/g,'')}')" class="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-xl p-3 flex items-center justify-between">
          <span class="text-sm font-semibold">${m.kind === 'recurring' ? WEEKDAYS[m.weekday] + (m.interval_weeks > 1 ? ` (1/${m.interval_weeks} sem.)` : '') : 'Ponctuel ' + (m.oneshot_date||'')}${m.time ? ' · ' + esc(m.time) : ''}</span>
          <i class="fas fa-chevron-right text-slate-300"></i>
        </button>`).join('')}
    </div>`)
}
window.openMaintenancePicker = openMaintenancePicker

// ---- Formulaire : marquer un passage effectué ----
function openLogForm(maintenanceId, poolLabel, pool = null) {
  const today = isoDate(new Date())
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
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">pH</label>
            <input id="lf-ph" type="number" step="0.1" inputmode="decimal" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="7.2">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Chlore (mg/L)</label>
            <input id="lf-chlorine" type="number" step="0.1" inputmode="decimal" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="1.5">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Sel (g/L)</label>
            <input id="lf-salt" type="number" step="0.1" inputmode="decimal" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="4.0">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Temp. (°C)</label>
            <input id="lf-temp" type="number" step="0.5" inputmode="decimal" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="26">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Stabilisant</label>
            <input id="lf-stab" type="number" step="1" inputmode="decimal" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="30">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">TAC</label>
            <input id="lf-tac" type="number" step="1" inputmode="decimal" class="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-center" placeholder="100">
          </div>
        </div>
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

      <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow"><i class="fas fa-check mr-1"></i>Valider le passage</button>
    </form>`)

  el('log-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const payload = {
      done_date: el('lf-date').value, status: el('lf-status').value,
      ph: el('lf-ph').value, chlorine: el('lf-chlorine').value, salt: el('lf-salt').value,
      water_temp: el('lf-temp').value, stabilizer: el('lf-stab').value, tac: el('lf-tac').value,
      products_added: el('lf-products').value, notes: el('lf-notes').value, duration_min: el('lf-duration').value
    }
    try {
      await API.post(`/maintenances/${maintenanceId}/log`, payload)
      closeModal()
      // Recharger les logs pour mettre à jour les statuts "fait"
      await loadLogs()
      renderView()
      toast('Passage enregistré ✅')
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openLogForm = openLogForm

// ---- Historique + graphique d'une piscine ----
let historyChart = null

async function openPoolHistory(poolId, poolLabel, pool = null) {
  let logs = []
  try { const { data } = await API.get(`/pools/${poolId}/history`); logs = data } catch {}

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
        ${isAdmin() ? `<button onclick="deleteLog(${l.id}, ${poolId}, '${esc(poolLabel).replace(/'/g,"")}')" class="text-slate-300 hover:text-red-500 text-xs"><i class="fas fa-trash"></i></button>` : ''}
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
  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'pH', data: chrono.map(l => l.ph), borderColor: '#0891b2', backgroundColor: '#0891b220', tension: 0.3, spanGaps: true, yAxisID: 'y' },
        { label: 'Chlore (mg/L)', data: chrono.map(l => l.chlorine), borderColor: '#16a34a', backgroundColor: '#16a34a20', tension: 0.3, spanGaps: true, yAxisID: 'y' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
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
