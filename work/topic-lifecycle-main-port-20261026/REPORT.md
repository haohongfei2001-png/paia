# PT-08 original lifecycle consumer — 0.55.17 candidate

## Identity and scope

The local implementation base is `3b7e25d520de6e642e7c13521c268e7ef7f21af6`, tree `398e501f29438a203a2785ac838cfc9befbeafab`. The actual tested candidate is `2a13b1f4a3fa77809326cfed07a96524d9e168ce`, tree `ad61b4c8b3b5a236b1a7ca62d5dc9b9be31afc0b`, still carrying version 0.55.16 at execution. This successor changes version metadata to 0.55.17 and adds this public evidence; it does not relabel the original execution or claim it was rerun.

This converges the existing CPV1-TOPIC-02/PT-08 explicit prepared-handle consumer, originally developed in `9f0b23a7e72c5b666b4a79ecfdafb16b46fe9434`, `647ab06f0f4c90255f3b6d31982c6eeb8ba3f558` and `6b1f483633803461cae31ca5efc4eea9cde3d7f4`. It is not a new scheduler or a redesign of the existing versioned 90-day candidate policy.

## Preserved original owners

- Original Maintenance preparation selects exact Topic/Input/Entry mappings and supplies a private handle, not caller-provided authority.
- Independent source identity and field grants retain their original currentness, complete membership, Source, human keep/pin/lifecycle protection and restoration guards.
- The original lifecycle writer retains activity metadata, restrictive-path checks, journal/receipt ownership and final transaction fences. No model response or automatic startup triggers promotion or dormancy.
- Initialization, qualification reads and original writes explicitly carry the same existing work ticket. The original 4,096-reference / 2 MiB allowance and first deadline are not replaced or refreshed. New inactivity execution without that ticket fails closed; the pre-existing direct lifecycle API remains separate.
- Original per-entity revision retention is unchanged; its opted-in lifecycle traversal uses the existing Repository reader/deleter so the same physical ledger observes it.
- No Sync, Repository, IndexedStore, provider profile, service configuration, credential, permission, default activation or deployment change is included. Production configuration remains default-off.

## First and only new execution

Command: `node --test extension/tests/topic-lifecycle-main-ticket-binding.test.mjs`.

**3/3 passed**, zero failures, cancellations or skips; 1,524.276381 ms. The raw original Node reporter output is preserved verbatim in `first-new-main-binding.tap`; despite that filename, the output is the default spec reporter, not a converted TAP stream.

1. A fresh cold original Store prepared and completed the selected lifecycle action through **69 transactions, including 51 preparation transactions**, all using the same original ticket. Exactly one lifecycle receipt was observed; provider execution count was zero. The original deadline was not renewed.
2. Consuming the original allowance caused the single attempted dispatch to refuse without a replacement ticket, mutation or new receipt. Provider execution count remained zero.
3. A competing dispatcher was refused; an unrelated ordinary Store read had no lifecycle ticket. The original dispatcher still settled successfully, with zero provider execution.

No historical suite or exhausted historical test was rerun. These three new synthetic controls establish only their stated main-binding outcomes.

## Static evidence and remaining qualification

`STATIC-LINK.json` records **252 production modules parsed and linked only** with `vm.SourceTextModule`; module evaluation was not performed. Changed-file syntax and diff-whitespace checks passed. `SOURCE-MANIFEST.json` records exact tested runtime/control blobs and SHA256 values; they remain unchanged after this metadata/evidence successor.

This is a local candidate, not main publication, original full CI, native IndexedDB/Chrome, browser acceptance, real provider/service qualification, semantic population quality, installation or deployment. Null service/currentness configuration and empty provider-profile installations remain unchanged. Those external qualifications are not supplied by local synthetic results.
