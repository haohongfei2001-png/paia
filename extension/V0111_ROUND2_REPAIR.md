# PAIA v0.11.1 — Thought Library cold-reload P0 Round 2

Status: **repair candidate on a review branch; not merged and not deployed to the daily Chrome runtime.**

Baseline: `89341088497238360550fa17fc3e2dc680e7a950` on `main`.
Branch: `p0/thought-library-cold-reload-round2`.
Draft PR: `#1`.

This round starts from the failure classes characterized in `V0111_REAL_DATA_FORENSIC.md`. It repairs the reproduced B/C compatibility classes and prevents the known unresolved-Topic shape from aborting AI presentation status. It does **not** claim that these synthetic shapes are proven to be the exact shape of the user's private long-lived database.

## Safety boundary

Round 2 deliberately does not:

- inspect, export, clear, rebuild, or otherwise touch the user's private IndexedDB;
- recreate Topics from Input Archive;
- run Original Organizer or AI Organizer as a repair mechanism;
- change Topic IDs, Entry IDs, membership intent, revisions, provenance, Source facts, Input text, tombstones, or `user_removed` semantics;
- change the physical IndexedDB schema version;
- uninstall/reinstall the extension or change its identity;
- deploy the branch to the user's daily unpacked extension directory.

Ambiguous layout metadata fails closed. The repair never chooses an active layout generation merely because an older generation exists.

## Repair 1 — recover durable Topics omitted by `topics.byIndex`

`topics.byIndex` depends on the compound key:

`[activeKey, pinKey, pinRank, negativeUpdatedSequence, id]`

Round 1 proved that a Topic can remain in the durable `topics` object store while disappearing from this index when a required key component is missing or invalid.

Round 2 adds `core/topic-compatibility.js` and a one-time, resumable compatibility pass before Library document reads. The pass scans the raw `topics` object store rather than trusting `byIndex`, and repairs only deterministic index metadata:

- `activeKey` from Topic lifecycle/redirect state;
- missing/invalid `pinKey` to the conservative unpinned state;
- missing/invalid `pinRank` to the deterministic midpoint rank;
- missing/invalid `negativeUpdatedSequence` from an existing valid `updatedSequence`, otherwise `0`;
- missing `nameKey` from the existing Topic name.

The pass does not rename, merge, recreate, or delete a Topic. It does not alter Topic revision or organization revision for this compatibility metadata repair.

## Repair 2 — recover layout generation only when durable structure proves it

A missing `activeLayoutGeneration` previously allowed a Topic to remain index-visible while Topic-document and AI-status reads attempted an invalid IndexedDB compound range.

Round 2 infers a generation only when an active Section already proves that generation:

1. preserve an already valid `activeLayoutGeneration`;
2. if `layoutSequence` is valid, use it only when a matching active Section exists;
3. use legacy generation `1` only when generation `1` has a matching active Section and there is no contradictory later `layoutSequence`;
4. if the structure is ambiguous, leave the Topic unresolved rather than pointing it at stale generation-1 content.

A proven later generation therefore wins over stale earlier rows. An unproven later generation remains unresolved.

## Repair 3 — keep unresolved Topics visible without refresh polling

For a Topic whose layout generation cannot be established safely, Home still needs to distinguish “durable Topic exists” from “Topic deleted.”

`topicCount()` now uses a rare compatibility fallback for only that unresolved case: it scans placements, deduplicates Entry IDs, and counts currently active Entries. The result is marked approximate and complete so the existing Home UI does not enter its one-second count-refresh loop.

Opening the unresolved Topic document itself still fails closed with `INVALID_REQUEST`; the repair does not invent an organization layout.

## Repair 4 — optional AI status cannot take the known malformed Topic path down

AI Presentation status is optional to core Thought Library reading. Round 1 showed that a malformed Topic generation could throw while the Home page was still in its status preflight.

Round 2 now:

- validates Topic generation before building AI presentation range keys;
- skips unresolved-generation Topics in passive AI presentation snapshots/migration reads;
- reports aggregate `degraded: { reason: "topic_compatibility_unresolved", unresolvedLayouts }` on AI status while continuing to return status for valid Topics;
- does not make unresolved Topic content eligible for an AI request.

