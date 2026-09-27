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

## VS-07 bounded public license source diagnosis — no third model trial

Exactda07cbfe65c0efcadf6b6ac66c0eb532f5ce82cc Candidate36292000106 SUCCESS. Semantic36292000072 /actual108543745705 FAILED with fixed receipt public_model_provenance/public_model_license_unverified: converted repository HTTP200, exact identifier/SHA/public/ungated/q8 all true, permittedLicense false. This is MODEL_SOURCE_PROVENANCE, not product ranking, numeric vectors, timeout, Chrome or runtime failure. Two prior failures are bounded by actual source/log evidence; do not run another blind model attempt or replace permissibility with a library/upstream inference.

Coherent source-diagnosis batch: fixed two PUBLIC model IDs only, inspect current API representation, then exact40char revision API with identity/public/ungated revalidation, then only pinned README.md and finite LICENSE/LICENSE.txt/LICENSE.md actually listed by that revision. Report safe declaration type/enumeration, absent API field versus pinned declaration, literal README declaration/duplicates/conflicts, immutable source sizes/SHA256 and known license title classification. Never echo raw model card/license/API body, arbitrary tag/license/error, token, path, query or corpus. No ambient/arbitrary URL, redirects, model weights, dependencies/install, embeddings, inference or paid call. API/readme/title diagnosis does not grant legal/conversion/model admission.

The owning semantic workflow executes this bounded read-only diagnosis and deliberately retains nonzero NOT_EVALUATED / NOT_AUTHORIZED; no passed model gate or quality/Chrome/license certification is manufactured by a diagnostic read. Original real model runner, all SHA/license/cache/vector/scope/threshold gates, fixed28/29corpus/gold and all10numeric/failure+17baseline tests remain unchanged. Add8source/provenance regressions covering exact pin, missing representations, ambiguous/custom/array declarations, wrong/private/gated/mutable identity, arbitrary repository/no request, redirects/oversize/error non-echo, and conflicting allowed declarations. A diagnostic failure or declaration observation cannot authorize a retry; actual primary-source receipt must be reviewed before any next model candidate.

New8case cloud proof and actual source diagnosis NOT_RUN. Independent production index/invalidation, Chrome compatibility, real fixed semantic comparison, longitudinal/Revisit/long-library remain engineeringOPEN. SolePR88 continues; productionsemantic false, no model choice/promoted index/manifest/permission/storage/UI change or owner/live/private/device evidence claim. Full certification remains slice boundary only.

## VS-07 source-screening batch after bounded converted-license refusal

Fresh remote maine43b8748701cd7c71eba4da1576478bdcfce2d47 /soleDraft88 /835df1ab45af291a3f850d0e28e6ee872a969efe. ExactCandidate36292888213 SUCCESS: actualunit108546216724 all8public-source regressions +retained10numeric/failure and17fixed retrieval regressions PASS; contracts/privacy108546216670,release108546216563,aggregate108546745899PASS. Actualsource-only36292888233 /108546216429 records converted761b726dd34fb83930e26aab4e9ac3899aa1fa78 with missing license in both verified API cards, absent license tags, pinned README1077bytes/hash561a19594636657fe033f8b4427a7743b5f6f3a12f16cecc5f286feca0453245 missing declaration and empty finite LICENSE inventory. Converted source remains UNVERIFIED/non-admitted; no weights/inference retry. Upstream default API1063347bytes exceeded retained1MiB cap, not license/admission proof.

Verify official primary hub v0.36.0 hf_api.model_info source: documented expand parameter returns only finite requested fields and encodes repeated expand values. Use only sha/private/gated/cardData/siblings/tags on both current and exact-revision metadata; retain exact repository identity,40charSHA/public/ungated checks,1MiB/256KiB/64KiB source bounds, non-followed redirects and independently pinned README/LICENSE hashes. Omit unrelated public evaluation/widget payload; never increase bounds, infer rights from upstream/tags/title or alter private corpus/gold/fixtures.

Screen one finite batch of independently hosted alternate candidates and their upstreams: onnx-community/multilingual-e5-small, Xenova/paraphrase-multilingual-MiniLM-L12-v2, intfloat/multilingual-e5-small, sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2. Exclude the known unlicensed converted source before request. Existence/license/identity are NOT assumed. A consistent literal current/pinned/card declaration plus exact q8 asset is only DECLARED_QUANTIZED_CANDIDATE_PENDING_REVIEW, not legal/conversion/quality/Chrome/production admission. Declared upstream without q8 is explicitly different. Missing/404/private/gated/conflicting/oversize remains non-admitted; no arbitrary repository/network/file input, exception/body/license canary echo or model/weights download.

