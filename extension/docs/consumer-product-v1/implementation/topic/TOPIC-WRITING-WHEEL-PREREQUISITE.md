# Topic writing wheel prerequisite — local 0.32 repair candidate

Base: `ca7bfee2`. Test-only; no product, CI, version, or data-owner changes.

## Failure and causal limit

Full `37851777635`, Browser 5 job `113566199236`, tested merge `f007fd96726b348aff21d36d7753e680e0c69991` failed the source variant at “native wheel reaches long reading position while header retains keyboard focus”; release passed. The original `scrollY >= 600` assertion and 90-second per-variant budget remain unchanged.

The raw log is retained at root `work/032-browser5-failure.log`. Artifact `11583161718` was downloaded to `/tmp/032-browser5-artifact.zip`; its summary confirms one writing pass and one failure. Source failed before its first screenshot, and the artifact contains no source wheel geometry. Therefore the cloud failure's precise cause is **not established**. No overlay, timer, focus, or product regression is claimed proven.

An initial diagnostic start followed a failed edit with the wrong relative path; that old-byte run was stopped and is not counted as a pass (`/tmp/writing-wheel-diagnostic.log`). Passive source diagnostics then passed (`/tmp/writing-wheel-trace.log`, `/tmp/writing-wheel-arrival.log`). The recorded original behavior hit `entry-prose` at `(368,258)`, scrolled from 0 to 600 with a maximum of 5743, retained `create-entry` focus, and recorded no anchor restoration. This establishes local behavior only and does not reproduce the cloud failure.

## Narrow correction

Previously the wheel used whatever pointer position the earlier Root link left behind. The test now calculates the visible intersection of the actual target Entry body, verifies `elementFromPoint` hits that body, verifies a scroll range of at least 600 and the exact header focus, then moves the real pointer there before the unchanged native wheel delta of 600. No JavaScript scroll, force click, sleep, retry, or increased timeout is introduced. All writing, same-node, ±2px return, Section placement, failure/retry, Source, and privacy assertions remain.

Passive wheel/scroll/anchor metadata is saved under `extension/work/qa-topic-writing/{source,release}/wheel-arrival.json`; failure metadata is also appended to `Error.message` so the existing CI reporter can expose it. This is a test prerequisite repair plus diagnosis, not a demonstrated production fix.

## Complete local verification

`/tmp/writing-wheel-qualified-full.log`: the original complete source/release file passed **2/2**, zero skipped/cancelled, **14880.236708 ms**. Both variants hit `entry-prose` at `(568,629)`, reached scroll 600 with maximum 5743 and retained `create-entry` focus. Release additionally recorded an earlier zero-delta anchor restoration, without undoing the wheel.

Test SHA-256: `ee978c208fefec56884a55d2cae96c0650164168c289525301dff98362a0d648`.

Independent review by `settings_review` approved the actual point/hit/range/focus prerequisite and preservation of the original wheel, return, and safety assertions. Root independently reviewed the final diff and complete 2/2 log and approved this checkpoint. Hosted verification of the repaired combined head remains pending. The original failed Full is not relabeled successful.
