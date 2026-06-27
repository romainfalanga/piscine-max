import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { verifyPassword, createSession, verifySession, hashPassword } from './auth'
import { geocodeAddress } from './geocode'
import { renderApp } from './html'

type Bindings = {
  DB: D1Database
  SESSION_SECRET?: string
}

// Fallback si le secret n'est pas défini en variable d'environnement Cloudflare.
// ⚠️ En production, définir SESSION_SECRET via le dashboard (Settings → Environment variables / Secrets).
const SESSION_SECRET_FALLBACK = 'piscine-max-secret-change-me-in-prod-2026'
const COOKIE_NAME = 'pm_session'
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30 // 30 jours

function getSecret(c: any): string {
  return (c.env && c.env.SESSION_SECRET) ? c.env.SESSION_SECRET : SESSION_SECRET_FALLBACK
}

const app = new Hono<{ Bindings: Bindings; Variables: { user: { uid: number; role: string; name: string } } }>()

app.use('/api/*', cors())

// Servir les fichiers statiques
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================================
// Middleware d'authentification
// ============================================================
async function requireAuth(c: any, next: any) {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) return c.json({ error: 'Non authentifié' }, 401)
  const session = await verifySession(token, getSecret(c))
  if (!session) return c.json({ error: 'Session invalide ou expirée' }, 401)
  c.set('user', { uid: session.uid, role: session.role, name: session.name })
  await next()
}

async function requireAdmin(c: any, next: any) {
  const user = c.get('user')
  if (!user || user.role !== 'admin') return c.json({ error: 'Réservé à l\'administrateur' }, 403)
  await next()
}

// ============================================================
// AUTH
// ============================================================
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400)
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first<any>()
  if (!user) return c.json({ error: 'Identifiants incorrects' }, 401)
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.json({ error: 'Identifiants incorrects' }, 401)

  const token = await createSession(
    { uid: user.id, role: user.role, name: user.name, exp: Date.now() + SESSION_TTL },
    getSecret(c)
  )
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: SESSION_TTL / 1000,
    path: '/'
  })
  return c.json({ id: user.id, name: user.name, role: user.role, email: user.email, color: user.color })
})

app.post('/api/logout', async (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/me', requireAuth, async (c) => {
  const u = c.get('user')
  const user = await c.env.DB.prepare('SELECT id, name, email, role, color FROM users WHERE id = ?').bind(u.uid).first()
  return c.json(user)
})

// Liste des utilisateurs (pour l'assignation) - admin only
app.get('/api/users', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, email, role, color FROM users ORDER BY role DESC, name').all()
  return c.json(results)
})

// Changer son mot de passe
app.post('/api/change-password', requireAuth, async (c) => {
  const u = c.get('user')
  const { current_password, new_password } = await c.req.json()
  if (!new_password || new_password.length < 4) return c.json({ error: 'Le nouveau mot de passe doit faire au moins 4 caractères' }, 400)
  const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(u.uid).first<any>()
  if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)
  const ok = await verifyPassword(current_password, user.password_hash)
  if (!ok) return c.json({ error: 'Mot de passe actuel incorrect' }, 401)
  const newHash = await hashPassword(new_password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, u.uid).run()
  return c.json({ ok: true })
})

// ============================================================
// CLIENTS (admin gère ; worker lecture seule)
// ============================================================
app.get('/api/clients', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM pools WHERE client_id = c.id) as pool_count
    FROM clients c ORDER BY c.name
  `).all()
  return c.json(results)
})

app.get('/api/clients/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()
  if (!client) return c.json({ error: 'Client introuvable' }, 404)
  const { results: pools } = await c.env.DB.prepare('SELECT * FROM pools WHERE client_id = ? ORDER BY label').bind(id).all()
  return c.json({ ...client, pools })
})

app.post('/api/clients', requireAuth, requireAdmin, async (c) => {
  const { name, phone, email, notes } = await c.req.json()
  if (!name) return c.json({ error: 'Le nom est requis' }, 400)
  const r = await c.env.DB.prepare('INSERT INTO clients (name, phone, email, notes) VALUES (?, ?, ?, ?)')
    .bind(name, phone || null, email || null, notes || null).run()
  return c.json({ id: r.meta.last_row_id, name, phone, email, notes })
})

app.put('/api/clients/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { name, phone, email, notes } = await c.req.json()
  await c.env.DB.prepare('UPDATE clients SET name=?, phone=?, email=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(name, phone || null, email || null, notes || null, id).run()
  return c.json({ ok: true })
})

app.delete('/api/clients/:id', requireAuth, requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ============================================================
// POOLS (piscines)
// ============================================================
app.get('/api/pools', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT p.*, cl.name as client_name, cl.phone as client_phone
    FROM pools p JOIN clients cl ON cl.id = p.client_id
    ORDER BY cl.name, p.label
  `).all()
  return c.json(results)
})

app.get('/api/pools/:id', requireAuth, async (c) => {
  const pool = await c.env.DB.prepare(`
    SELECT p.*, cl.name as client_name, cl.phone as client_phone, cl.email as client_email
    FROM pools p JOIN clients cl ON cl.id = p.client_id WHERE p.id = ?
  `).bind(c.req.param('id')).first()
  if (!pool) return c.json({ error: 'Piscine introuvable' }, 404)
  return c.json(pool)
})

