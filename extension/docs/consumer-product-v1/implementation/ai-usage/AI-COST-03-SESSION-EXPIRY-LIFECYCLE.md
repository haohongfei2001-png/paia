# AI-COST-03 — retained local continuation expiry observations

Scoped follow-on evidence, 2026-10-18, after the separately frozen P1 existing-Context checkpoint. This slice adds one synthetic Node test file and this receipt. No runtime, timer, processing capability, release threshold or durable ledger behavior changes.

## Contract and observed lifetime

The original bounded Maintenance payload contract requires a current independently granted processing receipt before material acquisition and throughout response, domain and ACK checks. The receipt's scope, epoch, expiry and revocation signal cannot be refreshed to authorize a retained response. Original same-response continuation after a known storage rollback is preserved. These requirements are recorded in `AI-COST-03-MAINTENANCE-PAYLOAD.md`; neither that receipt nor this test establishes automatic idle-time memory erasure.

The new tests exercise the actual LocalMaintenanceSession, original Filter/Topic/Context owners and original joined transaction using the existing synthetic fixture pattern. A write fault occurs after an actual Filter ACK put and rolls back the complete transaction. A prepared Filter handle and one validated decision remain eligible for local retry. Node's fake clock controls Date and setTimeout; IndexedDB requests still execute through the existing fake-IndexedDB test harness.

Four observed cases:

1. Before the fixed processing receipt expires, retry commits the original validated decision. There is still exactly one physical provider call, one decode and one prepared Filter handle, released once after successful ACK.
2. With no further run or host abort, advancing the clock by 600,001 ms beyond the receipt's original ten-minute lifetime leaves the observable retained handle unreleased. The clock alone does not eagerly retire it. The next run returns UNAVAILABLE, releases it once and acquires zero Input, Source or Entry body rows. It adds no call, decode or ACK, and preserves the full durable snapshot.
3. Following the same idle clock advance, host revocation releases the handle synchronously without another run. A later run remains UNAVAILABLE and does not acquire body rows or replay the provider.
4. Host disposal has the corresponding synchronous release behavior. Repeated late abort/disposal remains idempotent.

The evidence is an owner-handle release count plus exact durable/read/call assertions. It is not introspection of every private session/helper/source-adapter reference and does not establish JavaScript heap/GC or complete-process erasure. P1's existing-Context snapshot fences and cleanup have their separate owning evidence. No automatic idle-expiry cleanup guarantee is claimed. A future requirement for such a guarantee needs its own explicit lifetime design and bounded tests; this slice does not introduce a background timer without that contract.

## Exact evidence

- New test: `extension/tests/ai-maintenance-session-expiry-lifecycle.test.mjs`, SHA-256 `fc106f10ccf2013f8f5c1c385fb9f37f3daa02a54ae7ded25e49711467dd49cc`.
- Targeted run: 4/4 PASS, 1201.520379 ms; `/tmp/paia-maintenance-expiry-lifecycle.tap`, SHA-256 `cc43c4e6b9e1b6ff0207bb6328b098933a23828df4c673ac551d67a8a11f6432`.
- New lifecycle file plus the complete original Filter session suite: 58/58 PASS, 8339.95045 ms; `/tmp/paia-maintenance-expiry-filter-combined.tap`, SHA-256 `9a8b2cb2b9a9c4ae249e0468d8d35b3db941f908abc2d2f04f19b8833cd56a8b`. Zero failed, cancelled, skipped or todo cases.
- The original Filter test file remains SHA-256 `42e9e1dd754de52c94bc2a34d43412c8e8258c240ef1534d98a3ca90ada31f10`.
- Before/after inventories `/tmp/paia-expiry-owner-before.sha256` and `/tmp/paia-expiry-owner-after.sha256` compare equal, both SHA-256 `9a666408d409046a03d5ce3cc6808a50f41d0689ee7eb568adffc52ade93a091`. Their four unchanged P1 owners are session `8a41302c…`, payload `e4bea8e3…`, Context `5b41179f…` and Topic `c01abfa7…`; complete identities remain in the P1 session receipt.

These are scoped synthetic Node/fake-clock results, not browser/native, full acceptance, installed-user or real-provider qualification. The original P0 native CI failure and its separate diagnostic successor retain their own identities. No browser launch, installation, external service call, credentials, paid replay, deployment or new Sync work occurred in this slice.
