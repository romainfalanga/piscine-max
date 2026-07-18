// ============================================================
// VUE PISCINISTE : bibliothèque de PROCÉDURES (modes opératoires pas à pas,
// ex. changer un préfiltre, hiverner une piscine, choc chlore...) et
// d'INFORMATIONS (fiches de connaissances de référence : normes, valeurs
// idéales de l'eau, formules, réglementation, glossaire...).
// ============================================================
const PROCEDURE_CATEGORIES = [
  'Analyse & routine', 'Filtration', "Traitement de l'eau", 'Nettoyage', 'Hivernage / Estivage',
  'Dépannage matériel', 'Sécurité', 'Mise en service',
]
const INFORMATION_CATEGORIES = [
  "Chimie de l'eau", 'Équipements', 'Algues & pathologies de l\'eau',
  'Calculs & formules', 'Réglementation & sécurité', 'Calendrier & organisation', 'Glossaire',
]
const TYPE_LABELS = { procedure: 'Procédure', information: 'Information' }
const TYPE_ICONS = { procedure: 'fa-screwdriver-wrench', information: 'fa-circle-info' }

const procState = { query: '', category: '', type: 'important', items: [], loaded: false }

async function renderProcedures(c) {
  c.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>`
  try { procState.items = (await API.get('/procedures')).data; procState.loaded = true }
  catch { c.innerHTML = '<p class="text-red-500 p-6">Erreur de chargement.</p>'; return }

  c.innerHTML = `
    <div class="flex items-center justify-between mb-1 gap-2">
      <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800"><i class="fas fa-user-gear text-cyan-600 mr-2"></i>Pisciniste</h2>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="navigate('assistant')" class="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-xl shadow flex items-center gap-2" title="Assistant IA">
          <i class="fas fa-robot"></i><span class="hidden sm:inline">Assistant IA</span>
        </button>
        <button onclick="navigate('quiz')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-xl shadow flex items-center gap-2" title="Jeu du Code du pisciniste">
          <i class="fas fa-graduation-cap"></i><span class="hidden sm:inline">Code du pisciniste</span>
        </button>
        <button onclick="openProcedureForm()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-xl shadow flex items-center gap-2">
          <i class="fas fa-plus"></i><span class="hidden sm:inline">Nouvelle fiche</span>
        </button>
      </div>
    </div>
    <p class="text-xs sm:text-sm text-slate-400 mb-3">Le centre de connaissances du métier : <b>procédures</b> pas à pas et <b>informations</b> de référence. <b>Important</b> réunit l'essentiel à connaître sur le terrain.</p>

    <div id="proc-filterbar" class="mb-1">
      <div id="proc-type-tabs" class="flex bg-white rounded-xl border border-slate-200 p-1 mb-2 shadow-sm"></div>
      <div class="relative mb-2">
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <input id="proc-search" oninput="filterProcedures(this.value)" value="${esc(procState.query)}" placeholder="Rechercher (titre, mot-clé, contenu...)" class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-sm">
      </div>
      <div id="proc-categories" class="flex gap-1.5 overflow-x-auto pisc-scroll pb-0.5"></div>
    </div>

    <div id="procedures-list" class="pt-3"></div>`

  renderProcedureTypeTabs()
  renderProcedureCategoryChips()
  renderProceduresList()
}
window.renderProcedures = renderProcedures

function renderProcedureTypeTabs() {
  const box = el('proc-type-tabs')
  if (!box) return
  const countFor = (t) => t === 'important' ? procState.items.filter(p => !!p.important).length : procState.items.filter(p => (p.type || 'procedure') === t).length
  const tab = (label, value, icon) => `
    <button onclick="filterProceduresByType('${value}')" class="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${procState.type === value ? (value === 'important' ? 'bg-amber-500 text-white shadow' : 'bg-cyan-600 text-white shadow') : 'text-slate-500 hover:bg-slate-50'}">
      <i class="fas ${icon} text-[11px] sm:text-xs"></i><span>${label}</span><span class="text-[10px] font-normal ${procState.type === value ? 'text-white/80' : 'text-slate-400'}">${countFor(value)}</span>
    </button>`
  box.innerHTML = tab('Important', 'important', 'fa-star') + tab('Procédure', 'procedure', TYPE_ICONS.procedure) + tab('Information', 'information', TYPE_ICONS.information)
}

function filterProceduresByType(type) {
  procState.type = type
  procState.category = ''
  renderProcedureTypeTabs()
  renderProcedureCategoryChips()
  renderProceduresList()
}
window.filterProceduresByType = filterProceduresByType

function procedureScopeForType() {
  if (procState.type === 'important') return procState.items.filter(p => !!p.important)
  return procState.items.filter(p => (p.type || 'procedure') === procState.type)
}

function categoryOrderForType() {
  return procState.type === 'information' ? INFORMATION_CATEGORIES : procState.type === 'procedure' ? PROCEDURE_CATEGORIES : [...PROCEDURE_CATEGORIES, ...INFORMATION_CATEGORIES]
}

function renderProcedureCategoryChips() {
  const box = el('proc-categories')
  if (!box) return
  const scope = procedureScopeForType()
  const present = new Set(scope.map(p => p.category).filter(Boolean))
  const cats = categoryOrderForType().filter(cat => present.has(cat))
  const chip = (label, value, count) => `
    <button onclick="filterProceduresByCategory('${value.replace(/'/g, "\\'")}')" class="shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border transition ${procState.category === value ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200 hover:border-cyan-300'}">${esc(label)}${count != null ? ` <span class="opacity-60">${count}</span>` : ''}</button>`
  box.innerHTML = chip('Toutes', '') + cats.map(cat => chip(cat, cat, scope.filter(p => p.category === cat).length)).join('')
}

