// ============================================================
// VUE CLIENTS (admin)
// ============================================================
function renderClients(c) {
  c.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800"><i class="fas fa-users text-cyan-600 mr-2"></i>Clients & piscines</h2>
      <button onclick="openClientForm()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-xl shadow flex items-center gap-2">
        <i class="fas fa-plus"></i><span class="hidden sm:inline">Nouveau client</span>
      </button>
    </div>
    <div class="relative mb-4">
      <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
      <input id="client-search" oninput="filterClients(this.value)" placeholder="Rechercher un client, une piscine, une adresse..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm">
    </div>
    <div id="clients-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>`

  renderClientsList('')
}

function renderClientsList(query) {
  const list = el('clients-list')
  if (!list) return
  if (!state.clients.length) {
    list.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400"><i class="fas fa-user-plus text-4xl mb-3"></i><p>Aucun client. Crée ton premier client !</p></div>`
    return
  }

  // Recherche : par client OU par une de ses piscines (label/adresse/traitement)
  let clients = state.clients
  if (query) {
    const q = query.toLowerCase()
    const poolsByClient = (cid) => state.pools.filter(p => p.client_id === cid)
    clients = clients.filter(cl => {
      if ([cl.name, cl.phone, cl.notes].some(v => (v || '').toLowerCase().includes(q))) return true
      return poolsByClient(cl.id).some(p => [p.label, p.address, p.treatment_type].some(v => (v || '').toLowerCase().includes(q)))
    })
  }

  if (!clients.length) {
    list.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400"><i class="fas fa-magnifying-glass text-3xl mb-2"></i><p class="text-sm">Aucun résultat</p></div>`
    return
  }

  list.innerHTML = clients.map(cl => {
    const pools = state.pools.filter(p => p.client_id === cl.id)
    return `
    <div class="pool-card bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer" onclick="viewClient(${cl.id})">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 shrink-0 bg-cyan-100 text-cyan-700 rounded-xl flex items-center justify-center font-bold text-lg">${esc(cl.name.charAt(0).toUpperCase())}</div>
          <div class="min-w-0">
            <div class="font-bold text-slate-800 truncate">${esc(cl.name)}</div>
            <div class="text-xs text-slate-400 truncate">${esc(cl.phone || 'Pas de téléphone')}</div>
          </div>
        </div>
        <span class="text-xs bg-sky-50 text-sky-600 px-2 py-1 rounded-full font-semibold whitespace-nowrap shrink-0"><i class="fas fa-water mr-1"></i>${cl.pool_count}</span>
      </div>
      ${pools.length ? `<div class="flex flex-wrap gap-1.5 mt-3">
        ${pools.slice(0, 4).map(p => `<span class="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-[120px]">${p.winterized ? '<i class=\"fas fa-snowflake text-blue-400 mr-1\"></i>' : ''}${esc(p.label)}</span>`).join('')}
        ${pools.length > 4 ? `<span class="text-[11px] text-slate-400 px-1">+${pools.length - 4}</span>` : ''}
      </div>` : ''}
    </div>`
  }).join('')
}

function filterClients(query) { renderClientsList(query) }
window.filterClients = filterClients

// Ouvre la fiche client comme une VRAIE page (et non plus une modale)
function viewClient(id) {
  state.currentClientId = id
  state.view = 'client-detail'
  renderShell()
  renderView()
}
window.viewClient = viewClient

