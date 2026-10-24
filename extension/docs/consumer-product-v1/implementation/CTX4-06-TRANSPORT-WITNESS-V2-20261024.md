# CTX4-06: bounded original transport witness value v2

Date: 2026-10-24. This is a source/synthetic prerequisite, not transport activation or application-selection qualification.

## Source identity and scope

Base: `1632908ab836738ea8c1f57308ae7c2610f670ef`. Before implementation, the exact reviewed three-line same-Store identity seam was imported from coordinator commit `72cf92b9203452b887e6bd1b54bcb6b7837ff716`, tree `5e2c5c41902f34819a81bdfb91f968d80a9c1386`. Its Context source hash was `25f1054c268ea605d03bc771c66962ac5d8b10f98307865ea8caade81f1eca28`. That seam remains unchanged.

The final Context runtime SHA256 is `93d1a8b633d5e773621679e8deb96d9b907968dd86576f1b8f10e55bef2db961`. Only `background/context-connections.js`, direct owning tests, their frozen prior-reader fixture and scoped evidence change. There is no host, repository, schema, Backup, Sync codec, activation route or selection-marker change. The encompassing coherent integration owns its single product-version increment; this value-version contract is not a separate installed release.

Read together with [the original finite-authorization checkpoint](CTX4-06-PERSISTENT-AUTHORIZATION-CHECKPOINT-20261018.md), the current CTX4-06 plan and [BNS-03](../BROWSER_NATIVE_SYNC_CONTRACT.md). Existing external prerequisites and all other plan obligations remain.

## Exact local value contract

The key remains `context-connection-runtime:v1` in the original repository's `meta` store. There is no second journal or new store. The exact v2 value is:

- Original `id`, `operationId`, registry-publication `phase` (`pending` or `settled`) and exact registry `row` remain independent publication facts.
- `version` is 2.
- `transport` has exactly `version: 1`, `legacyUnknown: boolean` and an `exposures` array of at most eight exact claims.
- Each claim has exactly `id`, `profileId`, `databaseId`, `restoreEpoch`, `connectionId`, `generation`, `configurationGeneration`, `hostNonce`, `closeGeneration` and `state`.
- The claim ID is a fresh UUID. The source configuration generation is SHA-256 of the exact qualified configuration, extension identity and fixed native-host identity. The connection generation and its next expected close generation must be safe integers. State is only `unresolved` or `closed`.
- Claims contain no Context body, raw bearer, private caller DTO or native-port object. The existing registry-publication row still contains its original one-way credential hash and authorization metadata, not a new portable grant.

Unknown versions, extra fields, malformed identities and unsupported state values fail closed without rewriting the evidence.

## Exposure and closure ownership

The original private NativePort may be created before hello; the original host cannot listen before configure. Before configure, ContextConnections must commit the fresh unresolved claim by exact complete-witness CAS, then recheck the original repository and physical database handle, restore epoch, admission, pairing row, current permission and exact witness. Configure is synchronous inside the final original readonly transaction, preventing a competing witness write between the final durable check and send.

Only the callback bound to that same original private port may validate its exact nonce, expected close generation and `closed-listener-ack-v1` ACK, then CAS that exact retained claim closed. Closure changes only that claim's state. It does not settle or rewrite the registry-publication operation, phase or row. No listener fact comes from an empty map, registry clean flag, caller-supplied DTO, replacement host, timeout, disconnection or process exit.

A late exact original ACK may close its still-retained original claim. It cannot revive the failed hold or handover, start a replacement, retry selection or clear another unknown exposure. A later attempt independently requalifies the current original state. Missing, closed or replaced claim identities never recreate an old claim or close a replacement.

A transaction rejection with an unknown commit result causes no blind retry. Only an exact durable reread of the proposed complete witness, through the same original database and restore epoch, can confirm it. Otherwise configure/closure success is refused. A crash after claim commit but before configure conservatively leaves unresolved evidence. ACK observation without confirmed closure commit is not closure.

## Bounded retention and closed-slot replacement

Registry publication, reconnect, renewal, suspend and resume preserve the transport evidence. Unresolved and legacy-unknown evidence cannot be evicted or downgraded.

The only compaction is the exposure-install CAS itself. It may replace one durably `closed` slot with the fresh unique `unresolved` claim in that same exact transaction, preferring a closed slot of the same connection or using another closed slot when full. Every other claim and the sticky legacy flag remain unchanged. There is no cleanup on read, ACK, selection or registry publication. Old ACK replay cannot recreate the replaced identity. This avoids an eight-reconnect lifetime limit without discarding uncertainty.

Eight retained unresolved claims cause refusal, not eviction. Known exhaustion is refused before another NativePort is created; the exact install CAS independently rechecks capacity for races. The preceding confirmed registry publication can already have advanced its revision/generation, consistent with the existing failure semantics. Pair/change acknowledge registry pairing, not an eventual asynchronous native-ready handshake.

