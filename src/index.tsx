import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { verifyPassword, createSession, verifySession, hashPassword } from './auth'
import { geocodeAddress } from './geocode'
import { renderApp } from './html'

type Bindings = {
  DB: D1Database
}

const SESSION_SECRET = 'piscine-max-secret-change-me-in-prod-2026'
const COOKIE_NAME = 'pm_session'
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30 // 30 jours

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
  const session = await verifySession(token, SESSION_SECRET)
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
    SESSION_SECRET
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
    INSERT INTO pools (client_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, photos, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.client_id, body.label, body.address || null, geo.lat, geo.lng,
    body.pool_type || null, body.volume_m3 || null, body.shape || null,
    body.treatment_type || null, body.filtration_type || null,
    body.access_code || null, body.access_notes || null,
    body.routine || null, body.photos || null, body.notes || null
  ).run()
  return c.json({ id: r.meta.last_row_id, ...geo })
})

app.put('/api/pools/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  // Re-géocode si l'adresse a changé et qu'on ne fournit pas de coords explicites
  const geo = await geocodeIfNeeded(body.address, body.lat, body.lng)
  await c.env.DB.prepare(`
    UPDATE pools SET label=?, address=?, lat=?, lng=?, pool_type=?, volume_m3=?, shape=?, treatment_type=?, filtration_type=?, access_code=?, access_notes=?, routine=?, photos=?, notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    body.label, body.address || null, geo.lat, geo.lng,
    body.pool_type || null, body.volume_m3 || null, body.shape || null,
    body.treatment_type || null, body.filtration_type || null,
    body.access_code || null, body.access_notes || null,
    body.routine || null, body.photos || null, body.notes || null, id
  ).run()
  return c.json({ ok: true, ...geo })
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

// Marquer un passage effectué
app.post('/api/maintenances/:id/log', requireAuth, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const { done_date, status, notes } = await c.req.json()
  await c.env.DB.prepare('INSERT INTO maintenance_logs (maintenance_id, done_by, done_date, status, notes) VALUES (?, ?, ?, ?, ?)')
    .bind(id, user.uid, done_date, status || 'done', notes || null).run()
  return c.json({ ok: true })
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
