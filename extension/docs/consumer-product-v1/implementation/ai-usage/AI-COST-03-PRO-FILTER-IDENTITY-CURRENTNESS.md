# Pro Filter: bounded identity-currentness source channel

Status: finite source channel slice frozen after coherent 103/103 local tests;
independent final review pending. This is a
successor to the independently frozen 304-test source-authority slice. It does
not modify that archive or turn its neutral test connection into a production
identity source. The exact source and dependency manifest accompanies the freeze.

## Contract and explicit limits

The source-owned, default-null endpoint is `/api/identity-currentness`, on the
same configured HTTPS origin as the original maintenance service. Its sole
request is the original exact financial request plus its two original signed
proofs, with `action: observe`. No Input/Entry/Context text, note, profile body,
Source content or new model request is sent. There is **one additional metadata
HTTP request per admitted child**, separate from the two unchanged original
financial status queries. There is no additional provider or paid call.

The service reuses `principal_authority.security`, `service_control`, and
`createSignedIdentityVerifier().verifyValidity()`. It does not invent an account,
entitlement, principal generation, or reservation. The original exact RESERVED
status and Pro window remain mandatory before a local Filter write capability
can exist. Financial JSON status, flags, holds and recovery are unchanged.

This protocol establishes a **bounded observation**, not atomic revocation
across a remote database and local IndexedDB. The original signed/security/key/
service expiry remains an absolute bound of at most 60 seconds. Receiving an
invalidation, EOF, error, malformed frame, timeout or unknown connection state
immediately retires the local capability. A pulse confirms stream activity and
never extends identity validity. Three seconds without a valid frame fails
closed; that is a connection-silence bound, not a claim that an arbitrarily
delayed remote revocation must arrive within three seconds. A lost or delayed
notification can leave only the original short observation, never an unbounded
or automatically renewed entitlement.

## Database-owned invalidation

Source migration `004-identity-currentness.sql` adds one fixed empty-payload
notification function and an ALWAYS statement trigger on each original table,
covering INSERT, UPDATE without a column filter, DELETE and TRUNCATE. Every
ordinary writer participates through PostgreSQL, including other processes.
Any principal's update, including an ordinary security snapshot refresh,
conservatively closes all current channels. This trades availability and scale
for a privacy-safe, simple denial scope. Notifications contain no principal or
library identifiers and never grant or renew anything. A forged notification
can deny only.

