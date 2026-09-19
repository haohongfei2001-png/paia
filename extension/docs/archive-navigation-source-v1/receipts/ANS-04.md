# ANS-04 Completion Receipt — Bounded Navigator read model

## Identity

- Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- Round: `ANS-04`
- Execution: `ANS04-20260919-exec01`
- Canonical execution start: `b0b3038a79e479314dfa8505cb8dbfb62fcf67d3`
- Claim/status commit: `40afc703cc7953ada4516ce26e705b36da2579dd`
- Core implementation commit: `54e6ddb3568a2c1431b0c1235854d20febf91371`
- Concurrency/release parity commit: `df86ecf8bd64ae0ccb0a09505eaf0f2db5d8ae73`
- Certified runtime head on `main`: `3ac136b694055dc2fb17613f4757dddbe4a527c3`
- Main certification: PAIA Certification #381 / run `35429870723` / attempt 1 / **success**
- Certification completed: 2026-09-19T08:04:39Z
- Product-owner blocker: **NONE**

This receipt closes only ANS-04. It marks ANS-05 READY but does not authorize or implement ANS-05.

## Delivered behavior

ANS-04 delivers the package-defined bounded Archive Navigator read model without changing canonical content ownership:

1. Added `core/read-projection-keys.js` with stable UTF-8/code-point keys, provider/project/window comparators, scope hashes and fixed bounds: source scan batch <=100 and query page <=40.
2. Added `core/archive-navigation-index.js` as a rebuildable, body-free read projection over existing document and source-structure facts. Cold catalog construction is checkpointed in <=100-row batches; dirty document/conversation/project reconciliation is resumable.
3. Added per-scope index state with explicit `building` / `complete` coverage, archive scan progress, revision fencing, shadow generation construction and atomic active-generation publication. A partial generation is never presented as a complete Navigator.
4. Added `core/archive-navigation-query.js` with provider/group/window descriptors, selected-path lookup, bounded pages and versioned cursor semantics bound to scope hash + generation + mode. Cross-scope, cross-generation and cross-mode cursor reuse fails explicitly.
5. Added `core/archive-navigation-invalidation.js` and transaction-local integration in `core/idb-repository.js`. Durable document/source-structure changes increment the catalog revision and enqueue bounded rebuild work in the same transaction.
6. Added primary-key range helpers to the existing IndexedDB repository; no object store or DB version was added. Index rows remain disposable derived metadata.
7. Added trusted service-worker read commands `PAIA_ARCHIVE_NAV_PAGE` and `PAIA_ARCHIVE_NAV_STATUS`, gated by existing consent/local-tool boundaries. The Navigator path does not call `GET_STATE`, materialize all archive content, make provider requests or invoke AI.
8. Backup/restore/import/purge behavior treats Navigator rows as rebuildable cache: formal Backup excludes projections, restore/import invalidates stale indexes, and purge removes source refs/titles from rebuilt projection while preserving independently valid user work.
9. Added ANS-04 query, migration, concurrency, worker, real-Chrome and release-artifact tests plus reusable synthetic harnesses.
10. Certification closure fixed two pre-existing browser-focus races without weakening any gate. ANS-01 now verifies focus atomically in-page before keyboard activation; UX-R5 records user focus-restoration intent at the change-event boundary and restores it after the async view transition.

## Actual changed runtime / test files

Relative to the ANS-04 claim checkpoint `40afc703…`, the certified runtime head changes:

- `extension/background/service-worker.js`
- `extension/core/archive-navigation-index.js` (new)
- `extension/core/archive-navigation-invalidation.js` (new)
- `extension/core/archive-navigation-query.js` (new)
- `extension/core/idb-repository.js`
- `extension/core/read-projection-keys.js` (new)
- `extension/ui/thoughts-base.js`
- `extension/ui/thoughts.js`
- `extension/tests/ans-01-reader-surfaces-chrome-e2e.test.mjs`
- `extension/tests/ans-04-navigation-concurrency.test.mjs` (new)
- `extension/tests/ans-04-navigation-migration.test.mjs` (new)
- `extension/tests/ans-04-navigation-query-chrome-e2e.test.mjs` (new)
- `extension/tests/ans-04-navigation-query.test.mjs` (new)
- `extension/tests/ans-04-navigation-release-chrome-e2e.test.mjs` (new)
- `extension/tests/ans-04-navigation-worker.test.mjs` (new)
- `extension/tests/harness/ans-navigation-chrome.mjs` (new)
- `extension/tests/harness/ans-navigation.mjs` (new)
- `extension/tests/ux-r5-ai-organize-chrome-e2e.test.mjs`

No durable body schema migration, new object store, provider permission, host permission, capture source, Source identity, AI permission, or remote service was added.

## Query / cursor contract

- Root scope: providers that actually have archived windows.
- Provider scope: stable group descriptors; `unknown` and `unassigned` are distinct.
- Window scope: Project / unassigned / unknown / deleted / detached as allowed by existing trusted facts.
- Default ordering: PAIA stable comparator; source-order mode is structurally supported but remains unavailable when the provider lacks certified complete-scope order evidence.
- Page size: maximum 40 result items.
- Source/index work per build batch: maximum 100 objects.
- Cursor: version 1, bound to `scopeHash`, `generation`, `mode`, and `lastKey`.
- Coverage: `building` never masquerades as an empty or complete archive.
- Old Reader fallback: preserved while index builds or an index scope is unavailable.
- Input body reads from Navigator query path: 0 in targeted and browser evidence.

