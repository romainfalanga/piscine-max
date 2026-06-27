// ============================================================
// Piscine Max - Frontend SPA
// ============================================================

const API = axios.create({ baseURL: '/api' })
const WEEKDAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const WEEKDAYS_SHORT = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const state = {
  user: null,
  view: 'agenda',       // agenda | clients | pools | pool-detail
  agendaMode: 'calendar', // calendar | map
  agendaScope: 'week',   // day | week
  agendaUser: 'all',     // all | userId
  selectedDate: new Date(),
  clients: [],
  pools: [],
  maintenances: [],
  users: [],
  currentClient: null,
  currentPool: null,
  logs: [],          // logs récents (pour statut "fait")
  routeOptimized: false,
}

// Clé pour identifier une occurrence (entretien + date)
function occKey(maintenanceId, dateIso) { return `${maintenanceId}|${dateIso}` }

// Set des occurrences déjà faites (maintenance_id|date)
function builtDoneSet() {
  const s = new Map()
  for (const l of state.logs) {
    s.set(occKey(l.maintenance_id, l.done_date), l)
  }
  return s
}

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel)
const el = (id) => document.getElementById(id)
const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])))

function toast(msg, type = 'success') {
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-700' }
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' }
  const t = document.createElement('div')
  t.className = `toast ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`
  t.innerHTML = `<i class="fas ${icons[type]}"></i><span>${esc(msg)}</span>`
  el('toast-root').appendChild(t)
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300) }, 3000)
}

function isPro() { return state.user && state.user.role === 'pro' }
function isWorker() { return state.user && state.user.role === 'worker' }
function isClient() { return state.user && state.user.role === 'client' }
// Compat : "admin" historique = pisciniste
function isAdmin() { return isPro() }

// Ouvre l'app de navigation GPS (Google/Apple Maps selon l'appareil)
function openGPS(lat, lng, label) {
  if (!lat || !lng) { toast('Pas de coordonnées GPS pour cette piscine', 'error'); return }
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const url = isIOS
    ? `https://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  window.open(url, '_blank')
}
window.openGPS = openGPS

function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function isoDate(d) {
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10)
}
// Lundi=1 .. Dimanche=7
function jsWeekday(d) { const w = d.getDay(); return w === 0 ? 7 : w }
function startOfWeek(d) { const x = new Date(d); const diff = jsWeekday(x) - 1; x.setDate(x.getDate() - diff); x.setHours(0,0,0,0); return x }

// ============================================================
// MODAL
// ============================================================
function openModal(title, contentHtml, opts = {}) {
  const root = el('modal-root')
  root.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-black/50" onclick="closeModal()"></div>
      <div class="relative bg-white w-full sm:max-w-${opts.size || 'lg'} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col slide-up">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h3 class="text-lg font-bold text-slate-800">${title}</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="overflow-y-auto p-5">${contentHtml}</div>
      </div>
    </div>`
}
function closeModal() { el('modal-root').innerHTML = '' }
window.closeModal = closeModal

// ============================================================
// AUTH
// ============================================================
async function checkAuth() {
  try {
    const { data } = await API.get('/me')
    state.user = data
    return true
  } catch { return false }
}

