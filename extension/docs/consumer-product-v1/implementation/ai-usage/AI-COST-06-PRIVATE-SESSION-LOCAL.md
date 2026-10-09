# AI-COST-06 private local reply/result implementation

Runtime commit `0b28116d0faf1b090b5e11a50b6ebff573fdfec4`, tree `434c1f05093fb744171f5d24c7f5357d53007be1`; author base `de55010616c5bdda80be62176956febc9a5112f1` contains the approved private-session design and frozen old reader proof. This is a constructor-owned local implementation awaiting independent review and coherent integration. It is **not full AI-COST-06 delivery, production activation, model quality, financial admission or installed acceptance**.

## Final behavior and scope

Two independent consents default OFF. The new lease checks extension identity, exact top active document, actual current host URL and fresh prospective reply metadata, and requires the trusted `tabs.get` result to be active and non-incognito before metadata or sensitive snapshot probes. Revocation is synchronous before awaits. The initial host scope intentionally accepts only exact `https://chatgpt.com/c/<id>` without query, fragment or trailing slash. The existing adapter's `/g/.../c/...` and trailing-slash paths are not claimed as qualified by this private lease; their runtime remains unchanged.

The actual current-reply adapter observes a new streaming cycle and stable completed latest reply. Historical or streaming reply bodies are unavailable. Explicit activation uses only a trusted selection of active manual Context items, with actual Context access, revisions and semantic descriptors rechecked. Zero selected Context is supported without inventing a Source/Input. Automatic/derived Context, entire profile text, optional already-sent user message and source-dependent Assist selection are not admitted in this first private session. Broader Source-purge selection closure is consequently not claimed.

Strict `ai_assist_result_v1` is a separate one-child reply-result obligation with zero-to-100 real canonical dependencies. Generic facet and local resolution paths reject it, old persisted kinds retain their rules, and all three job kinds share the existing combined 100-job semantic cancellation bound with zero writes on overflow. Domain commit evidence remains UNSUPPORTED for Assist, and no financial/cache proof is minted. The separate obligation cannot be satisfied by ordinary maintenance ACK/DEFER rows.

The response codec accepts only one exact bounded SUGGESTION (text plus condition) or finite DEFER reason, with scalar/UTF-8/JSON and full-payload limits; malformed or oversized content is rejected rather than truncated. Ten activations share one actual attempt; DEFER reuse, lost output, interrupted ACK, TTL and replacement handles do not authorize another attempt. Stable semantic identity excludes allocated lease IDs and expiry. Reply/output bytes remain private memory and the deliberate composer insertion destination; durable job/usage/work rows contain only opaque metadata and outcomes. Real pre-existing Source/Working/human Entry rows are compared byte-for-byte.

All Chrome probes occur outside canonical IndexedDB transactions. A post-provider precommit `#qualified` rereads actual active tab/current reply and canonical qualifications before result settlement. The Foundation uses final synchronous lease/consent/current Context fences after its authority and ACK awaits; successful durable COMMITTED readback and a fresh qualification precede private output publication. Native content consumes pending mutations immediately before invoking the original composer. These asynchronous Chrome qualifications prove their read points, **not cross-process atomicity of tab activity**. A production host must still supply correctly maintained synchronous capabilities and final live content qualification.

The isolated content controller is explicitly constructed only. It preserves current-reply mutation checks, condition presentation, existing native draft/selection/IME guards and one-shot operation identity. Insertion never sends. No worker listener/route, manifest/WAR, visible UI, Settings writer, permission, real provider, paid route, CI or version is activated by this author batch.

## Final exact-code evidence

- Nine complete unit/audit files: **247/247 PASS**, 0 fail/skip/cancel, 2,715.233042ms; `/tmp/ai-assist-final-qualified-units.log`. Includes private session, legacy Assist intent/Foundation/semantic invalidation, original Stage3A lifecycle/security/Family/detector and complete frozen old-owner audit. The frozen closure remains 10 modules / 61,818 exact Git bytes from `3f6c9d2a`; old job/commitFacet/resolveLocal reject the new kind without writes or committer calls.
- Original complete `cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs`: **2/2 PASS**, 0 fail/skip/cancel, 29,001.390458ms; `/tmp/ai-assist-native-qualified-final.log`. Source and release retain all prior AI local Organize/V2/V3 scenarios and add the private adapter→lease→LocalAssistSession→native IDB→original ProseMirror composer loop.
- Native host uses **actual `chrome.tabs.query/get`** for its unique synthetic actor tab; it does not hardcode active=true. The documentId, sender construction, financial authority, provider and archive↔isolated-world transport remain explicitly synthetic fixture capabilities. The synchronous reply-binding mirror in that test bridge is not a production registration or atomic cross-process authorization claim.
- Native proofs: zero Context, one durable job/child/result with one attempt, exact current reply only, canonical body-free metadata, ten activations singleflight, condition guard, selected draft/caret preservation, successful and uncertain operation replay refusal, IME refusal, changed-draft refusal, latest-node mutation denial, pagehide and consent denial; send/Enter count 0. It imports the final emitted controller for release, and uses the original reply/composer adapters rather than ready DTOs.
- Package guardrails **13,521 / 405 runtime resources PASS**, `/tmp/ai-assist-final-qualified-package.log`; development privacy/permission/network audit PASS, `/tmp/ai-assist-final-qualified-development.log`.
- Release build **425 files**, `/tmp/ai-assist-final-qualified-release.log`, output `/tmp/paia-ai-assist-private-qualified-final`; author version remains 0.34.0 intentionally. Root owns coherent final version/certification. No installation or deployment.

