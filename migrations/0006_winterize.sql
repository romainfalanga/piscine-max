-- ============================================================
-- 0006 : Hivernage des piscines
-- ============================================================
-- Une piscine "hivernée" (winterized=1) est mise en sommeil :
--   - elle n'émet plus d'alerte de retard de passage
--   - elle est signalée comme telle dans l'agenda / sur sa fiche
-- C'est complémentaire des saisons : l'hivernage est un état ponctuel décidé
-- par le pisciniste (ex. fermeture exceptionnelle), indépendant du calendrier saisonnier.

ALTER TABLE pools ADD COLUMN winterized INTEGER DEFAULT 0;
ALTER TABLE pools ADD COLUMN winterized_at DATETIME;
