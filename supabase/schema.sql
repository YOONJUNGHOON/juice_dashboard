-- ============================================================
-- Juice Dashboard — Supabase Schema
-- Run this in the Supabase SQL editor to initialize the DB.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- allowed_emails
-- Who is permitted to log in. PIN is stored as a bcrypt hash.
-- To add a user, insert a row with a bcrypt-hashed PIN:
--   INSERT INTO allowed_emails (email, pin_hash, name)
--   VALUES ('user@example.com', '$2b$12$...', 'Alice');
-- You can generate a hash with: node -e "const b=require('bcryptjs');console.log(b.hashSync('1234',12))"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allowed_emails (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT        UNIQUE NOT NULL,
  pin_hash   TEXT        NOT NULL,
  name       TEXT,
  is_admin   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- dashboard_entries
-- Manually entered stock study records.
-- current_price is refreshed at runtime via Naver Finance.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_entries (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker         TEXT         NOT NULL,
  company_name   TEXT         NOT NULL,
  purchase_price NUMERIC(14,2) NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ------------------------------------------------------------
-- uploads
-- Metadata for files stored in Supabase Storage bucket "uploads".
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uploads (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL,
  uploader    TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,  -- path inside the bucket
  file_name   TEXT        NOT NULL,  -- original filename
  file_size   BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Row Level Security
-- All tables are locked down. Access only via service role key
-- used in server-side API routes.
-- ------------------------------------------------------------
ALTER TABLE allowed_emails    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads           ENABLE ROW LEVEL SECURITY;

-- No public policies — service role bypasses RLS automatically.

-- ============================================================
-- Seed: first admin user
-- ============================================================
-- Run this after the table is created to insert the first admin.
-- PIN 0221 → bcrypt hash (cost 12):
INSERT INTO allowed_emails (email, pin_hash, name, is_admin)
VALUES (
  'junghoon221@naver.com',
  '$2b$12$vbym216.v.szQ4LMinoLMupqG97XuMomtbwEop9IhRBM23XAiv80u',
  'Junghoon',
  TRUE
)
ON CONFLICT (email) DO NOTHING;
