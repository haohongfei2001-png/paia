# APT executable selection binding — 2026-10-22

PR313 requests [6342793291](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6342793291) and [6342837640](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6342837640). Independent branch `codex/font-apt-key-selection-20261022`, exact base `2b87e957e7e528c48120cee03f8ae35c3789cd2e`, implementation `a20509de1b89d016f29c9981340ec517c0fd4bfa`. Two code/test files; this report and evidence are separate. No acceptance branch, version, workflow, CI or host configuration changes.

## Cause and minimal correction

The original effective-configuration audit accepted alternative APT wrapper and access-method routes. A separate gpgv capability probe could not prove which executable APT would actually select. This is a demonstrated audit gap, **not evidence that the observed hosted image had an override**.

Official Ubuntu APT2.8.3 source (SHA256 `088522b3613b28fdbcfa61f1f7e476bf6dc6b0120a8f74409e9527580c9f9d3b`, matched its dsc) establishes:

- `apt-pkg/contrib/gpgv.cc:152` uses `Find("Dir::Bin::apt-key", ..."/apt-key")`. `Find` uses the compiled default for absent or empty values. It does **not** concatenate a parent via FindFile. The supported wrapper is `/usr/bin/apt-key`; explicit equivalent and absent/empty default pass, other spelling/routes refuse.
- `apt-pkg/init.cc` supplies `/usr/lib/apt/methods`; `acquire-worker.cc:96` checks the existence of each `Dir::Bin::Methods::<Access>` before choosing FindFile versus the default directory. Reject every per-access override, including gpgv, http, empty and list-shaped values. Require the exact original method directory.
- Preserve the native empty `Dir::Bin` parent and existing `/` Dir / empty-or-`/` RootDir restrictions. Reject unsupported parents conservatively, without claiming they concatenate into the raw apt-key Find result.
- Official package `debian/apt.install` contains `usr/bin/apt-key` and `usr/lib/apt/methods/`. The public amd64 deb was read in memory to verify the actual wrapper member, without installing or executing it; URL and exact hashes are in [official-selection.json](evidence/font-apt-key-selection-20261022/official-selection.json).

Only six helper lines add these gates. Existing fragment checks, process-local algorithm policy, native SHA256/metadata binding, source/mirror checks, quarantine, unique original download and fatal installation remain unchanged. Existing tests/assertions remain; synthetic default configs gain the actual method directory.

## Algorithm policy semantics

The base Assert-Pubkey-Algo policy rejects disallowed algorithms. APT2.8.3 `methods/gpgv.cc` separately places signatures failing Next in SoonWorthless; Future describes future deprecation (the LaterWorthless push is commented in this source). These are warning/future policy semantics. Keeping exact Next/Future values does **not** mean every currently accepted signature must use RSA3072. Actual native propagation/enforcement remains a hosted qualification gate.

## Validation and preserved failures

Node22.23.4 / Python3.12.14. Original helper: apt-key controls **3/8**, method controls **1/9**, preserving all thirteen rejecting-expectation failures. After correction, seventeen route controls plus two existing policy/config controls and five existing acquisition/cache/hash/install controls: **24/24**, zero skipped/canceled. See [manifest and compressed original/final logs](evidence/font-apt-key-selection-20261022/manifest.json). No unchanged aggregate/package/Full rerun; prior results belong to their recorded commits.

Command (from repository root, using the recorded Node/Python runtimes):

```sh
node --test --test-name-pattern='hosted font compatibility: (apt-key-|method-|weak-key|config-hidden-subtree)|font archive control: (hit|cold-miss|resolver-hash-mismatch|staged-copy-corrupt|install-failure)$' extension/tests/cpv1-02-hosted-browser-setup.test.mjs
```

Static diff check passed. Actual Ubuntu configuration, gpgv chain, signed plan, font download/install, CJK selection, cache cold/warm and browser/Full remain **NOT_RUN** for this successor. No local sudo/APT/gpgv execution. Dot owns independent review and the bounded native qualification. Historical STALE_BASE/MEMORY_STALE are unchanged UNKNOWN.
