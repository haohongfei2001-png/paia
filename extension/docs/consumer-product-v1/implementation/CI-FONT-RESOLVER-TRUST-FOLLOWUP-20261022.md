# Font preparation: resolver identity, recovery and inherited trust

PR313 reviews [6339602425](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6339602425) and [6339634823](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6339634823). Isolated branch `codex/font-resolver-trust-followup-20261022`; exact parent `e9f2ac646b2caa2835fb87dc21ca815aafb51994`, implementation `4d7037209867e260e26429bc594f27e7915969b9`, tree `5bedd15cdcfb6c26ddd5cc4a16543668c020ca0a`. This remains preparation, not activation or hosted qualification.

## Diagnosis and minimal correction

The original script discarded the resolver hash. A single dumpavail record with matching Package/Version/Architecture/Size/Filename and hash B could be admitted while the native URI supplied SHA256 A. The new original-function control proves this conditional false acceptance; no evidence says an actual hosted image was compromised or had duplicate records. Native APT receives `Acquire::ForceHash=SHA256`; absent/weak digest or disagreement with the uniquely adopted metadata fails before cache/download/install. Cache policy is v2 to distinguish the strengthened contract. Original source selection remains APT's responsibility, with its exact native URI and hash bound into the plan/key.

Original recovery also reused staging after a corrupt copy. A same-size existing file can survive an APT acquisition, which the old unconditional-overwrite fixture missed. The revised fixture models same-size reuse. A rejected job-local archives directory is renamed as evidence and a fresh directory created before the sole native download. State must be a direct child of RUNNER_TEMP; no system archives or remote cache are touched. Copy exception and staged hash failure both recover once; acquisition and installation failures stay fatal.

Fresh signed lists alone did not prove source/config trust. Before update and again after resolution, the script checks identical effective user/root apt-config output under the exact options and audits the same fixed source/trust paths. apt-cache now uses sudo like apt-get. APT_CONFIG and command-specific/signature overrides are unsupported; inherited insecure/weak trust, disabled date/validity/TLS checks and extended validity are rejected. One-line sources allow only arch and Signed-By options; Deb822 has a bounded field allowlist, with trust/validity overrides refused. Source/config fingerprints must remain identical at install. Unsupported hosted configuration fails closed; it is not silently rewritten. This is intentionally bounded compatibility, not a claim every APT feature is supported.

Only the existing helper and its owning test changed (within the approved three-file preparation scope); workflow bytes remain identical to the parent. Fonts, sources, original resolver, one acquisition, final no-download install, one-minute nonfatal restore/save, trusted-main-only save, PR restore-only, original fc checks, job/shard/time limits and all existing assertions remain.

## Actual evidence

[Receipt and file vectors](evidence/font-resolver-trust-20261022/receipt.json), sanitized gzip logs in the same directory. Node22.23.4 and Python3.12.14, actual Python functions with synthetic native command responses; no sudo/APT/network/cache service/install ran locally.

- Original implementation plus three new adversarial tests: **0/3**, proving weak hash, divergent strong hash and same-size damaged staging failures. Original log retained.
- First expanded run: **16/37**; the new configuration checker mistakenly classified Dir::Etc::trusted (a path) as a trust boolean. Failure preserved; path namespace correction retains the explicit required path validation.
- Corrected intermediate: **37/37**.
- Final additional labeled validity/signature controls: **39/39**, zero fail/cancel/skip/todo. Includes original 22 controls, resolver mismatch/weak hash, corrupt/throwing stage copy, source trusted/insecure/expired, environment config, inherited insecure/date/validity/label/signature/command/path, root/user mismatch and post-plan source changes. Trust negatives assert no apt-get admission; hash negatives assert no download/install or plan publication.
- Diff whitespace check passed. No package/build rerun for this script/test-only successor; previous package results retain their old identity. No Full or cloud run.

**NOT_RUN:** actual Ubuntu APT config/source encoding, print-URI/dumpavail compatibility, real package acquisition/install and font checks, cold/warm cache service and timeout/cancellation behavior, hosted/Full, independent review. Dot owns review and any necessary cloud qualification. Historical Search MEMORY_STALE and STALE_BASE remain UNKNOWN; unrelated tests and acceptance branches are unchanged.

Primary implementation references supplied by review: [APT ForceHash](https://github.com/Debian/apt/blob/2.8.1/apt-private/private-install.cc#L148-L151), [DumpAvail record selection](https://github.com/Debian/apt/blob/2.8.1/cmdline/apt-cache.cc#L392-L406), [native acquisition source selection](https://github.com/Debian/apt/blob/2.8.1/apt-pkg/acquire-item.cc#L3184-L3227). No production service or paid request is enabled.
