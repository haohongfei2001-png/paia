# Identity-currentness streaming bootstrap: finite source successor

Status: implemented source assembly, 144/144 isolated local tests. Independent
read-only review passed on 2026-10-18 21:05 UTC for the exact isolated snapshot. This follows the separately reviewed complete 123-test channel
snapshot. It does not relabel that snapshot or certify the active Context
qualification lane, a deployed service, real PostgreSQL, native UI, or production
entitlement availability.

## Source assembly and authority

New `services/ai-gateway/identity-currentness-deployment-bootstrap.mjs` owns one
lazy gateway and dedicated real `pg.Pool`. New `api/identity-currentness.mjs`
exports the actual default-off fetch entry and explicit lifecycle close. Import
reads no environment, credential or database; it opens no socket.

Both the independent `PAIA_IDENTITY_CURRENTNESS_ENABLED` opt-in and the original
`PAIA_RESERVATIONS_ENABLED` configuration must be enabled by a separately
approved deployment. The original deployment compiler owns the exact database,
pinned public keys, TLS, role, password source and configuration grammar. HTTP
input cannot choose these, a Pool constructor, verifier, limit or callback. No
new account, entitlement, budget or provider capability is introduced. The
original short financial JSON status/bootstrap/runtime remain unchanged.

The actual new service performs its original committed LISTEN followed by a
short signed/locked authority snapshot for every stream. No ledger transaction
is held during streaming. The source client still needs the original exact
RESERVED status and Pro window before its Filter capability. The channel adds
one metadata HTTP, zero paid/provider calls. The source positive actually reaches
original Filter mutation, joined ACK and hidden visibility, then session disposal
closes the physical listener and restores visibility.

## Full-lifetime resource ownership

- Per gateway, at most eight HTTP lifetimes cover metadata reading, admission,
  the entire returned response body and unfinished cancellation promises. Merely
  returning response headers does not release a slot. Abandoned responses are
  closed under bounded one-chunk forwarding/backpressure.
- The dedicated Pool has max 8/min 0 and retains the original verified TLS and
  finite connection/query settings. A source-owned wrapper reserves capacity
  before invoking the actual Pool.connect API. Unresolved acquisitions and
  physical clients awaiting their final removal share the same limit of eight.
- Public Pool `connect`/`remove` events track physical lifetime separately from
  pg's internal active array. `Pool.end()` alone can resolve after a released
  client left that array while its Client.end callback is still pending. Rotation
  waits for both Pool.end and every tracked removal/acquisition to settle.
- An entry-wide 55-second deadline, starting before body parsing, conservatively
  closes a stream. This never extends or rewrites the original signed identity
  expiry. The original five-second parser and admission bounds still apply.
- Request abort, EOF, backpressure, DB invalidation, Pool error, explicit close
  and an observed configuration rotation close streams. Release is idempotent.
  Uncertain five-second pool drain blocks that gateway from creating a new Pool;
  a late close does not silently revive it.

Configuration is observed only by a request that is admitted under the resource
bounds and passes the original strict metadata parser. At full capacity, a new
request is rejected without inspecting configuration; it does not push a disable
or rotation to existing streams. Those streams retain only their existing short
limits and DB deny-only notification path. Once an admitted request discovers a
change, the old channels are revoked before a replacement Pool can exist. This
is not a claim of instantaneous external configuration revocation. An explicit
gateway close is the source lifecycle path for a trusted host shutdown.

## Actual tests and preserved failures

All evidence is local Node 24, synthetic signed identities and PostgreSQL wire/
SQL simulation using the actual Pool, Client, service, HTTP streams and original
source/financial/Filter owners. Socket creation is rejected by the harness.
No database connection, DDL execution, package install or deployment occurred.

Preserved real regressions:

1. `paia-identity-bootstrap-second.tap`: rotation completed before the held
   physical Client.end acknowledgement. Public connect/remove accounting fixes it.
2. `paia-identity-bootstrap-physical-end-red.tap`: repeated HTTP cancellation with
   held physical closes accumulated 32 clients instead of 8.
3. `paia-identity-bootstrap-concurrent-physical-red.tap`: seven closing clients
   plus eight concurrent new admissions reached 15 instead of 8. Reserving the
   shared physical slot synchronously before Pool.connect fixes this race.

The initial test setup typo is retained in `paia-identity-bootstrap-first.tap`;
it is not a production regression. `paia-identity-bootstrap-16.tap` contains a
source failure while a shared session qualification import was incomplete. The
same source positive passed against the complete frozen 20:55 tree; this receipt
claims only the final isolated bytes below, not the active working tree.

Final independent candidate tree:
`paia-identity-bootstrap-candidate-20261018-2102/tree`.
It overlays exactly the three new code/test files on the previously complete
reviewed 123-test snapshot. All 1,030 files have identical before/after manifests.
The combined 144 tests pass, with zero failed, skipped or cancelled:

- Log SHA256: `6a75b117965bdf2b696e666fe46f46d5b3bc2fee202086c1f1f1692ee1e05e22`
- Manifest SHA256: `607581dc82a17625cbc69ccbaff19db3129bac8246d6192f8bfa8b138140f566`
- Bootstrap SHA256: `fbba771839d20fcc66f3cbb63cbdfdbbac37917406f10a0d8556e9b395fe8e55`
- API SHA256: `e7a6d286adbb5b6238aa7a8d6fd740302a7dfb343a72d5c559bb283d05c04632`
- Tests SHA256: `2c1fce265146f1e2e737b9a8f0b39de33bd9251a33f9ed4f8ec6fa69c5eb7204`

## Remaining qualifications

The new API/bootstrap source closes the earlier missing backend lifecycle code
boundary. It does not activate the source-default-null extension endpoint or
source policy/processing/identity configuration. Deployment packaging and the
existing source-build gate have not yet been extended for this new API, and the
hosting platform's streaming/timeout/cancellation behavior remains unqualified.
No Vercel or real environment configuration was changed.

Real PostgreSQL ACL/trigger integrity, transactional notification races across
processes and multi-account load remain separate evidence requirements. Any
unrelated principal security refresh still invalidates all listeners; this is a
conservative availability/scale limitation, not merely a deployment checklist
item. The protocol remains bounded observation, never remote-DB/local-IDB atomic
revocation. Delivered invalidation immediately fails closed; no operation is
automatically renewed. Persistent visibility renewal, native/visual evidence,
production issuer selection and activation remain open.
