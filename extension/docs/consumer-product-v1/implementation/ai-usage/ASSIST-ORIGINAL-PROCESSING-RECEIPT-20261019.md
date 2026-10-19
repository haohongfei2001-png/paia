# Assist original processing receipt retention — 2026-10-19

Base: PR302 head `2f0de1f1444ae5cde5da400ab712d0c9ec5c6459`.

## Existing consumer defect

The original Assist Context helper cloned each processing/discovery receipt and later passed the clone to its issuer. Two exact-object/WeakMap issuer controls fail on the original source. This is a source compatibility failure, not proof of a configured production identity.

A separate exact-base safety matrix observes the real original session/store/provider fixture. After discovery's issuer changes the earlier processing issuer's raw scope revision, expiry or array properties, the original consumer accepts each run: one physical fixture send and one result ACK each. A new resolve that replaces an old receipt field with an accessor, and a late nested accessor replacement, also produce one send/ACK each. A native AbortSignal can be masked by an own aborted accessor with its notification intercepted; the old consumer reads that accessor3108 times and still sends/ACKs once. Ordinary unmasked abort already rejects with zero send/ACK, and is retained as an existing control. The9-test exact-base result is1pass/8fail: two lawful-issuer availability failures plus six distinct unsafe-currentness cases. Test logs contain only synthetic counts/stages, never user data.

## Narrow repair

Keep the original raw object for its original issuer. Store separate module-private closed descriptor facts and a frozen metadata-only scope snapshot, bound to the exact store/repository/database and issuer functions. Scope capture is bounded to32KiB,4096 keys and depth16, rejects accessors, exotic/inherited object shapes, holes, symbols and non-index array keys. It does not grant or select new material.

Before and after original issuer callbacks, validate captured descriptor identity, scope, first expiry, clock monotonicity, native AbortSignal internal state and the original handle's state. The final group facts pass invokes no issuer again; a later issuer cannot silently revoke an earlier raw receipt. Reauthorization compares privately captured scope/epoch/deadline/signal only after revalidating the old receipt, without executing a newly installed raw accessor. Expired/changed records are retired. Existing source selectors, field grants, lineages, financial/domain owners and bounded relevant material remain authoritative.

No local processing issuer, new configuration, endpoint, identity, permission or model installation is introduced. Four production configurations remain default-null. This correction is required for the existing consumer even in that default state.

## Frozen local evidence

Seven existing Assist selector/private-session/intent/automatic/source-configuration/relevance files pass309/309, zero failure/cancel/skip,22570.698156ms. All1485 available source/dependency files are byte-identical before and after this run. Only the existing helper and its original test file differ from base; this receipt is added after execution. New nested-accessor and native-signal controls report zero getter reads, zero send and zero ACK on the fixed source.

The original nine-control RED log, intermediate306/307 greens and the final309 retain separate identities. An early test mistakenly retained the latest newly resolved receipt rather than the original retained receipt; that fixture error and its synchronous-throw mismatch remain in their original log and are not called product vulnerabilities. Exact-base observed-original logs are the proof of the defects listed above.

These are original-owner mechanism tests with synthetic provider/store fixtures. Exact new-head Full/native/browser integration and actual service/profile/semantic quality remain separate requirements. Earlier exact-head native success is not relabelled as this repair's native evidence.
