# IAH-1.1 qualified search and exact arrival — local candidate evidence

Base: `00665927c203cf2fc2e7e2c431f3908e2ce01037`, inherited version 0.21.0. This is a local implementation checkpoint awaiting independent review, candidate/main gates and the coordinator's coherent version decision. No installed or deployed release claim.

## Implementation boundary

- `SEARCH_INPUTS` opts into a strict bounded `searchSnapshot` (version, repository generation, normalized-query/exact-scope signature). Existing ranked scan/cache owners, limits and legacy result shape remain unchanged. Qualifying the final result and its canonical Input revision shares one transaction. Project post-filter transaction changes invalidate the entire page rather than substituting neighbors.
- Existing `backup-data-generation` covers SourceStructure membership/Project metadata, filter policy, Working removal, source purge and content writes. Actual owning tests verify these changes; no second corpus, schema, permission, worker RPC or generation owner is introduced.
- UI pages and same-tab origins retain only bounded cursor/snapshot metadata. Changed generations discard old continuation and restart once; repeated change returns no results with an explicit retry message. Nothing enters URLs or Sync.
- Search activation carries known revision and search snapshot, then reads the exact current Input through the existing GET_PAGE owner with `qualifyContext:true`. Canonical `inputProjection` controls active state and source tombstones. Current revision, original explicit provider/Project/date/filter scope and Unicode text are read again; removed/purged targets return an empty visible page and an explicit unavailable message, never a neighboring match. Ordinary Reader nearby recovery/filtering remains unchanged. Source membership is read in the final transaction, after comparing the captured source identity used to prepare its canonical key. Unrelated generation changes or revised text do not blanket-reject an otherwise eligible same Input. The hash binds metadata; it is not a trusted signature or authorization.
- No real model, cloud account or user data was used. Synthetic native fixtures retain real worker/IndexedDB behavior, zero extension network requests, leave/save/IME guards, original text and current selection assertions.

## Preserved negative evidence and results

Local logs are outside the repository and are not claimed as remote CI:

- `/tmp/iah-search-identity-before.log`: initial fixture timestamps were not canonical ISO; this setup failure is not product evidence.
- `/tmp/iah-search-identity-before-qualified.log`: initial same-store mutation injection deadlocked on its existing serialized write owner; stopped, not a pass.
- `/tmp/iah-search-identity-before-qualified2.log`: corrected actual second-store mutation fixture: 4 FAIL / 1 PASS before the production fence. The passing test proves existing generation coverage. Failures expose absent revision/snapshot, unbound cursor/scope, stale-generation delivery and cross-transaction Project results.
- `/tmp/iah-search-ui-before.log`: 2 new qualified-continuation tests fail before UI implementation; original 3 cases pass.
- `/tmp/iah-search-arrival-before-all.log`: existing 7 cases pass; edit, removal and purge arrival subcases fail before the opt-in page qualification (parent failure also reported by Node).
- `/tmp/iah-search-identity-full-related-unit.log`: 13 complete affected unit files, **94 PASS / 0 FAIL / 0 skipped / 0 cancelled**, 2.54 seconds.
- `/tmp/iah-search-identity-native.log`: the first browser launch was interrupted after a fixture-edit command used the wrong cwd. **0 PASS / 1 cancelled**, not accepted evidence.
- `/tmp/iah-search-identity-native-qualified.log`: existing whole IAH native file, isolated generated release directory, **source PASS 26.61 s + release PASS 27.08 s**, total 54.78 s; no skips/cancellations. New held stale-result remove/purge cases use another trusted owner and the actual purge preflight gate. They verify unavailable notice, no neighboring editable Inputs, no connected stale highlight and absence on return. All earlier Unicode, text selection, deep arrival, default-filtered Find, three return labels, locale, origin second-page/focus, Settings, IME, cold fallback and no-write assertions remain.
- Release build: 11411 package guardrails, 336 runtime resources; release guard PASS with 360 files. Static packaging is not visual or installed-build acceptance.

Runtime and native test bytes were frozen throughout the successful native run; the only concurrent edit added a separate origin-metadata unit case. SHA-256 was recorded after that run:

```text
dce3a719138a2f4afc3dd2a70dbfed6a2e2225c71f23c4dbcdb01e9ca3014d0d  extension/core/qualified-input-search.js
e399af3492202f13c8bcd9b7d020869ce532f9cf48ab5f570827332e4323e15f  extension/core/smart-filter-store.js
e7204f5aec776681fe77e23fcf63db899f18436404ac177ded16d1430172e8d5  extension/ui/archive.js
ff759917c0f8debfa7ad52ebf73b6b63782a2d98e7b917f57ea0fb74c65f93ad  extension/ui/input-search.js
09bbc2da6ffb111618e8dd909903de7124cfc1be34f4487cc6c9d0c2447727e4  extension/ui/route-history.js
e86773f6fdc3b283f56ee3f75b885a9135762cc0ee87a5481dcb04cbb9996b65  extension/ui/smart-filter.js
22e0721dc6f8594ae487f639afcc490704953828a5149ed43edd8eba006ef4e8  extension/tests/iah11-result-presentation-chrome-e2e.test.mjs
```

## Remaining gates

Independent review, coherent candidate version/reconciliation, complete applicable release gates and exact-main verification remain coordinator-owned. This closes the local search DTO/generation/removed-target gap only; same-tab origin preservation does not claim precise private-query restoration after session loss. Existing truthful cold fallback remains.

## Activation scope follow-up

