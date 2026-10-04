# Prompt Reuse foundation — CPV1-09.0–09.2

Owner-authorized parallel branch, based on freshly fetched remote main
`feea729e2fc19e69d5b842a7ca00305f31cda0cc` (2026-10-04).
No 09.3 overlay, Desktop/D7 visual changes, reply reading or Provider integration.

## Persistence decision (before implementation)

1. Family membership, frequency, ranking and representative bodies are derived
   from current eligible Working Inputs. They are never stored as another archive.
2. Only explicit template edits, pin order, hide and split corrections require
   durability. Successful reuse stores a bounded count, never draft text.
3. One versioned `prompt-reuse:v1` row uses the existing `meta` transaction owner.
   Edited template text is independent user work explicitly authorized by the
   Prompt Reuse contract §5.7; it never becomes Source/Working Input truth.
4. Unedited representatives are re-read under existing removal/filter/tombstone
   gates. No historical body is cached in the preference row. Edited templates
   may survive loss of source support by the approved prompt-specific rule.
   Backup includes strictly validated preferences through `organizationState`.
   Restore grants no site capability and re-derives every automatic family.
5. Missing row means empty preferences; no DB version, object store, canonical
   entity migration or destructive conversion. Older backups need no conversion.
   Older runtimes reject the unknown portable row rather than silently dropping
   edited work. Atomic existing Backup staging/activation remains the owner.
6. This small preference extension is justified by owner-approved durable edits
   and order. It is bounded to 500 overrides, 2,000 split memberships and 4 MiB
   serialized UTF-8; exhaustion fails without eviction of user work.

These are new versioned preference fields and a Backup allowlist extension,
not an IndexedDB schema upgrade. No new grants, permissions or provider hosts.

## Frozen deterministic rules

NFC and CRLF normalization; only outer whitespace is ignored for plain prose.
Code/structured text retains whitespace and case. A narrow polite-prefix grammar
admits high-confidence near expressions. Negation, numbers, targets and constraints
are never dropped. Stable payload extraction accepts only an explicit known
instruction line followed by a newline and a long payload. Unknown structure is
kept whole. No edit-distance/transitive semantic clustering or model is used.

Distinct conversation frequency is primary; same-conversation repeats add at
most 0.2, recency has a 180-day half-life with a 0.75 floor, and confirmed reuse
adds at most 0.1. Pinned order is a separate first sort key. A list session keeps
its opening order until reopen/refresh; release revalidates current eligibility
and exact selected text. All evaluation text is synthetic.

## Evidence

CPV1-09.0 and 09.1 engineering is implemented; 09.2 has source/release native
Chrome evidence against an offline ProseMirror fixture. Synthetic browser evidence
cannot close current ChatGPT compatibility. CPV1-09.3 remains outside this branch.

## Responsibility and trust boundaries

- `core/prompt-family.js`: deterministic grouping/ranking and open-list snapshots.
- `core/prompt-reuse-service.js`: current Working Input projection using existing
  Input and explicit material-exclusion gates; no Source/Working Input writes.
- `core/prompt-reuse-preferences.js`: strict, bounded versioned `meta` preferences.
- `background/prompt-reuse-commands.js`: exact trusted caller and consent checks,
  current selected-text revalidation and once-only tab/frame dispatch. The worker
  has only a dispatch hook; Prompt commands never wake Provider/organizer work.
- `adapter/chatgpt-composer.js`: exact ChatGPT ProseMirror selector, transient
  caret/selection/composition state, native `insertText`, trusted input event and
  delayed full-text/caret/focus read-back. Pending/results are retained for 500
  operations per page/worker lifetime; exhaustion fails closed, never evicts and
  retries an unknown operation. A replay does not increment reuse again.
- `content/prompt-reuse.js`: isolated-world, extension-message-only receiver.
  No window messages, page DOM list, website storage, reply access or full library.
- `ui/prompt-reuse-test.html`: unlinked extension-owned engineering entry only.
  Open/refresh freezes order; revalidation can remove stale/unavailable entries
  but does not apply automatic reordering. Each selection inserts once; re-arm is
  explicit. Copy is a separate click and revalidates before browser writeText.
  This is deliberately not CPV1-09.3 or its final management UI.

The adapter intentionally refuses other editors, multiple matching composers,
noneditable embedded atoms, active composition and unsupported DOM. Native
editing may already have happened when acknowledgement is uncertain; PAIA leaves
that current draft alone, reports uncertainty and does not roll back/retry.

## Backup and compatibility detail

Existing atomic restore owns the new portable preference row. Empty-only restore
refuses a target with independent Prompt work, even if its Archive is empty.
Disjoint merge refuses different local/backup Prompt preference rows; it does not
silently discard either version. Explicit replace uses the existing confirmation
and generation fence. Missing row in an old backup is still supported. Restore
and ordinary queries grant no Provider/site permission. Edited independent
Prompt text survives support loss only under the specific approved §5.7 rule.

No D7 visual owner changed. Shared plumbing changes are limited to worker routing,
manifest script registration (same hosts/permissions), Backup validation and
package guard exceptions for the one audited native insertText/write-only copy.
The existing D5 frozen 68-file evidence manifest remains unchanged: its owning
test now verifies those same 68 placements plus the one new VS09 browser owner.

## Negative evidence retained

- Local sandbox blocked headless Chrome launch; no visible browser was opened.
- Actions `37200978274`: new runtime/family tests passed; frozen D5 68-file equality
  rejected the added browser file. Fixed additively while preserving all 68 files,
  shard positions, assertions and original job budgets.
- Actions `37201457221`: Playwright headless shell lacked Extensions.loadUnpacked.
  Switched this isolated workflow to the repository's existing full hosted Chrome.
- The same run's one CURRENT_LIVE attempt returned HTTP 403. Artifact
  `11302937092` is NOT_VERIFIED, not insertion compatibility evidence.

- Actions `37201606298`: native Chrome source/release, full unit and 102 adapter
  contracts passed. Privacy scan rejected the new explicit clipboard helper.
  Added an exact single-helper exception; clipboard reads remain forbidden.

Final candidate receipts are recorded below after validation. Full historical
browser/device/visual certification, merged-main evidence and real ChatGPT
compatibility are not claimed by this first-stage PR.
