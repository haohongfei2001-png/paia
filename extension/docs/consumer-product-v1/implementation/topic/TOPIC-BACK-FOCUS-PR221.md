# Topic Back focus during unchanged-route rendering

PR221 head `ffb9cf227fdfd1ffec8ec3b83e8572908b459b50` Full37859313249 failed. Current Browser4 job113591026550 had65passes/one failure: the source Root five-hit journey pressed Back and then timed out after the original30000ms waiting for the matching Topic status. Its release counterpart passed. All other required primary jobs passed; the aggregate and integration gate correctly failed. Tested merge was `15ae766645d4ffca137c2b04838d356a1292b48b`.

The retained source failure JSON/screenshot in artifact11585727144 shows the same Topic still open and the search query retained. It does not record the focused element or key event, so it cannot establish the unique historical cloud cause. The original failure is not relabeled as a flaky pass. Raw log: `work/034-browser4-failure.log`; artifact: `work/034-browser4-evidence`, downloaded archive SHA256 `39033f9edc8141a67520ec9f774af5a406382c0cf05a900410de2c458e7a6151`.

## Reproduced product defect and bounded fix

The actual `ui/archive.js` render owner first hid Back for every non-document Thought route, then showed it again for an open Topic. Calling this unchanged-route render between real keyboard focus and Enter moved native focus from Back to the document body, even though Back ended visible. A deterministic isolated synthetic browser copy exports and calls the actual existing renderer without replacing it. `/tmp/root-back-render-before.log` records before=true, after=false, active empty, hidden=false and the failed focus assertion. The fixed identical audit `/tmp/root-back-render-after.log` records before=true, after=true, active=back and one actual Enter returning to Root.

The fix computes final visibility once. The final value for every route is unchanged: an open Topic shows Back, Topic Root hides it, and all non-Thought routes keep their previous condition. There is no new navigation, focus stealing, timeout, storage or permission behavior. This eliminates the demonstrated focus-loss defect; it is not claimed as proof of the old cloud execution's sole cause.

The existing Root native file adds two source/release cases invoking this actual renderer from a uniquely owned temporary copy with only a test export appended. It checks focus before/after, one real keyboard Enter returning to Root, and Back hidden at Root. Both original large Root journeys remain unchanged, including their180-second budgets, five-hit traversal, exact query/identity/focus, stable144slots and all other oracles. No retry or sleep hides the failure.

## Verification

Exact runtime/test commit `cd813c7137652b260723b2e737441a000bf27bf1`, tree `a23f3f6234edc235e9dec15f29bc2a784aae83c6`:

- Four whole native files (Root, UIS02 page-scoped search, ANS04 query and release navigation):7/7 PASS, zero failed/skipped/cancelled,109019.415375ms, `/tmp/root-back-focus-combination.log`. Original Root source40490.590458ms/release41166.314291ms; new exact-render source1596.952667ms/release1671.838959ms.
- Both whole AppShell state/current-browser partition files:4/4 PASS,43.55625ms, `/tmp/root-back-focus-related-unit.log`.
- Source13370guards/400resources and development privacy/permission/network audit PASS, `/tmp/root-back-focus-guards.log`, `/tmp/root-back-focus-development.log`.
- Independent root_finish reviewed final visibility equivalence, actual negative reproduction, additive fixture quality and unchanged original journey assertions before the full run. No browser pass was inferred from that code review.

Runtime `ui/archive.js` SHA256 `ca7bbd0d27e8a3c704525d2a432085049fd824ff871b5c461c366410c09ac0e4`; Root native file SHA256 `0a6220857445a31eac95debce43787411cab648cc606c46213f353980f12af84`. Hosted corrected PR-head verification remains required. The parent local stale-version unit failure and its exact correction remain separately recorded; no failed run is erased.
