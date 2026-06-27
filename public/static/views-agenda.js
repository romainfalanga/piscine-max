// ============================================================
// VUE AGENDA (calendrier + carte)
// ============================================================
let agendaMap = null

// Calcule les occurrences d'entretiens pour une date donnée
function occurrencesForDate(date) {
  const wd = jsWeekday(date)
  const iso = isoDate(date)
  const items = []
  for (const m of state.maintenances) {
    if (state.agendaUser !== 'all' && String(m.assigned_to) !== String(state.agendaUser)) continue
    if (m.kind === 'oneshot') {
      if (m.oneshot_date === iso) items.push(m)
    } else {
      if (m.weekday !== wd) continue
      // Respect de l'intervalle de semaines
      if (m.interval_weeks && m.interval_weeks > 1 && m.start_date) {
        const start = startOfWeek(new Date(m.start_date))
        const cur = startOfWeek(date)
        const weeks = Math.round((cur - start) / (7 * 86400000))
        if (weeks < 0 || weeks % m.interval_weeks !== 0) continue
      }
      items.push(m)
    }
  }
  return items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
}

function renderAgenda(c) {
  const userFilter = isAdmin() ? `
    <select id="ag-user" onchange="state.agendaUser=this.value; renderAgenda(document.getElementById('main-content'))" class="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
      <option value="all" ${state.agendaUser === 'all' ? 'selected' : ''}>Tous les intervenants</option>
      ${state.users.map(u => `<option value="${u.id}" ${String(state.agendaUser) === String(u.id) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}
    </select>` : ''

  c.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <h2 class="text-2xl font-extrabold text-slate-800"><i class="fas fa-calendar-days text-cyan-600 mr-2"></i>Agenda</h2>
      <div class="flex flex-wrap items-center gap-2">
        ${userFilter}
        <div class="bg-slate-200 rounded-lg p-0.5 flex">
          <button onclick="setScope('day')" class="view-toggle-btn px-3 py-1.5 rounded-md text-sm font-semibold ${state.agendaScope === 'day' ? 'bg-white shadow text-cyan-700' : 'text-slate-500'}">Jour</button>
          <button onclick="setScope('week')" class="view-toggle-btn px-3 py-1.5 rounded-md text-sm font-semibold ${state.agendaScope === 'week' ? 'bg-white shadow text-cyan-700' : 'text-slate-500'}">Semaine</button>
        </div>
        <div class="bg-slate-200 rounded-lg p-0.5 flex">
          <button onclick="setMode('calendar')" class="view-toggle-btn px-3 py-1.5 rounded-md text-sm font-semibold ${state.agendaMode === 'calendar' ? 'bg-white shadow text-cyan-700' : 'text-slate-500'}"><i class="fas fa-list-ul mr-1"></i>Agenda</button>
          <button onclick="setMode('map')" class="view-toggle-btn px-3 py-1.5 rounded-md text-sm font-semibold ${state.agendaMode === 'map' ? 'bg-white shadow text-cyan-700' : 'text-slate-500'}"><i class="fas fa-map-location-dot mr-1"></i>Carte</button>
        </div>
      </div>
    </div>

    <!-- Navigation date -->
    <div class="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2 mb-4 shadow-sm">
      <button onclick="shiftDate(-1)" class="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-500"><i class="fas fa-chevron-left"></i></button>
      <div class="text-center">
        <div class="font-bold text-slate-700 capitalize">${agendaTitle()}</div>
        <button onclick="goToday()" class="text-xs text-cyan-600 font-semibold">Aujourd'hui</button>
      </div>
      <button onclick="shiftDate(1)" class="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-500"><i class="fas fa-chevron-right"></i></button>
    </div>

    <div id="agenda-body"></div>`

  if (state.agendaMode === 'calendar') renderAgendaCalendar()
  else renderAgendaMap()
}
window.renderAgenda = renderAgenda

