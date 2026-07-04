// ============================================================
// VUE MES OUTILS : calculatrices métier (volume, diagnostic/dosage,
// durée de filtration, chlore choc) + analyse photo par IA (OpenRouter).
// ============================================================
function renderTools(c) {
  c.innerHTML = `
    <button onclick="navigate('home')" class="text-slate-400 hover:text-slate-600 mb-3 text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour à l'accueil</button>
    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800 mb-1"><i class="fas fa-calculator text-sky-600 mr-2"></i>Mes outils</h2>
    <p class="text-sm text-slate-400 mb-5">Les calculs du métier, sans avoir à les faire de tête : volume, dosage, durée de filtration... et une analyse photo par IA pour t'aider à diagnostiquer un problème sur le terrain.</p>

    <div class="grid gap-3 sm:grid-cols-2">
      ${toolCard('fa-ruler-combined', '#0ea5e9', 'Volume du bassin', "Calcule le volume selon la forme (rectangulaire, ronde, ovale, libre).", 'openToolVolume')}
      ${toolCard('fa-flask-vial', '#0891b2', "Diagnostic & dosage de l'eau", 'Saisis tes relevés (pH, chlore, TAC, sel, stabilisant) : verdict par paramètre + dose à ajouter.', 'openToolDiagnose')}
      ${toolCard('fa-clock', '#16a34a', 'Durée de filtration', 'La règle température ÷ 2, adaptée à ton bassin.', 'openToolFiltration')}
      ${toolCard('fa-bolt', '#f59e0b', 'Dosage chlore choc', 'Calcule la quantité de produit selon le volume, la concentration visée et celle du produit.', 'openToolChocDose')}
      ${toolCard('fa-camera', '#8b5cf6', 'Analyse photo (IA)', "Envoie une photo de l'eau ou du bassin : diagnostic automatique (type d'algue, tache, eau trouble...).", 'openToolPhoto')}
    </div>`
}
window.renderTools = renderTools

function toolCard(icon, color, title, desc, fn) {
  return `
    <button onclick="${fn}()" class="pool-card bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left flex items-start gap-3">
      <div class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white" style="background:${color}"><i class="fas ${icon}"></i></div>
      <div class="min-w-0">
        <div class="font-bold text-slate-800 leading-tight">${title}</div>
        <div class="text-xs text-slate-400 mt-0.5">${desc}</div>
      </div>
    </button>`
}

// ============================================================
// OUTIL 1 : Volume du bassin
// ============================================================
const VOLUME_SHAPES = {
  rectangulaire: { label: 'Rectangulaire', d1: 'Longueur (m)', d2: 'Largeur (m)', factor: 1 },
  ronde: { label: 'Ronde', d1: 'Diamètre (m)', d2: null, factor: null },
  ovale: { label: 'Ovale', d1: 'Longueur (m)', d2: 'Largeur (m)', factor: 0.89 },
  libre: { label: 'Forme libre', d1: 'Longueur max (m)', d2: 'Largeur max (m)', factor: 0.85 },
}

function openToolVolume() {
  openModal('<i class="fas fa-ruler-combined text-sky-500 mr-2"></i>Volume du bassin', `
    <form id="tool-volume-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Forme du bassin</label>
        <select id="tv-shape" onchange="updateToolVolumeShape()" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none">
          ${Object.entries(VOLUME_SHAPES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label id="tv-d1-label" class="block text-sm font-semibold text-slate-600 mb-1">Longueur (m)</label>
          <input id="tv-d1" type="number" step="0.01" min="0" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none">
        </div>
        <div id="tv-d2-wrap">
          <label id="tv-d2-label" class="block text-sm font-semibold text-slate-600 mb-1">Largeur (m)</label>
          <input id="tv-d2" type="number" step="0.01" min="0" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Profondeur moyenne (m)</label>
        <input id="tv-depth" type="number" step="0.01" min="0" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none" placeholder="Ex : 1.5">
      </div>
      <button type="submit" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl">Calculer</button>
      <div id="tv-result"></div>
    </form>`)
  updateToolVolumeShape()
  el('tool-volume-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const shape = el('tv-shape').value
    const d1 = parseFloat(el('tv-d1').value) || 0
    const d2 = parseFloat(el('tv-d2').value) || 0
    const depth = parseFloat(el('tv-depth').value) || 0
    let volume = 0
    if (shape === 'ronde') { const r = d1 / 2; volume = r * r * Math.PI * depth }
    else volume = d1 * d2 * depth * VOLUME_SHAPES[shape].factor
    el('tv-result').innerHTML = `
      <div class="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
        <div class="text-xs text-sky-600 font-semibold uppercase tracking-wide">Volume estimé</div>
        <div class="text-3xl font-extrabold text-sky-700 mt-1">${volume.toFixed(1)} m³</div>
        <div class="text-xs text-sky-500 mt-1">soit ${Math.round(volume * 1000).toLocaleString('fr-FR')} litres</div>
      </div>`
  })
}
window.openToolVolume = openToolVolume

