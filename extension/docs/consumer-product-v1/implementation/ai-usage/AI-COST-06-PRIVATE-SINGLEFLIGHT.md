# AI-COST-06 private retirement singleflight — final current evidence

Final runtime/test **`92f741c4f462411d3582141fec1abc370ba43356`**, tree `cded249bc3cf76197cefa8d6c70ef949383ff9c0`. Current session SHA256 `2b7ddc48105e25e0eda6d3b36594cb7f4459150bc765950929d12f5c1d654e70`. This record supersedes the runtime manifest and final test totals in the [initial implementation](AI-COST-06-PRIVATE-SESSION-LOCAL.md) and [slot-retirement correction](AI-COST-06-PRIVATE-SLOT-RETIREMENT.md). Their frozen historical files and version-specific evidence remain unchanged. Production activation, paid provider, overall AI-COST-06 acceptance and installed delivery remain unclaimed.

Independent actual held-read probe `work/ai-assist-independent-retirement-singleflight-probe.mjs` exposed a race introduced by the retirement await: one existing valid idle scope, two concurrent prepares for the same new scope, both post-key canonical retirement reads held/released together, yielded one STALE_BASE and one success instead of one shared handle. `/tmp/ai-assist-independent-retirement-singleflight-before.log` remains failed on the prior runtime. Author complete owning before `/tmp/ai-assist-retirement-singleflight-before.log` was **31 PASS / 1 FAIL**.

After awaited retirement, prepare now rechecks the same semantic key, awaits its ready result and verifies its exact current private state before returning the shared handle. If absent, final generation/lease/eight-slot checks and map publication remain synchronous with no intervening await. Planning/running slots and valid DEFER remain protected; durable jobs/attempts are unchanged. This fixes the new concurrency gap without changing the earlier canonical/lease retirement rules or relaxing capacities.

Independent identical held-read after probe passed with two successful prepares, the exact same handle and one provider execution; `/tmp/ai-assist-independent-retirement-singleflight-after.log`, runtime hash above. New owning test holds actual canonical retirement reads for both two and ten identical callers and requires all to succeed with one exact handle/job/attempt. No test-only runtime hook or altered Foundation admission is introduced.

Final exact-code checks, 0 failures/skips/cancellations:

- Private owning whole file **32/32 PASS**, 671.005709ms, `/tmp/ai-assist-retirement-singleflight-after.log`.
- Nine complete unit/audit files **252/252 PASS**, 2,900.193334ms, `/tmp/ai-assist-final-singleflight-units.log`; includes 12 sequential replies, 12 actual relevant Context revisions, eight held operations/refused ninth, eight valid DEFER/refused ninth, original concurrent-capacity and no-redispatch proofs plus actual frozen old-reader audit.
- Original complete AI native source/release file **2/2 PASS**, 30,433.299166ms, `/tmp/ai-assist-native-singleflight-final.log`. Retains prior AI/Organize/V2/V3 and actual prospective adapter→Chrome tabs.query/get→private session→native IndexedDB→original composer evidence.
- Package **13,521 guardrails / 405 runtime resources PASS**, `/tmp/ai-assist-final-singleflight-package.log`; development privacy/permission/network PASS, `/tmp/ai-assist-final-singleflight-development.log`; release **425 files**, `/tmp/ai-assist-final-singleflight-release.log`, output `/tmp/paia-ai-assist-private-singleflight-final`.

The older251/2 checks refer only to the pre-race-fix runtime and are not relabeled. Author temporary node_modules symlink was removed after all sessions ended. No Prompt browser rerun occurred: initial local Mac headless OOPIF Stage3A **FAIL** remains preserved; precise coherent-head cloud xvfb official Prompt verification remains a required integration gate. Initial `/c`-only/manual Context-only scope, independent consent, qualified precommit/readback/final content guards, byte limits, body privacy and non-atomic cross-process Chrome qualification limitations remain applicable. No worker/Settings/WAR/permission/provider/CI/version changes were made.

## Current complete changed-code manifest

The final twelve-file manifest below is the current independent-review/integration reference. Only session and owning tests changed after the first implementation; all earlier receipt bytes remain historical.

| File | SHA256 |
|---|---|
| `extension/background/assist-reply-lease.js` | `4c4e8a08ed9d0a9ecbf83be60b24eed7dfd523ebd3b18178f24f0be918ad885b` |
| `extension/content/assist-result.js` | `712e100a338dc228a08ba27038eb5e2d806519acdb053755cf43719aebdf7187` |
| `extension/core/ai-usage/assist-intent-binding.js` | `70b9164c5e012fc27daeace4e692c55af7e607f60b1818d7c5d59540c1153a19` |
| `extension/core/ai-usage/assist-response.js` | `1e23bba4eb814faefc398e94fe0e642b18105b645db936b99e41996505d4f3b6` |
| `extension/core/ai-usage/contracts.js` | `7eaaa9a48e7e868cdfe15d8d740b168d3dd241723cf8993b6301d06ac1919edf` |
| `extension/core/ai-usage/foundation.js` | `62b5d166913eb2239cefe41a143966091640f7b0715419a9d1080bf24cb0117e` |
| `extension/core/ai-usage/local-assist-session.js` | `2b7ddc48105e25e0eda6d3b36594cb7f4459150bc765950929d12f5c1d654e70` |
| `extension/core/ai-usage/semantic-invalidation.js` | `f81080328bfbef7d93dd6b72e90addd87df802ffca75843eb29bbede220b7f61` |
| `extension/tests/ai-assist-private-session.test.mjs` | `03f60a98338917bb35109abd8d7fa448481455497e2c3f73fb891551a16f99c0` |
| `extension/tests/ai-cost-semantic-invalidation.test.mjs` | `e492989b2d7c174c9fe7e1984f81c720f11e141520e51d083dac889e01c8c756` |
| `extension/tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` | `d93bfb314a86bce78846127b8bc86ca8477064bb9150bba895ac475a9f5f5408` |
| `extension/tests/harness/ai-assist-native.mjs` | `bf50500066a28775ce8a75cf9843024d4ffcb2b3c0f1e5e64cd85fa7a0845551` |
