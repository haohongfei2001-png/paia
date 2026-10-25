# Original review restriction and Sync reservation — local prerequisite

Root base 34cc9bf. This step restricts the exact original private reviewed selection while a lifecycle reservation exists. It does not enable ACTIVATE / CONTINUE / RESTART, grant global quiescence, or turn a constructor/DTO/caller callback into authority.

The core token is module-private, tied to the original prepared cut and lifetime, with sticky invalidation. A changed SDK method cannot be restored to revive an already invalid token. An attempted marker write permanently excludes that prepared review from untouched reservation classification, even if the original transaction rolls back. Six stateful public owner entries refuse while held. Close invalidates the original review and does not reopen admission.

Independent review found that preaccepted status / continue / cancel were not tracked as busy. Each original method now sets busy synchronously and retains it until the original helper promise actually settles; the helper protocol, SDK dispatch and UNKNOWN semantics are unchanged. Another owner and standalone cold helpers are outside this narrow owner restriction, so this is never global protection.

Evidence (all local Node22.23.3 / fake IndexedDB):
- Initial five controls 5/5, TAP2552.540916ms. Initial source and tests retained.
- Added SDK-restoration control: old source 0/1, sticky fix whole five controls 5/5, TAP2518.650708ms.
- Independent-review pending-entry controls: status / continue / cancel original deferred read 0/3, TAP1663.693ms; before-source snapshot retained.
- Corrected whole restriction file 8/8, exit0, TAP4060.118916ms, no fail/cancel/skip/todo.
- The historical core lifetime combination 47/47 predates this step; lifecycle 164/164 uses the earlier core restriction and predates the final pending-entry fix. A combined final candidate will be recorded separately after integration.

Original commands used the existing absolute Node22 executable and --test, with --test-name-pattern only for explicit negative controls; no browser, provider, network, installation, cloud, large-scale fixture or altered execution quota. Raw failure logs are unchanged.

The lifecycle candidate 9f94fd7 is reviewed separately; it must not be used without this original core dependency. Release is a conservative factual ROW reread within the original fixed deadline, then synchronous core release before local admission. No marker/SDK attempt or uncertain result may reopen admission. Production configuration remains absent.

## Integrated read-only review regression and correction

First twelve-file integrated run on 031af6e: **216/219**, exit1, TAP66932.254958ms; all three failures were actual Settings PREPARE hidden/disabled. The new lifecycle condition required attached Context to be settled even for the existing read-only complete-cut review. That state is deliberately absent at ordinary startup, so this was a real integration regression. Full raw output and original source vector are retained.

Context settlement is now required at reservation acquisition and every reservation check, while read-only preparation retains its existing role. All other pending/blocked/uncertain/identity checks remain. The actual worker test explicitly prepares the original review without enrollment and then proves its reservation is refused; no global activation gate changes. The original no-argument reservation assertion is updated to the new private-owner API and additionally proves preparation availability / owner acquisition reject while a genuine checkpoint request is pending.

Two complete actual synthetic worker/editor files **10/10**, exit0, TAP6626.841208ms (before the added repeated currentness Context check). Independent review recommended retaining this check at both initial reservation and later currentness. Final combined candidate is recorded separately.

Final integrated candidate, twelve complete owning files **219/219**, exit0, no fail/cancel/skip/todo, TAP71916.049583ms; wall71943.769792ms. Exact command and fourteen source hashes are in selection-reservation-final-input.json. Sources were identical before and after; the temporary link to the existing locked pg dependency was removed in finally. This is Node22.23.3 synthetic worker/fake IndexedDB evidence, not native browser, account/provider, capacity, or global activation qualification.
