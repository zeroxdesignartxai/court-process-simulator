-- Court Process Simulator: single-tenant account ownership with transactional case events.
-- Run in a private PostgreSQL database. Not intended for public Data API exposure.
BEGIN;
CREATE TABLE IF NOT EXISTS court_users (
 id text PRIMARY KEY CHECK (length(id)=32),
 email text NOT NULL UNIQUE,
 salt text NOT NULL,
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS court_sessions (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 user_id text NOT NULL REFERENCES court_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_court_sessions_user ON court_sessions(user_id);
CREATE TABLE IF NOT EXISTS court_cases (
 id text PRIMARY KEY CHECK(length(id)=32),
 owner_id text NOT NULL REFERENCES court_users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('judge','plaintiff','defendant','counsel_plaintiff','counsel_defendant','witness','clerk')),
 scenario_id text NOT NULL DEFAULT 'fictional-contract-001',
 stage text NOT NULL DEFAULT 'intake',
 completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_court_cases_owner ON court_cases(owner_id);
CREATE TABLE IF NOT EXISTS court_events (
 case_id text NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
 sequence integer NOT NULL CHECK(sequence>0),
 idempotency_key text NOT NULL,
 kind text NOT NULL,
 role text NOT NULL,
 stage text NOT NULL,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(case_id,sequence),
 UNIQUE(case_id,idempotency_key)
);
-- If using Supabase, keep these tables outside exposed schemas or enable RLS before granting access.
ALTER TABLE court_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON court_users,court_sessions,court_cases,court_events FROM PUBLIC,anon,authenticated;
COMMIT;
