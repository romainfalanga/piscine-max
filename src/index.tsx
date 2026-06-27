import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { verifyPassword, createSession, verifySession, hashPassword } from './auth'
import { geocodeAddress } from './geocode'
import { renderApp } from './html'
import { diagnoseWater } from './water'

type Bindings = {
  DB: D1Database
  PHOTOS: R2Bucket
  SESSION_SECRET?: string
}

// Fallback si le secret n'est pas défini en variable d'environnement Cloudflare.
const SESSION_SECRET_FALLBACK = 'piscine-max-secret-change-me-in-prod-2026'
const COOKIE_NAME = 'pm_session'
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30 // 30 jours

function getSecret(c: any): string {
  return (c.env && c.env.SESSION_SECRET) ? c.env.SESSION_SECRET : SESSION_SECRET_FALLBACK
}

// Génère un mot de passe lisible (sans caractères ambigus)
function genPassword(len = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  const arr = crypto.getRandomValues(new Uint8Array(len))
  return [...arr].map((b) => chars[b % chars.length]).join('')
}

type SessionUser = { uid: number; role: string; name: string }

const app = new Hono<{ Bindings: Bindings; Variables: { user: SessionUser } }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================================
// Middlewares d'authentification / rôles
// ============================================================
async function requireAuth(c: any, next: any) {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) return c.json({ error: 'Non authentifié' }, 401)
  const session = await verifySession(token, getSecret(c))
  if (!session) return c.json({ error: 'Session invalide ou expirée' }, 401)
  c.set('user', { uid: session.uid, role: session.role, name: session.name })
  await next()
}

// Réservé aux piscinistes (pro)
async function requirePro(c: any, next: any) {
  const user = c.get('user')
  if (!user || user.role !== 'pro') return c.json({ error: 'Réservé aux piscinistes' }, 403)
  await next()
}

// ============================================================
// Helpers de périmètre (multi-tenant)
// ============================================================
// Renvoie la liste des pro_id dont l'utilisateur courant peut voir les données.
// - pro    : lui-même + (en tant qu'intervenant) les pros qui l'emploient
// - worker : les pros qui l'emploient
// - client : aucun (le client passe par des routes dédiées)
async function visibleProIds(c: any, user: SessionUser): Promise<number[]> {
  const ids = new Set<number>()
  if (user.role === 'pro') ids.add(user.uid)
  // Pros qui emploient cet utilisateur comme intervenant
  const { results } = await c.env.DB.prepare('SELECT pro_id FROM pro_workers WHERE worker_id = ?').bind(user.uid).all()
  for (const r of results as any[]) ids.add(r.pro_id)
  return [...ids]
}

function inClause(ids: number[]): string {
  return ids.length ? ids.map(() => '?').join(',') : 'NULL'
}

// Vérifie qu'une piscine appartient au périmètre du pro courant
async function poolOwnedByPro(c: any, poolId: number, proId: number): Promise<boolean> {
  const row = await c.env.DB.prepare('SELECT owner_id FROM pools WHERE id = ?').bind(poolId).first<any>()
  return !!row && row.owner_id === proId
}

// Vérifie qu'une piscine est dans le périmètre visible (pro/worker), renvoie la piscine ou null.
async function poolInScope(c: any, poolId: any, user: SessionUser): Promise<any | null> {
  const proIds = await visibleProIds(c, user)
  if (!proIds.length) return null
  return await c.env.DB.prepare(`SELECT * FROM pools WHERE id = ? AND owner_id IN (${inClause(proIds)})`).bind(poolId, ...proIds).first<any>()
}

// Vérifie qu'un client connecté a bien accès à une piscine donnée
async function poolBelongsToClient(c: any, poolId: any, clientUserId: number): Promise<boolean> {
  const row = await c.env.DB.prepare(`
    SELECT p.id FROM pools p JOIN clients cl ON cl.id = p.client_id
    WHERE p.id = ? AND cl.client_user_id = ?
  `).bind(poolId, clientUserId).first()
  return !!row
}

// Vérifie l'accès à une piscine quel que soit le rôle (pro/worker via périmètre, client via lien)
async function canAccessPool(c: any, poolId: any, user: SessionUser): Promise<boolean> {
  if (user.role === 'client') return await poolBelongsToClient(c, poolId, user.uid)
  return !!(await poolInScope(c, poolId, user))
}

// Retrouve la piscine liée à un entretien (maintenance)
async function poolIdOfMaintenance(c: any, maintId: any): Promise<number | null> {
  const row = await c.env.DB.prepare('SELECT pool_id FROM maintenances WHERE id = ?').bind(maintId).first<any>()
  return row ? row.pool_id : null
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
  setCookie(c, COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: SESSION_TTL / 1000, path: '/' })
  return c.json({ id: user.id, name: user.name, role: user.role, email: user.email, color: user.color })
})

