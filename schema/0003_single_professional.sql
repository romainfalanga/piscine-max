-- A pool has one professional: its principal. Preserve old reports, revoke extra access.
UPDATE schedules SET active=0 WHERE EXISTS(SELECT 1 FROM pool_members m WHERE m.pool_id=schedules.pool_id AND m.user_id=schedules.pro_id AND m.kind='temporary' AND m.revoked_at IS NULL);
UPDATE appointments SET status='cancelled',reason='Accès professionnel ponctuel retiré' WHERE status='planned' AND EXISTS(SELECT 1 FROM pool_members m WHERE m.pool_id=appointments.pool_id AND m.user_id=appointments.pro_id AND m.kind='temporary' AND m.revoked_at IS NULL);
UPDATE pool_members SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE kind='temporary' AND revoked_at IS NULL;
UPDATE invitations SET status='cancelled' WHERE kind='temporary' AND status='pending';
ALTER TABLE invitations ADD COLUMN resolution_nonce TEXT;
CREATE TRIGGER no_new_temporary_member BEFORE INSERT ON pool_members WHEN NEW.kind='temporary' AND NEW.revoked_at IS NULL BEGIN SELECT RAISE(ABORT,'temporary access removed'); END;
CREATE TRIGGER no_reactivated_temporary_member BEFORE UPDATE ON pool_members WHEN NEW.kind='temporary' AND NEW.revoked_at IS NULL BEGIN SELECT RAISE(ABORT,'temporary access removed'); END;
CREATE TABLE connection_requests (
 id TEXT PRIMARY KEY,
 pro_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','declined','cancelled')),
 expires_at TEXT NOT NULL,
 resolution_nonce TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(pro_id!=client_id)
);
CREATE UNIQUE INDEX pending_connection ON connection_requests(pro_id,client_id) WHERE status='pending';
CREATE INDEX connection_client ON connection_requests(client_id,status,expires_at);
