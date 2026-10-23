# PR313 exact Node 22 local verification — 2026-10-23

The explicitly approved isolated official Node download and three complete local files finished in one invocation: **144/144 PASS, exit 0**, no failure, cancellation, skip or todo. This is macOS arm64 evidence, not Linux hosted qualification or a solution to shard capacity.

## Identity and official acquisition

Source HEAD `3f1c58d394a2d5730b625e1293eb399d49c10d5a`; independent evidence branch `codex/pr313-node22-verification-20261023`. No source edits. User approval was relayed verbatim by dot for official isolated download and these three tests only.

- Official index: https://nodejs.org/dist/index.json ; exact `v22.23.3`, release date 2026-09-23, `osx-arm64-tar`, npm `10.9.9`.
- Official archive: https://nodejs.org/dist/v22.23.3/node-v22.23.3-darwin-arm64.tar.gz
- Official checksum: https://nodejs.org/dist/v22.23.3/SHASUMS256.txt
- Actual archive SHA256: `23b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53`, exactly the official entry; checked before extraction/execution. Archive bytes: 49963763.
- Actual versions: Node `v22.23.3`, npm `10.9.9`, Python `3.12.14`, existing Playwright module `1.63.0`; host macOS arm64. Playwright was retained in environment, no browser was launched.
- Archive/runtime remain only under the existing worktree `work/node22-official-20261023/`, with a local ignored directory. No binary added to Git, system version/PATH/profile/permissions/global package changes.

The first web-tool checksum view was inaccessible via that tool; a regular HTTPS request to the same official URL succeeded. No TLS bypass, unknown mirror or access-denial workaround was used. The index was initially retrieved to `/tmp/paia-node-official-index-20261023.json` and copied into the isolated evidence directory; the executable archive was downloaded and extracted only inside the worktree.

## Complete invocation

Working directory: `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/extension`.

```text
/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node --test --test-concurrency=1 tests/sync-node-preflight-ci.test.mjs tests/d5-full-browser-partition.test.mjs tests/cpv1-02-hosted-browser-setup.test.mjs
```

Only the invocation environment prefixed the isolated Node bin and existing Python3.12 libexec to PATH. `PYTHON` was the absolute `/opt/homebrew/opt/python@3.12/bin/python3.12`, avoiding the historical shell-function recursion. Exact overrides, version assertions, download commands, timestamps and source vectors are in `execution.json`; environment secrets are not recorded.

No name filter; concurrency 1. The three full files were sync-node-preflight-ci, d5-full-browser-partition and cpv1-02-hosted-browser-setup. All original assertions, the original coverage checker, synthetic font-command safety cases and negative controls ran unchanged. No real APT/sudo/font/network service or paid model was invoked by the tests.

TAP: tests 144, pass 144, fail 0, cancelled 0, skipped 0, todo 0, duration 3654.714625 ms. Wrapper elapsed 3.6794197499984875 seconds, exit 0. This is one actual invocation; historical Node24 144/144 and earlier failures remain separate.

## Source binding

- `extension/tests/sync-node-preflight-ci.test.mjs`: blob `a25b9af2262303e9f818c9bb950469f3d33c58ff`, SHA256 `dc39f4ab5413f9d6efb335380e61c86e85c81195a5b9dd658506ae4d549ebc8e`.
- `extension/tests/d5-full-browser-partition.test.mjs`: blob `c17aac51cbce0f1d376202c2dc3ef16d0a3ded92`, SHA256 `254e76849020410eefbe0c88db515998fdef7a0c81ce91053f8f67a5933fc340`.
- `extension/tests/cpv1-02-hosted-browser-setup.test.mjs`: blob `dc269ea06c59d5cf99dd463298d1634a2dcecb09`, SHA256 `32256cdc5db06d20f58cfe7792d745183862c42a6ecdb71402b29fb176ef0556`.

The three source vectors match before and after. No production/shared harness/helper/workflow/router/version/acceptance-head/main edits. No release build, browser rerun, CI, Full or deployment. PR312 two Full attempts and PR313 first Full remain consumed. Linux capacity, cancellation/Unit1 causes and four service-native qualifications remain separate unresolved work owned by dot.

## Evidence

`evidence/pr313-node22-verification-20261023/` contains the official index/checksum response and HTTP headers, exact execution record, complete TAP log and SHA256 manifest. The manifest covers the report and all six evidence content files; original failures are retained in their original reports. No new failure occurred in this approved invocation.
