# TOPIC Section fragment native-history repair — PR226 candidate

## Scope and exact identity

The original PR226 candidate `2db9fd0e` failed Full run `37889914312`, Browser 5 job `113688288187`: the release variant of `Section-aware actual writing owner` timed out at `strict fragment reload qualifies its exact Section`. Earlier writing/ACK/Source assertions and its source variant passed. That failed gate remains failed; this receipt does not certify PR226 or main.

Local repair code commit: `02a42844b685a0665392abefbf58b7e568965a6d`, tree `6924e4ff5b7b56aa5456f7a37871384196ee37de`. Only `ui/reader-navigation.js`, the additive owning unit file and additive owning native file change. No Core, storage, permissions, release version, CI, Archive navigator or Settings change.

The original native writing file is retained as an exact 24,540-byte prefix, SHA-256 `ee978c208fefec56884a55d2cae96c0650164168c289525301dff98362a0d648`. Its assertions and 90-second per-case budget remain unchanged; no original case is skipped.

## Proven mechanism and bounded repair

A real same-document navigation to an existing strict `#paia-thought?topic=…&section=…` URL creates a native `popstate` entry without PAIA history state. The old listener always treated that missing state as neutral Archive. Once its asynchronous navigation finished, it committed `view: library, topicId: null` under the still-valid explicit fragment. The next reload preferred that valid stored route and therefore never resolved the explicit Section. An actual native, synthetic named-Section probe demonstrates the completed-history branch before and after the repair; it does not fabricate a history state or dispatch a synthetic popstate.

The listener now resolves the already-supported strict Topic target only when the native entry has no valid existing PAIA route. It uses the original foundation/Section read owner, original navigation/leave guards, and existing Section-arrival event/controller. An unavailable target returns to the existing Thought root rather than granting a Section. Existing valid Settings, Reader and Topic history retains its own owner even when the URL has an older fragment.

While qualification is pending, changed URL, history state, logical departure route or a newer popstate invalidates that attempt. A rejected navigation dispatches no Section event. No parser, caller admission, Section ownership, body eligibility or writing destination check is relaxed.

The cloud summary did not contain a complete failed route snapshot. The race is independently demonstrated on the actual original runtime and matches the failing operation, but this receipt does not assert that it uniquely explains every possible cloud failure.

## Exact local evidence

All native runs use isolated headless Chrome, synthetic data, `PAIA_HEADLESS=1`, Node `v26.8.2`, and the already-pinned `work/iah-minimal-results/extension/node_modules/playwright`; no user browser, real account, paid model or deployment.

| Evidence | Actual result | SHA-256 |
|---|---|---|
| Original owning native file, exact candidate runtime; `/tmp/038-section-writing-original.log` | 2/2 PASS, 16,948.784334 ms; does not supersede cloud failure | `ad22c211e08c615adfb82d05759396176fed200195263cf978381b2318aa45e4` |
| Named native completed-pop probe, original runtime; `/tmp/038-section-fragment-named-before.log` | Expected strict Section assertion FAIL after original 14s polling budget; real history committed neutral Archive | `70d805c0b75f6e9d4171b8d56f37b7123fc56d5825193c7c83667e5ebff8c461` |
| Same named probe, repaired runtime; `/tmp/038-section-fragment-named-after.log` | PASS; native history commits exact Topic and reload focuses exact named Section | `38c803f97638d407779312505fa07089da6d4e9b474295439a8f777b7b98242d` |
| Four complete owning/relevant unit files; `/tmp/038-section-fragment-units-final.log` | 15/15 PASS, 95.124542 ms, zero skipped/cancelled | `677655d02e4ee209d3cb126c4e5f7c777ab71d68f7e2e1aace4fa2e0d7f932a0` |
| Entire final owning native file; `/tmp/038-section-writing-fixed-whole-final.log` | 4/4 PASS, 16,920.236167 ms, zero skipped/cancelled | `0a834fc1fcec341c56f036fcf56ef19be4cda123010121c845a99affbbc8f21d` |
| Package/privacy audit; `/tmp/038-section-fragment-package.log` | 13,902 guardrails, 415 runtime resources PASS | `b3b697f996f259a29fce4da02ccab274c7b40833cf539ac6dbaf771fe12dbf87` |

The four whole unit files are `topic-fragment-history.test.mjs`, `iah11-search-history-marker.test.mjs`, `settings-reader-return.test.mjs`, and `cpv1-topic-05-2-root-target.test.mjs`. They cover strict target refusal, valid history precedence, refused navigation, pending qualification invalidation, Search-marker preservation, actual Settings return ownership, and original readonly Section ownership.

