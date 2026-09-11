# PAIA v0.11.1 — Real-data cold-reload forensic

Status: **Round 1 characterization only. No repair, schema change, Organizer run, private-database read, or runtime deployment is authorized by this document.**

This note follows a post-acceptance field report in which a long-lived PAIA installation could reload into a Thought Library state where previously visible Topics were no longer shown and the UI reported that the Library could not be refreshed. The original v0.11.1 acceptance suite used isolated synthetic profiles and did not inspect a private long-lived database. The goal of this round is therefore to identify current-code failure classes and add reproducible synthetic legacy fixtures without guessing what happened to the real database.

## Safety boundary

- Do not clear or rebuild IndexedDB.
- Do not recreate Topics from visible Inputs.
- Do not run Original Organizer or AI Organizer as a repair mechanism.
- Do not change Topic/Entry/Source identity, tombstones, `user_removed`, provenance, or user edits.
- Do not introduce a physical schema migration in this round.
- Do not deploy this characterization round to the user's daily Chrome runtime.
- Any later repair must preserve the same unpacked extension identity and Chrome-managed database.

## Current cold-read path

The current Thought Library Home performs these operations in order:

1. `ThoughtWorkspace.refreshOnce()` → `readRefresh()`.
2. `readRefresh()` calls `updateViewStatus()` **before** the Home Topic list.
3. `updateViewStatus()` awaits `GET_AI_PRESENTATION_STATUS`, `GET_ORIGINAL_ORGANIZER_STATUS`, `GET_ORGANIZER_CONTROLS`, `GET_BOUNDED_ORGANIZER`, and `GET_DEEPSEEK_STATUS` together.
4. Only after those status calls succeed does Home request `LIBRARY_INDEX_PAGE`.
5. `LIBRARY_INDEX_PAGE` uses `LibraryDocumentsStore.libraryIndexPage()` and the `topics.byIndex` compound IndexedDB index.
6. `GET_LIBRARY_UNPLACED` is a separate path and is requested after the normal Home list.

A warm refresh can retain already-rendered DOM/snapshot state. A full document reload cannot rely on that in-memory state, so the existing message “当前内容保留” is not universally true on a cold start.

## Proven current-code failure classes

### C — durable Topic exists but is invisible through `topics.byIndex`

`topics.byIndex` is a compound key over:

`[activeKey, pinKey, pinRank, negativeUpdatedSequence, id]`

IndexedDB does not create a compound-index entry when one required key component is not a valid IndexedDB key. Therefore a Topic row can remain present in the durable `topics` object store while disappearing from the Home listing if legacy/partial metadata loses an indexed component such as `negativeUpdatedSequence`.

`tests/reading-cold-legacy-v0111.test.mjs` characterizes this explicitly: it creates a valid current-shaped Topic, removes only `negativeUpdatedSequence` in a synthetic database, verifies the object-store row still exists, verifies the Topic is absent from `byIndex`, reopens a fresh store against the same database, and verifies the cold Home listing still omits that durable Topic.

This is a **visibility failure**, not evidence of durable deletion.

### B — durable/index-visible Topic can still be unreadable with incomplete layout metadata

`activeLayoutGeneration` is not part of `topics.byIndex`, so a Topic missing that field can remain visible in the Home index. However Topic reading and AI presentation status build compound prefix ranges using `topic.activeLayoutGeneration`.

A missing generation therefore produces an invalid IndexedDB range key. The repository maps this to `STORAGE_FAILED` with `dbCategory=invalid_key_or_index_value`.

The same characterization test removes only `activeLayoutGeneration`, cold-reopens the store, verifies the Topic is still index-visible, then verifies both:

- `topicDocumentPage()` rejects on the invalid indexed key; and
- local `aiPresentationStatus()` rejects on the same malformed read shape.

This proves a **migration/read-shape compatibility failure class** without claiming that the real database has this exact missing field.

### E — nonessential status failure can prevent the core Home Topic read

Because `updateViewStatus()` runs before `LIBRARY_INDEX_PAGE`, a local AI/Organizer status failure can abort `readRefresh()` before the core Topic list is requested. The malformed `activeLayoutGeneration` fixture above demonstrates that `aiPresentationStatus()` can fail locally from Topic read shape alone, with zero Provider/network involvement.

This coupling can amplify one malformed Topic/read-metadata problem into a whole-Home refresh failure.

## What is not proven

Round 1 does **not** establish any of the following about the user's real database:

- that durable Topic rows were deleted or mutated;
- that `negativeUpdatedSequence` is actually missing;
- that `activeLayoutGeneration` is actually missing;
- that the v0.11.1 migration wrote malformed Topic rows;
- that render-generation races are the field incident's root cause;
- that every Topic is affected by the same condition.

The original documented migration paths populate the current Topic index fields, so “all old Topics simply lacked the new fields” is not supported. The realistic concern is a long-lived/partial/legacy row shape, a read-time compatibility gap, or another durable-vs-index discrepancy that the synthetic acceptance matrix did not model.

## Incident classification after Round 1

| Class | Meaning | Round 1 status |
| --- | --- | --- |
| A | durable mutation/deletion | **not evidenced** |
| B | migration/read-shape incompatibility | **synthetically reproduced failure class** |
| C | selector/index visibility mismatch | **synthetically reproduced failure class** |
| D | render/invalidation race | **not reproduced here; v0.11.1 had separate synthetic coverage** |
| E | status/preflight coupling hides core read | **structurally reproduced as an amplifier** |

Best current classification: **B/C family is strongly supported as the next forensic target; the exact real-data trigger remains unconfirmed.**

## Coverage gap in the original v0.11.1 acceptance

The v0.11.1 suite covered current-shaped synthetic databases, idle stability, invalidation, generation guards, migration cases, and headless Chrome journeys. It did not include a cold reopen of a long-lived database containing a Topic that is durably present but structurally incomplete for the current compound-index/read contract.

The new test is deliberately a characterization test: current code is expected to demonstrate these failure classes. It does not silently “repair” the malformed rows and it does not encode a destructive migration as the expected solution.

## Round 2 minimum repair contract

Round 2 should start from this evidence and remain minimal:

1. **Core reading must not depend on optional status reads.** Home should be able to render durable readable Topics even if AI/Organizer status fails; status errors should degrade only the affected controls.
2. **Add explicit compatibility handling for structurally incomplete Topic rows.** The repair must preserve Topic id, membership, user organization, revisions, provenance, Source/Input semantics and tombstones. Do not rebuild Topics from Inputs.
3. **Detect durable-vs-index discrepancies safely.** Prefer a bounded/startup compatibility check or migration with deterministic defaults over silently trusting `byIndex` as proof that no Topic exists.
4. **Make cold-start error language truthful.** Only claim current content is retained when a retained snapshot/DOM actually exists.
5. **Promote realistic legacy cold reopen to a release gate.** The fixture added in Round 1 should become a repair regression in Round 2, alongside current-shaped cold reopen and existing v0.11.1 stability tests.
6. **Before any real-data repair, use aggregate/read-only diagnostics.** Diagnose structural counts/status without exporting Topic names, Entry bodies, Source text, URLs, credentials, or private identifiers.

## Round 1 test entry

`tests/reading-cold-legacy-v0111.test.mjs`

The repository test runner auto-discovers `tests/*.test.mjs`; this file is therefore part of the unit group on the next full `npm test` run.

No claim is made here that GitHub itself executed the Node/Playwright suite. This round was authored through the GitHub connector; execution evidence must come from a development clone or CI/runtime capable of running the repository test commands.
