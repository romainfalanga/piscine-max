// ============================================================
// ESPACE CLIENT (lecture seule) — interface dédiée
// ============================================================
function renderClientShell() {
  el('app').innerHTML = `
    <div class="min-h-screen flex flex-col bg-slate-50">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div class="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-lg flex items-center justify-center"><i class="fas fa-water text-white"></i></div>
            <span class="font-extrabold text-lg text-slate-800">Mon espace piscine</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="hidden sm:flex items-center gap-2 text-sm"><b>${esc(state.user.name)}</b>
              <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Client</span></span>
            <button onclick="openPasswordForm()" class="text-slate-400 hover:text-cyan-600 px-2 py-1" title="Changer mon mot de passe"><i class="fas fa-key"></i></button>
            <button onclick="logout()" class="text-slate-400 hover:text-red-500 px-2 py-1" title="Déconnexion"><i class="fas fa-right-from-bracket"></i></button>
          </div>
        </div>
      </header>
      <main id="main-content" class="flex-1 max-w-3xl w-full mx-auto px-4 py-5"></main>
    </div>`
}
window.renderClientShell = renderClientShell

function renderClientView(c) {
  if (state.view === 'client-pool' && state.currentPool) return renderClientPool(c, state.currentPool)
  renderClientHome(c)
}
window.renderClientView = renderClientView

function renderClientHome(c) {
  const pools = state.pools || []
  const pro = pools[0]
  c.innerHTML = `
    <div class="mb-5">
      <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800">Bonjour ${esc(state.user.name)} 👋</h2>
      <p class="text-slate-400">Suivez l'entretien de ${pools.length > 1 ? 'vos piscines' : 'votre piscine'}</p>
    </div>

    ${pro && (pro.pro_company || pro.pro_name) ? `
    <div class="bg-gradient-to-br from-cyan-600 to-sky-700 rounded-2xl shadow-sm p-5 mb-5 text-white">
      <div class="text-xs uppercase tracking-wide opacity-80 mb-1">Votre pisciniste</div>
      <div class="font-bold text-lg">${esc(pro.pro_company || pro.pro_name)}</div>
      ${pro.pro_phone ? `<a href="tel:${esc(pro.pro_phone)}" class="inline-flex items-center gap-2 mt-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-semibold"><i class="fas fa-phone"></i>${esc(pro.pro_phone)}</a>` : ''}
    </div>` : ''}

    ${pools.length ? `<div class="space-y-3">${pools.map(p => clientPoolCard(p)).join('')}</div>`
      : '<div class="text-center py-16 text-slate-400"><i class="fas fa-water text-4xl mb-3"></i><p>Aucune piscine associée à votre compte pour le moment.</p></div>'}`
}

function clientPoolCard(p) {
  return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 cursor-pointer hover:shadow-md transition" onclick="viewClientPool(${p.id})">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center text-xl"><i class="fas fa-water"></i></div>
          <div>
            <div class="font-bold text-slate-800 text-lg">${esc(p.label)}</div>
            <div class="text-xs text-slate-400">${p.volume_m3 ? p.volume_m3 + ' m³ · ' : ''}${esc(p.treatment_type || 'Traitement non précisé')}</div>
          </div>
        </div>
        <i class="fas fa-chevron-right text-slate-300"></i>
      </div>
    </div>`
}

async function viewClientPool(id) {
  const pool = (state.pools || []).find(p => p.id === id)
  if (!pool) return
  state.currentPool = pool
  state.view = 'client-pool'
  const c = el('main-content')
  c.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>`
  try {
    const { data } = await API.get(`/my/pools/${id}/history`)
    pool._history = data.logs
    pool._photos = data.photos
  } catch { pool._history = []; pool._photos = [] }
  renderClientPool(c, pool)
}
window.viewClientPool = viewClientPool

function reading(label, val, unit, ok) {
  if (val == null) return ''
  const color = ok === false ? 'text-red-600 bg-red-50' : ok === true ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 bg-slate-50'
  return `<div class="rounded-lg px-2.5 py-1.5 text-center ${color}"><div class="text-[10px] opacity-70">${label}</div><div class="font-bold text-sm">${val}${unit || ''}</div></div>`
}

