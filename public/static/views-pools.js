// ============================================================
// VUE PISCINES
// ============================================================
const POOL_TYPES = ['enterrée', 'hors-sol', 'coque', 'béton', 'liner', 'naturelle']
const SHAPES = ['rectangulaire', 'ovale', 'ronde', 'libre', 'haricot', 'carrée']
const TREATMENTS = ['chlore', 'sel/électrolyse', 'brome', 'oxygène actif', 'PHMB', 'UV']
const FILTRATIONS = ['sable', 'cartouche', 'diatomées', 'verre', 'zéolite']

function renderPools(c) {
  c.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-extrabold text-slate-800"><i class="fas fa-water text-cyan-600 mr-2"></i>${isAdmin() ? 'Piscines' : 'Mes piscines'}</h2>
      ${isAdmin() ? `<button onclick="openPoolForm()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-2"><i class="fas fa-plus"></i><span class="hidden sm:inline">Nouvelle piscine</span></button>` : ''}
    </div>
    <div class="relative mb-4">
      <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
      <input id="pool-search" oninput="filterPools(this.value)" placeholder="Rechercher une piscine, un client, une adresse..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm">
    </div>
    <div id="pools-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>`

  renderPoolsList('')
}

function renderPoolsList(query) {
  // Pour un worker : ne montrer que les piscines qui lui sont assignées via maintenances
  let pools = state.pools
  if (!isAdmin()) {
    const myPoolIds = new Set(state.maintenances.map(m => m.pool_id))
    pools = pools.filter(p => myPoolIds.has(p.id))
  }
  if (query) {
    const q = query.toLowerCase()
    pools = pools.filter(p => [p.label, p.client_name, p.address, p.treatment_type].some(v => (v || '').toLowerCase().includes(q)))
  }
  // Prioritaires en premier
  pools = [...pools].sort((a, b) => (b.priority || 0) - (a.priority || 0))

  const list = el('pools-list')
  if (!list) return
  if (!pools.length) {
    list.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400"><i class="fas fa-water text-4xl mb-3"></i><p>${isAdmin() ? 'Aucune piscine. Crée ta première piscine !' : 'Aucune piscine attribuée pour le moment.'}</p></div>`
    return
  }
  list.innerHTML = pools.map(p => `
    <div class="pool-card bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer" onclick="viewPool(${p.id})">
      <div class="flex items-start justify-between mb-2">
        <div>
          <div class="font-bold text-slate-800">${p.priority ? '<i class="fas fa-star text-amber-400 mr-1 text-xs"></i>' : ''}${esc(p.label)}</div>
          <div class="text-xs text-slate-400">${esc(p.client_name)}</div>
        </div>
        <span class="w-9 h-9 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center"><i class="fas fa-water"></i></span>
      </div>
      <div class="flex flex-wrap gap-1.5 mt-2">
        ${p.treatment_type ? `<span class="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">${esc(p.treatment_type)}</span>` : ''}
        ${p.volume_m3 ? `<span class="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">${esc(p.volume_m3)} m³</span>` : ''}
        ${p.pool_type ? `<span class="text-[11px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">${esc(p.pool_type)}</span>` : ''}
      </div>
      ${p.address ? `<p class="text-xs text-slate-400 mt-2 truncate"><i class="fas fa-location-dot mr-1"></i>${esc(p.address)}</p>` : ''}
    </div>`).join('')
}

function filterPools(query) { renderPoolsList(query) }
window.filterPools = filterPools

async function viewPool(id) {
  const { data } = await API.get(`/pools/${id}`)
  state.currentPool = data
  state.view = 'pool-detail'
  renderShell()
  renderView()
}
window.viewPool = viewPool

function parseRoutine(r) { try { return JSON.parse(r || '[]') } catch { return [] } }

