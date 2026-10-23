# Local Sync continuation milestone — 2026-10-23

## Implemented scope and identity

The safe integration branch composes resident Saved AI-job preservation, private checkpoint storage v2 with retained v1 cold readability, durable original active-library reopening, and a cold module-entry fix in the original Human journal. Runtime freeze is `f04141f0b926b9f9faa94aba5e2768bb4f33e7fb`; native bridges and correction records are included through `974de197087262a270a929883b16c768785a3ce2`. Final `474b00096a539806a5b4385782984aa5340c9116` changes only the selected-library negative test.

Resident jobs remain local and use the original semantic invalidator; expected full-table results are prepared before writes, not copied from the result. Original journal method identity is checked before calls. Active reopening binds the original durable registry, receipt and physical catalog and refuses implicit creation/migration. New private checkpoint bytes do not increase task budgets or prove scale capacity.

## Actual separate executions

| Invocation | Result | TAP milliseconds | Wall milliseconds |
| --- | --- | ---: | ---: |
| Original semantic invalidation after module-entry repair | 14/14, exit 0 | 2969.827708 | not captured |
| New module-entry guard plus original single-cut | 11/11, exit 0 | 574.857041 | not captured |
| 26 complete owning Node files at f04141f0 | 495/495, exit 0 | 144587.920917 | 144612.931709009 |
| Standard development build at 974de197 | exit 0; 670 files, 23049 package / 646 runtime checks | n/a | 2244.188625001698 |
| Five native Source/Release packages | **8/10, exit 1** | 89789.123458 | 89827.14570900134 |
| Corrected complete local-library owning file at 474b0009 | 22/22, exit 0 | 15609.724458 | 15739.82345800323 |
| Corrected local-library Source/Release pair, same release reused | 2/2, exit 0 | 37457.772 | 37497.97108399798 |

The two native failures were the missing-catalog negative: the isolation factory prefixes physical database names, but the test deleted a logical-name catalog key that did not exist. The correction derives the key from the real repository name and asserts target existence before deletion and absence afterwards. The original rejection and all-table preservation assertions remain. No runtime changed and no second release build was run. First failed receipts remain in `native-artifacts`; corrected receipts are separate. This is not a single 10/10 run.

Each variant actually executes original bodies: checkpoint cold storage 6, copy retirement 17, explicit small phased-cold allowlist 18, resident jobs 18, corrected active-library 22. Final receipts use the real native IndexedDB factory and report zero external network attempts / HTTP requests. All database cleanup is confined to owned synthetic databases; only the harness archive remains. The original phased-stage whole file is not selected by the 495-test command.

Environment: Node 22.23.3, Python 3.12.14, Playwright 1.63.0, Chrome 156.0.8078.47, macOS 27 arm64; temporary headless profiles and synthetic data. Exact commands and full before/after vectors are in the three execution JSON files, all stable. Native bridge uses explicit case-name allowlists, not negative name filters.

## Separate execution-boundary correction and new authorization

Before this root milestone, an agent accidentally selected the original full phased-stage file with a negative name filter. Its 40/40 assertions include the actual 65/129 budget refusals, not successful restores. The 129 case stopped at 36 owners; the 65 case refused final closure. This exceeded the then-authorized execution scope and was disclosed immediately. Preserve `../checkpoint-storage-v2-20261023/EXECUTION-CORRECTION.md` and its original TAP. Do not describe the whole turn as having no large execution.

The subsequent direct human approval authorizes a NEW limited implementation and exactly one local 129-group restore with one cold reopening after small safety tests. Ordinary 4096 references / 2 MiB / 30 seconds stay unchanged. Only private task-bound phased Human final verification and cold reconstruction may use 8 MiB, with new-task cumulative 64 MiB / 120 seconds; old tasks cannot migrate or refill. That implementation and authorized single execution are pending in this milestone. The later approval does not retroactively authorize the accidental earlier execution.

## Runnable artifact and remaining work

The uninstalled development extension is at `work/local-sync-continuation-20261023/release` in the original integration checkout; build output is intentionally not committed. Version remains 0.55.9 Development. No browser reload, installation, cloud CI, Full, credentials, paid model, real-account data or deployment occurred here.

Incoming Human create/edit into a nonempty mixed Saved library, negative-intent preservation across selected-library continuation and qualified scale recovery remain active implementation work. Full mixed positive/negative checkpoint restoration, broader graph qualification, whole-programme matrix, real services, cross-platform/visual and human-use acceptance are not certified by these local results. Historical cloud failures/attempt limits remain unchanged; no Linux performance/capacity guarantee follows.

`SHA256SUMS` covers this report, all retained logs, exact execution vectors, native receipts and the reproducible runner, excluding generated release files and build lock/fingerprints. The safe branch is separate from frozen PR313 and main.
