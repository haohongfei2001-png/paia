# Prompt material read reuse — local mechanism candidate

## Scope

This candidate addresses the owner's report that opening the floating board waits
before its contents appear. It changes only the original local Prompt snapshot
and its shared material-rule implementation. It adds no cache, retained iframe,
provider call, permission, schema, preference or display change.

`materialInputRules` is the original Input/Entry/Topic/Section denial logic moved
without changing its decisions. The fixed `readPromptReuseMaterial` path performs
the original Input projection once inside the same readonly page transaction,
checks every Source's eligibility, role and conversation facts, and applies those
same material rules. It retains closed reference/revision validation and the
nonempty-body requirement. Unused document title/time metadata is no longer read
for this projection.

Only the original material-stage MEMORY_DENIED/MEMORY_UNAVAILABLE refusals skip
that Input. Projection, Filter and Source-stage errors still reject the whole
query. The original complete Input pagination, preference validation, Family
projection, generation fences, current-target checks and insertion owners remain.
No caller supplies a previously qualified body or projection.

## Measured mechanism and preserved failures

The real local Store/Repository test counts native fake-IDB object-store gets.
For one Source/Input, the old path reads records and recordIndex four times each;
this candidate reads each twice. Input/block and tombstone repeat reads also fall
from two/two/four to one/one/two. The original metadata reads remain 24. This is
an I/O count result, not a measured browser speedup.

The original 26-control run passes 25 and fails only the new two-read target
because it actually performs four reads. Both real ArchiveError pre-material
refusal controls pass on the original and candidate. An intermediate broad-catch
implementation failed those two controls; its failure evidence is preserved.

The candidate's current owner/material/Prompt compatibility group passes all 138
tests, with no skipped or cancelled tests. The larger exploratory group is
148/151. Its three failures are in the repository's already archived experimental
semantic-material-snapshot test: repeated capture changes the original
local-control-publication revision. Restoring both original runtime files in the
same dependency tree reproduces the same three failures (10/13). These failures
are retained, not called a full compatibility pass or silently excluded from the
exploratory result. No existing test or classification changes.

Controls preserve blank/invalid revisions, original-text fallback, all Source
role vetoes, tombstones/removal, multiple Sources and conversation consistency,
Input and derived Entry/Topic/Section exclusions, active placement generation,
Filter/Keep, manual order, complete Family identities/text and final generation
rejection. Shared material readers retain their original API and rules.

## Separate native diagnostic

The original, unoptimized Prompt baseline was measured in authorized public CI
at head 1eaad3b842dbde0419fbb720d595b0b45862e45a, run 39213242260,
job 117931134551. It remains INCOMPLETE: 21 of 22 samples and one Direct trace
were recorded before the Family fixture timed out. The six recreated-frame
samples at 0/100/500 synthetic Inputs averaged 138.4/472.95/1571.93 ms from click
to first list DOM content; at 500 Inputs, the full scan averaged 1400.57 ms.
These partial Linux headless CI observations support investigating the original
full-read path. They do not qualify the whole measurement matrix, the user's Mac,
physical paint, or this candidate's improvement. The original failed run remains.

Changed-head native measurements, applicable Source/release browser checks,
independent review, original integration gates and merged-main verification are
still required. There is no measured optimization percentage or user-visible
performance promise in this source-only candidate.
