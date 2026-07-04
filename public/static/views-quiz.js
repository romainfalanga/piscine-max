// ============================================================
// VUE CODE DU PISCINISTE : jeu de questions façon "code de la route",
// basé sur le contenu de la bibliothèque Pisciniste.
// ============================================================
const quizState = { questions: [], index: 0, answers: {}, passScore: 35, total: 40 }

async function renderQuiz(c) {
  c.innerHTML = `
    <button onclick="navigate('procedures')" class="text-slate-400 hover:text-slate-600 mb-3 text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour à Pisciniste</button>
    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800 mb-1"><i class="fas fa-graduation-cap text-indigo-600 mr-2"></i>Code du pisciniste</h2>
    <p class="text-sm text-slate-400 mb-5">Entraîne-toi façon « code de la route » : 40 questions tirées au hasard dans notre banque de questions sur le métier. Il faut au moins <b>35/40</b> pour décrocher ton code.</p>

    <div class="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg mb-5 text-center">
      <i class="fas fa-graduation-cap text-4xl mb-2 opacity-90"></i>
      <div class="font-extrabold text-lg mb-1">Prêt à tester tes connaissances ?</div>
      <div class="text-sm text-indigo-100 mb-4">40 questions aléatoires · 4 réponses possibles · objectif 35/40</div>
      <button onclick="startQuiz()" class="bg-white text-indigo-700 font-bold px-6 py-2.5 rounded-xl shadow hover:bg-indigo-50"><i class="fas fa-play mr-1.5"></i>Commencer une session</button>
    </div>

    <h3 class="font-bold text-slate-700 mb-3"><i class="fas fa-clock-rotate-left text-slate-400 mr-2"></i>Historique</h3>
    <div id="quiz-history" class="space-y-2"><div class="text-center py-6 text-slate-400"><i class="fas fa-spinner fa-spin"></i></div></div>`

  loadQuizHistory()
}
window.renderQuiz = renderQuiz

async function loadQuizHistory() {
  const box = el('quiz-history')
  if (!box) return
  let history = []
  try { history = (await API.get('/quiz/history')).data } catch { history = [] }
  if (!history.length) {
    box.innerHTML = `<p class="text-sm text-slate-400 py-4 text-center">Aucune tentative pour l'instant. Lance ta première session !</p>`
    return
  }
  box.innerHTML = history.map(h => `
    <div class="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm p-3">
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white ${h.passed ? 'bg-emerald-500' : 'bg-slate-400'}"><i class="fas ${h.passed ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></span>
        <div>
          <div class="font-bold text-slate-800">${h.score}/${h.total}</div>
          <div class="text-xs text-slate-400">${new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
      <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${h.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${h.passed ? 'Code obtenu' : 'Non obtenu'}</span>
    </div>`).join('')
}

async function startQuiz() {
  const c = el('main-content')
  c.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>`
  try {
    const { data } = await API.get('/quiz/session')
    quizState.questions = data.questions
    quizState.total = data.total
    quizState.passScore = data.pass_score
    quizState.index = 0
    quizState.answers = {}
    renderQuizQuestion()
  } catch { toast('Impossible de charger les questions', 'error'); renderQuiz(c) }
}
window.startQuiz = startQuiz

function renderQuizQuestion() {
  const c = el('main-content')
  const q = quizState.questions[quizState.index]
  if (!q) return
  const selected = quizState.answers[q.id]
  const opt = (letter, text) => `
    <button onclick="selectQuizAnswer(${q.id}, '${letter}')" class="w-full text-left px-4 py-3 rounded-xl border-2 transition flex items-center gap-3 ${selected === letter ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}">
      <span class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${selected === letter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}">${letter.toUpperCase()}</span>
      <span class="text-sm text-slate-700">${esc(text)}</span>
    </button>`

  c.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <button onclick="if(confirm('Abandonner cette session ?')) renderQuiz(el(\'main-content\'))" class="text-slate-400 hover:text-red-500 text-sm"><i class="fas fa-xmark mr-1"></i>Abandonner</button>
      <span class="text-sm font-bold text-slate-500">Question ${quizState.index + 1}/${quizState.total}</span>
    </div>
    <div class="w-full bg-slate-200 rounded-full h-1.5 mb-5"><div class="bg-indigo-600 h-1.5 rounded-full transition-all" style="width:${((quizState.index) / quizState.total) * 100}%"></div></div>

    ${q.category ? `<span class="text-[11px] font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">${esc(q.category)}</span>` : ''}
    <h3 class="text-lg font-bold text-slate-800 mt-2 mb-4">${esc(q.question)}</h3>

    <div class="space-y-2.5 mb-6">
      ${opt('a', q.option_a)}
      ${opt('b', q.option_b)}
      ${opt('c', q.option_c)}
      ${opt('d', q.option_d)}
    </div>

    <button id="quiz-next-btn" onclick="nextQuizQuestion()" ${selected ? '' : 'disabled'} class="w-full font-bold py-3 rounded-xl transition ${selected ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}">
      ${quizState.index === quizState.total - 1 ? 'Terminer' : 'Question suivante'} <i class="fas fa-arrow-right ml-1"></i>
    </button>`
}

