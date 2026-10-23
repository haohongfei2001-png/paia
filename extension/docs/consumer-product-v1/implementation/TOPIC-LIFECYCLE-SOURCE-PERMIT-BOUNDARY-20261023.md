# Lifecycle dispatch: actual source processing boundary

This test-only successor to `063adbc82bbe57fc0a9dd78b06e26c44a140839b` does not modify a processing issuer, purpose, runtime, or native registration.

The original `TopicProcessingAuthority.authorize` asks its configured issuer for the exact `personal-topic-identity` scope: version, binding, restore epoch, Input IDs and Topic IDs. The original `createMaintenanceSourceProcessing` accepts only a private same-transaction qualification/payload request permit, tied to the original selected Input descriptors, service-client lifecycle, caller, budget, child coverage and exact scope. A permitted `ai-maintenance-qualification` field receipt is not an identity-processing receipt. A structural/placement handle cannot be relabeled as an Input selection, and a two-argument identity resolver cannot mint the missing original request permit.

Accordingly, this package deliberately does not add a purpose or broaden `originalPermit`. The current lifecycle dispatch package is a real local consumer of a private prepared handle and an independently configured genuine Topic identity issuer, qualified with synthetic identity receipts. Its source-owned identity issuer integration remains unavailable. The source-owned field-processing permission cannot be used as a fallback. Default host dispatch remains inactive.

## Executed boundary test

`topic-lifecycle-source-processing-boundary.test.mjs` uses the real maintenance consent owner, saves explicit ON in synthetic storage and verifies a live original purpose capability. It then uses the actual source processing implementation as the processing provider of the original `TopicProcessingAuthority`. The identity request is refused. Direct identity and field-shaped calls with absent/empty/public fabricated permits are also refused, with zero semantic reads and unchanged all-table contents. The original purpose capability remains valid, so this is not a false positive from an OFF or revoked consent switch.

One new case passed **1/1**, Node22.23.3, TAP218.932666ms, no fail/cancel/skip/todo. `work/topic-lifecycle-source-boundary-20261023/owning.tap` retains the raw result. This checks refusal of a missing/forged original permit; it does not claim testing a real positive permit against an altered scope. No browser, build, network, model, cloud, installation or old owning suite ran. The separate native bridge remains the original **18** cases per Source/Release variant.

## Required later integration

A legitimate next implementation needs an explicitly defined independent identity-processing issuer contract for the exact selected Topic/Input scope and its own current/revocation facts. Reusing a field qualification receipt or serialized policy as that grant is forbidden. The private same-transaction handoff can bind such an existing genuine issuer when it is supplied; this report makes no claim that the current source-owned field issuer supplies it. Any such contract must preserve the original caller, selection, deadline, shared budget, exact purpose and terminal revocation checks before host dispatch can be enabled.