async function geocodeIfNeeded(address: string | null, lat: any, lng: any) {
  if (address && (lat == null || lng == null)) {
    const geo = await geocodeAddress(address)
    if (geo) return { lat: geo.lat, lng: geo.lng }
  }
  return { lat: lat ?? null, lng: lng ?? null }
}

app.post('/api/pools', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json()
  if (!body.client_id || !body.label) return c.json({ error: 'Client et nom de piscine requis' }, 400)
  const geo = await geocodeIfNeeded(body.address, body.lat, body.lng)
  const r = await c.env.DB.prepare(`
    INSERT INTO pools (client_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, photos, notes,
      ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.client_id, body.label, body.address || null, geo.lat, geo.lng,
    body.pool_type || null, body.volume_m3 || null, body.shape || null,
    body.treatment_type || null, body.filtration_type || null,
    body.access_code || null, body.access_notes || null,
    body.routine || null, body.photos || null, body.notes || null,
    body.ideal_ph_min ?? 7.0, body.ideal_ph_max ?? 7.4,
    body.ideal_chlorine_min ?? 1.0, body.ideal_chlorine_max ?? 2.0,
    body.priority ? 1 : 0
  ).run()
  return c.json({ id: r.meta.last_row_id, ...geo })
})

app.put('/api/pools/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  // Re-géocode si l'adresse a changé et qu'on ne fournit pas de coords explicites
  const geo = await geocodeIfNeeded(body.address, body.lat, body.lng)
  await c.env.DB.prepare(`
    UPDATE pools SET label=?, address=?, lat=?, lng=?, pool_type=?, volume_m3=?, shape=?, treatment_type=?, filtration_type=?, access_code=?, access_notes=?, routine=?, photos=?, notes=?,
      ideal_ph_min=?, ideal_ph_max=?, ideal_chlorine_min=?, ideal_chlorine_max=?, priority=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    body.label, body.address || null, geo.lat, geo.lng,
    body.pool_type || null, body.volume_m3 || null, body.shape || null,
    body.treatment_type || null, body.filtration_type || null,
    body.access_code || null, body.access_notes || null,
    body.routine || null, body.photos || null, body.notes || null,
    body.ideal_ph_min ?? 7.0, body.ideal_ph_max ?? 7.4,
    body.ideal_chlorine_min ?? 1.0, body.ideal_chlorine_max ?? 2.0,
    body.priority ? 1 : 0, id
  ).run()
  return c.json({ ok: true, ...geo })
})

// Historique des passages d'une piscine (avec relevés) - utile pour le graphique
app.get('/api/pools/:id/history', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT l.*, u.name as done_by_name, u.color as done_by_color
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    LEFT JOIN users u ON u.id = l.done_by
    WHERE m.pool_id = ?
    ORDER BY l.done_date DESC, l.created_at DESC
    LIMIT 100
  `).bind(c.req.param('id')).all()
  return c.json(results)
})

app.delete('/api/pools/:id', requireAuth, requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM pools WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// Re-géocoder manuellement une adresse
app.post('/api/geocode', requireAuth, async (c) => {
  const { address } = await c.req.json()
  const geo = await geocodeAddress(address)
  if (!geo) return c.json({ error: 'Adresse introuvable' }, 404)
  return c.json(geo)
})

// ============================================================
// MAINTENANCES (agenda)
// ============================================================
app.get('/api/maintenances', requireAuth, async (c) => {
  const user = c.get('user')
  // Worker ne voit que ses entretiens assignés ; admin voit tout
  let query = `
    SELECT m.*, p.label as pool_label, p.address as pool_address, p.lat, p.lng,
           p.access_code, p.access_notes, p.treatment_type, p.routine,
           cl.name as client_name, cl.phone as client_phone,
           u.name as assigned_name, u.color as assigned_color
    FROM maintenances m
    JOIN pools p ON p.id = m.pool_id
    JOIN clients cl ON cl.id = p.client_id
    LEFT JOIN users u ON u.id = m.assigned_to
    WHERE m.active = 1
  `
  const binds: any[] = []
  if (user.role !== 'admin') {
    query += ' AND m.assigned_to = ?'
    binds.push(user.uid)
  }
  query += ' ORDER BY m.weekday, m.time'
  const stmt = binds.length ? c.env.DB.prepare(query).bind(...binds) : c.env.DB.prepare(query)
  const { results } = await stmt.all()
  return c.json(results)
})

app.post('/api/maintenances', requireAuth, requireAdmin, async (c) => {
  const b = await c.req.json()
  if (!b.pool_id) return c.json({ error: 'Piscine requise' }, 400)
  const kind = b.kind === 'oneshot' ? 'oneshot' : 'recurring'
  const r = await c.env.DB.prepare(`
    INSERT INTO maintenances (pool_id, assigned_to, kind, weekday, interval_weeks, start_date, end_date, oneshot_date, time, duration_min, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    b.pool_id, b.assigned_to || null, kind,
    kind === 'recurring' ? (b.weekday ?? null) : null,
    kind === 'recurring' ? (b.interval_weeks || 1) : null,
    kind === 'recurring' ? (b.start_date || null) : null,
    kind === 'recurring' ? (b.end_date || null) : null,
    kind === 'oneshot' ? (b.oneshot_date || null) : null,
    b.time || null, b.duration_min || 30, b.notes || null
  ).run()
  return c.json({ id: r.meta.last_row_id })
})