function filterProceduresByCategory(cat) {
  procState.category = cat
  renderProcedureCategoryChips()
  renderProceduresList()
}
window.filterProceduresByCategory = filterProceduresByCategory

function filterProcedures(query) {
  procState.query = query
  renderProceduresList()
}
window.filterProcedures = filterProcedures

function procedureCardHtml(p) {
  const type = p.type || 'procedure'
  const badgeColor = type === 'information' ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-50 text-cyan-700'
  const accent = type === 'information' ? 'border-l-indigo-300' : 'border-l-cyan-300'
  return `
    <div class="pool-card bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 ${accent} p-4 cursor-pointer" onclick="openProcedureView(${p.id})">
      <div class="font-bold text-slate-800 leading-tight mb-1.5">${p.important ? '<i class="fas fa-star text-amber-400 text-xs mr-1" title="Fiche importante"></i>' : ''}<i class="fas ${TYPE_ICONS[type]} text-xs ${type === 'information' ? 'text-indigo-400' : 'text-cyan-500'} mr-1.5"></i>${esc(p.title)}</div>
      ${p.summary ? `<p class="text-sm text-slate-500 line-clamp-2 mb-1.5">${esc(p.summary)}</p>` : ''}
      <div class="flex items-center justify-between text-[11px] text-slate-400">
        <span class="${badgeColor} px-2 py-0.5 rounded-full font-semibold">${TYPE_LABELS[type]}</span>
        <span>${p.updated_at ? new Date(p.updated_at).toLocaleDateString('fr-FR') : ''}</span>
      </div>
    </div>`
}

