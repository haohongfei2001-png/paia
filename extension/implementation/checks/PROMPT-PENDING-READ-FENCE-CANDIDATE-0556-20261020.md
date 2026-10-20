# Pending-read fence recovery candidate 0.55.6 — 2026-10-20

## Candidate identity and scope

This is an isolated proposed integration against exact main `9c85d0df0672e89166fcaf5e6e4597b447488303` (0.55.3). Version 0.55.6 is provisional, coordinated after the separate navigation 0.55.4 and Settings 0.55.5 candidates. Their runtime changes are not silently included here; the integration owner must reconcile current main and version order before any merge. This receipt is not merge, installation, deployment or whole-program acceptance.

The reviewed code consists of seven existing runtime owners and five new test files. The unchanged original pending-read prerequisite was not yet on main and therefore is included explicitly. The current Repository terminal/recovery-authority implementation is preserved; its sole new code is the original pending-read appended owner-identity helper. No public API, schema, permission, dependency version, CI routing, timeout, quota or maintenance schedule is changed.

The exact twelve-path reviewed overlay manifest has SHA256 `158cb282313b37390c463bb99ca7e580692aa2c2ac7ec156c8d8fe6c790d1169`; its patch has SHA256 `2449ebacfa48d69c03795c9046e4a591ed1f42329f52b69b1c23056016823cdd`. Independent read-only review found no blocking code issue and independently reran 104/104 owner/fence and 55/55 original publication/recovery/retention/Repository controls.

## Functional recovery and measured cost

A completed static shared read may use one independent original replacement scan per already-waiting caller only after a private original write-fence-only denial. Both unchanged original non-fence authority keys and owners remain anchors. Each fresh read uses its own fence, and a second fence loss or observed authority drift refuses. Failed original snapshots, public error codes, dynamic declines and uncertain observers cannot authorize this fallback. No recursive query/resolve, cached-result delivery, new sharing slot or renewed Family view serial/TTL is introduced.

The genuine status plus empty SafetyRunner control at 501 synthetic Inputs now succeeds with exact original results. Single QUERY remains 1002 Source reads. The shared QUERY plus resolve costs 3006 reads: one discarded shared scan and one fresh original scan per caller. Quiet static pairs retain one scan. This is functional recovery with an explicit three-scan cost, not a speed or latency certification.

The original failed single-scan diagnostic is retained unchanged as historical evidence: 1 PASS / 1 FAIL, log SHA256 `46ec19bf23507ff191cf6eceff1a5d57fcd62a932e621659b77e4a20b796c8f6`. That never-shipped local diagnostic is absent from remote main and is not replacing or removing a registered test. The successor keeps exact-result expectations and separately bounds the actual new scan cost.

Three adjacent controls also record the existing Indexed.run/open prelude boundary: an original repository.db access can precede the service callback. There is no global zero-getter claim. An actual original failure or second write still refuses; admitted service descriptor controls refuse without invoking their getter.

## Verification and outstanding gates

The frozen code composition passed the same unchanged 1551-file local execution domain:

- 104/104 owner/fence controls, zero failures, cancellations or skips.
- 358/358 offline Prompt domain checks, including those 104; counts are not additive.
- 55/55 original publication/recovery, nonnative human-retention and terminal Repository controls.
- 59/59 privacy/security checks.
- Source and development privacy/permission/network audits and the standard 605-file release build.
- All seven changed runtime files match Source/release bytes.

The declared local domain is not a complete checkout, Full census, actual native Sync acceptance or source of exact-main CI evidence. Node 24.19.0 local evidence does not relabel Node 22/native results. Versioned-candidate checks are recorded separately; remote required Full and native results must be read back for their actual tested commit before readiness is claimed.

Original native 311 still failed both Family RPCs with MEMORY_STALE. The reproduced local maintenance mechanism does not establish its exact cause. New paired native A/B latency, physical 120Hz, visual and exact-main qualification remain unrun unless a subsequent exact-head receipt supplies them. No provider dispatch, paid call, account, secret or permission change occurred. The independently reviewed three-scan tradeoff remains explicit.