function openClientForm(client = null) {
  const isEdit = !!client
  openModal(isEdit ? 'Modifier le client' : 'Nouveau client', `
    <form id="client-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Nom / Famille *</label>
        <input id="cf-name" required value="${esc(client?.name || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Famille Dubois">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Téléphone</label>
          <input id="cf-phone" value="${esc(client?.phone || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="06 12 34 56 78">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Email</label>
          <input id="cf-email" type="email" value="${esc(client?.email || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Notes</label>
        <textarea id="cf-notes" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Infos utiles sur ce client...">${esc(client?.notes || '')}</textarea>
      </div>
      <div class="flex gap-2 pt-2">
        ${isEdit ? `<button type="button" onclick="deleteClient(${client.id})" class="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"><i class="fas fa-trash"></i></button>` : ''}
        <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">${isEdit ? 'Enregistrer' : 'Créer le client'}</button>
      </div>
    </form>`)

  el('client-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const payload = {
      name: el('cf-name').value, phone: el('cf-phone').value,
      email: el('cf-email').value, notes: el('cf-notes').value
    }
    try {
      if (isEdit) await API.put(`/clients/${client.id}`, payload)
      else await API.post('/clients', payload)
      closeModal(); await loadData(); renderView()
      toast(isEdit ? 'Client modifié' : 'Client créé')
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openClientForm = openClientForm

async function deleteClient(id) {
  if (!confirm('Supprimer ce client et toutes ses piscines ?')) return
  try {
    await API.delete(`/clients/${id}`)
    closeModal(); await loadData(); renderView(); toast('Client supprimé')
  } catch { toast('Erreur', 'error') }
}
window.deleteClient = deleteClient

// Fiche client = PAGE complète (fusion clients + piscines)
async function renderClientDetail(c) {
  const id = state.currentClientId
  if (!id) { state.view = 'clients'; return renderView() }
  c.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>`
  let data
  try { data = (await API.get(`/clients/${id}`)).data }
  catch (e) { console.warn(e); c.innerHTML = '<p class="text-red-500 p-6">Client introuvable.</p>'; return }
  state.currentClient = data

  const poolCard = (p) => `
    <div class="pool-card bg-white rounded-2xl shadow-sm border ${p.winterized ? 'border-blue-200' : 'border-slate-100'} p-4 cursor-pointer" onclick="viewPool(${p.id})">
      <div class="flex items-start justify-between mb-2">
        <div class="min-w-0">
          <div class="font-bold text-slate-800 truncate">${p.winterized ? '<i class="fas fa-snowflake text-blue-400 mr-1"></i>' : ''}${esc(p.label)}</div>
          ${p.address ? `<div class="text-xs text-slate-400 truncate"><i class="fas fa-location-dot mr-1"></i>${esc(p.address)}</div>` : ''}
        </div>
        <span class="w-9 h-9 shrink-0 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center"><i class="fas fa-water"></i></span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${p.treatment_type ? `<span class="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">${esc(p.treatment_type)}</span>` : ''}
        ${p.volume_m3 ? `<span class="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">${esc(p.volume_m3)} m³</span>` : ''}
      </div>
    </div>`

  c.innerHTML = `
    <button onclick="navigate('clients')" class="text-slate-400 hover:text-slate-600 mb-3 text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour aux clients</button>

    <!-- En-tête client -->
    <div class="bg-gradient-to-br from-cyan-600 to-sky-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg mb-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-12 h-12 shrink-0 bg-white/20 rounded-xl flex items-center justify-center font-bold text-2xl">${esc(data.name.charAt(0).toUpperCase())}</div>
          <div class="min-w-0">
            <h2 class="text-xl sm:text-2xl font-extrabold truncate">${esc(data.name)}</h2>
            <div class="text-cyan-100 text-sm">${data.pools.length} piscine${data.pools.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        <button onclick='openClientForm(${JSON.stringify(data).replace(/'/g, "&#39;")})' class="shrink-0 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-pen sm:mr-1"></i><span class="hidden sm:inline">Modifier</span></button>
      </div>
      <div class="flex flex-wrap gap-3 mt-4">
        ${data.phone ? `<a href="tel:${esc(data.phone)}" class="inline-flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"><i class="fas fa-phone"></i>${esc(data.phone)}</a>` : ''}
        ${data.email ? `<a href="mailto:${esc(data.email)}" class="inline-flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg max-w-full truncate"><i class="fas fa-envelope"></i><span class="truncate">${esc(data.email)}</span></a>` : ''}
      </div>
    </div>

    ${data.notes ? `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 mb-5"><i class="fas fa-note-sticky text-amber-500 mr-1"></i>${esc(data.notes)}</div>` : ''}

    <!-- Piscines du client -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-slate-700"><i class="fas fa-water text-cyan-500 mr-2"></i>Piscines</h3>
      <button onclick="openPoolForm(null, ${data.id})" class="text-cyan-600 text-sm font-semibold"><i class="fas fa-plus mr-1"></i>Ajouter une piscine</button>
    </div>
    ${data.pools.length
      ? `<div class="grid gap-3 sm:grid-cols-2 mb-5">${data.pools.map(poolCard).join('')}</div>`
      : '<div class="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 mb-5"><i class="fas fa-water text-3xl mb-2"></i><p class="text-sm">Aucune piscine. Ajoutes-en une.</p></div>'}

    <!-- Accès espace client -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-bold text-sm text-slate-700"><i class="fas fa-user-lock text-cyan-500 mr-1"></i>Accès espace client</div>
          <div class="text-xs text-slate-400 mt-0.5">${data.client_user_id ? 'Actif · ' + esc(data.client_account_email || '') : "Le client peut consulter l'historique de ses piscines en lecture seule"}</div>
        </div>
        <div class="flex gap-2 shrink-0">
          ${data.client_user_id
            ? `<button onclick="resetMemberPassword(${data.client_user_id}, '${esc(data.name).replace(/'/g,'')}')" class="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-100"><i class="fas fa-key mr-1"></i>Mot de passe</button>
               <button onclick="revokeClientAccess(${data.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100">Révoquer</button>`
            : `<button onclick="createClientAccess(${data.id}, '${esc(data.email || '').replace(/'/g,'')}')" class="text-xs bg-cyan-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-cyan-700">Créer l'accès</button>`}
        </div>
      </div>
    </div>`
}
window.renderClientDetail = renderClientDetail

// Compat : openClientDetail ouvre désormais la page complète
function openClientDetail(id) { closeModal(); viewClient(id) }
window.openClientDetail = openClientDetail

function createClientAccess(clientId, defaultEmail) {
  openModal('Créer un accès client', `
    <form id="ca-form" class="space-y-4">
      <div class="bg-cyan-50 rounded-xl p-3 text-sm text-cyan-800">
        <i class="fas fa-circle-info mr-1"></i> Saisis l'email du client. Un mot de passe sera généré automatiquement : transmets-le lui pour qu'il puisse consulter l'historique de ses piscines.
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Email du client *</label>
        <input id="ca-email" type="email" required value="${esc(defaultEmail || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="client@exemple.fr">
      </div>
      <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">Générer l'accès</button>
    </form>`)
  el('ca-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      const { data } = await API.post(`/clients/${clientId}/account`, { email: el('ca-email').value })
      closeModal()
      showCredentials('Accès client créé', data.email, data.password, 'Transmettez ces identifiants à votre client pour qu\'il accède à son espace.')
      await loadData()
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.createClientAccess = createClientAccess

async function revokeClientAccess(clientId) {
  if (!confirm("Révoquer l'accès de ce client ? Son compte sera supprimé.")) return
  try { await API.delete(`/clients/${clientId}/account`); closeModal(); await loadData(); renderView(); toast('Accès révoqué') }
  catch { toast('Erreur', 'error') }
}
window.revokeClientAccess = revokeClientAccess
