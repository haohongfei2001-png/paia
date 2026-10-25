# Capture package guard — independent review

2026-10-25. Read-only review of the current two-file root diff; no check execution or runtime edits by reviewer. Original build-ca04053.log is preserved:1 guard issue in24757 checks, capture-recovery.js:31 rejected the newly captured scripting API. The existing new test log reports1/1 with10 internal positive/negative audit checks.

## Finding requiring correction

**P2 — remaining alias uses can add an unreviewed injection site while the exact-three-site count still passes.** The new check removes the original captured scripting/execute declarations, requires three exact `apply(execute, scripting, [{` prefixes, then rejects only remaining `scripting.` or `scripting[` member access. The general privileged-API regex only matches chrome.scripting. Extra code inside the original closure such as `execute.call(scripting, {...})`, `Reflect.apply(execute, scripting, [...])`, or `const extra = scripting; extra.executeScript(...)` leaves all four approved declaration/identity counts and the three original prefix counts unchanged, and matches neither rejection pattern. This is a static guard gap, not evidence that the runtime currently contains those extra calls.

Keep this exception exact: after removing only the reviewed declarations, identity fragments, availability check, the three pinned call prefixes and the original permission-name occurrence, reject residual execute/scripting identifier use. An equivalent narrow allowlist is acceptable. Add controls for the bound-function direct call and object/function alias escape; no general alias exemption or broad script API allowance. This review did not execute adversarial snippets.

## Positive scope already verified

The exception remains restricted to background/capture-recovery.js and the one privileged-API label. Extra direct chrome.scripting, dot/bracket scripting access, altered/missing capture declarations, changed identity predicate, duplicate declaration, changed approved dispatch prefix, unrelated history API and the same code at an unrelated path are represented in the current test. Other audit labels still inspect the original source. The old blanket direct executeScript replacement was removed.

## Reviewed hashes

- extension/scripts/check_package.py: d161dcea84b9d172a686aa0a752dfd1c2e67a233e3dce8bd39c3b90c7c9fdeb1
- extension/tests/capture-recovery-package-guard.test.mjs: a2ae56408df84fb95e03848c5beadb1c2e2e51dd4b73034503a9b464c41103da

## Final correction closure

Re-read the final two files. The checker now removes only the four exact reviewed declaration/identity fragments, one availability occurrence, the exactly-three pinned call prefixes and the original scripting permission event expression, then rejects every residual execute/scripting identifier. The three reported bypass shapes are therefore denied without opening generic alias access. The original privileged-API scan and all other labels remain in effect on their appropriate source. No remaining blocker identified in this limited package-audit compatibility change.

The new test now contains13 internal checks, including bound execute.call, direct Reflect.apply of the captured function, and a secondary scripting alias. Existing capture-package-guard-final.log reports1/1,94.994291ms, no failure/cancel/skip/todo. Reviewer did not rerun. The first10-check source/log and failed full package build remain preserved; this narrow guard pass does not retroactively turn the prior build into success.

Final reviewed hashes:

- extension/scripts/check_package.py: d161dcea84b9d172a686aa0a752dfd1c2e67a233e3dce8bd39c3b90c7c9fdeb1
- extension/tests/capture-recovery-package-guard.test.mjs: a2ae56408df84fb95e03848c5beadb1c2e2e51dd4b73034503a9b464c41103da
