# Stage 3A-2 Family owner wiring — local candidate

Base: warm-view checkpoint `dd42a1698f0ae659e66287ff4ca256977ae0fae6`. Independently reviewed Direct detector fix `dc61e8c56e31bd854f9433fb7fab640b57c06874` was cherry-picked as `04eeebba`; its dedicated receipt is `STAGE3A-DIRECT-COVERAGE.md`. This record does not replace prior failures or quality limits.

## Implemented path and authority

The existing worker already shares one PromptReuseService with NextPromptCommands; no service-worker routing change was required. OFFER preserves authoritative Direct/Choice handling without reading or awaiting a Family view. Only the detector's no-explicit-action branch consults the bounded warm view and exact Family matcher. A cold/unknown projection safely defers. No snapshot is added to the reply path, and the group retains only Family id/original text/generation and the existing bounded proposal metadata, never the original assistant reply body.

Family get, reopen, failed/uncertain copy and insertion use the actual service resolver and reject any change from the offered generation. Existing authorization, top-document, nonce, reply binding and one-shot insertion rules remain. PRESENT checks current generation again after its asynchronous idle probe. The final worker guard reads Family generation after final authorization, then synchronously fences changing/group/worker-instance serial state. Content checks STATUS before the final Family PRESENT handshake, followed by the existing synchronous reply/composer guard. The capsule and iframe accessible names distinguish a saved Family from a literal reply without new permanent UI. No external model, Stage 3B, permission grant, Settings or CI change was introduced.

The finite matcher now accepts conventional casing in its existing English prefixes and action vocabulary. Object/constraint comparison, safety vetoes and original Unicode offsets remain unchanged. The Direct owner independently corrected finite Reply shorthand and documentation-as-object handling; this matcher does not bypass detector safety.

## Reproduced failures and local checks

Independent review found three explicit await windows. Each has a retained deterministic negative test:

- `work/prompt-family-present-before.log`: Family hidden during held surface idle was incorrectly qualified.
- `work/prompt-family-final-auth-before.log`: Family generation changed during the last authorization read without rejection.
- `work/prompt-family-host-status-before.log`: the actual extracted content INSERT handler performed one composer edit after STATUS yielded and Family became ineligible.

The corrected ordering passes these negative tests while retaining normal positive paths. Eleven complete related files passed **272/272**, zero failures/skips/cancellations, 738.764542 ms (`work/prompt-family-wiring-combined-unit-final.log`). Actual service fixtures cover cold/warm projection, original Family text, independent edit/hide/purge, held resolve with revocation/reply replacement, obsolete warm offer generation and insertion/copy/reopen refusal. `check_package.py` passed **11,876 guardrails / 356 resources** (`work/prompt-family-wiring-package-final.log`).

The first native attempt never reached product behavior: this new tree lacked the existing ProseMirror dependencies (`work/prompt-family-wiring-native.log`, source/release ENOENT). Package declarations were byte-equal to the prior Prompt tree; the same installed dependencies were linked without installation or version changes. The original failure is retained, not counted as browser success.

## Frozen independent corpus

The 80 labels remain unchanged at SHA-256 `557da142e0544283fa4ddd7e83141c14b37453990697260a63554620f6fd9e51`. Original dd42 results remain in `work/stage3a2-independent-quality80-results.json`. Separate casing-only and combined result files preserve the progression.

Combined result (`work/stage3a2-independent-quality80-combined-results.json`): correct Family identity/type **28/28 accepted**, compatible Family coverage **28/32**, required DEFER **40/40**, Direct/Choice expected type **3/8**, total fixed-label agreement **71/80**. The four Family paraphrases remain unsupported. Five Direct/Choice controls remain outside supported or unambiguous precision-first forms; they are not relabelled as successes. This synthetic, independently labelled corpus is not a real-world accuracy estimate, the complete 360-case gate, exact native insertion correctness or installed availability.

Final browser and independent closure evidence will be appended after the frozen candidate completes. No source/release PASS is inferred from units.


## Final local checkpoint boundary

Independent reviewer reran the complete Family owner file **11/11 PASS** and accepted the corrected three await boundaries; the matcher casing delta separately retained **30/30** independently authored checks. Neither review claims a live host result.

The repaired-dependency complete native attempt is **FAILED**, not waived: source and release both passed OFF/prospective enable, then failed the retained Direct conditional mouse-insert case. Node reports **two PASS / four FAIL** including the two enclosing failed parent cases, zero skipped/cancelled, 48986.685125 ms (`work/prompt-family-wiring-native-final.log`). The newly added actual saved-Family insertion/hidden-eligibility case was **NOT_REACHED** in either variant. Settings and later retained cases were also not reached in this attempt.

