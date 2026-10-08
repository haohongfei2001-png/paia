# Stage3A current Next entry response ordering

Base `5e995c25` (reviewed future 0.28 branch). This local batch changes only the existing ordinary Prompt card's “本轮建议” availability rendering, not Next detection, insertion authority, provider access, permissions, or Stage3B.

The actual UI owner's controlled-transport negative reproduced three failures: older available/unavailable/error results overwrite the newer result (`/tmp/prompt-next-availability-before.log`, 1 PASS / 3 FAIL). A second actual-listener negative exposed the late `next_reopen` rejection hiding a newer available entry (`/tmp/prompt-next-reopen-availability-before.log`, 5 PASS / 1 FAIL). The production function and listener are executed from source in the unit harness; only RPC completion is controlled. A monotonic availability request ticket now guards both success and failure. Reopen failure captures the same ticket; current failure still hides, but old failure cannot overwrite a newer availability observation. Existing editing/busy/drag/composition and trusted-click checks are unchanged.

Four complete related unit files passed **47/47**, 0.347146083 seconds, `/tmp/prompt-next-availability-unit-final.log`. The dedicated owner has six cases. `git diff --check` passed.

The existing full source/release native file adds one controlled response-delivery scenario: retain a real worker's available response, mutate the real current reply to invalidate it, await the newer real unavailable result, then release the unchanged earlier response and assert the retained card stays hidden with unchanged composer/send count. No worker, data or candidate qualification is mocked. All previous cases and the 180-second budget remain. **This new native case has not yet executed successfully.**

Native failures retained:

- `/tmp/prompt-next-availability-native.log`: the new worktree lacked fixture-only ProseMirror modules. Source/release failed with ENOENT before journeys. The existing local dependency directory was reused through a temporary symlink; that link was then unlinked, without deleting the target or installing/upgrading dependencies.
- `/tmp/prompt-next-availability-native-final.log`: complete invocation attempted both variants. Both passed prospective OFF/enable, then failed in the original direct conditional insertion scenario before the ordinary Prompt card and new scenario opened. In both `extension/work/prompt-next/{source,release}-insert-diagnostic.json`, `after-native-click` records frame events `[]`, empty status, active BODY; trusted pointerdown/up/click hit top-document DIV. CDP hit testing reports the expected iframe, but no INSERT RPC occurs: trace ends with STATUS/OFFER/PRESENT. The capsule retracts after its existing timer and the later status locator reports a detached frame. Browser is local macOS headless Chrome 154.0.8037.98. This is evidence of failed native input delivery, not a proven locale mismatch or a pass. The modified owner lives in the ordinary-card `else` branch, which had not executed at the failing step.

No assertion, timeout, click trust, or browser mode was weakened. No visible browser was launched. A successful complete source/release run in the coordinated supported validation environment remains required; this checkpoint is not delivery or whole Stage3A acceptance. Independent review pending.

Exact files SHA-256:

- `ui/prompt-surface.js`: `3d56f8b41c978721b3387f49d41764ded00c0e30df3b47a59824f8af55e74913`
- `tests/prompt-next-availability.test.mjs`: `00e9590ec15c8622ea60eec2757cca0075cc76f0068a439847cdcc1c7caa4b0a`
- `tests/cpv1-12-next-prompt-chrome-e2e.test.mjs`: `e9eda2e6705972e3525328a770d5166797bccf1e1c72959e8c25f00d8c4547ea`

Coordinator independent code/fixture review passed, including the reopen rejection sharing the availability epoch while preserving current-failure hiding. The dedicated complete owner file independently passed **6/6**, 86.932 ms, `/tmp/prompt-next-availability-root-review.log`; `git diff --check` passed. Approval is only to enter the existing Linux Prompt workflow on a `feat/prompt-reuse-vs09-*` validation branch. Local native failures above remain failures; browser acceptance and delivery remain pending. This author checkpoint does not push or change CI.

### Linux fixture sender correction

Linux Prompt run 37811296433 at 2b8ba5f1 failed in the new case; the five preceding scenarios passed in both variants. Raw log: coordinator work/prompt-availability-linux-2b8-failure.log. The artificial popup-tab announcement never caused the expected held RPC; this is not a passed race test.

Actual headless Chrome sender diagnostic /tmp/prompt-availability-sender-diagnostic.log confirms that this fixture's extension popup page runtime.sendMessage includes sender.tab, while worker runtime.sendMessage does not. Both have the correct extension ID. The unchanged UI properly accepts only the latter. No sender guard is loosened.

The corrected case invokes the existing real reply cycle(). Actual detector/OFFER completion publishes the trusted worker notification. The wrapper holds only its first real available:true response, ignoring earlier unavailable responses that retire the prior reply. Real reply mutation then triggers INVALIDATE and a newer available:false response; the earlier response is released unchanged. No response, authority or successful RPC is fabricated.

Production code and original assertions/budgets are unchanged. Syntax and two complete UI/background owner files pass 12/12 in /tmp/prompt-availability-sender-fix-unit.log; diff-check passes. Full corrected native validation remains pending the next coordinated Linux run; the known local iframe-hit failure was not repeatedly retried. Updated native SHA-256: 24e48081e8e6d42953b7130fe4e055c402ed445f7ffe74ca06163b3b868e47e7. Earlier native hashes and failures remain historical evidence.

Coordinator independent review approved the corrected real-worker broadcast precondition and unchanged trusted-sender guard. The response is held only after the actual worker answered; no available result is fabricated. The sender finding is explicitly limited to this fixture popup page. Approval is to commit these two files and validate one new head through the existing Linux workflow, not to relabel the failed 2b8ba5f1 run.

### Hosted Linux qualification after real sender correction

Exact head `4904a473cab18bd9a3919de3cc6155d75ea53a40`, workflow run
[37812957639](https://github.com/haohongfei2001-png/paia/actions/runs/37812957639):
all four Prompt unit shards and the complete foundation job SUCCESS. The actual
Stage 3A source/release direct loop passed 26/26 tests, including held stale
availability; Settings Next session source/release passed 2/2. Foundation also
retained source/release composer and Prompt surface regressions and contracts.
No skips/cancellations are used as acceptance. The previous local Mac click and
hosted `2b8ba5f1` fixture failures above remain recorded.

This qualifies the unchanged Prompt runtime component, not installation, a paid
model, whole seven-lane completion or final certification of the combined 0.28
candidate. Integrated locally with reviewed 0.28 at `fb9adfeb190d22bf5b159e1e185e77ba0aec86e3`;
its formal candidate and exact-main gates remain pending.