The final native file contains both original writing cases and two additive source/release cases. Each additive case exercises both real timing branches: hold the actual Section response before reload while native history remains null; then allow the native pop to commit its exact Topic before reload. Both require exact named-Section focus and unchanged Thought entries. Existing original writing tests also verify actual Section saves, unknown ACK retry, Source immutability, long reading position, and original default-after-reload behavior.

## Retained failures and fixture corrections

- Original cloud failure remains in `/tmp/038-browser-5-failure.log`; no rerun is claimed for unchanged SHA.
- First standalone diagnostic incorrectly waited for hidden `#app-version`; its timeout remains `/tmp/038-section-fragment-history-before.log` and is not a product failure.
- Early standalone probes targeted the default untitled Section while asserting a named-Section heading focus. Their `/tmp/038-section-fragment-history-before-final.log` and `/tmp/038-section-fragment-history-after.log` remain, but only the corrected named probes above prove before/after.
- First additive unit run had a fixture null-versus-undefined comparison; `/tmp/038-section-fragment-units.log` preserves 13 PASS / 1 FAIL. The corrected test checks the original normalized route semantics; no runtime change was made for that fixture error.
- First expanded native run omitted a viewport and tried to click a hidden compact-navigation control. `/tmp/038-section-writing-fixed-whole.log` preserves 2 original PASS / 2 additive FAIL (SHA `e642598b36c0775b405b633fd5dd7da0ebc1c92e9be775d322124898e785943b`). The additive cases now use the original 1440×1000 desktop viewport and the existing `thoughtPrimary` navigation helper. No force click, relaxed assertion, timeout extension or runtime UI workaround was introduced.

## Initial candidate file hashes and remaining gates

- `ui/reader-navigation.js`: `24d0343df8cb58d97b8d57bf8f45efa0c85a0d2bb729f300e6015e5a79ed743a`
- `tests/topic-fragment-history.test.mjs`: `e36b788c6a3d6eb61cb0f967cfe67b6767fe6e642548bd0194a6f482b61b6140`
- `tests/topic-section-writing-chrome-e2e.test.mjs`: `6d3024b19528b35658454feb2cbaaef2c6fafc3640daefdefee098b0d2e3b167`

Independent review, root integration, a new stable-head required Full gate, exact-main verification and release delivery remain coordinator-owned and PENDING here. This is local engineering evidence, not installed/current-live, final visual, provider, whole-seven-lane or release acceptance.


## Independent-review amendment — final local repair

The initial `02a42844` repair was **not** independently approved. Review demonstrated an additional stale-completion bug: while the first target navigation awaited completion, a later valid same-Topic history arrival could finish; the older success then dispatched its stale Section event. `/tmp/section226-post-navigate-race-before.log` records the actual failed assertion (0/1 PASS, SHA `25a42892702939ad2f7cf19e4c532e222ac2376951cf076bb51e5115eea510b9`). This is a deterministic controlled completion schedule, not proof of the original cloud failure's unique timing.

Final code `6749424744d4feb5ad6b4b89b4e08d0e2f4e7600`, tree `ce27b29552ab14f5cfcd0b23a260c82e937660b5`, adds a **target-only** post-navigation fence before Section dispatch, refused-navigation checkpoint restoration or accepted commit. It rechecks the original URL/history/pop generation and the current qualified Topic owner, or the original departure route on refusal. Newer accepted history cannot be replaced by either an older success or an older refusal. Valid existing history branches retain their prior behavior.

Review also found that the pre-existing `writing-history-refusal.test.mjs` VM fixture did not expose the newly exercised real parser import. Its unchanged forged-target test failed with `ReferenceError`; the failed run remains `/tmp/section226-independent-units-before.log` (SHA `fd86fbb54dc65b160195c8c732c70464a99dcd916e54bf5582b8415352d854ed`). The only changes to that existing test are importing the real `topicRootTarget`/`resolveTopicRootTarget` and exposing them in its VM context. No assertion, fixture route, checkpoint, focus or write condition changes.

Final evidence supersedes the initial candidate's local passes for current code:

