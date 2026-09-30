CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL CHECK (password_iterations BETWEEN 100000 AND 2000000),
    password_algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA-256' CHECK (password_algorithm = 'PBKDF2-SHA-256'),
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
    profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    profile_photo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at TIMESTAMPTZ
);

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_photo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique ON app_users (lower(email));
CREATE INDEX IF NOT EXISTS app_users_role_active_idx ON app_users (role) WHERE disabled_at IS NULL;

CREATE TABLE IF NOT EXISTS app_user_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_user_sessions_expiry_idx ON app_user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS app_user_sessions_user_idx ON app_user_sessions (user_id);

CREATE TABLE IF NOT EXISTS app_user_audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('register', 'bootstrap', 'create', 'role_change', 'disable', 'enable', 'delete', 'login', 'logout')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_user_audit_target_idx ON app_user_audit_log (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_user_audit_actor_idx ON app_user_audit_log (actor_user_id, created_at DESC);
