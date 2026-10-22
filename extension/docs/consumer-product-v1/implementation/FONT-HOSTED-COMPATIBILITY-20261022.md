# Hosted font compatibility successor — 2026-10-22

PR313 review requests [6340471218](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6340471218) and [6340538786](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6340538786).

Exact base `bdfa720e24050e9edf4d6244b7a06076b9c37905`; implementation `af5ed6b529886250526a12665f7d4530e5b42bfa` on `codex/font-hosted-compatibility-20261022`. Only `extension/scripts/prepare-browser-fonts.py` and its owning `extension/tests/cpv1-02-hosted-browser-setup.test.mjs` changed. Workflow and versions unchanged. The new policy key v3 invalidates earlier plans/cache identities. This successor is independent of Current publication and has not been integrated into the acceptance head.

## Diagnosis and bounded repair

- Native APT2.8.1 sets three algorithm constraints. Blanket rejection was an availability regression. Precisely allow those three defaults; unknown, empty or weaker values still refuse. [Native defaults](https://github.com/Debian/apt/blob/2.8.1/apt-pkg/init.cc#L123-L125).
- Support the original `mirror+file:/etc/apt/apt-mirrors.txt` route, including native archive locators. Audit only that fixed regular file; reject links, path escapes, nonregular files and unsupported URI/priority labels. Fingerprint exact bytes and recheck at plan/install. No mirror selected or host file rewritten. [Original runner manifest](https://github.com/actions/runner-images/blob/5b6567dc8f6adb65a208b8203b7947bf8323de37/images/ubuntu/scripts/build/configure-apt-sources.sh#L8-L18).
- Reconstruct complete Deb822 fields before URI and Signed-By validation. Legal multiline URI/key paths pass; forbidden continuation schemes/credentials, orphan/duplicate fields and unsupported tokens refuse.
- Bind fixed source/config paths, reject nondefault RootDir and command-specific masking. Native apt-config moves its own Binary subtree before dumping, so inspect original fixed config fragments first, refuse unsupported Binary/include/clear/escaped fragments, then force escaped full dump and compare user/root configurations. C/C++ comments are ignored without hiding adjacent Binary keys. [Native subtree move](https://github.com/Debian/apt/blob/2.8.1/apt-private/private-cmndline.cc#L528-L529). Configuration files and mirror bytes are bound and rechecked.
- Original native SHA256/unique signed metadata match, failed staging quarantine, one original download, fatal install behavior, exact cache key and workflow boundaries remain.

The fragment parser is deliberately conservative: custom Binary/include/clear/escaped configurations, ignored fragment files with unsupported content, alternative signing algorithms, alternate mirror-file paths and additional mirror labels remain unsupported. This is not a general APT parser, nor evidence of compromised hosted configuration. Actual host compatibility still requires dot's separately scoped preflight.

## Recorded evidence

Node22.23.4 and Python3.12.14; tests run actual helper with synthetic commands/files. No local sudo/APT/download/install/browser/cache service was invoked.

- Frozen original helper from exact base: **0/6** regression expectations. It rejects safe native defaults/mirror and admits RootDir, forbidden URI continuation scheme/credentials and apt-config-specific overrides. Same controls on repair **6/6**. These are audit/availability defects, not evidence of unsigned installation.
- First existing-file run **18/39**: synthetic dump encoding did not match forced native escaped formatting. Corrected fixture/native format **39/39**. Original failure retained.
- Expanded controlled runs **73/73**, **77/77**, **78/78**; final after comment-adjacency control **79/79**, zero skip/cancel. This covers native key defaults, mirror hit/cold/config-change, complete continuations, file-type rejection, command masking and original hash/staging/install controls.
- Package static audit **21218 guardrails /607 runtime resources** passed. This ran before the final comment-token refinement; no extension runtime resources changed afterward. Final diff whitespace check passed. No Full, hosted CI or browser repetition.

[Evidence manifest and exact two-file hashes](evidence/font-hosted-compatibility-20261022/manifest.json). All original and intermediate logs are compressed alongside it, with both raw and compressed SHA256. `negative-controls.py` reproduces the six controlled comparisons when passed helper-under-test and repaired helper reference paths.

## Remaining qualification

**NOT_RUN:** real Ubuntu24 APT2.8.1 preflight; signed native plan; hosted cache cold/hit; actual CJK font selection; native browser and Full qualification. Dot owns independent review, integration and separately scoped hosted checks. No cloud retry/activation, acceptance-branch change or cache-save-policy relaxation. Historical STALE_BASE and MEMORY_STALE remain UNKNOWN. This item does not resolve them.
