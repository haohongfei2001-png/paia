# Settings Assist authority invalidation: scoped integration

## Result and exact identity

PASS: 53/53 cases across five complete owning/related files; zero failures,
cancellations, skips or todos. Node duration 130.197226 ms. Syntax checks 3/3.
Independent final read-only identity/evidence check: PASS, no blockers.

- Base: d7604d8d1f7f22563734f0a5349493c8ffc55fab.
- Preserved base tree: c03a7069f9fbd730d3ee4cdc093ac52e04e542f4.
- Author commit: be049872f3269ffc9c18328ff95d73dae9fe0ff4.
- Integration commit: 98761c8c627ee66445c20dee452959d644fcd634.
- Integration tree: b3b243627bf9ff117565d27d646f126a63e6c55b.
- Integration parents: base d760 and author be049; the author tree is exact.
- Branch: codex/settings-authority-integration-20261024.
- Worktree: ../settings-authority-integration-20261024.

Only the four reviewed author paths differ from the base. Full hashes and blobs
are in changed-path-manifest.json. There were no integration runtime/test edits.
Source.patch is preserved as SOURCE.patch. This is not a release/main commit.

## Bounded behavior

The original Settings Assist mounted storage/runtime authority notices now use
its explicit invalidation route. The same state owner immediately fences stale
controls and pending confirmation, drains coalesced current reads, and ignores
superseded reads. Ordinary refresh remains supersedable by a newer acknowledged
configure. Existing backend generation CAS, privacy/default-off consent and
queued-save ownership are unchanged. Tests use the actual production owners
with the existing synthetic presentation harness; they are not native UI proof.

## Exact full-file qualification

Command and original Node output: command.txt and settings-five-files.log.
Run 2026-10-24 06:14:13 UTC with a 60-second outer safety ceiling; elapsed 0.223s.
No test selection, skip, changed runtime budget or dependency install was used.

1. extension/tests/settings-assist-state.test.mjs
2. extension/tests/prompt-assist-presenter.test.mjs
3. extension/tests/ai-assist-automatic-consent.test.mjs
4. extension/tests/settings-next-state.test.mjs
5. extension/tests/settings-assist-authority-invalidation.test.mjs

All five full files were audited for broad-suite imports, subprocess, browser,
native and network-provider entry. See whole-file-safety-audit.json. The new
file adds19 cases to the original34 related cases. The independent47 cases
(original17 + author19 + reviewer11) overlap; counts are not additive.

Raw integration log SHA256:
8993f0e95681cfc6c8fd0cd3ffad6d212050a735c7d155d13d1f54f46e564735.

## First failures and exact retained evidence

Author and reviewer evidence has been copied without replacing its histories:

- author/first-red.tap: actual mounted storage/runtime first regressions fail0/2
  on the original source; SHA b275d6e9b515612c1d702dcd55fec947c421407420d21414e64f0a99b3975509.
- reviewer/baseline-first-failure.log: independent four mounted combinations
  fail0/4; SHA 8383d6a2ff316728d867bcd03d4bacbccc3761d7548d9e01fda2263caa3ad066.
- author/final-related.tap:53/53; reviewer/final-exact-review.tap:47/47.
- Author source/static guards and first/final test sources and checksums remain.
- No scoped integration test failed. Initial receipt parsing expected TAP '#'
  summary markers, but Node emitted its spec 'ℹ' reporter and exited0; parsed
  the same unchanged raw log without rerunning. result.json records this.
- Initial exact-path git add declined the out-of-sparse report. Same four paths
  were staged with --sparse, no configuration/permission change; see
  preparation-incident.json. This was not a test failure or policy denial.

## Preservation and unrun work

Root HEAD, full status and staged diff match the pre-integration snapshot.
The prior d760 worktree HEAD/status/staged diff also match. All seven prior
Source-union deliverable SHA256s were reverified; ZIP remains
08134b2b44d8798d0055f524d5fded027f541f207a7ef65d1dac5d833c802db8.
The earlier 240-second incomplete FAIL and corrected137-file2931/2931 results
remain intact with their exact identities, not reclassified or rerun here.

The isolated integration is clean. No dependency symlink/install was needed.
No root staged receipt metadata or prior artifact changed. No remote, public
upload, main/PR/CI, browser/native/Full, original-C/automatic-C,129-group,100k,
old-cloud diagnostic, account/provider, paid, installation or deployment action
was performed.

pending-138-test-files.json is preparation only: unchanged prior137 plus this
new owning file. It has NOT been run and is NOT a combined result. Source
continuation is not part of this commit; follow-on Source additions remain
unsupported on this current source. Combined qualification is held until the
separate continuation freeze, independent clearance and root authorization.
