CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  type VARCHAR(40) NOT NULL CHECK (
    type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')
  ),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type
ON auth_tokens(user_id, type);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash
ON auth_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_valid_lookup
ON auth_tokens(token_hash, type, expires_at)
WHERE used_at IS NULL;
