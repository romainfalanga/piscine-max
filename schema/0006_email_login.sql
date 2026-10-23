-- Migrate unambiguous emails only. Ambiguous legacy accounts keep their data
-- and can attach a unique address from an existing session or recovery code.
ALTER TABLE users ADD COLUMN login_email TEXT COLLATE NOCASE;
UPDATE users SET login_email=lower(trim(email))
WHERE email IS NOT NULL AND trim(email)!='' AND instr(email,'@')>1
AND (SELECT count(*) FROM users other WHERE lower(trim(other.email))=lower(trim(users.email)))=1;
CREATE UNIQUE INDEX users_login_email ON users(login_email) WHERE login_email IS NOT NULL;
CREATE INDEX users_recovery_lookup ON users(recovery_hash) WHERE disabled=0;
UPDATE users SET name=login_email WHERE login_email IS NOT NULL;