function updateToolVolumeShape() {
  const shape = el('tv-shape').value
  const s = VOLUME_SHAPES[shape]
  el('tv-d1-label').textContent = s.d1
  if (s.d2) {
    el('tv-d2-wrap').style.display = ''
    el('tv-d2-label').textContent = s.d2
    el('tv-d2').required = true
  } else {
    el('tv-d2-wrap').style.display = 'none'
    el('tv-d2').required = false
  }
  const result = el('tv-result'); if (result) result.innerHTML = ''
}
window.updateToolVolumeShape = updateToolVolumeShape

// ============================================================
// OUTIL 2 : Diagnostic & dosage de l'eau (réutilise le moteur /api/diagnose)
// ============================================================
function openToolDiagnose() {
  openModal('<i class="fas fa-flask-vial text-cyan-500 mr-2"></i>Diagnostic & dosage de l\'eau', `
    <form id="tool-diag-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Volume du bassin (m³)</label>
        <input id="td-volume" type="number" step="0.1" min="0" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex : 48">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">pH</label><input id="td-ph" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="7.2"></div>
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">Chlore (mg/L)</label><input id="td-chlorine" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="1.5"></div>
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">TAC (mg/L)</label><input id="td-tac" type="number" step="1" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="100"></div>
        <div><label class="block text-xs font-semibold text-slate-500 mb-1">Sel (g/L)</label><input id="td-salt" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="4"></div>
        <div class="col-span-2"><label class="block text-xs font-semibold text-slate-500 mb-1">Stabilisant (mg/L)</label><input id="td-stabilizer" type="number" step="1" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="40"></div>
      </div>
      <p class="text-xs text-slate-400">Laisse vide un champ que tu n'as pas mesuré. Sans volume renseigné, les doses ne seront pas chiffrées.</p>
      <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl">Analyser</button>
      <div id="td-result"></div>
    </form>`, { size: 'xl' })

  el('tool-diag-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const val = (id) => { const v = el(id).value; return v === '' ? null : parseFloat(v) }
    const payload = {
      pool: { volume_m3: val('td-volume') },
      reading: { ph: val('td-ph'), chlorine: val('td-chlorine'), tac: val('td-tac'), salt: val('td-salt'), stabilizer: val('td-stabilizer') },
    }
    try {
      const { data } = await API.post('/diagnose', payload)
      el('td-result').innerHTML = `<div class="mt-4">${diagnosisHtml(data, { emptyText: 'Saisis au moins un relevé pour obtenir un diagnostic.' })}</div>`
    } catch (err) { toast(err.response?.data?.error || 'Erreur', 'error') }
  })
}
window.openToolDiagnose = openToolDiagnose

// ============================================================
// OUTIL 3 : Durée de filtration recommandée (règle température ÷ 2)
// ============================================================
function openToolFiltration() {
  openModal('<i class="fas fa-clock text-emerald-500 mr-2"></i>Durée de filtration', `
    <form id="tool-filt-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Température de l'eau (°C)</label>
        <input id="tf-temp" type="number" step="0.5" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex : 26">
      </div>
      <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl">Calculer</button>
      <div id="tf-result"></div>
    </form>
    <p class="text-xs text-slate-400 mt-3">Règle professionnelle : durée (h) = température (°C) ÷ 2. En dessous de 12°C, la filtration peut être fortement réduite. Au-dessus de 28°C, elle doit tourner en continu.</p>`)

  el('tool-filt-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const temp = parseFloat(el('tf-temp').value) || 0
    let hours, note = ''
    if (temp <= 12) { hours = Math.max(1, Math.round(temp / 2)); note = 'Eau froide : les micro-organismes prolifèrent peu, la filtration peut être fortement réduite.' }
    else if (temp >= 28) { hours = 24; note = 'Eau chaude : filtration en continu recommandée pour éviter qu\'elle ne verdisse en 24-48h.' }
    else { hours = Math.round(temp / 2); note = '' }
    el('tf-result').innerHTML = `
      <div class="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <div class="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Durée de filtration recommandée</div>
        <div class="text-3xl font-extrabold text-emerald-700 mt-1">${hours} h / jour</div>
        ${note ? `<div class="text-xs text-emerald-600 mt-1">${note}</div>` : ''}
      </div>`
  })
}
window.openToolFiltration = openToolFiltration

