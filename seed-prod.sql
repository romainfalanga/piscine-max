-- ============================================================
-- Seed PRODUCTION : uniquement les comptes utilisateurs
-- Mot de passe par défaut : "piscine" (à changer ensuite)
-- ============================================================

INSERT OR IGNORE INTO users (id, email, password_hash, name, role, color) VALUES
  (1, 'franck@piscine-max.fr', 'pbkdf2$100000$63a23c515ba09149c3b8d3cd79ffa408$d60134698297c155042daacfb8ce54c8f643440ce91b39dda8ed4b10dbe0b8b1', 'Franck', 'admin', '#0891b2'),
  (2, 'romain@piscine-max.fr', 'pbkdf2$100000$5caea9bf0eab93fa5646d511e74e5c88$e04fc3571a707f7689ff5091725e0e61b69d96037713cc01e87b8babdee2222b', 'Romain', 'worker', '#16a34a');