function renderProceduresList() {
  const list = el('procedures-list')
  if (!list) return
  if (!procState.items.length) {
    list.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-user-gear text-4xl mb-3"></i><p>Aucune fiche. Crée la première procédure ou information de ton équipe !</p></div>`
    return
  }

  let items = procedureScopeForType()
  if (procState.category) items = items.filter(p => p.category === procState.category)
  if (procState.query) {
    const q = procState.query.toLowerCase()
    items = items.filter(p => [p.title, p.summary, p.content, p.tags, p.category].some(v => (v || '').toLowerCase().includes(q)))
  }

  if (!items.length) {
    if (procState.type === 'important' && !procState.category && !procState.query) {
      list.innerHTML = `<div class="text-center py-12 text-slate-400"><i class="fas fa-star text-3xl mb-2"></i><p class="text-sm">Aucune fiche marquée importante pour l'instant.</p><p class="text-xs mt-1">Ouvre une fiche dans « Procédure » ou « Information » et coche « Fiche importante » pour la retrouver ici.</p></div>`
    } else {
      list.innerHTML = `<div class="text-center py-12 text-slate-400"><i class="fas fa-magnifying-glass text-3xl mb-2"></i><p class="text-sm">Aucun résultat</p></div>`
    }
    return
  }

  // Navigation libre (pas de recherche ni de catégorie choisie) : on regroupe par
  // catégorie façon "sommaire" pour éviter le mur de fiches indifférenciées.
  // Dès qu'une recherche ou une catégorie précise est active, la grille reste plate.
  if (!procState.category && !procState.query) {
    const order = categoryOrderForType()
    const byCat = new Map()
    for (const p of items) {
      const cat = p.category || 'Autre'
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat).push(p)
    }
    const cats = [...byCat.keys()].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
    list.innerHTML = cats.map(cat => `
      <div class="mb-5">
        <button onclick="filterProceduresByCategory('${cat.replace(/'/g, "\\'")}')" class="flex items-center gap-2 mb-2 group">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide group-hover:text-cyan-600">${esc(cat)}</h3>
          <span class="text-[11px] text-slate-400">${byCat.get(cat).length}</span>
          <i class="fas fa-chevron-right text-[9px] text-slate-300 group-hover:text-cyan-500"></i>
        </button>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${byCat.get(cat).map(procedureCardHtml).join('')}</div>
      </div>`).join('')
    return
  }

  list.innerHTML = `<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${items.map(procedureCardHtml).join('')}</div>`
}

// ---------- Checklist des étapes (procédures uniquement) ----------
// Persistée en localStorage : on coche au fil de l'intervention pour savoir où
// on en est, sans backend (progression locale à l'appareil de l'utilisateur).
const _procStepsCache = {}

function parseProcedureSteps(content) {
  if (!content) return null
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const steps = []
  for (const l of lines) {
    const m = l.match(/^(\d+)\.\s+(.*)$/)
    if (!m) return null
    steps.push(m[2])
  }
  return steps.length > 1 ? steps : null
}

function checklistKey(id) { return `pisc-checklist-${id}` }
function loadChecklist(id, count) {
  try {
    const arr = JSON.parse(localStorage.getItem(checklistKey(id)) || '[]')
    return Array.from({ length: count }, (_, i) => !!arr[i])
  } catch { return Array(count).fill(false) }
}
function saveChecklist(id, checked) {
  try { localStorage.setItem(checklistKey(id), JSON.stringify(checked)) } catch {}
}

function renderProcedureChecklist(id) {
  const steps = _procStepsCache[id]
  if (!steps) return ''
  const checked = loadChecklist(id, steps.length)
  const done = checked.filter(Boolean).length
  return `
    <div id="pcl-wrap-${id}">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">Étapes</span>
        <span class="text-xs font-semibold ${done === steps.length ? 'text-emerald-600' : 'text-cyan-600'}">${done}/${steps.length}${done === steps.length ? ' <i class="fas fa-circle-check"></i>' : ''}</span>
      </div>
      <div class="space-y-1.5">
        ${steps.map((s, i) => `
          <label class="flex items-start gap-2.5 p-2.5 rounded-xl border ${checked[i] ? 'bg-emerald-50 border-emerald-200' : 'border-slate-100'} cursor-pointer">
            <input type="checkbox" class="mt-0.5 w-4 h-4 accent-cyan-600 shrink-0" ${checked[i] ? 'checked' : ''} onchange="toggleProcedureStep(${id}, ${i}, this.checked)">
            <span class="text-sm ${checked[i] ? 'text-slate-400 line-through' : 'text-slate-700'}">${esc(s)}</span>
          </label>`).join('')}
      </div>
      ${done > 0 ? `<button onclick="resetProcedureChecklist(${id})" class="text-xs text-slate-400 hover:text-red-500 mt-2"><i class="fas fa-rotate-left mr-1"></i>Réinitialiser la progression</button>` : ''}
    </div>`
}