function renderClientPool(c, pool) {
  const logs = (pool._history || []).filter(l => l.status === 'done')
  const photosByLog = {}
  for (const ph of (pool._photos || [])) { (photosByLog[ph.log_id] = photosByLog[ph.log_id] || []).push(ph) }
  const last = logs[0]

  const inRange = (v, min, max) => (v == null || min == null || max == null) ? null : (v >= min && v <= max)

  c.innerHTML = `
    <button onclick="backToClientHome()" class="text-cyan-600 font-semibold mb-4 flex items-center gap-1"><i class="fas fa-arrow-left"></i>Mes piscines</button>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
      <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800">${esc(pool.label)}</h2>
      <div class="text-sm text-slate-400 mt-1">${pool.volume_m3 ? pool.volume_m3 + ' m³ · ' : ''}${esc(pool.pool_type || '')} ${esc(pool.shape || '')} · ${esc(pool.treatment_type || '')}</div>
      ${last ? `
        <div class="mt-4 flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2">
          <i class="fas fa-circle-check"></i> Dernier passage le <b>${fmtShort(last.done_date)}</b>${last.done_by_name ? ' par ' + esc(last.done_by_name) : ''}
        </div>` : '<div class="mt-4 text-sm text-slate-400">Aucun passage enregistré pour le moment.</div>'}
    </div>

    ${pool.routine_client ? `
    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
      <h3 class="font-bold text-amber-800 mb-2"><i class="fas fa-lightbulb mr-2"></i>Vos conseils d'entretien</h3>
      <p class="text-sm text-amber-900 whitespace-pre-line">${esc(pool.routine_client)}</p>
    </div>` : ''}

    <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-clock-rotate-left text-cyan-500 mr-2"></i>Historique des passages</h3>
    ${logs.length ? `<div class="space-y-3">${logs.map(l => {
      const phOk = inRange(l.ph, pool.ideal_ph_min, pool.ideal_ph_max)
      const clOk = inRange(l.chlorine, pool.ideal_chlorine_min, pool.ideal_chlorine_max)
      const photos = photosByLog[l.id] || []
      return `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold text-slate-800 capitalize">${fmtShort(l.done_date)}</div>
          ${l.done_by_name ? `<span class="text-xs text-slate-400"><i class="fas fa-user mr-1"></i>${esc(l.done_by_name)}</span>` : ''}
        </div>
        ${(l.ph != null || l.chlorine != null || l.salt != null || l.water_temp != null) ? `
        <div class="grid grid-cols-4 gap-1.5 mb-2">
          ${reading('pH', l.ph, '', phOk)}
          ${reading('Chlore', l.chlorine, '', clOk)}
          ${reading('Sel', l.salt, '', null)}
          ${reading('Temp.', l.water_temp, '°', null)}
        </div>` : ''}
        ${l.products_added ? `<div class="text-sm text-slate-600 mb-1"><i class="fas fa-flask text-cyan-400 mr-1"></i>${esc(l.products_added)}</div>` : ''}
        ${l.notes ? `<div class="text-sm text-slate-500 italic"><i class="fas fa-comment text-slate-300 mr-1"></i>${esc(l.notes)}</div>` : ''}
        ${photos.length ? `<div class="flex gap-2 mt-2 flex-wrap">${photos.map(ph => `<img src="${ph.url}" class="w-20 h-20 object-cover rounded-lg cursor-pointer" onclick="openPhotoLightbox('${ph.url}')">`).join('')}</div>` : ''}
      </div>`
    }).join('')}</div>` : '<p class="text-sm text-slate-400 py-6 text-center">Pas encore de passage enregistré.</p>'}`
}

function backToClientHome() {
  state.view = 'client-home'
  state.currentPool = null
  renderClientHome(el('main-content'))
}
window.backToClientHome = backToClientHome

function fmtShort(iso) {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

function openPhotoLightbox(url) {
  const root = el('modal-root')
  root.innerHTML = `<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onclick="closeModal()">
    <img src="${url}" class="max-h-[90vh] max-w-full rounded-xl shadow-2xl">
  </div>`
}
window.openPhotoLightbox = openPhotoLightbox
