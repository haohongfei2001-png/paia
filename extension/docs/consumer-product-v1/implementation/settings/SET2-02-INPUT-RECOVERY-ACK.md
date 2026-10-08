# SET2-02 Removed Input acknowledgement ownership

Base: 19f45dfc. Local UI safety batch; integration pending. No core, schema, permission, worker, navigation owner, CI or version changes.

InputReview locks each Input restore synchronously and records the current removed-list epoch. The existing EXCLUDE_LIBRARY request is unchanged. A durable restore may complete after leaving; only its automatic navigation and failure feedback require the original current owner. Leaving and reentering cannot qualify an older acknowledgement. Same-owner repaint retains the pending request, disables replacement controls and directs a current failure to connected replacement status nodes. All pending controls unlock after completion. Branch-assignment actions and restore domain semantics are unchanged.

## Actual evidence

- `/tmp/settings-input-recovery-owner-before.log`: two actual InputReview negative failures, late acknowledgement navigated after leaving and duplicate activation sent two requests. Initial `/tmp/settings-input-recovery-before.log` was only a missing DOM fixture method, not product evidence.
- Independent reviewer found a current-owner repaint error gap. `/tmp/settings-input-recovery-repaint-before.log` reproduces a rejected request after the original row detaches with no visible replacement feedback. Final owner file has 8/8 PASS in `/tmp/settings-input-recovery-unit-final.log`.
- `/tmp/settings-input-recovery-related-final.log`: four complete files (settings-input-recovery, settings-removed-list, settings-reader-return, uir-04-data), 19/19 PASS, zero skipped/cancelled, 77.45ms.
- `/tmp/settings-input-recovery-native.log`: failed fixture used a source-record ID rather than the Input block ID. `/tmp/settings-input-recovery-native-final.log`: failed fixture stopped at the removed conversation collection without opening its document. Both retained; neither is a runtime failure or a pass.
- `/tmp/settings-input-recovery-native-final2.log`: original whole UIR-04 Data file, 1/1 top-level PASS, 27.588s. Source, empty-profile backup restore and fresh isolated release all execute. Added source/release journeys capture a synthetic Input, remove it, open the actual Settings removed-list/document, hold the real worker restore acknowledgement, assert durable excluded=false, reject a duplicate event, leave to Settings and preserve its full history state on acknowledgement; then repeat a normal current-owner restore and verify Reader text. Programmatic duplicate MouseEvent intentionally tests a disabled-control bypass, not physical double-click evidence. Original restore/privacy/no-network assertions and 300s test budget remain.
- `/tmp/settings-input-recovery-package-final2.log`: 12457 package guardrails / 376 runtime resources PASS. Earlier final.log invoked a nonexistent tools path; retained as tooling failure. `git diff --check` PASS.
- Root independent review: 8/8 PASS, 46.6ms. root_finish independent final review: 8/8 PASS, 57.6ms, including replacement feedback. Both approve bounded UI ownership semantics.

Headless synthetic Chrome with explicit matching Playwright 1.63.0; no visible browser, account, paid model or cloud data. This is not full Input recovery-domain certification, hosted coherent certification or a delivered release.

## Runtime/test byte binding

Before and after the successful browser run, SHA-256 values match:

- ui/review.js: `4ce11c9b5e763de7c20cc51606dbff91f5dbdb832dbafe343d9144a8f0220798`
- tests/settings-input-recovery.test.mjs: `86f73ed142ff45b51af2ef7545b53ae5d987a9a6b12dc42c650baed8b6d4b6c7`
- tests/uir-04-data-chrome-e2e.test.mjs: `77a569e35c2cfc1fd943de038be959251aea1bec036f80f22adc4aa9964e03aa`
