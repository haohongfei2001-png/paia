# Original Library search constructors — limited extraction receipt

## Identity and scope

- Base: `1d8ebba5d99a4512db1625ecd3099cd665db68ab` (Human batch already frozen).
- Code: `8e1e048aa0c278ae3b6ac2549ae085d1f6701fad`.
- Runtime `core/library-search.js` SHA-256: `7ab8c4d5489fd52ff5ea433a8630f037940402fba638a139f5bc3e3126e27b24`.
- New owning test SHA-256: `cbab59e61cb1d55467caa2e527d7a5ed1cabc483a1283288ce50d53df6599852`.
- Only runtime change: three pure constructors extracted from the original writer and reused at the same call sites. No read/write/clock/UUID in the constructors; no second domain reducer.
- This is **code and local regression evidence**, pending independent review and integration. It is not indexed-tag portability, Human scope qualification, full Sync delivery, native-browser acceptance, or a user-visible change.

## Preserved interfaces and behavior

`planSearchQueueLocator(kind, row, version)` returns the original search task shape. Its optional default derives the existing `ownerVersion`; the existing writer passes its captured `version` explicitly. The writer captures that value before awaiting the owner put and constructs the locator after that await, preserving the original source-reference access timing. It retains queue ID, entity kind/status key, owner kind/ID, version, delete phase, offset zero, and original source-reference fallback.

`planSearchPostings(kind, row)` uses the original Entry `title/body/type`, Topic `name`, or Section `title` field insertion order. It uses the unchanged NFKC/lowercase tokenizer, regex, hash, per-field unique sorted token hashes, and active lifecycle condition. It does not assert that a kind, row, or sequence is admitted by Sync.

`planSearchPostingRow(task, posting, live)` returns the complete original posting row, with the original JSON ID, property order, owner identity, field/token, task version, tokenizer version, and live source references. It does not provide a provenance or completion proof.

The original asynchronous read/write loops, 20-owner page, 200 posting-mutation budget, current-task/version/phase/offset fences, Source eligibility, deletion order, completion tag, rebuild traversal, ranking, pagination, cleanup and generated-label locator remain unchanged. No query grammar, stores, indexes, Human journal/codec/plan, receiver behavior, CI, version, provider, permission, or public activation changed.

## Original byte oracle

`tests/fixtures/library-search-constructors-before/manifest.json` freezes the actual original Git module and its complete static runtime import graph. Copies retain original bytes and relative imports; no transformed loader or mirrored algorithm is used.

| File | Original Git blob | SHA-256 |
| --- | --- | --- |
| library-search.js | `02189c81c6b737f3fdf8e6e08e50022cd4779ccf` | `44918b0615a63f1ea12dc05ff42b351906376799774fef76d89e9b3b1a45f737` |
| search-service.js | `97b379366d6fb486945d4da353a277834b5c5d81` | `cd08ffe96ec002af9012fcf235a324a612d48d41ba8770eb090cef492060af70` |
| thought-model.js | `991b58cb9e9ebd79a03938a937ad3bde1d4ce7f6` | `a681211abf082dce6d05381841583247778ca4462963ffe458b4503629fd4fe6` |
| constants.js | `ca46e55e5002b08e0efae635e21b7738366aba0f` | `57cd5b3e207b652b55369715ce42b20e4b5167195b63f51e994732ee6748b92b` |

The owning test checks file lengths, SHA-256, Git blob hashes and the exact import graph. The three unchanged live dependencies must match the frozen bytes. Typed owner/IDB/FakeIDB dependencies execute from this base with no changes; the four-file snapshot is the search module import closure, **not a freeze of every transitive typed-store/test-harness file**.

Synthetic typed `LibraryDocumentsStore` operations create canonical source states. A test-only physical FakeIDB fork copies their complete persisted rows and matching local database identity, preserving every store exactly. Neither fork computes a domain DTO. Both old and new queue/search/rebuild functions execute through the actual production repository/maintenance transactions. An observational proxy records and forwards original puts/deletes; it does not implement storage behavior. Each comparison checks ordered original write-call JSON bytes, return-value JSON bytes, and all persisted store-row JSON bytes without normalization or ignoring fields. This does not claim native IndexedDB binary file equivalence or a supported restore protocol.

The six owning cases cover:

