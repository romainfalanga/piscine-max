-- ============================================================
-- 0010 : Code du pisciniste (jeu de questions façon "code de la route")
-- ============================================================
-- Banque de questions à choix multiples (4 réponses), commune à toute la
-- plateforme (contenu pédagogique du métier, pas de périmètre multi-tenant).
-- L'historique des tentatives, lui, est propre à chaque utilisateur.
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct TEXT NOT NULL,             -- 'a' | 'b' | 'c' | 'd'
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
