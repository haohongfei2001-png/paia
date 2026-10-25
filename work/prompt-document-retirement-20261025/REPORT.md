# Original document retirement guard — local successor

Base: `93504fbc4166e5093fa0ecada78052593c44f256`. Only the original composer adapter and original document-hold owning test change, plus this evidence directory. No worker, receipt driver, runtime DTO, shared harness, manifest, global gate or permission changes. No push, browser/native, CI, network, install or scale run.

## Behavior

The already existing pagehide listener sets the private, original per-document retired bit. This successor checks that bit before accepting a new insertion, on arrival at the shared native operation, and after every original synchronous focus/selection/caller-guard callback immediately before native entry. Both existing legacy and receipt routes use the same guard. The last check follows the caller guard, so a synchronous pagehide emitted by that callback cannot slip through. A later pageshow, constructor reuse or exact selection-hold release does not revive this document owner.

An operation which already issued the native command continues its original verification and ACK logic. Retirement does not fabricate cancellation, inserted success or terminal coverage. Actual UNKNOWN remains UNKNOWN. Original unretired legacy insertion remains supported; no birth-deny policy or legacyCoverageUnknown change is introduced. A rejection before receipt admission is only a failed local call, not a fabricated durable receipt.

## Evidence and failures retained

- Initial 14-control baseline against unchanged runtime: **1/14**, exit 1, 202.258625 ms. Twelve failures expose actual unguarded post-retirement native entry/admission; one failure belongs to a new positive test fixture: the original successfully acknowledged inserted receipt had been reclaimed before its READ assertion. The initial test snapshot and complete log are preserved. That positive fixture now supplies an unconfirmed ACK response, preserving original receipt-read evidence without changing production reclamation.
- Independent static review of the narrow successor confirmed the final check ordering and no issued-operation outcome changes. Reviewer requested one extra original lane `qualify()` await control in addition to the original worker-QUALIFY await control. It was added before the final run and did not trigger a second baseline run.
- **One complete final invocation: 110/110**, exit 0, 1402.522833 ms, no fail/cancel/skip/todo. Original 18 document-hold cases plus original 77 composer/receipt cases plus 15 new retirement controls. Both complete owning files ran without a name filter. Original 18-case file bytes remain an exact prefix; the 77-case file and receipt runtime are unchanged. Node 22.23.3, local macOS arm64, synthetic VM DOM and transport. This is not native browser or whole-product acceptance.

Controls cover legacy/receipt new admission, focus/place/final-caller-guard synchronous reentry for both routes, pending real digest/registration/worker qualifier and original lane qualifier, actual already-issued inserted/UNKNOWN results with original ACK/read evidence, permanent retirement through pageshow/release/re-evaluation, and normal legacy behavior on a distinct fresh document.

## Limits / next useful independent package

This closes a genuine original owner lifetime gap, not complete host inventory. Old constructors, unavailable documents, historical receipt/accounting UNKNOWN, and legacy coverage remain unqualified. Actual source-level adapters and known-document driver have separately passed synthetic checks; that does not certify a paired driver-to-document hold protocol or a real browser.

The next independent small test package can wire the real PromptInsertionReceiptOwner original tabs.get/sendMessage implementation to the real adapter VM document listener, and the VM original runtime registration/QUALIFY/ACK messages back to the original receipt owner. Use a single origin-bound original document, then multiple original registered documents, under the real 4096-reference/2MiB/30s cumulative work ticket. Assert HOLD/FENCE/exact RELEASE, pending original native completion, document retirement during acquisition, late original response cleanup, wrong document/challenge refusal, negative and UNKNOWN ledger behavior, and continued `legacyCoverageUnknown=true`. Own only a new paired VM test and evidence unless it exposes a separately reviewed runtime defect. This must not replace full-inventory proof, unlock global selection, add permissions or use real user data. Existing paired registration tests in the original 77-case file do not cover the new known-document hold driver end to end.

## Reproduction and source identity

See commands.txt, source-vector.json, implementation.diff, baseline-chatgpt-composer.js and retirement-controls.test.mjs.snapshot. All logs retain the actual outcomes; no prior failures are replaced. This task created no long-running process and both test invocations completed. Source is frozen for independent post-run review; no further test rerun is needed absent a new code change or finding.
