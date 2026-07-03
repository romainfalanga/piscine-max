-- ============================================================
-- 0007 : Procédures métier (bibliothèque de fiches pratiques)
-- ============================================================
-- Objectif : centraliser les "modes opératoires" du métier de pisciniste
-- (ex. changer un préfiltre, hiverner une piscine, choc chlore...) afin que
-- le pisciniste et ses intervenants puissent les consulter, les rechercher
-- et en créer de nouvelles. Périmètre identique à clients/pools (owner_id) :
-- visible par le pro propriétaire + les intervenants qui bossent pour lui.
CREATE TABLE IF NOT EXISTS procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,           -- périmètre (comme clients/pools)
  created_by INTEGER,                  -- qui a rédigé la fiche
  title TEXT NOT NULL,
  category TEXT,                       -- ex: Filtration, Traitement de l'eau, Hivernage, Dépannage...
  summary TEXT,                        -- résumé court affiché dans la liste
  content TEXT,                        -- étapes détaillées de la procédure
  tags TEXT,                           -- mots-clés séparés par virgules, pour la recherche
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_procedures_owner ON procedures(owner_id);
CREATE INDEX IF NOT EXISTS idx_procedures_category ON procedures(category);