function selectQuizAnswer(id, letter) {
  quizState.answers[id] = letter
  renderQuizQuestion()
}
window.selectQuizAnswer = selectQuizAnswer

async function nextQuizQuestion() {
  if (quizState.index < quizState.total - 1) {
    quizState.index++
    renderQuizQuestion()
  } else {
    await submitQuiz()
  }
}
window.nextQuizQuestion = nextQuizQuestion

async function submitQuiz() {
  const c = el('main-content')
  c.innerHTML = `<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-3">Correction en cours...</p></div>`
  const answers = quizState.questions.map(q => ({ id: q.id, answer: quizState.answers[q.id] || null }))
  try {
    const { data } = await API.post('/quiz/submit', { answers })
    renderQuizResults(data)
  } catch { toast('Erreur lors de la correction', 'error'); renderQuiz(c) }
}

function renderQuizResults(data) {
  const c = el('main-content')
  const pct = Math.round((data.score / data.total) * 100)
  c.innerHTML = `
    <div class="rounded-2xl p-6 text-center text-white shadow-lg mb-5 ${data.passed ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-slate-500 to-slate-700'}">
      <i class="fas ${data.passed ? 'fa-circle-check' : 'fa-circle-xmark'} text-4xl mb-2 opacity-90"></i>
      <div class="text-3xl font-extrabold mb-1">${data.score} / ${data.total}</div>
      <div class="text-sm opacity-90 mb-3">${pct}% de bonnes réponses · objectif ${data.pass_score}/${data.total}</div>
      <div class="inline-block font-bold px-4 py-1.5 rounded-full ${data.passed ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}">${data.passed ? '🎉 Code du pisciniste obtenu !' : 'Code non obtenu, réessaie !'}</div>
    </div>

    <div class="flex gap-2 mb-5">
      <button onclick="startQuiz()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl"><i class="fas fa-rotate mr-1"></i>Recommencer</button>
      <button onclick="navigate('procedures')" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl">Retour à Pisciniste</button>
    </div>

    <h3 class="font-bold text-slate-700 mb-3">Détail des réponses</h3>
    <div class="space-y-2.5">
      ${data.details.map((d, i) => `
        <div class="bg-white rounded-xl border ${d.is_correct ? 'border-emerald-200' : 'border-red-200'} p-3.5">
          <div class="flex items-start gap-2">
            <span class="mt-0.5 ${d.is_correct ? 'text-emerald-500' : 'text-red-500'}"><i class="fas ${d.is_correct ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-slate-800">${i + 1}. ${esc(d.question)}</div>
              <div class="text-xs mt-1 ${d.is_correct ? 'text-emerald-600' : 'text-red-500'}">Ta réponse : ${d.your_answer ? esc(d.options[d.your_answer]) : '(aucune)'}</div>
              ${!d.is_correct ? `<div class="text-xs mt-0.5 text-emerald-600">Bonne réponse : ${esc(d.options[d.correct_answer])}</div>` : ''}
              ${d.explanation ? `<div class="text-xs mt-1 text-slate-400 italic">${esc(d.explanation)}</div>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`
}
