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
    { id: 1, owner: 1, by: 1, type: 'procedure', title: 'Changer le préfiltre de la pompe', category: 'Filtration', summary: 'Nettoyer ou remplacer le panier du préfiltre pompe.', content: `1. Couper l'alimentation électrique de la pompe.
2. Fermer les vannes d'aspiration si présentes.
3. Dévisser et retirer le couvercle transparent du préfiltre.
4. Sortir le panier, le vider et le rincer au jet.
5. Vérifier l'état du joint torique, le graisser légèrement si besoin.
6. Remettre le panier, refermer le couvercle, réamorcer la pompe (remplir d'eau avant de redémarrer).
7. Rouvrir les vannes puis remettre sous tension.`, tags: 'préfiltre, pompe, filtration, panier' },
    { id: 2, owner: 1, by: 1, type: 'procedure', title: 'Changer le sable du filtre à sable', category: 'Filtration', summary: 'Remplacement complet de la charge de sable du filtre, à faire tous les 5 à 7 ans.', content: `1. Couper la pompe et mettre la vanne multivoie sur "Fermé".
2. Vidanger la cuve du filtre (vanne de vidange ou tuyau).
3. Ouvrir la trappe supérieure et retirer l'ancien sable à l'aide d'une pelle/aspirateur à sable (attention à ne pas abîmer la crépine centrale).
4. Rincer soigneusement la cuve.
5. Verser un fond d'eau, puis remplir avec le sable neuf (granulométrie adaptée) jusqu'au niveau indiqué par le fabricant.
6. Refermer la trappe, mettre la vanne sur "Lavage" (backwash) 2-3 minutes.
7. Passer en "Rinçage" 30 secondes, puis repasser en "Filtration".`, tags: 'filtre à sable, backwash, filtration, entretien annuel' },
    { id: 3, owner: 1, by: 1, type: 'procedure', title: 'Choc chlore (traitement choc)', category: "Traitement de l'eau", summary: "Procédure à appliquer en cas d'eau trouble, verte ou après une forte affluence.", content: `1. Tester le pH et le ramener entre 7.2 et 7.4 avant le choc.
2. Calculer la dose de chlore choc selon le volume du bassin (voir dosage produit).
3. Diluer le chlore choc dans un seau d'eau si c'est un produit en poudre/granulés.
4. Verser progressivement au bord du bassin, filtration en marche.
5. Laisser tourner la filtration en continu au moins 24h.
6. Ne pas se baigner tant que le taux de chlore n'est pas redescendu sous 3 mg/L.
7. Recontrôler pH et chlore le lendemain et ajuster.`, tags: 'chlore choc, eau trouble, eau verte, désinfection' },
    { id: 4, owner: 1, by: 1, type: 'procedure', title: "Hivernage d'une piscine", category: 'Hivernage / Estivage', summary: "Mise en hivernage passif ou actif avant l'arrêt saisonnier.", content: `1. Nettoyer soigneusement le bassin (brossage parois + fond, aspiration).
2. Équilibrer l'eau (pH 7.2-7.4, TAC correct) et faire un traitement choc.
3. Ajouter un produit d'hivernage adapté au traitement (chlore, sel, brome...).
4. Baisser le niveau d'eau sous les skimmers (hivernage passif) ou laisser tourner la filtration au ralenti (hivernage actif, climat doux).
5. Vider les canalisations exposées au gel, poser les gizzmos/flotteurs anti-gel dans skimmers et refoulements.
6. Démonter, vidanger et stocker au sec la pompe et le filtre si hivernage passif complet.
7. Couvrir le bassin (bâche d'hivernage ou volet).`, tags: 'hivernage, gel, fermeture saisonnière' },
    { id: 5, owner: 1, by: 2, type: 'procedure', title: 'Remise en route au printemps', category: 'Hivernage / Estivage', summary: "Réouverture de la piscine après hivernage.", content: `1. Retirer la bâche/volet d'hivernage, la nettoyer avant stockage.
2. Retirer les gizzmos et remonter pompe/filtre si démontés.
3. Remonter le niveau d'eau au-dessus des skimmers.
4. Nettoyer le bassin (brossage, aspiration des feuilles et dépôts hivernaux).
5. Faire un backwash complet du filtre avant remise en route.
6. Relancer la filtration en continu 24-48h.
7. Tester et rééquilibrer TAC, pH puis chlore ; refaire un choc si l'eau est trouble.`, tags: 'remise en route, printemps, réouverture' },
    { id: 6, owner: 1, by: 2, type: 'procedure', title: "Pompe qui ne s'amorce plus", category: 'Dépannage matériel', summary: "Diagnostic rapide en cas de pompe qui tourne mais n'aspire pas l'eau.", content: `1. Vérifier qu'il n'y a pas de prise d'air : contrôler le joint du couvercle du préfiltre et le niveau d'eau du bassin.
2. Nettoyer le panier du préfiltre s'il est colmaté.
3. Vérifier que les vannes d'aspiration sont bien ouvertes.
4. Remplir le préfiltre d'eau manuellement pour réamorcer, remettre le couvercle, redémarrer.
5. Si toujours rien : contrôler le clapet anti-retour et la canalisation d'aspiration pour une fuite d'air.
6. Si le souci persiste, vérifier l'état de la turbine et du moteur (bruit anormal, échauffement).`, tags: 'pompe, amorçage, panne, dépannage' },
    { id: 7, owner: 3, by: 3, type: 'procedure', title: 'Contrôle électrolyseur au sel', category: "Traitement de l'eau", summary: "Vérification mensuelle d'une installation de traitement au sel.", content: `1. Vérifier le taux de sel avec un testeur dédié (cible générale 3 à 5 g/L, voir notice du bassin).
2. Contrôler les cellules de l'électrolyseur : détartrer si dépôt blanchâtre visible.
3. Vérifier l'affichage du boîtier (% de production, alarme éventuelle).
4. Ajuster la production selon la température de l'eau et la fréquentation.
5. Recontrôler pH et chlore générés après réglage.`, tags: 'sel, électrolyseur, cellule, détartrage' },
    { id: 8, owner: 3, by: 3, type: 'procedure', title: "Nettoyage de la ligne d'eau", category: 'Nettoyage', summary: 'Retirer les traces de calcaire, graisses et pollens à la ligne de flottaison.', content: `1. Baisser légèrement le niveau d'eau si les traces sont importantes.
2. Utiliser un nettoyant spécial ligne d'eau adapté au revêtement (liner, carrelage, coque).
3. Frotter avec une éponge non abrasive ou une pierre à récurer pour le carrelage.
4. Rincer abondamment pour ne pas polluer l'eau du bassin.
5. Remettre le niveau d'eau au bon repère.`, tags: "ligne d'eau, calcaire, nettoyage, esthétique" },
    { id: 9, owner: 1, by: 1, type: 'procedure', title: 'Nettoyer et détartrer un filtre à cartouche', category: 'Filtration', summary: 'Entretien régulier de la ou des cartouches filtrantes.', content: `1. Couper la pompe et fermer les vannes si présentes.
2. Ouvrir la cuve du filtre et sortir la ou les cartouches.
3. Rincer au jet d'eau en insistant entre les plis, du haut vers le bas.
4. Si la cartouche est encrassée ou entartrée, la tremper une nuit dans un bain de détartrant/dégraissant spécial cartouche.
5. Rincer à nouveau abondamment avant remontage.
6. Vérifier l'état du joint de cuve, le remplacer si craquelé.
7. Remonter, réamorcer la pompe et relancer la filtration.
8. Prévoir le remplacement complet de la cartouche tous les 2 à 3 ans ou dès qu'elle est déformée/percée.`, tags: 'cartouche, filtre, détartrage, nettoyage' },
    { id: 10, owner: 1, by: 2, type: 'procedure', title: 'Recharger un filtre à diatomées', category: 'Filtration', summary: 'Nettoyage des éléments filtrants et rechargement en terre de diatomées.', content: `1. Couper la pompe, fermer les vannes, mettre la vanne multivoie sur "Vidange".
2. Vidanger la cuve et retirer les grilles (éléments filtrants).
3. Rincer soigneusement les éléments filtrants au jet, en éliminant tous les résidus de terre de diatomées.
4. Vérifier l'état des toiles/grilles et les remplacer si déchirées.
5. Remonter les éléments, refermer la cuve.
6. Mettre en "Filtration", démarrer la pompe et introduire la nouvelle charge de diatomées par le skimmer, dosée selon la surface filtrante du filtre (voir notice fabricant).
7. Vérifier que l'eau ressort claire avant de considérer l'opération terminée.`, tags: 'diatomées, filtre, rechargement, précoat' },
    { id: 11, owner: 1, by: 1, type: 'procedure', title: "Purger l'air et réamorcer le circuit de filtration", category: 'Filtration', summary: 'À faire après toute intervention sur le circuit hydraulique ou en cas de prise d\'air.', content: `1. Couper la pompe et fermer les vannes d'aspiration/refoulement.
2. Ouvrir le purgeur d'air du filtre (vis ou bouchon sur le dessus de la cuve).
3. Remplir le préfiltre de la pompe avec de l'eau avant de refermer le couvercle.
4. Rouvrir les vannes, remettre la pompe sous tension.
5. Laisser le purgeur ouvert jusqu'à ce qu'un filet d'eau continu (sans air) en sorte, puis le refermer.
6. Vérifier la pression au manomètre : une pression normale confirme l'amorçage réussi.
7. Si l'air revient en continu, rechercher une prise d'air (joint de préfiltre, raccord, niveau d'eau du bassin insuffisant).`, tags: 'amorçage, purge, air, circuit hydraulique' },
    { id: 12, owner: 1, by: 2, type: 'procedure', title: 'Nettoyer le panier du skimmer', category: 'Filtration', summary: 'Entretien hebdomadaire de base, à faire plus souvent en période de feuilles/pollens.', content: `1. Couper la filtration.
2. Ouvrir le couvercle du skimmer et retirer le panier.
3. Vider les débris et rincer le panier au jet.
4. Vérifier le clapet anti-retour (volet) situé au fond du skimmer.
5. Vérifier le joint du couvercle et l'état du skimmer (fissures).
6. Remettre le panier en place, refermer le couvercle, relancer la filtration.
7. À faire au minimum une fois par semaine en pleine saison.`, tags: 'skimmer, panier, entretien hebdomadaire' },
    { id: 13, owner: 1, by: 1, type: 'procedure', title: 'Contrôler et purger la pression du filtre', category: 'Filtration', summary: 'Surveillance du manomètre pour anticiper le colmatage du filtre.', content: `1. Relever la pression au manomètre en filtration normale (valeur de référence à noter dès l'installation, ex. 0,6 à 0,8 bar).
2. Si la pression a augmenté de 0,2 à 0,3 bar par rapport à la valeur de référence, le filtre est encrassé : procéder à un lavage (backwash pour sable/diatomées, nettoyage pour cartouche).
3. Si la pression est anormalement basse, vérifier qu'il n'y a pas de manque de débit en amont (préfiltre bouché, vanne fermée).
4. Après un backwash, purger l'air résiduel du filtre via le purgeur avant de remettre en filtration.
5. Noter la pression après nettoyage pour garder une référence à jour.`, tags: 'pression, manomètre, backwash, filtre' },
    { id: 14, owner: 1, by: 2, type: 'procedure', title: 'Rattraper une eau verte', category: "Traitement de l'eau", summary: 'Protocole complet de traitement curatif contre les algues vertes.', content: `1. Analyser pH, TAC et chlore avant toute intervention.
2. Ramener le pH entre 7.0 et 7.4 (l'eau verte fait souvent suite à un pH mal réglé ou un manque de chlore).
3. Brosser énergiquement parois et fond pour décoller les algues.
4. Faire un traitement choc au chlore non stabilisé (dose renforcée selon le volume, voir fiche dosage).
5. Laisser tourner la filtration en continu 24 à 48h, nettoyer le filtre à mi-parcours si la pression grimpe vite.
6. Aspirer les dépôts d'algues mortes au fond à l'évacuation (pas à travers le filtre si les dépôts sont importants).
7. Recontrôler chlore et pH le lendemain, renouveler le choc si l'eau reste trouble.`, tags: 'eau verte, algues, choc chlore, rattrapage' },
    { id: 15, owner: 1, by: 1, type: 'procedure', title: 'Rattraper une eau trouble ou laiteuse (floculation)', category: "Traitement de l'eau", summary: 'Clarification d\'une eau trouble par floculation.', content: `1. Vérifier et équilibrer pH (7.2-7.4) et chlore avant floculation (le floculant est inefficace si le pH est déséquilibré).
2. Nettoyer le filtre avant traitement pour repartir sur une filtration efficace.
3. Verser le floculant liquide directement devant les buses de refoulement, filtration en marche, ou utiliser des cartouches/galets de floculant dans le skimmer selon le produit.
4. Laisser agir avec une filtration continue de plusieurs heures : les particules en suspension s'agglomèrent en flocons.
5. Pour un filtre à sable : baisser le débit ou passer en position "Recirculation" quelques minutes pour laisser les flocons se déposer, puis repasser en "Filtration" en douceur (éviter le backwash qui renvoie tout au fond).
6. Aspirer manuellement à l'évacuation (hors filtre) les dépôts qui se sont déposés au fond.
7. Nettoyer le filtre une fois l'eau limpide.`, tags: 'eau trouble, floculation, laiteuse, clarification' },
    { id: 16, owner: 1, by: 2, type: 'procedure', title: 'Traiter les algues moutarde (jaunes)', category: "Traitement de l'eau", summary: 'Algues jaunâtres résistantes au chlore classique, souvent dans les zones ombragées.', content: `1. Identifier : dépôt jaunâtre, poudreux, qui se redépose vite après brossage, souvent dans les zones ombragées et les paniers de skimmer.
2. Brosser énergiquement toutes les surfaces touchées et les accessoires (échelle, jouets, maillots à laver aussi car elles s'y accrochent).
3. Réaliser un traitement choc avec un produit anti-algues moutarde spécifique en complément du chlore choc.
4. Nettoyer soigneusement le filtre pendant le traitement (elles s'y logent).
5. Filtration continue 24 à 48h, recontrôler et répéter le brossage/choc si nécessaire.`, tags: 'algues moutarde, algues jaunes, traitement' },
    { id: 17, owner: 1, by: 1, type: 'procedure', title: 'Traiter les algues noires', category: "Traitement de l'eau", summary: 'Les plus résistantes, incrustées dans les joints et micro-fissures.', content: `1. Identifier : taches noires/bleu-vert incrustées, résistantes au brossage simple, souvent sur joints de carrelage ou liner abîmé.
2. Brosser vigoureusement avec une brosse adaptée au revêtement (brosse inox pour béton/carrelage uniquement, jamais sur liner) pour casser la membrane protectrice de l'algue.
3. Appliquer un traitement anti-algues noires concentré directement sur les taches (produit à action choc localisée).
4. Compléter par un traitement choc chlore de l'ensemble du bassin.
5. Filtration continue, renouveler l'opération après quelques jours si les taches persistent.`, tags: 'algues noires, traitement résistant, joints' },
    { id: 18, owner: 1, by: 2, type: 'procedure', title: 'Ajuster le TAC (alcalinité)', category: "Traitement de l'eau", summary: 'Toujours le premier paramètre à corriger, avant le pH.', content: `1. Mesurer le TAC (cible 80-120 mg/L / 8-12 °f) avant toute autre correction : c'est toujours le premier paramètre à régler.
2. Si le TAC est trop bas : ajouter un rehausseur de TAC (bicarbonate de sodium), filtration en marche, en une ou plusieurs fois selon la dose totale à apporter.
3. Si le TAC est trop haut : ajouter un réducteur de TAC (acide) par petites doses successives, en laissant agir et recirculer entre chaque ajout.
4. Attendre plusieurs heures (idéalement 24h) filtration en marche avant de recontrôler.
5. Une fois le TAC stabilisé, passer au réglage du pH.`, tags: 'TAC, alcalinité, rehausseur, réducteur' },
    { id: 19, owner: 1, by: 1, type: 'procedure', title: 'Ajuster le pH (hausse et baisse)', category: "Traitement de l'eau", summary: 'À régler après le TAC, en plusieurs petits ajouts.', content: `1. Mesurer le pH (cible 7.2-7.4) après avoir réglé le TAC.
2. Pour baisser le pH : verser le pH- (liquide ou poudre) directement dans le bassin, filtration en marche, en respectant la dose indiquée sur l'emballage pour le volume du bassin.
3. Pour augmenter le pH : verser le pH+ de la même façon.
4. Ne jamais mélanger pH- et pH+ dans le même traitement, et ne jamais verser un produit concentré directement sur le revêtement ou dans le skimmer.
5. Attendre au moins 2 à 4h, filtration en marche, avant de recontrôler et ajuster à nouveau si besoin.
6. Répartir en plusieurs petits ajouts plutôt qu'une grosse dose unique pour éviter les à-coups.`, tags: 'pH, pH plus, pH moins, équilibre eau' },
    { id: 20, owner: 1, by: 2, type: 'procedure', title: 'Pompe bruyante ou qui chauffe anormalement', category: 'Dépannage matériel', summary: 'Diagnostic des causes courantes de bruit et surchauffe moteur.', content: `1. Couper l'alimentation avant toute intervention.
2. Vérifier une prise d'air (bruit de "gargouillis") : contrôler joint de préfiltre, niveau d'eau, vannes d'aspiration.
3. Vérifier qu'aucun corps étranger n'est coincé dans la turbine (démontage du corps de pompe si besoin).
4. Contrôler que la pompe n'est pas désamorcée ou qu'elle ne fonctionne pas à sec.
5. Vérifier l'état des roulements moteur (bruit métallique aigu = roulements à changer, intervention SAV).
6. Vérifier la ventilation du local technique : un moteur qui chauffe dans un local mal ventilé disjoncte par sécurité thermique.
7. Contrôler la tension d'alimentation et l'état du condensateur si moteur monophasé qui peine à démarrer.`, tags: 'pompe, bruit, surchauffe, dépannage, roulements' },
    { id: 21, owner: 1, by: 1, type: 'procedure', title: 'Perte de pression ou débit insuffisant malgré filtration', category: 'Dépannage matériel', summary: 'Méthode de diagnostic étape par étape.', content: `1. Vérifier le panier du préfiltre pompe et celui des skimmers : un colmatage réduit fortement le débit.
2. Contrôler la pression au manomètre : si elle est haute, le filtre est encrassé (backwash/nettoyage nécessaire) ; si elle est basse, le souci est en amont du filtre.
3. Vérifier les vannes (position, ouverture complète) et l'absence de vanne partiellement fermée par erreur.
4. Rechercher un colmatage dans les canalisations (feuilles, racines sur réseau enterré ancien).
5. Vérifier que la pompe est bien dimensionnée par rapport au filtre et au volume du bassin.
6. Contrôler l'état de la turbine (usure, entartrage) si le débit reste faible après élimination des autres causes.`, tags: 'débit, pression, colmatage, dépannage' },
    { id: 22, owner: 1, by: 2, type: 'procedure', title: 'Étalonner une sonde de régulation pH/redox', category: 'Dépannage matériel', summary: 'Étalonnage recommandé tous les 1 à 3 mois pour une régulation fiable.', content: `1. Couper ou mettre en pause la régulation automatique (pH, chlore/redox) avant l'étalonnage.
2. Démonter la sonde et la rincer à l'eau claire.
3. Tremper la sonde dans une solution étalon pH 7, attendre la stabilisation de la mesure, ajuster si l'appareil le permet (bouton "cal").
4. Rincer puis tremper dans une solution étalon pH 4 (ou 10 selon la plage utilisée), ajuster la pente.
5. Pour une sonde redox : utiliser une solution étalon redox dédiée (souvent 465 mV) et ajuster de la même façon.
6. Rincer, remonter la sonde, relancer la régulation et vérifier la cohérence avec une mesure manuelle (test kit ou photomètre).`, tags: 'sonde, régulation, redox, pH, étalonnage' },
    { id: 23, owner: 1, by: 1, type: 'procedure', title: 'Pompe à chaleur qui ne chauffe plus ou disjoncte', category: 'Dépannage matériel', summary: 'Points de contrôle avant intervention d\'un frigoriste agréé.', content: `1. Vérifier que la filtration est bien en marche : une PAC ne chauffe que lorsque l'eau circule (contact de débit).
2. Contrôler la température de consigne et le mode (chauffage/éco) sur le panneau de commande.
3. Vérifier qu'aucun code défaut n'est affiché ; noter le code pour diagnostic ou SAV.
4. Contrôler que l'unité extérieure n'est pas obstruée (feuilles, végétation) et que l'air circule librement autour de l'évaporateur.
5. Vérifier le dégivrage : en dessous de 10-12°C d'air extérieur, un cycle de dégivrage périodique est normal.
6. Si la PAC disjoncte : couper, vérifier l'absence d'humidité dans le boîtier électrique, contrôler le différentiel dédié ; ne pas forcer une remise sous tension répétée, faire intervenir un frigoriste agréé si le défaut persiste.
7. Vérifier le dimensionnement : une PAC sous-dimensionnée peine à maintenir la température par temps frais, ce n'est pas toujours une panne.`, tags: 'pompe à chaleur, PAC, chauffage, dépannage, disjoncte' },
    { id: 24, owner: 1, by: 2, type: 'procedure', title: 'Détecter une fuite sur le circuit hydraulique', category: 'Dépannage matériel', summary: 'Méthode du test du seau et recherche de fuite.', content: `1. Constater une baisse anormale du niveau d'eau (plus de 2 à 3 cm/jour hors évaporation naturelle) : suspecter une fuite.
2. Faire le test du seau (bucket test) : comparer la baisse de niveau du bassin à celle d'un seau rempli posé sur une marche, filtration coupée, sur 24h.
3. Si la fuite persiste filtration coupée : elle est sur la structure du bassin (liner, coque, joints de pièces à sceller).
4. Si la fuite n'apparaît qu'en filtration : elle est sur le circuit hydraulique (canalisations, vannes, joints de pompe/filtre).
5. Inspecter visuellement le local technique et les raccords apparents à la recherche de traces d'humidité.
6. Pour une recherche plus poussée : test à la fumée, colorant traceur sur les points suspects (pièces à sceller, skimmer), ou intervention d'un spécialiste avec électro-détection.
7. Réparer localement (joint, collage, résine étanche) ou faire appel à un professionnel pour une fuite structurelle.`, tags: 'fuite, test du seau, niveau d\'eau, dépannage' },
    { id: 25, owner: 1, by: 1, type: 'procedure', title: 'Remplacer une ampoule ou un spot LED étanche', category: 'Dépannage matériel', summary: 'Intervention sur un projecteur de piscine, hors tension impérative.', content: `1. Couper impérativement l'alimentation électrique du projecteur au disjoncteur dédié (jamais d'intervention sous tension en milieu humide).
2. Baisser le niveau d'eau sous le niveau du projecteur si celui-ci doit être sorti de sa niche.
3. Dévisser la vis de sécurité (souvent imperdable) et sortir délicatement le hublot sans tirer sur le câble.
4. Remplacer l'ampoule/le bloc LED par un modèle strictement identique (culot, puissance, tension : 12V pour la plupart des piscines privées).
5. Vérifier et remplacer le joint torique d'étanchéité du hublot avant remontage (graisse silicone légère).
6. Revisser en croix pour une pression homogène, remettre l'eau à niveau, puis remettre sous tension et tester.`, tags: 'projecteur, spot, LED, éclairage, dépannage' },
    { id: 26, owner: 3, by: 3, type: 'procedure', title: 'Vérifier les dispositifs de sécurité obligatoires', category: 'Sécurité', summary: 'Contrôle périodique des équipements normalisés (barrière, alarme, couverture, abri).', content: `1. Identifier le(s) dispositif(s) normalisé(s) installé(s) sur le bassin (barrière NF P90-306, alarme NF P90-307, couverture NF P90-308 ou abri NF P90-309).
2. Barrière : vérifier la hauteur (≥1,10 m), l'absence de prise d'escalade, et surtout le bon fonctionnement du portillon à fermeture et verrouillage automatiques.
3. Alarme : tester le déclenchement (immersion ou périmétrique) et vérifier l'état des piles ; s'assurer qu'elle est réarmée après chaque baignade.
4. Couverture de sécurité : vérifier la tension, l'état des sangles/ancrages, l'absence de déchirure, et sa capacité à supporter le poids d'un enfant.
5. Abri : vérifier le bon coulissement et le verrouillage effectif de la fermeture.
6. Rappeler au client qu'aucun dispositif ne remplace la surveillance active d'un adulte.
7. Consigner la vérification dans la fiche piscine (date, dispositif, état constaté).`, tags: 'sécurité, norme NF P90, barrière, alarme, couverture, abri' },
    { id: 27, owner: 3, by: 4, type: 'procedure', title: "Mise en eau d'une piscine neuve", category: 'Mise en service', summary: 'Premier remplissage et équilibrage d\'un bassin neuf.', content: `1. Vérifier que le bassin est propre (aucun débris de chantier) avant le premier remplissage.
2. Remplir progressivement en surveillant la stabilité de la structure (coque/liner) en respectant les préconisations du poseur.
3. Une fois remplie, mettre en route la filtration en continu pendant 24 à 48h pour homogénéiser l'eau.
4. Réaliser une analyse complète (pH, TAC, TH, chlore, stabilisant) : l'eau de remplissage est rarement équilibrée d'origine.
5. Corriger dans l'ordre : TAC, puis pH, puis TH si besoin.
6. Mettre en route le traitement choisi (chlore, sel...) et laisser le système se stabiliser plusieurs jours avant de considérer l'eau baignable en continu.
7. Ne pas se baigner avant validation des paramètres et respect des délais de sécurité après un traitement choc.`, tags: 'mise en eau, piscine neuve, premier remplissage' },
    { id: 28, owner: 3, by: 3, type: 'procedure', title: 'Entretien et désinfection d\'un spa ou bain à remous', category: 'Nettoyage', summary: 'Entretien renforcé du fait du faible volume et de la température élevée.', content: `1. Couper la filtration/chauffage avant intervention.
2. Nettoyer le filtre (cartouche le plus souvent) selon la fréquence préconisée, plus rapprochée que pour une piscine.
3. Contrôler et ajuster pH, TAC et désinfectant (chlore ou brome, souvent privilégié pour les eaux chaudes) à chaque intervention.
4. Vérifier la température (30-40°C typiquement) : cette plage favorise la prolifération de légionelles si l'entretien est négligé.
5. Réaliser une vidange complète et un nettoyage des canalisations avec un produit dégraissant spécial spa tous les 3 à 4 mois.
6. Nettoyer la ligne d'eau et les buses de massage à la brosse douce.
7. Remplir, réajuster les paramètres et relancer avant remise en service.`, tags: 'spa, bain à remous, désinfection, légionellose, entretien' },
    { id: 53, owner: 1, by: 1, type: 'procedure', title: 'Tester le pH et le chlore avec un kit à pastilles (DPD)', category: 'Analyse & routine', summary: 'La méthode de référence sur le terrain : Phenol Red pour le pH, DPD1 pour le chlore libre.', content: `1. Rincer l'éprouvette du testeur avec l'eau du bassin avant le prélèvement.
2. Prélever l'eau à environ 30-40 cm de profondeur, loin des buses de refoulement et des skimmers, pour un échantillon représentatif.
3. Remplir les deux cupules du comparateur jusqu'au repère indiqué.
4. Déposer une pastille Phenol Red dans la cupule pH, une pastille DPD1 dans la cupule chlore.
5. Refermer, agiter légèrement jusqu'à dissolution complète des pastilles.
6. Comparer immédiatement les couleurs obtenues à l'échelle colorimétrique du testeur, à la lumière du jour (jamais en plein soleil direct ni à l'ombre trop sombre).
7. Noter les valeurs et les comparer aux cibles (pH 7.2-7.4, chlore libre 1-3 mg/L).
8. Rincer immédiatement le testeur à l'eau claire après lecture pour éviter toute contamination du test suivant.`, tags: 'DPD, phenol red, pastilles, test pH chlore, comparateur' },
    { id: 54, owner: 1, by: 2, type: 'procedure', title: "Tester l'eau avec un photomètre électronique", category: 'Analyse & routine', summary: 'Outil professionnel pour une lecture précise et multi-paramètres.', content: `1. Vérifier que la cuve de mesure est propre et sèche, sans rayure sur les faces optiques.
2. Réaliser un "blanc" avec de l'eau du bassin seule (sans réactif) pour calibrer l'appareil sur cet échantillon avant chaque série de mesures.
3. Ajouter le réactif adapté au paramètre recherché (DPD1 pour chlore libre, DPD3 pour chlore total, phénol red pour pH, etc.).
4. Refermer, agiter doucement pour dissoudre sans faire mousser (la mousse fausse la lecture optique).
5. Essuyer l'extérieur de la cuve avant de l'insérer dans l'appareil.
6. Lancer la mesure et lire directement la valeur numérique affichée (généralement en mg/L ou ppm).
7. Nettoyer systématiquement la cuve après chaque test et étalonner l'appareil selon la périodicité du fabricant.
8. Le photomètre permet en général de mesurer en série pH, chlore libre/total, TAC, TH, stabilisant, sel, avec une précision bien supérieure aux bandelettes.`, tags: 'photomètre, mesure électronique, précision, étalonnage, chlore libre total' },
    { id: 55, owner: 1, by: 1, type: 'procedure', title: 'Effectuer une tournée d\'entretien hebdomadaire type', category: 'Analyse & routine', summary: "L'ordre d'intervention standard d'un professionnel sur un bassin, en moins de 30 minutes.", content: `1. Contrôle visuel général en arrivant : couleur de l'eau, niveau, propreté de la plage, état de la couverture/alarme.
2. Vérifier et ajuster le niveau d'eau (idéalement à mi-hauteur des skimmers).
3. Vider et rincer les paniers de skimmer et le préfiltre de la pompe.
4. Brosser les parois, le fond et la ligne d'eau si nécessaire.
5. Passer l'épuisette de surface ou lancer le robot électrique.
6. Contrôler la pression au filtre, faire un backwash si besoin.
7. Tester pH et chlore (et TAC une fois par mois), ajuster les produits en conséquence.
8. Vérifier le bon fonctionnement des équipements (pompe, PAC, électrolyseur, éclairage).
9. Consigner l'intervention (relevés, produits ajoutés, anomalies constatées) dans le carnet de suivi ou l'application.`, tags: 'routine, checklist, visite hebdomadaire, tournée' },
    { id: 56, owner: 1, by: 2, type: 'procedure', title: 'Entretenir une piscine hors-sol, tubulaire ou autoportée', category: 'Nettoyage', summary: 'Spécificités liées à la structure légère et au volume réduit.', content: `1. Vérifier régulièrement la tension de la structure (tubulaire) ou le gonflage (autoportée) : une structure détendue accélère l'usure du liner.
2. Nettoyer plus fréquemment qu'un bassin enterré : le faible volume d'eau se déséquilibre et se réchauffe plus vite, favorisant algues et bactéries.
3. Utiliser une épuisette et un balai manuel adaptés à la taille réduite du bassin plutôt qu'un robot surdimensionné.
4. Contrôler pH et chlore au minimum 2 fois par semaine en pleine saison (contre 1 fois pour un bassin enterré plus stable).
5. Couvrir le bassin hors utilisation pour limiter l'évaporation, les salissures et le réchauffement excessif de l'eau.
6. En fin de saison, vidanger complètement, nettoyer et sécher avant pliage/stockage pour éviter moisissures et détérioration du PVC.
7. Ne jamais laisser un hors-sol totalement vide en plein soleil longtemps : le PVC peut se déformer.`, tags: 'hors-sol, tubulaire, autoportée, gonflable, entretien spécifique' },
    { id: 57, owner: 1, by: 1, type: 'procedure', title: 'Nettoyer et entretenir un robot électrique', category: 'Nettoyage', summary: 'Entretien du robot lui-même, en complément du nettoyage du bassin.', content: `1. Après chaque cycle, sortir le robot de l'eau et le laisser égoutter quelques minutes avant de l'ouvrir.
2. Retirer et rincer le(s) filtre(s)/panier(s) de récupération des déchets à chaque utilisation.
3. Inspecter et nettoyer les brosses : remplacer les brosses mousse après une saison, les brosses PVC après deux saisons environ.
4. Vérifier l'hélice/turbine 1 à 2 fois par saison (davantage en cas d'usage intensif estival) et retirer les débris coincés.
5. Dérouler uniquement la longueur de câble nécessaire au bassin et le stocker toujours bien enroulé, sans le nouer.
6. Stocker le robot au sec, à l'abri du gel et du soleil direct, si possible sur un chariot de transport dédié.
7. Ne jamais faire fonctionner le robot hors de l'eau : cela endommage le moteur.`, tags: 'robot électrique, entretien robot, filtre robot, brosses' },
    { id: 58, owner: 1, by: 2, type: 'procedure', title: 'Entretenir un robot hydraulique', category: 'Nettoyage', summary: 'Moins de pannes électroniques, mais un circuit de filtration à surveiller de près.', content: `1. Vérifier le raccordement à la prise balai ou au skimmer : un joint usé réduit fortement l'aspiration.
2. Contrôler que le sac ou le filtre du robot (selon modèle) n'est pas colmaté, sinon la puissance d'aspiration chute.
3. Nettoyer plus fréquemment le préfiltre de la pompe et le filtre principal : un robot hydraulique sollicite davantage le système de filtration qu'un robot électrique autonome.
4. Vérifier l'absence de plis ou de vrilles sur le tuyau flottant, qui gênent le déplacement aléatoire du robot.
5. Contrôler l'état des membranes/soupapes internes (selon technologie), pièces d'usure à remplacer périodiquement.
6. Ranger le robot et son tuyau à l'ombre hors saison pour limiter le vieillissement du plastique et du caoutchouc.`, tags: 'robot hydraulique, prise balai, entretien robot, filtration' },
    { id: 59, owner: 1, by: 1, type: 'procedure', title: 'Traiter une eau brune ou tachée (fer, cuivre, manganèse)', category: "Traitement de l'eau", summary: 'Identifier la cause avant de traiter, sous peine d\'aggraver les taches.', content: `1. Identifier la teinte : eau verte translucide (cuivre, souvent lié à la corrosion de canalisations ou d'une cellule d'électrolyse), teinte rouille/brune (fer), nuances noires (manganèse).
2. Ramener le pH entre 7.0 et 7.4 avant tout traitement : l'efficacité du séquestrant en dépend directement.
3. Ne pas faire de choc chlore avant d'avoir traité les métaux : un choc sur une eau chargée en métaux précipite et fixe les taches sur les parois.
4. Ajouter un séquestrant métaux (produit "anti-métaux" complexant) selon le dosage indiqué pour le volume du bassin.
5. Laisser agir avec la filtration en marche, sans choc chlore pendant ce délai.
6. Une fois l'eau limpide, reprendre un traitement chlore normal, et renouveler le séquestrant à chaque appoint d'eau important si l'eau du réseau est chargée en métaux.
7. En prévention sur une eau connue pour être chargée en fer/cuivre : ajouter systématiquement le séquestrant à chaque remplissage.`, tags: 'eau brune, fer, cuivre, manganèse, séquestrant métaux' },
    { id: 60, owner: 1, by: 2, type: 'procedure', title: 'Nettoyer des margelles en pierre naturelle', category: 'Nettoyage', summary: 'Un entretien doux, sans acide ni haute pression, pour ne pas endommager la pierre.', content: `1. Balayer ou aspirer les margelles pour retirer les débris avant lavage.
2. Préparer un mélange d'eau tiède et de savon noir (ou liquide vaisselle doux).
3. Frotter avec une brosse à poils souples, jamais de brosse métallique qui raye la pierre.
4. Pour les taches tenaces, appliquer une pâte de bicarbonate de soude directement sur la tache, laisser agir puis frotter.
5. Rincer abondamment à l'eau claire et sécher avec un chiffon propre pour éviter les traces de calcaire.
6. Ne jamais utiliser de nettoyeur haute pression ni de produit acide sur une pierre naturelle : ils attaquent la surface et le jointoiement.
7. Appliquer un traitement hydrofuge/anti-tache une à deux fois par an pour protéger durablement la pierre.`, tags: 'margelles, pierre naturelle, nettoyage, hydrofuge' },
    { id: 61, owner: 3, by: 3, type: 'procedure', title: 'Réaliser une vidange de piscine dans les règles', category: 'Mise en service', summary: 'Une vidange mal préparée peut polluer le milieu naturel et endommager le bassin.', content: `1. Arrêter tout traitement au chlore au moins 15 jours avant la vidange pour laisser le temps au chlore de se neutraliser naturellement.
2. Vérifier auprès de la commune/du service d'assainissement si un rejet au réseau d'eaux usées est autorisé (dérogation possible selon la capacité des ouvrages) ; à défaut, prévoir une infiltration dans le sol via un puits de décantation.
3. Ne jamais rejeter l'eau de vidange directement dans un cours d'eau, un fossé ou le réseau d'eaux pluviales sans neutralisation préalable du chlore.
4. Vidanger progressivement pour un bassin béton/carrelage (risque de soulèvement de la structure en terrain humide si vidé trop vite) ; pour un liner, éviter de laisser le bassin vide trop longtemps (rétractation).
5. Profiter de la vidange pour inspecter et nettoyer en profondeur le fond, les parois et les pièces à sceller.
6. Reremplir et rééquilibrer l'eau selon la procédure de mise en eau (TAC, pH, puis traitement).`, tags: 'vidange, rejet eau, réglementation, neutralisation chlore' },
    { id: 62, owner: 3, by: 4, type: 'procedure', title: 'Renseigner le carnet sanitaire d\'une piscine collective', category: 'Sécurité', summary: 'Obligation quotidienne pour tout établissement recevant du public avec piscine.', content: `1. Relever au minimum une fois par jour (davantage en cas de forte fréquentation) : température de l'eau et de l'air, pH, teneur en désinfectant (chlore libre et combiné, ou brome), transparence de l'eau.
2. Consigner chaque relevé avec l'heure et l'identité de la personne ayant réalisé le contrôle.
3. Noter tout incident (dépassement de paramètre, panne, intervention corrective) et l'action corrective mise en œuvre.
4. Conserver le carnet sanitaire sur site : il doit être présenté à toute demande de l'ARS ou du laboratoire agréé lors des contrôles sanitaires.
5. Vérifier la classification de l'établissement (types A à D selon fréquentation) qui détermine la fréquence des prélèvements réglementaires effectués par un laboratoire agréé.
6. Archiver les résultats d'analyses du laboratoire agréé avec le carnet : ils font partie intégrante du dossier sanitaire de l'établissement.`, tags: 'carnet sanitaire, piscine collective, ARS, ERP, traçabilité' },
    { id: 63, owner: 1, by: 1, type: 'procedure', title: 'Nettoyer le bac tampon d\'une piscine à débordement ou miroir', category: 'Filtration', summary: 'Le bac tampon concentre toutes les impuretés de surface : un entretien négligé y favorise vite les algues.', content: `1. Couper la pompe avant intervention si le bac tampon nécessite un accès direct.
2. Ouvrir le regard/trappe d'accès au bac tampon (généralement à proximité du local technique).
3. Retirer manuellement les feuilles, insectes et débris flottants accumulés.
4. Vérifier l'état de la sonde de niveau et de l'électrovanne de régulation (trop-plein/appoint) : les nettoyer si elles sont entartrées ou encrassées.
5. Brosser les parois du bac tampon si un dépôt ou un début d'algue est visible, puis passer un coup d'épuisette fine.
6. Profiter de l'intervention pour contrôler le bon fonctionnement de la pompe de reprise du bac tampon vers la filtration.
7. À prévoir en moyenne une fois par mois en saison, plus souvent en cas de forte présence de végétation aux abords du bassin.`, tags: 'bac tampon, débordement, miroir, entretien mensuel' },
    { id: 64, owner: 1, by: 2, type: 'procedure', title: 'Réagir en cas de fuite ou d\'odeur de chlore gazeux', category: 'Sécurité', summary: "Procédure d'urgence à connaître pour toute intervention en local technique.", content: `1. Ne jamais chercher à identifier ou colmater seul une fuite de chlore gazeux : évacuer immédiatement la zone.
2. Faire sortir toute personne à proximité à l'air libre, de préférence en hauteur (le chlore gazeux est plus lourd que l'air et stagne au sol).
3. Ne pas retourner dans le local avant l'intervention des secours ou d'un professionnel équipé (appareil respiratoire isolant).
4. En cas d'exposition (toux, picotements de gorge, larmoiement, difficultés respiratoires) : évacuer la victime à l'air frais, la mettre au repos, ne pas la faire marcher inutilement.
5. Rincer abondamment les yeux à l'eau tiède en cas de projection, retirer les vêtements contaminés.
6. Appeler les secours (15 ou 112) en cas de symptômes respiratoires ou d'exposition prolongée.
7. Ne jamais utiliser d'eau pour "laver" une fuite de produit chloré solide/granulés à proximité d'un autre produit chimique : risque de réaction violente.`, tags: 'chlore gazeux, fuite, urgence, premiers secours, sécurité local technique' },
  ]

  // ----- INFORMATIONS (fiches de connaissances de référence métier) -----
  const informations = [
    { id: 29, owner: 1, by: 1, type: 'information', title: "Valeurs idéales de l'équilibre de l'eau", category: "Chimie de l'eau", summary: 'Tableau de référence des paramètres clés à contrôler à chaque analyse.', content: `pH : 7.2 à 7.4 (zone où le désinfectant est le plus efficace et l'eau confortable pour la peau/yeux).
Chlore libre : 1,0 à 3,0 mg/L (2 mg/L en usage courant, jusqu'à 3-5 mg/L en traitement choc temporaire).
Chlore combiné (chloramines) : doit rester proche de 0, idéalement inférieur à 0,4 mg/L — un taux élevé signale une eau mal désinfectée malgré un chlore libre correct.
TAC (alcalinité) : 80 à 120 mg/L (8 à 12 °f).
TH (dureté) : 100 à 300 mg/L de CaCO3 selon le revêtement (viser plutôt le bas de la fourchette pour un liner, plus haut pour un béton/carrelage).
Stabilisant (acide cyanurique) : 20 à 50 mg/L pour un traitement au chlore stabilisé ; proche de 0 pour un traitement non stabilisé (sel, oxygène actif).
Température : 26 à 28°C pour un confort de baignade classique, au-delà de 28°C la vigilance sur le traitement doit augmenter.`, tags: 'valeurs idéales, pH, chlore, TAC, TH, stabilisant, référence' },
    { id: 30, owner: 1, by: 1, type: 'information', title: 'Chlore libre, combiné et total : bien comprendre les chloramines', category: "Chimie de l'eau", summary: "Le chlore combiné ne désinfecte plus et sent fort : c'est un signe de sous-chloration.", content: `Le chlore libre est la fraction active du chlore, celle qui désinfecte réellement l'eau. Le chlore combiné (chloramines) résulte de la réaction du chlore avec les matières organiques apportées par les baigneurs (sueur, urée, crèmes solaires) : il ne désinfecte plus et c'est lui qui est responsable de l'odeur de "chlore" typique et des irritations des yeux — une eau qui sent fort le chlore est en réalité souvent sous-chlorée.
Le chlore total = chlore libre + chlore combiné. Un chlore combiné supérieur à 0,4-0,6 mg/L impose un traitement choc pour "casser" les chloramines et retrouver du chlore libre actif.`, tags: 'chlore, chloramines, chlore combiné, odeur chlore' },
    { id: 31, owner: 1, by: 1, type: 'information', title: 'Le TAC et son rôle de tampon du pH', category: "Chimie de l'eau", summary: 'Pourquoi le TAC doit toujours être réglé avant le pH.', content: `Le TAC (Titre Alcalimétrique Complet) mesure la capacité de l'eau à résister aux variations de pH : c'est l'effet "tampon". Un TAC trop bas rend le pH instable (il varie fortement au moindre ajout de produit ou apport extérieur), tandis qu'un TAC trop élevé rend le pH difficile à corriger et favorise l'entartrage.
C'est pourquoi le TAC doit toujours être réglé en premier, avant le pH : régler le pH sur un TAC déséquilibré est inefficace, le pH "revient" rapidement à sa valeur d'origine.`, tags: 'TAC, alcalinité, tampon, pH stable' },
    { id: 32, owner: 1, by: 1, type: 'information', title: 'Le stabilisant (acide cyanurique) : rôle et risque de sur-stabilisation', category: "Chimie de l'eau", summary: 'Le stabilisant protège le chlore des UV mais ne se dégrade jamais naturellement.', content: `Le stabilisant protège le chlore des UV du soleil, qui le détruisent sinon en 2 à 3h en plein été. Il est indispensable pour une piscine extérieure traitée au chlore.
Mais il présente un piège : il s'accumule dans l'eau au fil des ajouts de chlore stabilisé et ne se dégrade pas naturellement — seule une dilution (renouvellement d'eau) le fait baisser. Au-delà de 50 mg/L, on parle de sur-stabilisation : le chlore devient de moins en moins efficace à dose égale ("effet de verrouillage"), ce qui pousse à sur-doser, aggravant le problème.
Solution : renouveler une partie de l'eau du bassin, ou passer temporairement à un chlore non stabilisé.`, tags: 'stabilisant, acide cyanurique, sur-stabilisation, verrouillage chlore' },
    { id: 33, owner: 1, by: 2, type: 'information', title: "L'indice de Langelier et l'équilibre calco-carbonique", category: "Chimie de l'eau", summary: 'Détermine si une eau est entartrante, corrosive, ou équilibrée.', content: `L'indice de Langelier (LSI) synthétise pH, TAC, TH et température pour déterminer si une eau est entartrante, corrosive, ou équilibrée. Un résultat proche de 0 (± 0,3) signale une eau à l'équilibre : c'est l'objectif à viser.
Un indice positif indique une eau entartrante (dépôts de calcaire sur parois, canalisations, cellule d'électrolyse). Un indice négatif indique une eau corrosive/agressive (attaque des joints, du revêtement, des pièces métalliques).
Une eau durablement déséquilibrée abîme aussi bien le bassin que les équipements de filtration et de traitement — l'équilibre calco-carbonique doit donc être surveillé au même titre que la désinfection.`, tags: 'Langelier, équilibre calco-carbonique, entartrage, corrosion' },
    { id: 34, owner: 1, by: 1, type: 'information', title: "Ordre de correction des paramètres de l'eau", category: "Chimie de l'eau", summary: 'La méthode professionnelle : TAC, puis pH, puis TH, puis chlore.', content: `Lorsque plusieurs paramètres sont à corriger en même temps, respecter systématiquement cet ordre :
1) TAC (alcalinité) — il stabilise le pH et doit être réglé en premier.
2) pH — une fois le TAC dans la cible.
3) TH (dureté) si nécessaire.
4) Chlore et stabilisant en dernier, une fois pH/TAC stabilisés (le chlore est plus efficace et plus facile à ajuster sur une eau déjà équilibrée).
Attendre systématiquement quelques heures filtration en marche entre chaque correction avant de recontrôler.`, tags: 'ordre correction, TAC pH TH, méthode' },
    { id: 35, owner: 1, by: 1, type: 'information', title: 'Chlore stabilisé vs non stabilisé : lequel utiliser', category: "Chimie de l'eau", summary: 'Stabilisé pour le traitement continu, non stabilisé pour le rattrapage.', content: `Le chlore stabilisé (galets, pastilles, dichlore) contient de l'acide cyanurique qui protège le chlore des UV : c'est la solution adaptée à la désinfection continue d'une piscine extérieure.
Le chlore non stabilisé (hypochlorite de calcium en poudre/granulés) agit vite et ne contient pas de stabilisant : il est réservé au traitement choc ponctuel, notamment pour rattraper une eau verte, sans faire grimper davantage le taux de stabilisant déjà présent.
Une piscine déjà sur-stabilisée doit systématiquement être traitée avec du chlore non stabilisé jusqu'à dilution du stabilisant en excès.`, tags: 'chlore stabilisé, chlore non stabilisé, dichlore, hypochlorite de calcium' },
    { id: 36, owner: 1, by: 2, type: 'information', title: "Les différents systèmes de traitement de l'eau", category: 'Équipements', summary: 'Chlore, brome, sel, oxygène actif, PHMB, UV, ozone : avantages et inconvénients.', content: `Chlore (galets/liquide) : référence historique, efficace et économique, nécessite une gestion régulière du stabilisant.
Brome : mieux toléré par les peaux sensibles, plus stable en eau chaude (adapté aux spas), mais plus coûteux.
Sel/électrolyse : production de chlore in situ par une cellule, confort de baignade apprécié, nécessite un contrôle régulier du taux de sel (généralement 3 à 5 g/L) et un détartrage périodique de la cellule.
Oxygène actif : sans odeur, doux pour la peau, adapté aux petits bassins/spas familiaux, mais moins rémanent et plus cher à l'usage.
PHMB (polymère) : sans chlore, incompatible avec un passage ultérieur au chlore sans vidange complète.
UV et ozone : traitements complémentaires (pas des désinfectants rémanents à eux seuls) qui réduisent la consommation de désinfectant chimique.`, tags: 'chlore, brome, sel, électrolyse, oxygène actif, PHMB, UV, ozone' },
    { id: 37, owner: 1, by: 1, type: 'information', title: "Reconnaître les différents types d'algues", category: "Algues & pathologies de l'eau", summary: 'Vertes, moutarde, noires, roses : identification rapide.', content: `Algues vertes : les plus courantes, eau uniformément verte et/ou parois glissantes, liées à un manque de désinfectant ou un déséquilibre du pH.
Algues moutarde (jaunes) : aspect poudreux jaunâtre, se redéposent vite après brossage, résistantes au chlore classique, nécessitent un produit spécifique.
Algues noires : taches noires incrustées très résistantes, se logent dans les joints et micro-fissures, demandent un brossage mécanique pour casser leur membrane avant traitement.
Algues roses : en réalité des bactéries (et non de vraies algues), colonisent surtout les surfaces plastiques (liner, joints, paniers de skimmer), traitement bactéricide spécifique nécessaire en complément du chlore.`, tags: 'algues vertes, moutarde, noires, roses, identification' },
    { id: 38, owner: 1, by: 1, type: 'information', title: 'Comparatif des systèmes de filtration', category: 'Équipements', summary: 'Sable, cartouche, diatomées, verre : finesse et entretien.', content: `Sable : le plus répandu et économique, finesse de filtration 30-40 microns, entretien par backwash bihebdomadaire/bimensuel, sable à remplacer tous les 5-7 ans.
Cartouche : finesse 15-20 microns, pas de backwash (économie d'eau), nettoyage manuel 1 à 2 fois par semaine en pleine saison, cartouche à remplacer tous les 2-3 ans.
Diatomées : finesse 1-3 microns, eau la plus limpide, entretien plus technique (rechargement périodique en terre de diatomées), recommandé pour un professionnel.
Verre recyclé : alternative au sable, filtration fine, meilleure résistance à l'entartrage, backwash mensuel, durée de vie proche de 8 ans.`, tags: 'filtration, sable, cartouche, diatomées, verre, comparatif' },
    { id: 39, owner: 1, by: 2, type: 'information', title: 'Comprendre une pompe de filtration', category: 'Équipements', summary: 'Débit, HMT et dimensionnement.', content: `Une pompe de filtration se caractérise par son débit (m³/h) et sa hauteur manométrique totale (HMT, la capacité à "pousser" l'eau en compensant les pertes de charge du circuit).
Le dimensionnement doit permettre de filtrer l'intégralité du volume du bassin dans le temps de filtration quotidien visé, tout en tenant compte des pertes de charge du filtre, des canalisations et des accessoires.
Une pompe surdimensionnée use prématurément le filtre et consomme inutilement ; une pompe sous-dimensionnée ne brasse pas assez l'eau et laisse le traitement moins efficace. Les pompes à vitesse variable permettent d'adapter le débit aux besoins réels avec un gain énergétique important.`, tags: 'pompe, débit, HMT, dimensionnement, vitesse variable' },
    { id: 40, owner: 1, by: 1, type: 'information', title: 'Comprendre une pompe à chaleur piscine', category: 'Équipements', summary: 'COP, dimensionnement et plage de fonctionnement.', content: `Une pompe à chaleur (PAC) capte les calories de l'air extérieur pour chauffer l'eau du bassin. Sa performance se mesure par le COP (Coefficient de Performance) : un COP de 4 signifie 4 kW de chaleur restitués pour 1 kW électrique consommé.
Le COP varie fortement avec la température extérieure : il chute quand l'air se refroidit, ce qui explique une chauffe moins efficace en intersaison. La Fédération des Professionnels de la Piscine impose deux mesures de référence pour comparer les modèles (air 15°C/eau 26°C, et air 28°C/eau 28°C).
Dimensionnement indicatif : environ 1 kW de puissance pour 10 m³ d'eau, à affiner selon le volume exact, l'exposition, la couverture du bassin et la vitesse de montée en température souhaitée.`, tags: 'pompe à chaleur, PAC, COP, chauffage piscine, dimensionnement' },
    { id: 41, owner: 1, by: 1, type: 'information', title: 'Durée de filtration recommandée selon la température de l\'eau', category: 'Calculs & formules', summary: 'La règle professionnelle : température divisée par 2.', content: `Règle professionnelle simple : durée de filtration (en heures) = température de l'eau (°C) ÷ 2. Exemple : 24°C → 12h de filtration/jour, 28°C → 14h, 30°C → 15h.
En dessous de 12°C, les micro-organismes ne prolifèrent quasiment plus : la filtration peut être fortement réduite. Au-dessus de 28°C, la filtration doit tourner en continu (24h/24) pour éviter qu'une eau chaude ne verdisse en 24 à 48h.
Cette règle reste indicative : l'adapter à la fréquentation du bassin (plus de baigneurs = plus de filtration) et à l'environnement (végétation, exposition au vent).`, tags: 'durée filtration, température, règle température divisée par 2' },
    { id: 42, owner: 1, by: 2, type: 'information', title: 'Calculer le volume d\'un bassin selon sa forme', category: 'Calculs & formules', summary: 'Formules par forme + conversion en litres.', content: `Rectangulaire : Longueur × Largeur × Profondeur moyenne.
Ronde : Rayon × Rayon × 3,14 × Profondeur moyenne.
Ovale : Longueur × Largeur × Profondeur moyenne × 0,89.
Forme libre : décomposer le bassin en formes géométriques simples et additionner les volumes obtenus, ou utiliser l'estimation rapide Longueur max × Largeur max × Profondeur moyenne × 0,85.
Toujours privilégier la profondeur moyenne (et non la profondeur maximale) pour un résultat fiable. Conversion : 1 m³ = 1 000 litres.`, tags: 'volume piscine, calcul, formule, m3, litres' },
    { id: 43, owner: 1, by: 1, type: 'information', title: 'Calculer le dosage d\'un produit selon le volume du bassin', category: 'Calculs & formules', summary: 'Méthode en 4 étapes pour doser correctement.', content: `La quasi-totalité des produits de traitement (pH+/pH-, chlore choc, rehausseur/réducteur de TAC, anti-algues) sont dosés en fonction du volume d'eau du bassin, indiqué sur l'emballage en g ou mL par m³.
Méthode : 1) connaître le volume exact du bassin (voir fiche calcul de volume) ; 2) mesurer l'écart entre la valeur actuelle et la valeur cible du paramètre ; 3) appliquer la dose indiquée par le fabricant pour cet écart et ce volume ; 4) fractionner les doses importantes en plusieurs apports espacés de quelques heures plutôt qu'un apport unique, pour limiter les à-coups et mieux contrôler le résultat.`, tags: 'dosage, calcul produit, volume, traitement' },
    { id: 44, owner: 3, by: 3, type: 'information', title: 'Réglementation sécurité des piscines privées', category: 'Réglementation & sécurité', summary: 'Loi du 3 janvier 2003 et normes NF P90-306/307/308/309.', content: `Depuis la loi n°2003-9 du 3 janvier 2003, toute piscine enterrée ou semi-enterrée non close à usage individuel ou collectif doit être équipée d'au moins un dispositif de sécurité normalisé, en vue de prévenir les noyades d'enfants de moins de 5 ans.
Quatre normes définissent ces dispositifs : NF P90-306 (barrières de protection, hauteur minimale 1,10 m, portillon à fermeture et verrouillage automatiques), NF P90-307 (alarmes, détection périmétrique ou d'immersion), NF P90-308 (couvertures de sécurité) et NF P90-309 (abris de piscine).
Le non-respect de cette obligation expose le propriétaire à une amende pouvant atteindre 45 000 €. Ces dispositifs réduisent le risque mais ne remplacent jamais la surveillance active d'un adulte.`, tags: 'sécurité piscine, loi 2003, NF P90-306, NF P90-307, NF P90-308, NF P90-309' },
    { id: 45, owner: 3, by: 3, type: 'information', title: 'Norme électrique des piscines (NF C15-100)', category: 'Réglementation & sécurité', summary: 'Volumes de protection et règles pour le local technique.', content: `La norme NF C15-100 (section 702) encadre les installations électriques à proximité d'un bassin. Elle définit des volumes de protection autour de la piscine (0, 1 et 2) : plus on est proche de l'eau, plus les restrictions sur le matériel électrique autorisé sont sévères.
Le tableau électrique dédié à la piscine doit être séparé de celui de l'habitation et comporter un interrupteur différentiel 30 mA. Pour s'affranchir des contraintes des volumes de protection, le local technique (et donc la pompe en 230V) doit idéalement être installé à plus de 3,50 m du bord du bassin ; la ventilation et l'étanchéité du local sont essentielles.`, tags: 'NF C15-100, électricité piscine, volumes de protection, local technique' },
    { id: 46, owner: 3, by: 4, type: 'information', title: 'Stockage et manipulation des produits chimiques', category: 'Réglementation & sécurité', summary: 'Ne jamais mélanger chlore et acide : consignes de sécurité essentielles.', content: `Ne jamais stocker le chlore et l'acide côte à côte, ni mélanger différents types de chlore entre eux : le contact accidentel entre chlore et acide peut générer un dégagement de gaz toxique voire une réaction violente.
Conserver chaque produit dans son emballage d'origine, étiqueté, dans un local frais, sec, aéré et à l'abri du soleil direct. Prévoir un espace entre les différents contenants et une bonne ventilation pour éviter toute accumulation de vapeurs.
Stocker hors de portée des enfants et des animaux. Porter des gants et des lunettes de protection lors de toute manipulation de produits concentrés, et toujours verser le produit dans l'eau (jamais l'inverse) lors d'une dilution.`, tags: 'sécurité chimique, stockage produits, chlore acide, EPI' },
    { id: 47, owner: 3, by: 3, type: 'information', title: 'Risque de légionellose dans les spas et bains à remous', category: 'Réglementation & sécurité', summary: 'La plage de température des spas est aussi celle de prolifération de la bactérie.', content: `La légionellose est une infection pulmonaire grave provoquée par l'inhalation d'aérosols contenant la bactérie Legionella pneumophila. Les spas et bains à remous sont particulièrement à risque : leur température de fonctionnement (30 à 40°C) se situe précisément dans la zone de multiplication optimale de la bactérie (25-45°C, avec un pic entre 32 et 42°C où la population double toutes les 3-4h), combinée à un faible volume d'eau et une forte agitation générant des aérosols.
La prévention passe par un contrôle rigoureux et permanent du désinfectant, une vidange et un nettoyage complet des canalisations réguliers (tous les 3-4 mois), et la lutte contre l'entartrage/la corrosion qui favorisent la formation de biofilm, terrain propice à la bactérie.`, tags: 'légionellose, spa, bain à remous, sécurité sanitaire' },
    { id: 48, owner: 1, by: 1, type: 'information', title: 'Les différents revêtements de piscine et leur entretien', category: 'Équipements', summary: 'Liner, PVC armé, coque, béton/carrelage, enduit : spécificités d\'entretien.', content: `Liner (PVC souple) : économique, confortable, mais sensible aux perforations et à la décoloration ; nettoyage à la brosse douce, jamais de brosse métallique ou de produit abrasif.
PVC armé : plus résistant et étanche que le liner classique, soudé, adapté aux formes complexes, entretien similaire au liner.
Coque polyester : très lisse (peu d'accroche pour les algues), durable, mais réparation délicate en cas de fissure (résine spécifique).
Béton/carrelage : très résistant et personnalisable, mais surface plus poreuse et rugueuse propice à l'accroche des algues (notamment noires dans les joints) ; supporte le brossage avec une brosse plus agressive.
Enduit : intermédiaire, à réimperméabiliser périodiquement, sensible à l'équilibre de l'eau (indice de Langelier à surveiller de près).`, tags: 'liner, PVC armé, coque, béton, carrelage, enduit, revêtement' },
    { id: 49, owner: 1, by: 2, type: 'information', title: "Calendrier annuel d'entretien d'une piscine", category: 'Calendrier & organisation', summary: 'Checklist saisonnière pour organiser sa tournée sur l\'année.', content: `Printemps (remise en route) : retrait de la bâche, remontage du matériel, nettoyage complet, backwash, remise à niveau des paramètres, choc si besoin.
Été (haute saison) : contrôle des paramètres 1 à 2 fois par semaine, nettoyage skimmers/ligne d'eau hebdomadaire, filtration selon la règle température/2, vigilance accrue lors des orages et fortes chaleurs.
Automne : réduction progressive de la filtration à mesure que la température baisse, nettoyage renforcé (feuilles), dernière analyse complète avant hivernage.
Hiver (hivernage) : mise en hivernage passif ou actif selon la région et le type de bassin, surveillance ponctuelle du niveau d'eau et de l'état de la couverture pendant la période fermée.`, tags: 'calendrier, saisons, planning entretien, checklist annuelle' },
    { id: 50, owner: 1, by: 1, type: 'information', title: 'Glossaire des termes techniques du métier', category: 'Glossaire', summary: 'Vocabulaire de base à connaître.', content: `Backwash (contre-lavage) : inversion du sens de circulation de l'eau dans un filtre à sable/diatomées pour évacuer les impuretés retenues.
Skimmer : écumoire intégrée à la paroi du bassin qui aspire l'eau de surface.
Bonde de fond : prise d'aspiration au point le plus bas du bassin, soumise à un dispositif anti-vortex/anti-entraînement.
Vanne multivoie : vanne du filtre à sable permettant de sélectionner le mode (filtration, lavage, rinçage, vidange, recirculation, hivernage).
Refoulement : buse qui renvoie l'eau filtrée dans le bassin.
Ligne d'eau : bande à la surface du bassin où se déposent calcaire, graisses et pollens.
HMT : Hauteur Manométrique Totale, capacité d'une pompe à vaincre les pertes de charge du circuit.`, tags: 'glossaire, vocabulaire, lexique, termes techniques' },
    { id: 51, owner: 3, by: 3, type: 'information', title: 'Premiers secours et prévention de la noyade', category: 'Réglementation & sécurité', summary: 'La noyade reste la 1ère cause de mort accidentelle chez les moins de 5 ans avec piscine.', content: `La noyade reste la première cause de mort accidentelle chez les enfants de moins de 5 ans en France disposant d'une piscine privée.
Rappels essentiels à transmettre systématiquement aux clients : surveillance active et continue d'un adulte dès qu'un enfant est à proximité de l'eau, même équipée d'un dispositif de sécurité normalisé (aucun dispositif n'est infaillible ni ne dispense de surveillance) ; ne jamais laisser un enfant seul même quelques instants ; réarmer systématiquement alarme/couverture après chaque utilisation.
En cas de noyade : sortir la victime de l'eau, alerter les secours (15 ou 112), débuter une réanimation cardio-pulmonaire (RCP) si la victime ne respire pas — la formation aux gestes qui sauvent (PSC1) est vivement recommandée pour tout professionnel intervenant sur des piscines.`, tags: 'noyade, premiers secours, RCP, prévention, sécurité enfants' },
    { id: 52, owner: 1, by: 1, type: 'information', title: 'Fiches produits : rôle et précautions des principaux produits de traitement', category: "Chimie de l'eau", summary: 'Chlore choc, galets, pH+/pH-, floculant, séquestrant.', content: `Chlore choc (dichlore/hypochlorite) : désinfection rapide et rattrapage, à diluer avant usage pour la poudre, jamais en contact direct avec la peau.
Galets de chlore lent (trichlore stabilisé) : diffusion progressive sur 7-10 jours en skimmer ou diffuseur flottant, jamais dans le panier du skimmer si filtration coupée (concentration dangereuse localisée).
pH+/pH- : produits acido-basiques concentrés, toujours verser dans l'eau et non l'inverse, stocker séparément l'un de l'autre.
Anti-algues : à utiliser en traitement préventif régulier ou curatif ciblé selon le type d'algue, vérifier la compatibilité avec le désinfectant utilisé.
Floculant : agent clarifiant à action physique (agglomération des particules), sans effet désinfectant, à utiliser en complément du chlore et non à sa place.
Séquestrant/anti-calcaire : limite la précipitation du calcaire et des métaux responsables de taches et d'eau trouble/colorée, à renouveler régulièrement.`, tags: 'produits, chlore choc, galets, pH, floculant, séquestrant, précautions' },
    { id: 65, owner: 1, by: 1, type: 'information', title: "Comparatif des méthodes de test d'eau", category: "Chimie de l'eau", summary: 'Bandelettes, gouttes, pastilles DPD, photomètre : précision et usage.', content: `Bandelettes réactives : trempette de 5 secondes, lecture après 10-15 secondes par comparaison colorimétrique. Rapides et pratiques pour un contrôle quotidien, mais précision limitée et sensibles à la péremption.
Trousse à gouttes (réactifs liquides) : quelques gouttes de réactif dans une éprouvette d'eau, lecture par comparaison de couleur. Un peu plus précises que les bandelettes, matériel économique.
Pastilles DPD (Phenol Red pour le pH, DPD1 pour le chlore libre, DPD3 pour le chlore total) : méthode de référence des professionnels sur le terrain, bon compromis précision/rapidité.
Photomètre électronique : lecture optique numérique, la plus précise, multi-paramètres (pH, chlore libre/total, TAC, TH, stabilisant, sel...), incontournable pour un usage professionnel régulier ou une piscine collective.
Pour un résultat fiable quelle que soit la méthode : prélever l'échantillon à 30-40 cm de profondeur, loin des points d'injection de produit, et tester rapidement après le prélèvement.`, tags: 'méthodes de test, bandelettes, DPD, photomètre, comparatif' },
    { id: 66, owner: 1, by: 2, type: 'information', title: "Fréquence des tests d'eau : piscine privée vs collective", category: "Chimie de l'eau", summary: 'Les obligations de contrôle changent radicalement selon le type d\'établissement.', content: `Piscine privée familiale : contrôle du pH et du chlore recommandé de façon hebdomadaire au minimum en pleine saison, davantage après une forte fréquentation, un orage ou une chaleur intense. Le TAC et le stabilisant se contrôlent plus ponctuellement (mensuel).
Piscine collective (hôtel, camping, résidence, établissement recevant du public) : contrôle interne obligatoire au minimum une fois par jour (température, pH, désinfectant, transparence), consigné dans le carnet sanitaire. À cela s'ajoute un contrôle sanitaire externe par un laboratoire agréé mandaté par l'ARS, à fréquence réglementaire selon la classification de l'établissement (type A à D).
Un professionnel intervenant sur un parc de piscines privées doit adapter sa fréquence de passage à la saison, au volume, à la fréquentation et aux paramètres constatés lors du dernier passage plutôt qu'à un rythme rigide.`, tags: 'fréquence test, piscine collective, piscine privée, ARS' },
    { id: 67, owner: 1, by: 1, type: 'information', title: 'Erreurs courantes de mesure du pH et du chlore', category: "Chimie de l'eau", summary: "La majorité des résultats aberrants viennent d'une erreur de prélèvement ou de réactif, pas de l'eau elle-même.", content: `Réactifs périmés : les réactifs liquides (DPD, phénol red) se conservent environ un an ; passé ce délai, les résultats deviennent peu fiables.
Contamination : toucher l'embout du flacon ou la bandelette avec les doigts, ou mal refermer un bouchon, contamine le réactif et fausse durablement les tests suivants.
Stockage inadapté : conserver les réactifs à l'abri de la lumière et de la chaleur (5 à 22°C) ; un flacon laissé au soleil dans la caisse à outils se dégrade vite.
Mauvais timing de lecture : lire trop tôt ou trop tard après la réaction chimique change la couleur perçue et donc la valeur lue.
pH trop bas ou trop haut faussant la lecture du chlore : en dessous de 7,0 ou au-dessus de 7,8, l'efficacité et la détection du chlore par les réactifs se dégradent — toujours contrôler le pH en même temps que le chlore.
Prélèvement non représentatif : un échantillon pris en surface ou juste après un ajout de produit ne reflète pas l'état réel du bassin.`, tags: 'erreurs mesure, réactifs périmés, contamination, fiabilité test' },
    { id: 68, owner: 3, by: 3, type: 'information', title: 'Réglementation des piscines collectives (ARS)', category: 'Réglementation & sécurité', summary: 'Carnet sanitaire, classification des établissements et contrôle sanitaire externe.', content: `Toute piscine à usage collectif (hôtel, camping, résidence de tourisme, centre de vacances...) est soumise à une obligation de moyens et de résultats en matière de sécurité sanitaire de l'eau, encadrée notamment par l'arrêté du 26 mai 2021.
Les établissements sont classés en 4 types (A à D) selon leur nature et leur fréquentation, ce qui détermine la fréquence du contrôle sanitaire réalisé par un laboratoire agréé pour le compte de l'ARS (Agence Régionale de Santé) : pour les piscines de type A la fréquence peut descendre jusqu'à une fois tous les deux mois ; les établissements saisonniers (ouverture ≤ 6 mois) doivent être contrôlés au moins 2 fois par période d'ouverture.
En complément du contrôle externe, l'exploitant doit assurer un autocontrôle quotidien (température, pH, désinfectant, transparence) consigné dans le carnet sanitaire, document obligatoire à présenter lors de toute inspection.`, tags: 'ARS, piscine collective, carnet sanitaire, classification établissement' },
    { id: 69, owner: 1, by: 1, type: 'information', title: 'Différences pratiques : piscine hors-sol, gonflable, tubulaire, enterrée', category: 'Équipements', summary: 'Le faible volume et la structure légère changent radicalement le rythme d\'entretien.', content: `Piscine gonflable : installation/désinstallation saisonnière voire ponctuelle, très faible volume, eau souvent simplement renouvelée plutôt que traitée en continu, structure fragile sensible à l'usure.
Piscine tubulaire/autoportée : installation plus durable sur la saison, nécessite une vraie filtration et un suivi régulier de l'eau comme un bassin enterré, mais avec un volume réduit qui se déséquilibre et se réchauffe beaucoup plus vite (contrôles plus fréquents nécessaires).
Piscine enterrée : volume plus important qui offre une meilleure inertie et stabilité des paramètres, mais nécessite des équipements fixes (filtration, éventuellement PAC/électrolyseur) et le nettoyage de tous ses recoins fixes (skimmers, ligne d'eau, margelles).
Dans tous les cas, le principe reste le même (filtration + équilibre de l'eau + désinfection) mais la fréquence et l'intensité des gestes doivent être adaptées au volume et à la stabilité thermique du bassin.`, tags: 'hors-sol, gonflable, tubulaire, enterrée, comparatif' },
    { id: 70, owner: 1, by: 2, type: 'information', title: 'Piscine à débordement / miroir : fonctionnement du bac tampon', category: 'Équipements', summary: 'Le bac tampon, spécificité technique de ces bassins, s\'entretient comme un skimmer géant.', content: `Dans une piscine à débordement, l'eau s'écoule en continu par une ou plusieurs goulottes vers un bac tampon (ou bac de rétention), un réservoir indépendant du bassin qui reçoit toute l'eau de surface avec les déchets qu'elle transporte (feuilles, pollens, résidus de crème solaire...). Ce bac représente généralement environ 10% du volume total du bassin.
Le bac tampon est équipé d'une sonde de niveau et d'une électrovanne d'appoint qui régulent automatiquement le niveau d'eau (compensant l'évaporation et les éclaboussures).
Quand le débordement est total sur tous les côtés du bassin, on parle de piscine "miroir" : l'eau affleure exactement le niveau du sol pour un effet visuel de reflet.
L'entretien du bac tampon (nettoyage régulier des déchets accumulés, contrôle de la sonde et de l'électrovanne) est indispensable : négligé, il devient un foyer de prolifération d'algues qui contamine ensuite tout le bassin.`, tags: 'débordement, miroir, bac tampon, goulotte' },
    { id: 71, owner: 1, by: 1, type: 'information', title: 'Piscine naturelle / biologique : principe et entretien', category: 'Équipements', summary: 'Une filtration par les plantes et les bactéries, sans chlore.', content: `Une piscine naturelle (ou biologique) fonctionne sans traitement chimique : elle repose sur le principe du lagunage, avec une zone de baignade et une zone de régénération (lagunage) où plantes aquatiques et micro-organismes assurent l'épuration de l'eau.
L'eau circule en permanence entre les deux zones grâce à une pompe, imitant le fonctionnement d'un écosystème naturel.
L'entretien reste nécessaire mais différent d'un bassin classique : vidage régulier des skimmers, aspiration ou retrait manuel des algues sur les galets et parois, nettoyage du fond environ une fois par semaine, et surtout entretien de la zone plantée (taille, retrait des plantes mortes) pour garantir l'efficacité de la filtration biologique.
L'équilibre de ce type de bassin est plus lent à s'installer (souvent une saison complète) mais, une fois stabilisé, demande moins de gestes chimiques qu'une piscine traditionnelle.`, tags: 'piscine naturelle, biologique, lagunage, sans chlore' },
    { id: 72, owner: 1, by: 2, type: 'information', title: 'Robot électrique vs robot hydraulique : comparatif', category: 'Équipements', summary: 'Autonomie, capacités de nettoyage et entretien : deux logiques différentes.', content: `Robot hydraulique : se raccorde à la prise balai ou au skimmer, fonctionne grâce au débit d'eau généré par la pompe de filtration existante. Nettoie principalement le fond (rarement les parois). Peu de composants électroniques donc grande fiabilité mécanique, mais sollicite davantage le préfiltre et le filtre du bassin qu'il faut nettoyer plus souvent.
Robot électrique : totalement autonome, se branche simplement sur une prise électrique (ou fonctionne sur batterie), possède son propre système d'aspiration et de filtration embarqué. Nettoie fond, parois et parfois ligne d'eau en 1h30 à 2h. Entretien limité au nettoyage du filtre/des brosses après chaque cycle, mais coût d'achat nettement plus élevé et plus de composants électroniques pouvant tomber en panne.
Le choix dépend du budget, du niveau d'exigence de propreté recherché et de la sollicitation acceptable du système de filtration existant.`, tags: 'robot électrique, robot hydraulique, comparatif, prise balai' },
    { id: 73, owner: 1, by: 1, type: 'information', title: 'Formule précise de dosage du chlore choc', category: 'Calculs & formules', summary: 'La règle des 20 g/m³, et comment l\'ajuster.', content: `Formule générale : dose (kg) = volume du bassin (m³) × concentration visée (ppm) ÷ concentration du produit (%).
Règle simplifiée couramment utilisée par les professionnels : environ 20 g de chlore choc par m³ pour un traitement standard, ce qui vise environ 5 ppm (5 mg/L) de chlore libre actif dans l'eau — suffisant pour éliminer algues, bactéries et virus.
En cas d'eau très verte, très trouble, ou après une forte fréquentation ponctuelle (fête, forte chaleur), le dosage peut être ponctuellement monté à 25-30 g/m³, en recontrôlant impérativement le taux de chlore avant toute nouvelle baignade.
Rappel indispensable : le choc n'est pleinement efficace que si le pH est préalablement ramené entre 7.2 et 7.4, et la filtration doit tourner en continu pendant au moins 24h après l'application.`, tags: 'chlore choc, dosage, formule, ppm, g/m3' },
    { id: 74, owner: 3, by: 3, type: 'information', title: 'Réglementation du rejet des eaux de vidange', category: 'Réglementation & sécurité', summary: 'Un rejet mal préparé est une infraction et un risque environnemental.', content: `Le rejet des eaux de vidange d'un bassin dans le réseau collectif d'eaux usées est en principe interdit (article R.1331-2 du Code de la santé publique), sauf dérogation accordée par le service d'assainissement si la capacité de ses ouvrages le permet sans nuire au milieu récepteur — une autorisation préalable doit donc être demandée.
Le rejet sauvage dans la nature (cours d'eau, fossé) est interdit par l'article L211-2 du Code de l'environnement.
Quand elle est possible, l'évacuation se fait de préférence par infiltration dans le sol, via un puits de décantation, après neutralisation complète du chlore.
Précaution essentielle : arrêter tout traitement au chlore au moins 15 jours avant la vidange pour laisser le temps aux résidus de se neutraliser naturellement et protéger la faune/flore aquatique du milieu récepteur.`, tags: 'vidange, rejet eau, réglementation environnementale, neutralisation' },
    { id: 75, owner: 3, by: 4, type: 'information', title: 'Stockage du chlore : risques d\'incendie et cadre ICPE', category: 'Réglementation & sécurité', summary: 'Le chlore est un comburant : mal stocké, il peut provoquer un incendie ou une explosion.', content: `Les produits chlorés de traitement de piscine présentent un risque chimique spécifique (incendie, dégagement de gaz toxiques) renforcé depuis les évolutions réglementaires de janvier 2020 sur le stockage des produits de traitement de l'eau.
Certains produits chlorés peuvent libérer du trichlorure d'azote en cas de mélange accidentel ou d'humidification, en quantité suffisante pour déclencher un incendie voire une explosion.
Pour un stockage de chlore gazeux en grande quantité (installations collectives), le cadre ICPE impose une déclaration à partir de 100 kg et une autorisation à partir de 500 kg de capacité totale.
Règles de base pour tout local technique : ne jamais stocker de matières combustibles à proximité du chlore, local clos, aéré, à l'abri du soleil et d'une température ambiante ne dépassant pas 50°C, produits toujours dans leur emballage d'origine étiqueté.`, tags: 'stockage chlore, ICPE, risque incendie, comburant, trichlorure d\'azote' },
    { id: 76, owner: 1, by: 1, type: 'information', title: 'Inhalation de chlore : symptômes et premiers secours', category: 'Réglementation & sécurité', summary: 'Réagir vite et bien en cas d\'exposition accidentelle en local technique.', content: `Symptômes d'une exposition au chlore : picotements de gorge, toux, sensation d'étouffement, maux de tête, larmoiement, irritation cutanée et oculaire, douleurs thoraciques dans les cas plus sérieux.
Premiers gestes : évacuer immédiatement la victime à l'air frais, si possible en hauteur (le chlore gazeux est plus lourd que l'air et stagne au sol), et la mettre au repos sans la faire marcher inutilement.
Retirer les vêtements contaminés et laver abondamment les zones de peau exposées.
En cas de projection dans les yeux : rincer abondamment à l'eau tiède pendant plusieurs minutes.
Il n'existe pas de traitement spécifique à l'inhalation de chlore : appeler les secours (15 ou 112) en cas de symptômes respiratoires marqués ou persistants, une prise en charge médicale peut être nécessaire.`, tags: 'inhalation chlore, intoxication, premiers secours, urgence' },
    { id: 77, owner: 1, by: 2, type: 'information', title: 'Identifier et comprendre les taches métalliques (fer, cuivre, manganèse)', category: "Algues & pathologies de l'eau", summary: 'La couleur de l\'eau ou des taches oriente directement le diagnostic.', content: `Eau verte translucide (à ne pas confondre avec des algues) : signe de présence de cuivre, souvent lié à la corrosion de canalisations en cuivre ou d'une cellule d'électrolyse en fin de vie.
Teinte rouille ou brune : présence de fer, fréquente sur les eaux de forage ou de puits utilisées pour le remplissage.
Nuances noires en dépôt : présence de manganèse.
Ces métaux, une fois oxydés (notamment après un choc chlore mal anticipé), précipitent et se déposent sous forme de taches sur les parois, le fond et les équipements — d'où l'importance de traiter les métaux avec un séquestrant avant tout traitement choc plutôt qu'après.`, tags: 'taches métalliques, fer, cuivre, manganèse, diagnostic couleur eau' },
    { id: 78, owner: 1, by: 1, type: 'information', title: 'La caisse à outils du pisciniste : le matériel indispensable', category: 'Calendrier & organisation', summary: 'Regrouper le nécessaire dans une caisse dédiée fait gagner un temps précieux à chaque intervention.', content: `Analyse de l'eau : testeur à pastilles DPD (voire photomètre électronique), bandelettes de dépannage, réactifs de rechange non périmés.
Nettoyage : épuisette de surface, brosse pour parois (adaptée au revêtement), balai aspirateur manuel, éponge/pierre à récurer pour la ligne d'eau.
Produits : pH+, pH-, chlore choc, rehausseur/réducteur de TAC, floculant, séquestrant métaux — en quantités adaptées à la tournée du jour.
Petit outillage technique : tournevis, pince, joints toriques de rechange, graisse silicone, ruban téflon, clé de vidange de filtre.
Protection individuelle : gants résistants aux produits chimiques, lunettes de protection, indispensables dès qu'un produit concentré est manipulé.
Suivi : carnet de suivi ou application mobile pour consigner les relevés et interventions à chaque passage.`, tags: 'caisse à outils, matériel professionnel, équipement pisciniste' },
  ]

  for (const p of [...procedures, ...informations]) {
    lines.push(`INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (${p.id}, ${p.owner}, ${p.by}, '${p.type}', '${p.title.replace(/'/g, "''")}', '${p.category.replace(/'/g, "''")}', '${p.summary.replace(/'/g, "''")}', '${p.content.replace(/'/g, "''")}', '${p.tags.replace(/'/g, "''")}');`)
  }

  lines.push('')
  lines.push('-- Fin du seed démo')

  writeFileSync(new URL('../seed-demo.sql', import.meta.url), lines.join('\n'))
  console.log('seed-demo.sql généré :', lines.length, 'lignes')
}
main()