## Focused verification

Targeted data/query/migration/concurrency/worker command:

`node --test tests/ans-04-navigation-query.test.mjs tests/ans-04-navigation-migration.test.mjs tests/ans-04-navigation-concurrency.test.mjs tests/ans-04-navigation-worker.test.mjs`

Result: **17 pass / 0 fail**.

Targeted Chrome command:

`node --test tests/ans-04-navigation-query-chrome-e2e.test.mjs tests/ans-04-navigation-release-chrome-e2e.test.mjs`

Result: **2 pass / 0 fail**.

Additional closure verification:

- three repeated ANS-01 focus runs after foreground stabilization: 3/3 pass;
- three repeated UX-R5 focus runs: 3/3 pass;
- four-way local focus-contention stress with two temporary focus-thief fixtures: 8/8 pass; temporary fixtures were never committed;
- current UX-R5 certification cases for responsive/IME/keyboard/stale-CAS, provider failure and interrupted-worker outcome all passed;
- `npm run check`: **8867 package guardrails across 209 runtime resources**;
- release build: **226 files**, release product guard success.

No assertion, timeout, concurrency, privacy/security check, package guard or certification rule was lowered.

## Performance / bounded-work evidence

Local isolated evidence recorded by the committed ANS-04 tests:

| Fixture | Evidence |
|---|---|
| 402 windows + concurrent writers | capture ~=15.79ms; edit ~=10.46ms; measured writer queue/block interval ~=117.69ms; rebuild remained resumable |
| 1,000 windows | cold ~=1.77ms; 30-sample warm p95 ~=9.20ms; body reads 0; full scans 0; max batch 100 |
| 10,000 windows | cold ~=2.63ms; 30-sample warm p95 ~=13.29ms; body reads 0; full scans 0; max batch 100 |
| Real Chrome 1,001 windows | cold ~=6.61ms; 30-sample warm p95 ~=58.19ms; body reads 0; full snapshots 0; max batch 100 |

These are isolated test-environment measurements, not claims about every end-user machine. They satisfy the ANS-04 hard resource bounds P01-P04.

## Migration / lossless / invalidation evidence

Committed tests verify:

- clearing and rebuilding Navigator indexes preserves Source facts, edited Inputs, independent Thoughts, revisions and policies;
- interrupted catalog/scope checkpoints resume idempotently;
- concurrent capture/move cannot publish a stale or partial generation;
- aborted invalidation rolls back with the canonical write;
- move/rename/deletion paths preserve identity and only change allowed relationship/projection metadata;
- parent Project deletion does not imply child Conversation deletion;
- purge removes source refs/titles from hot/rebuilt indexes while independently valid detached user work remains;
- formal Backup excludes Navigator projections; restore rebuilds from canonical data;
- formal import invalidates a cold-complete catalog without body-backed query fallback;
- cold page/status selected-path reads are fenced against a concurrent purge.

This covers the ANS-04 portions of V01, V07-V13, V18, V20-V21 and P01-P04, with migration/failure coverage for the relevant M02/M03/M04/M06/M08 cases.

## Certification evidence

PAIA Certification #381 / run `35429870723` / attempt 1 completed **success** on exact head `3ac136b694055dc2fb17613f4757dddbe4a527c3`.

Required evidence:

- Current Browser Certification: **56 / 56**
- Full Suite Certification: **1174 / 1174**
- Full-suite receipt: `fullSuite=true auditPassed=true historicalBrowserFiles=76`
- Full-suite input digest: `253ac75721350a291094349a62ce07b3939e2f736db34951ed00a492420f0930`
- package guardrails: **8867 across 209 runtime resources**
- release build guardrails: **8432 across 202 runtime resources**
- release product guard: **226 files**
- `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`
- Unit 1/4 through Unit 4/4: success
- Adapter and privacy contracts: success
- macOS Secure Store Certification: success
- final Certification gate: success

Earlier same-round runs exposed browser-focus races under four-way test concurrency. Those failures were treated as real gates, not ignored. Final fixes preserved the original assertions' accessibility intent while removing dependence on cross-process OS foreground ownership, and the unchanged concurrency/timeout gates passed on #381.

## Ownership, privacy and rollback

- Durable Source/Input/Thought ownership: unchanged.
- Source/message/document identity: unchanged.
- Existing Source original text/hash and Working Input revisions: unchanged.
- Durable body migration / new object store / DB version: none.
- Provider/capture permissions and host permissions: unchanged.
- New active provider/API requests: none.
- New AI authorization or automatic model work: none.
- ChatGPT Project/membership/order/delete capabilities not certified in ANS-03 remain unavailable/unknown; ANS-04 does not infer them.
- Navigator indexes can be deleted/rebuilt without deleting durable source facts or user work.
- Old Archive/Reader browsing remains the fallback while projection coverage is building or unavailable.

## Handoff

ANS-04 is complete at certified runtime head `3ac136b694055dc2fb17613f4757dddbe4a527c3`, published on `main` and certified by PAIA Certification #381.

Canonical STATUS may now mark ANS-04 COMPLETE and ANS-05 READY. This execution stops after publishing and remotely reading back the completion documents; it does not implement ANS-05.