// ============================================================
// OUTIL 4 : Dosage chlore choc
// ============================================================
function openToolChocDose() {
  openModal('<i class="fas fa-bolt text-amber-500 mr-2"></i>Dosage chlore choc', `
    <form id="tool-choc-form" class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-slate-600 mb-1">Volume du bassin (m³)</label>
        <input id="tc-volume" type="number" step="0.1" min="0" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex : 48">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Concentration visée (ppm)</label>
          <input id="tc-target" type="number" step="0.5" value="5" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-600 mb-1">Concentration du produit (%)</label>
          <input id="tc-concentration" type="number" step="1" value="70" required class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none">
        </div>
      </div>
      <p class="text-xs text-slate-400">La concentration du produit (% de chlore actif) est indiquée sur l'emballage. Par défaut : 70% (hypochlorite de calcium courant). Cible usuelle : 5 ppm pour un choc standard, jusqu'à 25-30 g/m³ de produit pour une eau très dégradée.</p>
      <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl">Calculer</button>
      <div id="tc-result"></div>
    </form>`)

  el('tool-choc-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const volume = parseFloat(el('tc-volume').value) || 0
    const target = parseFloat(el('tc-target').value) || 0
    const concentration = parseFloat(el('tc-concentration').value) || 0
    if (!concentration) { toast('Concentration du produit invalide', 'error'); return }
    const grams = target * volume / (concentration / 100)
    const display = grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${Math.round(grams)} g`
    el('tc-result').innerHTML = `
      <div class="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <div class="text-xs text-amber-600 font-semibold uppercase tracking-wide">Quantité de produit à ajouter</div>
        <div class="text-3xl font-extrabold text-amber-700 mt-1">${display}</div>
        <div class="text-xs text-amber-600 mt-1">Toujours ramener le pH entre 7.2 et 7.4 avant le choc, et laisser la filtration tourner en continu au moins 24h après.</div>
      </div>`
  })
}
window.openToolChocDose = openToolChocDose

// ============================================================
// OUTIL 5 : Analyse photo par IA (OpenRouter)
// ============================================================
function openToolPhoto() {
  openModal('<i class="fas fa-camera text-violet-500 mr-2"></i>Analyse photo (IA)', `
    <div class="space-y-4">
      <p class="text-sm text-slate-500">Prends ou choisis une photo de l'eau, du bassin ou d'un équipement : l'IA identifie le problème le plus probable (type d'algue, eau trouble, tache métallique...) et te suggère une action.</p>
      <input id="tp-file" type="file" accept="image/*" capture="environment" class="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none">
      <div id="tp-preview"></div>
      <button id="tp-submit" onclick="submitToolPhoto()" class="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl"><i class="fas fa-magnifying-glass mr-1"></i>Analyser la photo</button>
      <div id="tp-result"></div>
    </div>`, { size: 'xl' })

  el('tp-file').addEventListener('change', () => {
    const file = el('tp-file').files[0]
    const preview = el('tp-preview')
    if (!file) { preview.innerHTML = ''; return }
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" class="w-full max-h-64 object-contain rounded-xl border border-slate-200">`
  })
}
window.openToolPhoto = openToolPhoto

async function submitToolPhoto() {
  const file = el('tp-file').files[0]
  if (!file) { toast('Choisis une photo', 'error'); return }
  const btn = el('tp-submit')
  const original = btn.innerHTML
  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Analyse en cours...'
  el('tp-result').innerHTML = ''
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await API.post('/tools/photo-diagnose', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    el('tp-result').innerHTML = `<div class="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">${esc(data.analysis)}</div>`
  } catch (err) {
    el('tp-result').innerHTML = `<p class="text-sm text-red-600">${esc(err.response?.data?.error || "Erreur lors de l'analyse.")}</p>`
  } finally {
    btn.disabled = false
    btn.innerHTML = original
  }
}
window.submitToolPhoto = submitToolPhoto