function agendaTitle() {
  if (state.agendaScope === 'day') return fmtDate(state.selectedDate)
  const start = startOfWeek(state.selectedDate)
  const end = new Date(start); end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function setScope(s) { state.agendaScope = s; renderAgenda(el('main-content')) }
function setMode(m) { state.agendaMode = m; renderAgenda(el('main-content')) }
function shiftDate(dir) {
  const d = new Date(state.selectedDate)
  d.setDate(d.getDate() + dir * (state.agendaScope === 'day' ? 1 : 7))
  state.selectedDate = d
  renderAgenda(el('main-content'))
}
function goToday() { state.selectedDate = new Date(); renderAgenda(el('main-content')) }
window.setScope = setScope; window.setMode = setMode; window.shiftDate = shiftDate; window.goToday = goToday

// ---------- Carte d'un entretien ----------
function maintCard(m, index) {
  const color = m.assigned_color || '#94a3b8'
  return `
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-3 hover:shadow-md transition cursor-pointer" onclick="viewPool(${m.pool_id})">
      <div class="flex items-start gap-3">
        ${index != null ? `<div class="route-marker shrink-0" style="background:${color}">${index}</div>` : `<div class="w-1 self-stretch rounded" style="background:${color}"></div>`}
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-slate-800 truncate">${esc(m.pool_label)}</span>
            ${m.time ? `<span class="text-xs font-semibold text-slate-500 whitespace-nowrap"><i class="far fa-clock mr-1"></i>${esc(m.time)}</span>` : ''}
          </div>
          <div class="text-xs text-slate-400">${esc(m.client_name)}</div>
          ${m.pool_address ? `<div class="text-xs text-slate-400 truncate mt-0.5"><i class="fas fa-location-dot mr-1"></i>${esc(m.pool_address)}</div>` : ''}
          <div class="flex flex-wrap items-center gap-1.5 mt-2">
            ${m.assigned_name ? `<span class="text-[11px] px-2 py-0.5 rounded-full text-white" style="background:${color}"><i class="fas fa-user mr-1"></i>${esc(m.assigned_name)}</span>` : '<span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Non assigné</span>'}
            ${m.treatment_type ? `<span class="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">${esc(m.treatment_type)}</span>` : ''}
            ${m.access_code ? `<span class="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full"><i class="fas fa-key mr-1"></i>${esc(m.access_code)}</span>` : ''}
            ${m.kind === 'oneshot' ? '<span class="text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Ponctuel</span>' : ''}
          </div>
        </div>
        ${isAdmin() ? `<button onclick="event.stopPropagation(); openMaintenanceForm(${m.id})" class="text-slate-300 hover:text-slate-500 px-1"><i class="fas fa-ellipsis-vertical"></i></button>` : ''}
      </div>
    </div>`
}

// ---------- Vue calendrier ----------
function renderAgendaCalendar() {
  const body = el('agenda-body')
  if (state.agendaScope === 'day') {
    const items = occurrencesForDate(state.selectedDate)
    body.innerHTML = `
      ${isAdmin() ? `<button onclick="openMaintenanceForm()" class="w-full mb-3 border-2 border-dashed border-slate-300 text-slate-400 hover:border-cyan-400 hover:text-cyan-500 rounded-xl py-3 text-sm font-semibold"><i class="fas fa-plus mr-1"></i>Ajouter un entretien</button>` : ''}
      <div class="space-y-2 fade-in">
        ${items.length ? items.map(m => maintCard(m)).join('') : '<div class="text-center py-16 text-slate-400"><i class="fas fa-mug-hot text-4xl mb-3"></i><p>Aucun entretien prévu ce jour</p></div>'}
      </div>`
  } else {
    const start = startOfWeek(state.selectedDate)
    const todayIso = isoDate(new Date())
    let cols = ''
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i)
      const items = occurrencesForDate(d)
      const isToday = isoDate(d) === todayIso
      cols += `
        <div class="day-column bg-white rounded-xl border ${isToday ? 'border-cyan-300 today-col' : 'border-slate-100'} p-2 shadow-sm">
          <div class="text-center mb-2 pb-2 border-b border-slate-100">
            <div class="text-xs font-semibold ${isToday ? 'text-cyan-600' : 'text-slate-400'}">${WEEKDAYS_SHORT[i + 1]}</div>
            <div class="text-lg font-bold ${isToday ? 'text-cyan-700' : 'text-slate-700'}">${d.getDate()}</div>
          </div>
          <div class="space-y-1.5">
            ${items.length ? items.map(m => `
              <div onclick="viewPool(${m.pool_id})" class="cursor-pointer rounded-lg px-2 py-1.5 text-xs" style="background:${(m.assigned_color || '#94a3b8')}18; border-left:3px solid ${m.assigned_color || '#94a3b8'}">
                <div class="font-semibold text-slate-700 truncate">${m.time ? esc(m.time) + ' · ' : ''}${esc(m.pool_label)}</div>
                <div class="text-slate-400 truncate">${esc(m.client_name)}</div>
              </div>`).join('') : '<div class="text-center text-[10px] text-slate-300 py-2">—</div>'}
          </div>
        </div>`
    }
    body.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 fade-in">${cols}</div>`
  }
}

