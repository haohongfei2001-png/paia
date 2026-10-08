# 0.26 Topic view transition interaction ownership

Base checkpoint: 6f09306c (explicit saved-field disclosure consumers). This subsequent runtime repair is separate from that test-only checkpoint. No CI, version, storage or provider behavior changed.

## Preserved failures and cause

D5 also needed the real saved-field disclosure before reading currentView. With that explicit action, complete Content first ran 3/4: source failed exact History invoker focus, release passed (`/tmp/ai-disclosure-content-native.log`). The targeted trace (`/tmp/ai-disclosure-content-focus-trace.log`) recorded History focus followed by the still-pending view switch focusing the AI toggle before the History dialog opened. Escape therefore restored the wrong invoker. No assertion or budget was changed.

The first focus-ownership repair passed its actual owner tests, but complete Content + UIR03 still ran 10/12 (`/tmp/topic-view-focus-native-final.log`): source reading options closed and release History became hidden. The presentation owner still remembered the old view until asynchronous refresh completed, so its late sync closed a newly opened options menu. The deterministic ordering negative is retained in `/tmp/topic-header-view-before.log`; the original focus owner negatives are `/tmp/topic-view-focus-before.log`.

## Repair and boundaries

The existing presentation synchronizes immediately after changing the view, before asynchronous paint/refresh, and immediately when a failed refresh rolls the view back. No new header owner is introduced. View-switch focus restoration now requires the same Topic/open/dialog/presentation intent, no intervening focus or pointer takeover, and the original toggle or document body still owning focus. Temporary listeners are aborted in finally. The normal keyboard toggle path still restores focus; newer interactions retain it.

D5 explicitly opens the saved AI disclosure and retains its original exact History invoker, same header nodes, held response/remount, title, touch and preference assertions. Its failure-only bounded focus trace contains element identities and timing, no user text. No force click, sleep, timeout extension or settling precondition hides the races.

## Exact local verification

- Four complete related unit files: **51/51 PASS**, 1.942044333 seconds, `/tmp/topic-view-focus-final-unit.log`; six new actual switchView cases include held refresh ordering and failure rollback.
- Independent settings_review: six complete owner cases **6/6 PASS**, `/tmp/topic-focus-independent2.log`; both focus fencing and forward/rollback sync reviewed with no blocking finding.
- Complete unchanged Content file (four source/release cases) plus complete UIR03 file (eight cases): **12/12 PASS**, 86.448336208 seconds, no skipped/cancelled cases, `/tmp/topic-view-presync-native-final.log`. This final run covers the new runtime bytes; prior 3/4 and 10/12 results remain failures, not reused passes. The original UIR03 legacy evidence, durable B, exact reachable OFF anchor, disclosure keyboard and privacy assertions remain.
- Headless synthetic browser only. This is local component verification, not final PR210 certification or a merged/user-installed version. The coordinator owns integration and final exact-head CI.

## Tested bytes

- ui/topic-workspace.js: `9c0118069f5ac3e5bded37126a58cb503d8751fea3ec361dd4194786b9fdf4be`
- tests/harness/d5-topic-header.mjs: `8499ce8772656aabf11d36e0b55c345bf046b565eed9e7533b1ebb64599b5337`
- tests/topic-view-focus-ownership.test.mjs: `c6c4632eadbe4cf5120772993cc33ce3c0390792704b8dd68858746ea62de7c8`

Generated untracked D6 reference assets are not part of this checkpoint.
