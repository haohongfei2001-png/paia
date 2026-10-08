# IAH-1.1 completed synthetic host lifecycle

Base f917e1de210fae5b573191139f1222ee9f69aaf5. This is a test-fixture lifecycle repair, not a production performance change or a claim that Linux certification passed.

## Retained hosted failure

Full run 37765721435, Browser4 job113272810300, exact artifact head 1c43070d5fb73bbdabd6cc3f82d2bb2e6b300fdf had one real IAH source 90000ms timeout. Its later job cancellation does not erase that failure. Artifact11545881633 (SHA256 `2b0746ae4d43d4a68c7d8a8f42bef7d592d84d0f4c44a74c7f5d89381523caf3`) records 102/103 cases and no skipped.

The original hosted test was fetched through Contents API and is byte-identical to f917's native file (SHA256 `456e37c5f84f68be68a39014aceea867dad18096f86506e5707e67043f107b50`). The prior Navigator fixture repair is unrelated.

Source completed the final Reader Find purge assertion/held-notice delivery receipt at10:57:16 UTC; timeout was logged10:57:17.619. ZIP timestamps have two-second precision. That receipt contains nine held and nine delivered notifications after the unchanged purge/body/notice assertions. Remaining operations were writer.close, primary Archive return, enabled search, final network/error assertions and context close. Release emitted the same final receipt at10:58:46 and passed10:58:46.647. Source's remaining actions are not declared passed by these intermediate receipts.

## Narrow repair

The two synthetic ChatGPT pages created for filtered context and the deep161-Input fixture remained open after their capture/identity/current-range assertions. Retain their handles and close each after those existing assertions and evidence writes, following the already-existing initialSource close pattern. Subsequent navigation and mutations use actual persisted Archive owners, not either completed host. No dataset,166-record count,161-Input window, Unicode, removed/purged target, stale callback, current-body, zero-network or final assertion was changed. The90000ms budget remains unchanged; no new sleep or timer is added.

A reverse normalization check removed just the two handle bindings and two close lines and recovered the entire original file byte-for-byte. Production/runtime, shared harness, CI and versions are unchanged. Coordinator independent review approved precisely these four edits.

## Local evidence and limits

One diagnostic full source/release run, preserving every assertion and90000ms budget, observed actual worker message counts scoped to synthetic host URLs and message types only. After close, all counts stayed unchanged through the remaining original assertions: source initial/filtered/deep68/55/47; release70/55/47. The counts included repeated RESPONSE_POLL/GET_STATUS/source observations before close. Final context cleanup took180ms/175ms. This verifies resource release, not that it caused the hosted90s failure. Diagnostic2/2 passed in61.53s. Temporary observer/timing copies were moved outside the tests directory and are not committed.

The final uninstrumented original whole file then passed source30.907s and release30.003s,2/2,0fail/skip/cancel,61.774s total. Command: `PAIA_HEADLESS=1 PLAYWRIGHT_MODULE=<existing matched Playwright1.63> node --test tests/iah11-result-presentation-chrome-e2e.test.mjs`. Headless synthetic profiles, original independent release builder and package guards were used. Final log `extension/work/iah-host-lifecycle-final.log`; diagnostic `extension/work/iah-host-lifecycle-diagnostic.log`. No actual user profile, paid model or cloud workflow was used.

Final native file SHA256: `258e07ec3541eae912af672477aecb16bb461ae7862a5f6d8e69c3228129d840`.

Original local full timing diagnostic also passed31.480s/31.921s; therefore no meaningful local speedup or Linux resolution is claimed. The next coherent hosted candidate must rerun this original whole file and its unchanged oracles. Earlier source failure remains open until that result.
