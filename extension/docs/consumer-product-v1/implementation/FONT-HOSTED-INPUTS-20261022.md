# Observed Ubuntu font-input follow-up — 2026-10-22

Addresses PR313 [6341765766](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6341765766) and [6342195552](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6342195552). Isolated branch `codex/font-hosted-inputs-followup-20261022`, exact base `cf467098d78ffe0877ff0379df1710b80b5793a2`, implementation `e3fed3f43e540f4fd660eba0a8515f4829579c5f`. The remote base matched before branching; main had advanced to1f3c826c0c49f9d8fd60156182883866971bb8c3 while PR313head remained7afb39930d53d3478062a3202b369f99f2aaa0ca. No merge, acceptance-head/PR312/version/workflow change or CI activation.

## Original hosted failure, preserved

Dot's [run39788048944](https://github.com/haohongfei2001-png/paia/actions/runs/39788048944), sole attempt1 / headca55e4de49b1f29be4c4085625d0f18be42f343a, sampled frozen helperaf5ed6b529886250526a12665f7d4530e5b42bfa. Ubuntu24.04.5, image20261012.334.1, x86_64, APT2.8.3, Python3.12.3. Workflow success means sampling completed; the helper outcome remains **OBSERVED_INCOMPATIBLE**.

Artifact12430675112 zip SHA2566fd8ec5a518768e1ced29fd51aca1c5f65a2e6015851c17ff77a3079f226e9d3 was downloaded read-only and verified. Its sanitized [original summary](evidence/font-hosted-inputs-followup-20261022/hosted-original-summary.json) is preserved. User/root dumps matched18453bytes/SHA256460060ddde444d7a0d46c654fafbdea9253bb2ec66c1187a5a5541a4203adcb9; all27 inputs read safely and unchanged. Raw dump bytes were not published and have not been reconstructed. No update/resolver/font download/install/cache/browser/Full ran in that observation.

## Diagnosis from actual bytes and official code

All six rejected fragments were independently obtained from public official source/distribution packages and their bytes matched every observed hash: 01autoremove,20apt-esm-hook.conf,20snapd.conf,50appstream,50command-not-found,99needrestart. The test fixture [provenance](../../../tests/fixtures/apt-ubuntu24-observed/provenance.json) records fixed paths, exact URLs, sizes and hashes. Package archives were only read/extracted in the ignored task directory; nothing was installed or executed.

Four fragments contain ordinary hash comments. Native APT2.8.3 distinguishes these from reserved #include/#clear/#x-apt-configure-index syntax. Preserve ordinary comments while rejecting those directives, subsequent Binary keys and escaped unsupported syntax. Existing quoted/C/C++ comment controls remain.

The two zero-count files are exact public apt-CLI-only hooks, respectively392bytes/f7ab45ba… and127bytes/4f1a7109…. This helper runs apt-get, apt-cache and apt-config, never apt. Only those two fixed paths with their exact SHA256 may pass the original Binary fragment veto; altered bytes, different paths, additional Binary fragments and apt-config/get/cache overrides still fail. No universal APT parser or broad Binary permission.

Ubuntu's official [APT2.8.3 source](https://archive.ubuntu.com/ubuntu/pool/main/a/apt/apt_2.8.3.tar.xz), SHA256088522b3613b28fdbcfa61f1f7e476bf6dc6b0120a8f74409e9527580c9f9d3b, matches the SHA256 in its [dsc](https://archive.ubuntu.com/ubuntu/pool/main/a/apt/apt_2.8.3.dsc). `apt-pkg/init.cc` sets a rsa1024 base; it is not admitted as this task's effective policy. All native APT commands receive the prior exact rsa2048 base, rsa2048 Next and rsa3072 Future constraints through shared process-local -o arguments. Effective user/root dumps must contain all three exact requirements; absent/weaker/unknown values still reject. No global configuration rewrite.

`apt-pkg/contrib/gpgv.cc` passes the effective config to apt-key; `cmdline/apt-key.in` reads the algorithm requirement but can omit it when gpgv lacks --assert-pubkey-algo. The helper therefore adds a read-only **sudo gpgv --dump-options** capability check before any update/download/install. Missing support refuses; no legacy crypto fallback. This newly required native command has only been exercised through the controlled command fixture here; dot's hosted validation must prove the actual tool chain.

## Minimal changes and controls

Only helper/owning test plus six official fixture files, README/provenance and this evidence/report. Policy key v4 invalidates old preparation identities. The runnable plan is explicitly bounded to ImageOSubuntu24 / Ubuntu24.04 / amd64 / APT package2.8.3; check before APT update and bind/recheck host identity after resolver and before install. Future versions/platforms fail closed pending review.

Original signed indexes/native resolver/strong SHA256 metadata binding, fixed mirror and complete Deb822 checks, staging quarantine/one source download, fatal install behavior, cache save policy and CI budgets remain. Original assertions retained; command assertions now distinguish the new read-only gpgv capability call from APT calls, which all still require the exact strong flags.

## Evidence

Local Node22.23.4/Python3.12.14; actual helper executes with controlled command results. Frozen original helper hash matches hosted original exactly. Its six official-file positives plus strong-process-policy expectation **0/7**; all failures preserved, not overwritten by green logs. Same fixtures are in the final owning suite. First repair **100/100**; after the gpgv capability safeguard **101/101**, zero skip/cancel. Includes real source bytes, reserved directive negatives, changed/renamed known fragments, extra Binary keys, weaker effective policy, unsupported OS/APT/gpgv, original cache corruption/hash/install controls, and strong arguments on resolver/download/install. Package audit **21218/607** and diff whitespace check pass.

[Manifest, exact ten-file hashes and compressed logs](evidence/font-hosted-inputs-followup-20261022/manifest.json). `observed-controls.py` reproduces old/new fragment and policy expectations using explicit helper path, fixture directory and case. No local sudo, APT, gpgv, font install, cache mutation or browser run occurred. Official-source HTTPS reads and GitHub artifact download were the only research downloads.

## Remaining qualification and exact assumptions

- Corrected real Ubuntu configuration/preflight is **NOT_RUN**. Raw18453-byte native dump remains unavailable; synthetic command behavior is not the original dump and is not represented as native evidence.
- The six known failing file fingerprints now pass controlled validation; the full27-input corrected native pass still requires dot. Additional unknown config/include/escape/Binary contents or changed hook bytes refuse.
- Actual root gpgv capability, propagation/enforcement of the stronger policy on signed repository metadata, signed native plan, official font closure/download/install, CJK selection, cache cold/hit and browser/Full are **NOT_RUN**. Some repositories could reject the stronger requirement; do not relax it to pass.
- APT2.8.3/Ubuntu24.04/amd64 is the explicit supported target. ImageVersion remains in the exact cache identity. Other package versions need new evidence, not automatic allowlisting.
- Dot owns independent review, exact integration and bounded hosted official-font validation. PR313/PR312 acceptance heads, Full and cloud retries remain untouched. Protected-pending37dbd6b/e6af412b was independently accepted in6342195552; no duplicate tests. Historical STALE_BASE/MEMORY_STALE remain UNKNOWN.