// Inscription publique d'un PISCINISTE (pro)
app.post('/api/signup', async (c) => {
  const { name, email, password, company, phone } = await c.req.json()
  if (!name || !email || !password) return c.json({ error: 'Nom, email et mot de passe requis' }, 400)
  if (password.length < 4) return c.json({ error: 'Mot de passe trop court (4 caractères min)' }, 400)
  const mail = email.toLowerCase().trim()
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(mail).first()
  if (exists) return c.json({ error: 'Cet email est déjà utilisé' }, 409)
  const hash = await hashPassword(password)
  const colors = ['#0891b2', '#16a34a', '#8b5cf6', '#f59e0b', '#e11d48', '#0ea5e9']
  const color = colors[Math.floor(Math.random() * colors.length)]
  const r = await c.env.DB.prepare('INSERT INTO users (email, password_hash, name, role, color, company, phone) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(mail, hash, name, 'pro', color, company || null, phone || null).run()
  const uid = r.meta.last_row_id as number
  const token = await createSession({ uid, role: 'pro', name, exp: Date.now() + SESSION_TTL }, getSecret(c))
  setCookie(c, COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: SESSION_TTL / 1000, path: '/' })
  return c.json({ id: uid, name, role: 'pro', email: mail, color })
})

app.post('/api/logout', async (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/me', requireAuth, async (c) => {
  const u = c.get('user')
  const user = await c.env.DB.prepare('SELECT id, name, email, role, color, company, phone FROM users WHERE id = ?').bind(u.uid).first()
  return c.json(user)
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
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(new_password), u.uid).run()
  return c.json({ ok: true })
})

// Mettre à jour son profil (nom, société, téléphone)
app.put('/api/me', requireAuth, async (c) => {
  const u = c.get('user')
  const { name, company, phone } = await c.req.json()
  await c.env.DB.prepare('UPDATE users SET name=?, company=?, phone=? WHERE id=?')
    .bind(name || u.name, company || null, phone || null, u.uid).run()
  return c.json({ ok: true })
})

// ============================================================
// ÉQUIPE : intervenants (workers) & relations pro<->worker
// ============================================================
// Liste des intervenants du pro courant (pour l'assignation des entretiens)
app.get('/api/users', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  // L'utilisateur lui-même (s'il est pro, il peut s'auto-assigner) + ses intervenants
  const { results } = await c.env.DB.prepare(`
    SELECT DISTINCT u.id, u.name, u.email, u.role, u.color
    FROM users u
    WHERE u.id = ?
       OR u.id IN (SELECT worker_id FROM pro_workers WHERE pro_id IN (${inClause(proIds)}))
    ORDER BY u.role DESC, u.name
  `).bind(user.uid, ...proIds).all()
  return c.json(results)
})

// Mon équipe : mes intervenants + de qui je suis intervenant
app.get('/api/team', requireAuth, async (c) => {
  const user = c.get('user')
  // Mes intervenants (si je suis pro)
  const myWorkers = await c.env.DB.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.color, u.phone, pw.created_at
    FROM pro_workers pw JOIN users u ON u.id = pw.worker_id
    WHERE pw.pro_id = ? ORDER BY u.name
  `).bind(user.uid).all()
  // Les pros pour qui je travaille (en tant qu'intervenant)
  const myEmployers = await c.env.DB.prepare(`
    SELECT u.id, u.name, u.email, u.company, u.color, u.phone
    FROM pro_workers pw JOIN users u ON u.id = pw.pro_id
    WHERE pw.worker_id = ? ORDER BY u.name
  `).bind(user.uid).all()
  return c.json({ workers: myWorkers.results, employers: myEmployers.results })
})

// Le pro crée un nouvel intervenant (avec mot de passe généré) OU attache un worker existant par email
app.post('/api/team/workers', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const { name, email, password } = await c.req.json()
  if (!email) return c.json({ error: 'Email requis' }, 400)
  const mail = email.toLowerCase().trim()
  let worker = await c.env.DB.prepare('SELECT id, name, role FROM users WHERE email = ?').bind(mail).first<any>()
  let generatedPassword: string | null = null

  if (worker) {
    // L'utilisateur existe déjà : on l'attache simplement comme intervenant
    await c.env.DB.prepare('INSERT OR IGNORE INTO pro_workers (pro_id, worker_id) VALUES (?, ?)').bind(user.uid, worker.id).run()
    return c.json({ id: worker.id, name: worker.name, email: mail, attached: true, generated_password: null })
  }

  // Création d'un nouveau compte intervenant
  if (!name) return c.json({ error: 'Nom requis pour créer un nouvel intervenant' }, 400)
  generatedPassword = password && password.length >= 4 ? password : genPassword()
  const hash = await hashPassword(generatedPassword)
  const r = await c.env.DB.prepare('INSERT INTO users (email, password_hash, name, role, color, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(mail, hash, name, 'worker', '#16a34a', user.uid).run()
  const wid = r.meta.last_row_id as number
  await c.env.DB.prepare('INSERT OR IGNORE INTO pro_workers (pro_id, worker_id) VALUES (?, ?)').bind(user.uid, wid).run()
  return c.json({ id: wid, name, email: mail, attached: false, generated_password: generatedPassword })
})

// Détacher un intervenant de mon équipe
app.delete('/api/team/workers/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare('DELETE FROM pro_workers WHERE pro_id = ? AND worker_id = ?').bind(user.uid, c.req.param('id')).run()
  return c.json({ ok: true })
})

// Réinitialiser le mot de passe d'un intervenant ou client que j'ai créé
app.post('/api/team/reset-password/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const targetId = c.req.param('id')
  // Sécurité : je ne peux réinitialiser que les comptes que j'ai créés
  const target = await c.env.DB.prepare('SELECT id, created_by FROM users WHERE id = ?').bind(targetId).first<any>()
  if (!target || target.created_by !== user.uid) return c.json({ error: 'Action non autorisée' }, 403)
  const newPwd = genPassword()
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(newPwd), targetId).run()
  return c.json({ ok: true, new_password: newPwd })
})

// ============================================================
// CLIENTS
// ============================================================
app.get('/api/clients', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM pools WHERE client_id = c.id) as pool_count,
           cu.email as client_account_email
    FROM clients c
    LEFT JOIN users cu ON cu.id = c.client_user_id
    WHERE c.owner_id IN (${inClause(proIds)})
    ORDER BY c.name
  `).bind(...proIds).all()
  return c.json(results)
})

