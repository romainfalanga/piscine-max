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

INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (1, 'franck@piscine-max.fr', 'pbkdf2$100000$53820a7bd59804bac9e3234ccc007b73$e99ca49772b4bdc828b803ef2c8b892481e986d65030466b4171319bc54f9fce', 'Franck', 'member', '#0891b2', 'Piscine Max', '06 12 34 56 78', NULL);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (2, 'romain@piscine-max.fr', 'pbkdf2$100000$3e2c016eb7c96619da160f10dd55fe76$36fca892519c6ccc2d3a907c273c747f9c61630a77bf39a7ea9d49e07fdcdd56', 'Romain', 'member', '#16a34a', NULL, '06 98 76 54 32', 1);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (3, 'sophie@aquazur.fr', 'pbkdf2$100000$462337fea5e44733b6472a4671ff2266$78e7c3fccd25802d7d1f4567b280f80e9a131b3c47a2710392eecc3c3f73bbb1', 'Sophie Marin', 'member', '#8b5cf6', 'AquaZur', '06 11 22 33 44', NULL);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (4, 'leo@aquazur.fr', 'pbkdf2$100000$81c10af891a5ebbf371924cd7c7a2cb3$e6ad99f55a33658846df58937c0a358b846431a4b212acd24b4e603b9b4ddf37', 'Léo', 'member', '#f59e0b', NULL, '06 55 66 77 88', 3);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (5, 'client1@piscine-max.fr', 'pbkdf2$100000$7f27e26e203e990cd0a940cd073f6181$a98671066a6cf8f7bffda1abbe1ef73d8f575e328ec25cf2716fab43f3229e10', 'Famille Dubois', 'client', '#64748b', NULL, NULL, 1);
INSERT INTO users (id, email, password_hash, name, role, color, company, phone, created_by) VALUES (6, 'client2@piscine-max.fr', 'pbkdf2$100000$9c34444822513a80b10417256017a8df$6b2dc04e6bb030b1454b6b08fe8a911ff0bbd3d42a166e9a267a56d0d2c5b78e', 'M. Lefevre', 'client', '#64748b', NULL, NULL, 1);

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

INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (1, 1, 1, 'procedure', 'Changer le préfiltre de la pompe', 'Filtration', 'Nettoyer ou remplacer le panier du préfiltre pompe.', '1. Couper l''alimentation électrique de la pompe.
2. Fermer les vannes d''aspiration si présentes.
3. Dévisser et retirer le couvercle transparent du préfiltre.
4. Sortir le panier, le vider et le rincer au jet.
5. Vérifier l''état du joint torique, le graisser légèrement si besoin.
6. Remettre le panier, refermer le couvercle, réamorcer la pompe (remplir d''eau avant de redémarrer).
7. Rouvrir les vannes puis remettre sous tension.', 'préfiltre, pompe, filtration, panier');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (2, 1, 1, 'procedure', 'Changer le sable du filtre à sable', 'Filtration', 'Remplacement complet de la charge de sable du filtre, à faire tous les 5 à 7 ans.', '1. Couper la pompe et mettre la vanne multivoie sur "Fermé".
2. Vidanger la cuve du filtre (vanne de vidange ou tuyau).
3. Ouvrir la trappe supérieure et retirer l''ancien sable à l''aide d''une pelle/aspirateur à sable (attention à ne pas abîmer la crépine centrale).
4. Rincer soigneusement la cuve.
5. Verser un fond d''eau, puis remplir avec le sable neuf (granulométrie adaptée) jusqu''au niveau indiqué par le fabricant.
6. Refermer la trappe, mettre la vanne sur "Lavage" (backwash) 2-3 minutes.
7. Passer en "Rinçage" 30 secondes, puis repasser en "Filtration".', 'filtre à sable, backwash, filtration, entretien annuel');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (3, 1, 1, 'procedure', 'Choc chlore (traitement choc)', 'Traitement de l''eau', 'Procédure à appliquer en cas d''eau trouble, verte ou après une forte affluence.', '1. Tester le pH et le ramener entre 7.2 et 7.4 avant le choc.
2. Calculer la dose de chlore choc selon le volume du bassin (voir dosage produit).
3. Diluer le chlore choc dans un seau d''eau si c''est un produit en poudre/granulés.
4. Verser progressivement au bord du bassin, filtration en marche.
5. Laisser tourner la filtration en continu au moins 24h.
6. Ne pas se baigner tant que le taux de chlore n''est pas redescendu sous 3 mg/L.
7. Recontrôler pH et chlore le lendemain et ajuster.', 'chlore choc, eau trouble, eau verte, désinfection');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (4, 1, 1, 'procedure', 'Hivernage d''une piscine', 'Hivernage / Estivage', 'Mise en hivernage passif ou actif avant l''arrêt saisonnier.', '1. Nettoyer soigneusement le bassin (brossage parois + fond, aspiration).
2. Équilibrer l''eau (pH 7.2-7.4, TAC correct) et faire un traitement choc.
3. Ajouter un produit d''hivernage adapté au traitement (chlore, sel, brome...).
4. Baisser le niveau d''eau sous les skimmers (hivernage passif) ou laisser tourner la filtration au ralenti (hivernage actif, climat doux).
5. Vider les canalisations exposées au gel, poser les gizzmos/flotteurs anti-gel dans skimmers et refoulements.
6. Démonter, vidanger et stocker au sec la pompe et le filtre si hivernage passif complet.
7. Couvrir le bassin (bâche d''hivernage ou volet).', 'hivernage, gel, fermeture saisonnière');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (5, 1, 2, 'procedure', 'Remise en route au printemps', 'Hivernage / Estivage', 'Réouverture de la piscine après hivernage.', '1. Retirer la bâche/volet d''hivernage, la nettoyer avant stockage.
2. Retirer les gizzmos et remonter pompe/filtre si démontés.
3. Remonter le niveau d''eau au-dessus des skimmers.
4. Nettoyer le bassin (brossage, aspiration des feuilles et dépôts hivernaux).
5. Faire un backwash complet du filtre avant remise en route.
6. Relancer la filtration en continu 24-48h.
7. Tester et rééquilibrer TAC, pH puis chlore ; refaire un choc si l''eau est trouble.', 'remise en route, printemps, réouverture');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (6, 1, 2, 'procedure', 'Pompe qui ne s''amorce plus', 'Dépannage matériel', 'Diagnostic rapide en cas de pompe qui tourne mais n''aspire pas l''eau.', '1. Vérifier qu''il n''y a pas de prise d''air : contrôler le joint du couvercle du préfiltre et le niveau d''eau du bassin.
2. Nettoyer le panier du préfiltre s''il est colmaté.
3. Vérifier que les vannes d''aspiration sont bien ouvertes.
4. Remplir le préfiltre d''eau manuellement pour réamorcer, remettre le couvercle, redémarrer.
5. Si toujours rien : contrôler le clapet anti-retour et la canalisation d''aspiration pour une fuite d''air.
6. Si le souci persiste, vérifier l''état de la turbine et du moteur (bruit anormal, échauffement).', 'pompe, amorçage, panne, dépannage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (7, 3, 3, 'procedure', 'Contrôle électrolyseur au sel', 'Traitement de l''eau', 'Vérification mensuelle d''une installation de traitement au sel.', '1. Vérifier le taux de sel avec un testeur dédié (cible générale 3 à 5 g/L, voir notice du bassin).
2. Contrôler les cellules de l''électrolyseur : détartrer si dépôt blanchâtre visible.
3. Vérifier l''affichage du boîtier (% de production, alarme éventuelle).
4. Ajuster la production selon la température de l''eau et la fréquentation.
5. Recontrôler pH et chlore générés après réglage.', 'sel, électrolyseur, cellule, détartrage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (8, 3, 3, 'procedure', 'Nettoyage de la ligne d''eau', 'Nettoyage', 'Retirer les traces de calcaire, graisses et pollens à la ligne de flottaison.', '1. Baisser légèrement le niveau d''eau si les traces sont importantes.
2. Utiliser un nettoyant spécial ligne d''eau adapté au revêtement (liner, carrelage, coque).
3. Frotter avec une éponge non abrasive ou une pierre à récurer pour le carrelage.
4. Rincer abondamment pour ne pas polluer l''eau du bassin.
5. Remettre le niveau d''eau au bon repère.', 'ligne d''eau, calcaire, nettoyage, esthétique');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (9, 1, 1, 'procedure', 'Nettoyer et détartrer un filtre à cartouche', 'Filtration', 'Entretien régulier de la ou des cartouches filtrantes.', '1. Couper la pompe et fermer les vannes si présentes.
2. Ouvrir la cuve du filtre et sortir la ou les cartouches.
3. Rincer au jet d''eau en insistant entre les plis, du haut vers le bas.
4. Si la cartouche est encrassée ou entartrée, la tremper une nuit dans un bain de détartrant/dégraissant spécial cartouche.
5. Rincer à nouveau abondamment avant remontage.
6. Vérifier l''état du joint de cuve, le remplacer si craquelé.
7. Remonter, réamorcer la pompe et relancer la filtration.
8. Prévoir le remplacement complet de la cartouche tous les 2 à 3 ans ou dès qu''elle est déformée/percée.', 'cartouche, filtre, détartrage, nettoyage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (10, 1, 2, 'procedure', 'Recharger un filtre à diatomées', 'Filtration', 'Nettoyage des éléments filtrants et rechargement en terre de diatomées.', '1. Couper la pompe, fermer les vannes, mettre la vanne multivoie sur "Vidange".
2. Vidanger la cuve et retirer les grilles (éléments filtrants).
3. Rincer soigneusement les éléments filtrants au jet, en éliminant tous les résidus de terre de diatomées.
4. Vérifier l''état des toiles/grilles et les remplacer si déchirées.
5. Remonter les éléments, refermer la cuve.
6. Mettre en "Filtration", démarrer la pompe et introduire la nouvelle charge de diatomées par le skimmer, dosée selon la surface filtrante du filtre (voir notice fabricant).
7. Vérifier que l''eau ressort claire avant de considérer l''opération terminée.', 'diatomées, filtre, rechargement, précoat');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (11, 1, 1, 'procedure', 'Purger l''air et réamorcer le circuit de filtration', 'Filtration', 'À faire après toute intervention sur le circuit hydraulique ou en cas de prise d''air.', '1. Couper la pompe et fermer les vannes d''aspiration/refoulement.
2. Ouvrir le purgeur d''air du filtre (vis ou bouchon sur le dessus de la cuve).
3. Remplir le préfiltre de la pompe avec de l''eau avant de refermer le couvercle.
4. Rouvrir les vannes, remettre la pompe sous tension.
5. Laisser le purgeur ouvert jusqu''à ce qu''un filet d''eau continu (sans air) en sorte, puis le refermer.
6. Vérifier la pression au manomètre : une pression normale confirme l''amorçage réussi.
7. Si l''air revient en continu, rechercher une prise d''air (joint de préfiltre, raccord, niveau d''eau du bassin insuffisant).', 'amorçage, purge, air, circuit hydraulique');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (12, 1, 2, 'procedure', 'Nettoyer le panier du skimmer', 'Filtration', 'Entretien hebdomadaire de base, à faire plus souvent en période de feuilles/pollens.', '1. Couper la filtration.
2. Ouvrir le couvercle du skimmer et retirer le panier.
3. Vider les débris et rincer le panier au jet.
4. Vérifier le clapet anti-retour (volet) situé au fond du skimmer.
5. Vérifier le joint du couvercle et l''état du skimmer (fissures).
6. Remettre le panier en place, refermer le couvercle, relancer la filtration.
7. À faire au minimum une fois par semaine en pleine saison.', 'skimmer, panier, entretien hebdomadaire');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (13, 1, 1, 'procedure', 'Contrôler et purger la pression du filtre', 'Filtration', 'Surveillance du manomètre pour anticiper le colmatage du filtre.', '1. Relever la pression au manomètre en filtration normale (valeur de référence à noter dès l''installation, ex. 0,6 à 0,8 bar).
2. Si la pression a augmenté de 0,2 à 0,3 bar par rapport à la valeur de référence, le filtre est encrassé : procéder à un lavage (backwash pour sable/diatomées, nettoyage pour cartouche).
3. Si la pression est anormalement basse, vérifier qu''il n''y a pas de manque de débit en amont (préfiltre bouché, vanne fermée).
4. Après un backwash, purger l''air résiduel du filtre via le purgeur avant de remettre en filtration.
5. Noter la pression après nettoyage pour garder une référence à jour.', 'pression, manomètre, backwash, filtre');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (14, 1, 2, 'procedure', 'Rattraper une eau verte', 'Traitement de l''eau', 'Protocole complet de traitement curatif contre les algues vertes.', '1. Analyser pH, TAC et chlore avant toute intervention.
2. Ramener le pH entre 7.0 et 7.4 (l''eau verte fait souvent suite à un pH mal réglé ou un manque de chlore).
3. Brosser énergiquement parois et fond pour décoller les algues.
4. Faire un traitement choc au chlore non stabilisé (dose renforcée selon le volume, voir fiche dosage).
5. Laisser tourner la filtration en continu 24 à 48h, nettoyer le filtre à mi-parcours si la pression grimpe vite.
6. Aspirer les dépôts d''algues mortes au fond à l''évacuation (pas à travers le filtre si les dépôts sont importants).
7. Recontrôler chlore et pH le lendemain, renouveler le choc si l''eau reste trouble.', 'eau verte, algues, choc chlore, rattrapage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (15, 1, 1, 'procedure', 'Rattraper une eau trouble ou laiteuse (floculation)', 'Traitement de l''eau', 'Clarification d''une eau trouble par floculation.', '1. Vérifier et équilibrer pH (7.2-7.4) et chlore avant floculation (le floculant est inefficace si le pH est déséquilibré).
2. Nettoyer le filtre avant traitement pour repartir sur une filtration efficace.
3. Verser le floculant liquide directement devant les buses de refoulement, filtration en marche, ou utiliser des cartouches/galets de floculant dans le skimmer selon le produit.
4. Laisser agir avec une filtration continue de plusieurs heures : les particules en suspension s''agglomèrent en flocons.
5. Pour un filtre à sable : baisser le débit ou passer en position "Recirculation" quelques minutes pour laisser les flocons se déposer, puis repasser en "Filtration" en douceur (éviter le backwash qui renvoie tout au fond).
6. Aspirer manuellement à l''évacuation (hors filtre) les dépôts qui se sont déposés au fond.
7. Nettoyer le filtre une fois l''eau limpide.', 'eau trouble, floculation, laiteuse, clarification');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (16, 1, 2, 'procedure', 'Traiter les algues moutarde (jaunes)', 'Traitement de l''eau', 'Algues jaunâtres résistantes au chlore classique, souvent dans les zones ombragées.', '1. Identifier : dépôt jaunâtre, poudreux, qui se redépose vite après brossage, souvent dans les zones ombragées et les paniers de skimmer.
2. Brosser énergiquement toutes les surfaces touchées et les accessoires (échelle, jouets, maillots à laver aussi car elles s''y accrochent).
3. Réaliser un traitement choc avec un produit anti-algues moutarde spécifique en complément du chlore choc.
4. Nettoyer soigneusement le filtre pendant le traitement (elles s''y logent).
5. Filtration continue 24 à 48h, recontrôler et répéter le brossage/choc si nécessaire.', 'algues moutarde, algues jaunes, traitement');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (17, 1, 1, 'procedure', 'Traiter les algues noires', 'Traitement de l''eau', 'Les plus résistantes, incrustées dans les joints et micro-fissures.', '1. Identifier : taches noires/bleu-vert incrustées, résistantes au brossage simple, souvent sur joints de carrelage ou liner abîmé.
2. Brosser vigoureusement avec une brosse adaptée au revêtement (brosse inox pour béton/carrelage uniquement, jamais sur liner) pour casser la membrane protectrice de l''algue.
3. Appliquer un traitement anti-algues noires concentré directement sur les taches (produit à action choc localisée).
4. Compléter par un traitement choc chlore de l''ensemble du bassin.
5. Filtration continue, renouveler l''opération après quelques jours si les taches persistent.', 'algues noires, traitement résistant, joints');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (18, 1, 2, 'procedure', 'Ajuster le TAC (alcalinité)', 'Traitement de l''eau', 'Toujours le premier paramètre à corriger, avant le pH.', '1. Mesurer le TAC (cible 80-120 mg/L / 8-12 °f) avant toute autre correction : c''est toujours le premier paramètre à régler.
2. Si le TAC est trop bas : ajouter un rehausseur de TAC (bicarbonate de sodium), filtration en marche, en une ou plusieurs fois selon la dose totale à apporter.
3. Si le TAC est trop haut : ajouter un réducteur de TAC (acide) par petites doses successives, en laissant agir et recirculer entre chaque ajout.
4. Attendre plusieurs heures (idéalement 24h) filtration en marche avant de recontrôler.
5. Une fois le TAC stabilisé, passer au réglage du pH.', 'TAC, alcalinité, rehausseur, réducteur');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (19, 1, 1, 'procedure', 'Ajuster le pH (hausse et baisse)', 'Traitement de l''eau', 'À régler après le TAC, en plusieurs petits ajouts.', '1. Mesurer le pH (cible 7.2-7.4) après avoir réglé le TAC.
2. Pour baisser le pH : verser le pH- (liquide ou poudre) directement dans le bassin, filtration en marche, en respectant la dose indiquée sur l''emballage pour le volume du bassin.
3. Pour augmenter le pH : verser le pH+ de la même façon.
4. Ne jamais mélanger pH- et pH+ dans le même traitement, et ne jamais verser un produit concentré directement sur le revêtement ou dans le skimmer.
5. Attendre au moins 2 à 4h, filtration en marche, avant de recontrôler et ajuster à nouveau si besoin.
6. Répartir en plusieurs petits ajouts plutôt qu''une grosse dose unique pour éviter les à-coups.', 'pH, pH plus, pH moins, équilibre eau');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (20, 1, 2, 'procedure', 'Pompe bruyante ou qui chauffe anormalement', 'Dépannage matériel', 'Diagnostic des causes courantes de bruit et surchauffe moteur.', '1. Couper l''alimentation avant toute intervention.
2. Vérifier une prise d''air (bruit de "gargouillis") : contrôler joint de préfiltre, niveau d''eau, vannes d''aspiration.
3. Vérifier qu''aucun corps étranger n''est coincé dans la turbine (démontage du corps de pompe si besoin).
4. Contrôler que la pompe n''est pas désamorcée ou qu''elle ne fonctionne pas à sec.
5. Vérifier l''état des roulements moteur (bruit métallique aigu = roulements à changer, intervention SAV).
6. Vérifier la ventilation du local technique : un moteur qui chauffe dans un local mal ventilé disjoncte par sécurité thermique.
7. Contrôler la tension d''alimentation et l''état du condensateur si moteur monophasé qui peine à démarrer.', 'pompe, bruit, surchauffe, dépannage, roulements');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (21, 1, 1, 'procedure', 'Perte de pression ou débit insuffisant malgré filtration', 'Dépannage matériel', 'Méthode de diagnostic étape par étape.', '1. Vérifier le panier du préfiltre pompe et celui des skimmers : un colmatage réduit fortement le débit.
2. Contrôler la pression au manomètre : si elle est haute, le filtre est encrassé (backwash/nettoyage nécessaire) ; si elle est basse, le souci est en amont du filtre.
3. Vérifier les vannes (position, ouverture complète) et l''absence de vanne partiellement fermée par erreur.
4. Rechercher un colmatage dans les canalisations (feuilles, racines sur réseau enterré ancien).
5. Vérifier que la pompe est bien dimensionnée par rapport au filtre et au volume du bassin.
6. Contrôler l''état de la turbine (usure, entartrage) si le débit reste faible après élimination des autres causes.', 'débit, pression, colmatage, dépannage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (22, 1, 2, 'procedure', 'Étalonner une sonde de régulation pH/redox', 'Dépannage matériel', 'Étalonnage recommandé tous les 1 à 3 mois pour une régulation fiable.', '1. Couper ou mettre en pause la régulation automatique (pH, chlore/redox) avant l''étalonnage.
2. Démonter la sonde et la rincer à l''eau claire.
3. Tremper la sonde dans une solution étalon pH 7, attendre la stabilisation de la mesure, ajuster si l''appareil le permet (bouton "cal").
4. Rincer puis tremper dans une solution étalon pH 4 (ou 10 selon la plage utilisée), ajuster la pente.
5. Pour une sonde redox : utiliser une solution étalon redox dédiée (souvent 465 mV) et ajuster de la même façon.
6. Rincer, remonter la sonde, relancer la régulation et vérifier la cohérence avec une mesure manuelle (test kit ou photomètre).', 'sonde, régulation, redox, pH, étalonnage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (23, 1, 1, 'procedure', 'Pompe à chaleur qui ne chauffe plus ou disjoncte', 'Dépannage matériel', 'Points de contrôle avant intervention d''un frigoriste agréé.', '1. Vérifier que la filtration est bien en marche : une PAC ne chauffe que lorsque l''eau circule (contact de débit).
2. Contrôler la température de consigne et le mode (chauffage/éco) sur le panneau de commande.
3. Vérifier qu''aucun code défaut n''est affiché ; noter le code pour diagnostic ou SAV.
4. Contrôler que l''unité extérieure n''est pas obstruée (feuilles, végétation) et que l''air circule librement autour de l''évaporateur.
5. Vérifier le dégivrage : en dessous de 10-12°C d''air extérieur, un cycle de dégivrage périodique est normal.
6. Si la PAC disjoncte : couper, vérifier l''absence d''humidité dans le boîtier électrique, contrôler le différentiel dédié ; ne pas forcer une remise sous tension répétée, faire intervenir un frigoriste agréé si le défaut persiste.
7. Vérifier le dimensionnement : une PAC sous-dimensionnée peine à maintenir la température par temps frais, ce n''est pas toujours une panne.', 'pompe à chaleur, PAC, chauffage, dépannage, disjoncte');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (24, 1, 2, 'procedure', 'Détecter une fuite sur le circuit hydraulique', 'Dépannage matériel', 'Méthode du test du seau et recherche de fuite.', '1. Constater une baisse anormale du niveau d''eau (plus de 2 à 3 cm/jour hors évaporation naturelle) : suspecter une fuite.
2. Faire le test du seau (bucket test) : comparer la baisse de niveau du bassin à celle d''un seau rempli posé sur une marche, filtration coupée, sur 24h.
3. Si la fuite persiste filtration coupée : elle est sur la structure du bassin (liner, coque, joints de pièces à sceller).
4. Si la fuite n''apparaît qu''en filtration : elle est sur le circuit hydraulique (canalisations, vannes, joints de pompe/filtre).
5. Inspecter visuellement le local technique et les raccords apparents à la recherche de traces d''humidité.
6. Pour une recherche plus poussée : test à la fumée, colorant traceur sur les points suspects (pièces à sceller, skimmer), ou intervention d''un spécialiste avec électro-détection.
7. Réparer localement (joint, collage, résine étanche) ou faire appel à un professionnel pour une fuite structurelle.', 'fuite, test du seau, niveau d''eau, dépannage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (25, 1, 1, 'procedure', 'Remplacer une ampoule ou un spot LED étanche', 'Dépannage matériel', 'Intervention sur un projecteur de piscine, hors tension impérative.', '1. Couper impérativement l''alimentation électrique du projecteur au disjoncteur dédié (jamais d''intervention sous tension en milieu humide).
2. Baisser le niveau d''eau sous le niveau du projecteur si celui-ci doit être sorti de sa niche.
3. Dévisser la vis de sécurité (souvent imperdable) et sortir délicatement le hublot sans tirer sur le câble.
4. Remplacer l''ampoule/le bloc LED par un modèle strictement identique (culot, puissance, tension : 12V pour la plupart des piscines privées).
5. Vérifier et remplacer le joint torique d''étanchéité du hublot avant remontage (graisse silicone légère).
6. Revisser en croix pour une pression homogène, remettre l''eau à niveau, puis remettre sous tension et tester.', 'projecteur, spot, LED, éclairage, dépannage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (26, 3, 3, 'procedure', 'Vérifier les dispositifs de sécurité obligatoires', 'Sécurité', 'Contrôle périodique des équipements normalisés (barrière, alarme, couverture, abri).', '1. Identifier le(s) dispositif(s) normalisé(s) installé(s) sur le bassin (barrière NF P90-306, alarme NF P90-307, couverture NF P90-308 ou abri NF P90-309).
2. Barrière : vérifier la hauteur (≥1,10 m), l''absence de prise d''escalade, et surtout le bon fonctionnement du portillon à fermeture et verrouillage automatiques.
3. Alarme : tester le déclenchement (immersion ou périmétrique) et vérifier l''état des piles ; s''assurer qu''elle est réarmée après chaque baignade.
4. Couverture de sécurité : vérifier la tension, l''état des sangles/ancrages, l''absence de déchirure, et sa capacité à supporter le poids d''un enfant.
5. Abri : vérifier le bon coulissement et le verrouillage effectif de la fermeture.
6. Rappeler au client qu''aucun dispositif ne remplace la surveillance active d''un adulte.
7. Consigner la vérification dans la fiche piscine (date, dispositif, état constaté).', 'sécurité, norme NF P90, barrière, alarme, couverture, abri');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (27, 3, 4, 'procedure', 'Mise en eau d''une piscine neuve', 'Mise en service', 'Premier remplissage et équilibrage d''un bassin neuf.', '1. Vérifier que le bassin est propre (aucun débris de chantier) avant le premier remplissage.
2. Remplir progressivement en surveillant la stabilité de la structure (coque/liner) en respectant les préconisations du poseur.
3. Une fois remplie, mettre en route la filtration en continu pendant 24 à 48h pour homogénéiser l''eau.
4. Réaliser une analyse complète (pH, TAC, TH, chlore, stabilisant) : l''eau de remplissage est rarement équilibrée d''origine.
5. Corriger dans l''ordre : TAC, puis pH, puis TH si besoin.
6. Mettre en route le traitement choisi (chlore, sel...) et laisser le système se stabiliser plusieurs jours avant de considérer l''eau baignable en continu.
7. Ne pas se baigner avant validation des paramètres et respect des délais de sécurité après un traitement choc.', 'mise en eau, piscine neuve, premier remplissage');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (28, 3, 3, 'procedure', 'Entretien et désinfection d''un spa ou bain à remous', 'Nettoyage', 'Entretien renforcé du fait du faible volume et de la température élevée.', '1. Couper la filtration/chauffage avant intervention.
2. Nettoyer le filtre (cartouche le plus souvent) selon la fréquence préconisée, plus rapprochée que pour une piscine.
3. Contrôler et ajuster pH, TAC et désinfectant (chlore ou brome, souvent privilégié pour les eaux chaudes) à chaque intervention.
4. Vérifier la température (30-40°C typiquement) : cette plage favorise la prolifération de légionelles si l''entretien est négligé.
5. Réaliser une vidange complète et un nettoyage des canalisations avec un produit dégraissant spécial spa tous les 3 à 4 mois.
6. Nettoyer la ligne d''eau et les buses de massage à la brosse douce.
7. Remplir, réajuster les paramètres et relancer avant remise en service.', 'spa, bain à remous, désinfection, légionellose, entretien');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (29, 1, 1, 'information', 'Valeurs idéales de l''équilibre de l''eau', 'Chimie de l''eau', 'Tableau de référence des paramètres clés à contrôler à chaque analyse.', 'pH : 7.2 à 7.4 (zone où le désinfectant est le plus efficace et l''eau confortable pour la peau/yeux).
Chlore libre : 1,0 à 3,0 mg/L (2 mg/L en usage courant, jusqu''à 3-5 mg/L en traitement choc temporaire).
Chlore combiné (chloramines) : doit rester proche de 0, idéalement inférieur à 0,4 mg/L — un taux élevé signale une eau mal désinfectée malgré un chlore libre correct.
TAC (alcalinité) : 80 à 120 mg/L (8 à 12 °f).
TH (dureté) : 100 à 300 mg/L de CaCO3 selon le revêtement (viser plutôt le bas de la fourchette pour un liner, plus haut pour un béton/carrelage).
Stabilisant (acide cyanurique) : 20 à 50 mg/L pour un traitement au chlore stabilisé ; proche de 0 pour un traitement non stabilisé (sel, oxygène actif).
Température : 26 à 28°C pour un confort de baignade classique, au-delà de 28°C la vigilance sur le traitement doit augmenter.', 'valeurs idéales, pH, chlore, TAC, TH, stabilisant, référence');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (30, 1, 1, 'information', 'Chlore libre, combiné et total : bien comprendre les chloramines', 'Chimie de l''eau', 'Le chlore combiné ne désinfecte plus et sent fort : c''est un signe de sous-chloration.', 'Le chlore libre est la fraction active du chlore, celle qui désinfecte réellement l''eau. Le chlore combiné (chloramines) résulte de la réaction du chlore avec les matières organiques apportées par les baigneurs (sueur, urée, crèmes solaires) : il ne désinfecte plus et c''est lui qui est responsable de l''odeur de "chlore" typique et des irritations des yeux — une eau qui sent fort le chlore est en réalité souvent sous-chlorée.
Le chlore total = chlore libre + chlore combiné. Un chlore combiné supérieur à 0,4-0,6 mg/L impose un traitement choc pour "casser" les chloramines et retrouver du chlore libre actif.', 'chlore, chloramines, chlore combiné, odeur chlore');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (31, 1, 1, 'information', 'Le TAC et son rôle de tampon du pH', 'Chimie de l''eau', 'Pourquoi le TAC doit toujours être réglé avant le pH.', 'Le TAC (Titre Alcalimétrique Complet) mesure la capacité de l''eau à résister aux variations de pH : c''est l''effet "tampon". Un TAC trop bas rend le pH instable (il varie fortement au moindre ajout de produit ou apport extérieur), tandis qu''un TAC trop élevé rend le pH difficile à corriger et favorise l''entartrage.
C''est pourquoi le TAC doit toujours être réglé en premier, avant le pH : régler le pH sur un TAC déséquilibré est inefficace, le pH "revient" rapidement à sa valeur d''origine.', 'TAC, alcalinité, tampon, pH stable');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (32, 1, 1, 'information', 'Le stabilisant (acide cyanurique) : rôle et risque de sur-stabilisation', 'Chimie de l''eau', 'Le stabilisant protège le chlore des UV mais ne se dégrade jamais naturellement.', 'Le stabilisant protège le chlore des UV du soleil, qui le détruisent sinon en 2 à 3h en plein été. Il est indispensable pour une piscine extérieure traitée au chlore.
Mais il présente un piège : il s''accumule dans l''eau au fil des ajouts de chlore stabilisé et ne se dégrade pas naturellement — seule une dilution (renouvellement d''eau) le fait baisser. Au-delà de 50 mg/L, on parle de sur-stabilisation : le chlore devient de moins en moins efficace à dose égale ("effet de verrouillage"), ce qui pousse à sur-doser, aggravant le problème.
Solution : renouveler une partie de l''eau du bassin, ou passer temporairement à un chlore non stabilisé.', 'stabilisant, acide cyanurique, sur-stabilisation, verrouillage chlore');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (33, 1, 2, 'information', 'L''indice de Langelier et l''équilibre calco-carbonique', 'Chimie de l''eau', 'Détermine si une eau est entartrante, corrosive, ou équilibrée.', 'L''indice de Langelier (LSI) synthétise pH, TAC, TH et température pour déterminer si une eau est entartrante, corrosive, ou équilibrée. Un résultat proche de 0 (± 0,3) signale une eau à l''équilibre : c''est l''objectif à viser.
Un indice positif indique une eau entartrante (dépôts de calcaire sur parois, canalisations, cellule d''électrolyse). Un indice négatif indique une eau corrosive/agressive (attaque des joints, du revêtement, des pièces métalliques).
Une eau durablement déséquilibrée abîme aussi bien le bassin que les équipements de filtration et de traitement — l''équilibre calco-carbonique doit donc être surveillé au même titre que la désinfection.', 'Langelier, équilibre calco-carbonique, entartrage, corrosion');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (34, 1, 1, 'information', 'Ordre de correction des paramètres de l''eau', 'Chimie de l''eau', 'La méthode professionnelle : TAC, puis pH, puis TH, puis chlore.', 'Lorsque plusieurs paramètres sont à corriger en même temps, respecter systématiquement cet ordre :
1) TAC (alcalinité) — il stabilise le pH et doit être réglé en premier.
2) pH — une fois le TAC dans la cible.
3) TH (dureté) si nécessaire.
4) Chlore et stabilisant en dernier, une fois pH/TAC stabilisés (le chlore est plus efficace et plus facile à ajuster sur une eau déjà équilibrée).
Attendre systématiquement quelques heures filtration en marche entre chaque correction avant de recontrôler.', 'ordre correction, TAC pH TH, méthode');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (35, 1, 1, 'information', 'Chlore stabilisé vs non stabilisé : lequel utiliser', 'Chimie de l''eau', 'Stabilisé pour le traitement continu, non stabilisé pour le rattrapage.', 'Le chlore stabilisé (galets, pastilles, dichlore) contient de l''acide cyanurique qui protège le chlore des UV : c''est la solution adaptée à la désinfection continue d''une piscine extérieure.
Le chlore non stabilisé (hypochlorite de calcium en poudre/granulés) agit vite et ne contient pas de stabilisant : il est réservé au traitement choc ponctuel, notamment pour rattraper une eau verte, sans faire grimper davantage le taux de stabilisant déjà présent.
Une piscine déjà sur-stabilisée doit systématiquement être traitée avec du chlore non stabilisé jusqu''à dilution du stabilisant en excès.', 'chlore stabilisé, chlore non stabilisé, dichlore, hypochlorite de calcium');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (36, 1, 2, 'information', 'Les différents systèmes de traitement de l''eau', 'Équipements', 'Chlore, brome, sel, oxygène actif, PHMB, UV, ozone : avantages et inconvénients.', 'Chlore (galets/liquide) : référence historique, efficace et économique, nécessite une gestion régulière du stabilisant.
Brome : mieux toléré par les peaux sensibles, plus stable en eau chaude (adapté aux spas), mais plus coûteux.
Sel/électrolyse : production de chlore in situ par une cellule, confort de baignade apprécié, nécessite un contrôle régulier du taux de sel (généralement 3 à 5 g/L) et un détartrage périodique de la cellule.
Oxygène actif : sans odeur, doux pour la peau, adapté aux petits bassins/spas familiaux, mais moins rémanent et plus cher à l''usage.
PHMB (polymère) : sans chlore, incompatible avec un passage ultérieur au chlore sans vidange complète.
UV et ozone : traitements complémentaires (pas des désinfectants rémanents à eux seuls) qui réduisent la consommation de désinfectant chimique.', 'chlore, brome, sel, électrolyse, oxygène actif, PHMB, UV, ozone');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (37, 1, 1, 'information', 'Reconnaître les différents types d''algues', 'Algues & pathologies de l''eau', 'Vertes, moutarde, noires, roses : identification rapide.', 'Algues vertes : les plus courantes, eau uniformément verte et/ou parois glissantes, liées à un manque de désinfectant ou un déséquilibre du pH.
Algues moutarde (jaunes) : aspect poudreux jaunâtre, se redéposent vite après brossage, résistantes au chlore classique, nécessitent un produit spécifique.
Algues noires : taches noires incrustées très résistantes, se logent dans les joints et micro-fissures, demandent un brossage mécanique pour casser leur membrane avant traitement.
Algues roses : en réalité des bactéries (et non de vraies algues), colonisent surtout les surfaces plastiques (liner, joints, paniers de skimmer), traitement bactéricide spécifique nécessaire en complément du chlore.', 'algues vertes, moutarde, noires, roses, identification');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (38, 1, 1, 'information', 'Comparatif des systèmes de filtration', 'Équipements', 'Sable, cartouche, diatomées, verre : finesse et entretien.', 'Sable : le plus répandu et économique, finesse de filtration 30-40 microns, entretien par backwash bihebdomadaire/bimensuel, sable à remplacer tous les 5-7 ans.
Cartouche : finesse 15-20 microns, pas de backwash (économie d''eau), nettoyage manuel 1 à 2 fois par semaine en pleine saison, cartouche à remplacer tous les 2-3 ans.
Diatomées : finesse 1-3 microns, eau la plus limpide, entretien plus technique (rechargement périodique en terre de diatomées), recommandé pour un professionnel.
Verre recyclé : alternative au sable, filtration fine, meilleure résistance à l''entartrage, backwash mensuel, durée de vie proche de 8 ans.', 'filtration, sable, cartouche, diatomées, verre, comparatif');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (39, 1, 2, 'information', 'Comprendre une pompe de filtration', 'Équipements', 'Débit, HMT et dimensionnement.', 'Une pompe de filtration se caractérise par son débit (m³/h) et sa hauteur manométrique totale (HMT, la capacité à "pousser" l''eau en compensant les pertes de charge du circuit).
Le dimensionnement doit permettre de filtrer l''intégralité du volume du bassin dans le temps de filtration quotidien visé, tout en tenant compte des pertes de charge du filtre, des canalisations et des accessoires.
Une pompe surdimensionnée use prématurément le filtre et consomme inutilement ; une pompe sous-dimensionnée ne brasse pas assez l''eau et laisse le traitement moins efficace. Les pompes à vitesse variable permettent d''adapter le débit aux besoins réels avec un gain énergétique important.', 'pompe, débit, HMT, dimensionnement, vitesse variable');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (40, 1, 1, 'information', 'Comprendre une pompe à chaleur piscine', 'Équipements', 'COP, dimensionnement et plage de fonctionnement.', 'Une pompe à chaleur (PAC) capte les calories de l''air extérieur pour chauffer l''eau du bassin. Sa performance se mesure par le COP (Coefficient de Performance) : un COP de 4 signifie 4 kW de chaleur restitués pour 1 kW électrique consommé.
Le COP varie fortement avec la température extérieure : il chute quand l''air se refroidit, ce qui explique une chauffe moins efficace en intersaison. La Fédération des Professionnels de la Piscine impose deux mesures de référence pour comparer les modèles (air 15°C/eau 26°C, et air 28°C/eau 28°C).
Dimensionnement indicatif : environ 1 kW de puissance pour 10 m³ d''eau, à affiner selon le volume exact, l''exposition, la couverture du bassin et la vitesse de montée en température souhaitée.', 'pompe à chaleur, PAC, COP, chauffage piscine, dimensionnement');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (41, 1, 1, 'information', 'Durée de filtration recommandée selon la température de l''eau', 'Calculs & formules', 'La règle professionnelle : température divisée par 2.', 'Règle professionnelle simple : durée de filtration (en heures) = température de l''eau (°C) ÷ 2. Exemple : 24°C → 12h de filtration/jour, 28°C → 14h, 30°C → 15h.
En dessous de 12°C, les micro-organismes ne prolifèrent quasiment plus : la filtration peut être fortement réduite. Au-dessus de 28°C, la filtration doit tourner en continu (24h/24) pour éviter qu''une eau chaude ne verdisse en 24 à 48h.
Cette règle reste indicative : l''adapter à la fréquentation du bassin (plus de baigneurs = plus de filtration) et à l''environnement (végétation, exposition au vent).', 'durée filtration, température, règle température divisée par 2');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (42, 1, 2, 'information', 'Calculer le volume d''un bassin selon sa forme', 'Calculs & formules', 'Formules par forme + conversion en litres.', 'Rectangulaire : Longueur × Largeur × Profondeur moyenne.
Ronde : Rayon × Rayon × 3,14 × Profondeur moyenne.
Ovale : Longueur × Largeur × Profondeur moyenne × 0,89.
Forme libre : décomposer le bassin en formes géométriques simples et additionner les volumes obtenus, ou utiliser l''estimation rapide Longueur max × Largeur max × Profondeur moyenne × 0,85.
Toujours privilégier la profondeur moyenne (et non la profondeur maximale) pour un résultat fiable. Conversion : 1 m³ = 1 000 litres.', 'volume piscine, calcul, formule, m3, litres');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (43, 1, 1, 'information', 'Calculer le dosage d''un produit selon le volume du bassin', 'Calculs & formules', 'Méthode en 4 étapes pour doser correctement.', 'La quasi-totalité des produits de traitement (pH+/pH-, chlore choc, rehausseur/réducteur de TAC, anti-algues) sont dosés en fonction du volume d''eau du bassin, indiqué sur l''emballage en g ou mL par m³.
Méthode : 1) connaître le volume exact du bassin (voir fiche calcul de volume) ; 2) mesurer l''écart entre la valeur actuelle et la valeur cible du paramètre ; 3) appliquer la dose indiquée par le fabricant pour cet écart et ce volume ; 4) fractionner les doses importantes en plusieurs apports espacés de quelques heures plutôt qu''un apport unique, pour limiter les à-coups et mieux contrôler le résultat.', 'dosage, calcul produit, volume, traitement');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (44, 3, 3, 'information', 'Réglementation sécurité des piscines privées', 'Réglementation & sécurité', 'Loi du 3 janvier 2003 et normes NF P90-306/307/308/309.', 'Depuis la loi n°2003-9 du 3 janvier 2003, toute piscine enterrée ou semi-enterrée non close à usage individuel ou collectif doit être équipée d''au moins un dispositif de sécurité normalisé, en vue de prévenir les noyades d''enfants de moins de 5 ans.
Quatre normes définissent ces dispositifs : NF P90-306 (barrières de protection, hauteur minimale 1,10 m, portillon à fermeture et verrouillage automatiques), NF P90-307 (alarmes, détection périmétrique ou d''immersion), NF P90-308 (couvertures de sécurité) et NF P90-309 (abris de piscine).
Le non-respect de cette obligation expose le propriétaire à une amende pouvant atteindre 45 000 €. Ces dispositifs réduisent le risque mais ne remplacent jamais la surveillance active d''un adulte.', 'sécurité piscine, loi 2003, NF P90-306, NF P90-307, NF P90-308, NF P90-309');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (45, 3, 3, 'information', 'Norme électrique des piscines (NF C15-100)', 'Réglementation & sécurité', 'Volumes de protection et règles pour le local technique.', 'La norme NF C15-100 (section 702) encadre les installations électriques à proximité d''un bassin. Elle définit des volumes de protection autour de la piscine (0, 1 et 2) : plus on est proche de l''eau, plus les restrictions sur le matériel électrique autorisé sont sévères.
Le tableau électrique dédié à la piscine doit être séparé de celui de l''habitation et comporter un interrupteur différentiel 30 mA. Pour s''affranchir des contraintes des volumes de protection, le local technique (et donc la pompe en 230V) doit idéalement être installé à plus de 3,50 m du bord du bassin ; la ventilation et l''étanchéité du local sont essentielles.', 'NF C15-100, électricité piscine, volumes de protection, local technique');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (46, 3, 4, 'information', 'Stockage et manipulation des produits chimiques', 'Réglementation & sécurité', 'Ne jamais mélanger chlore et acide : consignes de sécurité essentielles.', 'Ne jamais stocker le chlore et l''acide côte à côte, ni mélanger différents types de chlore entre eux : le contact accidentel entre chlore et acide peut générer un dégagement de gaz toxique voire une réaction violente.
Conserver chaque produit dans son emballage d''origine, étiqueté, dans un local frais, sec, aéré et à l''abri du soleil direct. Prévoir un espace entre les différents contenants et une bonne ventilation pour éviter toute accumulation de vapeurs.
Stocker hors de portée des enfants et des animaux. Porter des gants et des lunettes de protection lors de toute manipulation de produits concentrés, et toujours verser le produit dans l''eau (jamais l''inverse) lors d''une dilution.', 'sécurité chimique, stockage produits, chlore acide, EPI');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (47, 3, 3, 'information', 'Risque de légionellose dans les spas et bains à remous', 'Réglementation & sécurité', 'La plage de température des spas est aussi celle de prolifération de la bactérie.', 'La légionellose est une infection pulmonaire grave provoquée par l''inhalation d''aérosols contenant la bactérie Legionella pneumophila. Les spas et bains à remous sont particulièrement à risque : leur température de fonctionnement (30 à 40°C) se situe précisément dans la zone de multiplication optimale de la bactérie (25-45°C, avec un pic entre 32 et 42°C où la population double toutes les 3-4h), combinée à un faible volume d''eau et une forte agitation générant des aérosols.
La prévention passe par un contrôle rigoureux et permanent du désinfectant, une vidange et un nettoyage complet des canalisations réguliers (tous les 3-4 mois), et la lutte contre l''entartrage/la corrosion qui favorisent la formation de biofilm, terrain propice à la bactérie.', 'légionellose, spa, bain à remous, sécurité sanitaire');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (48, 1, 1, 'information', 'Les différents revêtements de piscine et leur entretien', 'Équipements', 'Liner, PVC armé, coque, béton/carrelage, enduit : spécificités d''entretien.', 'Liner (PVC souple) : économique, confortable, mais sensible aux perforations et à la décoloration ; nettoyage à la brosse douce, jamais de brosse métallique ou de produit abrasif.
PVC armé : plus résistant et étanche que le liner classique, soudé, adapté aux formes complexes, entretien similaire au liner.
Coque polyester : très lisse (peu d''accroche pour les algues), durable, mais réparation délicate en cas de fissure (résine spécifique).
Béton/carrelage : très résistant et personnalisable, mais surface plus poreuse et rugueuse propice à l''accroche des algues (notamment noires dans les joints) ; supporte le brossage avec une brosse plus agressive.
Enduit : intermédiaire, à réimperméabiliser périodiquement, sensible à l''équilibre de l''eau (indice de Langelier à surveiller de près).', 'liner, PVC armé, coque, béton, carrelage, enduit, revêtement');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (49, 1, 2, 'information', 'Calendrier annuel d''entretien d''une piscine', 'Calendrier & organisation', 'Checklist saisonnière pour organiser sa tournée sur l''année.', 'Printemps (remise en route) : retrait de la bâche, remontage du matériel, nettoyage complet, backwash, remise à niveau des paramètres, choc si besoin.
Été (haute saison) : contrôle des paramètres 1 à 2 fois par semaine, nettoyage skimmers/ligne d''eau hebdomadaire, filtration selon la règle température/2, vigilance accrue lors des orages et fortes chaleurs.
Automne : réduction progressive de la filtration à mesure que la température baisse, nettoyage renforcé (feuilles), dernière analyse complète avant hivernage.
Hiver (hivernage) : mise en hivernage passif ou actif selon la région et le type de bassin, surveillance ponctuelle du niveau d''eau et de l''état de la couverture pendant la période fermée.', 'calendrier, saisons, planning entretien, checklist annuelle');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (50, 1, 1, 'information', 'Glossaire des termes techniques du métier', 'Glossaire', 'Vocabulaire de base à connaître.', 'Backwash (contre-lavage) : inversion du sens de circulation de l''eau dans un filtre à sable/diatomées pour évacuer les impuretés retenues.
Skimmer : écumoire intégrée à la paroi du bassin qui aspire l''eau de surface.
Bonde de fond : prise d''aspiration au point le plus bas du bassin, soumise à un dispositif anti-vortex/anti-entraînement.
Vanne multivoie : vanne du filtre à sable permettant de sélectionner le mode (filtration, lavage, rinçage, vidange, recirculation, hivernage).
Refoulement : buse qui renvoie l''eau filtrée dans le bassin.
Ligne d''eau : bande à la surface du bassin où se déposent calcaire, graisses et pollens.
HMT : Hauteur Manométrique Totale, capacité d''une pompe à vaincre les pertes de charge du circuit.', 'glossaire, vocabulaire, lexique, termes techniques');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (51, 3, 3, 'information', 'Premiers secours et prévention de la noyade', 'Réglementation & sécurité', 'La noyade reste la 1ère cause de mort accidentelle chez les moins de 5 ans avec piscine.', 'La noyade reste la première cause de mort accidentelle chez les enfants de moins de 5 ans en France disposant d''une piscine privée.
Rappels essentiels à transmettre systématiquement aux clients : surveillance active et continue d''un adulte dès qu''un enfant est à proximité de l''eau, même équipée d''un dispositif de sécurité normalisé (aucun dispositif n''est infaillible ni ne dispense de surveillance) ; ne jamais laisser un enfant seul même quelques instants ; réarmer systématiquement alarme/couverture après chaque utilisation.
En cas de noyade : sortir la victime de l''eau, alerter les secours (15 ou 112), débuter une réanimation cardio-pulmonaire (RCP) si la victime ne respire pas — la formation aux gestes qui sauvent (PSC1) est vivement recommandée pour tout professionnel intervenant sur des piscines.', 'noyade, premiers secours, RCP, prévention, sécurité enfants');
INSERT INTO procedures (id, owner_id, created_by, type, title, category, summary, content, tags) VALUES (52, 1, 1, 'information', 'Fiches produits : rôle et précautions des principaux produits de traitement', 'Chimie de l''eau', 'Chlore choc, galets, pH+/pH-, floculant, séquestrant.', 'Chlore choc (dichlore/hypochlorite) : désinfection rapide et rattrapage, à diluer avant usage pour la poudre, jamais en contact direct avec la peau.
Galets de chlore lent (trichlore stabilisé) : diffusion progressive sur 7-10 jours en skimmer ou diffuseur flottant, jamais dans le panier du skimmer si filtration coupée (concentration dangereuse localisée).
pH+/pH- : produits acido-basiques concentrés, toujours verser dans l''eau et non l''inverse, stocker séparément l''un de l''autre.
Anti-algues : à utiliser en traitement préventif régulier ou curatif ciblé selon le type d''algue, vérifier la compatibilité avec le désinfectant utilisé.
Floculant : agent clarifiant à action physique (agglomération des particules), sans effet désinfectant, à utiliser en complément du chlore et non à sa place.
Séquestrant/anti-calcaire : limite la précipitation du calcaire et des métaux responsables de taches et d''eau trouble/colorée, à renouveler régulièrement.', 'produits, chlore choc, galets, pH, floculant, séquestrant, précautions');

-- Fin du seed démo