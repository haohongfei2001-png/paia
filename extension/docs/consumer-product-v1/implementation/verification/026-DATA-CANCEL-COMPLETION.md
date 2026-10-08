# 0.26 Data cancellation completion test repair

Base 05f9cdef. Only the existing UIR-04 Data browser test changes; no runtime, CI, locale, version, timeout or existing case is altered.

## Failure and bounded diagnosis

PR210 head 25eaa2bd Full 37805632506 Browser1 job113409098498 passed43/44, with one UIR-04 Data `true !== false` failure. Artifact11562539093 includes the release Data screenshot, proving the case reached releaseJourney. The hosted custom reporter records only the outer test failure stack; it does not identify the original assertion line. Therefore this repair does not claim the hosted precise line was recovered.

The actual BackupPanel.cancel awaits clearSession, which awaits the real PAIA_BACKUP_CANCEL acknowledgement before hiding the preview. Playwright click completion does not await that handler. The original releaseJourney immediately asserted the preview hidden after clicking Cancel, without a cancellation completion condition.

A deterministic negative executed the actual worker cancel and held only its returned acknowledgement. The existing immediate false assertion failed with actual true, with releaseJourney stack, in `/tmp/data-cancel-completion-before.log`. This is direct proof of the missing test precondition, not a simulated successful backup response or a product cancellation defect. Other plausible hosted false-assert sites are not relabeled as proven root causes.

## Final change and evidence

The same real acknowledgement hold now asserts the preview remains visible and the picker remains locked while cancellation is pending. Releasing the acknowledgement waits with the existing default eventually budget for both preview hidden and picker unlocked, then retains the original exact false assertion. Finally restores the original runtime sender and releases any outstanding hold. All original source, actual restore, isolated release, local-data, privacy and no-network assertions remain.

The entire original file passed **1/1**, 17.392250875 seconds (case17.203465834 seconds), `/tmp/data-cancel-completion-final.log`, no skipped/cancelled cases. That single original case includes source, actual restore and release journeys; it is not three new separately certified cases. No visible browser, model, external account or paid service was used.

Root independently read the precise diff and negative stack and approved the real-ACK wait with unchanged runtime and assertions. Final exact-head CI remains coordinator-owned; this local result does not turn the old hosted failure or cancelled macOS jobs into passes.

- Test SHA256: `0d50a1b76f5dad6b37575ec4b4097355dc4161ae200fdb87d7849227b081e90c`.
- Unchanged ui/backup.js SHA256: `614253d71de27ef06a873e1b07a624f37fdd97b4dfb2d2aa62ab8fee64a59c5e`.