app.get('/api/clients/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  const client = await c.env.DB.prepare(`
    SELECT c.*, cu.email as client_account_email
    FROM clients c LEFT JOIN users cu ON cu.id = c.client_user_id
    WHERE c.id = ? AND c.owner_id IN (${inClause(proIds)})
  `).bind(c.req.param('id'), ...proIds).first()
  if (!client) return c.json({ error: 'Client introuvable' }, 404)
  const { results: pools } = await c.env.DB.prepare('SELECT * FROM pools WHERE client_id = ? ORDER BY label').bind(c.req.param('id')).all()
  return c.json({ ...client, pools })
})

app.post('/api/clients', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const { name, phone, email, notes } = await c.req.json()
  if (!name) return c.json({ error: 'Le nom est requis' }, 400)
  const r = await c.env.DB.prepare('INSERT INTO clients (name, phone, email, notes, owner_id) VALUES (?, ?, ?, ?, ?)')
    .bind(name, phone || null, email || null, notes || null, user.uid).run()
  return c.json({ id: r.meta.last_row_id, name, phone, email, notes })
})

app.put('/api/clients/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!(await clientOwnedByPro(c, id, user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  const { name, phone, email, notes } = await c.req.json()
  await c.env.DB.prepare('UPDATE clients SET name=?, phone=?, email=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(name, phone || null, email || null, notes || null, id).run()
  return c.json({ ok: true })
})

app.delete('/api/clients/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!(await clientOwnedByPro(c, id, user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

async function clientOwnedByPro(c: any, clientId: any, proId: number): Promise<boolean> {
  const row = await c.env.DB.prepare('SELECT owner_id FROM clients WHERE id = ?').bind(clientId).first<any>()
  return !!row && row.owner_id === proId
}

// Créer un compte d'accès pour un client (mot de passe généré)
app.post('/api/clients/:id/account', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!(await clientOwnedByPro(c, id, user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  const { email } = await c.req.json()
  if (!email) return c.json({ error: 'Email du client requis' }, 400)
  const mail = email.toLowerCase().trim()
  const client = await c.env.DB.prepare('SELECT name, client_user_id FROM clients WHERE id = ?').bind(id).first<any>()
  if (client?.client_user_id) return c.json({ error: 'Ce client a déjà un accès' }, 409)
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(mail).first()
  if (existing) return c.json({ error: 'Cet email est déjà utilisé par un autre compte' }, 409)
  const newPwd = genPassword()
  const r = await c.env.DB.prepare('INSERT INTO users (email, password_hash, name, role, color, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(mail, await hashPassword(newPwd), client.name, 'client', '#64748b', user.uid).run()
  const cuid = r.meta.last_row_id as number
  await c.env.DB.prepare('UPDATE clients SET client_user_id = ?, email = COALESCE(email, ?) WHERE id = ?').bind(cuid, mail, id).run()
  return c.json({ ok: true, email: mail, password: newPwd, user_id: cuid })
})

// Révoquer l'accès d'un client
app.delete('/api/clients/:id/account', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!(await clientOwnedByPro(c, id, user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  const client = await c.env.DB.prepare('SELECT client_user_id FROM clients WHERE id = ?').bind(id).first<any>()
  if (client?.client_user_id) {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND role = ?').bind(client.client_user_id, 'client').run()
    await c.env.DB.prepare('UPDATE clients SET client_user_id = NULL WHERE id = ?').bind(id).run()
  }
  return c.json({ ok: true })
})

// ============================================================
// POOLS (piscines)
// ============================================================
app.get('/api/pools', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  const { results } = await c.env.DB.prepare(`
    SELECT p.*, cl.name as client_name, cl.phone as client_phone
    FROM pools p JOIN clients cl ON cl.id = p.client_id
    WHERE p.owner_id IN (${inClause(proIds)})
    ORDER BY cl.name, p.label
  `).bind(...proIds).all()
  return c.json(results)
})

app.get('/api/pools/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  const pool = await c.env.DB.prepare(`
    SELECT p.*, cl.name as client_name, cl.phone as client_phone, cl.email as client_email
    FROM pools p JOIN clients cl ON cl.id = p.client_id
    WHERE p.id = ? AND p.owner_id IN (${inClause(proIds)})
  `).bind(c.req.param('id'), ...proIds).first()
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

app.post('/api/pools', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  if (!body.client_id || !body.label) return c.json({ error: 'Client et nom de piscine requis' }, 400)
  if (!(await clientOwnedByPro(c, body.client_id, user.uid))) return c.json({ error: 'Client non autorisé' }, 403)
  const geo = await geocodeIfNeeded(body.address, body.lat, body.lng)
  const r = await c.env.DB.prepare(`
    INSERT INTO pools (client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, photos, notes,
      ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority,
      ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.client_id, user.uid, body.label, body.address || null, geo.lat, geo.lng,
    body.pool_type || null, body.volume_m3 || null, body.shape || null,
    body.treatment_type || null, body.filtration_type || null,
    body.access_code || null, body.access_notes || null,
    body.routine || null, body.routine_client || null, body.photos || null, body.notes || null,
    body.ideal_ph_min ?? 7.0, body.ideal_ph_max ?? 7.4,
    body.ideal_chlorine_min ?? 1.0, body.ideal_chlorine_max ?? 2.0,
    body.priority ? 1 : 0,
    body.ideal_salt_min ?? 3.0, body.ideal_salt_max ?? 5.0,
    body.ideal_tac_min ?? 80, body.ideal_tac_max ?? 120,
    body.ideal_stabilizer_min ?? 30, body.ideal_stabilizer_max ?? 50,
    body.depth_avg_m || null, body.expected_interval_days ?? 7
  ).run()
  return c.json({ id: r.meta.last_row_id, ...geo })
})

