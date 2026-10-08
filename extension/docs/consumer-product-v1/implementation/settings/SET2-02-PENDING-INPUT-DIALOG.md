# SET2-02 Pending Input dialog session ownership

Base e0dfed3bbff45e46a9540896325461198aae3c2b. Bounded local UI repair, not an import-domain/schema/permission change or release certification.

The existing assignment dialog clears old handlers and disables confirmation before its initial GET_PAGE. Each open owns its immutable Input ID/revision, epoch, pagination cursor and busy state. Late pages cannot append options or replace handlers in another dialog; duplicate page/confirm invocations are fenced even when invoked programmatically. Close, Escape or route departure invalidates UI ownership. A real IMPORT_RESOLVE_BRANCH may commit after closing: its durable success is retained, while an obsolete acknowledgement cannot refresh another dialog, close it or replace its status. Exact expectedRevision, new operation ID and existing domain CAS remain unchanged. Pending same-Input requests are deduplicated across reopen.

Current initial-read errors remain retryable; confirmation requires a successfully read list. Current CAS failure keeps selection and error visible for explicit retry. Normal successful assignment retains refresh/result links and closes its own dialog. Existing standalone/ignore operations retain their behavior and are outside this session-fix claim; their separate late feedback paths remain a possible subsequent audit item.

## Failure and validation evidence

- `/tmp/settings-pending-dialog-before-final.log`: three actual InputReview negatives FAIL before production changes: A/B out-of-order options/handler takeover; old confirmation admission during new read; duplicate confirmation/late acknowledgement closing another dialog. Earlier before.log had a test-await deadlock and is not counted as a completed negative run.
- `/tmp/settings-pending-dialog-unit-final.log`: seven new cases plus eight prior removed-Input safety cases, 15/15 PASS, 86.427ms. No production owner methods replaced with stubs.
- `/tmp/settings-pending-dialog-related.log`: five complete related files, 26/26 PASS, zero skipped/cancelled, 73.24ms.
- `/tmp/settings-pending-dialog-native.log`: original UIR-04 Data whole file, 1/1 top-level PASS, 30.744s, including source, empty-profile recovery and fresh isolated release. Real synthetic history import creates two pending Inputs. The first GET_PAGE response is held; closing A/opening B/releasing A preserves B selection. Real B assignment commits before its held acknowledgement; duplicate programmatic click sends exactly one write. Closing B/opening A/releasing B preserves A dialog/selection and A remains pending. Original Source records remain byte-equal, no-network and complete backup assertions remain. The existing 300s budget is unchanged.
- `/tmp/settings-pending-dialog-package.log`: 12457 package guardrails / 376 resources PASS; syntax and diff-check PASS.
- Root independent final review: actual 15/15 PASS, 87.9ms; session qualification, handler clearing, queued close-event guard, duplicate suppression and domain CAS preserved. Approved exact four-file checkpoint.

Headless synthetic browser with explicit existing Playwright 1.63.0 dependency. No visible browser or actual account/provider. Disabled-control bypass events are deliberate synthetic event tests, not claims of physical double-click behavior. No hosted run dispatched.

## Tested file digests

No runtime/test bytes changed during or after the successful native run. Post-run SHA-256:

- ui/review.js: `b2666a6d49e4ebd4963bd4b8d94120d36bf4668b0a02758c8e5a9ffdb1b43f72`
- tests/settings-pending-input-dialog.test.mjs: `56505265ab608f197ea650b6738ed9e26dba57ff8e392c927afff855dd03a578`
- tests/uir-04-data-chrome-e2e.test.mjs: `1efdd01c8cf0bb4e3eda6c86d1aeb4dc338d3f2e1a9bd1061f711a353e186cc1`