Both private-frame diagnostics report an empty trusted pointer/click event list, no insertion RPC, empty status and focused BODY, while the top document received trusted DIV events and CDP hit-testing identified the iframe. Browser identity was headless macOS Chrome `154.0.8037.98`, executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. This matches the earlier local event-delivery symptom; it does not prove this candidate passes Linux or excuse a product failure. No keyboard substitute, style injection, sleep extension, skipped assertion or same-configuration retry was used. The next required evidence is an exact-candidate hosted native run through the existing Prompt workflow, coordinated separately; no full-product CI or paid service was launched here.

All eight runtime/native-test hashes remained unchanged across the attempt. Exact bytes:

```text
41ef3af56be4a22eae81daab11393128fe6c3d2a57ae10aaca8484df18613c5d  background/prompt-next.js
44d6a842494b9f7f124e447e27df6c2d320583805180cec650c84769ec5bae1e  content/prompt-next.js
ff1147d1faa2b028de9a8318fc1cc352535e0af3105cb672c68e1e38bb053d7e  ui/prompt-next.js
3d74f8c48ff711e7c8b20095e681f46e028ffbc88d1aa3708ea7c8f0d85954c2  core/next-action-detector.js
5b0224b2732fc4c8829f90a0cff4c955f5315ea100c221c0d9c9c703546b257b  core/next-family-matcher.js
23aa613c7323433433ebe5b6750bc4fc371c0e6a022d8aab90d9ae332e7d158d  core/next-family-view.js
cb188f380ab1f7950cd736a2cd3cc5f95633a55c8394901470eed4530df45451  core/prompt-reuse-service.js
1bc5d213f55f07d55937265ef0a85687c4dab42c63fdcb4168cc7cb0f70554e1  tests/cpv1-12-next-prompt-chrome-e2e.test.mjs
```


### Coherent0.24 candidate integration

The coordinator merges planned Sync0.23.1b8ce2ef6, which contains Archive0.23 and Section0.22. Independent review compared358 production JS/CSS/HTML files: every file equals one parent, except the intentional strict backup minor24 admission. All eight reviewed Prompt runtime/native files remain byte-identical to f1f747e1. Manifest/package/version_name identify0.24.0 Prompt Next Actions; future25 and malformed24 remain rejected, schema5 and retired export unchanged.

Actual parent-router execution preserves all308 placements from f1 and324 from b8; union82 files is covered exactly once. Next remains fixed3, other five new whole files fixed4. Historical75/300 and76/304 oracles and7×18-minute jobs remain unchanged. Six complete CI owners plus two version owners independently pass22/22; root explicit nine-file unit combination passes211/211. Actual0.24 package/release guard passes385 files.

The coordinator's first broad unit glob accidentally included the native file; it was stopped and retained as work-family-final-combination-unit.log (failure/cancellation, not native evidence). Subsequent exact unit list excludes native. The existing isolated Mac native failure described above still means Family native was NOT_REACHED. Final actual PR-merge candidate must run the existing Linux Prompt Foundation workflow, without a live-site marker or new paid/visible-browser action. Its checkout is the PR merge ref, so evidence must bind the actual checkout SHA and tree rather than relabel it a bare-head run. No installed0.24 or completed Stage3A quality/lifecycle claim precedes that verification.

## Hosted stale-Family dismissal correction

Linux Prompt run 37766818908 at PR head 9041deb7 reached the new Family journey in both source and release. Exact insertion, zero send and refusal after hiding the saved Family passed; both failed at line 63 waiting for explicit dismissal. The shared RPC guard incorrectly required current Family generation even for removing the already-bound capsule. Raw evidence: `/tmp/prompt37766818908-foundation.log`. Later cases and subsequent workflow steps were not accepted.

The correction exempts only the exact `hide` command from Family eligibility. Existing current authorization, reply, tab/document, nonce, frame and serial checks remain; get/copy/insert/reopen retain full qualification. Actual owner edit/hide/purge dismissal negatives failed before the change (`/tmp/prompt-family-dismiss-before.log`); the complete Family and reopen owners then passed 26/26 (`/tmp/prompt-family-dismiss-after.log`), including six binding negative cases. This is not replacement native evidence; the unchanged complete native journey still requires the new hosted candidate.