The initial implementation fenced search pages but did not reject activation after the Input left its original Project. `/tmp/iah-search-scope-before.log` records that real second-OrganizerStore negative (expected unavailable, actual available). The same test first revises the Input body and confirms that still-eligible current content remains reachable. The corrected scope fence also rechecks live filter policy; strict provider/date/filter/Project signature and revision-shape tests reject metadata forgery.

`/tmp/iah-search-scope-full-unit.log`: the same 13 complete affected unit files now **96/96 PASS**, no skip/cancel. This supersedes the earlier 94-test count for final scope behavior.

`/tmp/iah-search-scope-native.log`: final scope-wired complete source/release native file **2/2 PASS**, source 30.53 s, release 30.93 s, total 63.07 s; no skipped/cancelled cases. No runtime/test changes occurred during this run. `/tmp/iah-search-scope-native-before.sha256` and `after.sha256` compare identically. Final hashes (paths relative to extension):

```text
3798e43f9b420776c5f47ae7797b81c10a09c109c8f3c542e9869b5c7a33514b  core/qualified-input-search.js
ff49e693647e88a659ba12129b14e178f013aa63aae8ef8c09faeaccf665ae19  core/smart-filter-store.js
b901966d55cb56b0ffe9ccc3182535c70058418297d726aece38955f131bee9d  ui/archive.js
ff759917c0f8debfa7ad52ebf73b6b63782a2d98e7b917f57ea0fb74c65f93ad  ui/input-search.js
09bbc2da6ffb111618e8dd909903de7124cfc1be34f4487cc6c9d0c2447727e4  ui/route-history.js
d596f2728e1231e16da0758761672c861612ae08100793e567291ae849c0dd9d  ui/smart-filter.js
22e0721dc6f8594ae487f639afcc490704953828a5149ed43edd8eba006ef4e8  tests/iah11-result-presentation-chrome-e2e.test.mjs
```

The earlier native/hash block is retained as pre-scope evidence and is superseded by this final block for current runtime claims.

## Main reconciliation

Merged main `c168b13170d762b4774740ce218613a45e31cde4` without conflicts as `0e0bd2720d395d05d9681bc12c0882861797b742`. The inherited changes add the partial BNS modules/tests/workflows and an optional `syncJournal` seam in PromptReuseService. The production worker still constructs `new PromptReuseService(store)`, leaving that seam null. IAH UI/search/IDB/worker, native fixture and release builder bytes did not change. The previous native run remains evidence of those IAH bytes, not an exact merged-head CI receipt.

- `/tmp/iah-mainc168-merge-unit.log`: 25/25 qualified-search and affected CI guard tests PASS.
- `/tmp/iah-mainc168-prompt-seam-unit.log`: complete Prompt service/security files, 25/25 PASS.
- No unchanged IAH browser suite was repeated. Formal combined candidate/main gates remain pending.

## Reader Find review correction

Independent review identified that `openDocumentSearchItem` still used ordinary nearby arrival. It now supplies the same navigation-owned exact-target qualification, scoped to its current document, with a checked Input ref kind/revision/document. No Archive Project snapshot is fabricated. The former unqualified duplicate reveal was removed.

The first body-match inference used the bounded snippet. A real owner negative proved a 250-character query can be present in canonical text but absent from its 240-character excerpt. `searchMaterialPage` now adds only an Input `bodyMatched` Boolean computed from the complete canonical body through existing normalization. It neither increases excerpt size nor adds text persistence. Tests cover long queries, Unicode normalization, title-only matches and separated terms; existing universal search consumers remain covered.

Evidence:

- `/tmp/iah-find-arrival-before.log`: actual production activation owner fails before exact-arrival wiring.
- `/tmp/iah-find-full-body-before.log`: actual store query fails before full-body DTO Boolean (undefined rather than true for the long query).
- `/tmp/iah-readerfind-native.log`: 0/2 PASS, both failed because the correctly delivered mutation notification had already cleared the old Find row. This is preserved evidence that ordinary invalidation clears stale results; holding search RPC responses alone cannot create the intended arrival race.
- `/tmp/iah-readerfind-final-native.log`: preparation used an incorrect cwd; run stopped/cancelled and is not accepted evidence.
- `/tmp/iah-readerfind-final-unit.log`: 15 complete relevant files, **108/108 PASS**, no skips/cancellations.
- `/tmp/iah-readerfind-delivery-native.log`: complete existing IAH native file, **source 31.06 s PASS + release 31.84 s PASS**, total 63.75 s, 0 failures/skips/cancellations. The new tests explicitly model controlled receiver notification delivery: only the target mutation's ARCHIVE_CHANGED cause is queued, real worker/IDB/query qualification remains active, every queued original callback is delivered in original order in finally, and the queue is proven empty. Per-variant/action `reader-find-*-delivery.json` artifacts record held/delivered causes. This is not claimed as measured natural network latency.

The four Find arrival cases verify revised matching text, disappeared-match notice, removed target rejection and purged target rejection. All original Archive/Find/Unicode/filter/origin/IME/privacy assertions remain. Runtime and native bytes were unchanged throughout the final successful run. Current correction hashes:

```text
b6ceb92890d5b086e11db0c626eeb2ae95baea796bdf69bf535986e33e2f0058  extension/core/search-material-page.js
27dd5f62b1bd314a8584aeffc4b443b6f51d879e0100417c9bb9c56ff4348337  extension/ui/archive.js
456e37c5f84f68be68a39014aceea867dad18096f86506e5707e67043f107b50  extension/tests/iah11-result-presentation-chrome-e2e.test.mjs
```

This correction supersedes earlier runtime hashes for these three files. Formal candidate/main gates remain pending.
