# CPV1-10.1 local MyWrite draft boundary

Status: CANDIDATE / DEFAULT_OFF / NOT_ACTIVATED / NOT_CERTIFIED.

## Local-first shared capability

`core/mywrite-draft.js` provides a detached one-store IndexedDB journal. No mobile account, app architecture, sync transport, microphone, processor, domain dispatcher or Source/Input store is activated. The current extension is the hosted capability-validation harness only; Chrome evidence is not iPhone/iPad evidence.

A draft contains stable local identity, optimistic revision, actual first acknowledged-save creation time, last update time, complete text, optional Topic and last operation/base revision. External commands cannot supply timestamps, author or Source identity. Its text is human work awaiting explicit review, not historical sent Source truth.

Every save acknowledges only transaction completion with strict durability. Complete identical last-operation retries are idempotent; a changed operation or stale revision returns a fixed conflict and never replaces current work. No automatic TTL, draft eviction, truncation, network/model call or hidden AI normalization exists. The existing200000 UTF-16-unit single-message ceiling rejects the complete oversized input; it does not shorten it. Quota/unavailable errors leave prior committed work intact; caller retains any still-unsaved current editor text.

Explicit deletion atomically replaces body and Topic with null and leaves an empty revision tombstone. Old clients cannot reuse the same identity to restore deleted work. Deleting historical canonical Source or choosing permanent-delete policy is outside this draft API.

Explicit review reads one expected current revision and returns the complete ephemeral human/MyWrite snapshot. It does not commit Source/Input, invent source time or route Topic through PAIA semantics. A future manual-intake adapter must revalidate that revision at commit and obtain explicit user review; this snapshot is not an external write capability.

## Evidence and remaining dependencies

The new14 owning unit cases use actual vendored IndexedDB transactions, full1000-paragraph Unicode/negation bodies and40unrelated full drafts. The owning Prompt Chrome file retains all9 original complete cases and adds one actual two-page/current-worker/reload IndexedDB journey. Exact new-head runtime/CI evidence is PENDING; grammar parsing only is PASS before publication.

This is a shared local storage capability, not completed M1, mobile UI, device startup/latency, offline/background/OS-kill, local-storage eviction recovery, voice/transcription, Sync/Backup, permission or product certification. Those canonical VS10 tasks remain OPEN; unavailable real-device/private/external evidence is deferred only on its dependent path. No new client architecture/product-direction decision is made by this module.

VS07 EXPERIMENTAL/DEFAULT_OFF/NON-BLOCKING; VS04 lexical/fuzzy/filter is v1 search; Semantic Lab exclusively Input→Topic.

## Detached complete local composer candidate

ui/mywrite-composer.js is a reusable inactive UI over this store, with native complete editor/optional labeled Topic, trusted pointer/keyboard explicit save, complete readonly review and immutable saved creation time. No product entrypoint/mobile client/Source promotion/account/voice/sync/permission is activated. No timer/poll or automatic save is added. Pending typing, quota abort, exact committed lost-ack retry, multi-window conflict, explicit fresh-identity preservation and typed-before-read recovery retain all full bodies; no conflicting baseline is automatically overwritten. Disposal removes every owned listener and private DOM/reference; late reviews cannot revive it. Metadata-only getDraftReference returns the last acknowledged local id/revision or null, never Source authority.

Parenta9e12f11 actual1290unit/162adapter-privacy/release PASS but owning10Chrome has9PASS/1readinessFAIL; immutable LOCAL-DRAFT-ENGINEERING-EVIDENCE receipt preserves it. Correct the three-source-identity readiness without changing source dedupe or discarding a message. Add the full eleventh real Chrome UI/fault/recovery journey. Exact new-head full11browser/unit/contracts/release/aggregate CI PENDING. M1/real device/canonical manual-intake/phone architecture/voice/sync remain OPEN or dependent-deferred.
