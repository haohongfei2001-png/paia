# UX-R4 DELTA-04 / DELTA-05 Security Report

## Status

- Round: **UX-R4**
- Security status: **PASS — recertified 2026-09-14**
- Certified head: `37c0d64683a4dc3ca2bd823e7c46f3c431f252d3`
- Certification: PAIA Certification **#205**, run id `34799718496`, conclusion `success`
- PR: **#23**, merged to `ux-r2` as `ee7fe62f543b4354206b9e3a46b298bbbce79f46`
- Privacy/security contracts: **52/52 PASS**
- Adapter contracts: **95/95 PASS**
- Current browser suite: **23/23 PASS**

This report supersedes the earlier R4 security checkpoint where Recovery-1 changed or strengthened a boundary.

## Boundary and ownership

Manual reuse remains an explicit local intent inside the existing ContextPackageService. ManualContext owns only bounded worker-memory sessions. It does not create a body store, Profile, Passport Grant, consumer or network request. Trusted extension sender identity and consent remain mandatory at the service-worker boundary.

The UI cannot authorize a body by passing a snippet. Canonical ids/revisions/ranges are resolved again by domain owners. Every final preview/release rechecks current source/evidence state, removal, tombstones, revision validity and restrictions.

Manual selection identity and Grant identity are intentionally separate. A local manual package cannot be converted into a Grant-bound package and a Grant identity cannot be injected into a manual request.

## DELTA-04 threat matrix

| Attempt | Certified result |
|---|---|
| Content script, foreign extension page, spoofed sender or missing consent | Rejected by the existing trusted-worker dispatch boundary. |
| Inject owner/generation, reuse foreign/stale session, or convert a Grant id to manual identity | Strict validation/owner/generation checks reject. Worker restart and expiry remain fail-closed. |
| Use a stale bind/share race to publish an older package after a new bind | Prevented by one serialized ContextPackage boundary shared by bind and final output. |
| Report a pre-removal material count after final revalidation | Prevented; package metadata now uses the exact emitted item count. |
| Source purge succeeds while an old preview remains temporarily releasable | Prevented; `PURGE_SOURCE` broadcasts invalidation before the success response returns. |
| Delayed read, policy response, language rerender or archive refresh repaints old output | Prevented by Material Tray epoch/revalidation fencing and stale-output removal. |
| Redaction, local edit or material removal disappears on rebuild | Existing explicit preview state is retained; final output still revalidates canonical evidence. |
| Source/Input removal or tombstone followed by Backup restore | Deletion wins. Evidence-incomplete derived state cannot be restored into a valid output. |

Manual local selection may include otherwise default-ungranted local material because the user explicitly selected it. It does not override explicit deny/never/inherited restrictions and it does not grant external access.

## DELTA-05 connection / network matrix

The Recovery-1 distinction is explicit:

- `externalAccess=false` means **no external/connection access**.
- Missing legacy `externalAccess` also migrates fail-closed to **false**.
- Local-only continues to block provider/connection access.
- Explicit local manual copy or Markdown export is **not** a connection and therefore remains available when its selected material is otherwise valid.
- Grant-bound output requires `externalAccess=true` and rechecks that state after reconstruction and immediately before release.
- Existing Passport purpose, consumer, Profile, expiry, revocation and once-use semantics remain independent of manual output.

The Round 4.8 Passport browser journey now explicitly opts into external access before exercising revoke/once-use behavior. This ensures the certification reaches the intended Grant boundary instead of being short-circuited by the new safe default.

Real-worker certification concurrently exercises once-use and revocation. The current browser suite passed the real Grant once/revoke/manual-identity fences with no weakening of the existing Passport contract.

No new provider endpoint, manifest permission, host permission or required dependency was added.

## Backup and deletion safety

Ordinary Backup must not become a resurrection path for AI-derived state whose evidence is no longer safely restorable.

Recovery-1 therefore requires AI presentation Backup rows to have:

- a valid Topic;
- non-empty evidence entry ids;
- stored-presentation validity against those entries;
- every referenced entry itself safely exportable/restorable.

Export drops derived presentation cache that does not meet this closure. Restore rejects evidence-incomplete AI presentation state. This fence does not blindly delete human-authored work or independent human text merely because generated state is stale.

Source purge remains dominant over derived evidence, context output and restored derived presentation state.

## Startup / mutation-notification safety

Archive startup no longer blocks its primary `GET_PAGE` rendering path on onboarding reads. This closes the Continue-card timing failure without weakening onboarding consent semantics.

Idempotent duplicate capture no longer publishes a false archive mutation solely to trigger repaint. Real capture additions and real metadata enrichment still publish mutations. Source purge is the deliberate exception: its invalidation notification is awaited before success is returned, because deletion safety requires fail-closed ordering.

## Certified evidence

PAIA Certification #205 passed every required current-release job and the aggregate Certification gate.

- Unit: **884/884 PASS**
- Browser E2E: **23/23 PASS**
- Adapter contract: **95/95 PASS**
- Privacy/security: **52/52 PASS**
- Package guard: **8,258 / 188 PASS**
- Development privacy/permission/network audit: **PASS**
- Full Suite: **1,054/1,054 PASS**, zero fail/skipped
- Release build: **7,830 / 181 / 205 PASS**
- macOS Secure Store Certification: **PASS**
- Aggregate Certification gate: **PASS**

R4 browser evidence specifically covers exact local output, Source purge, once-use/revoke, Local-only/connection separation, worker expiry, responsive/IME/keyboard states and F-LARGE behavior. Recovery regressions also cover the overlapping startup/read path and purge-before-success invalidation.

## Limits

Test data, credentials and browser profiles are synthetic and isolated. Certification proves current-source behavior in the repository’s controlled CI/browser environment; it does not claim live-provider success, operating-system clipboard DRM, real-user retention or physical-device UX beyond the separately scoped macOS secure-store gate.

Within those limits, DELTA-04 and DELTA-05 have no unresolved blocker after Recovery-1 certification.
