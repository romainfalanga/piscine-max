-- ============================================================
-- 0005 : Fusion des rôles pro/worker en "member" + cycles saisonniers par piscine
-- ============================================================

-- 1) FUSION DES RÔLES ----------------------------------------
-- Il n'existe plus de différence entre "pisciniste" et "intervenant" :
-- tout compte humain est un "member" qui peut avoir ses propres clients/piscines
-- ET être intervenant chez d'autres (relation pro_workers). Le rôle "client" est conservé.
UPDATE users SET role = 'member' WHERE role IN ('pro', 'worker');

-- 2) CYCLES SAISONNIERS PAR PISCINE --------------------------
-- Chaque piscine peut définir plusieurs "saisons" (périodes de l'année, par dates
-- jour+mois répétables chaque année) avec chacune sa propre fréquence de passage.
-- Ex. Haute saison 06-01 -> 09-30 tous les 3 jours ; Hivernage 11-01 -> 03-31 tous les 30 jours.
CREATE TABLE IF NOT EXISTS pool_seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pool_id INTEGER NOT NULL,
  label TEXT,                          -- nom libre de la saison (ex. "Haute saison")
  start_md TEXT NOT NULL,              -- début (MM-DD), répété chaque année
  end_md TEXT NOT NULL,                -- fin (MM-DD), répété chaque année (peut "boucler" l'année : ex 11-01 -> 03-31)
  interval_days INTEGER NOT NULL DEFAULT 7,  -- fréquence : tous les X jours
  weekday INTEGER,                     -- jour préféré 1=lundi..7=dimanche (NULL = pas de contrainte de jour)
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pool_seasons_pool ON pool_seasons(pool_id);
