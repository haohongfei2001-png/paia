# Identity-currentness source packaging

Status: finite source packaging implemented; isolated 180/180 tests and actual
source build import pass. Independent read-only review passed on 2026-10-18
21:12 UTC for this exact isolated snapshot. No deployment, install,
credential, DDL, environment activation or remote call occurred.

## Exact successor

The already reviewed 123-test complete currentness snapshot and 144-test
streaming-bootstrap snapshot remain preserved with their original bytes/logs.
This successor adds the new actual API to `services/ai-gateway/vercel.json` and
`check-deployment-source.mjs`, plus a new isolated packaging test. It preserves
all old function entries, build command, install command and old assertions.

The function's `includeFiles` is exactly the existing reservations/status
metadata-owner list: extension package metadata, constants/dedupe, and the same
eight original AI usage owner modules. It adds no user-content directory, UI,
permission, credential source, wildcard body access or provider route. The outer
function maximum is the existing 60 seconds; the new source gateway retains its
separate conservative 55-second total lifetime. These are source configuration
contracts, not measured hosting behavior or a deployment action.

The checker imports the actual new default-off API and its real transitive graph,
then checks its exact existing includeFiles/maxDuration relationship. It does
not create a Pool or read deployment secrets. The isolated topology test copies
the actual service graph and only the explicitly included original extension
modules into a temporary package. In its subprocess any Socket/Pool connection
or PAIA environment read fails. The positive graph succeeds; missing the new API,
an original dependency or extension package metadata fails. A broadened include
pattern or a 120-second override also fails. Existing bootstrap tests remain intact.

## Exact evidence

The new complete candidate is `paia-identity-packaging-candidate-20261018-2109`.
Its tree is the reviewed complete 144-test snapshot overlaid with the three new
code/test files. All 1,031 files match before and after the run; the tests load
only that isolated tree, not the active shared session qualification lane.

- Combined 180/180: previous 144, six new packaging cases and 30 original
  deployment-bootstrap cases; zero failures, skips or cancellations.
- Full log SHA256: `923b2df1c95cb50cb52bf78240d71f601ebd0c3120d4bd9aceab312cce83a4f1`
- Full manifest SHA256: `250a72d22278a256fab048ee1ff5874a0102404fe78b6fb805f654db6267d8fa`
- Actual checker: `SOURCE_GRAPH_OK (no deployment, database, readiness or financial qualification)`.
- `vercel.json`: `49b7859b51e3f33dd7ae16ed57e2c981222fc22a3333b7f9b4c504e8a327ba9f`
- Checker: `8d59e51d8a386729d689e0c552aba3fc9fd0c11bf46280403168eb262857faea`
- Tests: `d68466dd05a5d37a99a7738947690ce23450ada9a605fbefc0d488cf8cfbcfba`

Earlier receipts retain their historical pending-review wording where frozen.
Subsequent independent read-only review explicitly approved the complete
123-test currentness snapshot and 144-test bootstrap snapshot; their evidence
is not relabelled as a pass of the active shared qualification lane.

## Remaining boundaries

This closes source graph/packaging code for the new default-off API. The parent
owns extension worker composition. The source endpoint and policy/processing/
identity configurations still default to unavailable until separately qualified
and explicitly configured. Actual hosted response streaming, cancellation,
resource limits, Node 22 platform behavior and production deployment remain
unverified; local evidence here used Node 24.

Real PostgreSQL roles/triggers and cross-process notification races remain open.
Global deny-only notification still closes every listener on unrelated principal
security refresh, requiring real multi-account availability/load qualification.
Only admitted, valid metadata requests discover configuration rotation; a
full-capacity rejection does not. The existing short expiry/DB-notification path
still bounds old streams. There is no automatic renewal or remote-DB/local-IDB
atomic-revocation claim. Native UI/visual evidence, production issuer selection,
long-term visibility and the FILTER/Context-retry composition limit remain as
recorded in their owning receipts.
