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

Implementation and evidence pending. Synthetic browser evidence cannot close
current ChatGPT compatibility. CPV1-09.3 remains outside this branch.
