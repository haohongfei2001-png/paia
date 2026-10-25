# Independent review: original document retirement guard

Frozen commit `cb0f47e4d084c1da1b7202e53e318769404bf12f`, parent `93504fbc4166e5093fa0ecada78052593c44f256`, isolated tree `prompt-document-retirement`. Working tree clean. Runtime SHA256 `9d7a23ef76df650671ec07dee338251e93e25dcff3d79a35b2c564e049bce43c`; owning test SHA256 `e870c60e8bebc688640462fd120c10292777312a69cfc66b4ab8645caa5970ee`. All eight evidence manifest entries verified. This review ran no tests.

## Decision

No blocking issue found in this narrow successor. Suitable for local integration. It closes post-pagehide native admission on the original document owner, without changing birth-time legacy compatibility, granting global host coverage, or treating already-issued native work as canceled.

## Concrete paths reviewed

The original pagehide listener already permanently retires the shared private document state. The new insertion-entry check refuses fresh legacy and signed requests before adding a pending operation. A previously accepted signed operation can await its digest, registration, worker qualification or original lane qualifier; its eventual shared `#once` entry now refuses retirement with the original not-entered proof. Original receipt accounting and ACK publication retain their existing behavior.

The native boundary also checks retirement **after** both original guard calls, focus, selection placement and other synchronous callbacks, immediately before `attempted=true` and the original native command, with no intervening await. This ordering addresses the review finding that a guard itself can synchronously emit pagehide while returning true: a check only before that call would still allow native entry. Both legacy and receipt controls exercise the second guard invocation, as well as focus and placement reentry.

No new retirement check is placed after native issuance. The existing verification, finally-listener removal and ACK paths still report the actual inserted or UNKNOWN outcome. The already-issued tests retain the original receipt and ACK by making the synthetic ACK response unconfirmed; they do not change production reclaim behavior. Pagehide does not clear attempts, receipts, inventory, or legacy coverage. Pageshow, exact hold release, adapter reinstantiation and bundle re-evaluation do not reset the existing private retired bit; a different genuine document gets the original normal legacy behavior.

## Verification evidence and limits

Initial unchanged-runtime new controls: 1/14, exit 1, 202.258625 ms. Twelve failures exposed admission/native retirement gaps; one was a new positive fixture expecting an acknowledged receipt that the original owner had legitimately reclaimed. The baseline source and log remain intact. After static review, a fifteenth control was added for the actual lane qualifier await; no second baseline was run.

One final complete invocation of both original owning files: **110/110**, exit 0, TAP 1402.522833 ms, zero fail/cancel/skip/todo. This comprises the original 18 hold cases, original 77 composer/receipt cases and 15 new retirement controls. Original 18-case contents remain an exact prefix and the original 77-case file is unchanged. The reviewer verified hashes, command/exit evidence and complete final summary, without repeating execution.

These are Node 22.23.3 synthetic VM DOM/transport controls. They do not prove native browser behavior, current complete host inventory, pre-protocol historical closure, or the separate actual driver-to-adapter roundtrip. No production activation gate, permission, worker, receipt driver or shared harness changed.