## Failures and corrected boundaries retained

Root's independent `tabs.get` held-await revocation negative `/tmp/ai-assist-independent-revocation-before.log` failed because snapshot body was probed after consent revoke. The lease now rechecks epoch/permission immediately after the await before any next probe; its after log and owning six scenarios pass. Earlier scan expectation2 failed when a third kind was added; the owning test now asserts the exact ordered three discriminator names, without weakening the combined scan bound.

The first Source protection test had nonexistent sources/inputs tables; the prior writer corrected to actual records/blocks and requires Object.hasOwn. Subsequent nonempty protection fixture initially assumed only one captured record, overlooking the existing seeded capture (`/tmp/ai-assist-final-units.log`, `/tmp/ai-assist-final-units-fixed.log`); precise actual counts now assert records2, blocks2 and human Entry1/body, then compare all protected tables unchanged. These were fixture setup mistakes, not production fixes.

New actual owner negative `/tmp/ai-assist-inactive-before.log`: **25 PASS / 1 FAIL**, inactive tab still reached metadata probe. Fix requires the actual trusted tab lookup's active=true, not caller sender.tab.active. After this, `/tmp/ai-assist-final-active-units.log` passed246 and `/tmp/ai-assist-native-active-final.log` passed2; those are superseded by the final held-provider correction.

New held-provider negative `/tmp/ai-assist-inactive-provider-before.log`: **26 PASS / 1 FAIL**, result publication refused but an inactive tab had already ACKed/committed. Final precommit external qualification now denies settlement with **ACK0 / RESPONSE_RECORDED / attempt1**, preserving the actual attempt and destroying public result eligibility. Final247/2 evidence above includes the correction. No assertions or budgets were lowered or extended.

## Stage3A browser regression remains failed / required cloud gate

The unchanged complete `cpv1-12-next-prompt-chrome-e2e.test.mjs` was attempted once in local Mac headless Chrome: **2 PASS / 4 FAIL** (includes failed parent tests), 44,976.464416ms; `/tmp/ai-assist-next-native-regression.log`. Both source/release prospective-OFF cases passed; first conditional native click did not reach iframe. Exact diagnostics: iframe click events=[], status='', top pointer/click targeted DIV at x1085/y681, final trace had STATUS/OFFER/PRESENT but no INSERT RPC; candidate timed out normally after12s and the old `.next-status` locator saw a closed frame. Private offline files are under `extension/work/prompt-next/*-insert-diagnostic.json`; no real data is present and these diagnostics are not committed.

That log is **not PASS, a skipped test, provider failure, or proof of a unique product cause**. Prompt files/runtime and timeout/oracles were not modified. Root verified the official Prompt workflow runs the original complete file on Ubuntu xvfb with PAIA_HEADLESS=0 (virtual cloud display). The next actual coherent integration must run that precise cloud gate; this author does not certify the overall Stage3A browser regression or repeatedly rerun the known local OOPIF hit environment.

## Frozen changed-code manifest

These hashes refer to the final code/test commit above. Receipt-only edits do not substitute new runtime evidence.

| File | SHA256 |
|---|---|
| `extension/background/assist-reply-lease.js` | `4c4e8a08ed9d0a9ecbf83be60b24eed7dfd523ebd3b18178f24f0be918ad885b` |
| `extension/content/assist-result.js` | `712e100a338dc228a08ba27038eb5e2d806519acdb053755cf43719aebdf7187` |
| `extension/core/ai-usage/assist-intent-binding.js` | `70b9164c5e012fc27daeace4e692c55af7e607f60b1818d7c5d59540c1153a19` |
| `extension/core/ai-usage/assist-response.js` | `1e23bba4eb814faefc398e94fe0e642b18105b645db936b99e41996505d4f3b6` |
| `extension/core/ai-usage/contracts.js` | `7eaaa9a48e7e868cdfe15d8d740b168d3dd241723cf8993b6301d06ac1919edf` |
| `extension/core/ai-usage/foundation.js` | `62b5d166913eb2239cefe41a143966091640f7b0715419a9d1080bf24cb0117e` |
| `extension/core/ai-usage/local-assist-session.js` | `e4e4e42608ac870af06f82c04fbb0cf43977abdc0de0b437c70fe719e5740ee3` |
| `extension/core/ai-usage/semantic-invalidation.js` | `f81080328bfbef7d93dd6b72e90addd87df802ffca75843eb29bbede220b7f61` |
| `extension/tests/ai-assist-private-session.test.mjs` | `0787452890eea0662637bcca38ccce634ffd748420e70cf1bbc5bf43bde49ee2` |
| `extension/tests/ai-cost-semantic-invalidation.test.mjs` | `e492989b2d7c174c9fe7e1984f81c720f11e141520e51d083dac889e01c8c756` |
| `extension/tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` | `d93bfb314a86bce78846127b8bc86ca8477064bb9150bba895ac475a9f5f5408` |
| `extension/tests/harness/ai-assist-native.mjs` | `bf50500066a28775ce8a75cf9843024d4ffcb2b3c0f1e5e64cd85fa7a0845551` |
