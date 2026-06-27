// ============================================================
// VUE ÉQUIPE : mes intervenants + de qui je suis intervenant
// ============================================================
async function renderTeam(c) {
  c.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>`
  let team
  try { team = (await API.get('/team')).data } catch { team = { workers: [], employers: [] } }

  const workersHtml = team.workers.length ? team.workers.map(w => `
    <div class="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold" style="background:${w.color || '#16a34a'}">${esc(w.name.charAt(0).toUpperCase())}</div>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-slate-800 truncate">${esc(w.name)}</div>
        <div class="text-xs text-slate-400 truncate">${esc(w.email)}${w.phone ? ' · ' + esc(w.phone) : ''}</div>
      </div>
      <button onclick="resetMemberPassword(${w.id}, '${esc(w.name).replace(/'/g,'')}')" class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100" title="Réinitialiser le mot de passe"><i class="fas fa-key"></i></button>
      <button onclick="detachWorker(${w.id}, '${esc(w.name).replace(/'/g,'')}')" class="w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Retirer de l'équipe"><i class="fas fa-user-minus"></i></button>
    </div>`).join('') : '<p class="text-sm text-slate-400 py-6 text-center"><i class="fas fa-user-group mr-1"></i>Aucun intervenant. Ajoute-en un pour déléguer tes entretiens.</p>'

  const employersHtml = team.employers.length ? team.employers.map(e => `
    <div class="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold" style="background:${e.color || '#0891b2'}">${esc(e.name.charAt(0).toUpperCase())}</div>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-slate-800 truncate">${esc(e.company || e.name)}</div>
        <div class="text-xs text-slate-400 truncate">${esc(e.name)}${e.phone ? ' · ' + esc(e.phone) : ''}</div>
      </div>
      <span class="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-semibold"><i class="fas fa-handshake mr-1"></i>Pro</span>
    </div>`).join('') : '<p class="text-sm text-slate-400 py-6 text-center">Tu ne travailles pour aucun autre pisciniste pour le moment.</p>'

  c.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-2xl font-extrabold text-slate-800"><i class="fas fa-user-group text-cyan-600 mr-2"></i>Mon équipe</h2>
      ${isPro() ? `<button onclick="openWorkerForm()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-2">
        <i class="fas fa-user-plus"></i><span class="hidden sm:inline">Ajouter un intervenant</span></button>` : ''}
    </div>

    ${isPro() ? `
    <section class="mb-7">
      <h3 class="font-bold text-slate-600 mb-3 text-sm uppercase tracking-wide"><i class="fas fa-people-carry-box text-emerald-500 mr-1"></i>Mes intervenants</h3>
      <div class="grid gap-3 sm:grid-cols-2">${workersHtml}</div>
    </section>` : ''}

    <section>
      <h3 class="font-bold text-slate-600 mb-3 text-sm uppercase tracking-wide"><i class="fas fa-briefcase text-cyan-500 mr-1"></i>Je travaille pour</h3>
      <div class="grid gap-3 sm:grid-cols-2">${employersHtml}</div>
    </section>`
}
window.renderTeam = renderTeam

function openWorkerForm() {
  openModal('Ajouter un intervenant', `
    <form id="worker-form" class="space-y-4">
      <div class="bg-cyan-50 rounded-xl p-3 text-sm text-cyan-800">
        <i class="fas fa-circle-info mr-1"></i> Saisis l'email de l'intervenant. S'il a déjà un compte, il sera rattaché à ton équipe. Sinon, un nouveau compte sera créé avec un mot de passe généré que tu pourras lui transmettre.
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Email *</label>
        <input id="wf-email" type="email" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="intervenant@exemple.fr">
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Nom (si nouveau compte)</label>
        <input id="wf-name" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Romain Dupont">
      </div>
      <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">Ajouter</button>
    </form>`)

  el('worker-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      const { data } = await API.post('/team/workers', { email: el('wf-email').value, name: el('wf-name').value })
      closeModal()
      if (data.generated_password) {
        showCredentials('Intervenant créé', data.email, data.generated_password, 'Transmets ces identifiants à ton intervenant.')
      } else {
        toast(data.attached ? 'Intervenant rattaché à ton équipe' : 'Intervenant ajouté')
      }
      await loadData(); renderView()
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openWorkerForm = openWorkerForm

async function detachWorker(id, name) {
  if (!confirm(`Retirer ${name} de ton équipe ? (son compte n'est pas supprimé)`)) return
  try { await API.delete(`/team/workers/${id}`); await loadData(); renderView(); toast('Intervenant retiré') }
  catch { toast('Erreur', 'error') }
}
window.detachWorker = detachWorker

async function resetMemberPassword(id, name) {
  if (!confirm(`Générer un nouveau mot de passe pour ${name} ?`)) return
  try {
    const { data } = await API.post(`/team/reset-password/${id}`)
    showCredentials('Nouveau mot de passe', null, data.new_password, `Transmets ce nouveau mot de passe à ${name}.`)
  } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
}
window.resetMemberPassword = resetMemberPassword

// Affiche des identifiants générés avec bouton "copier"
function showCredentials(title, email, password, hint) {
  openModal(title, `
    <div class="space-y-4">
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
        <i class="fas fa-circle-check mr-1"></i> ${esc(hint || '')}
      </div>
      ${email ? `<div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Email</label>
        <div class="flex gap-2">
          <input id="cred-email" readonly value="${esc(email)}" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm">
          <button onclick="copyVal('cred-email')" class="px-3 rounded-lg bg-slate-100 hover:bg-slate-200"><i class="fas fa-copy"></i></button>
        </div>
      </div>` : ''}
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Mot de passe</label>
        <div class="flex gap-2">
          <input id="cred-pwd" readonly value="${esc(password)}" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm font-bold">
          <button onclick="copyVal('cred-pwd')" class="px-3 rounded-lg bg-slate-100 hover:bg-slate-200"><i class="fas fa-copy"></i></button>
        </div>
      </div>
      <p class="text-xs text-slate-400"><i class="fas fa-triangle-exclamation mr-1"></i>Note ce mot de passe maintenant, il ne sera plus affiché.</p>
      <button onclick="closeModal()" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">J'ai noté</button>
    </div>`)
}
window.showCredentials = showCredentials

function copyVal(id) {
  const inp = el(id)
  inp.select()
  navigator.clipboard.writeText(inp.value).then(() => toast('Copié !', 'info')).catch(() => {})
}
window.copyVal = copyVal
