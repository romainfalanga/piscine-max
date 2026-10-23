-- Personal work checklists. These never publish a maintenance report automatically.
CREATE TABLE guide_progress (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 guide_id TEXT NOT NULL,
 pool_id TEXT NOT NULL DEFAULT '',
 variant TEXT NOT NULL DEFAULT '',
 checks TEXT NOT NULL DEFAULT '{}',
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(user_id, guide_id, pool_id)
);
