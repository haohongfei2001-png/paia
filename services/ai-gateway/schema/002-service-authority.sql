-- Source migration only. Apply through an approved migration owner, after 001.
-- There are deliberately NO seed authority rows, grants, roles or policies.
-- Existing Source/Working/domain owners remain content authority. The qualified
-- issuer, consent bridge, route operator and provider receipt publisher must
-- maintain these metadata-only service authorities; none is an HTTP endpoint.
BEGIN;
CREATE TABLE paia_ai_private.service_control (
 singleton boolean PRIMARY KEY CHECK (singleton = true),
 profile_id text NOT NULL CHECK (length(profile_id) BETWEEN 1 AND 200),
 identity_config_hash text NOT NULL CHECK (identity_config_hash ~ '^[a-f0-9]{64}$'),
 generation text NOT NULL CHECK (length(generation) BETWEEN 1 AND 200),
 enabled boolean NOT NULL,
 day_limit_micros bigint NOT NULL CHECK (day_limit_micros BETWEEN 0 AND 9007199254740991),
 month_limit_micros bigint NOT NULL CHECK (month_limit_micros BETWEEN 0 AND 9007199254740991),
 expires_at_ms bigint NOT NULL CHECK (expires_at_ms BETWEEN 0 AND 9007199254740991),
 lock_anchor smallint NOT NULL DEFAULT 1 CHECK (lock_anchor = 1)
);
CREATE TABLE paia_ai_private.principal_authority (
 principal_id text NOT NULL CHECK (length(principal_id) BETWEEN 1 AND 200),
 library_id text NOT NULL CHECK (length(library_id) BETWEEN 1 AND 200),
 security jsonb NOT NULL CHECK (jsonb_typeof(security) = 'object' AND octet_length(security::text) <= 16384
  AND security - ARRAY['principalId','libraryId','observedAt','expiresAt','principalActive','entitlementActive','principalGeneration','entitlementGeneration','revokedPrincipalKeys','revokedEntitlementKeys'] = '{}'::jsonb),
 time_zone text NOT NULL CHECK (length(time_zone) BETWEEN 1 AND 100),
 lock_anchor smallint NOT NULL DEFAULT 1 CHECK (lock_anchor = 1),
 PRIMARY KEY (principal_id, library_id)
);
CREATE TABLE paia_ai_private.route_authority (
 route_version text PRIMARY KEY CHECK (length(route_version) BETWEEN 1 AND 200),
 generation text NOT NULL CHECK (length(generation) BETWEEN 1 AND 200),
 facts jsonb NOT NULL CHECK (jsonb_typeof(facts) = 'object' AND octet_length(facts::text) <= 16384
  AND facts - ARRAY['routeQualified','thinkingBoundQualified','inputBoundQualified','route','book','fx'] = '{}'::jsonb),
 expires_at_ms bigint NOT NULL CHECK (expires_at_ms BETWEEN 0 AND 9007199254740991),
 lock_anchor smallint NOT NULL DEFAULT 1 CHECK (lock_anchor = 1)
);
CREATE TABLE paia_ai_private.request_authority (
 operation_id text PRIMARY KEY CHECK (length(operation_id) BETWEEN 1 AND 200),
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 request jsonb NOT NULL CHECK (jsonb_typeof(request) = 'object' AND octet_length(request::text) <= 8192
  AND request - ARRAY['operationId','jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'] = '{}'::jsonb),
 generation text NOT NULL CHECK (length(generation) BETWEEN 1 AND 200),
 authorized boolean NOT NULL,
 issued_at_ms bigint NOT NULL CHECK (issued_at_ms BETWEEN 0 AND 9007199254740991),
 expires_at_ms bigint NOT NULL CHECK (expires_at_ms BETWEEN 0 AND 9007199254740991),
 lock_anchor smallint NOT NULL DEFAULT 1 CHECK (lock_anchor = 1)
);
CREATE TABLE paia_ai_private.operation_evidence (
 event_id text PRIMARY KEY CHECK (length(event_id) BETWEEN 1 AND 200),
 operation_id text NOT NULL CHECK (length(operation_id) BETWEEN 1 AND 200),
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 event text NOT NULL CHECK (event IN ('DISPATCHED','OUTCOME_UNKNOWN','SETTLEMENT')),
 evidence jsonb CHECK (event = 'SETTLEMENT' AND evidence IS NOT NULL AND jsonb_typeof(evidence) = 'object'
  AND octet_length(evidence::text) <= 8192
  AND evidence - ARRAY['receiptId','operationId','outcome','usage','pricingVersion','fxVersion','nativeCurrency','nativeMicros','usdMicros','committedChildren'] = '{}'::jsonb
  OR event <> 'SETTLEMENT' AND evidence IS NULL),
 expires_at_ms bigint NOT NULL CHECK (expires_at_ms BETWEEN 0 AND 9007199254740991),
 lock_anchor smallint NOT NULL DEFAULT 1 CHECK (lock_anchor = 1)
);
CREATE INDEX operation_evidence_operation_idx ON paia_ai_private.operation_evidence(operation_id);

-- Provider evidence is append-only, and insertion participates in the original
-- global ledger serialization. This also protects cancel's absence check from
-- phantoms. Publishers need existing ledger-lock privileges; no grants here.
CREATE FUNCTION paia_ai_private.lock_evidence_ledger() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $body$
BEGIN
 PERFORM 1 FROM paia_ai_private.budget_snapshot
  WHERE ledger_key = 'aiu:budget-reservations:v1' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'AI_LEDGER_MISSING'; END IF;
 RETURN NEW;
END
$body$;
CREATE FUNCTION paia_ai_private.reject_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $body$
BEGIN RAISE EXCEPTION 'AI_EVIDENCE_IMMUTABLE'; END;
$body$;
REVOKE ALL ON FUNCTION paia_ai_private.lock_evidence_ledger() FROM PUBLIC;
REVOKE ALL ON FUNCTION paia_ai_private.reject_evidence_mutation() FROM PUBLIC;
CREATE TRIGGER service_event_ledger_lock BEFORE INSERT ON paia_ai_private.operation_evidence
 FOR EACH ROW EXECUTE FUNCTION paia_ai_private.lock_evidence_ledger();
CREATE TRIGGER service_event_append_only BEFORE UPDATE OR DELETE ON paia_ai_private.operation_evidence
 FOR EACH ROW EXECUTE FUNCTION paia_ai_private.reject_evidence_mutation();

DO $migration$
DECLARE table_name text; role_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['service_control','principal_authority','route_authority','request_authority','operation_evidence'] LOOP
  EXECUTE format('ALTER TABLE paia_ai_private.%I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE paia_ai_private.%I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format('REVOKE ALL ON paia_ai_private.%I FROM PUBLIC', table_name);
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
    EXECUTE format('REVOKE ALL ON paia_ai_private.%I FROM %I', table_name, role_name);
   END IF;
  END LOOP;
 END LOOP;
END
$migration$;
COMMIT;
