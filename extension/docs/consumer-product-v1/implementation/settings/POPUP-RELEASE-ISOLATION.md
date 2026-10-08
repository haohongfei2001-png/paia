# Popup release fixture isolation

Base: `b425105d954178f6db036c7e02abc430ce71f214`. Test-only repair; no runtime, CI, version or timeout change.

Full run 37792341694 Browser 2 failed the source/release popup owner with `ENOENT work/current-release/manifest.json`. The preceding preview-mask source journey failed before its builder call. Popup assumed that shared output already existed; `scripts/test.mjs` delegates whole files to Node (concurrency 1 or 4), without guaranteeing a release build. FakeChatGPT owns profile cleanup, not that shared release. No deletion by the preceding test was demonstrated or required to reproduce this defect.

The popup source/release owner now builds with the existing audited builder into its own temporary root, explicitly passes the release path, and removes only that root in finally (including its builder lock/fingerprint). Both original journeys and all their assertions remain unchanged. The separate native-action popup case is unchanged.

Evidence:

- `/tmp/popup-release-before.log`: the original complete source/release owner fails with the same ENOENT in a clean worktree (2.461 seconds).
- `/tmp/popup-release-after.log`: the repaired complete source/release owner passes, 1 top-level case covering both variants, 4.031 seconds. Explicit headless, Playwright 1.63.0. The shared release manifest remains absent afterward.
- Node syntax check and git diff check pass. Builder package/release audits execute normally; no bypass.
- Exact test SHA-256: `cd6b5a82134792236f7ab24f4d426e152acc06a6b448bf876bab51f8cf0aa155`.

The unchanged headed native-action popup case was not rerun locally; its hosted evidence is separate. This targeted acceptance is not a full-suite or main delivery claim. Original failure log remains intact.