// ---------- Vue carte ----------
function collectMapItems() {
  let items = []
  if (state.agendaScope === 'day') {
    items = occurrencesForDate(state.selectedDate).map(m => ({ ...m, _date: state.selectedDate }))
  } else {
    const start = startOfWeek(state.selectedDate)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i)
      occurrencesForDate(d).forEach(m => items.push({ ...m, _date: new Date(d) }))
    }
  }
  return items.filter(m => m.lat && m.lng)
}

function renderAgendaMap() {
  const body = el('agenda-body')
  const items = collectMapItems()
  body.innerHTML = `
    <div class="grid lg:grid-cols-3 gap-4 fade-in">
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5">
        <div id="map" class="h-[420px] sm:h-[560px] rounded-xl"></div>
      </div>
      <div class="space-y-2 lg:max-h-[560px] lg:overflow-y-auto pr-1">
        <div class="text-sm font-semibold text-slate-500 px-1 mb-1">${items.length} étape${items.length > 1 ? 's' : ''} · parcours</div>
        ${items.length ? items.map((m, i) => maintCard(m, i + 1)).join('') : '<div class="text-center py-12 text-slate-400"><i class="fas fa-map-pin text-3xl mb-2"></i><p class="text-sm">Aucune piscine géolocalisée sur cette période</p></div>'}
      </div>
    </div>`

  setTimeout(() => initMap(items), 100)
}

function initMap(items) {
  if (agendaMap) { agendaMap.remove(); agendaMap = null }
  const mapEl = el('map')
  if (!mapEl) return

  agendaMap = L.map('map')
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(agendaMap)

  if (!items.length) { agendaMap.setView([43.5283, 5.4497], 12); return }

  const latlngs = []
  items.forEach((m, i) => {
    const color = m.assigned_color || '#0891b2'
    const icon = L.divIcon({
      className: '', html: `<div class="route-marker" style="background:${color}">${i + 1}</div>`,
      iconSize: [30, 30], iconAnchor: [15, 15]
    })
    const marker = L.marker([m.lat, m.lng], { icon }).addTo(agendaMap)
    marker.bindPopup(`
      <div style="min-width:160px">
        <b>${esc(m.pool_label)}</b><br>
        <span style="color:#64748b;font-size:12px">${esc(m.client_name)}</span><br>
        ${m.time ? `<span style="font-size:12px">🕐 ${esc(m.time)}</span><br>` : ''}
        ${m.access_code ? `<span style="font-size:12px">🔑 ${esc(m.access_code)}</span><br>` : ''}
        <a href="#" onclick="viewPool(${m.pool_id});return false;" style="color:#0891b2;font-size:12px;font-weight:600">Voir la fiche →</a>
      </div>`)
    latlngs.push([m.lat, m.lng])
  })

  // Tracer le parcours (ligne reliant les points dans l'ordre)
  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '#0891b2', weight: 3, opacity: 0.5, dashArray: '8,8' }).addTo(agendaMap)
  }
  agendaMap.fitBounds(L.latLngBounds(latlngs).pad(0.2))
}