app.put('/api/pools/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!(await poolOwnedByPro(c, Number(id), user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  const body = await c.req.json()
  const geo = await geocodeIfNeeded(body.address, body.lat, body.lng)
  await c.env.DB.prepare(`
    UPDATE pools SET label=?, address=?, lat=?, lng=?, pool_type=?, volume_m3=?, shape=?, treatment_type=?, filtration_type=?, access_code=?, access_notes=?, routine=?, routine_client=?, photos=?, notes=?,
      ideal_ph_min=?, ideal_ph_max=?, ideal_chlorine_min=?, ideal_chlorine_max=?, priority=?,
      ideal_salt_min=?, ideal_salt_max=?, ideal_tac_min=?, ideal_tac_max=?, ideal_stabilizer_min=?, ideal_stabilizer_max=?, depth_avg_m=?, expected_interval_days=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(
    body.label, body.address || null, geo.lat, geo.lng,
    body.pool_type || null, body.volume_m3 || null, body.shape || null,
    body.treatment_type || null, body.filtration_type || null,
    body.access_code || null, body.access_notes || null,
    body.routine || null, body.routine_client || null, body.photos || null, body.notes || null,
    body.ideal_ph_min ?? 7.0, body.ideal_ph_max ?? 7.4,
    body.ideal_chlorine_min ?? 1.0, body.ideal_chlorine_max ?? 2.0,
    body.priority ? 1 : 0,
    body.ideal_salt_min ?? 3.0, body.ideal_salt_max ?? 5.0,
    body.ideal_tac_min ?? 80, body.ideal_tac_max ?? 120,
    body.ideal_stabilizer_min ?? 30, body.ideal_stabilizer_max ?? 50,
    body.depth_avg_m || null, body.expected_interval_days ?? 7,
    id
  ).run()
  return c.json({ ok: true, ...geo })
})

app.get('/api/pools/:id/history', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  // Vérif périmètre
  const pool = await c.env.DB.prepare(`SELECT id FROM pools WHERE id = ? AND owner_id IN (${inClause(proIds)})`).bind(c.req.param('id'), ...proIds).first()
  if (!pool) return c.json({ error: 'Piscine introuvable' }, 404)
  const { results } = await c.env.DB.prepare(`
    SELECT l.*, u.name as done_by_name, u.color as done_by_color
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    LEFT JOIN users u ON u.id = l.done_by
    WHERE m.pool_id = ?
    ORDER BY l.done_date DESC, l.created_at DESC LIMIT 100
  `).bind(c.req.param('id')).all()
  return c.json(results)
})

app.delete('/api/pools/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!(await poolOwnedByPro(c, Number(id), user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  await c.env.DB.prepare('DELETE FROM pools WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

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
  const proIds = await visibleProIds(c, user)
  let query = `
    SELECT m.*, p.label as pool_label, p.address as pool_address, p.lat, p.lng,
           p.access_code, p.access_notes, p.treatment_type, p.routine,
           cl.name as client_name, cl.phone as client_phone,
           u.name as assigned_name, u.color as assigned_color
    FROM maintenances m
    JOIN pools p ON p.id = m.pool_id
    JOIN clients cl ON cl.id = p.client_id
    LEFT JOIN users u ON u.id = m.assigned_to
    WHERE m.active = 1 AND p.owner_id IN (${inClause(proIds)})
  `
  const binds: any[] = [...proIds]
  // Un intervenant pur (non pro) ne voit que ce qui lui est assigné
  if (user.role === 'worker') {
    query += ' AND m.assigned_to = ?'
    binds.push(user.uid)
  }
  query += ' ORDER BY m.weekday, m.time'
  const { results } = await c.env.DB.prepare(query).bind(...binds).all()
  return c.json(results)
})

app.post('/api/maintenances', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const b = await c.req.json()
  if (!b.pool_id) return c.json({ error: 'Piscine requise' }, 400)
  if (!(await poolOwnedByPro(c, Number(b.pool_id), user.uid))) return c.json({ error: 'Piscine non autorisée' }, 403)
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

app.put('/api/maintenances/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const b = await c.req.json()
  if (!(await poolOwnedByPro(c, Number(b.pool_id), user.uid))) return c.json({ error: 'Piscine non autorisée' }, 403)
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

app.delete('/api/maintenances/:id', requireAuth, requirePro, async (c) => {
  const user = c.get('user')
  const poolId = await poolIdOfMaintenance(c, c.req.param('id'))
  if (poolId == null || !(await poolOwnedByPro(c, poolId, user.uid))) return c.json({ error: 'Action non autorisée' }, 403)
  await c.env.DB.prepare('DELETE FROM maintenances WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// Marquer un passage effectué (avec relevés d'eau optionnels)
app.post('/api/maintenances/:id/log', requireAuth, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Action non autorisée' }, 403)
  // Vérif périmètre : l'entretien doit pointer vers une piscine que l'utilisateur peut voir
  const poolId = await poolIdOfMaintenance(c, id)
  if (poolId == null || !(await poolInScope(c, poolId, user))) return c.json({ error: 'Action non autorisée' }, 403)
  const b = await c.req.json()
  const done_date = b.done_date || new Date().toISOString().slice(0, 10)
  const num = (v: any) => (v === '' || v == null || isNaN(parseFloat(v))) ? null : parseFloat(v)
  const r = await c.env.DB.prepare(`
    INSERT INTO maintenance_logs (maintenance_id, done_by, done_date, status, notes, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, duration_min)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, user.uid, done_date, b.status || 'done', b.notes || null,
    num(b.ph), num(b.chlorine), num(b.salt), num(b.water_temp), num(b.stabilizer), num(b.tac),
    b.products_added || null, b.duration_min ? parseInt(b.duration_min) : null
  ).run()
  return c.json({ ok: true, log_id: r.meta.last_row_id })
})