1. Exact frozen module/import graph and unchanged live dependencies.
2. Deep-frozen pure inputs, Unicode/deduplication, exact fields/order/IDs, original queue output and original full posting output.
3. Actual no-delta/derived-only queue writes and original generated-label cleanup locator. Synthetic source-reference injection in this case qualifies only the existing queue boundary, not a new admitted Human entity.
4. A 450-token real Entry, write-prefix offset 200 with no premature indexed tag, complete-current result, typed edit retaining the old indexed tag, old-version delete suffix across bounded batches, typed removal and restoration, and exact restored postings.
5. A real Source-derived Entry plus real Topic/default/named Sections and 25 Entries; 20-owner page leaves work pending. All full posting rows match constructor outputs and the old implementation. A test-only missing-Source fault proves original `sourcePresent` behavior; it is not a typed purge journey.
6. Original rebuild phases and missing-owner/stale-version task cleanup.

Clock/UUID methods on comparison forks throw after initialization, so queue/search/rebuild comparisons cannot allocate fresh domain time or identities.

## Verification and retained failure

One necessary combined run of these four **complete files** passed 19/19, 0 skipped/cancelled, 1921.702542 ms:

- `tests/library-search-constructors.test.mjs` — 6/6.
- Original `tests/search-hardening-v092.test.mjs` — 4/4 (real Library ranking/pagination, late Input ranking and Topic-label eligibility).
- Original `tests/search-service-round2.test.mjs` — 3/3.
- Original `tests/archive-search-owners.test.mjs` — 6/6.

Log: `/tmp/paia-search-constructors-related-final-precommit.log`, SHA-256 `2c2aa960732f3733618f26cc61091efe0f98d673a5943eb5c1faf3a640fe19c1`. This run tested the exact runtime/test bytes subsequently committed at the code SHA above; no code changes occurred between that run and the commit. Documentation commits do not retag this as a new runtime experiment.

`git diff --check` passed. The original static package checker passed **13658 guardrails / 407 runtime resources**. Static checks do not replace logged-in browser evidence. No native browser/CI/provider/model/network run was performed by this batch.

Initial owning run: 1/6 passed, five `STORAGE_FAILED`, 201.215334 ms. Log `/tmp/paia-search-constructors-before-first.log`, SHA-256 `09f86026564e032f3610e0625298e28d8903ee7f8e88e57e9e24423db6d8a79a`. The test fork initially supplied current schema-six local identity before copying the matching migration record into the empty database, and the actual initialization correctly refused it. The test setup now opens the empty schema, copies the existing synthetic complete snapshot, then runs ordinary initialization. No runtime failure was masked or repaired. After that setup repair the owning file passed 6/6, 1907.969708 ms (`/tmp/paia-search-constructors-second.log`), before the final combined run. No assertion, timeout, or original test file was weakened.

## Remaining boundary

Split A still needs exact qualification of nested historical tags, complete current prefixes/old delete suffixes, canonical before/after ancestry and typed transition timing. This extraction alone grants none of those capabilities. Missing history, unknown projection, unrepresented old version, malformed index or foreign data must continue to refuse in the existing Human scope. Split B derived projections, cloud transport, full-group native acceptance, paid models, manual human evaluations and product delivery remain outside this receipt.

## Independent review after freeze

Root independently read the complete runtime diff, owning test and frozen fixtures, then ran the complete new owning file: **6/6 PASS, 0 skipped/cancelled, 1948.23325 ms**, recorded at `/tmp/search-constructors-root-independent.log`. Root confirmed the four original module/import byte snapshots and the actual all-store/ordered-write oracle, and approved the extraction scope.

`integration_review` independently inspected frozen code `8e1e048a` and receipt `a0af5ccb` without rerunning tests. It confirmed exact original Git bytes at base `1d8ebba5`, mechanical preservation of property/order semantics, captured version before the await, source-reference access after the await, and unchanged loops/budget/fences/Source/indexed-tag behavior. Its **APPROVED** decision is limited to reuse of these three original constructors; it supplies no native-browser, Split A qualifier, Human admission or full Sync claim.

This addition changes documentation only; frozen runtime/test/fixture bytes and prior evidence identities remain unchanged. Root schedules this batch for a later coherent 039 candidate rather than the currently verified 038 candidate. Library search writer is released after this documentation commit. Future completed-current indexed-tag qualification requires its separately reviewed design and implementation; this receipt does not authorize that runtime.