// ============================================================
// FORMULAIRE ENTRETIEN
// ============================================================
function openMaintenanceForm(id = null, presetPoolId = null) {
  const m = id ? state.maintenances.find(x => x.id === id) : null
  const isEdit = !!m
  const poolOptions = state.pools.map(p => `<option value="${p.id}" ${(m?.pool_id || presetPoolId) == p.id ? 'selected' : ''}>${esc(p.client_name)} — ${esc(p.label)}</option>`).join('')
  const userOptions = ['<option value="">Non assigné</option>', ...state.users.map(u => `<option value="${u.id}" ${m?.assigned_to == u.id ? 'selected' : ''}>${esc(u.name)} (${u.role === 'admin' ? 'Pisciniste' : 'Intervenant'})</option>`)].join('')
  const kind = m?.kind || 'recurring'

  openModal(isEdit ? 'Modifier l\'entretien' : 'Nouvel entretien', `
    <form id="maint-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Piscine *</label>
        <select id="mf-pool" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-cyan-500">${poolOptions}</select>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Type</label>
        <div class="bg-slate-100 rounded-xl p-1 flex">
          <label class="flex-1"><input type="radio" name="mf-kind" value="recurring" ${kind === 'recurring' ? 'checked' : ''} class="peer hidden" onchange="toggleKind()"><div class="text-center py-2 rounded-lg text-sm font-semibold peer-checked:bg-white peer-checked:shadow peer-checked:text-cyan-700 text-slate-500 cursor-pointer">🔁 Récurrent</div></label>
          <label class="flex-1"><input type="radio" name="mf-kind" value="oneshot" ${kind === 'oneshot' ? 'checked' : ''} class="peer hidden" onchange="toggleKind()"><div class="text-center py-2 rounded-lg text-sm font-semibold peer-checked:bg-white peer-checked:shadow peer-checked:text-cyan-700 text-slate-500 cursor-pointer">📅 Ponctuel</div></label>
        </div>
      </div>

      <div id="mf-recurring" class="${kind === 'oneshot' ? 'hidden' : ''} space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Jour de la semaine</label>
            <select id="mf-weekday" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
              ${[1,2,3,4,5,6,7].map(w => `<option value="${w}" ${m?.weekday == w ? 'selected' : ''}>${WEEKDAYS[w]}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Fréquence</label>
            <select id="mf-interval" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
              <option value="1" ${(m?.interval_weeks||1)==1?'selected':''}>Toutes les semaines</option>
              <option value="2" ${m?.interval_weeks==2?'selected':''}>Toutes les 2 semaines</option>
              <option value="3" ${m?.interval_weeks==3?'selected':''}>Toutes les 3 semaines</option>
              <option value="4" ${m?.interval_weeks==4?'selected':''}>Toutes les 4 semaines</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">À partir du</label>
          <input id="mf-start" type="date" value="${m?.start_date || isoDate(new Date())}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
        </div>
      </div>

      <div id="mf-oneshot" class="${kind === 'oneshot' ? '' : 'hidden'}">
        <label class="block text-sm font-semibold text-slate-600 mb-1">Date</label>
        <input id="mf-date" type="date" value="${m?.oneshot_date || isoDate(new Date())}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Heure</label>
          <input id="mf-time" type="time" value="${m?.time || ''}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Durée (min)</label>
          <input id="mf-duration" type="number" step="5" value="${m?.duration_min || 30}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1"><i class="fas fa-user-check text-cyan-500 mr-1"></i>Attribué à</label>
        <select id="mf-assigned" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">${userOptions}</select>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Notes</label>
        <textarea id="mf-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">${esc(m?.notes || '')}</textarea>
      </div>

      <div class="flex gap-2 pt-2">
        ${isEdit ? `<button type="button" onclick="deleteMaintenance(${m.id})" class="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"><i class="fas fa-trash"></i></button>` : ''}
        <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">${isEdit ? 'Enregistrer' : 'Planifier'}</button>
      </div>
    </form>`)

  el('maint-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const kindVal = document.querySelector('input[name="mf-kind"]:checked').value
    const payload = {
      pool_id: el('mf-pool').value, assigned_to: el('mf-assigned').value || null, kind: kindVal,
      weekday: parseInt(el('mf-weekday').value), interval_weeks: parseInt(el('mf-interval').value),
      start_date: el('mf-start').value, oneshot_date: el('mf-date').value,
      time: el('mf-time').value, duration_min: parseInt(el('mf-duration').value) || 30,
      notes: el('mf-notes').value
    }
    try {
      if (isEdit) await API.put(`/maintenances/${m.id}`, payload)
      else await API.post('/maintenances', payload)
      closeModal(); await loadData(); renderView()
      toast(isEdit ? 'Entretien modifié' : 'Entretien planifié')
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openMaintenanceForm = openMaintenanceForm

function toggleKind() {
  const k = document.querySelector('input[name="mf-kind"]:checked').value
  el('mf-recurring').classList.toggle('hidden', k !== 'recurring')
  el('mf-oneshot').classList.toggle('hidden', k !== 'oneshot')
}
window.toggleKind = toggleKind

async function deleteMaintenance(id) {
  if (!confirm('Supprimer cet entretien ?')) return
  try { await API.delete(`/maintenances/${id}`); closeModal(); await loadData(); renderView(); toast('Entretien supprimé') }
  catch { toast('Erreur', 'error') }
}
window.deleteMaintenance = deleteMaintenance