app.delete('/api/logs/:id', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Action non autorisée' }, 403)
  // Vérif périmètre via la piscine du log
  const row = await c.env.DB.prepare(`
    SELECT m.pool_id FROM maintenance_logs l JOIN maintenances m ON m.id = l.maintenance_id WHERE l.id = ?
  `).bind(c.req.param('id')).first<any>()
  if (!row || !(await poolInScope(c, row.pool_id, user))) return c.json({ error: 'Action non autorisée' }, 403)
  await c.env.DB.prepare('DELETE FROM maintenance_logs WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

app.get('/api/logs', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  const from = c.req.query('from')
  const to = c.req.query('to')
  let q = `SELECT l.id, l.maintenance_id, l.done_date, l.status, l.done_by, u.name as done_by_name
           FROM maintenance_logs l
           JOIN maintenances m ON m.id = l.maintenance_id
           JOIN pools p ON p.id = m.pool_id
           LEFT JOIN users u ON u.id = l.done_by
           WHERE p.owner_id IN (${inClause(proIds)})`
  const binds: any[] = [...proIds]
  if (user.role === 'worker') { q += ' AND m.assigned_to = ?'; binds.push(user.uid) }
  if (from) { q += ' AND l.done_date >= ?'; binds.push(from) }
  if (to) { q += ' AND l.done_date <= ?'; binds.push(to) }
  q += ' ORDER BY l.done_date DESC'
  const { results } = await c.env.DB.prepare(q).bind(...binds).all()
  return c.json(results)
})

app.get('/api/dashboard', requireAuth, async (c) => {
  const user = c.get('user')
  const proIds = await visibleProIds(c, user)
  const today = new Date().toISOString().slice(0, 10)
  const poolsCount = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM pools WHERE owner_id IN (${inClause(proIds)})`).bind(...proIds).first<any>()
  const clientsCount = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM clients WHERE owner_id IN (${inClause(proIds)})`).bind(...proIds).first<any>()
  let maintCount
  if (user.role === 'worker') {
    maintCount = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM maintenances m JOIN pools p ON p.id=m.pool_id WHERE m.active=1 AND m.assigned_to=? AND p.owner_id IN (${inClause(proIds)})`).bind(user.uid, ...proIds).first<any>()
  } else {
    maintCount = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM maintenances m JOIN pools p ON p.id=m.pool_id WHERE m.active=1 AND p.owner_id IN (${inClause(proIds)})`).bind(...proIds).first<any>()
  }
  const doneToday = await c.env.DB.prepare(`
    SELECT COUNT(*) as n FROM maintenance_logs l JOIN maintenances m ON m.id=l.maintenance_id JOIN pools p ON p.id=m.pool_id
    WHERE l.done_date = ? AND p.owner_id IN (${inClause(proIds)})
  `).bind(today, ...proIds).first<any>()
  return c.json({ pools: poolsCount?.n || 0, clients: clientsCount?.n || 0, maintenances: maintCount?.n || 0, done_today: doneToday?.n || 0 })
})

