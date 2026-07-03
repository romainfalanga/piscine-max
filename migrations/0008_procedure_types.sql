-- ============================================================
-- 0008 : Distinction Procédure / Information dans la bibliothèque "Pisciniste"
-- ============================================================
-- La bibliothèque ne contient plus seulement des modes opératoires
-- (procédures pas à pas) mais aussi des fiches de connaissances de référence
-- (normes, valeurs idéales, formules...). Le champ `type` distingue les deux.
ALTER TABLE procedures ADD COLUMN type TEXT NOT NULL DEFAULT 'procedure';

CREATE INDEX IF NOT EXISTS idx_procedures_type ON procedures(type);