function renderLogin(mode = 'login') {
  const isSignup = mode === 'signup'
  el('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-600 to-sky-800 p-4">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 fade-in">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-2xl mb-4 shadow-lg">
            <i class="fas fa-water text-white text-4xl"></i>
          </div>
          <h1 class="text-3xl font-extrabold text-slate-800">Piscine Max</h1>
          <p class="text-slate-500 mt-1">${isSignup ? 'Créez votre compte pisciniste' : "Gestion d'entretien de piscines"}</p>
        </div>

        ${isSignup ? `
        <form id="signup-form" class="space-y-3">
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Votre nom *</label>
            <input id="su-name" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Franck Martin">
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Nom de votre société</label>
            <input id="su-company" class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="AquaService Var">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-semibold text-slate-600 mb-1">Email *</label>
              <input type="email" id="su-email" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-600 mb-1">Téléphone</label>
              <input id="su-phone" class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Mot de passe *</label>
            <input type="password" id="su-password" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="••••••••">
          </div>
          <button type="submit" class="w-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-bold py-3 rounded-xl shadow-lg transition">
            <i class="fas fa-user-plus mr-2"></i>Créer mon compte
          </button>
          <p id="login-error" class="text-red-600 text-sm text-center hidden"></p>
        </form>
        <div class="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-500 text-center">
          Déjà un compte ? <button onclick="renderLogin('login')" class="text-cyan-600 font-semibold">Se connecter</button>
        </div>
        ` : `
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Email</label>
            <input type="email" id="login-email" autocomplete="username" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" placeholder="vous@exemple.fr">
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-600 mb-1">Mot de passe</label>
            <input type="password" id="login-password" autocomplete="current-password" required class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" placeholder="••••••••">
          </div>
          <button type="submit" class="w-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-bold py-3 rounded-xl shadow-lg transition">
            <i class="fas fa-right-to-bracket mr-2"></i>Se connecter
          </button>
          <p id="login-error" class="text-red-600 text-sm text-center hidden"></p>
        </form>
        <div class="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-500 text-center">
          Vous êtes pisciniste ? <button onclick="renderLogin('signup')" class="text-cyan-600 font-semibold">Créer un compte</button>
        </div>
        <div class="mt-3 text-xs text-slate-400 text-center">
          Démo · mdp <b>piscine</b> · franck@piscine-max.fr (pisciniste)<br>romain@piscine-max.fr (intervenant) · client1@piscine-max.fr (client)
        </div>
        `}
      </div>
    </div>`

  if (isSignup) {
    el('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const errEl = el('login-error'); errEl.classList.add('hidden')
      try {
        const { data } = await API.post('/signup', {
          name: el('su-name').value, company: el('su-company').value,
          email: el('su-email').value, phone: el('su-phone').value, password: el('su-password').value
        })
        state.user = data
        await boot()
      } catch (err) {
        errEl.textContent = err.response?.data?.error || 'Erreur lors de la création'
        errEl.classList.remove('hidden')
      }
    })
  } else {
    el('login-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const errEl = el('login-error'); errEl.classList.add('hidden')
      try {
        const { data } = await API.post('/login', { email: el('login-email').value, password: el('login-password').value })
        state.user = data
        await boot()
      } catch (err) {
        errEl.textContent = err.response?.data?.error || 'Erreur de connexion'
        errEl.classList.remove('hidden')
      }
    })
  }
}
window.renderLogin = renderLogin

async function logout() {
  await API.post('/logout')
  state.user = null
  renderLogin()
}
window.logout = logout

// ============================================================
// LAYOUT PRINCIPAL
// ============================================================
function renderShell() {
  // Le client a sa propre interface (espace lecture)
  if (isClient()) return renderClientShell()

  const navItems = [
    { id: 'home', icon: 'fa-house', label: 'Accueil' },
    { id: 'agenda', icon: 'fa-calendar-days', label: 'Agenda' },
  ]
  if (isPro()) {
    navItems.push({ id: 'clients', icon: 'fa-users', label: 'Clients' })
    navItems.push({ id: 'pools', icon: 'fa-water', label: 'Piscines' })
    navItems.push({ id: 'tour', icon: 'fa-route', label: 'Tournée' })
    navItems.push({ id: 'stats', icon: 'fa-chart-line', label: 'Stats' })
    navItems.push({ id: 'team', icon: 'fa-user-group', label: 'Équipe' })
  } else {
    navItems.push({ id: 'pools', icon: 'fa-water', label: 'Mes piscines' })
    navItems.push({ id: 'tour', icon: 'fa-route', label: 'Tournée' })
    navItems.push({ id: 'team', icon: 'fa-user-group', label: 'Mes pros' })
  }

  el('app').innerHTML = `
    <div class="min-h-screen flex flex-col">
      <!-- Header -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-lg flex items-center justify-center">
              <i class="fas fa-water text-white"></i>
            </div>
            <span class="font-extrabold text-lg text-slate-800">Piscine Max</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="hidden sm:flex items-center gap-2 text-sm">
              <span class="w-2.5 h-2.5 rounded-full" style="background:${state.user.color || '#0891b2'}"></span>
              <b>${esc(state.user.name)}</b>
              <span class="text-xs px-2 py-0.5 rounded-full ${isPro() ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'}">${isPro() ? 'Pisciniste' : 'Intervenant'}</span>
            </span>
            <button onclick="openPasswordForm()" class="text-slate-400 hover:text-cyan-600 px-2 py-1" title="Changer mon mot de passe"><i class="fas fa-key"></i></button>
            <button onclick="logout()" class="text-slate-400 hover:text-red-500 px-2 py-1" title="Déconnexion"><i class="fas fa-right-from-bracket"></i></button>
          </div>
        </div>
      </header>

      <!-- Nav desktop -->
      <nav class="bg-white border-b border-slate-200 hidden sm:block">
        <div class="max-w-7xl mx-auto px-4 flex gap-1">
          ${navItems.map(n => `
            <button onclick="navigate('${n.id}')" class="nav-btn px-4 py-3 text-sm font-semibold border-b-2 transition ${state.view === n.id ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">
              <i class="fas ${n.icon} mr-1.5"></i>${n.label}
            </button>`).join('')}
        </div>
      </nav>

      <!-- Contenu -->
      <main id="main-content" class="flex-1 max-w-7xl w-full mx-auto px-4 py-5 pb-24 sm:pb-5"></main>

      <!-- Nav mobile -->
      <nav class="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 flex">
        ${navItems.map(n => `
          <button onclick="navigate('${n.id}')" class="flex-1 py-2.5 flex flex-col items-center gap-0.5 ${state.view === n.id ? 'text-cyan-600' : 'text-slate-400'}">
            <i class="fas ${n.icon} text-lg"></i><span class="text-[10px] font-semibold">${n.label}</span>
          </button>`).join('')}
      </nav>
    </div>`
}

function navigate(view) {
  state.view = view
  renderShell()
  renderView()
}
window.navigate = navigate

function renderView() {
  const c = el('main-content')
  if (!c) return
  if (isClient()) { renderClientView(c); return }
  if (state.view === 'home') renderHome(c)
  else if (state.view === 'agenda') renderAgenda(c)
  else if (state.view === 'clients') renderClients(c)
  else if (state.view === 'pools') renderPools(c)
  else if (state.view === 'pool-detail') renderPoolDetail(c)
  else if (state.view === 'team') renderTeam(c)
  else if (state.view === 'stats') renderStats(c)
  else if (state.view === 'tour') renderTour(c)
}

// ============================================================
// BOOT
// ============================================================
async function loadData() {
  if (isClient()) {
    const { data } = await API.get('/my/pools')
    state.pools = data
    return
  }
  const reqs = [API.get('/maintenances'), API.get('/pools'), API.get('/users')]
  if (isPro()) reqs.push(API.get('/clients'))
  const res = await Promise.all(reqs)
  state.maintenances = res[0].data
  state.pools = res[1].data
  state.users = res[2].data
  if (isPro()) state.clients = res[3].data
  await loadLogs()
  await loadAlerts()
}

// Charge les logs sur une fenêtre de +/- 5 semaines autour de la date courante
async function loadLogs() {
  try {
    const center = state.selectedDate || new Date()
    const from = new Date(center); from.setDate(from.getDate() - 35)
    const to = new Date(center); to.setDate(to.getDate() + 35)
    const { data } = await API.get(`/logs?from=${isoDate(from)}&to=${isoDate(to)}`)
    state.logs = data
  } catch { state.logs = [] }
}
window.loadLogs = loadLogs

async function boot() {
  state.view = isClient() ? 'client-home' : 'home'
  renderShell()
  el('main-content').innerHTML = '<div class="text-center py-20 text-slate-400"><i class="fas fa-spinner fa-spin text-3xl"></i><p class="mt-3">Chargement...</p></div>'
  try {
    await loadData()
  } catch (e) { toast('Erreur de chargement des données', 'error') }
  renderView()
}

// ============================================================
// VUE ACCUEIL (dashboard)
// ============================================================
function renderHome(c) {
  const today = new Date()
  const todayItems = occurrencesForDate(today)
  const doneSet = builtDoneSet()
  const todayIso = isoDate(today)
  const doneCount = todayItems.filter(m => doneSet.has(occKey(m.id, todayIso))).length

  // Prochains jours avec entretiens (7 jours)
  let upcoming = []
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const items = occurrencesForDate(d)
    if (items.length) upcoming.push({ date: d, items })
  }

  const stat = (icon, val, label, color) => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white" style="background:${color}"><i class="fas ${icon}"></i></div>
      <div><div class="text-2xl font-extrabold text-slate-800 leading-none">${val}</div><div class="text-xs text-slate-400 mt-1">${label}</div></div>
    </div>`

  c.innerHTML = `
    <div class="mb-5">
      <h2 class="text-2xl font-extrabold text-slate-800">Bonjour ${esc(state.user.name)} 👋</h2>
      <p class="text-slate-400 capitalize">${fmtDate(today)}</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${stat('fa-list-check', `${doneCount}/${todayItems.length}`, "Aujourd'hui", '#0891b2')}
      ${stat('fa-water', state.pools.length, isAdmin() ? 'Piscines' : 'Mes piscines', '#16a34a')}
      ${isAdmin() ? stat('fa-users', state.clients.length, 'Clients', '#8b5cf6') : stat('fa-route', todayItems.length, 'Arrêts du jour', '#8b5cf6')}
      ${stat('fa-calendar-check', state.maintenances.length, 'Entretiens planifiés', '#f59e0b')}
    </div>

    <!-- Centre d'alertes -->
    ${alertsCardHtml()}

    <!-- Météo (1ère piscine géolocalisée) -->
    <div id="home-weather"></div>

    <!-- Aujourd'hui -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-slate-700"><i class="fas fa-sun text-amber-400 mr-2"></i>Au programme aujourd'hui</h3>
        <button onclick="navigate('agenda')" class="text-cyan-600 text-sm font-semibold">Voir l'agenda <i class="fas fa-arrow-right ml-1 text-xs"></i></button>
      </div>
      ${todayItems.length ? `<div class="space-y-2">${todayItems.map(m => {
        const done = doneSet.has(occKey(m.id, todayIso))
        return homeItem(m, done)
      }).join('')}</div>` : '<p class="text-sm text-slate-400 py-4 text-center"><i class="fas fa-mug-hot mr-1"></i>Aucun entretien prévu aujourd\'hui. Repos !</p>'}
    </div>

    <!-- À venir -->
    ${upcoming.length ? `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-forward text-cyan-500 mr-2"></i>Les prochains jours</h3>
      <div class="space-y-3">
        ${upcoming.map(day => `
          <div>
            <div class="text-xs font-bold text-slate-400 uppercase mb-1 capitalize">${day.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} · ${day.items.length}</div>
            <div class="flex flex-wrap gap-1.5">
              ${day.items.map(m => `<span onclick="viewPool(${m.pool_id})" class="cursor-pointer text-xs px-2 py-1 rounded-lg" style="background:${(m.assigned_color||'#94a3b8')}18;border-left:3px solid ${m.assigned_color||'#94a3b8'}">${m.time ? esc(m.time)+' ' : ''}${esc(m.pool_label)}</span>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}`

  // Météo de la 1ère piscine géolocalisée (asynchrone, non bloquant)
  const geoPool = (state.pools || []).find(p => p.lat && p.lng)
  if (geoPool && typeof weatherWidgetHtml === 'function') {
    weatherWidgetHtml(geoPool.lat, geoPool.lng).then(html => {
      const box = el('home-weather')
      if (box && html) box.innerHTML = `<div class="mb-5">${html}</div>`
    })
  }
}

function homeItem(m, done) {
  const color = m.assigned_color || '#94a3b8'
  return `
    <div class="flex items-center gap-3 p-3 rounded-xl border ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100'}">
      <div class="w-1.5 self-stretch rounded" style="background:${color}"></div>
      <div class="flex-1 min-w-0 cursor-pointer" onclick="viewPool(${m.pool_id})">
        <div class="font-bold text-slate-800 truncate">${m.time ? `<span class="text-slate-500 font-semibold">${esc(m.time)}</span> · ` : ''}${esc(m.pool_label)}</div>
        <div class="text-xs text-slate-400 truncate">${esc(m.client_name)}${m.pool_address ? ' · ' + esc(m.pool_address) : ''}</div>
      </div>
      ${m.lat && m.lng ? `<button onclick="openGPS(${m.lat}, ${m.lng})" class="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100" title="Y aller"><i class="fas fa-diamond-turn-right"></i></button>` : ''}
      ${done ? '<span class="text-emerald-600 text-xl"><i class="fas fa-circle-check"></i></span>' : `<button onclick="openLogForm(${m.id}, '${esc(m.pool_label).replace(/'/g,'')}')" class="w-9 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" title="Marquer fait"><i class="fas fa-check"></i></button>`}
    </div>`
}

// ============================================================
// INIT
// ============================================================
;(async function init() {
  const ok = await checkAuth()
  if (ok) await boot()
  else renderLogin()
})()
