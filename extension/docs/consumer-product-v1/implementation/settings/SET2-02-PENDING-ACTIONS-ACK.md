# SET2-02 Pending standalone/ignore acknowledgement ownership

Base ef6c246eaa971100e7f09a33173b6882008f2697 (0.27 local candidate). This adjacent UI batch closes the remaining existing pending Input action feedback/admission boundary; it does not extend import, restore, source, storage, schema or permission behavior.

Standalone/ignore now use the same per-Input pending exclusion as dialog assignment. Admission locks synchronously before the existing IMPORT_RESOLVE_BRANCH; its Input ID, expected revision, action and operation ID retain their original domain contract. All three current pending-action controls are disabled during a request, including same-document replacements. Same-view navigation to another document is distinguished by the existing paint/actions document identity, alongside the existing review epoch. Late successful mutations remain durable but do not refresh or publish results into a different document/page/epoch. Current failures reach connected replacement status nodes and unlock controls; current success keeps the original result/navigation affordances. The already reviewed dialog session guard and removed-Input restore remain intact.

## Earlier component evidence (superseded runtime bytes)

- `/tmp/settings-pending-actions-before-final.log`: actual owner 3 FAIL before repair: standalone and ignore duplicate activation each sent two CAS requests; a single acknowledged mutation after leaving still refreshed/published UI.
- `/tmp/settings-pending-actions-document-before.log`: additional actual negative for staying in excluded view but opening another document. Epoch alone was insufficient; no Archive/router hook or second navigation owner was introduced.
- `/tmp/settings-pending-actions-unit2.log`: intermediate broader dialog-document guard broke fixtures/old dialog contract; removed before final verification. The final delta only adds direct-action document qualification and retains the existing dialog guard.
- `/tmp/settings-pending-actions-related.log`: six complete related files, 35/35 PASS, zero skipped/cancelled, 103ms. Nine new actual owner cases cover both actions, real request shape, current success, same-document replacement error, cross-action duplicate admission, old connected handlers and leave/reenter failure suppression.
- `/tmp/settings-pending-actions-native.log`: first whole-file attempt failed because a real committed import notification removed the old pending button, then the fixture attempted to locate it again. The corrected fixture retains that exact old element reference for the deliberate duplicate event; no runtime workaround, assertion or budget change.
- `/tmp/settings-pending-actions-native-final.log`: original whole UIR-04 Data file, 1/1 top-level PASS, 32.088s. Source, empty-profile backup restore and isolated release execute. The existing two pending-Input dialog cases are retained with a third synthetic pending Input added. Both standalone and ignore commit via the real worker before held UI ACK; duplicate old-control events issue one request, current persisted branch/excluded state is exact, and leaving to Settings before acknowledgement preserves full history and result UI. All Source records remain exact. Original recovery, backup, privacy and zero-network assertions and 300s budget remain.
- `/tmp/settings-pending-actions-package.log`: 12487 package guardrails / 377 resources PASS. Syntax and git diff-check PASS.

Headless synthetic browser, explicit existing Playwright 1.63.0, no account/model/network service. Synthetic programmatic duplicate events deliberately bypass disabled presentation and are not claimed physical double-click evidence. This is local bounded verification, not full import-domain or coherent hosted certification.

## Earlier tested bytes (not final qualification)

The runtime and original native file remained frozen during the successful run. SHA-256:

- ui/review.js: `eafe38f604f8f72f9dd398ed785c2e2a1e4946340e872609c08c446d8bd6cbd4`
- tests/settings-pending-actions.test.mjs: `b4ad30dd057a72a57c0275f9c4a2f2068b59e49ce278435dbb222e22b35f853b`
- tests/uir-04-data-chrome-e2e.test.mjs: `215dad150e0c5bfb2024ecdc3a4fe873fdfe9fff95330b48aba22384c81068f6`


## Final route-intent correction and independent verification

The earlier component evidence above predates the final route guard. Independent coordinator review found two further boundaries: removing the last row reset inferred document identity and suppressed legitimate success; accepted navigation could change routes before the next paint, including A → B → A. Final code passes a read-only getter for the existing Archive navigation intent, view and document ID into InputReview. It introduces no second navigation owner. Direct actions, existing assignment sessions and removed-Input restore now qualify their acknowledgements against that exact route and existing review epoch. Same-document empty repaint retains success.

The implementation was authored by settings_finish; the coordinator independently inspected the final runtime and ran:
- `/tmp/settings-pending-actions-root-related.log`: six complete related files, 56/56 PASS, no skips/cancellations, 541ms.
- `/tmp/settings-pending-actions-root-final.log`: 16 acknowledgement-owner cases plus the original complete UIR-04 Data file, 17/17 PASS, no skips/cancellations, 35.112s total. Native Data 34.921s includes source, backup recovery and release; final last-row standalone/ignore success text assertions are enabled. No visible browser, account or remote service.
- `git diff --check`: PASS.

Final SHA-256 evidence:
- ui/review.js: c28e3adc6dc189740cd93f95a1c983551a334d1bebbd126e416a559ee6d866d6
- ui/archive.js: bf8217f64eb90b0a6b3435b19dcb0476db53321cf0fc2ffee42477d474462155
- tests/settings-pending-actions.test.mjs: 01db1770ca25153a3a533e72cc1d2b90fa9aa5bac17c6ab03a90df01a26556ec
- tests/uir-04-data-chrome-e2e.test.mjs: fc1da2e29cc58c6f0892a44d3ba292647940e4a62663402e9c47cb31a7294065

This is qualified component evidence, not hosted certification or a claim of complete SYNC recovery.
