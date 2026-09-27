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


## Real pretrained local model probe (candidate; no production promotion)

The next coherent candidate compares the exact frozen corpus and original two
lexical methods against a real q8 CPU feature-extraction pipeline using
@huggingface/transformers **3.8.1** and the public converted
Xenova/multilingual-e5-small candidate (384 dimensions). This is a lab screening
choice, not the production architecture or a claim about current personal beliefs.

Primary implementation references, read through GitHub:
- https://github.com/huggingface/transformers.js/blob/3.8.1/package.json
- https://github.com/huggingface/transformers.js/blob/3.8.1/src/pipelines.js
- https://github.com/huggingface/transformers.js/blob/3.8.1/src/utils/hub.js
- https://github.com/microsoft/unilm/tree/master/e5

The isolated Actions job downloads public model metadata, resolves an actual
immutable 40-character revision **before** model loading and records the original
upstream model revision/license. Missing/ambiguous provenance, license or q8 asset
fails the probe. No account token is supplied. Only these fixed PUBLIC synthetic
records/queries enter local inference; no archive/profile/secret/private model
cache is loaded. Public model requests download weights, not corpus material.
The mutable metadata discovery is not production admission.

The pipeline uses mean pooling and normalization, with fixed passage/query
prefixes. It projects the 27 nonexcluded records once and reuses that derived
projection for all 29 tasks. It checks vector dimension/finite values/unit norm,
retains date/source eligibility and rejects changed title/body/source/time,
excluded/unknown/duplicate substitutions before query inference. No gold labels
reach the candidate. The cosine threshold **0.7** is frozen before the first
result and explicitly **uncalibrated**; unsuccessful abstention/retrieval remains
visible and is not repaired by changing tasks, gold or the threshold.

After the first load it disposes and reloads from the pinned per-head cache with
remote models disabled and local_files_only=true. Reports include the same
MRR/recall/nDCG/no-answer/category failures as both lexical baselines, query timing
including model inference, actual build/load/offline reload time, projected bytes,
actual model asset bytes/SHA256s, original/converted model revisions/licenses,
resolved dependency lock SHA256 and Node RSS/heap observations. The lock is a
first-probe resolved lock, not an admitted production lock. The artifact contains
aggregate/fixed-task results and PUBLIC model/dependency provenance only, never
vectors, corpus bodies, queries, applicant data or account tokens.

Only one bounded Ubuntu job runs on relevant lab changes to the existing writer.
No automatic retry, full certification or unchanged-head rerun is introduced.
The existing frozen evaluation tests remain, plus nine numerical/scope regressions.
There is no production runtime/UI/manifest/permission/data-store change and these
experiment/scripts are excluded by the existing runtime packaging allowlist.

Current evidence: **NOT_RUN for this new candidate**. A successful Node lab probe
still does not establish Chrome/WASM/worker/MV3 compatibility, conversion
equivalence, long-library latency, incremental invalidation, calibrated abstention,
private corpus quality or production semantic capability. Those remain CPV1-07.1/
07.2/07.6 work before enabling semantic retrieval. Preserve original fixed tasks
including all no-shared-keyword/no-answer cases regardless of measured quality.


First model probe failed; candidate mathematics/scope gate passed. The actual safe failure receipt is now printed even on nonzero exit, with fixed reason codes, bounded public metadata booleans/HTTP status and an allowlisted error class. All admission/quality predicates are retained. No current model quality, artifact availability or unit result implies semantic production acceptance.
