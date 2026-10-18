# Maintenance source-owned structured response — 2026-10-18

## Scope and state

This successor closes the source-code response-adapter gap recorded at source baseline `8275d54b1061922aacf827ea3900fddaacf4a64e`. The configured Maintenance client now supplies its own decoder. External service configuration cannot supply `responseAdapter` callbacks, and the former fixture `{data: string, childOperationId}` response is not a qualified source contract.

This is scoped development evidence. Packaged configuration remains null. No production identity/profile/tokenizer/allowance, provider request, new permission, financial owner, deployment, installation or new Sync functionality is activated. General existing automatic Context Item baselines are not present in an ordinary Input payload; their UPDATE/NO_CHANGE/REMOVE_CANDIDATE proposals remain explicit DEFER pending their separately qualified baseline path. That missing state is not guessed or discovered by scanning the profile. Broad acceptance remains deferred.

## Source contract and original owners

- `maintenance-service-response.js` exports the exact closed, required-field, bounded schema. Global citation indexes and flattened additional placements satisfy both the original Qwen schema depth limit and the existing complete-current-binding snapshot depth. No unions, optional properties, open JSON strings or unbounded arrays were added.
- `maintenance-service-client.js` requires this exact schema before tokenization/declaration/reservation and on subsequent qualified profile reads. The original signed declaration, reservation, provider, usage settlement and result-reporting owners are unchanged.
- Own-data snapshots reject accessors without invocation, symbol/non-enumerable/sparse/cyclic/aliased structures, excess bounds, unexpected fields and inconsistent empty sentinels. Logical job, physical child and original operation-receipt correlation stay exact.
- Topic assessment retains the original formation union, claims, exact Input citations, existing identity relations, Entry mappings and Section semantics. Fresh original-owner Inputs, sent identities, Sections, constraints and mapped Entry descriptors must match the sent semantic material. The original Topic transaction and exact subset ACK remain the sole publication authority.
- Context ADD uses exact sent coverage, selected Input revision/body, bounded metadata-only Context preflight and original lineage proofs. Human Placement, authored Entry, Input-bound human fields and structural Topic/Section mappings preserve their original independently qualified scope. Input hashing is outside IDB transactions, followed by the bounded exact original read fence. The adapter never hashes unrelated whole-Topic bodies.
- `$result` is admitted only from the session's actual same-child committed create/reuse Topic result with exactly one ID. Explicit Topic IDs must occur in sent material. No name lookup or inferred existing Item state is allowed.
- Selected human Context correction uses its actual sent Item/proof/revision and the session's original evidence/association metadata. It reaches the original protected owner and acknowledges NO_CHANGE without overwriting human text.
- A module-private branded DEFER carries exact same-child facet/coverage and, for mixed Context responses, validated supported groups. The session validates the disjoint complete partition, commits supported groups through existing owners and defers only the remaining exact units. Cloned/forged declarations cannot acquire that brand. Deferred work does not count as an effective result or trigger paid replay.

## Private lifetime

The client privately registers at most 16 exact qualified child payloads. Successful final-facet decoding and final-facet DEFER delete their Map entry; permanent decoder failure, lost currentness, a throwing currentness owner, abort, explicit child/job release and disposal also delete it and detach its abort listener. The shared session releases original bindings on unknown/timeout/error/output-discard/revocation paths. Prepared transport disposal precedes facet decoding and therefore does not prematurely delete a successful child. Only validated original domain groups/prepared plans remain for a storage rollback retry; there is no persistent response/body cache.

Tests prove deletion by successfully registering the same child ID after release, rather than only observing a stale refusal while leaving its private entry present.

## Verification

Final focused command on Node `v24.19.0`:

`node --test extension/tests/maintenance-service-response-adapter.test.mjs services/ai-gateway/tests/maintenance-client-path.test.mjs services/ai-gateway/tests/maintenance-client-recovery.test.mjs services/ai-gateway/tests/maintenance-source-response-path.test.mjs`

Result: **137/137 PASS**, zero failures, skipped, cancelled or todo; duration 25,694.675302 ms. Breakdown: source boundary 39, migrated original signed client path 35, original cold recovery 43, new signed source-path cases 20. These are one combined focused run, not a whole-product or performance total.

The signed synthetic fixtures exercise actual source client, signed identity/declaration handlers, original financial ledger, Qwen validator/provider response parser, original Topic/Context/Filter transactions and exact ACK/report/recovery. Only SQL and HTTPS/provider transport are simulated. Covered paths include new Topic continuation, 21 Inputs over two immutable children, post-Topic human Placement/Authored continuation, bound human fields, selected human correction, positive Filter, schema refusal before reservation, swapped identities, coverage/unknown-ID/sentinel refusal, candidate `$result` refusal, complete and partial DEFER, rollback retry, revoked/unknown attempts, partial-child cold recovery and zero redispatch.

The Section owner's separate source-adapter cases cover default and named human Section interpretation through ASSESS/internal_aspect, original Topic NO_CHANGE ACK and Context lineage. They retain their own command/count evidence; they are not added to the 137 total.

Node22, real PostgreSQL for these client fixtures, live provider/tokenizer/semantic quality, native browser/release parity, installation and broad acceptance are **NOT_RUN** for this slice. Existing prior evidence retains its original source identity. No old pass is relabelled as this source's native/provider acceptance.

## Retained development failures and review findings

- The first service run was blocked by absent `pg`. The coordinator subsequently supplied the existing lockfile's dependencies in the workspace; no substitute SQL shim was used.
- An early expanded schema exceeded the unchanged generic whole-manifest/current-binding snapshot depth. The response representation was flattened rather than raising that limit. An early 21-Input development probe also exposed WebCrypto work inside a read transaction; hashing was moved outside, with the exact read fence retained.
- The first new unit fixture accidentally populated Filter decisions in an absent facet. Its two positive tests correctly failed; the fixture was corrected and every boundary case was rerun against a valid baseline.
- Cold-recovery callback migration initially keyed a nonexistent payload `childIndex`, so the unchanged partial-result oracle failed. The synthetic fault now targets the actual second physical request and supplies an unknown Topic to the genuine source decoder. The full 43-case recovery suite passes without changing its assertions.
- Review found private payload retention after all-DEFER, unknown and invalidation paths, and the swallowed Topic DEFER seam. The original session/source owners now release exact private state and preserve only authenticated same-child DEFER. These were implementation findings, not waived gates.
- Actual original-store rename and Section-title injections immediately before original Topic preparation already refused under existing guards. They are preserved negative controls, not a reproduced historical exploit. The adapter additionally compares its own complete sent/fresh semantic snapshots, with four direct boundary regressions and successful multi-child/following-path controls.

Frozen source runtime SHA256:

- `maintenance-service-client.js`: `f981925ed8505c3a8569e971776ea26677165c03a1154fcefc5d095392fe1eb1`
- `maintenance-service-response.js`: `9af6b7a7913cb51f680c09e25ae992e9c7c3c38db8af3894a637d68926ad8ad5`

The exact integrated checkpoint, package/version identity and any later verification belong to the coordinator's shared progress record. This receipt makes no remote merge, installed-product or whole-programme completion claim.