function renderPoolDetail(c) {
  const p = state.currentPool
  if (!p) { state.view = 'clients'; return renderView() }
  const routine = parseRoutine(p.routine)
  const infoRow = (label, val, icon) => val ? `
    <div class="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <i class="fas ${icon} text-cyan-500 w-5 text-center"></i>
      <span class="text-sm text-slate-400 w-32 shrink-0">${label}</span>
      <span class="text-sm font-semibold text-slate-700">${esc(val)}</span>
    </div>` : ''

  // Retour : vers la fiche client si on connaît le client de la piscine, sinon liste clients
  const backToClient = p.client_id ? `viewClient(${p.client_id})` : `navigate('clients')`
  c.innerHTML = `
    <button onclick="${backToClient}" class="text-slate-400 hover:text-slate-600 mb-3 text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour ${p.client_name ? 'à ' + esc(p.client_name) : ''}</button>
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        <!-- En-tête -->
        <div class="bg-gradient-to-br from-cyan-600 to-sky-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-cyan-100 text-sm truncate">${esc(p.client_name)}</div>
              <h2 class="text-xl sm:text-2xl font-extrabold truncate">${esc(p.label)}</h2>
            </div>
            <i class="fas fa-water text-3xl sm:text-4xl text-cyan-200/60 shrink-0"></i>
          </div>
          ${p.address ? `<a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}" target="_blank" class="inline-flex items-center gap-1.5 mt-3 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"><i class="fas fa-location-dot"></i>${esc(p.address)}</a>` : ''}
          ${p.winterized ? '<div class="mt-3 inline-flex items-center gap-1.5 text-sm bg-blue-900/40 border border-white/30 px-3 py-1.5 rounded-lg"><i class="fas fa-snowflake"></i>Piscine hivernée — passages suspendus</div>' : ''}
        </div>

        <!-- Accès & logistique (mis en avant pour la délégation) -->
        ${(p.access_code || p.access_notes) ? `
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 class="font-bold text-amber-800 mb-3"><i class="fas fa-key mr-2"></i>Accès & logistique</h3>
          ${p.access_code ? `<div class="mb-2"><span class="text-sm text-amber-700">Code d'accès :</span> <span class="font-mono font-bold text-lg bg-white px-2 py-0.5 rounded">${esc(p.access_code)}</span></div>` : ''}
          ${p.access_notes ? `<p class="text-sm text-amber-800">${esc(p.access_notes)}</p>` : ''}
        </div>` : ''}

        <!-- Caractéristiques techniques -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 class="font-bold text-slate-700 mb-2"><i class="fas fa-gears mr-2 text-cyan-500"></i>Caractéristiques</h3>
          ${infoRow('Type', p.pool_type, 'fa-square-full')}
          ${infoRow('Volume', p.volume_m3 ? p.volume_m3 + ' m³' : null, 'fa-ruler-combined')}
          ${infoRow('Forme', p.shape, 'fa-shapes')}
          ${infoRow('Traitement', p.treatment_type, 'fa-flask')}
          ${infoRow('Filtration', p.filtration_type, 'fa-filter')}
          ${!p.pool_type && !p.volume_m3 && !p.shape && !p.treatment_type && !p.filtration_type ? '<p class="text-sm text-slate-400 py-2">Aucune caractéristique renseignée</p>' : ''}
        </div>

        <!-- Routine -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-list-check mr-2 text-cyan-500"></i>Routine d'entretien</h3>
          ${routine.length ? `<div class="space-y-1.5">${routine.map((step, i) => `
            <label class="routine-item flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" class="mt-0.5 w-5 h-5 rounded accent-cyan-600" onchange="this.closest('.routine-item').classList.toggle('checked', this.checked)">
              <span class="text-sm">${i + 1}. ${esc(step)}</span>
            </label>`).join('')}</div>` : '<p class="text-sm text-slate-400">Aucune routine définie</p>'}
        </div>

        <!-- Cycle de passage saisonnier -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-slate-700"><i class="fas fa-calendar-week mr-2 text-cyan-500"></i>Cycle de passage saisonnier</h3>
            ${isAdmin() ? `<button onclick="openSeasonsEditor(${p.id})" class="text-cyan-600 text-sm font-semibold"><i class="fas fa-sliders mr-1"></i>Configurer</button>` : ''}
          </div>
          ${seasonsSummaryHtml(p.seasons)}
          ${poolSeasonStatusHtml(p.seasons)}
        </div>

        ${p.routine_client ? `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-5"><h3 class="font-bold text-amber-800 mb-2"><i class="fas fa-lightbulb mr-2"></i>Conseils transmis au client</h3><p class="text-sm text-amber-900 whitespace-pre-line">${esc(p.routine_client)}</p></div>` : ''}

        ${p.notes ? `<div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"><h3 class="font-bold text-slate-700 mb-2"><i class="fas fa-note-sticky mr-2 text-cyan-500"></i>Notes</h3><p class="text-sm text-slate-600 whitespace-pre-line">${esc(p.notes)}</p></div>` : ''}

        <!-- Photos -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-slate-700"><i class="fas fa-camera mr-2 text-cyan-500"></i>Photos</h3>
            <button onclick="openPhotoUpload(${p.id})" class="text-cyan-600 text-sm font-semibold"><i class="fas fa-plus mr-1"></i>Ajouter</button>
          </div>
          <div id="pool-photos" class="grid grid-cols-3 sm:grid-cols-4 gap-2"><div class="col-span-full text-center text-sm text-slate-400 py-3"><i class="fas fa-spinner fa-spin"></i></div></div>
        </div>
      </div>

      <!-- Colonne droite -->
      <div class="space-y-4">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-address-card mr-2 text-cyan-500"></i>Contact client</h3>
          <div class="text-sm space-y-2">
            <div><span class="text-slate-400">Nom :</span> <b>${esc(p.client_name)}</b></div>
            ${p.client_phone ? `<div><span class="text-slate-400">Tél :</span> <a href="tel:${esc(p.client_phone)}" class="text-cyan-600 font-semibold">${esc(p.client_phone)}</a></div>` : ''}
            ${p.client_email ? `<div class="truncate"><span class="text-slate-400">Email :</span> ${esc(p.client_email)}</div>` : ''}
          </div>
        </div>
        ${p.lat && p.lng ? `<div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
          <div id="pool-mini-map" class="h-48 rounded-xl"></div>
          <button onclick="openGPS(${p.lat}, ${p.lng})" class="w-full mt-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl"><i class="fas fa-diamond-turn-right mr-1"></i>Y aller (GPS)</button>
        </div>` : ''}
        <div class="space-y-2">
          <button onclick="openMaintenancePicker(${p.id}, '${esc(p.label).replace(/'/g,'')}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl"><i class="fas fa-clipboard-check mr-1"></i>Enregistrer un passage</button>
          <button onclick="openPoolHistory(${p.id}, '${esc(p.label).replace(/'/g,'')}', ${JSON.stringify({ideal_ph_min:p.ideal_ph_min,ideal_ph_max:p.ideal_ph_max}).replace(/'/g,'&#39;')})" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl"><i class="fas fa-clock-rotate-left mr-1"></i>Historique & relevés</button>
          ${isAdmin() ? `
          <button onclick='openPoolForm(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl"><i class="fas fa-pen mr-1"></i>Modifier la piscine</button>
          <button onclick="openMaintenanceForm(null, ${p.id})" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 rounded-xl"><i class="fas fa-calendar-plus mr-1"></i>Planifier un entretien</button>
          <button onclick="toggleWinterize(${p.id}, ${p.winterized ? 1 : 0})" class="w-full ${p.winterized ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-semibold py-2.5 rounded-xl"><i class="fas fa-snowflake mr-1"></i>${p.winterized ? 'Sortir d’hivernage' : 'Mettre en hivernage'}</button>` : ''}
        </div>
      </div>
    </div>`

  if (p.lat && p.lng) {
    setTimeout(() => {
      const m = L.map('pool-mini-map', { zoomControl: false, attributionControl: false }).setView([p.lat, p.lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m)
      L.marker([p.lat, p.lng]).addTo(m)
    }, 100)
  }
  loadPoolPhotos(p.id)
}

// C8 : basculer l'hivernage d'une piscine
async function toggleWinterize(poolId, current) {
  const goingOn = !current
  if (goingOn && !confirm('Mettre cette piscine en hivernage ? Les passages seront suspendus et les alertes de retard désactivées.')) return
  try {
    const { data } = await API.post(`/pools/${poolId}/winterize`, { on: goingOn })
    if (state.currentPool && state.currentPool.id == poolId) state.currentPool.winterized = data.winterized
    const pInList = state.pools.find(x => x.id == poolId); if (pInList) pInList.winterized = data.winterized
    renderView()
    toast(data.winterized ? 'Piscine hivernée ❄️' : 'Piscine réactivée ☀️')
  } catch (e) { console.warn(e); toast('Erreur', 'error') }
}
window.toggleWinterize = toggleWinterize

// N1 : saison active aujourd'hui + prochaine échéance (autonome, ne dépend pas de views-agenda)
function poolSeasonStatusHtml(seasons) {
  if (!seasons || !seasons.length) return ''
  const today = new Date()
  const curMd = (today.getMonth() + 1) * 100 + today.getDate()
  const inSeason = (s) => {
    const toNum = (md) => { const [m, d] = String(md).split('-').map(Number); return m * 100 + d }
    const a = toNum(s.start_md), b = toNum(s.end_md)
    return a <= b ? (curMd >= a && curMd <= b) : (curMd >= a || curMd <= b)
  }
  const active = seasons.find(s => s.active !== 0 && inSeason(s))
  if (!active) return '<div class="mt-2 text-sm text-slate-500"><i class="fas fa-circle-pause mr-1 text-slate-400"></i>Hors saison aujourd\'hui — aucun passage planifié.</div>'
  // Prochaine échéance : ancrée sur le début de saison, tous les interval_days
  const [mm, dd] = String(active.start_md).split('-').map(Number)
  let anchor = new Date(today.getFullYear(), mm - 1, dd); anchor.setHours(0,0,0,0)
  if (anchor > today) anchor = new Date(today.getFullYear() - 1, mm - 1, dd)
  const interval = Math.max(1, Number(active.interval_days) || 7)
  const t0 = new Date(today); t0.setHours(0,0,0,0)
  const elapsed = Math.round((t0 - anchor) / 86400000)
  const next = new Date(anchor.getTime() + (Math.ceil(elapsed / interval) * interval) * 86400000)
  const label = active.label || `${active.start_md}→${active.end_md}`
  return `<div class="mt-2 text-sm text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
    <i class="fas fa-leaf mr-1"></i>Saison active : <strong>${esc(label)}</strong> · tous les ${interval}j ·
    prochain passage prévu : <strong>${next.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</strong></div>`
}
window.poolSeasonStatusHtml = poolSeasonStatusHtml

async function loadPoolPhotos(poolId) {
  const box = el('pool-photos')
  if (!box) return
  try {
    const { data } = await API.get(`/pools/${poolId}/photos`)
    if (!data.length) { box.innerHTML = '<div class="col-span-full text-center text-sm text-slate-400 py-3">Aucune photo</div>'; return }
    box.innerHTML = data.map(ph => `
      <div class="relative group aspect-square">
        <img src="${ph.url}" class="w-full h-full object-cover rounded-lg cursor-pointer" onclick="openPhotoLightbox('${ph.url}')">
        <button onclick="deletePhoto(${ph.id}, ${poolId})" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition text-xs"><i class="fas fa-times"></i></button>
      </div>`).join('')
  } catch { box.innerHTML = '<div class="col-span-full text-center text-sm text-slate-400 py-3">Erreur de chargement</div>' }
}
window.loadPoolPhotos = loadPoolPhotos

function openPhotoUpload(poolId, logId = null, sendMailAfter = false) {
  openModal('Ajouter une photo', `
    <form id="photo-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Photo (max 5 Mo)</label>
        <input id="ph-file" type="file" accept="image/*" required class="w-full text-sm border border-slate-300 rounded-xl p-2">
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Légende (optionnel)</label>
        <input id="ph-caption" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="Eau cristalline après traitement">
      </div>
      <button type="submit" id="ph-submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">Envoyer</button>
    </form>`)

  el('photo-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const file = el('ph-file').files[0]
    if (!file) return
    const btn = el('ph-submit'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Envoi...'
    const fd = new FormData()
    fd.append('file', file); fd.append('pool_id', poolId)
    if (logId) fd.append('log_id', logId)
    if (el('ph-caption').value) fd.append('caption', el('ph-caption').value)
    try {
      await API.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      closeModal(); toast('Photo ajoutée')
      if (state.view === 'pool-detail') loadPoolPhotos(poolId)
      // Si on devait envoyer le compte rendu au client après la photo : on le fait
      // maintenant pour que la photo figure bien dans l'e-mail.
      if (sendMailAfter && logId) {
        try {
          const { data } = await API.post(`/logs/${logId}/send-report`)
          toast('Compte rendu envoyé au client 📧', 'success')
        } catch (e2) {
          toast('Photo OK, mais e-mail non envoyé : ' + (e2.response?.data?.error || 'erreur'), 'info')
        }
      }
    } catch (err) { btn.disabled = false; btn.innerHTML = 'Réessayer'; toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openPhotoUpload = openPhotoUpload

async function deletePhoto(id, poolId) {
  if (!confirm('Supprimer cette photo ?')) return
  try { await API.delete(`/photos/${id}`); loadPoolPhotos(poolId); toast('Photo supprimée') }
  catch { toast('Erreur', 'error') }
}
window.deletePhoto = deletePhoto

// ---------- Formulaire piscine ----------
function selectOptions(options, selected) {
  return ['<option value="">—</option>', ...options.map(o => `<option value="${o}" ${o === selected ? 'selected' : ''}>${o}</option>`)].join('')
}

function openPoolForm(pool = null, presetClientId = null) {
  const isEdit = !!pool
  const routine = parseRoutine(pool?.routine)
  const clientOptions = state.clients.map(cl => `<option value="${cl.id}" ${(pool?.client_id || presetClientId) == cl.id ? 'selected' : ''}>${esc(cl.name)}</option>`).join('')

  openModal(isEdit ? 'Modifier la piscine' : 'Nouvelle piscine', `
    <form id="pool-form" class="space-y-4">
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Client *</label>
          <select id="pf-client" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none">${clientOptions}</select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Nom de la piscine *</label>
          <input id="pf-label" required value="${esc(pool?.label || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Piscine principale">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Adresse <span class="text-xs text-slate-400 font-normal">(géolocalisée automatiquement)</span></label>
        <input id="pf-address" value="${esc(pool?.address || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="10 rue des Lilas, 13100 Aix-en-Provence">
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">Type</label><select id="pf-type" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">${selectOptions(POOL_TYPES, pool?.pool_type)}</select></div>
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">Volume (m³)</label><input id="pf-volume" type="number" step="0.5" value="${pool?.volume_m3 || ''}" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"></div>
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">Forme</label><select id="pf-shape" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">${selectOptions(SHAPES, pool?.shape)}</select></div>
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">Traitement</label><select id="pf-treatment" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">${selectOptions(TREATMENTS, pool?.treatment_type)}</select></div>
        <div class="col-span-2"><label class="block text-xs font-semibold text-slate-500 mb-1">Filtration</label><select id="pf-filtration" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">${selectOptions(FILTRATIONS, pool?.filtration_type)}</select></div>
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div><label class="block text-sm font-semibold text-slate-600 mb-1">Code d'accès</label><input id="pf-code" value="${esc(pool?.access_code || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="Digicode, clé..."></div>
        <div><label class="block text-sm font-semibold text-slate-600 mb-1">Notes d'accès</label><input id="pf-access-notes" value="${esc(pool?.access_notes || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="Chien, portail, produits..."></div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Routine d'entretien <span class="text-xs text-slate-400 font-normal">(une étape par ligne)</span></label>
        <textarea id="pf-routine" rows="5" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono" placeholder="Vérifier le niveau d'eau&#10;Nettoyer les skimmers&#10;Tester pH et chlore">${esc(routine.join('\n'))}</textarea>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1"><i class="fas fa-lightbulb text-amber-400 mr-1"></i>Conseils pour le client <span class="text-xs text-slate-400 font-normal">(visible dans son espace)</span></label>
        <textarea id="pf-routine-client" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm" placeholder="Ce que le client doit faire entre deux passages : maintenir le niveau d'eau, passer le robot 1×/semaine, ne pas baigner après ajout de produit...">${esc(pool?.routine_client || '')}</textarea>
      </div>
      <div class="bg-sky-50 rounded-xl p-3">
        <div class="text-xs font-bold text-sky-800 mb-2"><i class="fas fa-sliders mr-1"></i>Valeurs idéales <span class="font-normal text-sky-600">(repères pour les relevés & le diagnostic)</span></div>
        <div class="grid grid-cols-4 gap-2 mb-2">
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">pH min</label><input id="pf-phmin" type="number" step="0.1" value="${pool?.ideal_ph_min ?? 7.0}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">pH max</label><input id="pf-phmax" type="number" step="0.1" value="${pool?.ideal_ph_max ?? 7.4}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Cl min</label><input id="pf-clmin" type="number" step="0.1" value="${pool?.ideal_chlorine_min ?? 1.0}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Cl max</label><input id="pf-clmax" type="number" step="0.1" value="${pool?.ideal_chlorine_max ?? 2.0}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Sel min</label><input id="pf-saltmin" type="number" step="0.1" value="${pool?.ideal_salt_min ?? 3.0}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Sel max</label><input id="pf-saltmax" type="number" step="0.1" value="${pool?.ideal_salt_max ?? 5.0}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">TAC min</label><input id="pf-tacmin" type="number" step="1" value="${pool?.ideal_tac_min ?? 80}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">TAC max</label><input id="pf-tacmax" type="number" step="1" value="${pool?.ideal_tac_max ?? 120}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Stab. min</label><input id="pf-stabmin" type="number" step="1" value="${pool?.ideal_stabilizer_min ?? 30}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Stab. max</label><input id="pf-stabmax" type="number" step="1" value="${pool?.ideal_stabilizer_max ?? 50}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center"></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5"><i class="fas fa-ruler-vertical mr-0.5"></i>Profondeur moy. (m)</label><input id="pf-depth" type="number" step="0.1" value="${pool?.depth_avg_m || ''}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center" placeholder="1.5"></div>
          <div><label class="block text-[11px] font-semibold text-slate-500 mb-0.5"><i class="fas fa-bell mr-0.5"></i>Alerte si pas de passage (jours)</label><input id="pf-interval" type="number" step="1" value="${pool?.expected_interval_days ?? 7}" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-center" placeholder="7"></div>
        </div>
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" id="pf-priority" ${pool?.priority ? 'checked' : ''} class="w-5 h-5 rounded accent-amber-500">
        <span class="text-sm font-semibold text-slate-600"><i class="fas fa-star text-amber-400 mr-1"></i>Piscine prioritaire</span>
      </label>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Notes générales</label>
        <textarea id="pf-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm">${esc(pool?.notes || '')}</textarea>
      </div>
      <div class="flex gap-2 pt-2">
        ${isEdit ? `<button type="button" onclick="deletePool(${pool.id})" class="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"><i class="fas fa-trash"></i></button>` : ''}
        <button type="submit" id="pf-submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">${isEdit ? 'Enregistrer' : 'Créer la piscine'}</button>
      </div>
    </form>`, { size: '2xl' })

  el('pool-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const routineArr = el('pf-routine').value.split('\n').map(s => s.trim()).filter(Boolean)
    const payload = {
      client_id: el('pf-client').value, label: el('pf-label').value,
      address: el('pf-address').value, pool_type: el('pf-type').value,
      volume_m3: el('pf-volume').value ? parseFloat(el('pf-volume').value) : null,
      shape: el('pf-shape').value, treatment_type: el('pf-treatment').value,
      filtration_type: el('pf-filtration').value, access_code: el('pf-code').value,
      access_notes: el('pf-access-notes').value,
      routine: JSON.stringify(routineArr), routine_client: el('pf-routine-client').value, notes: el('pf-notes').value,
      ideal_ph_min: parseFloat(el('pf-phmin').value) || 7.0,
      ideal_ph_max: parseFloat(el('pf-phmax').value) || 7.4,
      ideal_chlorine_min: parseFloat(el('pf-clmin').value) || 1.0,
      ideal_chlorine_max: parseFloat(el('pf-clmax').value) || 2.0,
      ideal_salt_min: parseFloat(el('pf-saltmin').value) || 3.0,
      ideal_salt_max: parseFloat(el('pf-saltmax').value) || 5.0,
      ideal_tac_min: parseFloat(el('pf-tacmin').value) || 80,
      ideal_tac_max: parseFloat(el('pf-tacmax').value) || 120,
      ideal_stabilizer_min: parseFloat(el('pf-stabmin').value) || 30,
      ideal_stabilizer_max: parseFloat(el('pf-stabmax').value) || 50,
      depth_avg_m: el('pf-depth').value ? parseFloat(el('pf-depth').value) : null,
      expected_interval_days: el('pf-interval').value ? parseInt(el('pf-interval').value) : 7,
      priority: el('pf-priority').checked ? 1 : 0
    }
    // Si l'adresse a changé en édition, on remet lat/lng à null pour re-géocoder
    if (isEdit && pool.address === payload.address) { payload.lat = pool.lat; payload.lng = pool.lng }
    const btn = el('pf-submit'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Géolocalisation...'
    try {
      if (isEdit) await API.put(`/pools/${pool.id}`, payload)
      else await API.post('/pools', payload)
      closeModal(); await loadData()
      if (state.view === 'pool-detail' && isEdit) { await viewPool(pool.id) } else { renderView() }
      toast(isEdit ? 'Piscine modifiée' : 'Piscine créée')
    } catch (err) { btn.disabled = false; btn.innerHTML = 'Réessayer'; toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openPoolForm = openPoolForm

async function deletePool(id) {
  if (!confirm('Supprimer cette piscine et ses entretiens ?')) return
  try { const cid = state.currentPool?.client_id; await API.delete(`/pools/${id}`); closeModal(); await loadData(); if (cid) viewClient(cid); else navigate('clients'); toast('Piscine supprimée') }
  catch { toast('Erreur', 'error') }
}
window.deletePool = deletePool

// ============================================================
// CYCLES SAISONNIERS (configuration par piscine)
// ============================================================
const WEEKDAY_LABELS = { '': 'Tous les jours', '1': 'Lundi', '2': 'Mardi', '3': 'Mercredi', '4': 'Jeudi', '5': 'Vendredi', '6': 'Samedi', '7': 'Dimanche' }
function mdLabel(md) {
  if (!md || !/^\d{2}-\d{2}$/.test(md)) return md || '—'
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  const [mm, dd] = md.split('-').map(Number)
  return `${dd} ${months[mm - 1] || '?'}`
}
function intervalLabel(d) {
  d = Number(d) || 7
  if (d === 1) return 'tous les jours'
  if (d === 7) return '1×/semaine'
  if (d === 14) return 'toutes les 2 sem.'
  if (d === 30 || d === 31) return '1×/mois'
  return `tous les ${d} jours`
}

// Résumé affiché dans la fiche piscine
function seasonsSummaryHtml(seasons) {
  seasons = seasons || []
  if (!seasons.length) {
    return `<p class="text-sm text-slate-400">Aucun cycle saisonnier défini. La piscine suit l'entretien hebdomadaire classique de l'agenda. <span class="text-slate-400">Configure des saisons pour adapter la fréquence (ex. été rapproché, hiver espacé).</span></p>`
  }
  return `<div class="space-y-2">${seasons.map(s => `
    <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
      <div>
        <div class="font-semibold text-sm text-slate-700">${esc(s.label || 'Saison')}</div>
        <div class="text-xs text-slate-500">${mdLabel(s.start_md)} → ${mdLabel(s.end_md)}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-bold text-cyan-700">${intervalLabel(s.interval_days)}</div>
        ${s.weekday ? `<div class="text-[11px] text-slate-400">${WEEKDAY_LABELS[String(s.weekday)] || ''}</div>` : ''}
      </div>
    </div>`).join('')}</div>`
}
window.seasonsSummaryHtml = seasonsSummaryHtml

// État temporaire de l'éditeur
let seasonsDraft = []
let seasonsPoolId = null

function seasonRowHtml(s, i) {
  const mdInput = (val) => {
    // input date sans année : on utilise type=date mais on n'utilise que MM-DD ; valeur fictive année 2024
    return val && /^\d{2}-\d{2}$/.test(val) ? `2024-${val}` : ''
  }
  return `
    <div class="border border-slate-200 rounded-xl p-3 space-y-2 bg-white" data-season-row="${i}">
      <div class="flex items-center gap-2">
        <input value="${esc(s.label || '')}" oninput="seasonsDraft[${i}].label=this.value" placeholder="Nom (ex. Haute saison)" class="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold">
        <button type="button" onclick="removeSeasonRow(${i})" class="text-red-500 hover:text-red-700 px-2"><i class="fas fa-trash"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Du</label>
          <input type="date" value="${mdInput(s.start_md)}" onchange="seasonsDraft[${i}].start_md=this.value.slice(5)" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm">
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Au</label>
          <input type="date" value="${mdInput(s.end_md)}" onchange="seasonsDraft[${i}].end_md=this.value.slice(5)" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Fréquence</label>
          <select onchange="seasonsDraft[${i}].interval_days=parseInt(this.value)" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm">
            ${[1,2,3,4,7,10,14,21,30,60,90].map(d => `<option value="${d}" ${Number(s.interval_days)===d?'selected':''}>${d===1?'Tous les jours':'Tous les '+d+' jours'}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-0.5">Jour préféré</label>
          <select onchange="seasonsDraft[${i}].weekday=this.value" class="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm">
            ${['','1','2','3','4','5','6','7'].map(w => `<option value="${w}" ${String(s.weekday||'')===w?'selected':''}>${WEEKDAY_LABELS[w]}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="text-[11px] text-slate-400">💡 Une saison peut chevaucher la fin d'année (ex. du 1 nov au 31 mars = hivernage).</p>
    </div>`
}

function renderSeasonsDraft() {
  const box = el('seasons-list')
  if (!box) return
  box.innerHTML = seasonsDraft.length
    ? seasonsDraft.map((s, i) => seasonRowHtml(s, i)).join('')
    : '<p class="text-sm text-slate-400 text-center py-4">Aucune saison. Ajoute une période ci-dessous.</p>'
}

function addSeasonRow() {
  seasonsDraft.push({ label: '', start_md: '06-01', end_md: '09-30', interval_days: 3, weekday: '' })
  renderSeasonsDraft()
}
window.addSeasonRow = addSeasonRow

function removeSeasonRow(i) {
  seasonsDraft.splice(i, 1)
  renderSeasonsDraft()
}
window.removeSeasonRow = removeSeasonRow

function applyPreset(preset) {
  if (preset === 'classic') {
    seasonsDraft = [
      { label: 'Haute saison', start_md: '06-01', end_md: '09-15', interval_days: 3, weekday: '' },
      { label: 'Mi-saison', start_md: '04-01', end_md: '05-31', interval_days: 7, weekday: '' },
      { label: 'Mi-saison automne', start_md: '09-16', end_md: '10-31', interval_days: 7, weekday: '' },
      { label: 'Hivernage', start_md: '11-01', end_md: '03-31', interval_days: 30, weekday: '' },
    ]
  }
  renderSeasonsDraft()
}
window.applyPreset = applyPreset

function openSeasonsEditor(poolId) {
  seasonsPoolId = poolId
  const pool = state.currentPool && state.currentPool.id === poolId ? state.currentPool : null
  seasonsDraft = (pool?.seasons || []).map(s => ({
    label: s.label || '', start_md: s.start_md, end_md: s.end_md,
    interval_days: Number(s.interval_days) || 7, weekday: s.weekday != null ? String(s.weekday) : ''
  }))
  openModal('Cycle de passage saisonnier', `
    <div class="space-y-3">
      <p class="text-sm text-slate-500">Définis des périodes de l'année avec leur propre fréquence de passage. En été on passe souvent, en hiver beaucoup moins. Les dates se répètent chaque année.</p>
      <div class="flex items-center justify-between">
        <button type="button" onclick="applyPreset('classic')" class="text-xs font-semibold text-cyan-600 hover:text-cyan-800"><i class="fas fa-wand-magic-sparkles mr-1"></i>Modèle type (été/hiver)</button>
        <button type="button" onclick="addSeasonRow()" class="text-sm font-semibold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"><i class="fas fa-plus mr-1"></i>Ajouter une saison</button>
      </div>
      <div id="seasons-list" class="space-y-3 max-h-[50vh] overflow-y-auto"></div>
      <button type="button" id="seasons-save" onclick="saveSeasons()" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">Enregistrer le cycle</button>
    </div>`, { size: '2xl' })
  renderSeasonsDraft()
}
window.openSeasonsEditor = openSeasonsEditor

async function saveSeasons() {
  // Validation : dates renseignées
  for (const s of seasonsDraft) {
    if (!/^\d{2}-\d{2}$/.test(s.start_md || '') || !/^\d{2}-\d{2}$/.test(s.end_md || '')) {
      return toast('Renseigne les dates de début et de fin pour chaque saison', 'error')
    }
  }
  const btn = el('seasons-save'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Enregistrement...'
  try {
    await API.put(`/pools/${seasonsPoolId}/seasons`, { seasons: seasonsDraft })
    closeModal()
    await loadData()          // recharge les maintenances (avec leurs saisons) pour l'agenda
    if (state.view === 'pool-detail') await viewPool(seasonsPoolId)
    toast('Cycle saisonnier enregistré')
  } catch (err) {
    btn.disabled = false; btn.innerHTML = 'Réessayer'
    toast(err.response?.data?.error || 'Erreur', 'error')
  }
}
window.saveSeasons = saveSeasons
