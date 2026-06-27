// ============================================================
// VUE CLIENTS (admin)
// ============================================================
function renderClients(c) {
  c.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-2xl font-extrabold text-slate-800"><i class="fas fa-users text-cyan-600 mr-2"></i>Clients</h2>
      <button onclick="openClientForm()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-2">
        <i class="fas fa-plus"></i><span class="hidden sm:inline">Nouveau client</span>
      </button>
    </div>
    <div id="clients-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>`

  const list = el('clients-list')
  if (!state.clients.length) {
    list.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400"><i class="fas fa-user-plus text-4xl mb-3"></i><p>Aucun client. Crée ton premier client !</p></div>`
    return
  }
  list.innerHTML = state.clients.map(cl => `
    <div class="pool-card bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer" onclick="openClientDetail(${cl.id})">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-cyan-100 text-cyan-700 rounded-xl flex items-center justify-center font-bold text-lg">${esc(cl.name.charAt(0).toUpperCase())}</div>
          <div>
            <div class="font-bold text-slate-800">${esc(cl.name)}</div>
            <div class="text-xs text-slate-400">${esc(cl.phone || 'Pas de téléphone')}</div>
          </div>
        </div>
        <span class="text-xs bg-sky-50 text-sky-600 px-2 py-1 rounded-full font-semibold whitespace-nowrap"><i class="fas fa-water mr-1"></i>${cl.pool_count}</span>
      </div>
      ${cl.notes ? `<p class="text-sm text-slate-500 mt-3 line-clamp-2">${esc(cl.notes)}</p>` : ''}
    </div>`).join('')
}

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

async function openClientDetail(id) {
  const { data } = await API.get(`/clients/${id}`)
  const poolsHtml = data.pools.length ? data.pools.map(p => `
    <div class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-100" onclick="closeModal(); viewPool(${p.id})">
      <div class="flex items-center gap-2"><i class="fas fa-water text-cyan-500"></i><span class="font-semibold text-sm">${esc(p.label)}</span></div>
      <i class="fas fa-chevron-right text-slate-300 text-xs"></i>
    </div>`).join('') : '<p class="text-sm text-slate-400 text-center py-3">Aucune piscine</p>'

  openModal(esc(data.name), `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="bg-slate-50 rounded-xl p-3"><div class="text-xs text-slate-400 mb-0.5">Téléphone</div><div class="font-semibold">${esc(data.phone || '—')}</div></div>
        <div class="bg-slate-50 rounded-xl p-3"><div class="text-xs text-slate-400 mb-0.5">Email</div><div class="font-semibold truncate">${esc(data.email || '—')}</div></div>
      </div>
      ${data.notes ? `<div class="bg-amber-50 rounded-xl p-3 text-sm"><i class="fas fa-note-sticky text-amber-500 mr-1"></i>${esc(data.notes)}</div>` : ''}

      <!-- Accès espace client -->
      <div class="bg-slate-50 rounded-xl p-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-sm text-slate-700"><i class="fas fa-user-lock text-cyan-500 mr-1"></i>Accès espace client</div>
            <div class="text-xs text-slate-400 mt-0.5">${data.client_user_id ? 'Actif · ' + esc(data.client_account_email || '') : "Le client peut consulter l'historique de ses piscines"}</div>
          </div>
          ${data.client_user_id
            ? `<button onclick="revokeClientAccess(${data.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100">Révoquer</button>`
            : `<button onclick="createClientAccess(${data.id}, '${esc(data.email || '').replace(/'/g,'')}')" class="text-xs bg-cyan-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-cyan-700">Créer l'accès</button>`}
        </div>
        ${data.client_user_id ? `<button onclick="resetMemberPassword(${data.client_user_id}, '${esc(data.name).replace(/'/g,'')}')" class="text-xs text-amber-600 mt-2"><i class="fas fa-key mr-1"></i>Réinitialiser son mot de passe</button>` : ''}
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold text-slate-700">Piscines (${data.pools.length})</h4>
          <button onclick="closeModal(); openPoolForm(null, ${data.id})" class="text-cyan-600 text-sm font-semibold"><i class="fas fa-plus mr-1"></i>Ajouter</button>
        </div>
        <div class="space-y-2">${poolsHtml}</div>
      </div>
      <button onclick="openClientForm(${JSON.stringify(data).replace(/"/g,'&quot;')})" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl"><i class="fas fa-pen mr-1"></i>Modifier le client</button>
    </div>`)
}
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
