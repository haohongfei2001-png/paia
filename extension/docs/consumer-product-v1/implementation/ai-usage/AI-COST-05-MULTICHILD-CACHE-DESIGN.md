# AI-COST-05 exact multi-child cache — narrow design and actual gap

Status: design for coordinator/independent review, not implementation approval or completed cache functionality. Base `9c399c5ddf342bb7ad0baca3b7518e61a7531168`. Only this new document changes. The next writer requires a separately reviewed runtime scope; shared data remains under the coordinator's assigned single writer.

## Authority and boundary

AI_USAGE_PLAN §7 and §12 AI-COST-05 authorize semantic cache/incremental refresh and three styles. AIOS-1.0 transformation rules, Qwen-primary route qualification and independent author/model quality gates remain unchanged. Existing V3 generation/style-return, atomic multi-child candidate/adoption and legacy one-child cache are foundations, not new work to repeat.

This proposal admits only a **first base-none, complete V3 result**, generated through the original local session with two through four actual atomic children, then adopted completely through the original owner. There must be one local-committed generation; every produced block belongs to it; all candidate decisions adopt; no retained/manual/protected/kept material, old generation or incomplete scope exists. Existing-current/incremental/style-refresh and mixed-generation adoption remain readable but unqualified. A valid manifest alone never grants cache authority.

No new provider, financial settlement bridge, worker, route, UI, preference writer, schema/store, quota, Source/human mutation or paid/network experiment is proposed. The existing six-field persisted cacheBinding remains unchanged. New authority is an opaque bounded process-local proof, not a portable permission, exported DTO or durable body copy.

## Actual gap and precise evidence

The read-only audit checked remote main `e21b5543eaa9db9bf8e4b19dddfdfd0ee6b26ec2` (0.36), candidate037 `9c399c5d`, and candidate038 `a29bb920`. Relevant cache/session/V3 owners match between those snapshots. The actual synthetic probe executed at candidate038 through typed OrganizerStore creation/placement, LocalOrganizeSession V3, fixture dispatch, actual atomic candidate commit and actual adoption. No candidate/job/provenance positive-path records were inserted directly.

| Physical children | Entries / complete ACK units | Fixture calls | Actual adoption / generation | Fresh V3 session |
| --- | --- | --- | --- | --- |
| 2 | 40 | 2 | complete / one valid local-committed generation | NO_DELTA; run refuses UNAVAILABLE |
| 3 | 60 | 3 | complete / one valid local-committed generation | NO_DELTA; run refuses UNAVAILABLE |
| 4 | 80 | 4 | complete / one valid local-committed generation | NO_DELTA; run refuses UNAVAILABLE |

Every job is atomic COMMITTED; all original child receipts are COMMITTED/attempt1 with the exact ACK count. Every saved row lacks cacheBinding and reports unqualified/legacy_metadata. These successful probes establish the cache gap, not implementation or model quality.

Probe `/tmp/ai-organize-multichild-cache-gap-probe.mjs`, SHA-256 `9913d0f18c154323aae3cae6135c74da5bc519ac76ee5973d3e773d677d81144`; body-free log `/tmp/ai-organize-multichild-cache-gap-probe.log`, SHA-256 `b60c46636dd8d98fe971b81adeb21c48b66c00ca8eae0c8ccc35f2bee84bbbe7`; exit0. No additional broad browser/model test is needed to review this design.

Actual fault-injection counterexamples are retained as dependency evidence, not naturally reachable corruption claims:

- Duplicate supplied child IDs are rejected by original atomic closure validation.
- Deleting an earlier ACK leaves 39/40 real ACKs, maximum sequence1 and job committedCoverage40. Original already-COMMITTED closure replay still returns COMMITTED. Cache currently remains unqualified.
- Changing the earlier child receipt to OUTCOME_UNKNOWN while the later child is COMMITTED also leaves closure replay COMMITTED. Cache currently remains unqualified.
- Original committedV3Generation/shape validation permits two distinct child IDs sharing one operationReceiptId. Its recomputed digest is structurally valid, not an authoritative distinct-operation proof.

Therefore neither closure replay, job state, maximum sequence, manifest checksum nor final child's receipt substitutes for complete exact durable confirmation.

## Original interface gaps

