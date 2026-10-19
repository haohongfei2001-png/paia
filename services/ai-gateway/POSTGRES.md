# Durable storage for the original AI-COST-02 ledger

This is a server-side persistence adapter for `AtomicReservationLedger` and
`BudgetWindowReservation`, not a new ledger. It implements their original
`transact(callback)` / `get(key)` / `put(key, snapshot)` contract. All principals,
features, devices and service instances use the same fixed database row and key.
There is no request-supplied database, schema, tenant partition, role or SQL.

It does not establish processing consent, service identity, entitlement, a
qualified route/ratebook, an approved global budget, provider dispatch, billing
qualification or production installation. The original owner still returns
`financialAuthority: false` and `dispatchAllowed: false`. No extension runtime,
provider key, old key, subscription service or content store is installed.

## Transaction and recovery contract

- Each callback gets one checked-out `pg.Pool` client: `BEGIN` → schema/role guard
  → fixed-row `SELECT FOR UPDATE` → original owner callback → optional `UPDATE`
  → `COMMIT` → release. `pool.query` is never used inside the adapter.
- READ COMMITTED plus the shared row lock lets the next physical connection read
  the last committed snapshot before computing any allowance. There is no
  process-local queue masquerading as cross-instance serialization.
- A fixed schema version is checked at startup (`checkReady`) and in every
  transaction. Missing tables/rows, wrong versions, unprotected RLS, unsafe
  database roles and invalid snapshots fail closed. The catalog guard runs
  after the row-lock statement pins the relation against conflicting DDL. Runtime never migrates,
  initializes a missing row, falls back to memory, or creates another ledger.
- Every nested persisted object has an exact metadata allowlist. At most 10,000
  rows and 16 MiB in PostgreSQL JSONB text form (including separator spaces)
  are accepted. No bodies, response text, arbitrary diagnostics,
  or credential fields are stored. Metadata sources/identifiers are bounded.
  Snapshot size exhaustion stops any write that would exceed the cap; it never
  prunes financial history. Arrays must be ordinary dense data descriptors, with
  no accessors/proxies/custom prototypes or ill-formed Unicode. Serialization
  does not invoke toJSON. New operation IDs must also fit conservative future
  lifecycle headroom for every unresolved hold: UNKNOWN plus final receipt, all
  child bindings, timing/result fields and maximum metadata escaping. Existing
  lifecycle writes consume this space without reserving it a second time.
- An invalid get/put immediately poisons the transaction, even if its rejected
  Promise is ignored. Earlier valid writes roll back; captured transaction
  methods cannot write after the callback has returned.
- Pre-COMMIT errors roll back. A broken connection is discarded. Once COMMIT has
  started, any error becomes `POSTGRES_COMMIT_OUTCOME_UNKNOWN` and the connection
  is discarded without callback replay. No automatic transaction retries exist.
- An unknown commit is not permission to dispatch or refund. Reconcile the exact
  original operation through the existing owner using fresh verified authority.
  A later same-ID reservation read is idempotent; request rebound is rejected.
  DISPATCHED/OUTCOME_UNKNOWN holds remain durable even after restart/30 days.
- The callback is trusted server code and must contain only ledger work and
  bounded authority verification. Never call a provider or other nontransactional
  side effect inside it. Socket errors and local statement/lock/idle timeouts
  cannot make an external side effect transactional.
- `synchronous_commit=on` requests normal durable commit acknowledgement. Actual
  storage, backups, failover and replica-loss guarantees must still be qualified
  on the selected database; this code cannot certify infrastructure durability.

## Approved server composition

The module can run in a Vercel **Node.js** function, with one long-lived,
server-owned `pg.Pool` per warm process, finite pool/connection limits and an
idle-error handler. It is not an Edge or browser module. Import
`PostgresLedgerStorage`, construct it with `{ pool }`, await `checkReady()` before
serving, and pass `storage.transact.bind(storage)` into the existing trusted
admission service's original accounting owner. Keep the full repository available
for the original `extension/core/ai-usage` imports if deploying a composition.

Resolve the connection and verified service authority entirely in approved
server configuration. Missing configuration/identity must refuse admission; do
not substitute client flags or synthetic test verifiers. Do not expose raw
`get/put`, arbitrary lifecycle events, snapshots or settlement evidence as an
unauthenticated HTTP API. No decorative HTTP entry is shipped by this storage
slice. The identity/admission composition remains separately owned.

Use approved TLS verification for nonlocal connections; never disable certificate
validation. A Supabase transaction/session pooler must pin one PostgreSQL backend
for the complete BEGIN/COMMIT transaction. This adapter uses no named prepared
statements and needs no session state between transactions. Actual provider
pooler behavior and connection capacity need deployment qualification. No region,
resource, secrets, grants or deployment are chosen or configured by this slice.

