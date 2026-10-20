-- Pin the already existing, explicitly designated account. Public signup never
-- appoints a provider, including on an empty database.
CREATE TABLE business_provider (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 user_id TEXT UNIQUE REFERENCES users(id) ON DELETE RESTRICT
);
INSERT INTO business_provider(singleton,user_id) SELECT 1,id FROM users WHERE id='bcb167e4-2ddc-45c1-816a-82e7008904af' AND login_email='romainfalanga83@gmail.com' AND disabled=0;
INSERT OR IGNORE INTO business_provider(singleton,user_id) VALUES(1,NULL);
UPDATE schedules SET active=0 WHERE pro_id NOT IN(SELECT user_id FROM business_provider WHERE user_id IS NOT NULL);
UPDATE appointments SET status='cancelled',reason='Espace professionnel réservé à Peace in Blue' WHERE status='planned' AND pro_id NOT IN(SELECT user_id FROM business_provider WHERE user_id IS NOT NULL);
UPDATE pool_members SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE kind='principal' AND revoked_at IS NULL AND user_id NOT IN(SELECT user_id FROM business_provider WHERE user_id IS NOT NULL);
UPDATE connection_requests SET status='cancelled' WHERE status='pending' AND pro_id NOT IN(SELECT user_id FROM business_provider WHERE user_id IS NOT NULL);
UPDATE invitations SET status='cancelled' WHERE status='pending' AND kind='principal';
UPDATE users SET is_pro=CASE WHEN id IN(SELECT user_id FROM business_provider) THEN 1 ELSE 0 END;
CREATE TRIGGER exclusive_provider_insert BEFORE INSERT ON users WHEN NEW.is_pro=1 AND NOT EXISTS(SELECT 1 FROM business_provider WHERE user_id=NEW.id) BEGIN SELECT RAISE(ABORT,'reserved professional account'); END;
CREATE TRIGGER exclusive_provider_update BEFORE UPDATE OF is_pro ON users WHEN NEW.is_pro=1 AND NOT EXISTS(SELECT 1 FROM business_provider WHERE user_id=NEW.id) BEGIN SELECT RAISE(ABORT,'reserved professional account'); END;
CREATE TRIGGER exclusive_principal_insert BEFORE INSERT ON pool_members WHEN NEW.kind='principal' AND NEW.revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM business_provider WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'reserved professional account'); END;
CREATE TRIGGER exclusive_principal_update BEFORE UPDATE ON pool_members WHEN NEW.kind='principal' AND NEW.revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM business_provider WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'reserved professional account'); END;
CREATE TABLE maintenance_requests (
 id TEXT PRIMARY KEY,
 pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
 requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 phone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','declined','cancelled')),
 resolution_nonce TEXT,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 resolved_at TEXT
);
CREATE UNIQUE INDEX one_pending_maintenance ON maintenance_requests(pool_id) WHERE status='pending';
CREATE INDEX maintenance_queue ON maintenance_requests(status,created_at,id);
ALTER TABLE notifications ADD COLUMN maintenance_request_id TEXT REFERENCES maintenance_requests(id) ON DELETE CASCADE;
