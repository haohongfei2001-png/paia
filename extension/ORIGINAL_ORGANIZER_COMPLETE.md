# v0.7.2b Original Organizer Complete — internal acceptance

2026-09-08. Final user-authorized 85-minute closure. Supersedes earlier Original recovery, automatic-provider and connection-test plans. Runtime 0.7.2.19. Tag: `checkpoint-v0.7.2b-original-organizer-complete`.

## Final execution contract

Explicit user action → at most five eligible Inputs → deterministic batch ID → durable request ledger and single-flight → budget reservation → exact trusted-worker DeepSeek request → bounded response/typed item validation → local original slices → atomic Library/provenance/Topic/Section/receipt/item-status/checkpoint transaction. No legacy job claim or recovery is an execution prerequisite. Existing one-way legacy fence remains; schema and user stores are not rebuilt.

There is one paid completion maximum per user action, zero automatic retries, and no automatic next batch. Capture, startup, worker wake, status polling, rerender and credential save cannot dispatch Original requests. A new explicit retry uses a new action ID and warns that it calls DeepSeek again. An interrupted sent request becomes OUTCOME_UNKNOWN; the next worker does not resend it. Receipts prevent duplicate successful commits.

Original bodies come exclusively from the InputProjectionGateway-approved working text or its locally validated slices. Provider-generated body/summary fields cannot enter Original entries. Invalid items receive per-input manual_required terminal receipts; valid siblings commit atomically. Uncertain or unmatched Topic/Section references use a proposed or uncategorized location. Semantic merge is absent; exact duplicates consolidate evidence. User field protection, suppression, eligibility and CAS checks remain active.

The initial baseline advances only in the commit transaction. Each batch snapshots only the revisions it processed; edits during the initial build remain delta. Contiguous conversation batches cannot skip interleaved conversations. Note-only changes with the same body digest and removed/ineligible Input acknowledgements are local-only, revision-checked operations. AI view and aiOrganizerCheckpoint remain separate and have no generated output.

## Root causes reproduced and corrected

- Native MV3 fetch was stored on a Provider instance then called with the instance receiver. Isolated Chrome reproduced NETWORK_ERROR before headers; binding the native function to globalThis made the same native worker/request interception path complete. Earlier JS fetch fixtures did not exercise native receiver semantics.
- GET_ORIGINAL_ORGANIZER_STATUS emitted ARCHIVE_CHANGED and scheduled work, making a read→refresh feedback loop. Read-only status no longer broadcasts/schedules; interrupted reconciliation occurs at worker startup.
- Session accounting needs a trusted chrome.storage.session marker. New browser sessions rotate only session counters; worker restarts preserve them. Daily counters survive sessions and malformed daily counters fail closed. The existing runtimeRepairVersion=1 marker covers only Organizer budget rows, not user data.
- Preflight cancellation and body reading relied on cooperative fetch/Abort handling. A single absolute deadline now races the whole network operation, while body streaming has an enforced size cap and cancellation. UI has an independent 35-second deadline and always paints a specific failure even if background is unavailable.
- Final baseline previously snapshotted unprocessed current revisions; conversation grouping could jump over interleaved Inputs; removal delta repeated after acknowledgement; note-only edits caused avoidable paid requests. Targeted tests reproduce each and confirm the corrected checkpoint behavior.
- The previous safe IDB error categorizer obscured QuotaExceededError with TransactionInactiveError after abort. The transaction's quota error now retains priority, preserving History Completion rollback behavior.

No real daily IndexedDB/profile was read or repaired externally. The historical daily preparing failure itself cannot be certified from synthetic evidence; exact preparing write step / safe DB category remains visible, and failures still gate all paid requests.

## Test evidence

Final run: **274/274 passed, 0 failed, 0 cancelled, 0 skipped**. No full historical regression suite was run.

- 253 Node targeted/directly affected tests: credential/session, provider/network/phase failures, cost safety, ledger writes, bounded bootstrap, item/commit/checkpoints, Input Archive, Smart Filter, Thought editing/revisions, dual view, storage, History Completion import state/security/upgrade.
- 21 isolated Chrome tests: native trusted-worker HTTPS fetch routed to synthetic responses; credential save, four manual batches, visible Topic Document, 401/retry warning, 4/5 partial commit, Settings closure, worker replacement, body hang, handler throw/pending, dual view, M2 editing/polish, Smart Filter and source time.
- 4035/4035 offline package guardrails across 97 runtime resources; release-structure copy also audited. Build ZIPs are CRC-tested and every member is byte-compared with its unpacked file. Core/background/UI runtime files are compared to checkpoint source except intentional build label and internal reload transforms.

Representative Chinese fixture: 20 Inputs → 4 explicit batches → 19 Entries (one exact duplicate) / 20 provenance rows / multiple Topics and Sections. All resulting bodies are checked against original local spans; four batch receipts and twenty per-input receipts. A separate native Chrome fixture verifies the visible document and four actual intercepted HTTPS requests; no real provider service is contacted.

Synthetic screenshots: `outputs/v072b-complete-chrome/01-completed-settings.png`, `02-topic-document.png`, `03-provider-failure.png`, `04-partial-commit.png`. Aggregate machine-readable evidence: `outputs/v072b-complete-acceptance.json`.

## Privacy, network and package scope

Only `https://api.deepseek.com/*` host permission, exact connect-src origin. Worker context, manifest, CSP and granted permission checks run before request. Native fetch uses credentials=omit and redirect=error. Fixed model deepseek-v4-flash, JSON object response, thinking disabled, stream=false, max_tokens=2048. No /models, smoke endpoint, embedding or second pass on the Original user path.

Keys stay in trusted chrome.storage.session, not local, IDB, logs, receipts or Git; UI receives status only. Provider readiness failure cannot block capture. Trace retains only safe IDs/codes/counts/times/lengths; no private body, prompt, raw response, key, title, URL, source/message ID or content hash. Per-input commit receipts refer to internal Input IDs; body digests exist only in dependency/checkpoint processing metadata, never the request trace.

`python3 scripts/build_original_complete.py OUTPUT_DIRECTORY` packages the exact current checkout using the existing release allowlist. Internal includes the existing self-reload; release-structure excludes development reload and test assets. Release-structure remains an internal Provider/credential prototype with diagnostic Settings; this is not approval of a public commercial credential system. Artifact report records source commit and per-file SHA-256. Daily deployment changes only the fixed unpacked output files, preserving path/manifest identity and browser-owned IndexedDB.

## Known limitations and next real check

No personal credential was available to this task. Real paid DeepSeek success and the user's historical daily database remain a single user smoke check, not claimed as verified. Reload, save Key if needed, click Continue once. It must produce a committed result or a concrete phase/HTTP/error within the UI deadline; no generic unavailable state or automatic second request.

Very large Inputs can exceed the conservative request budget and fail before fetch. Session/daily figures are conservative reserved request quotas, not monetary billing measurements; dispatched/unknown attempts are not refunded. Manual_required items are terminal and identifiable in receipts; this MVP does not add a separate manual-resolution workflow. Batches remain explicit during internal testing, including incremental updates. AI synthesis is intentionally unavailable.
