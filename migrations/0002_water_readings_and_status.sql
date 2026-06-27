-- ============================================================
-- Migration 0002 : relevés d'eau, statut des passages, produits
-- ============================================================

-- Enrichir maintenance_logs avec les relevés d'eau et les produits
ALTER TABLE maintenance_logs ADD COLUMN ph REAL;                 -- pH mesuré
ALTER TABLE maintenance_logs ADD COLUMN chlorine REAL;           -- chlore libre (mg/L)
ALTER TABLE maintenance_logs ADD COLUMN salt REAL;               -- taux de sel (g/L)
ALTER TABLE maintenance_logs ADD COLUMN water_temp REAL;         -- température de l'eau (°C)
ALTER TABLE maintenance_logs ADD COLUMN stabilizer REAL;         -- stabilisant / acide cyanurique
ALTER TABLE maintenance_logs ADD COLUMN tac REAL;                -- TAC (alcalinité)
ALTER TABLE maintenance_logs ADD COLUMN products_added TEXT;     -- produits ajoutés (texte libre)
ALTER TABLE maintenance_logs ADD COLUMN duration_min INTEGER;    -- durée réelle du passage

-- Index pour récupérer rapidement l'historique d'une piscine via la jointure
CREATE INDEX IF NOT EXISTS idx_logs_done_by ON maintenance_logs(done_by);

-- Champs supplémentaires sur les piscines pour les seuils idéaux (aide à la décision)
ALTER TABLE pools ADD COLUMN ideal_ph_min REAL DEFAULT 7.0;
ALTER TABLE pools ADD COLUMN ideal_ph_max REAL DEFAULT 7.4;
ALTER TABLE pools ADD COLUMN ideal_chlorine_min REAL DEFAULT 1.0;
ALTER TABLE pools ADD COLUMN ideal_chlorine_max REAL DEFAULT 2.0;
ALTER TABLE pools ADD COLUMN priority INTEGER DEFAULT 0;         -- 0=normal, 1=prioritaire
