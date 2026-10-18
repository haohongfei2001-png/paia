-- Apply once, through an approved migration owner, to the selected database.
-- Runtime must NOT apply migrations, own this table, bypass RLS, or be superuser.
-- No users, credentials, grants, permissive policies, or public RPC are created.
BEGIN;
CREATE SCHEMA IF NOT EXISTS paia_ai_private;
REVOKE ALL ON SCHEMA paia_ai_private FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA paia_ai_private REVOKE ALL ON TABLES FROM PUBLIC;

CREATE TABLE paia_ai_private.budget_snapshot (
  ledger_key text PRIMARY KEY CHECK (ledger_key = 'aiu:budget-reservations:v1'),
  schema_version integer NOT NULL CHECK (schema_version > 0),
  snapshot jsonb,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT bounded_snapshot CHECK (
    snapshot IS NULL OR (
      jsonb_typeof(snapshot) = 'object'
      AND snapshot ? 'rows'
      AND jsonb_typeof(snapshot -> 'rows') = 'array'
      AND jsonb_array_length(snapshot -> 'rows') <= 10000
      AND octet_length(snapshot::text) <= 16777216
    )
  )
);
INSERT INTO paia_ai_private.budget_snapshot (ledger_key, schema_version, snapshot)
VALUES ('aiu:budget-reservations:v1', 1, NULL);

ALTER TABLE paia_ai_private.budget_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE paia_ai_private.budget_snapshot FORCE ROW LEVEL SECURITY;
REVOKE ALL ON paia_ai_private.budget_snapshot FROM PUBLIC;
-- Supabase may give these roles default table privileges. Explicitly remove
-- them when present; this private schema must never be exposed via Data API.
DO $migration$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA paia_ai_private FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON paia_ai_private.budget_snapshot FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA paia_ai_private REVOKE ALL ON TABLES FROM %I', role_name);
    END IF;
  END LOOP;
END
$migration$;
COMMIT;
