PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, is_pro INTEGER NOT NULL DEFAULT 0 CHECK(is_pro IN(0,1)),
 company TEXT NOT NULL DEFAULT '', city_code TEXT, city TEXT, latitude REAL, longitude REAL,
 radius_km INTEGER NOT NULL DEFAULT 30 CHECK(radius_km BETWEEN 5 AND 150), specialties TEXT NOT NULL DEFAULT '[]',
 disabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, reset_at INTEGER NOT NULL);
CREATE INDEX rate_expiry ON rate_limits(reset_at);
CREATE TABLE pools (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'private', city_code TEXT, city TEXT, latitude REAL, longitude REAL,
 address TEXT NOT NULL DEFAULT '', access_notes TEXT NOT NULL DEFAULT '', volume REAL CHECK(volume IS NULL OR volume>0),
 treatment TEXT NOT NULL DEFAULT 'unknown', filtration TEXT NOT NULL DEFAULT '', equipment TEXT NOT NULL DEFAULT '',
 routine TEXT NOT NULL DEFAULT '', client_advice TEXT NOT NULL DEFAULT '', thresholds TEXT NOT NULL DEFAULT '{}', winterized INTEGER NOT NULL DEFAULT 0,
 archived_at TEXT, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE pool_members (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN('owner','principal','temporary')), manager INTEGER NOT NULL DEFAULT 0 CHECK(manager IN(0,1)),
 expires_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(manager=0 OR kind='owner'), CHECK(kind!='temporary' OR expires_at IS NOT NULL)
);
CREATE UNIQUE INDEX active_member ON pool_members(pool_id,user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX one_principal ON pool_members(pool_id) WHERE kind='principal' AND revoked_at IS NULL;
CREATE UNIQUE INDEX one_manager ON pool_members(pool_id) WHERE manager=1 AND revoked_at IS NULL;
CREATE INDEX member_user ON pool_members(user_id,revoked_at,pool_id);
CREATE INDEX member_pool ON pool_members(pool_id,revoked_at);
CREATE TABLE invitations (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), sender_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN('owner','principal','temporary')), access_until TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','declined','cancelled')),
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX invitation_recipient ON invitations(recipient_id,status,created_at);
CREATE UNIQUE INDEX invitation_pending ON invitations(pool_id,recipient_id) WHERE status='pending';
CREATE TABLE schedules (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), pro_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL DEFAULT 'Entretien',
 start_date TEXT NOT NULL, end_date TEXT, weekday INTEGER CHECK(weekday BETWEEN 1 AND 7), interval_days INTEGER NOT NULL DEFAULT 7 CHECK(interval_days BETWEEN 1 AND 365),
 time TEXT NOT NULL DEFAULT '09:00', duration INTEGER NOT NULL DEFAULT 45, seasons TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX schedules_pool ON schedules(pool_id,active,start_date);
CREATE INDEX schedules_pro ON schedules(pro_id,active,start_date);
CREATE TABLE appointments (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), pro_id TEXT NOT NULL REFERENCES users(id), schedule_id TEXT REFERENCES schedules(id),
 original_date TEXT, date TEXT NOT NULL, time TEXT NOT NULL DEFAULT '09:00', title TEXT NOT NULL DEFAULT 'Entretien', duration INTEGER NOT NULL DEFAULT 45,
 status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN('planned','done','cancelled')), reason TEXT NOT NULL DEFAULT '',
 UNIQUE(schedule_id,original_date)
);
CREATE INDEX appointment_pool_date ON appointments(pool_id,date,status);
CREATE INDEX appointment_pro_date ON appointments(pro_id,date,status);
CREATE TABLE records (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), author_id TEXT NOT NULL REFERENCES users(id), author_name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN('analysis','visit')), measured_at TEXT NOT NULL, readings TEXT NOT NULL DEFAULT '{}', method TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '', products TEXT NOT NULL DEFAULT '', checklist TEXT NOT NULL DEFAULT '[]', duration INTEGER,
 appointment_id TEXT REFERENCES appointments(id), correction_of TEXT REFERENCES records(id), revision INTEGER NOT NULL DEFAULT 1,
 published_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX records_pool_time ON records(pool_id,measured_at DESC,id DESC);
