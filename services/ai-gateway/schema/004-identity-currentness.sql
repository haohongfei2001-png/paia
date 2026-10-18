-- Source only. Requires the original 002 authority schema. No deployment,
-- grants, roles, seed identities, credentials, or endpoint activation here.
-- Every ordinary writer participates through these database-owned triggers.
-- The trusted migration owner must drain currentness channels before DDL.
BEGIN;
CREATE FUNCTION paia_ai_private.invalidate_identity_currentness() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $body$
BEGIN
 PERFORM pg_catalog.pg_notify('paia_identity_invalidated_v1', '');
 RETURN NULL;
END
$body$;
REVOKE ALL ON FUNCTION paia_ai_private.invalidate_identity_currentness() FROM PUBLIC;
CREATE TRIGGER identity_currentness_invalidation
 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON paia_ai_private.service_control
 FOR EACH STATEMENT EXECUTE FUNCTION paia_ai_private.invalidate_identity_currentness();
CREATE TRIGGER identity_currentness_invalidation
 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON paia_ai_private.principal_authority
 FOR EACH STATEMENT EXECUTE FUNCTION paia_ai_private.invalidate_identity_currentness();
ALTER TABLE paia_ai_private.service_control ENABLE ALWAYS TRIGGER identity_currentness_invalidation;
ALTER TABLE paia_ai_private.principal_authority ENABLE ALWAYS TRIGGER identity_currentness_invalidation;
COMMIT;
