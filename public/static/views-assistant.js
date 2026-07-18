// ============================================================
// VUE ASSISTANT IA : agent conversationnel multimodal ("Max").
// Chat en streaming (SSE relayé par /api/assistant/chat → OpenRouter/Gemini),
// avec pièces jointes photo (redimensionnées côté client avant envoi).
// La conversation est conservée en localStorage, propre à l'appareil.
// ============================================================

const ASSIST_STORE_KEY = 'pm-assistant-chat'
const ASSIST_MAX_IMAGES = 3

const assistState = {
  messages: loadAssistantChat(), // [{ role: 'user'|'assistant', content, images?: [dataURI] }]
  pendingImages: [],             // data URIs en attente d'envoi avec le prochain message
  sending: false,
}

function loadAssistantChat() {
  try {
    const arr = JSON.parse(localStorage.getItem(ASSIST_STORE_KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function saveAssistantChat() {
  // On ne garde que les 40 derniers messages, et on retire les images des plus
  // anciens pour ne pas saturer le localStorage (~5 Mo max).
  try {
    const keep = assistState.messages.slice(-40).map((m, i, arr) => (
      arr.length - i > 6 && m.images ? { role: m.role, content: m.content } : m
    ))
    localStorage.setItem(ASSIST_STORE_KEY, JSON.stringify(keep))
  } catch { /* quota plein : la conversation reste en mémoire */ }
}

function renderAssistant(c) {
  c.innerHTML = `
    <div class="flex flex-col" style="height: calc(100vh - 180px); min-height: 420px;">
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="min-w-0">
          <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800"><i class="fas fa-robot text-violet-600 mr-2"></i>Assistant IA</h2>
          <p class="text-xs sm:text-sm text-slate-400">Pose n'importe quelle question (diagnostic, dosage, panne, réglementation...) et joins des photos : l'assistant les analyse.</p>
        </div>
        <button onclick="resetAssistantChat()" class="shrink-0 text-slate-400 hover:text-red-500 text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white" title="Nouvelle conversation">
          <i class="fas fa-rotate-left sm:mr-1"></i><span class="hidden sm:inline">Nouvelle conversation</span>
        </button>
      </div>

      <div id="assist-messages" class="flex-1 overflow-y-auto space-y-3 pb-3 pr-1"></div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 mt-2">
        <div id="assist-previews" class="flex gap-2 flex-wrap"></div>
        <div class="flex items-end gap-2">
          <label class="shrink-0 w-10 h-10 rounded-xl bg-slate-100 hover:bg-violet-100 text-slate-500 hover:text-violet-600 flex items-center justify-center cursor-pointer transition" title="Joindre une photo">
            <i class="fas fa-camera"></i>
            <input id="assist-file" type="file" accept="image/*" multiple class="hidden" onchange="addAssistantImages(this.files)">
          </label>
          <textarea id="assist-input" rows="1" placeholder="Ex : l'eau est verte malgré un chlore à 1,5, que faire ?"
            class="flex-1 resize-none max-h-32 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
            oninput="autoGrowAssistantInput(this)" onkeydown="assistantInputKeydown(event)"></textarea>
          <button id="assist-send" onclick="sendAssistantMessage()" class="shrink-0 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition disabled:opacity-50" title="Envoyer">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>`
  renderAssistantMessages()
  renderAssistantPreviews()
}
window.renderAssistant = renderAssistant

function autoGrowAssistantInput(t) {
  t.style.height = 'auto'
  t.style.height = Math.min(t.scrollHeight, 128) + 'px'
}
window.autoGrowAssistantInput = autoGrowAssistantInput

function assistantInputKeydown(e) {
  // Entrée = envoyer (desktop), Maj+Entrée = retour à la ligne
  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 640) {
    e.preventDefault()
    sendAssistantMessage()
  }
}
window.assistantInputKeydown = assistantInputKeydown

function resetAssistantChat() {
  if (assistState.messages.length && !confirm('Effacer la conversation ?')) return
  assistState.messages = []
  assistState.pendingImages = []
  saveAssistantChat()
  renderView()
}
window.resetAssistantChat = resetAssistantChat

// ---------- Pièces jointes photo ----------
// Redimensionne côté client (max 1280 px, JPEG qualité 0.85) : les photos de
// smartphone passent de ~8 Mo à ~300 Ko, l'analyse IA n'a pas besoin de plus.
function resizeImageToDataUri(file, maxDim = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
    img.src = url
  })
}

async function addAssistantImages(files) {
  for (const file of [...files]) {
    if (assistState.pendingImages.length >= ASSIST_MAX_IMAGES) { toast(`Maximum ${ASSIST_MAX_IMAGES} photos par message`, 'info'); break }
    try { assistState.pendingImages.push(await resizeImageToDataUri(file)) }
    catch { toast('Impossible de lire cette image', 'error') }
  }
  const input = el('assist-file'); if (input) input.value = ''
  renderAssistantPreviews()
}
window.addAssistantImages = addAssistantImages

function removeAssistantImage(idx) {
  assistState.pendingImages.splice(idx, 1)
  renderAssistantPreviews()
}
window.removeAssistantImage = removeAssistantImage

function renderAssistantPreviews() {
  const box = el('assist-previews')
  if (!box) return
  box.innerHTML = assistState.pendingImages.map((u, i) => `
    <div class="relative">
      <img src="${u}" class="w-16 h-16 object-cover rounded-lg border border-slate-200">
      <button onclick="removeAssistantImage(${i})" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center" title="Retirer"><i class="fas fa-times"></i></button>
    </div>`).join('')
  box.className = 'flex gap-2 flex-wrap' + (assistState.pendingImages.length ? ' mb-2' : '')
}

// ---------- Rendu des messages ----------
// Mini-rendu Markdown sûr : tout est échappé d'abord, puis on ne réintroduit
// que des balises inoffensives (gras, italique, code, listes, titres).
function assistantMarkdown(text) {
  let s = esc(text || '')
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="bg-slate-800 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto my-1.5">${code.trim()}</pre>`)
  s = s.replace(/`([^`\n]+)`/g, '<code class="bg-slate-100 text-violet-700 px-1 rounded text-[13px]">$1</code>')
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
  s = s.replace(/(^|\n)\s*\*(?!\*)\s+/g, '$1• ').replace(/(^|\n)\s*-\s+/g, '$1• ')
  s = s.replace(/(^|\n)#{1,4}\s*([^\n]+)/g, '$1<b class="block mt-1.5">$2</b>')
  return s.replace(/\n/g, '<br>')
}

function assistantMessageHtml(m, idx) {
  const imgs = (m.images || []).map(u => `<img src="${u}" class="w-24 h-24 object-cover rounded-lg border border-white/30">`).join('')
  if (m.role === 'user') {
    return `
      <div class="flex justify-end">
        <div class="max-w-[85%] bg-violet-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
          ${imgs ? `<div class="flex gap-2 flex-wrap mb-1.5">${imgs}</div>` : ''}
          <div class="whitespace-pre-wrap">${esc(m.content)}</div>
        </div>
      </div>`
  }
  return `
    <div class="flex justify-start">
      <div class="max-w-[90%] bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-slate-700 leading-relaxed shadow-sm">
        <div class="text-[11px] font-bold text-violet-500 mb-1"><i class="fas fa-robot mr-1"></i>Max</div>
        <div id="assist-msg-${idx}">${assistantMarkdown(m.content)}</div>
      </div>
    </div>`
}

function renderAssistantMessages() {
  const box = el('assist-messages')
  if (!box) return
  if (!assistState.messages.length) {
    box.innerHTML = `
      <div class="text-center py-10 text-slate-400">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-violet-100 text-violet-500 flex items-center justify-center text-3xl mb-3"><i class="fas fa-robot"></i></div>
        <p class="font-semibold text-slate-500 mb-1">Salut, moi c'est Max 👋</p>
        <p class="text-sm max-w-md mx-auto">Je connais le métier de pisciniste sur le bout des doigts. Pose-moi une question, décris une panne, ou envoie une photo de l'eau ou d'un équipement.</p>
        <div class="flex flex-wrap justify-center gap-2 mt-4">
          ${["L'eau est verte, que faire ?", 'Comment fonctionne une vanne 6 voies ?', 'Ma pompe se désamorce', 'Dosage chlore choc pour 50 m³'].map(q =>
            `<button onclick="askAssistantSuggestion('${q.replace(/'/g, "\\'")}')" class="text-xs bg-white border border-slate-200 hover:border-violet-300 hover:text-violet-600 text-slate-500 px-3 py-1.5 rounded-full font-semibold transition">${q}</button>`).join('')}
        </div>
      </div>`
    return
  }
  box.innerHTML = assistState.messages.map(assistantMessageHtml).join('')
  box.scrollTop = box.scrollHeight
}

function askAssistantSuggestion(q) {
  const input = el('assist-input')
  if (input) { input.value = q; autoGrowAssistantInput(input) }
  sendAssistantMessage()
}
window.askAssistantSuggestion = askAssistantSuggestion

// ---------- Envoi + streaming ----------
async function sendAssistantMessage() {
  if (assistState.sending) return
  const input = el('assist-input')
  const text = (input?.value || '').trim()
  const images = [...assistState.pendingImages]
  if (!text && !images.length) return

  assistState.messages.push({ role: 'user', content: text, ...(images.length ? { images } : {}) })
  assistState.pendingImages = []
  if (input) { input.value = ''; autoGrowAssistantInput(input) }
  renderAssistantPreviews()

  // Bulle assistant vide, remplie au fil du stream
  assistState.messages.push({ role: 'assistant', content: '' })
  const asstIdx = assistState.messages.length - 1
  renderAssistantMessages()
  const box = el('assist-messages')
  const bubble = () => el(`assist-msg-${asstIdx}`)
  if (bubble()) bubble().innerHTML = '<i class="fas fa-ellipsis fa-fade text-slate-400"></i>'

  assistState.sending = true
  const btn = el('assist-send'); if (btn) btn.disabled = true

  try {
    // fetch natif (axios ne gère pas les flux) — même origine, cookie de session inclus
    const resp = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: assistState.messages.slice(0, -1).slice(-24).map(m => ({ role: m.role, content: m.content, ...(m.images ? { images: m.images } : {}) })),
      }),
    })

    const ctype = resp.headers.get('content-type') || ''
    if (!resp.ok || !ctype.includes('text/event-stream')) {
      let msg = "Erreur de l'assistant."
      try { msg = (await resp.json()).error || msg } catch {}
      throw new Error(msg)
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!line.startsWith('data:')) continue // ignore les commentaires ": OPENROUTER PROCESSING"
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            assistState.messages[asstIdx].content = full
            if (bubble()) { bubble().innerHTML = assistantMarkdown(full); if (box) box.scrollTop = box.scrollHeight }
          }
          const err = json.error?.message
          if (err) throw new Error(err)
        } catch (e) {
          if (e instanceof SyntaxError) continue // chunk JSON incomplet : ignoré
          throw e
        }
      }
    }
    if (!full) throw new Error('Réponse vide, réessaie.')
    assistState.messages[asstIdx].content = full
  } catch (err) {
    assistState.messages[asstIdx].content = ''
    assistState.messages.pop() // retire la bulle assistant vide
    renderAssistantMessages()
    toast(err.message || "Erreur de l'assistant", 'error')
  } finally {
    assistState.sending = false
    if (el('assist-send')) el('assist-send').disabled = false
    saveAssistantChat()
    renderAssistantMessages()
  }
}
window.sendAssistantMessage = sendAssistantMessage