## Migration and database boundary

`schema/001-budget-ledger.sql` is a one-time, transactional migration, applied by
a separately authorized migration owner. Reapplying fails rather than resetting
existing data. It creates only `paia_ai_private.budget_snapshot`, the original
empty singleton, constraints and closed privileges. It enables and forces RLS,
revokes PUBLIC and known Supabase client/service-role privileges when present,
and creates **no permissive policy, role, credential or grant**.

The private schema must stay outside Supabase's exposed Data API schemas. Never
use `anon`, `authenticated`, `service_role`, a superuser, BYPASSRLS role, or table
owner for runtime; the adapter actively rejects bypass/owner roles. A dedicated
already-approved server runtime role needs only:

1. USAGE on `paia_ai_private`.
2. SELECT on `budget_snapshot` and UPDATE of `snapshot, updated_at` only.
3. SELECT and UPDATE RLS policies targeted specifically to that runtime role,
   restricted to `ledger_key = 'aiu:budget-reservations:v1'`; UPDATE must use the
   same condition for USING and WITH CHECK.

There is no runtime INSERT/DELETE/TRUNCATE, schema-version update or schema
CREATE requirement. Do not grant these to work around a failed startup check.
Role/credential provisioning, actual migration execution and production access
remain deployment decisions, not operations performed by this source change.

The single snapshot is deliberately a bounded initial implementation. It
serializes global allowance correctly but is not a claim of high throughput.
The byte cap applies to every write, including settlement and old-ID clock
updates. New admissions reserve a conservative maximum lifecycle/clock byte
envelope against that same SQL representation before they can commit. Existing
legacy snapshots that predate this invariant may still require a separately
reviewed, history-preserving capacity/schema migration; never refund or purge
records to make them fit. No migration of an existing live ledger is claimed.
Any future archival/schema migration must preserve every operation tombstone,
unresolved hold, receipt and clock/window fence through the same accounting
owner. It needs separate review; capacity does not authorize deleting history.

## Tests and exact limits of evidence

Install the exact official `pg` dependency with `npm ci --ignore-scripts
--no-audit --no-fund`, then run `npm test` in this directory. Protocol tests use
an actual `pg.Pool` instance with an explicitly mocked connection and cover
failure injection, rollback, unknown COMMIT, bounded body-free metadata and
closed transaction capabilities. They **do not** prove database locking or RLS.

`npm run test:postgres` requires `PAIA_LEDGER_TEST_DATABASE_URL` pointing to a
new, isolated development database named `paia_ledger_test_*`, plus
`PAIA_LEDGER_TEST_DISPOSABLE=yes`. The URI must use the exact `postgres` user,
explicit port and numeric loopback `127.0.0.1` or `[::1]`; no password, hostname,
query or fragment is accepted. The test helper builds explicit pg connection
fields and never passes the URI through pg's option parser. The localhost-only
test service uses no secret or ambient password lookup. It deliberately has no
`DATABASE_URL` fallback.
Missing configuration exits 2 with NOT_RUN, never SKIP or PASS. It refuses any
pre-existing private schema. It applies the migration, creates temporary NOLOGIN
roles/policies, uses multiple independent physical connections/pools, checks real
lock waits and global races, tests restart/unknown/rollback/rebound/settlement,
verifies RLS/least privilege, then removes only its created test schema/roles.
Use a disposable administrative test connection, never a user/production DB.

The dedicated `.github/workflows/paia-postgres-development.yml` runs only on
`evidence/postgres-ledger-20261018` (including its dispatch guard). It uses the
official PostgreSQL 17.11 image pinned by immutable digest, an ephemeral
localhost-bound database, Node 22, read-only repository access and no secrets.
It retains only exact-head identity and test output, not a DB/body/key dump. It
changes no mandatory/full certification workflow, adds no deployment, and does
not cancel or automatically retry prior evidence. Publication/execution is a
separate action; source existence is not a passing run.

Local implementation evidence on 2026-10-18: protocol tests ran; real PostgreSQL
was **NOT_RUN** because the current executor has no PostgreSQL/container runtime
or supplied disposable database. Live provider, real financial authority,
production Supabase/Vercel and broad matrices remain unclaimed. The dedicated
run must actually pass on the reviewed candidate before concurrency is qualified.

## Primary implementation references

- [node-postgres transactions](https://node-postgres.com/features/transactions)
- [Pool lifecycle, checked-out clients and release](https://node-postgres.com/apis/pool)
- [PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL RLS, default deny and bypass roles](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL connection timeouts](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [Official PostgreSQL image identity](https://raw.githubusercontent.com/docker-library/repo-info/master/repos/postgres/remote/17-bookworm.md)