| Evidence | Actual result | SHA-256 |
|---|---|---|
| Independent exact stale-completion probe after fix; `/tmp/section226-post-navigate-race-after.log` | 1/1 PASS, 44.81575 ms | `07aac89d8d1b61f59cc85162079fcce7bacb9a714dd6491971850cf46cdaced4` |
| All five complete relevant unit files, including original `writing-history-refusal.test.mjs`; `/tmp/038-section-fragment-units-post-navigation-final.log` | 29/29 PASS, 131.914792 ms, zero skipped/cancelled | `ddc4a0c32e39c79e183a59a7d2dbb96b66fa7f6e44a0cebf07ea0eba403f023f` |
| Complete original-plus-additive native writing file; `/tmp/038-section-writing-post-navigation-final.log` | 4/4 PASS, 18,172.446125 ms, zero skipped/cancelled | `8f8a8aed970c04d21c8d66716f5dd5c9ab71b3647f053bcb2c69f5c89838de2e` |
| Package/privacy audit; `/tmp/038-section-fragment-post-navigation-package.log` | 13,902 guardrails / 415 runtime resources PASS | `b3b697f996f259a29fce4da02ccab274c7b40833cf539ac6dbaf771fe12dbf87` |

Final runtime SHA-256 is `196eb426d593c7fb98848ee5c6dd0d1320d0e4f1a769f2395d56fd321b9dcfcb`; additive unit SHA is `5f9cc276243981a62dcb5912ec9a5c324c383ff387c72bb75da4c3c784b36190`; existing writing-history fixture SHA is `91b8b89f13fe2ba33ded20c752d7d81deb70e6c3220fcc58176a7856a8cfb657`. The native file hash remains `6d3024b19528b35658454feb2cbaaef2c6fafc3640daefdefee098b0d2e3b167`, with the original exact prefix retained.

### Actual cloud evidence identity

PR226 requested head is `2db9fd0e289d650a28a406b0112abd20829e14b2`. Actions actually checked out merge candidate `f3340f8a8328190d09d4faa803d27431d99b6744` (parents main `a880…` and requested `2db9…`), with tree `051d56fc1421808419351fd6a4e0dabe607572f7`, equal to the requested head tree. The coordinator verified the Actions checkout identity; locally the requested head tree was independently read back. Runtime bytes agree, but requested PR head and actual tested checkout are different commits and are recorded separately.

Browser 5 artifact `11598078192`, downloaded once as `/tmp/038-browser-5-evidence.zip`, SHA `acf979c431d9d2018698823cf7d020473aa2c498bce24ecf0dfbcdd1be3fb691`, confirms:

- final failed diagnostic contains only `scroll: 0`, `max: 0`, empty active element; no failed URL/history snapshot was retained;
- earlier actual wheel input reached scroll 600 / max 5743 while `create-entry` retained focus;
- the complete shard has 33 cases, 32 PASS / 1 FAIL / zero skipped; all ten saved-presentation cases passed;
- all eight other primary browser shards, four unit shards and native checks passed, while Full aggregate/gate remained failed.

The missing failed history snapshot prevents a unique-cloud-cause claim. Current independent review, stable PR Full, exact main and delivery gates remain PENDING and owned by the coordinator.


## Final independent approval and Root integration

Independent reviewer approved final code67494247 and receiptbc784ecc after reading all final changes, executing the original stale-completion probe1/1 PASS49.662708ms (`/tmp/section226-post-navigate-race-after-independent.log`, SHA `c6cc603232f4220cb821dfd0e80f1088bc7a2c130e404c69d87c488650ae43ad`) and five whole units29/29 PASS183.193791ms (`/tmp/section226-independent-units-after.log`, SHA `5e42ff7d353625f68c0c0901213082acb64624d8633386aaf51a526271934916`). Reviewer read/hash-verified the author's final4/4 native evidence; that run is not called an independent rerun.

Root verified exact three existing base blobs at requested2db and absence of new files, then applied one final net patch, committing `35c8759c153b608b3a95f6bac32edc5c827fab83`, tree `f5938571dce9b60040b3ca81458a7288e686cc6c`. Root independently ran the two original source/release writing journeys2/2 PASS14070.390042ms, zero failure/skip/cancel, `/tmp/038-section-writing-root-integrated.log`, SHA `b8f6e4ab7a87e8560672e1494d36ca322b888e1d98cc0e9b52c2e5cadca220a6`. This selected original-journey run does not include the two additive cases; the author whole4/4 observation remains separate. Root five whole units29/29 PASS247.809333ms, `/tmp/038-section-root-units.log`, SHA `bd75bea14ef0dd9c8b689293fcf0bd09ce0e72994a8df5fa5c4bdbd3d7f53aaa`.

Root complete code/evidence/fixture-prefix review APPROVE. Original Full37889914312 remains COMPLETED FAILED, original Prompt37889914281 SUCCESS; new stable head Full, guarded merge, exact-main gates and package remain pending.