app.get('/api/maintenances/:id/logs', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Action non autorisée' }, 403)
  const poolId = await poolIdOfMaintenance(c, c.req.param('id'))
  if (poolId == null || !(await poolInScope(c, poolId, user))) return c.json({ error: 'Non autorisé' }, 403)
  const { results } = await c.env.DB.prepare(`
    SELECT l.*, u.name as done_by_name FROM maintenance_logs l
    LEFT JOIN users u ON u.id = l.done_by
    WHERE l.maintenance_id = ? ORDER BY l.done_date DESC
  `).bind(c.req.param('id')).all()
  return c.json(results)
})

// ============================================================
// PHOTOS (R2)
// ============================================================
// Upload d'une photo (multipart) liée à une piscine et/ou un passage
app.post('/api/photos', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Action non autorisée' }, 403)
  const form = await c.req.formData()
  const file = form.get('file') as File | null
  const poolId = form.get('pool_id') ? Number(form.get('pool_id')) : null
  const logId = form.get('log_id') ? Number(form.get('log_id')) : null
  const caption = (form.get('caption') as string) || null
  if (!file) return c.json({ error: 'Fichier manquant' }, 400)
  if (file.size > 5 * 1024 * 1024) return c.json({ error: 'Photo trop lourde (max 5 Mo)' }, 400)
  // Vérif périmètre : on ne peut attacher une photo qu'à une piscine qu'on peut voir
  if (poolId != null && !(await poolInScope(c, poolId, user))) return c.json({ error: 'Piscine non autorisée' }, 403)

  const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const key = `photos/${user.uid}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  await c.env.PHOTOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  const r = await c.env.DB.prepare('INSERT INTO photos (r2_key, pool_id, log_id, uploaded_by, caption, content_type) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(key, poolId, logId, user.uid, caption, file.type).run()
  return c.json({ id: r.meta.last_row_id, key, url: `/api/photos/${r.meta.last_row_id}` })
})

// Servir une photo depuis R2 (vérifie le périmètre)
app.get('/api/photos/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const meta = await c.env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(c.req.param('id')).first<any>()
  if (!meta) return c.notFound()
  // Vérif d'accès : pro/worker via owner_id de la piscine, client via client_user_id
  if (meta.pool_id) {
    const pool = await c.env.DB.prepare('SELECT owner_id, client_id FROM pools WHERE id = ?').bind(meta.pool_id).first<any>()
    if (pool) {
      const proIds = await visibleProIds(c, user)
      const allowed = proIds.includes(pool.owner_id)
      let clientAllowed = false
      if (user.role === 'client') {
        const cl = await c.env.DB.prepare('SELECT client_user_id FROM clients WHERE id = ?').bind(pool.client_id).first<any>()
        clientAllowed = !!cl && cl.client_user_id === user.uid
      }
      if (!allowed && !clientAllowed) return c.json({ error: 'Non autorisé' }, 403)
    }
  }
  const obj = await c.env.PHOTOS.get(meta.r2_key)
  if (!obj) return c.notFound()
  return new Response(obj.body, { headers: { 'Content-Type': meta.content_type || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } })
})

// Lister les photos d'une piscine
app.get('/api/pools/:id/photos', requireAuth, async (c) => {
  const user = c.get('user')
  if (!(await canAccessPool(c, c.req.param('id'), user))) return c.json({ error: 'Non autorisé' }, 403)
  const { results } = await c.env.DB.prepare(`
    SELECT id, caption, log_id, created_at FROM photos WHERE pool_id = ? ORDER BY created_at DESC
  `).bind(c.req.param('id')).all()
  return c.json((results as any[]).map(p => ({ ...p, url: `/api/photos/${p.id}` })))
})

app.delete('/api/photos/:id', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Action non autorisée' }, 403)
  const meta = await c.env.DB.prepare('SELECT r2_key, pool_id FROM photos WHERE id = ?').bind(c.req.param('id')).first<any>()
  if (!meta) return c.json({ ok: true })
  // Vérif périmètre via la piscine de la photo
  if (meta.pool_id != null && !(await poolInScope(c, meta.pool_id, user))) return c.json({ error: 'Action non autorisée' }, 403)
  await c.env.PHOTOS.delete(meta.r2_key)
  await c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ============================================================
// DIAGNOSTIC EAU (Tier 1) — calcul à la volée
// ============================================================
// Diagnostic instantané d'un relevé pour une piscine donnée (formulaire de passage)
app.post('/api/diagnose', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Non autorisé' }, 403)
  const b = await c.req.json()
  let pool: any = {}
  if (b.pool_id) {
    const p = await poolInScope(c, Number(b.pool_id), user)
    if (!p) return c.json({ error: 'Piscine non autorisée' }, 403)
    pool = p
  } else {
    // seuils fournis directement (édition à la volée)
    pool = b.pool || {}
  }
  const diag = diagnoseWater(b.reading || b, pool)
  return c.json(diag)
})

// ============================================================
// CENTRE D'ALERTES (Tier 1)
// ============================================================
// Scanne le périmètre : eau hors-norme (dernier relevé), retards de passage.
app.get('/api/alerts', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Non autorisé' }, 403)
  const proIds = await visibleProIds(c, user)
  if (!proIds.length) return c.json({ alerts: [], counts: { alert: 0, warn: 0 } })

  // Toutes les piscines du périmètre (filtrées par assignation si worker)
  let poolQuery = `
    SELECT DISTINCT p.id, p.label, p.volume_m3, p.expected_interval_days, cl.name as client_name,
      p.ideal_ph_min, p.ideal_ph_max, p.ideal_chlorine_min, p.ideal_chlorine_max,
      p.ideal_salt_min, p.ideal_salt_max, p.ideal_tac_min, p.ideal_tac_max,
      p.ideal_stabilizer_min, p.ideal_stabilizer_max
    FROM pools p JOIN clients cl ON cl.id = p.client_id
    LEFT JOIN maintenances m ON m.pool_id = p.id AND m.active = 1
    WHERE p.owner_id IN (${inClause(proIds)})`
  const binds: any[] = [...proIds]
  if (user.role === 'worker') { poolQuery += ' AND m.assigned_to = ?'; binds.push(user.uid) }
  const { results: pools } = await c.env.DB.prepare(poolQuery).bind(...binds).all()

  const today = new Date()
  const alerts: any[] = []

  for (const p of pools as any[]) {
    // Dernier passage (relevé) de la piscine
    const last = await c.env.DB.prepare(`
      SELECT l.done_date, l.ph, l.chlorine, l.salt, l.tac, l.stabilizer
      FROM maintenance_logs l JOIN maintenances m ON m.id = l.maintenance_id
      WHERE m.pool_id = ? AND l.status = 'done'
      ORDER BY l.done_date DESC, l.created_at DESC LIMIT 1
    `).bind(p.id).first<any>()

    // 1) Diagnostic du dernier relevé
    if (last) {
      const diag = diagnoseWater(last, p)
      if (diag.status === 'alert' || diag.status === 'warn') {
        const issues = diag.params.filter((x: any) => x.severity !== 'ok')
        alerts.push({
          type: 'water', level: diag.status, pool_id: p.id, pool_label: p.label, client_name: p.client_name,
          title: diag.summary,
          detail: issues.map((x: any) => `${x.label} ${x.value}${x.unit ? ' ' + x.unit : ''}`).join(' · '),
          params: issues, date: last.done_date
        })
      }
    }

    // 2) Retard de passage
    const interval = p.expected_interval_days
    if (interval && interval > 0) {
      const days = last ? Math.floor((today.getTime() - new Date(last.done_date).getTime()) / 86400000) : 999
      if (days > interval) {
        const overdue = last ? days - interval : null
        const level = (last ? days : interval + 1) > interval * 2 ? 'alert' : 'warn'
        alerts.push({
          type: 'overdue', level, pool_id: p.id, pool_label: p.label, client_name: p.client_name,
          title: last ? `Pas de passage depuis ${days} jours` : 'Aucun passage enregistré',
          detail: last ? `Fréquence attendue : ${interval}j${overdue ? ` · ${overdue}j de retard` : ''}` : `Fréquence attendue : ${interval}j`,
          date: last ? last.done_date : null
        })
      }
    }
  }

  // Tri : alertes d'abord, puis warnings
  alerts.sort((a, b) => (a.level === 'alert' ? 0 : 1) - (b.level === 'alert' ? 0 : 1))
  const counts = { alert: alerts.filter(a => a.level === 'alert').length, warn: alerts.filter(a => a.level === 'warn').length }
  return c.json({ alerts, counts })
})

// ============================================================
// RAPPORT DE PASSAGE (Tier 1) — consultable pro/worker ET client
// ============================================================
app.get('/api/logs/:id/report', requireAuth, async (c) => {
  const user = c.get('user')
  const logId = c.req.param('id')
  const log = await c.env.DB.prepare(`
    SELECT l.*, m.pool_id, u.name as done_by_name, u.company as done_by_company
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    LEFT JOIN users u ON u.id = l.done_by
    WHERE l.id = ?
  `).bind(logId).first<any>()
  if (!log) return c.json({ error: 'Passage introuvable' }, 404)
  if (!(await canAccessPool(c, log.pool_id, user))) return c.json({ error: 'Non autorisé' }, 403)

  const pool = await c.env.DB.prepare(`
    SELECT p.*, cl.name as client_name, owner.name as pro_name, owner.company as pro_company, owner.phone as pro_phone
    FROM pools p JOIN clients cl ON cl.id = p.client_id
    LEFT JOIN users owner ON owner.id = p.owner_id
    WHERE p.id = ?
  `).bind(log.pool_id).first<any>()

  const { results: photos } = await c.env.DB.prepare(
    'SELECT id, caption FROM photos WHERE log_id = ? ORDER BY created_at'
  ).bind(logId).all()

  const diag = diagnoseWater(log, pool || {})
  return c.json({
    log, pool,
    photos: (photos as any[]).map(p => ({ ...p, url: `/api/photos/${p.id}` })),
    diagnosis: diag
  })
})

// ============================================================
// STATISTIQUES (Tier 3)
// ============================================================
app.get('/api/stats', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role === 'client') return c.json({ error: 'Non autorisé' }, 403)
  const proIds = await visibleProIds(c, user)
  if (!proIds.length) return c.json({ months: [], by_user: [], top_pools: [], totals: {} })
  const workerFilter = user.role === 'worker' ? ' AND m.assigned_to = ' + Number(user.uid) : ''

  // Passages par mois (12 derniers mois)
  const { results: months } = await c.env.DB.prepare(`
    SELECT substr(l.done_date,1,7) as month, COUNT(*) as count,
           COALESCE(SUM(l.duration_min),0) as minutes
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    JOIN pools p ON p.id = m.pool_id
    WHERE p.owner_id IN (${inClause(proIds)}) AND l.status='done'${workerFilter}
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).bind(...proIds).all()

  // Répartition par intervenant
  const { results: byUser } = await c.env.DB.prepare(`
    SELECT u.name, u.color, COUNT(*) as count, COALESCE(SUM(l.duration_min),0) as minutes
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    JOIN pools p ON p.id = m.pool_id
    LEFT JOIN users u ON u.id = l.done_by
    WHERE p.owner_id IN (${inClause(proIds)}) AND l.status='done'${workerFilter}
    GROUP BY l.done_by ORDER BY count DESC
  `).bind(...proIds).all()

  // Top piscines (les plus visitées)
  const { results: topPools } = await c.env.DB.prepare(`
    SELECT p.id, p.label, cl.name as client_name, COUNT(*) as count
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    JOIN pools p ON p.id = m.pool_id
    JOIN clients cl ON cl.id = p.client_id
    WHERE p.owner_id IN (${inClause(proIds)}) AND l.status='done'${workerFilter}
    GROUP BY p.id ORDER BY count DESC LIMIT 8
  `).bind(...proIds).all()

  const totalLogs = (months as any[]).reduce((s, m) => s + m.count, 0)
  const totalMin = (months as any[]).reduce((s, m) => s + m.minutes, 0)
  return c.json({
    months: (months as any[]).reverse(),
    by_user: byUser,
    top_pools: topPools,
    totals: { passages: totalLogs, minutes: totalMin }
  })
})