1. LocalOrganizeSession's injected organizeClosure calls commitLocalOrganizeCandidateInTransaction without qualification; its multi-child run bypasses the original completed-proof confirmation hook. Private validated outputs and provenance exist but never become cache proof.
2. The candidate owner intentionally excludes schema3/4 from proof minting. Original proof confirmation accepts only ai_usage_v1 with one child; mechanically widening kind/count would omit exact multi-child evidence.
3. Original schema3/4 adoption updates checkpoints but does not call bindAdoptedLocalCache. Legacy presentationContent-to-proposal equality cannot compare the wrapped V3 projection/manifest correctly.
4. V3 prepare derives keys from incremental selected inputs. After complete adoption selected is empty and prepare returns NO_DELTA before cache authority qualification. A future cache decision needs complete current evidence metadata independently of dispatch-delta inputs.
5. The original cached read calls readLocalOrganizeScopeInTransaction with its default incrementalVersion1; V3 prepare/read must preserve the explicit version and request parameters when comparing the prepared proof. Merely stamping cacheBinding still cannot supply a coherent V3 CACHED handle.

## Proposed finite private capability lifecycle

Reuse the original globally bounded 32-proof registry, release/disposal paths and immutable empty token. Keep the legacy path and its identities unchanged. Introduce only an internal discriminant for the exact V3 atomic variant inside that existing private registry; it must not appear in persisted cacheBinding, worker/public options or exported metadata.

The local closure committer may supply this internal qualification only when its currently owned prepared state and private output/provenance maps exactly match the original Foundation canonical job/child order and coverage. Before a capability is retained it must bind:

- exact OrganizerStore instance, local session generation/owned state, atomic logical job ID, Topic ID and candidate key;
- candidate schema4, baseKind none, full proposal/manifest digest and one local-committed generation identity;
- ordered child IDs, each private payload digest, validated-output digest and original operationReceiptId;
- complete child coverage partition, full job coverage with exact key/facet/scope units and each captured evidence signature;
- trusted internal profile, existing style value/policy/revision/epoch, gate/restore/control qualification, full current evidence version and captured preparation proof.

Private output bodies remain only in original bounded session state. No bytes, digest or receipt reconstructed from a saved manifest can mint a replacement capability after disposal/restart. Eviction, cross-store use, lost private output, invalidation or failed confirmation denies qualification without removing readable candidate/result.

The original atomic write transaction can leave an unconfirmed private token if a later write aborts. That token remains non-authorizing and bounded. After closure reports COMMITTED, reuse the original completed hook to perform a distinct actual readonly confirmation. Its COMMITTED branch cannot redispatch providers or create another job/attempt. On failure remove the token; preserve truthful committed domain state.

## Exact durable confirmation and adoption transaction

Confirmation must read the original atomic job, candidate and **every** named child attempt and qualifiedCoverageId row through existing repository APIs. Check known atomic discriminator/mode/type, exact complete child order/set, childCoverage cardinality and disjoint exact union, exact committedCoverage, original evidence signatures, and current authoritative qualifiers. Do not broaden domain-commit-evidence's financial reader, which intentionally refuses atomic jobs as UNSUPPORTED.

Every attempt must have its own canonical ID bound to the same job/child, expected sequence and attemptCount, COMMITTED state, exact unique operationReceiptId and original execution qualification. Missing, repeated, foreign, rebound, mixed/unknown/rejected/uncommitted attempts refuse. Compare each privately retained provenance item to the corresponding committed generation child; reject duplicate operation identity even if the shape validator accepts it.

Every original ACK must be the exact expected row ID and bind that job, sequence, scope, facet, unit key, signature and committed outcome. The original ACK stores sequence, not a childId field: require its sequence to identify the unique original childCoverage partition containing that unit; do not invent a new persisted ACK field. Complete expected unit keys must be distinct and their union equal the original full job coverage. Missing an earlier row must refuse even if aggregate job metadata and maximum sequence look complete. No rescan/repair, ACK recreation or direct candidate publication is part of this cache operation.

At adoption retain the original immutable operation digest/receipt, proposal cryptographic verification outside IDB, exact-byte comparison inside IDB, revision/candidate-key/source binding and original applyAIPresentationCandidate/protection logic. A shared internal cache-binding owner can dispatch between unchanged legacy proof logic and the narrow V3 variant; do not implement a second candidate reducer.

The V3 variant must compare the actually resolved projection **and manifest** to the captured full candidate proposal, require all-adopt/no kept/no protections and the same base-none candidate/generation, and recheck the confirmed capability's durable job/children/ACK identity in the existing adoption transaction. Checkpoints retain their original V3 full-adoption advancement. The intended binding snapshot must match the current full evidence/profile/style/restore state after that owner advancement. Final synchronous ownership/control fences after awaits must still reject pending style/gate changes. If any check cannot be established, delete an inherited cache binding and preserve ordinary readable/adoptable behavior without stamping one.