function toggleProcedureStep(id, idx, isChecked) {
  const steps = _procStepsCache[id]
  if (!steps) return
  const checked = loadChecklist(id, steps.length)
  checked[idx] = isChecked
  saveChecklist(id, checked)
  const wrap = el(`pcl-wrap-${id}`)
  if (wrap) wrap.outerHTML = renderProcedureChecklist(id)
}
window.toggleProcedureStep = toggleProcedureStep

function resetProcedureChecklist(id) {
  const steps = _procStepsCache[id]
  if (!steps) return
  saveChecklist(id, Array(steps.length).fill(false))
  const wrap = el(`pcl-wrap-${id}`)
  if (wrap) wrap.outerHTML = renderProcedureChecklist(id)
}
window.resetProcedureChecklist = resetProcedureChecklist

// ---------- Lecture d'une fiche ----------
function openProcedureView(id) {
  const p = procState.items.find(x => x.id === id)
  if (!p) return
  const type = p.type || 'procedure'
  const canEdit = state.user && p.owner_id === state.user.id
  const steps = type === 'procedure' ? parseProcedureSteps(p.content) : null
  _procStepsCache[id] = steps
  openModal(esc(p.title), `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        ${p.important ? `<span class="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold"><i class="fas fa-star mr-1"></i>Important</span>` : ''}
        <span class="text-xs ${type === 'information' ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-50 text-cyan-700'} px-2.5 py-1 rounded-full font-semibold"><i class="fas ${TYPE_ICONS[type]} mr-1"></i>${TYPE_LABELS[type]}</span>
        ${p.category ? `<span class="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold"><i class="fas fa-tag mr-1"></i>${esc(p.category)}</span>` : ''}
        ${p.author_name ? `<span class="text-xs text-slate-400"><i class="fas fa-user mr-1"></i>${esc(p.author_name)}</span>` : ''}
        ${p.updated_at ? `<span class="text-xs text-slate-400"><i class="fas fa-clock mr-1"></i>${new Date(p.updated_at).toLocaleDateString('fr-FR')}</span>` : ''}
      </div>
      ${p.summary ? `<p class="text-sm font-semibold text-slate-600">${esc(p.summary)}</p>` : ''}
      ${steps ? renderProcedureChecklist(id) : (p.content ? `<div class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">${esc(p.content)}</div>` : '<p class="text-sm text-slate-400 italic">Aucun détail renseigné.</p>')}
      ${p.tags ? `<div class="flex flex-wrap gap-1.5 pt-1">${p.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#${esc(t)}</span>`).join('')}</div>` : ''}
      ${canEdit ? `
      <div class="flex gap-2 pt-3 border-t border-slate-100">
        <button onclick='closeModal(); openProcedureForm(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl"><i class="fas fa-pen mr-1"></i>Modifier</button>
        <button onclick="deleteProcedure(${p.id})" class="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"><i class="fas fa-trash"></i></button>
      </div>` : ''}
    </div>`, { size: 'xl' })
}
window.openProcedureView = openProcedureView

// ---------- Création / édition ----------
function procedureCategoryOptions(type) {
  return (type === 'information' ? INFORMATION_CATEGORIES : PROCEDURE_CATEGORIES).map(cat => `<option value="${esc(cat)}">`).join('')
}

