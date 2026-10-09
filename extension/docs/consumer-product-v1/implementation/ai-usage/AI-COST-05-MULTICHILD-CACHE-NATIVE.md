# AI-COST-05 exact multi-child cache: native acceptance extension

Status: test authored and static checks complete; **native source/release execution pending the coordinator's stable 0.40 batch**. No browser run, runtime change, provider request, model-quality claim or delivery is recorded here.

Base: `b4f0ef7620e2fd3f24bebff683260d3a7884de39`. The accepted local implementation is `00a3943322b5a610ec9e44852f3e0859f88eb9f4`, including its preserved before failures and independent corrections in `AI-COST-05-MULTICHILD-CACHE-LOCAL.md`.

## Scope and unchanged gates

Only `tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` gains a block immediately before its existing private Assist verification. Removing that block reproduces the original file byte for byte. The two original source/release cases, 120000 ms budgets, initial 100-Input capture, privacy/network assertions, 200+5 incremental sequence, legacy V2 multi-child non-cache assertion, V3 style/history/rollback assertions and private Assist checks remain unchanged. No version, CI, fixture helper, Human native test, runtime module or package dependency is changed by this test addition.

The new block uses the same real headless extension and native `IDBFactory`, the original named `OrganizerStore`, `LocalOrganizeSession`, original typed Entry/Topic APIs, actual V3 provider fixtures and actual candidate adoption. It creates only three additional databases: 40 Entries / two children / original style, 60 / three / balanced, and 80 / four / concise. No duplicate reducer, FakeIndexedDB or precomputed DTO supplies the result.

## Finite assertions

Each real first-generation base-none schema4 candidate must commit with 20 physical inputs per child, then adopt through all original changed-field decisions. The resulting single-generation saved presentation must qualify exact. Twenty newly created sessions per scope must prepare and return CACHED with the exact adopted currentView, retaining one original physical attempt per child and all committed receipts. Native IDB put/delete/clear instrumentation must observe zero writes during these sixty cached journeys; complete snapshots of every original repository store must also remain byte-equal. The existing top-level zero external/extension network and browser-error checks cover this block.

Each database also reuses its original pre-adoption candidate for one bounded real ledger refusal: first-child ACK deletion, first-child OUTCOME_UNKNOWN, or null committedCoverage. The original durable ledger is actually modified. The test observes the real adoption metadata write without cacheBinding and deliberately aborts the final original operation-receipt write. It requires STORAGE_FAILED and exact all-store rollback to that corrupted pre-adoption state, then restores the one captured original ledger row and performs normal adoption. **These aborted probes establish native verifier refusal and rollback, not successful adoption while corrupted.** Successful ordinary unqualified adoption for these corruptions remains the separate existing owning-unit evidence; it is not relabeled a browser observation here.

Two already qualified scopes also exercise the actual repository transaction-completion boundary: dispose the cached session or change the original pending style control immediately after the real read transaction returns CACHED. The public run must reject with UNAVAILABLE or STALE_BASE, respectively, without any durable store or provider-attempt change. These two cases reuse the same data rather than building further 40-Entry fixtures.

## Static evidence and pending verification

- Native file SHA-256: `5bce3592374d7c32d9fc050380ac3f906e9110b337661f484cfdd4e7fee5a307`.
- `node --check tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs`: PASS.
- `git diff --check`: PASS.
- Byte comparison after removing only the new block against base HEAD: PASS; original code and assertions unchanged.
- Full original source and release native cases: **NOT RUN by this author**. The coordinator will run the stable complete file once after independent review and version alignment, preserving any failure, cancellation or timeout as such.

Root review adds explicit exact three-result cardinality and ordered children/style/fault/completion matrix assertions before per-result checks. Independent review verified native fault/rollback scope, actual transaction completion fence and all original byte preservation. Full native execution remains pending.

Final independent code review: cache_native_review APPROVE exact native SHA `5bce3592374d7c32d9fc050380ac3f906e9110b337661f484cfdd4e7fee5a307`; node syntax and whitespace PASS; no browser execution by reviewer. Root read the complete small diff and confirms finite three-fixture/rollback/zero-write/completion scope.
