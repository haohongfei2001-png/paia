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