function openProcedureForm(p = null) {
  const isEdit = !!p
  const initialType = p?.type || 'procedure'
  openModal(isEdit ? 'Modifier la fiche' : 'Nouvelle fiche', `
    <form id="procedure-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Type *</label>
        <div class="grid grid-cols-2 gap-2">
          <label class="flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50">
            <input type="radio" name="pf-type" value="procedure" onchange="updateProcedureCategoryOptions('procedure')" ${initialType === 'procedure' ? 'checked' : ''}>
            <span class="text-sm font-semibold"><i class="fas fa-screwdriver-wrench text-cyan-500 mr-1"></i>Procédure</span>
          </label>
          <label class="flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
            <input type="radio" name="pf-type" value="information" onchange="updateProcedureCategoryOptions('information')" ${initialType === 'information' ? 'checked' : ''}>
            <span class="text-sm font-semibold"><i class="fas fa-circle-info text-indigo-500 mr-1"></i>Information</span>
          </label>
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Titre *</label>
        <input id="pf-title" required value="${esc(p?.title || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex : Changer le préfiltre de la pompe">
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Catégorie</label>
        <input id="pf-category" list="pf-category-list" value="${esc(p?.category || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex : Filtration">
        <datalist id="pf-category-list">${procedureCategoryOptions(initialType)}</datalist>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Résumé court</label>
        <input id="pf-summary" value="${esc(p?.summary || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Une phrase pour situer la fiche">
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1" id="pf-content-label">Étapes détaillées</label>
        <textarea id="pf-content" rows="7" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="1. Couper la filtration...&#10;2. Ouvrir le couvercle du préfiltre...&#10;3. ...">${esc(p?.content || '')}</textarea>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Mots-clés (séparés par des virgules)</label>
        <input id="pf-tags" value="${esc(p?.tags || '')}" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="préfiltre, pompe, filtration">
      </div>
      <label class="flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50">
        <input type="checkbox" id="pf-important" ${p?.important ? 'checked' : ''}>
        <span class="text-sm font-semibold"><i class="fas fa-star text-amber-400 mr-1"></i>Fiche importante (accès rapide dans l'onglet « Important »)</span>
      </label>
      <div class="flex gap-2 pt-2">
        ${isEdit ? `<button type="button" onclick="deleteProcedure(${p.id})" class="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"><i class="fas fa-trash"></i></button>` : ''}
        <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">${isEdit ? 'Enregistrer' : 'Créer la fiche'}</button>
      </div>
    </form>`, { size: 'xl' })

  updateProcedureCategoryOptions(initialType)

  el('procedure-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const type = el('procedure-form').querySelector('input[name="pf-type"]:checked')?.value || 'procedure'
    const payload = {
      type,
      title: el('pf-title').value,
      category: el('pf-category').value,
      summary: el('pf-summary').value,
      content: el('pf-content').value,
      tags: el('pf-tags').value,
      important: el('pf-important').checked,
    }
    try {
      if (isEdit) await API.put(`/procedures/${p.id}`, payload)
      else await API.post('/procedures', payload)
      closeModal()
      toast(isEdit ? 'Fiche modifiée' : 'Fiche créée')
      renderView()
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openProcedureForm = openProcedureForm

function updateProcedureCategoryOptions(type) {
  const list = el('pf-category-list')
  if (list) list.innerHTML = procedureCategoryOptions(type)
  const label = el('pf-content-label')
  if (label) label.textContent = type === 'information' ? 'Contenu détaillé' : 'Étapes détaillées'
}
window.updateProcedureCategoryOptions = updateProcedureCategoryOptions

async function deleteProcedure(id) {
  if (!confirm('Supprimer cette fiche ?')) return
  try {
    await API.delete(`/procedures/${id}`)
    closeModal(); toast('Fiche supprimée'); renderView()
  } catch { toast('Erreur', 'error') }
}
window.deleteProcedure = deleteProcedure