Implementation +5new targeted cases as one coherent source-screening batch; all8prior provenance assertions remain byte-identical. Cover six exact expansion fields/current+pin, no converted-license inheritance/permissive-tag shortcut, upstream without q8 distinction, retained cap/unavailable/redirect refusal and known-unlicensed/arbitrary repository/no request. Actualsource read and5caseproof NOT_RUN. Source-only workflow keeps nonzero NOT_EVALUATED/NOT_AUTHORIZED, original real model runner/gates and fixed28records/29tasks untouched. No full/unchanged rerun, paid commitment, production model choice, extension permission/storage/runtime/UI change or owner evidence claim.

Record only the rejected converted candidate source as deferred in DFG-CPV1-010. This blocks that candidate's weights/inference/admission, not alternative screening/index/invalidation/Chrome/longitudinal engineering. JAEsole20 /91898c53afc6a775e32b992f161f0f4be786ae4d actualCI36293132069 executing; no unchanged rerun or inherited old waiting state. Continue independent engineering while candidate gates run.

## VS-07 actual source result and official owned-ONNX comparison candidate

Exactbea5cd038d47df6c1b2bfa061a1ef76070c9246e Candidate36293632359 SUCCESS. Actualsource36293632404 /108548297341: alternate onnx-community E5 HTTP401 remains unavailable; converted Xenova MiniLM2c4055b12046f11709e9df2c122e59ffbdc2f900 again has no license/API tags/pinned README declaration or finite LICENSE file. Never trial either source. Original E5 now bounded API531716bytes provesMIT card but pinnedREADME497538bytes exceeds retained256KiB; remains non-admitted, cap unchanged.

Independently declared official sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 exacte8f8c211226b894fcb81acc59f3b34ba3efd5f42 has identical current/pinned2343byte metadata, public/ungated40char exact identity, Apache-2.0 card/tags and pinned3888byte README literalApache declaration/hash1e98ea05b0de579fcaad3d625b62ea55647142ed674d5f5ebf1440e4bbbb6f23. This is actual primary repository evidence, not inherited converted-source rights or inferred permission. Earlier model_quantized.onnx screening is absent at this official repo, so retain it as upstream-only for that exact candidate interface. Never relabel source screening as quality/production certification.

Proceed with one coherent actual official-source CPU candidate implementation+8targeted regressions. Before any weights require exact frozen repository SHA/README hash, consistent same-source Apache declaration, pinned metadata revalidation, finite actually-listed official qint8/quint8ONNX variant and independently fetched <=64KiB1_Pooling/config.json with384dimensions/explicit mean pool/no alternative enabled. If any source/asset/config check fails, refuse before weights. Assets are from the official declared repo itself; no unlicensed converted derivative. No mutable model inference or size/deadline increase.

Reuse pinned transformers.js3.8.1 only for actual tokenizer/cache and ONNXNode1.21.0 direct CPU session. Primary ONNXv1.21.0 sources confirm create(path), inputNames and asyncrelease; primaryHF3.8.1getModelFile caches exact revision and supports local_files_only/return_path. Input int64 IDs/mask/type must match actual graph known names; exact full input with truncation=false and admitted<=512tokens. Correct official no-prefix input instead of E5-specific prefixes. Actual float32 dense384output must have exact1xsequencex384shape/finite values, int64 binary mask, nonzero mean and normalizedL2 vector. Dispose/reload model+tokenizer with remote disabled/local_files_only before encoding27documents and29queries. Existing scope/revision/exclusion guards, fixed cosine0.7 before first result, gold, full corpus/categories/negative/no-answer tasks and lexical baselines remain unchanged.

Add7independent masked-mean/norm/shape/precision/sequence/mask/zero regressions plus one actual spawned official CLI invalid-env/canary/no source/model I/O regression. No old test/fixture removed. Measure actual fixed MRR/recall/nDCG/abstention/category error, load/offline/build/query time, actual public asset sizes/SHA256 and lockSHA/Node memory. No model/body/vector artifact or account token/provider call. Model/Chrome/conversion/long-library/production remain NOT_VERIFIED until actual gates; new8case and real model proof NOT_RUN. One candidate model run, no unchanged trial/full retry. DFG010 rejected converted E5 stays deferred; licensing this separate candidate does not erase that gate.

JAEexact91898c53afc6a775e32b992f161f0f4be786ae4d/CI36293132069 SUCCESS: actualUbuntu10854689608925+175+100+13+339packagedPASS9Mac-only skips; Mac108546896011392packaged/nativePASS+7updaterPASS. All5new cold transaction/state-isolation and12cold-entry tests PASS. JCR08 stays IN_PROGRESS/NOT_CERTIFIED with actual Finder/default native/GUI/legacy transfer/DFG002/008 engineering stillOPEN; no full/merge claim or old-head retry.
