-- ============================================================
-- Migration 0003 : Plateforme multi-pisciniste (multi-tenant)
-- ============================================================
-- Évolution du modèle : un seul couple "admin/worker" en dur
--   →  plateforme où chaque PISCINISTE (pro) gère ses propres données,
--      peut déléguer à des INTERVENANTS (workers) et donner un accès
--      lecture à ses CLIENTS finaux.
--
-- Rôles (colonne users.role) :
--   'pro'    : pisciniste (peut tout gérer pour ses propres clients/piscines)
--   'worker' : intervenant (exécute des entretiens délégués)
--   'client' : client final (accès lecture à l'historique de SES piscines)
--
-- Note : un même utilisateur peut être à la fois 'pro' et intervenant
--        d'un autre pro (relation gérée par la table pro_workers, pas par le rôle).
-- ============================================================

-- ----- USERS : champs supplémentaires -----
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN company TEXT;          -- nom de la société du pisciniste
ALTER TABLE users ADD COLUMN created_by INTEGER;    -- qui a créé ce compte (pro ayant créé un worker/client)

-- ----- Relation pisciniste <-> intervenant (N-N) -----
-- Un pro peut avoir plusieurs intervenants ; un intervenant peut bosser pour plusieurs pros.
CREATE TABLE IF NOT EXISTS pro_workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pro_id INTEGER NOT NULL,        -- le pisciniste
  worker_id INTEGER NOT NULL,     -- l'intervenant
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pro_id, worker_id),
  FOREIGN KEY (pro_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----- CLIENTS : appartenance à un pro + lien vers le compte client -----
ALTER TABLE clients ADD COLUMN owner_id INTEGER;        -- le pisciniste propriétaire de ce client
ALTER TABLE clients ADD COLUMN client_user_id INTEGER;  -- compte 'client' associé (accès lecture), NULL si pas d'accès

-- ----- POOLS : routine recommandée au client (ce que le client fait lui-même) -----
ALTER TABLE pools ADD COLUMN routine_client TEXT;       -- conseils du pro au client (texte libre)
ALTER TABLE pools ADD COLUMN owner_id INTEGER;          -- dénormalisé pour faciliter le filtrage (= client.owner_id)

-- ----- Index -----
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(client_user_id);
CREATE INDEX IF NOT EXISTS idx_pools_owner ON pools(owner_id);
CREATE INDEX IF NOT EXISTS idx_proworkers_pro ON pro_workers(pro_id);
CREATE INDEX IF NOT EXISTS idx_proworkers_worker ON pro_workers(worker_id);

-- ----- Migration des données existantes -----
-- Le compte 'admin' historique (Franck) devient un pisciniste 'pro'.
UPDATE users SET role = 'pro', company = 'Piscine Max' WHERE role = 'admin';

-- Tous les clients/piscines existants sont rattachés au premier pro (Franck, id le plus bas).
UPDATE clients SET owner_id = (SELECT id FROM users WHERE role = 'pro' ORDER BY id LIMIT 1) WHERE owner_id IS NULL;
UPDATE pools SET owner_id = (SELECT owner_id FROM clients WHERE clients.id = pools.client_id) WHERE owner_id IS NULL;

-- Les workers existants sont rattachés au premier pro.
INSERT OR IGNORE INTO pro_workers (pro_id, worker_id)
  SELECT (SELECT id FROM users WHERE role = 'pro' ORDER BY id LIMIT 1), id
  FROM users WHERE role = 'worker';

-- ----- PHOTOS : métadonnées (le binaire est stocké dans R2) -----
-- Une photo peut être liée à un passage (log) et/ou à une piscine.
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL,           -- clé de l'objet dans le bucket R2
  pool_id INTEGER,                -- piscine concernée
  log_id INTEGER,                 -- passage concerné (optionnel)
  uploaded_by INTEGER,            -- utilisateur ayant uploadé
  caption TEXT,                   -- légende optionnelle
  content_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_pool ON photos(pool_id);
CREATE INDEX IF NOT EXISTS idx_photos_log ON photos(log_id);
