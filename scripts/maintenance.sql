-- Run daily on each isolated platform database. Does not delete reports or pool history.
DELETE FROM sessions WHERE expires_at < CAST(strftime('%s','now') AS INTEGER)*1000;
DELETE FROM rate_limits WHERE reset_at < CAST(strftime('%s','now') AS INTEGER)-86400;
UPDATE invitations SET status='cancelled' WHERE status='pending' AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now');
UPDATE pool_members SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE kind='temporary' AND revoked_at IS NULL AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now');
UPDATE help_requests SET status='closed' WHERE status='open' AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now');
