-- ============================================================
-- Migration 0004 : Diagnostic eau enrichi + seuils complets
-- ============================================================
-- Objectif : alimenter le moteur de diagnostic / dosage et les alertes.
--   - seuils idéaux pour TOUS les paramètres (pas seulement pH/chlore)
--   - profondeur moyenne (utile pour vérifier/estimer le volume)
--   - fréquence d'entretien attendue (pour détecter les retards de passage)
-- ============================================================

-- Seuils idéaux supplémentaires sur les piscines
ALTER TABLE pools ADD COLUMN ideal_salt_min REAL DEFAULT 3.0;          -- sel (g/L) — électrolyseur
ALTER TABLE pools ADD COLUMN ideal_salt_max REAL DEFAULT 5.0;
ALTER TABLE pools ADD COLUMN ideal_tac_min REAL DEFAULT 80;            -- TAC / alcalinité (mg/L)
ALTER TABLE pools ADD COLUMN ideal_tac_max REAL DEFAULT 120;
ALTER TABLE pools ADD COLUMN ideal_stabilizer_min REAL DEFAULT 30;     -- stabilisant / acide cyanurique (mg/L)
ALTER TABLE pools ADD COLUMN ideal_stabilizer_max REAL DEFAULT 50;

-- Profondeur moyenne (m) — facultatif, aide à recalculer le volume si besoin
ALTER TABLE pools ADD COLUMN depth_avg_m REAL;

-- Fréquence d'entretien attendue (en jours) pour détecter un retard.
-- 0 / NULL = pas de suivi de retard pour cette piscine.
ALTER TABLE pools ADD COLUMN expected_interval_days INTEGER DEFAULT 7;
