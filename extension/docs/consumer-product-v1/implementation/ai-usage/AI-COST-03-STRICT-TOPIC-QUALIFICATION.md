# Strict qualified identity traversal for the promotion bridge

This optional original-reader seam supports the separately approved promotion work. It does not implement or certify the production promotion bridge, a second provider call, or completed candidate Maintenance.

`TopicProcessingGuard` and `TopicIdentityRetrieval` accept constructor `strictQualification:true`. This selects stricter checks, not authority: it requires the same original opaque Maintenance qualification token, store/database, field receipt, expiry/currentness and shared work ledger. Default callers retain the original personal-topic-identity permission domain and label behavior.

In strict mode Topic name/nameKey require the exact Topic structure name grant. Original complete identity/constraint traversal goes through the qualification reader after the original processing check. Point and all four paged readers account to the same original ledger, without another allowance. Name hashes, proof signing and proof verification remain outside IndexedDB and debit that same ledger. Every actual selected field getter checks currentness before and after acquisition. The strict identity projection preserves explicit original scalar/alias/lifecycle metadata; unknown semantic properties are omitted without dereferencing. Non-null or accessor identity scope is refused. No scope text is silently treated as metadata or authorized by a boolean.

## Evidence

Original new test run had 9 cases: 4 actual failures and 5 passing controls. The failures were ungranted Topic label access through page and constraint traversal, cloning semantic identity scope, and accepting strict mode without a genuine qualification capability. `/tmp/paia-strict-topic-identity-red.tap`, SHA256 `95a1ddd42ec215b8db6d844ab9c220f57205aeb2243ed0d8e22338006b19eb95`, preserves that result.

The final strict test file has 16 cases. It adds copied, other-store and released token refusal, known scope accessor refusal, precise page ledger accounting, and the cumulative hash limit. It retains genuinely permitted full Topic/constraint proof, default identity compatibility, and expiry/revoke/currentness controls.

The final combined command is:

```
node --test extension/tests/cpv1-topic-02-*.test.mjs extension/tests/cpv1-topic-03-*.test.mjs extension/tests/ai-maintenance-{strict-topic-identity,qualification-capability}.test.mjs
```

It passed **81/81**, with zero failed, cancelled or skipped tests, in 2349.282853 ms. Log `/tmp/paia-strict-topic-identity-original-final81.tap`, SHA256 `817470a3fbe0ccb8191b0a752e74930a34a5a9f55166cb093659c21f6dc70e14`. All core JavaScript before/after inventories are identical, SHA256 `d27417945220b959b24e49ce830f904bd4ae33b7ccd400eb99357f632f40e60b`. This is synthetic original-owner/fake IndexedDB evidence, not native Chrome, live-provider or complete production promotion qualification. A separate candidate sent-attestation regression remained intentionally RED in its own active work and is excluded from this reader claim.

Production promotion must bind the actual successful strict reader run, original opaque qualification and exact scope/ledger to its original private assessment capability. Storing `strictQualification:true` alone does not meet that requirement. Unknown non-null identity scopes remain an explicit conservative limitation.