## Migration, restore and rollback

- V1 `pending`, `settled` and clean-looking records do not contain closure evidence. On an explicit original-owner transition, their meaning is retained as sticky `legacyUnknown: true`, never translated to closed.
- A previously observed nonempty registry without a witness is also legacy-unknown, including after stale-profile replacement or a later empty/absent registry observation. Registry disappearance is not host closure.
- The frozen actual v1 reader rejects the newer value and leaves it intact. Downgrade does not delete or coerce v2 back into reassuring v1 data.
- Restore-epoch changes and replacement of the original physical database handle invalidate the original binding. Stale-profile replacement preserves prior unresolved claims. An old-epoch ACK cannot close them after restore.
- The existing Backup allowlist excludes the same key; importing it as portable organization state is rejected. The original Sync codec registry/checkpoint excludes the witness. No export, restore grant or codec was enabled.

## Selection boundary remains closed

Positive cold Context hold remains disabled, even when every durable exposure is closed. Existing cold nonempty-registry refusal, original instance-bound tokens and global activation restrictions remain. This witness alone is not an activation capability.

Every witness mutation changes the original raw source rows. The actual original selection test pairs first, prepares the complete existing cut, and then changes only an existing exposure from unresolved to closed through the original ACK owner. Activation rejects the stale prepared cut with `GENERATION_SELECTION_CHANGED` and writes neither source nor target marker. There is no exemption, refreshed prepared snapshot or marker workaround. PREPARE and ACTIVATE/CONTINUE/RESTART routing are untouched.

## Exact verification and retained failures

Evidence is under [`work/context-transport-witness-20261024`](../../../../work/context-transport-witness-20261024/).

- Original base RED: 0/4 pass, four expected failures, no skips or cancellations. One control directly observes original configure escaping when its required exposure write would abort. Log SHA256 `2665cc1c37e7193a92c8ce6fb680415795af879e1e073cc93934a80b90cead65`.
- First complete synthetic run after implementation: 44/45 pass. The sole failing old oracle expected the entire witness to remain unchanged after a close ACK. The owning test now requires exactly the intended single claim-state mutation while preserving pairing, publication phase/row and zero Chrome registry writes. That failed invocation is retained separately.
- Final seven complete owning files: **135/135 pass**, zero failure, cancellation, skip or todo. This includes 45 new witness cases and all 41 original synthetic quiescence cases. Log SHA256 `9e25ce722e87ee3037c3b7ae6e1401c8eab7dd7be8947d49b5dd0dcc716cb1b8`.
- New owning test SHA256 `67724b845b3104be56679be0cec3c5cbedfcc655fef8dcae0b15c9c2eca63034`; quiescence test SHA256 `39c573e02635c47ac21727ad436561a3c90058e92a48e2570bc68b8d4ad22603`.
- Frozen actual v1 fixture SHA256 `3f22c411fa59d21ebb0100c67d613abe469ea6517b4bd043d07d34ac6077a443`, byte-identical to base Context source. It is used as an actual old reader, not a duplicate compatibility predicate.
- Static package check: **24,526 guardrails / 680 runtime resources pass**. `node --check` and the source/test `git diff --check -- extension` pass. Raw failed-test logs retain their original diagnostic whitespace and exact hashes. Static log SHA256 `c5e560d7f6a44d6a053b7637b269c11bc0540f7a9a219a3028d54c06a4364ece`.
- Independent review is CLEAN for runtime `93d1a8b6`. The separately retained review records resolved legacy-history and original-database-binding findings, genuine intermediate RED/mutation controls, independently rerun owning files and three separately authored controls. Final independent 135/135 log SHA256 `0836cef1a083be84a14df320b7323d9985139b3ca6a8c6835fd7d763186647d0`; report SHA256 `f57ae8572fa9affdcb1b232aee594e8a7eb085d865bfb6bcaf405cd27783bdd2`. They are preserved under the evidence's `independent-review/` directory; overlapping reruns are not additive coverage.

Exact final owning command from the repository root:

    node --test extension/tests/context-transport-witness.test.mjs extension/tests/context-connections-quiescence.test.mjs extension/tests/context-read-publication.test.mjs extension/tests/context-connection-policy.test.mjs extension/tests/privacy-context-bridge.test.mjs extension/tests/context-receipt-portability.test.mjs extension/tests/context-connections-ui.test.mjs

All data and ports are synthetic. No actual native host/process/listener, browser, Full/C-phase, 129/100k qualification, account, paid call, installation, deployment, live provider or actual user data was used. The native-spawning `context-connections.test.mjs` remains unrun under the current boundary. Final composed integration and any future separately authorized native/live acceptance remain separate obligations.
