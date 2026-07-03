-- ============================================================
-- SEED DÉMO Piscine Max (multi-tenant) — mot de passe : piscine
-- Réinitialise toutes les données de démonstration.
-- ============================================================
DELETE FROM photos;
DELETE FROM maintenance_logs;
DELETE FROM maintenances;
DELETE FROM pool_seasons;
DELETE FROM pools;
DELETE FROM clients;
DELETE FROM pro_workers;
DELETE FROM procedures;
DELETE FROM users;
DELETE FROM sqlite_sequence WHERE name IN ('users','clients','pools','maintenances','maintenance_logs','pro_workers','photos','pool_seasons','procedures');

INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (1, 'franck@piscine-max.fr', 'pbkdf2$100000$aee15aae8647d481b04630477413ce7d$f79f66e84e7469cdd54221de789f3c4769b70fd37789dcea749b0158040839ca', 'Franck', 'member', '#0891b2', 'Piscine Max', '06 12 34 56 78', NULL);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (2, 'romain@piscine-max.fr', 'pbkdf2$100000$df47d086feffd6d68ecd229e2e7fc1df$940fee7512f9199eb43ef2ef6264f0efca0b8ad3f988f8fb039ba219e2cfb8fc', 'Romain', 'member', '#16a34a', NULL, '06 98 76 54 32', 1);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (3, 'sophie@aquazur.fr', 'pbkdf2$100000$f64479a0a4324ac7d41c8a3646b24318$eb925c415dcf51568dd03c1b4f36d32ebb69f1d9708c6224cc10c99bbcc700e2', 'Sophie Marin', 'member', '#8b5cf6', 'AquaZur', '06 11 22 33 44', NULL);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (4, 'leo@aquazur.fr', 'pbkdf2$100000$d88f7d1aecd0720f00e11431c95bb621$96c978917769498a9b1702a2742f8586ba7e9958e9c6e98e9ba7990d1ba12ae6', 'Léo', 'member', '#f59e0b', NULL, '06 55 66 77 88', 3);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (5, 'client1@piscine-max.fr', 'pbkdf2$100000$4203c425a29b276d428588cf6f7c26d7$472766bb5820b441b2db40e5b4cfc4b201164a210f5ed9050b0777f3d5916b65', 'Famille Dubois', 'client', '#64748b', NULL, NULL, 1);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (6, 'client2@piscine-max.fr', 'pbkdf2$100000$291eaa3be95deda50a753795ebcf0b00$1b3017a2924c306082b7017ad5731ff240359e6090ea739c5383e6c39aaf0148', 'M. Lefevre', 'client', '#64748b', NULL, NULL, 1);

INSERT INTO pro_workers (pro_id, worker_id) VALUES (1, 2);  -- Romain bosse pour Franck
INSERT INTO pro_workers (pro_id, worker_id) VALUES (3, 4);  -- Léo bosse pour Sophie
INSERT INTO pro_workers (pro_id, worker_id) VALUES (3, 2);  -- Romain bosse AUSSI pour Sophie (un user, 2 employeurs)

INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (1, 'Famille Dubois', '06 20 11 22 33', 'client1@piscine-max.fr', 'Maison avec grand portail bleu. Sonner 2 fois.', 1, 5);
INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (2, 'M. Lefevre', '06 30 44 55 66', 'client2@piscine-max.fr', 'Résidence secondaire, présent surtout l''été.', 1, 6);
INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (3, 'Villa Les Mimosas', '04 94 00 11 22', 'contact@lesmimosas.fr', 'Location saisonnière, 2 piscines à entretenir.', 1, NULL);
INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (4, 'Restaurant La Plage', '04 94 33 44 55', 'resa@laplage.fr', 'Piscine du restaurant, entretien tôt le matin avant ouverture.', 1, NULL);
INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (5, 'M. et Mme Garcia', '06 77 88 99 00', 'garcia@exemple.fr', 'Client de Sophie.', 3, NULL);
INSERT INTO clients (id, name, phone, email, notes, owner_id, client_user_id) VALUES (6, 'Camping Le Pin', '04 94 99 88 77', 'camping@lepin.fr', 'Grande piscine collective.', 3, NULL);

INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (1, 1, 1, 'Piscine principale', '12 Chemin des Oliviers, 83110 Sanary-sur-Mer', 43.1287, 5.8011, 'enterrée', 48, 'rectangulaire', 'sel/électrolyse', 'sable', 'B1234', 'Portail bleu, local technique au fond du jardin à droite. Chien gentil.', '["Vérifier le niveau d''eau","Nettoyer les skimmers et le préfiltre","Tester pH et chlore","Brosser les parois","Contrôler la pression du filtre"]', 'Passez le robot 1 à 2 fois par semaine. Maintenez le niveau d''eau à la moitié des skimmers. Évitez de vous baigner dans les 4h après un ajout de produit.', 7, 7.4, 1, 2, 1, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);
INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (2, 2, 1, 'Piscine', '45 Avenue de la Mer, 83140 Six-Fours-les-Plages', 43.0942, 5.8389, 'coque', 32, 'haricot', 'chlore', 'cartouche', '', 'Clé sous le pot de fleurs près de la porte de garage.', '["Tester pH et chlore","Nettoyer la ligne d''eau","Vider les paniers"]', 'Surveillez la couleur de l''eau. En cas d''eau trouble, appelez-moi.', 7, 7.4, 1.5, 3, 0, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);
INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (3, 3, 1, 'Grande piscine', '8 Route de Bandol, 83150 Bandol', 43.1355, 5.7531, 'béton', 75, 'rectangulaire', 'sel/électrolyse', 'sable', 'C5678', 'Code portail C5678. Piscine côté terrasse.', '["Analyse complète de l''eau","Nettoyage robot","Backwash filtre","Contrôle électrolyseur"]', '', 7.2, 7.6, 1, 2, 1, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);
INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (4, 3, 1, 'Petit bassin', '8 Route de Bandol, 83150 Bandol', 43.1358, 5.7535, 'béton', 18, 'carrée', 'chlore', 'cartouche', 'C5678', 'Même accès que la grande piscine.', '["Tester pH et chlore","Nettoyer le bassin"]', '', 7, 7.4, 1, 2, 0, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);
INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (5, 4, 1, 'Piscine restaurant', '2 Promenade du Front de Mer, 83110 Sanary-sur-Mer', 43.1201, 5.7998, 'enterrée', 60, 'libre', 'sel/électrolyse', 'verre', 'RESTO', 'Entrée par l''arrière, avant 9h. Demander au gérant.', '["Analyse eau","Nettoyage complet","Vérifier propreté plages"]', '', 7, 7.4, 1.5, 2.5, 1, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);
INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (6, 5, 3, 'Piscine Garcia', '15 Rue des Lauriers, 83000 Toulon', 43.1242, 5.928, 'enterrée', 40, 'ovale', 'chlore', 'sable', '9012', 'Portail vert.', '["pH chlore","Skimmers"]', '', 7, 7.4, 1, 2, 0, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);
INSERT INTO pools (id, client_id, owner_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, routine_client, ideal_ph_min, ideal_ph_max, ideal_chlorine_min, ideal_chlorine_max, priority, ideal_salt_min, ideal_salt_max, ideal_tac_min, ideal_tac_max, ideal_stabilizer_min, ideal_stabilizer_max, depth_avg_m, expected_interval_days) VALUES (7, 6, 3, 'Piscine camping', '100 Route des Pins, 83270 Saint-Cyr-sur-Mer', 43.18, 5.71, 'béton', 120, 'rectangulaire', 'sel/électrolyse', 'sable', 'CAMP', 'Voir réception.', '["Analyse","Robot","Backwash"]', '', 7.2, 7.6, 1.5, 3, 1, 3.0, 5.0, 80, 120, 30, 50, 1.5, 7);

INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (1, 1, 2, 'recurring', 2, 1, '2025-01-01', '09:00', 45, 'Entretien hebdo');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (2, 2, 1, 'recurring', 3, 2, '2025-01-01', '10:30', 30, 'Toutes les 2 semaines');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (3, 3, 2, 'recurring', 2, 1, '2025-01-01', '11:00', 60, '');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (4, 4, 2, 'recurring', 2, 1, '2025-01-01', '12:15', 20, 'Juste après la grande');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (5, 5, 1, 'recurring', 5, 1, '2025-01-01', '07:30', 45, 'Avant ouverture resto');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, oneshot_date, time, duration_min, notes) VALUES (6, 1, 1, 'oneshot', '2026-07-08', '14:00', 60, 'Hivernage');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (7, 6, 4, 'recurring', 1, 1, '2025-01-01', '09:00', 30, '');
INSERT INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES (8, 7, 4, 'recurring', 4, 1, '2025-01-01', '08:00', 90, '');

INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (1, 'Haute saison', '06-01', '09-15', 3, NULL, 0, 1);
INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (1, 'Mi-saison', '04-01', '05-31', 7, NULL, 1, 1);
INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (1, 'Automne', '09-16', '10-31', 7, NULL, 2, 1);
INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (1, 'Hivernage', '11-01', '03-31', 30, NULL, 3, 1);
INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (5, 'Pleine saison resto', '05-15', '09-30', 2, NULL, 0, 1);
INSERT INTO pool_seasons (pool_id, label, start_md, end_md, interval_days, weekday, sort_order, active) VALUES (5, 'Hors saison', '10-01', '05-14', 14, NULL, 1, 1);

INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (1, 1, 2, '2026-05-08', 'done', 7.6, 0.4, 4.2, 27, 35, 110, 'pH- 1L, chlore choc 500g', 'pH un peu haut, corrigé', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (2, 1, 2, '2026-05-15', 'done', 7.5, 0.6, 4.1, 27, 35, 105, 'pH- 0.5L', 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (3, 1, 2, '2026-05-22', 'done', 7.3, 1.2, 4, 26, 32, 100, NULL, 'Eau nickel', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (4, 1, 2, '2026-05-29', 'done', 7.2, 1.5, 4, 26, 30, 100, NULL, 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (5, 1, 2, '2026-06-05', 'done', 7.2, 1.6, 3.9, 25, 30, 98, NULL, 'Filtre nettoyé', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (6, 1, 2, '2026-06-12', 'done', 7.1, 1.8, 4, 24, 28, 95, NULL, 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (7, 1, 2, '2026-06-19', 'done', 7.2, 1.7, 4, 23, 30, 100, NULL, 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (8, 1, 2, '2026-06-30', 'done', 7.9, 0.4, 4, 29, 30, 100, NULL, 'Forte chaleur, chlore consommé — à resurveiller', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (9, 3, 2, '2026-06-05', 'done', 7.8, 0.8, 4.5, 27, 40, 120, 'pH- 2L', 'pH haut', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (10, 3, 2, '2026-06-12', 'done', 7.5, 1.4, 4.3, 26, 38, 110, NULL, 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (11, 3, 2, '2026-06-19', 'done', 7.4, 1.6, 4.2, 25, 35, 105, NULL, 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (12, 3, 2, '2026-06-26', 'done', 7.3, 1.8, 4.2, 24, 35, 100, NULL, 'Backwash effectué', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (13, 2, 1, '2026-06-23', 'done', 7.3, 1.5, NULL, 25, 30, 90, NULL, 'RAS', 45);
INSERT INTO maintenance_logs (id, maintenance_id, done_by, done_date, status, ph, chlorine, salt, water_temp, stabilizer, tac, products_added, notes, duration_min) VALUES (14, 2, 1, '2026-06-09', 'done', 7.4, 1.2, NULL, 24, 30, 90, 'Chlore lent 1kg', 'Recharge galets', 45);

INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (1, 1, 1, 'Changer le préfiltre de la pompe', 'Filtration', 'Nettoyer ou remplacer le panier du préfiltre pompe.', '1. Couper l''alimentation électrique de la pompe.
2. Fermer les vannes d''aspiration si présentes.
3. Dévisser et retirer le couvercle transparent du préfiltre.
4. Sortir le panier, le vider et le rincer au jet.
5. Vérifier l''état du joint torique, le graisser légèrement si besoin.
6. Remettre le panier, refermer le couvercle, réamorcer la pompe (remplir d''eau avant de redémarrer).
7. Rouvrir les vannes puis remettre sous tension.', 'préfiltre, pompe, filtration, panier');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (2, 1, 1, 'Changer le sable du filtre à sable', 'Filtration', 'Remplacement complet de la charge de sable du filtre, à faire tous les 5 à 7 ans.', '1. Couper la pompe et mettre la vanne multivoie sur "Fermé".
2. Vidanger la cuve du filtre (vanne de vidange ou tuyau).
3. Ouvrir la trappe supérieure et retirer l''ancien sable à l''aide d''une pelle/aspirateur à sable (attention à ne pas abîmer la crépine centrale).
4. Rincer soigneusement la cuve.
5. Verser un fond d''eau, puis remplir avec le sable neuf (granulométrie adaptée) jusqu''au niveau indiqué par le fabricant.
6. Refermer la trappe, mettre la vanne sur "Lavage" (backwash) 2-3 minutes.
7. Passer en "Rinçage" 30 secondes, puis repasser en "Filtration".', 'filtre à sable, backwash, filtration, entretien annuel');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (3, 1, 1, 'Choc chlore (traitement choc)', 'Traitement de l''eau', 'Procédure à appliquer en cas d''eau trouble, verte ou après une forte affluence.', '1. Tester le pH et le ramener entre 7.2 et 7.4 avant le choc.
2. Calculer la dose de chlore choc selon le volume du bassin (voir dosage produit).
3. Diluer le chlore choc dans un seau d''eau si c''est un produit en poudre/granulés.
4. Verser progressivement au bord du bassin, filtration en marche.
5. Laisser tourner la filtration en continu au moins 24h.
6. Ne pas se baigner tant que le taux de chlore n''est pas redescendu sous 3 mg/L.
7. Recontrôler pH et chlore le lendemain et ajuster.', 'chlore choc, eau trouble, eau verte, désinfection');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (4, 1, 1, 'Hivernage d''une piscine', 'Hivernage / Estivage', 'Mise en hivernage passif ou actif avant l''arrêt saisonnier.', '1. Nettoyer soigneusement le bassin (brossage parois + fond, aspiration).
2. Équilibrer l''eau (pH 7.2-7.4, TAC correct) et faire un traitement choc.
3. Ajouter un produit d''hivernage adapté au traitement (chlore, sel, brome...).
4. Baisser le niveau d''eau sous les skimmers (hivernage passif) ou laisser tourner la filtration au ralenti (hivernage actif, climat doux).
5. Vider les canalisations exposées au gel, poser les gizzmos/flotteurs anti-gel dans skimmers et refoulements.
6. Démonter, vidanger et stocker au sec la pompe et le filtre si hivernage passif complet.
7. Couvrir le bassin (bâche d''hivernage ou volet).', 'hivernage, gel, fermeture saisonnière');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (5, 1, 2, 'Remise en route au printemps', 'Hivernage / Estivage', 'Réouverture de la piscine après hivernage.', '1. Retirer la bâche/volet d''hivernage, la nettoyer avant stockage.
2. Retirer les gizzmos et remonter pompe/filtre si démontés.
3. Remonter le niveau d''eau au-dessus des skimmers.
4. Nettoyer le bassin (brossage, aspiration des feuilles et dépôts hivernaux).
5. Faire un backwash complet du filtre avant remise en route.
6. Relancer la filtration en continu 24-48h.
7. Tester et rééquilibrer TAC, pH puis chlore ; refaire un choc si l''eau est trouble.', 'remise en route, printemps, réouverture');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (6, 1, 2, 'Pompe qui ne s''amorce plus', 'Dépannage matériel', 'Diagnostic rapide en cas de pompe qui tourne mais n''aspire pas l''eau.', '1. Vérifier qu''il n''y a pas de prise d''air : contrôler le joint du couvercle du préfiltre et le niveau d''eau du bassin.
2. Nettoyer le panier du préfiltre s''il est colmaté.
3. Vérifier que les vannes d''aspiration sont bien ouvertes.
4. Remplir le préfiltre d''eau manuellement pour réamorcer, remettre le couvercle, redémarrer.
5. Si toujours rien : contrôler le clapet anti-retour et la canalisation d''aspiration pour une fuite d''air.
6. Si le souci persiste, vérifier l''état de la turbine et du moteur (bruit anormal, échauffement).', 'pompe, amorçage, panne, dépannage');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (7, 3, 3, 'Contrôle électrolyseur au sel', 'Traitement de l''eau', 'Vérification mensuelle d''une installation de traitement au sel.', '1. Vérifier le taux de sel avec un testeur dédié (cible générale 3 à 5 g/L, voir notice du bassin).
2. Contrôler les cellules de l''électrolyseur : détartrer si dépôt blanchâtre visible.
3. Vérifier l''affichage du boîtier (% de production, alarme éventuelle).
4. Ajuster la production selon la température de l''eau et la fréquentation.
5. Recontrôler pH et chlore générés après réglage.', 'sel, électrolyseur, cellule, détartrage');
INSERT INTO procedures (id, owner_id, created_by, title, category, summary, content, tags) VALUES (8, 3, 3, 'Nettoyage de la ligne d''eau', 'Nettoyage', 'Retirer les traces de calcaire, graisses et pollens à la ligne de flottaison.', '1. Baisser légèrement le niveau d''eau si les traces sont importantes.
2. Utiliser un nettoyant spécial ligne d''eau adapté au revêtement (liner, carrelage, coque).
3. Frotter avec une éponge non abrasive ou une pierre à récurer pour le carrelage.
4. Rincer abondamment pour ne pas polluer l''eau du bassin.
5. Remettre le niveau d''eau au bon repère.', 'ligne d''eau, calcaire, nettoyage, esthétique');

-- Fin du seed démo