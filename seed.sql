-- ============================================================
-- Données initiales : comptes Franck (admin) + Romain (worker)
-- Mot de passe par défaut pour les deux : "piscine"
-- ============================================================

INSERT OR IGNORE INTO users (id, email, password_hash, name, role, color) VALUES
  (1, 'franck@piscine-max.fr', 'pbkdf2$100000$63a23c515ba09149c3b8d3cd79ffa408$d60134698297c155042daacfb8ce54c8f643440ce91b39dda8ed4b10dbe0b8b1', 'Franck', 'admin', '#0891b2'),
  (2, 'romain@piscine-max.fr', 'pbkdf2$100000$5caea9bf0eab93fa5646d511e74e5c88$e04fc3571a707f7689ff5091725e0e61b69d96037713cc01e87b8babdee2222b', 'Romain', 'worker', '#16a34a');

-- Clients de démonstration
INSERT OR IGNORE INTO clients (id, name, phone, email, notes) VALUES
  (1, 'Famille Dubois', '06 12 34 56 78', 'dubois@example.com', 'Très sympas, café offert le matin.'),
  (2, 'M. Martin', '06 98 76 54 32', 'martin@example.com', 'Préfère les passages en fin de matinée.'),
  (3, 'Résidence Les Oliviers', '04 90 11 22 33', 'syndic@oliviers.fr', 'Piscine collective, accès par le portail principal.');

-- Piscines de démonstration (coordonnées autour d'Aix-en-Provence)
INSERT OR IGNORE INTO pools (id, client_id, label, address, lat, lng, pool_type, volume_m3, shape, treatment_type, filtration_type, access_code, access_notes, routine, photos, notes) VALUES
  (1, 1, 'Piscine principale', '10 Cours Mirabeau, 13100 Aix-en-Provence', 43.5283, 5.4497, 'enterrée', 48, 'rectangulaire', 'sel/électrolyse', 'sable', '1985A', 'Chien gentil dans le jardin. Produits dans le local technique à droite.', '["Vérifier le niveau d''eau","Nettoyer les skimmers et le préfiltre","Passer le robot / épuisette","Brosser les parois","Tester pH et chlore","Ajuster les produits si besoin","Nettoyer la ligne d''eau"]', '[]', 'Robot Dolphin disponible sur place.'),
  (2, 2, 'Bassin jardin', '25 Avenue Victor Hugo, 13100 Aix-en-Provence', 43.5246, 5.4444, 'coque', 32, 'libre', 'chlore', 'cartouche', NULL, 'Portail non verrouillé en journée. Local technique au fond à gauche.', '["Vérifier le niveau d''eau","Nettoyer skimmers","Épuisette surface","Tester pH et chlore","Ajuster traitement"]', '[]', NULL),
  (3, 3, 'Piscine collective', '5 Chemin des Oliviers, 13090 Aix-en-Provence', 43.5400, 5.4200, 'béton', 120, 'rectangulaire', 'chlore', 'diatomées', '4521B', 'Code portail commun. Local technique en sous-sol, clé sous le pot de fleurs.', '["Contrôle complet skimmers","Backwash filtre diatomées","Analyse eau complète","Ajustement chlore/pH","Nettoyage ligne d''eau et margelles","Vérifier la pompe"]', '[]', 'Bassin de grande taille, prévoir plus de temps.');

-- Entretiens récurrents (weekday: 1=lundi ... 7=dimanche)
INSERT OR IGNORE INTO maintenances (id, pool_id, assigned_to, kind, weekday, interval_weeks, start_date, time, duration_min, notes) VALUES
  (1, 1, 2, 'recurring', 2, 1, '2026-06-01', '09:00', 45, 'Entretien hebdo délégué à Romain.'),
  (2, 2, 1, 'recurring', 4, 1, '2026-06-01', '11:00', 30, NULL),
  (3, 3, 1, 'recurring', 1, 2, '2026-06-01', '08:00', 90, 'Une semaine sur deux.');
