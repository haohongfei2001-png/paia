# Selection reservation module boundary

2026-10-25, read-only architecture follow-up. No runtime changes or test execution by reviewer.

The attempted static core selection -> background lifecycle dependency changed the initialization path through the existing store graph and produced an observed thought-store-owner originalConstructor TDZ. Preserve that failure. Dynamic import is not an acceptable MV3 service-worker workaround. Changing unrelated store initialization or registering caller-supplied readiness callbacks is outside the narrow repair.

## Immediate separation

Root independently repairs the original core's demonstrated asynchronous lifetime gap using the private prepared/lifetime records and constructor-captured storage methods. The final synchronous check must follow every preceding await and immediately precede captured original SDK dispatch. This needs no reverse background dependency and grants no new authority.

The original lifecycle may retain its own private issued-token registry and exact original owner binding, using the core's read-only readOriginalApplicationSelectionReview query. That query gives prepared identity, not readiness or mutation permission. Until an exact consumer exists, the lifecycle token is not consumed by core activation. The core lifetime repair is not a complete lifecycle/global hold.

## Deferred integration constraint

A leaf registry alone cannot authenticate its registrant. An exported arbitrary binder or checker can register caller-reported readiness; an unregistered fallback is particularly unsafe. Moving the registry without solving issuer provenance is insufficient.

Future exact integration may investigate core-private restriction records that only narrow a newly constructed original owner, with control capability held privately by the original lifecycle. The lifecycle must retain its private factory identity and complete accepted-entry bookkeeping. Such a restriction must not claim independent lifecycle/global authority. Fixed configuration provenance and synchronous live isCurrent observation must remain real; stale snapshots and caller booleans cannot substitute. No new generic authority framework is recommended before the real global consumer and full owner set exist.

Token-to-core consumption and complete host/global qualification remain outstanding. Existing cold UNKNOWN, once/ambiguous SDK semantics, budgets, and the closed global command gate remain unchanged.
