# v0.7.2c — Thought Library AI Experience MVP

2026-09-08. User-authorized 55-minute implementation based on frozen, user-verified `97b2723 / checkpoint-v0.7.2b-original-organizer-complete`. Current runtime: `0.7.2.20`, label `v0.7.2c Thought Library AI Experience internal`. Final tag: `checkpoint-v0.7.2c-ai-organizer-mvp`.

## Product behavior

Thought Library defaults to 我的思想库. User-facing 原话整理 tabs/names are removed; internal Original identifiers and the stable runner remain. Topic blocks use a responsive 3/2/1-column grid, original wording hints and weak counts/time. Search results and Entries remain reading rows, not Entry cards. Topic IDs, name, pin, organization and Source/Input/Entry data are shared and unchanged by AI presentation updates.

AI整理 is a display switch. Toggle, cached presentation reads, status polling, rerender, startup and worker restart cause zero provider calls. Unprocessed Topics remain visible as 尚未AI整理. Cached results appear immediately; stale Topics display a pending hint. Only the explicit 更新 AI整理 action can call DeepSeek, once per click and one affected Topic per action. Additional Topics or chunks wait for another explicit click.

The AI Topic view is continuous text: blockSummary, currentView, keyInformation, preferences, decisions, judgments, openQuestions and possibleEvolution. Every generated statement has validated evidenceEntryIds. Evidence opens the existing source-faithful Entry, whose existing provenance UI opens Input Archive evidence. Turning AI off restores the same original document and existing autosave/Undo/revision workflow.

AI text fields and existing list items are directly editable with autosave and revision CAS. The whole edited field becomes protected; subsequent model results update only unprotected fields. AI presentation writes cannot write Source, Input, Thought bodies, Topic/Section organization, suppression or History Completion stores.

## Minimal derived storage and incremental contract

No IndexedDB version/store/index change. Presentations are bounded per-Topic derived rows under `meta/aiPresentation:<topicId>`; they reference existing Entries. The existing `aiOrganizerCheckpoint` gains per-Topic Entry/Input revision snapshots. Global Delta Planner computes added/changed/removed Input counts; per-Topic snapshots preserve pending work for shared evidence and Topics not yet processed. `originalOrganizerCheckpoint` and Original Runner logic are unchanged.

Local projection rechecks active placements, active/readable Entries, dependencies AND provenance, Input eligibility, Smart Filter and source tombstones. Checking provenance remains necessary after removal cleanup deletes dependencies. Removed, filtered, purged and unrelated content cannot be sent or used as valid output evidence. Cached presentations with unavailable evidence are hidden and not sent; user-protected fields are retained rather than overwritten.

Each request contains up to eight changed/new Entry texts from one Topic, bounded delta ID/count metadata, and an optional compact existing AI presentation. A removal-only update may use at most two remaining Entries as context. An empty Topic is acknowledged locally with zero requests. Larger Topics require repeated explicit bounded updates; processed Entry versions alone are advanced. Removal snapshots are acknowledged so removed delta does not remain permanently pending.

The existing DeepSeek transport is reused unchanged: native trusted service worker fetch, exact api.deepseek.com host/CSP, credentials=omit, redirect=error, deepseek-v4-flash, thinking disabled, JSON object output, stream=false, max_tokens=2048. The new AI contract is pure validation; the adapter receives no store/repository. Original classification/span/transport behavior is not reimplemented.

## Cost and transaction safety

A durable AI action/request ledger and single-flight check precede budget reservation and fetch. A duplicate action ID cannot send twice. Runtime integration serializes AI and Original actions; AI also checks the Original durable in-flight pointer. Session/daily budget and trusted session credentials are reused. No automatic retry or next-Topic continuation exists. Clearing the key aborts both profiles. An interrupted prepared/sent operation is conservatively OUTCOME_UNKNOWN and cannot be resumed automatically; late results cannot commit.

The provider has the established 30-second absolute deadline. AI UI has an independent 35-second deadline. Errors remain safe codes with natural text and an explicit paid-retry warning. Body, prompt, response and key are absent from logs, traces and receipts. Traces contain action/request/batch IDs, counts, sizes, phase/timestamps, HTTP status and safe errors only.

Successful commit atomically writes presentation, protected-field merge, per-Topic checkpoint, operation receipt, settled budget usage and terminal request state. It validates source/Entry versions, organization generation, consent epoch, existing presentation revision and current evidence eligibility. Failure rolls all these writes back and retains the previous presentation/checkpoint. No partial AI result replaces a previous result.

## Final acceptance

**112/112 targeted/directly affected tests passed: 107 Node + 5 isolated Chrome, 0 failed / cancelled / skipped.** No full historical regression or extreme-scale run.

Node coverage includes 23 new AI tests: three Topics with only A/C pending, one target per click, no unrelated data, selected/cached evidence validation, removed Input after dependency cleanup, cached reads, protected edits, old-result preservation, atomic rollback, preparation write failure, missing key, budget failure, in-flight cross-profile gate, status/JSON/network/timeout failures, worker restart, explicit retry, cancellation and 15-Entry bounded chunks. Existing Original, provider, dual checkpoint and M2 editor tests cover directly affected integration.

Five isolated Chrome tests use a disposable synthetic profile and native service-worker fetch with intercepted synthetic HTTPS responses. They verify 3/2-column grid, source hints, switch without API, same Topic IDs, cached AI reading, autosave protection, evidence dialogue, switching back to original content, stale indicators, 429/error/retry warning and worker restart. Existing Original 20-Input/four-batch native flow and interruption tests still pass. The Original document test now waits for visible Entry prose rather than hidden index hints.

**4139 static package guardrails across 100 runtime resources passed.** Synthetic screenshots: `outputs/v072c-chrome/01-grid.png`, `02-ai-reading.png`, `03-ai-failure.png`. Machine-readable acceptance: `outputs/v072c-acceptance.json`.

Build command: `python3 scripts/build_ai_experience.py OUTPUT_DIRECTORY`. The existing allowlist/internal self-reload workflow is reused; internal/release-structure ZIPs are CRC-checked and byte-compared with unpacked files. Runtime files are compared with checkpoint source except intended manifest/label/reload transforms. Release-structure excludes self-reload and test fixtures, but remains an internal credential/diagnostic prototype, not a public commercial release.

Deploy only to the explicitly authorized fixed daily unpacked output directory. Preserve manifest identity, existing permissions/CSP and browser-owned IndexedDB. The artifact report records source commit and file/ZIP hashes. No daily browser profile or real database is read externally.

## Non-blocking MVP limits

- No personal API key or paid AI request was used during implementation. Real AI synthesis quality is still a user smoke check; the Original baseline is user-confirmed real, not re-claimed as a new real test here.
- Each large Topic uses explicit eight-Entry chunks. A cached presentation larger than the compact context allowance is not sent; very large Entry text or output can hit the existing budget and fail safely. No one-shot full-library request occurs.
- List-item text editing is supported; adding/removing AI list items and a separate AI revision/history UI are deferred. Field protection is retained conservatively.
- Evidence checks establish valid authorized references, not the semantic truth of a model claim. Uncertain statements remain model-generated presentation; original wording is always available.
- Default view resets to the source-faithful library when the archive page reloads; the switch itself is not a persisted network/enable setting. Local planning scans metadata at normal scale; no extreme-scale performance claim.

Next user action: Reload once; save Key if the extension reload cleared it; open Thought Library, enable the AI display switch, then explicitly click 更新 AI整理 once. The switch alone is free and never invokes the API.