// ============================================================
// MÉTÉO (Tier 3) — Open-Meteo (gratuit, sans clé)
// ============================================================
app.get('/api/weather', requireAuth, async (c) => {
  const lat = c.req.query('lat'), lng = c.req.query('lng')
  if (!lat || !lng) return c.json({ error: 'Coordonnées requises' }, 400)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max&forecast_days=3&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return c.json({ error: 'Météo indisponible' }, 502)
    const data = await res.json() as any
    return c.json(data)
  } catch {
    return c.json({ error: 'Météo indisponible' }, 502)
  }
})

// ============================================================
// ESPACE CLIENT (lecture seule)
// ============================================================
// Les piscines du client connecté
app.get('/api/my/pools', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role !== 'client') return c.json({ error: 'Réservé aux clients' }, 403)
  const { results } = await c.env.DB.prepare(`
    SELECT p.id, p.label, p.address, p.pool_type, p.volume_m3, p.shape, p.treatment_type,
           p.routine_client, p.ideal_ph_min, p.ideal_ph_max, p.ideal_chlorine_min, p.ideal_chlorine_max,
           cl.name as client_name, owner.name as pro_name, owner.company as pro_company, owner.phone as pro_phone
    FROM clients cl
    JOIN pools p ON p.client_id = cl.id
    LEFT JOIN users owner ON owner.id = cl.owner_id
    WHERE cl.client_user_id = ?
    ORDER BY p.label
  `).bind(user.uid).all()
  return c.json(results)
})

