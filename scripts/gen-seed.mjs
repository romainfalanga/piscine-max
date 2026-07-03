// Génère le fichier seed-demo.sql avec des hashs PBKDF2 valides (même algo que src/auth.ts)
import { webcrypto as crypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const PBKDF2_ITERATIONS = 100000
const toHex = (arr) => [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(bits))}`
}

// Tous les comptes de démo utilisent le mot de passe "piscine"
const PWD = 'piscine'

const main = async () => {
  const h = await hashPassword(PWD)
  // On génère un hash unique par compte pour le réalisme
  const H = async () => await hashPassword(PWD)

  const lines = []
  lines.push('-- ============================================================')
  lines.push('-- SEED DÉMO Piscine Max (multi-tenant) — mot de passe : piscine')
  lines.push('-- Réinitialise toutes les données de démonstration.')
  lines.push('-- ============================================================')
  lines.push('DELETE FROM photos;')
  lines.push('DELETE FROM maintenance_logs;')
  lines.push('DELETE FROM maintenances;')
  lines.push('DELETE FROM pool_seasons;')
  lines.push('DELETE FROM pools;')
  lines.push('DELETE FROM clients;')
  lines.push('DELETE FROM pro_workers;')
  lines.push('DELETE FROM procedures;')
  lines.push('DELETE FROM users;')
  lines.push("DELETE FROM sqlite_sequence WHERE name IN ('users','clients','pools','maintenances','maintenance_logs','pro_workers','photos','pool_seasons','procedures');")
  lines.push('')

  // ----- UTILISATEURS -----
  // 1 = Franck (pro, le tien), 2 = Romain (worker), 3 = 2e pisciniste démo (Sophie),
  // 4 = intervenant de Sophie, 5+ = comptes clients
  const users = [
    { id: 1, email: 'franck@piscine-max.fr', name: 'Franck', role: 'member', color: '#0891b2', company: 'Piscine Max', phone: '06 12 34 56 78', created_by: null },
    { id: 2, email: 'romain@piscine-max.fr', name: 'Romain', role: 'member', color: '#16a34a', company: null, phone: '06 98 76 54 32', created_by: 1 },
    { id: 3, email: 'sophie@aquazur.fr', name: 'Sophie Marin', role: 'member', color: '#8b5cf6', company: 'AquaZur', phone: '06 11 22 33 44', created_by: null },
    { id: 4, email: 'leo@aquazur.fr', name: 'Léo', role: 'member', color: '#f59e0b', company: null, phone: '06 55 66 77 88', created_by: 3 },
    { id: 5, email: 'client1@piscine-max.fr', name: 'Famille Dubois', role: 'client', color: '#64748b', company: null, phone: null, created_by: 1 },
    { id: 6, email: 'client2@piscine-max.fr', name: 'M. Lefevre', role: 'client', color: '#64748b', company: null, phone: null, created_by: 1 },
  ]
  for (const u of users) {
    const hash = await H()
    lines.push(`INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (${u.id}, '${u.email}', '${hash}', '${u.name.replace(/'/g, "''")}', '${u.role}', '${u.color}', ${u.company ? `'${u.company}'` : 'NULL'}, ${u.phone ? `'${u.phone}'` : 'NULL'}, ${u.created_by ?? 'NULL'});`)
  }
  lines.push('')

  // ----- RELATIONS PRO <-> WORKER -----
  lines.push('INSERT INTO pro_workers (pro_id, worker_id) VALUES (1, 2);  -- Romain bosse pour Franck')
  lines.push('INSERT INTO pro_workers (pro_id, worker_id) VALUES (3, 4);  -- Léo bosse pour Sophie')
  lines.push('INSERT INTO pro_workers (pro_id, worker_id) VALUES (3, 2);  -- Romain bosse AUSSI pour Sophie (un user, 2 employeurs)')
  lines.push('')

  // ----- CLIENTS (owner_id = pisciniste) -----
  // Franck (1) : 4 clients ; Sophie (3) : 2 clients
  const clients = [
    { id: 1, name: 'Famille Dubois', phone: '06 20 11 22 33', email: 'client1@piscine-max.fr', notes: 'Maison avec grand portail bleu. Sonner 2 fois.', owner: 1, account: 5 },
    { id: 2, name: 'M. Lefevre', phone: '06 30 44 55 66', email: 'client2@piscine-max.fr', notes: 'Résidence secondaire, présent surtout l\'été.', owner: 1, account: 6 },
    { id: 3, name: 'Villa Les Mimosas', phone: '04 94 00 11 22', email: 'contact@lesmimosas.fr', notes: 'Location saisonnière, 2 piscines à entretenir.', owner: 1, account: null },
    { id: 4, name: 'Restaurant La Plage', phone: '04 94 33 44 55', email: 'resa@laplage.fr', notes: 'Piscine du restaurant, entretien tôt le matin avant ouverture.', owner: 1, account: null },
    { id: 5, name: 'M. et Mme Garcia', phone: '06 77 88 99 00', email: 'garcia@exemple.fr', notes: 'Client de Sophie.', owner: 3, account: null },
    { id: 6, name: 'Camping Le Pin', phone: '04 94 99 88 77', email: 'camping@lepin.fr', notes: 'Grande piscine collective.', owner: 3, account: null },
  ]
  for (const cl of clients) {
    lines.push(`INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (${cl.id}, '${cl.name.replace(/'/g, "''")}', '${cl.phone}', '${cl.email}', '${cl.notes.replace(/'/g, "''")}', ${cl.owner}, ${cl.account ?? 'NULL'});`)
  }
  lines.push('')

  // ----- PISCINES -----
  // Région du Var (Sanary/Six-Fours/Bandol) — coords réalistes
  const pools = [
    // Franck
    { id: 1, client: 1, owner: 1, label: 'Piscine principale', address: '12 Chemin des Oliviers, 83110 Sanary-sur-Mer', lat: 43.1287, lng: 5.8011, type: 'enterrée', vol: 48, shape: 'rectangulaire', treat: 'sel/électrolyse', filt: 'sable', code: 'B1234', access: 'Portail bleu, local technique au fond du jardin à droite. Chien gentil.', routine: ['Vérifier le niveau d\'eau', 'Nettoyer les skimmers et le préfiltre', 'Tester pH et chlore', 'Brosser les parois', 'Contrôler la pression du filtre'], routine_client: 'Passez le robot 1 à 2 fois par semaine. Maintenez le niveau d\'eau à la moitié des skimmers. Évitez de vous baigner dans les 4h après un ajout de produit.', prio: 1, phmin: 7.0, phmax: 7.4, clmin: 1.0, clmax: 2.0 },
    { id: 2, client: 2, owner: 1, label: 'Piscine', address: '45 Avenue de la Mer, 83140 Six-Fours-les-Plages', lat: 43.0942, lng: 5.8389, type: 'coque', vol: 32, shape: 'haricot', treat: 'chlore', filt: 'cartouche', code: '', access: 'Clé sous le pot de fleurs près de la porte de garage.', routine: ['Tester pH et chlore', 'Nettoyer la ligne d\'eau', 'Vider les paniers'], routine_client: 'Surveillez la couleur de l\'eau. En cas d\'eau trouble, appelez-moi.', prio: 0, phmin: 7.0, phmax: 7.4, clmin: 1.5, clmax: 3.0 },
    { id: 3, client: 3, owner: 1, label: 'Grande piscine', address: '8 Route de Bandol, 83150 Bandol', lat: 43.1355, lng: 5.7531, type: 'béton', vol: 75, shape: 'rectangulaire', treat: 'sel/électrolyse', filt: 'sable', code: 'C5678', access: 'Code portail C5678. Piscine côté terrasse.', routine: ['Analyse complète de l\'eau', 'Nettoyage robot', 'Backwash filtre', 'Contrôle électrolyseur'], routine_client: '', prio: 1, phmin: 7.2, phmax: 7.6, clmin: 1.0, clmax: 2.0 },
    { id: 4, client: 3, owner: 1, label: 'Petit bassin', address: '8 Route de Bandol, 83150 Bandol', lat: 43.1358, lng: 5.7535, type: 'béton', vol: 18, shape: 'carrée', treat: 'chlore', filt: 'cartouche', code: 'C5678', access: 'Même accès que la grande piscine.', routine: ['Tester pH et chlore', 'Nettoyer le bassin'], routine_client: '', prio: 0, phmin: 7.0, phmax: 7.4, clmin: 1.0, clmax: 2.0 },
    { id: 5, client: 4, owner: 1, label: 'Piscine restaurant', address: '2 Promenade du Front de Mer, 83110 Sanary-sur-Mer', lat: 43.1201, lng: 5.7998, type: 'enterrée', vol: 60, shape: 'libre', treat: 'sel/électrolyse', filt: 'verre', code: 'RESTO', access: 'Entrée par l\'arrière, avant 9h. Demander au gérant.', routine: ['Analyse eau', 'Nettoyage complet', 'Vérifier propreté plages'], routine_client: '', prio: 1, phmin: 7.0, phmax: 7.4, clmin: 1.5, clmax: 2.5 },
    // Sophie
    { id: 6, client: 5, owner: 3, label: 'Piscine Garcia', address: '15 Rue des Lauriers, 83000 Toulon', lat: 43.1242, lng: 5.928, type: 'enterrée', vol: 40, shape: 'ovale', treat: 'chlore', filt: 'sable', code: '9012', access: 'Portail vert.', routine: ['pH chlore', 'Skimmers'], routine_client: '', prio: 0, phmin: 7.0, phmax: 7.4, clmin: 1.0, clmax: 2.0 },
    { id: 7, client: 6, owner: 3, label: 'Piscine camping', address: '100 Route des Pins, 83270 Saint-Cyr-sur-Mer', lat: 43.18, lng: 5.71, type: 'béton', vol: 120, shape: 'rectangulaire', treat: 'sel/électrolyse', filt: 'sable', code: 'CAMP', access: 'Voir réception.', routine: ['Analyse', 'Robot', 'Backwash'], routine_client: '', prio: 1, phmin: 7.2, phmax: 7.6, clmin: 1.5, clmax: 3.0 },
  ]
  for (const p of pools) {
    const r = JSON.stringify(p.routine).replace(/'/g, "''")
    const depth = p.depth ?? 1.5
    const interval = p.interval ?? 7
    lines.push(`INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (${p.id}, ${p.client}, ${p.owner}, '${p.label.replace(/'/g, "''")}', '${p.address.replace(/'/g, "''")}', ${p.lat}, ${p.lng}, '${p.type}', ${p.vol}, '${p.shape}', '${p.treat}', '${p.filt}', '${p.code}', '${p.access.replace(/'/g, "''")}', '${r}', '${p.routine_client.replace(/'/g, "''")}', ${p.phmin}, ${p.phmax}, ${p.clmin}, ${p.clmax}, ${p.prio}, 3.0, 5.0, 80, 120, 30, 50, ${depth}, ${interval});`)
  }
  lines.push('')

  // ----- MAINTENANCES (agenda) -----
  // weekday: 1=lundi..7=dimanche
  const maints = [
    { id: 1, pool: 1, assigned: 2, kind: 'recurring', weekday: 2, interval: 1, time: '09:00', dur: 45, notes: 'Entretien hebdo' }, // Franck->Romain mardi
    { id: 2, pool: 2, assigned: 1, kind: 'recurring', weekday: 3, interval: 2, time: '10:30', dur: 30, notes: 'Toutes les 2 semaines' }, // Franck lui-même
    { id: 3, pool: 3, assigned: 2, kind: 'recurring', weekday: 2, interval: 1, time: '11:00', dur: 60, notes: '' }, // Romain mardi
    { id: 4, pool: 4, assigned: 2, kind: 'recurring', weekday: 2, interval: 1, time: '12:15', dur: 20, notes: 'Juste après la grande' },
    { id: 5, pool: 5, assigned: 1, kind: 'recurring', weekday: 5, interval: 1, time: '07:30', dur: 45, notes: 'Avant ouverture resto' }, // Franck vendredi
    { id: 6, pool: 1, assigned: 1, kind: 'oneshot', date: null, time: '14:00', dur: 60, notes: 'Hivernage' },
    // Sophie
    { id: 7, pool: 6, assigned: 4, kind: 'recurring', weekday: 1, interval: 1, time: '09:00', dur: 30, notes: '' },
    { id: 8, pool: 7, assigned: 4, kind: 'recurring', weekday: 4, interval: 1, time: '08:00', dur: 90, notes: '' },
  ]
  // oneshot date = dans 5 jours
  const ds = new Date(); ds.setDate(ds.getDate() + 5)
  const oneshotDate = ds.toISOString().slice(0, 10)
  for (const m of maints) {
    if (m.kind === 'recurring') {
      lines.push(`INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (${m.id}, ${m.pool}, ${m.assigned}, 'recurring', ${m.weekday}, ${m.interval}, '2025-01-01', '${m.time}', ${m.dur}, '${m.notes.replace(/'/g, "''")}');`)
    } else {
      lines.push(`INSERT INTO maintenances (id, pool_id, assigned_to, kind, oneshot_date, time, duration_min, notes) VALUES (${m.id}, ${m.pool}, ${m.assigned}, 'oneshot', '${oneshotDate}', '${m.time}', ${m.dur}, '${m.notes.replace(/'/g, "''")}');`)
    }
  }
  lines.push('')

  // ----- CYCLES SAISONNIERS (démo sur 2 piscines) -----
  // Piscine 1 : cadence forte l'été, faible l'hiver
  const seasons = [
    { pool: 1, label: 'Haute saison', start: '06-01', end: '09-15', interval: 3, weekday: null, order: 0 },
    { pool: 1, label: 'Mi-saison', start: '04-01', end: '05-31', interval: 7, weekday: null, order: 1 },
    { pool: 1, label: 'Automne', start: '09-16', end: '10-31', interval: 7, weekday: null, order: 2 },
    { pool: 1, label: 'Hivernage', start: '11-01', end: '03-31', interval: 30, weekday: null, order: 3 },
    // Piscine 5 (resto, gros volume) : été très soutenu
    { pool: 5, label: 'Pleine saison resto', start: '05-15', end: '09-30', interval: 2, weekday: null, order: 0 },
    { pool: 5, label: 'Hors saison', start: '10-01', end: '05-14', interval: 14, weekday: null, order: 1 },
  ]
  for (const s of seasons) {
    lines.push(`INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (${s.pool}, '${s.label.replace(/'/g, "''")}', '${s.start}', '${s.end}', ${s.interval}, ${s.weekday ?? 'NULL'}, ${s.order}, 1);`)
  }
  lines.push('')

  // ----- LOGS (historique des passages, avec relevés) -----
  // On génère pour la piscine 1 et 3 un historique sur ~8 semaines avec relevés réalistes
  let logId = 1
  const mkLog = (maintId, by, daysAgo, ph, cl, salt, temp, prod, note, stab, tac) => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo)
    const iso = d.toISOString().slice(0, 10)
    lines.push(`INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (${logId}, ${maintId}, ${by}, '${iso}', 'done', ${ph}, ${cl}, ${salt ?? 'NULL'}, ${temp}, ${stab ?? 'NULL'}, ${tac ?? 'NULL'}, ${prod ? `'${prod.replace(/'/g, "''")}'` : 'NULL'}, ${note ? `'${note.replace(/'/g, "''")}'` : 'NULL'}, 45);`)
    logId++
  }
  // Piscine 1 (maint 1) — Romain, 8 semaines, eau qui s'améliore
  const series1 = [
    [56, 7.6, 0.4, 4.2, 27, 'pH- 1L, chlore choc 500g', 'pH un peu haut, corrigé', 35, 110],
    [49, 7.5, 0.6, 4.1, 27, 'pH- 0.5L', 'RAS', 35, 105],
    [42, 7.3, 1.2, 4.0, 26, '', 'Eau nickel', 32, 100],
    [35, 7.2, 1.5, 4.0, 26, '', 'RAS', 30, 100],
    [28, 7.2, 1.6, 3.9, 25, '', 'Filtre nettoyé', 30, 98],
    [21, 7.1, 1.8, 4.0, 24, '', 'RAS', 28, 95],
    [14, 7.2, 1.7, 4.0, 23, '', 'RAS', 30, 100],
    // Dernier passage récent avec eau dégradée → illustre une ALERTE eau dans le centre d'alertes
    [3, 7.9, 0.4, 4.0, 29, '', 'Forte chaleur, chlore consommé — à resurveiller', 30, 100],
  ]
  for (const [d, ph, cl, salt, temp, prod, note, stab, tac] of series1) mkLog(1, 2, d, ph, cl, salt, temp, prod, note, stab, tac)
  // Piscine 3 (maint 3) — Romain
  const series3 = [
    [28, 7.8, 0.8, 4.5, 27, 'pH- 2L', 'pH haut', 40, 120],
    [21, 7.5, 1.4, 4.3, 26, '', 'RAS', 38, 110],
    [14, 7.4, 1.6, 4.2, 25, '', 'RAS', 35, 105],
    [7, 7.3, 1.8, 4.2, 24, '', 'Backwash effectué', 35, 100],
  ]
  for (const [d, ph, cl, salt, temp, prod, note, stab, tac] of series3) mkLog(3, 2, d, ph, cl, salt, temp, prod, note, stab, tac)
  // Piscine 2 (maint 2) — Franck
  mkLog(2, 1, 10, 7.3, 1.5, null, 25, '', 'RAS', 30, 90)
  mkLog(2, 1, 24, 7.4, 1.2, null, 24, 'Chlore lent 1kg', 'Recharge galets', 30, 90)

  lines.push('')

  // ----- PROCÉDURES (bibliothèque de fiches pratiques métier) -----
  const procedures = [
    { id: 1, owner: 1, by: 1, title: 'Changer le préfiltre de la pompe', category: 'Filtration', summary: 'Nettoyer ou remplacer le panier du préfiltre pompe.', content: `1. Couper l'alimentation électrique de la pompe.
2. Fermer les vannes d'aspiration si présentes.
3. Dévisser et retirer le couvercle transparent du préfiltre.
4. Sortir le panier, le vider et le rincer au jet.
5. Vérifier l'état du joint torique, le graisser légèrement si besoin.
6. Remettre le panier, refermer le couvercle, réamorcer la pompe (remplir d'eau avant de redémarrer).
7. Rouvrir les vannes puis remettre sous tension.`, tags: 'préfiltre, pompe, filtration, panier' },
    { id: 2, owner: 1, by: 1, title: 'Changer le sable du filtre à sable', category: 'Filtration', summary: 'Remplacement complet de la charge de sable du filtre, à faire tous les 5 à 7 ans.', content: `1. Couper la pompe et mettre la vanne multivoie sur "Fermé".
2. Vidanger la cuve du filtre (vanne de vidange ou tuyau).
3. Ouvrir la trappe supérieure et retirer l'ancien sable à l'aide d'une pelle/aspirateur à sable (attention à ne pas abîmer la crépine centrale).
4. Rincer soigneusement la cuve.
5. Verser un fond d'eau, puis remplir avec le sable neuf (granulométrie adaptée) jusqu'au niveau indiqué par le fabricant.
6. Refermer la trappe, mettre la vanne sur "Lavage" (backwash) 2-3 minutes.
7. Passer en "Rinçage" 30 secondes, puis repasser en "Filtration".`, tags: 'filtre à sable, backwash, filtration, entretien annuel' },
    { id: 3, owner: 1, by: 1, title: 'Choc chlore (traitement choc)', category: "Traitement de l'eau", summary: "Procédure à appliquer en cas d'eau trouble, verte ou après une forte affluence.", content: `1. Tester le pH et le ramener entre 7.2 et 7.4 avant le choc.
2. Calculer la dose de chlore choc selon le volume du bassin (voir dosage produit).
3. Diluer le chlore choc dans un seau d'eau si c'est un produit en poudre/granulés.
4. Verser progressivement au bord du bassin, filtration en marche.
5. Laisser tourner la filtration en continu au moins 24h.
6. Ne pas se baigner tant que le taux de chlore n'est pas redescendu sous 3 mg/L.
7. Recontrôler pH et chlore le lendemain et ajuster.`, tags: 'chlore choc, eau trouble, eau verte, désinfection' },
    { id: 4, owner: 1, by: 1, title: "Hivernage d'une piscine", category: 'Hivernage / Estivage', summary: "Mise en hivernage passif ou actif avant l'arrêt saisonnier.", content: `1. Nettoyer soigneusement le bassin (brossage parois + fond, aspiration).
2. Équilibrer l'eau (pH 7.2-7.4, TAC correct) et faire un traitement choc.
3. Ajouter un produit d'hivernage adapté au traitement (chlore, sel, brome...).
4. Baisser le niveau d'eau sous les skimmers (hivernage passif) ou laisser tourner la filtration au ralenti (hivernage actif, climat doux).
5. Vider les canalisations exposées au gel, poser les gizzmos/flotteurs anti-gel dans skimmers et refoulements.
6. Démonter, vidanger et stocker au sec la pompe et le filtre si hivernage passif complet.
7. Couvrir le bassin (bâche d'hivernage ou volet).`, tags: 'hivernage, gel, fermeture saisonnière' },
    { id: 5, owner: 1, by: 2, title: 'Remise en route au printemps', category: 'Hivernage / Estivage', summary: "Réouverture de la piscine après hivernage.", content: `1. Retirer la bâche/volet d'hivernage, la nettoyer avant stockage.
2. Retirer les gizzmos et remonter pompe/filtre si démontés.
3. Remonter le niveau d'eau au-dessus des skimmers.
4. Nettoyer le bassin (brossage, aspiration des feuilles et dépôts hivernaux).
5. Faire un backwash complet du filtre avant remise en route.
6. Relancer la filtration en continu 24-48h.
7. Tester et rééquilibrer TAC, pH puis chlore ; refaire un choc si l'eau est trouble.`, tags: 'remise en route, printemps, réouverture' },
    { id: 6, owner: 1, by: 2, title: "Pompe qui ne s'amorce plus", category: 'Dépannage matériel', summary: "Diagnostic rapide en cas de pompe qui tourne mais n'aspire pas l'eau.", content: `1. Vérifier qu'il n'y a pas de prise d'air : contrôler le joint du couvercle du préfiltre et le niveau d'eau du bassin.
2. Nettoyer le panier du préfiltre s'il est colmaté.
3. Vérifier que les vannes d'aspiration sont bien ouvertes.
4. Remplir le préfiltre d'eau manuellement pour réamorcer, remettre le couvercle, redémarrer.
5. Si toujours rien : contrôler le clapet anti-retour et la canalisation d'aspiration pour une fuite d'air.
6. Si le souci persiste, vérifier l'état de la turbine et du moteur (bruit anormal, échauffement).`, tags: 'pompe, amorçage, panne, dépannage' },
    { id: 7, owner: 3, by: 3, title: 'Contrôle électrolyseur au sel', category: "Traitement de l'eau", summary: "Vérification mensuelle d'une installation de traitement au sel.", content: `1. Vérifier le taux de sel avec un testeur dédié (cible générale 3 à 5 g/L, voir notice du bassin).
2. Contrôler les cellules de l'électrolyseur : détartrer si dépôt blanchâtre visible.
3. Vérifier l'affichage du boîtier (% de production, alarme éventuelle).
4. Ajuster la production selon la température de l'eau et la fréquentation.
5. Recontrôler pH et chlore générés après réglage.`, tags: 'sel, électrolyseur, cellule, détartrage' },
    { id: 8, owner: 3, by: 3, title: "Nettoyage de la ligne d'eau", category: 'Nettoyage', summary: 'Retirer les traces de calcaire, graisses et pollens à la ligne de flottaison.', content: `1. Baisser légèrement le niveau d'eau si les traces sont importantes.
2. Utiliser un nettoyant spécial ligne d'eau adapté au revêtement (liner, carrelage, coque).
3. Frotter avec une éponge non abrasive ou une pierre à récurer pour le carrelage.
4. Rincer abondamment pour ne pas polluer l'eau du bassin.
5. Remettre le niveau d'eau au bon repère.`, tags: "ligne d'eau, calcaire, nettoyage, esthétique" },
  ]
  for (const p of procedures) {
    lines.push(`INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (${p.id}, ${p.owner}, ${p.by}, '${p.title.replace(/'/g, "''")}', '${p.category.replace(/'/g, "''")}', '${p.summary.replace(/'/g, "''")}', '${p.content.replace(/'/g, "''")}', '${p.tags.replace(/'/g, "''")}');`)
  }

  lines.push('')
  lines.push('-- Fin du seed démo')

  writeFileSync(new URL('../seed-demo.sql', import.meta.url), lines.join('\n'))
  console.log('seed-demo.sql généré :', lines.length, 'lignes')
}
main()