Only the original successful adoption/receipt transaction stamps the unchanged cacheBinding at the actual new presentationRevision. Abort rolls back cacheBinding, presentation/history/checkpoint and operation receipt together; same-operation retry adopts once. Adoption/disposal consume or remove the process-local token through the original paths.

## Genuine V3 cached read, separate from delta dispatch

Only an already exact saved cache decision may select the read-only cache branch. For that branch derive complete current evidence **descriptors** from the existing Topic snapshot/current known descriptors and input dependencies, retaining current signature/removed/fenceOnly checks and the original aggregate100 bound. Do not add bodies to an authority DTO. Do not manufacture empty-coverage permission or use incremental selected0 to bypass authority.

Dispatch planning/assembly continues to use only original delta selected inputs and original 20-input/byte physical bounds, with no changed partition or fifth child. Without exact cache admission, empty delta remains the existing NO_DELTA and produces no job. A genuine cache path passes full current evidence/coverage to the original Foundation authority/current owner and retains exact trusted-profile, gate/restore/style/evidence/control, handle ownership and post-await fences.

Pass the explicit original incrementalVersion and qualifying physicalChildren/refreshStyle parameters consistently in prepare and cached read proof comparisons; retain the default legacy call behavior. Reopening a qualified V3 saved result through a new local session can read the persisted unchanged binding, but cannot recreate unadopted private proof. CACHED preparation/run must create zero jobs, attempts, usage reservations or provider calls. It grants no new financial/remote execution authority.

## Necessary future author tests and file ownership

After independent design approval, the narrow runtime writer would own only core/organizer/local-organize-session.js and core/organizer/ai-presentation.js plus new owning cases and the necessary original AI native extension. Existing Foundation/candidate/V3/qualification/schema/financial owners are reused unchanged; any genuinely required extra owner returns to the coordinator for a scope decision. Do not run a new provider/model or modify CI/version.

Positive paths must use actual typed Entries/placements, session prepare/assemble/dispatch, atomic closure, candidate and original adoption. Exercise40/60/80 Entries and2/3/4 children; verify one generation, exact coverage/receipts, first full adoption, repeated20 cached opens/runs and a fresh-session cache read with no new job/attempt/provider calls. Demonstrate all three styles using fixture mechanics only. Preserve existing single-child identity/read/cache regression.

Negative tests use original owners or explicitly marked fault injection: earlier ACK hole/max-sequence trap, earlier UNKNOWN attempt, missing/duplicate/foreign child and operation identity, coverage/signature/manifest/candidate/style/profile drift, stale gate/restore/purge/control after await, malformed current descriptors/overflow, held candidate invalidation, old/mixed/imported generation, partial/kept/protected/human edit, cross-store/disposal/eviction/cold unadopted proof. Verify refusal preserves reading/protection and never remints possibly billed work.

Inject candidate/final-ACK/receipt abort and confirmation-read failure; verify full-store rollback at write boundaries, non-authorizing private remnants and exact retry without provider replay. Verify repeated genuine cache reads remain zero attempts under authority revocation and final control drift. Then complete the relevant whole owning files and one necessary original source/release native file, using unchanged budgets and privacy/canonical snapshot assertions. Preserve failures and exact source hashes; local fixture passes cannot certify Qwen quality, financial settlement, remote/main or installed delivery.

## Frozen audit dependencies

| Relevant owner | SHA-256 at audited main/037/038 |
| --- | --- |
| core/organizer/ai-presentation.js | `8ac5ef7658a691e3699af2c60e6b3d9eb25f0a335331f20c2ec7539873c79190` |
| core/organizer/local-organize-session.js | `238e47eff0de412161a992de065e12d97a1c2d006fb38414858e3fb0bfd8058c` |
| core/organizer/ai-incremental-v3.js | `4d3e80f1618edd6d17149beb95cc6831d852df7beff0b4fa833a7c19b2f550a6` |
| core/ai-usage/foundation.js | `62b5d166913eb2239cefe41a143966091640f7b0715419a9d1080bf24cb0117e` |
| core/ai-usage/domain-commit-evidence.js | `b39eb9c4bd8ac7f6b144da96bea714b29e97ab82b9850c815416822beceea68b` |
| core/ai-usage/maintenance-batch.js | `407041072ee8c02599135aa7ff5d9e3aff0b7413521d48db0e5df73b919e1c00` |

These freeze the audit's relevant owners; they are not a claim that every transitive/native dependency was executed or the newest remote head is accepted. This design adds no test/run-success to the previously recorded probes. Independent review and a separately authorized runtime batch remain next.
