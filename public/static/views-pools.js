// ============================================================
// VUE PISCINES
// ============================================================
const POOL_TYPES = ['enterrée', 'hors-sol', 'coque', 'béton', 'liner', 'naturelle']
const SHAPES = ['rectangulaire', 'ovale', 'ronde', 'libre', 'haricot', 'carrée']
const TREATMENTS = ['chlore', 'sel/électrolyse', 'brome', 'oxygène actif', 'PHMB', 'UV']
const FILTRATIONS = ['sable', 'cartouche', 'diatomées', 'verre', 'zéolite']

function renderPools(c) {
  c.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-2xl font-extrabold text-slate-800"><i class="fas fa-water text-cyan-600 mr-2"></i>${isAdmin() ? 'Piscines' : 'Mes piscines'}</h2>
      ${isAdmin() ? `<button onclick="openPoolForm()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-2"><i class="fas fa-plus"></i><span class="hidden sm:inline">Nouvelle piscine</span></button>` : ''}
    </div>
    <div id="pools-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>`

  // Pour un worker : ne montrer que les piscines qui lui sont assignées via maintenances
  let pools = state.pools
  if (!isAdmin()) {
    const myPoolIds = new Set(state.maintenances.map(m => m.pool_id))
    pools = pools.filter(p => myPoolIds.has(p.id))
  }

  const list = el('pools-list')
  if (!pools.length) {
    list.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400"><i class="fas fa-water text-4xl mb-3"></i><p>${isAdmin() ? 'Aucune piscine. Crée ta première piscine !' : 'Aucune piscine attribuée pour le moment.'}</p></div>`
    return
  }
  list.innerHTML = pools.map(p => `
    <div class="pool-card bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer" onclick="viewPool(${p.id})">
      <div class="flex items-start justify-between mb-2">
        <div>
          <div class="font-bold text-slate-800">${esc(p.label)}</div>
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
  if (!p) { state.view = 'pools'; return renderView() }
  const routine = parseRoutine(p.routine)
  const infoRow = (label, val, icon) => val ? `
    <div class="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <i class="fas ${icon} text-cyan-500 w-5 text-center"></i>
      <span class="text-sm text-slate-400 w-32 shrink-0">${label}</span>
      <span class="text-sm font-semibold text-slate-700">${esc(val)}</span>
    </div>` : ''

  c.innerHTML = `
    <button onclick="navigate('pools')" class="text-slate-400 hover:text-slate-600 mb-3 text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button>
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        <!-- En-tête -->
        <div class="bg-gradient-to-br from-cyan-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-cyan-100 text-sm">${esc(p.client_name)}</div>
              <h2 class="text-2xl font-extrabold">${esc(p.label)}</h2>
            </div>
            <i class="fas fa-water text-4xl text-cyan-200/60"></i>
          </div>
          ${p.address ? `<a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}" target="_blank" class="inline-flex items-center gap-1.5 mt-3 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"><i class="fas fa-location-dot"></i>${esc(p.address)}</a>` : ''}
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

        ${p.notes ? `<div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5"><h3 class="font-bold text-slate-700 mb-2"><i class="fas fa-note-sticky mr-2 text-cyan-500"></i>Notes</h3><p class="text-sm text-slate-600 whitespace-pre-line">${esc(p.notes)}</p></div>` : ''}
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
        ${p.lat && p.lng ? `<div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-2"><div id="pool-mini-map" class="h-48 rounded-xl"></div></div>` : ''}
        ${isAdmin() ? `
        <div class="space-y-2">
          <button onclick='openPoolForm(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl"><i class="fas fa-pen mr-1"></i>Modifier la piscine</button>
          <button onclick="openMaintenanceForm(null, ${p.id})" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 rounded-xl"><i class="fas fa-calendar-plus mr-1"></i>Planifier un entretien</button>
        </div>` : ''}
      </div>
    </div>`

  if (p.lat && p.lng) {
    setTimeout(() => {
      const m = L.map('pool-mini-map', { zoomControl: false, attributionControl: false }).setView([p.lat, p.lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m)
      L.marker([p.lat, p.lng]).addTo(m)
    }, 100)
  }
}

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
      routine: JSON.stringify(routineArr), notes: el('pf-notes').value
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
  try { await API.delete(`/pools/${id}`); closeModal(); await loadData(); navigate('pools'); toast('Piscine supprimée') }
  catch { toast('Erreur', 'error') }
}
window.deletePool = deletePool
