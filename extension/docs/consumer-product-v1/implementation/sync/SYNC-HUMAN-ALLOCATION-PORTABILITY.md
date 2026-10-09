# Human ordered allocation: semantic stream and local index slots

Design/audit amendment awaiting independent review before runtime. `sync-human-index-portability-gap.test.mjs` calls actual `ensureThoughtTopicIndex`, then actual bound `editTopic`; replay into an unindexed installation fails `BNS_HUMAN_ALLOCATION_CHANGED`. Before evidence `/tmp/human-index-portability-before.log`: **0 PASS / 1 FAIL**, 132.116083 ms. No canonical assertion was weakened. Both single receiver and future grouped replay must support different local projection states.

## Exact required event protocol (unpublished Human family)

Every event has exact keys `{kind,role,ordinal,value}`; an index event additionally requires `afterDomainOrdinal`.

- Domain clock: `kind='clock', role='domain'`, valid original timestamp.
- Domain UUID: `kind='uuid', role='domain'`, existing bounded valid domain identity.
- Local index generation: `kind='uuid', role='index-generation'`, a nonempty `[a-zA-Z0-9_.-]` generation identity of at most 80 characters (the existing owner normalization, with no Date.now fallback in a bound plan), plus the exact preceding domain ordinal of the **original Topic touch clock**.

`role` admits only `domain` and `index-generation`; clocks cannot be index-generation. Ordinals start at zero, strictly contiguous per role. Domain ordinal covers clocks and semantic UUIDs in their original shared order. Required descriptor `allocation={domainCount,indexGenerationCount}` exactly equals the validated two streams. Index events remain interleaved at their original sender positions, with exact `afterDomainOrdinal`; they are not a separate arbitrary bucket. Event count and canonical envelope remain inside the existing complete 128-operation/4 MiB limit.

No compatibility fallback silently treats absent/unknown role or ordinal as domain. This required family has not shipped; its exact shape is amended in place. Frozen exact 0.33 readers still reject every member/commit/publication cut before materialization. Protocol envelope/storage schema/permissions are unchanged.

The earlier private pre-role Human implementation already knows the family. Freeze its actual Core/codec and complete recursive dependencies at `963d3985` or `4bb43dfa`, with exact Git blob/SHA verification and no test-time Git/network. Its actual `prepareHumanReceive` must reject the new required descriptor/full group before canonical/Core/mapping writes; snapshot every actual store to prove zero writes. This is separate from 0.33 unknown-family refusal. Unchanged member shapes alone are not claimed to reject in the pre-role decoder: complete-family authority still requires the now-incompatible exact descriptor.

## One explicitly recognized optional slot per actual Topic touch

The existing `reserveTouch` always records its original clock first. It then opens one private index-generation slot anchored to that just-consumed domain ordinal, invokes the original complete `planThoughtTopicInvalidation`, and closes the slot. The actual original index metadata decides whether its lazy generation callback allocates a local UUID. No metadata from the sender is installed as receiver index truth.

During replay, the private slot may consume **at most one** sender index-generation event at that exact position/anchor. It never accepts another role, another anchor, multiple index events, duplicate ordinal, a clock or a domain UUID. A sender index event elsewhere remains unconsumed and the next domain reservation or final seal refuses. There is no generic skip filter. Every sender domain event is consumed exactly once and in original order, and the final seal proves the declared role counts were fully accounted for.

If receiver index state needs a UUID, it reserves its own `store.uuid()` outside the final transaction and records a receiver-local index-generation event for that slot. If it needs none, it records none. Sender index UUID bytes are not reused as receiver truth. This affects only private physical projection generation; Entry/Topic/Section/Placement/history IDs, original timestamps, windowStartedAt, protections, intent, before/after, request and causal identity remain exact wire semantics.

There are no derived clock events in the observed owner. All existing touch, journal, prune and receipt clocks remain in the domain stream and replay byte-for-byte. No new timestamp or coalescing window is invented to accommodate projection differences.

## Final original writer qualification

The prepared local allocation capability contains the exact receiver-local events, role ordinals and counts. `humanUuid` defaults to domain for original canonical/history calls. Only `humanPreparedGeneration` requests `index-generation` in the original index owner's already existing lazy callback. Transaction consumption checks kind, role, ordinal, store/capability, position and full exhaustion. It cannot reclassify a canonical UUID as an index UUID or ignore an unused planned local slot.

The original complete pure index transition predicts every local metadata field, and final original execution must match that complete metadata. Namespace/secret/epoch/permission and the original index read-set remain rechecked before any mutation. Default/unbound stores continue to call their original clock/UUID with the same conditions/order; no global override or clock/UUID replacement is introduced.

## Actual-owner oracles and negatives

Run the actual original store/index owner and both receiver paths with sender/receiver independently unindexed, building and completed states. Include sender indexed→receiver absent, sender absent→receiver indexed, both indexed with different local generation IDs and metadata, and repeated touches. The same semantic canonical rows/history/IDs/timestamps must equal after qualifying only previously approved installation-keyed/physical sequence mappings. Local index metadata must equal the receiver's original pure owner transition and local UUID allocation, not sender metadata.

Negative cases: unknown/missing role, non-contiguous/missing/duplicate ordinals, incorrect counts, index clock, duplicate/wrong index anchor, index outside an actual touch, domain/index role swap, missing semantic UUID/clock, collision and leftover events. Every refusal leaves all actual stores/Core/mapping/outbox unchanged. Preserve the original 0/1 before failure and all later failures. Native source/release evidence must cover the exact amended codec/allocator/original writer hashes; earlier 0516523f receipts cannot certify this amendment.