This removes the reproduced malformed-generation failure from the AI-status preflight path without swallowing unrelated storage failures.

## Aggregate-only diagnostics

The compatibility pass persists only aggregate structural counters:

- active Topic count;
- active Topics visible through the index;
- index gap;
- repaired Topic/index/generation/default-section counts;
- unresolved layout count;
- completion time.

`GET_LIBRARY_FOUNDATION_STATUS` can surface these aggregate counts through `libraryStatus().compatibility`. No Topic names, Entry bodies, Source text, URLs, credentials, or private identifiers are added to this diagnostic surface.

## Cold-reload regression gate

`tests/reading-cold-legacy-v0111.test.mjs` now contains five repair regressions:

1. current-shaped Topic survives a cold store reopen;
2. a durable Topic missing compound-index metadata becomes Home-visible again without changing identity, organization, Source, or Input;
3. missing generation `1` is recovered only when an active generation-1 Section proves it;
4. a proven later generation is preferred over stale generation-1 rows;
5. an unproven later generation stays unresolved but remains Home-visible, does not trigger count polling, exposes aggregate diagnostics, degrades AI status instead of aborting Home, and refuses to open an invented document layout.

## GitHub Actions evidence

A temporary branch-only workflow was used only to execute the repair candidate. It is not part of the intended final product change.

Authoritative run for the current repair code before documentation cleanup: GitHub Actions run `34564182641` at branch head `42583ff08d0269dce09cd1b6552f44113ec4977e`.

### Targeted P0 gate

`reading-cold-legacy-v0111.test.mjs`: **5/5 passed, 0 failed, 0 skipped**.

### Unit group

The repository unit group reported **691/694 passed, 3 failed, 0 skipped**. The three failures are not Round-2 functional failures:

1. `history-performance-v090.test.mjs` — the existing 10,000-input performance case exceeded its 180,000 ms test timeout on the hosted runner; the 1,000-input case passed.
2. `light-coverage.test.mjs` — its frozen-byte assertion invokes `git show 1e00c23:core/smart-filter.js`, but the GitHub remote history available to Actions does not contain object `1e00c23`.
3. `smart-filter-diagnostics.test.mjs` — its frozen-byte assertion invokes `git show f3fa0e7:adapter/input-presence.js`, but the GitHub remote history available to Actions does not contain object `f3fa0e7`.

The same run passed the directly relevant existing suites, including all 23 `ai-presentation-v072c` tests, all 7 `ai-product-v080` tests, all 46 `thought-m1` tests, all 21 `thought-m2` tests, and all 5 new cold-reload repair regressions.

Therefore this round does **not** claim a clean 694/694 unit run. The exact evidence is 691/694 plus a clean 5/5 targeted P0 gate.

## Remaining limitations before any real-data deployment

1. The generic Thought Workspace still awaits several optional status calls before the Home list in one `Promise.all`. Round 2 removes the reproduced unresolved-Topic failure from AI Presentation status, but an unrelated optional-status failure can still abort the generic preflight. Full architectural decoupling belongs in a bounded UI patch rather than a large connector-side rewrite of `ui/thoughts.js`.
2. Cold-start failure copy still says “当前内容保留” even when there is no retained cold-start DOM snapshot. This wording remains inaccurate and should be corrected in that same bounded UI patch.
3. An ambiguous Topic layout remains visible on Home but cannot be opened until its active generation is safely established. This is deliberate fail-closed behavior.
4. `migrateAIPresentations()` currently skips unresolved-generation Topics. If the global historical AI-productization migration marker were absent in such a database, follow-up work should ensure a skipped Topic is not permanently considered migrated after it later becomes resolvable.
5. The repair has not been executed against the user's real database. Aggregate/read-only real-data diagnostics should precede any deployment that could write compatibility metadata to the daily profile.

## Release decision

Do **not** merge or deploy Round 2 solely from the synthetic evidence above. The branch is a P0 repair candidate suitable for review and the next bounded validation step. The user's daily Chrome profile remains unchanged.