CREATE INDEX records_author_draft ON records(author_id,published_at);
CREATE UNIQUE INDEX record_appointment ON records(appointment_id) WHERE correction_of IS NULL;
CREATE UNIQUE INDEX record_correction ON records(correction_of) WHERE correction_of IS NOT NULL;
CREATE TABLE private_notes (pool_id TEXT NOT NULL REFERENCES pools(id), user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL DEFAULT '', PRIMARY KEY(pool_id,user_id));
CREATE TABLE photos (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), record_id TEXT NOT NULL REFERENCES records(id), author_id TEXT NOT NULL REFERENCES users(id),
 r2_key TEXT NOT NULL UNIQUE, caption TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX photos_record ON photos(record_id);
CREATE TABLE needs (
 id TEXT PRIMARY KEY, pool_id TEXT NOT NULL REFERENCES pools(id), created_by TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN('product','equipment')), quantity TEXT NOT NULL DEFAULT '', responsible TEXT NOT NULL CHECK(responsible IN('client','pro')),
 due_date TEXT, status TEXT NOT NULL DEFAULT 'needed' CHECK(status IN('needed','ready','delivered','cancelled')), revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX needs_pool_status ON needs(pool_id,status,due_date);
CREATE TABLE notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
 pool_id TEXT REFERENCES pools(id), request_id TEXT, read_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX notifications_user ON notifications(user_id,created_at DESC,id DESC);
CREATE INDEX notifications_unread ON notifications(user_id,read_at);
CREATE TABLE help_requests (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id), author_is_pro INTEGER NOT NULL, pool_id TEXT REFERENCES pools(id),
 kind TEXT NOT NULL CHECK(kind IN('advice','repair','reinforcement','replacement','transfer')),
 title TEXT NOT NULL, body TEXT NOT NULL, specialty TEXT NOT NULL DEFAULT 'maintenance', scope TEXT NOT NULL DEFAULT 'local' CHECK(scope IN('local','national')),
 city_code TEXT NOT NULL, city TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','assigned','resolved','closed')), urgent INTEGER NOT NULL DEFAULT 0,
 hidden INTEGER NOT NULL DEFAULT 0, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX help_feed ON help_requests(hidden,status,created_at DESC,id DESC);
CREATE INDEX help_author ON help_requests(author_id,created_at DESC);
CREATE INDEX help_zone ON help_requests(latitude,longitude,status);
CREATE TABLE help_replies (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES help_requests(id), author_id TEXT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX help_replies_request ON help_replies(request_id,created_at,id);
CREATE TABLE offers (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES help_requests(id), pro_id TEXT NOT NULL REFERENCES users(id),
 message TEXT NOT NULL DEFAULT '', until_date TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','awaiting_owner','accepted','declined','finished','cancelled')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(request_id,pro_id)
);
CREATE UNIQUE INDEX offer_one_selected ON offers(request_id) WHERE status IN('awaiting_owner','accepted');
CREATE TABLE blocks (user_id TEXT NOT NULL REFERENCES users(id), blocked_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(user_id,blocked_id), CHECK(user_id!=blocked_id));
CREATE TABLE flags (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), request_id TEXT NOT NULL REFERENCES help_requests(id), reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(user_id,request_id));
CREATE TABLE audit (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), pool_id TEXT, action TEXT NOT NULL, target_id TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX audit_pool ON audit(pool_id,created_at DESC);
CREATE TABLE procedures (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, important INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX procedures_owner ON procedures(owner_id,important);
CREATE TABLE quiz_attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), score INTEGER NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
