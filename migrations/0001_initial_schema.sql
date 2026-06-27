-- ============================================================
-- Piscine Max - Schéma initial
-- ============================================================

-- Utilisateurs (Franck = admin/pisciniste, Romain = exécutant)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker', -- 'admin' (Franck) ou 'worker' (Romain)
  color TEXT DEFAULT '#2563eb',         -- couleur d'affichage sur l'agenda
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clients (appartiennent au pisciniste)
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Piscines (un client peut en avoir plusieurs)
CREATE TABLE IF NOT EXISTS pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  label TEXT NOT NULL,                  -- nom/surnom de la piscine
  -- Adresse + géolocalisation
  address TEXT,
  lat REAL,
  lng REAL,
  -- Caractéristiques techniques
  pool_type TEXT,                       -- enterrée, hors-sol, coque, béton...
  volume_m3 REAL,
  shape TEXT,                           -- rectangulaire, ovale, libre...
  treatment_type TEXT,                  -- chlore, sel/électrolyse, brome, oxygène actif...
  filtration_type TEXT,                 -- sable, cartouche, diatomées...
  -- Accès & logistique
  access_code TEXT,                     -- digicode / code portail
  access_notes TEXT,                    -- chien, portail, où sont les produits...
  -- Routine d'entretien (checklist au format JSON: ["étape 1","étape 2"...])
  routine TEXT,
  -- Photos (JSON: liste d'URLs/data)
  photos TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Entretiens (agenda) : récurrents ou ponctuels
CREATE TABLE IF NOT EXISTS maintenances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pool_id INTEGER NOT NULL,
  assigned_to INTEGER,                  -- user.id à qui c'est attribué (NULL = non assigné)
  kind TEXT NOT NULL DEFAULT 'recurring', -- 'recurring' ou 'oneshot'
  -- Récurrence (si recurring)
  weekday INTEGER,                      -- 0=dimanche ... 1=lundi ... 6=samedi (ISO: on utilise 1=lundi..7=dimanche)
  interval_weeks INTEGER DEFAULT 1,     -- toutes les X semaines
  start_date TEXT,                      -- date de début (YYYY-MM-DD)
  end_date TEXT,                        -- date de fin optionnelle
  -- Ponctuel (si oneshot)
  oneshot_date TEXT,                    -- date précise (YYYY-MM-DD)
  -- Commun
  time TEXT,                            -- heure prévue HH:MM (optionnel)
  duration_min INTEGER DEFAULT 30,
  active INTEGER DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Historique des passages effectués
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maintenance_id INTEGER NOT NULL,
  done_by INTEGER,
  done_date TEXT NOT NULL,              -- YYYY-MM-DD
  status TEXT DEFAULT 'done',           -- 'done', 'skipped'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maintenance_id) REFERENCES maintenances(id) ON DELETE CASCADE,
  FOREIGN KEY (done_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pools_client ON pools(client_id);
CREATE INDEX IF NOT EXISTS idx_maint_pool ON maintenances(pool_id);
CREATE INDEX IF NOT EXISTS idx_maint_assigned ON maintenances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maint_weekday ON maintenances(weekday);
CREATE INDEX IF NOT EXISTS idx_logs_maint ON maintenance_logs(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON maintenance_logs(done_date);