app.put('/api/maintenances/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json()
  const kind = b.kind === 'oneshot' ? 'oneshot' : 'recurring'
  await c.env.DB.prepare(`
    UPDATE maintenances SET pool_id=?, assigned_to=?, kind=?, weekday=?, interval_weeks=?, start_date=?, end_date=?, oneshot_date=?, time=?, duration_min=?, notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    b.pool_id, b.assigned_to || null, kind,
    kind === 'recurring' ? (b.weekday ?? null) : null,
    kind === 'recurring' ? (b.interval_weeks || 1) : null,
    kind === 'recurring' ? (b.start_date || null) : null,
    kind === 'recurring' ? (b.end_date || null) : null,
    kind === 'oneshot' ? (b.oneshot_date || null) : null,
    b.time || null, b.duration_min || 30, b.notes || null, id
  ).run()
  return c.json({ ok: true })
})

app.delete('/api/maintenances/:id', requireAuth, requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM maintenances WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// Marquer un passage effectué (avec relevés d'eau optionnels)
app.post('/api/maintenances/:id/log', requireAuth, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const b = await c.req.json()
  const done_date = b.done_date || new Date().toISOString().slice(0, 10)
  const num = (v: any) => (v === '' || v == null || isNaN(parseFloat(v))) ? null : parseFloat(v)
  await c.env.DB.prepare(`
    INSERT INTO maintenance_logs (maintenance_id, done_by, done_date, status, notes, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, duration_min)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, user.uid, done_date, b.status || 'done', b.notes || null,
    num(b.ph), num(b.chlorine), num(b.salt), num(b.water_temp), num(b.stabilizer), num(b.tac),
    b.products_added || null, b.duration_min ? parseInt(b.duration_min) : null
  ).run()
  return c.json({ ok: true })
})

// Supprimer un log (corriger une erreur de saisie)
app.delete('/api/logs/:id', requireAuth, async (c) => {
  await c.env.DB.prepare('DELETE FROM maintenance_logs WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// Logs sur une plage de dates (pour afficher l'état "fait" sur l'agenda)
app.get('/api/logs', requireAuth, async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')
  let q = `SELECT l.id, l.maintenance_id, l.done_date, l.status, l.done_by, u.name as done_by_name
           FROM maintenance_logs l LEFT JOIN users u ON u.id = l.done_by WHERE 1=1`
  const binds: any[] = []
  if (from) { q += ' AND l.done_date >= ?'; binds.push(from) }
  if (to) { q += ' AND l.done_date <= ?'; binds.push(to) }
  q += ' ORDER BY l.done_date DESC'
  const stmt = binds.length ? c.env.DB.prepare(q).bind(...binds) : c.env.DB.prepare(q)
  const { results } = await stmt.all()
  return c.json(results)
})

// Dashboard : stats du jour et de la semaine
app.get('/api/dashboard', requireAuth, async (c) => {
  const user = c.get('user')
  const today = new Date().toISOString().slice(0, 10)
  // Compteurs basiques (les occurrences réelles sont calculées côté front, mais on remonte les totaux utiles)
  const poolsCount = await c.env.DB.prepare('SELECT COUNT(*) as n FROM pools').first<any>()
  const clientsCount = await c.env.DB.prepare('SELECT COUNT(*) as n FROM clients').first<any>()
  let maintCount
  if (user.role === 'admin') {
    maintCount = await c.env.DB.prepare('SELECT COUNT(*) as n FROM maintenances WHERE active=1').first<any>()
  } else {
    maintCount = await c.env.DB.prepare('SELECT COUNT(*) as n FROM maintenances WHERE active=1 AND assigned_to=?').bind(user.uid).first<any>()
  }
  const doneToday = await c.env.DB.prepare('SELECT COUNT(*) as n FROM maintenance_logs WHERE done_date = ?').bind(today).first<any>()
  return c.json({
    pools: poolsCount?.n || 0,
    clients: clientsCount?.n || 0,
    maintenances: maintCount?.n || 0,
    done_today: doneToday?.n || 0
  })
})

// Historique des passages
app.get('/api/maintenances/:id/logs', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT l.*, u.name as done_by_name FROM maintenance_logs l
    LEFT JOIN users u ON u.id = l.done_by
    WHERE l.maintenance_id = ? ORDER BY l.done_date DESC
  `).bind(c.req.param('id')).all()
  return c.json(results)
})

// Favicon (emoji goutte d'eau en SVG inline pour éviter le 404/500)
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>`
  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' })
})

// ============================================================
// PAGE HTML PRINCIPALE
// ============================================================
app.get('/', (c) => c.html(renderApp()))
app.get('/app', (c) => c.html(renderApp()))

export default app
