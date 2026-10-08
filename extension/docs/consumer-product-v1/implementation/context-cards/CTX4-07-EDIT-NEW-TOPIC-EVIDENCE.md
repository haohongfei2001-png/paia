# CTX4-07 state 05 / 17 local evidence

Base 96fb278a955683537485b0ee2ae327627bfe1baf. Test-only original browser file and this receipt; no runtime, dependency, CI, permission or version changes.

05 has a new `05-inline-unsaved-editing.png`, distinct from the old acknowledged-save screenshot. The actual editor receives ordinary input and real recovery RPC protects the draft. The existing Playwright UI clock is narrowly paused to hold the pre-autosave instant; production autosave code/interval and worker storage remain unchanged. Before and after capture: same focused editor node, exact draft, unchanged saved Item/revision, zero put dispatch and zero ACK. Finally restores clock/observer; original Control+Enter/save/IME/failure checks continue. This is a controlled editing-state picture, not elapsed-wall-time autosave or physical IME evidence.

17 uses the original actual 145th Topic and complete directory. Scroll/focus reveals its stable ID; title 145, data-on=false, aria-pressed=false, viewport containment and focus are asserted. No activation click. Full choice rows, new Topic and protected Source/Input/Thought data stay identical; actual PAIA_CONTEXT_TOPICS_CHANGE dispatch count is zero. Full-page output is 1440×3038 with a 1440×900 viewport; the fixed rail appears at the current scrolled position. It is not claimed to match the private reference whole-window state. Prior 20/50/144, unknown ACK, history, failure, dark and compact assertions remain.

## Actual validation

Original full source/release file **6/6 PASS**, zero fail/skip/cancel, 73.703227542 s; `/tmp/context-state-evidence-native.log`. All six original cases/180000ms budgets retained. Headless, isolated release build/profile, original build guards. No failed browser rerun in this batch. Earlier usability/tablet failures remain in their receipts. Syntax/diff checks pass. Existing zero-network/model and protected-data assertions passed.

All four new source/release PNGs were actually inspected: 05 shows focused unsaved text without a success marker; 17 shows the new final Topic closed, prior selected Topics retained. PNG/JSON local synthetic artifacts are not committed. These are real-state evidence, not private-reference pixel conformity. Independent review APPROVED: reviewer verified the complete 6/6 log, all 16 receipt SHA values, original case budgets/assertions and actually viewed both release PNGs (source image hashes match). No repeat browser run was needed.

## Reference package lookup

Only the directory of user-provided `/Users/hhf/Downloads/paia-codex-handoff.zip` was read: 25 entries, README, manifest/checksums/verification and lane metadata/patches. Context paths are only `lanes/07-topic-context-receipts/metadata.json` and `source.patch`. No Screens.json, PNG, nested ZIP or PAIA-AI-Context-Cards-v2 package exists in it. No patch was extracted/applied. Known PAIA work artifacts contain historical production Context ZIPs, not the approved references. No other project was scanned. **VISUAL_REFERENCE_MISSING** remains; this does not say the owner's original artifact no longer exists.

Full 22-state comparison, installed/physical devices/IME, automatic maintenance quality and trusted external connection acceptance remain outside this batch.

## Exact bytes and artifacts

- `tests/context-cards-chrome-e2e.test.mjs` SHA256 `30d579d6dfcf316e02cbcd28f15237e9d68ef6f39a63d25a37d597b958b15e22`
- `ui/context-cards.js` SHA256 `35ab3ee04ac50e30a0d430348b30c155c9f1961a5d78a6c2c6da535ee457d641`
- `ui/context-cards.css` SHA256 `7d10f19a9213870055d50fdda8afa5ccc9826d9f250d2645c27291566448580c`
- `ui/context-topics.js` SHA256 `77dc75b691b5280e9fb6284b4c7b2f9f64dd256b9fc6e12614d2c1803bfbd6db`
- `ui/archive.js` SHA256 `bf8217f64eb90b0a6b3435b19dcb0476db53321cf0fc2ffee42477d474462155`
- `ui/app-shell.js` SHA256 `a49ac409b40ebca8544b7e5f5eddbc2db0927b2b87421d3ce99bf36b27783958`
- `ui/reader-navigation.js` SHA256 `4fbc4a066474107a7d3d315336d1f06b9c838a0cf43b058c3db8754b24e37a75`
- `package.json` SHA256 `eba30c68864e5e843ab7e214eab5ceba7b61aee9421bb806bac9dc39b37e096c`
- `work/ctx4-01/source/05-inline-unsaved-editing.png` SHA256 `fab0f715961bb8f6ede4e1d1ddd82db37bd540cae4a50f145d307d9d10dffbbf`
- `work/ctx4-01/source/05-inline-unsaved-editing.json` SHA256 `b4a5e02086ba6f573e5270cc83710dfdf3beaced225ef0b1ab46072a080bfb4c`
- `work/ctx4-01/source/ctx4-03/17-new-topic-off.png` SHA256 `29746d863363cf292554440b3545a6fac71d66453504f484b4ef50e75a57a155`
- `work/ctx4-01/source/ctx4-03/17-new-topic-off.json` SHA256 `b4540bd844787a12583d69b57c01a087da484f5b90efdea7e2de11f1508c0e37`
- `work/ctx4-01/release/05-inline-unsaved-editing.png` SHA256 `fab0f715961bb8f6ede4e1d1ddd82db37bd540cae4a50f145d307d9d10dffbbf`
- `work/ctx4-01/release/05-inline-unsaved-editing.json` SHA256 `ca880f9a05a3f261d44238756619006f4ead890f42587bd7e0017f903e67f49d`
- `work/ctx4-01/release/ctx4-03/17-new-topic-off.png` SHA256 `29746d863363cf292554440b3545a6fac71d66453504f484b4ef50e75a57a155`
- `work/ctx4-01/release/ctx4-03/17-new-topic-off.json` SHA256 `b5764d37492ea75fe3f6367a0b1f00fe3188814c2c38595d27efd5b1ebeeb5d6`

## 0.30 combined clock qualification

Combination base `76764fe7`. The preceding 0.29 erase fixture installs and advances the page's UI clock. State 05 must therefore not pause it at a separately sampled Node `new Date()`, which can be behind that installed clock. It now samples one fixed origin from the actual browser clock and pauses at origin + 1000 ms **before** editing. No runtime, autosave interval, worker clock, assertion or test budget changes. Original media readiness, state 05 protected draft/same node/zero dispatch/zero ACK/unchanged saved row, state 17, failure, IME and all six journeys are retained.

Exact combined original file source/release: **6/6 PASS**, zero fail/skipped/cancelled, 72.71485525 s; `/tmp/context-030-clock-final.log`. This supersedes neither historical hashes above nor broader visual/external acceptance limits. Current test SHA256: `66522f995c3330a3e00c52adad1644a532eed6541ab5419b3ecf2d897cfbf5cc`. Syntax and diff checks pass. Synthetic PNG/JSON artifacts stay local and are not committed.
