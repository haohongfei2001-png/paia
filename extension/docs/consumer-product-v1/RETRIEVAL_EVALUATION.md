# CPV1-07.0 /07.1 fixed retrieval task and evaluation contract

## Scope and immutable labels

28public synthetic records,29tasks,13categories. Fixtures are independently authored before candidate selection, bound by their Git blob at the first reviewed batch commit. Every report computes SHA256 over the exact canonical JSON. Changing data/labels changes the digest and invalidates a direct comparison; never delete a hard task or relabel gold to make a method pass.

Tasks: Chinese paraphrase/fuzzy recollection/no shared lexical n-grams; negation/correction/quotation versus belief; no-answer; date/source/exclusion/unknown-time constraints. Full source bodies, roles and reliable/unknown time are retained. Relevance labels grade retrievability, not current belief. Quoted text does not become an author's opinion; an older expression is not silently replaced by a newer one.

No private source/example/text is used. This fixed synthetic corpus does not replace blind/private/user-level acceptance; those mandatory classes remain unverified.

## Candidate and evidence boundary

Candidate receives only an immutable eligible subset and query. Gold labels are inaccessible through that function input. The candidate may return at most5distinct eligible record IDs, or abstain with an empty list. Invalid ID/scope/duplicate/size/shape or exception is a contract ERROR; reports retain error counts and do not declare quality PASS.

Eligibility precedes scoring: exclude explicitly restricted records; require exact requested source; known date bounds exclude unknown-time evidence; unknown time stays unknown. Invalid calendar dates, mislabeled/out-of-scope gold, duplicate IDs or malformed cases refuse before candidate invocation.

Measures: MRR@5,recall@5,nDCG@5,no-answer abstention, per-category gaps, fixed-corpus retrieval p50/p95, lab projection build time/serialized bytes. Reports expose no source body/query/private error. Missing/failed measurements are not perfect scores. Current resource measurements concern28records only, not realistic long-library closure.

## Initial comparisons

- lexical-production-v1 uses the existing shared lexical scorer, unchanged.
- character-tfidf-lab-v1 builds a reusable invocation-owned statistical character projection; it is explicitly lexical/LAB_ONLY.
- unselected-semantic-lab-v1 is only the evaluator's future method classification; no semantic candidate, model, download or provider is implemented or invoked here.

Neither lexical method is semantic proof. Existing v0.6.2 embedding/classifier results concern pure-control filtering and do not establish retrieval quality or Chrome runtime compatibility.

The Node-only lab and tests do not enter the package allowlist. No production index/storage/UI/permission/provider change. Production semantic selection, incremental index/invalidation/coverage/fallback, unified A6/C3/R3, R2 longitudinal, finite R1 Revisit and07.6quality/latency acceptance remain later work in the SAME canonical slice.

## Cloud verification

Existing affected unit gate executes17new evaluation tests plus the actual bake-off script; privacy/contracts/release guards retained. New evidence NOT_RUN until Actions. Stable owning candidate/slice boundary alone gets full certification. All owner/external/private/device/current-live/distribution gates remain in the existing ledger.
