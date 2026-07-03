-- ============================================================
-- 0009 : Fiches "importantes" dans la bibliothèque Pisciniste
-- ============================================================
-- Remplace la vue "Toutes" (mélange indifférencié procédures+informations)
-- par une vue "Important" : un sous-ensemble curaté des fiches essentielles
-- (bases de l'entretien courant + repérage des problèmes émergents +
-- fondamentaux du métier), pour un accès rapide à l'essentiel sur le terrain.
ALTER TABLE procedures ADD COLUMN important INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_procedures_important ON procedures(important);