// Historique d'une piscine pour le client (vérifie qu'elle lui appartient)
app.get('/api/my/pools/:id/history', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.role !== 'client') return c.json({ error: 'Réservé aux clients' }, 403)
  const poolId = c.req.param('id')
  const owns = await c.env.DB.prepare(`
    SELECT p.id FROM pools p JOIN clients cl ON cl.id = p.client_id
    WHERE p.id = ? AND cl.client_user_id = ?
  `).bind(poolId, user.uid).first()
  if (!owns) return c.json({ error: 'Piscine introuvable' }, 404)
  const { results } = await c.env.DB.prepare(`
    SELECT l.id, l.done_date, l.status, l.notes, l.ph, l.chlorine, l.salt, l.water_temp, l.stabilizer, l.tac, l.products_added, l.duration_min,
           u.name as done_by_name
    FROM maintenance_logs l
    JOIN maintenances m ON m.id = l.maintenance_id
    LEFT JOIN users u ON u.id = l.done_by
    WHERE m.pool_id = ? ORDER BY l.done_date DESC, l.created_at DESC LIMIT 100
  `).bind(poolId).all()
  // Photos par log
  const { results: photos } = await c.env.DB.prepare(`
    SELECT id, log_id, caption FROM photos WHERE pool_id = ? ORDER BY created_at DESC
  `).bind(poolId).all()
  return c.json({ logs: results, photos: (photos as any[]).map(p => ({ ...p, url: `/api/photos/${p.id}` })) })
})

// Favicon
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>`
  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' })
})

app.get('/', (c) => c.html(renderApp()))
app.get('/app', (c) => c.html(renderApp()))

export default app