Handlers are installed before LISTEN. LISTEN is committed first; only then does
a new, short transaction lock the original control and principal rows, validate
the schema/role, use the original verifier, recheck the database clock and
commit. A notification at any preparation boundary invalidates admission. No
financial ledger lock is taken and no transaction remains open while streaming.
This follows PostgreSQL's documented [LISTEN initialization order](https://www.postgresql.org/docs/current/sql-listen.html).
[NOTIFY delivery is transactional](https://www.postgresql.org/docs/current/sql-notify.html):
rollback does not publish a committed invalidation, and listeners receive events
between transactions. The implementation does not replace that database
guarantee with an in-memory application callback or periodic polling.

Admission pins the trigger's complete event mask, ALWAYS state, lack of row/
column/predicate/argument narrowing, exact function body/language/search path/
security properties, original table/function owner relationship, forced RLS,
plain non-inherited tables and restricted runtime privileges. The original
`lock_anchor` is the only UPDATE-column exception: int2, not null, and a validated
CHECK fixing its value to 1. PostgreSQL [requires an UPDATE privilege for FOR SHARE](https://www.postgresql.org/docs/current/sql-select.html).
All substantive column UPDATE and whole-table mutation privileges remain denied.
Trusted administrators and schema migrations must drain these channels; the
protocol does not claim to prevent a superuser from disabling its trigger.

## Resource and source-capability ownership

The service admits at most eight occupied listener/acquisition slots. A timed-out
Pool acquisition is still occupied until its original promise settles; a late
connection is destroyed without LISTEN. All listeners are dedicated and are
discarded on close, never returned to a pool with residual subscriptions.

The fixed HTTPS transport separately bounds eight active or unresolved-fetch
slots, initial readiness to five seconds, frames to 2 KiB, the whole stream to
8 KiB and at most 61 frames. Backpressure closes the service stream. Aborting a
configured fetch wrapper does not falsely free its still-pending slot. Local
Request/proof references are dropped after dispatch; an abort-ignoring wrapper
may retain its own arguments until it settles, bounded to eight outstanding
requests. No stronger erasure claim is made about such an external wrapper.

`createMaintenanceIdentityChannelCurrentness` accepts only the private transport
brand and exact origin. Its ordinary `connect(callback)` always rejects. Status
observations retain the original one-use query-start ticket and must also match
this channel's exact request, principal/library, all three generations, tier,
observation time and original expiry. Each exact operation opens at most once;
reconnect/renewal is not automatic. The owner bounds operation tombstones to 32
and requires an explicit new source owner thereafter. Any channel failure
conservatively retires all this owner's current observations.

`withMaintenanceIdentityCurrentness(configuration, endpoint = null)` performs
no I/O. A null original service stays null; absent or invalid endpoint removes a
neutral callback owner rather than falling back to it. The owning endpoint
reader defaults to null regardless of local tier/consent or message values.
The parent owns final worker assembly after this slice's bounded review.

A private lifecycle claim transfers each production channel owner to exactly one
service client. Client/session disposal and original host invalidation immediately
close its stream. Failed construction disposes only an unclaimed production owner;
a second client cannot dispose an already-owned channel. Neutral protocol-test
owners remain caller-owned. Worker composition must create a fresh source owner
for a new client rather than sharing one across runners.

## Evidence and preserved failures

All current evidence uses local Node 24, synthetic signed test issuers, actual
source HTTP/stream/client/Filter/financial owners, and deterministic PostgreSQL
protocol simulation. **No database connection or DDL execution occurred.** It
does not establish actual PostgreSQL role/trigger/notification/cross-process
qualification, deployed HTTP streaming behavior, live issuer availability,
browser/native rendering, or whole-programme acceptance.

Preserved RED proofs:

- `paia-identity-acquire-red.tap`: repeated timed-out Pool acquisitions reached
  32 rather than the required 8. Separate occupied accounting fixes this.
- `paia-identity-lock-anchor-red.tap`: the initial SQL permission contract
  rejected the original only-lock-anchor role. The precise original exception
  and column-constraint checks fix it. This is SQL-contract protocol evidence,
  not a claimed live PostgreSQL ACL test.
- `paia-identity-fetch-red.tap`: abort-ignoring held fetches likewise reached
  32 rather than 8. Pending promises now retain capacity until settlement.
- `paia-identity-transport-first.tap`: accessor-bearing endpoint configuration
  was accepted. Own-data descriptor validation now rejects it without a read.
- `paia-identity-source-lifecycle-red.tap`: actual session disposal and host
  invalidation left their listener open (0 releases instead of 1). The production
  lifecycle claim fixes both; the two true source tests pass before test cleanup.
  `paia-identity-client-lifecycle-red.tap` separately preserves four failed direct
  client controls; the repaired five-case suite includes neutral-owner preservation.

Positive and negative coverage includes committed LISTEN ordering, notification
during six preparation stages, independent service instances, restricted schema
and function properties, expiry/clock rollback/commit-ACK loss, listener cleanup,
backpressure, malformed/duplicate/oversize frames, silence/EOF, held channel across
disconnect, exact generations, original source mutation plus exact ACK and
visibility, revocation after provider response, and actual local storage rollback
with successful same-channel retry or revoked-channel refusal. Provider and
metadata counts are asserted separately; paid work is never replayed.

An earlier complete 80/80 source/protocol run is preserved as
`paia-identity-currentness-80.tap`. A later combined invocation encountered a
shared session file's in-progress syntax state and is retained separately as
`paia-identity-currentness-80b.tap`; it is not a green result. The final successor run is `paia-identity-currentness-final103.tap`: 103/103
passed, zero skipped/cancelled, log SHA256
`385021836251ddf4fa872119989eebea5e0e2d4b6d7c994758244fcefdc0afbe`.
Twenty runtime/test/dependency files were byte-identical before and after; manifest
SHA256 `16a537d5a016d22de6bac2b3647f1cd6863e386438ec4026e5b70bb2d913872d`.
This includes the complete original Foundation file, current session, original
Filter owner/repository, unchanged original status owners and source fixture.
The original neutral identity regression separately passes 20/20. An earlier
103-test run with two incorrect dependency paths is kept only as partial-manifest
evidence, not substituted for this corrected coherent run. The shared session
owner continues its separately scoped qualification lane after this checkpoint.

## Remaining delivery boundaries

- Final independent review for this successor is pending; the coherent scoped
  regression and exact dependency manifest above are complete. They do not
  certify the separate active shared-session qualification lane.
- The new server service and handler are source implementations. A default-off
  streaming deployment bootstrap/API lifecycle adapter is not yet delivered;
  reusing the old finite-response in-flight counter would be incorrect.
- Production endpoint/issuer/processing/profile/policy deployment, original
  database migration qualification, and native/visual evidence remain open.
- The global deny-only channel closes every listener for an unrelated principal
  security refresh too. Multi-account load and availability require actual
  PostgreSQL/concurrency qualification; this is not merely a deployment step.
- There is no persistent visibility renewal. Expiry or uncertainty restores
  visibility. A new trusted observation cannot silently extend an old operation.
- The earlier FILTER/Context-storage-retry restriction remains: once an Input
  is legitimately filtered, the original Context owner may reject that now
  unreadable evidence. KEEP or an independent still-readable group is the valid
  local retry positive; the grant is not widened to hide this limitation.
