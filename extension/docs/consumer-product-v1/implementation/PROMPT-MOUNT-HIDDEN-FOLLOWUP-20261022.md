# Prompt Surface initial geometry admission

Independent successor to `607f453c8d999fe170d4199f93c6a8cf92071ef7`, branch `codex/prompt-mount-hidden-followup-20261022`. Fix **`8ccfe526b74cef96f225dfcd5ad45bedb90c754a`**, tree `dd6c499d20143ee788c4b13b18d4d0da8192b671`. Requested by [dot's bounded engineering handoff](https://github.com/haohongfei2001-png/paia/pull/313#issuecomment-6335372762). Pick this exact two-file fix, not its whole branch ancestry. Dot owns integration/versioning, independent review and subsequent qualification; this work changes neither acceptance branch, Settings/Context keyboard, versions nor workflows.

## Original failure and evidence limit

[PR312 Full39738727099 Browser2 job119690545260](https://github.com/haohongfei2001-png/paia/actions/runs/39738727099/job/119690545260) failed Source at the original assertion `unavailable composer space must keep entry hidden`; Release passed. The checkout log identifies tested merge **`15d9680a7eb74a0f9950c5743b83a832be9b98df`**, distinct from head `d5874a4478e78ba43b900d646d0e638aa1621554`. The original decoded job log is preserved losslessly as gzip with its SHA256 in the receipt. The relevant runtime file is byte-identical on that failed merge, PR313's integrated head `ecf1feeb09673d94d855176639501275cf6e8e38` and this successor's base.

No failure-point DOM snapshot was available. The demonstrated first-mount mechanism is a real defect and matches the assertion, but is **not proved to be the only cause of that historical cloud failure**. There is no evidence of private-body disclosure; the static host entry and cross-origin private frame remain separate.

## Mechanism and minimum fix

The real host owner creates and appends a default-visible div before its scheduled first layout reads the receiving composer geometry. Holding the first RAF reproduces `hidden=false` at append with **zero** geometry reads. The new regression fails on the original runtime for both composer top8 and top700. It observes the actual append boundary, not merely a later state.

The sole runtime change sets **`host.hidden=true` immediately after creation**. The original layout remains the only geometry admission authority: top8 stays hidden, top700 becomes visible, and later loss of space hides it again. No layout calculation, threshold, timeout, focus, editor, Undo, private frame, transport or service behavior is changed. This also covers creation of a replacement host through the same mount owner.

`tests/cpv1-09-prompt-surface.test.mjs` extends its existing host fixture only to hold RAF, vary composer geometry and observe append/read counts; all previous tests and assertions remain. The two new cases additionally prove that these layout-only transitions do not open an iframe, focus the button, save host state or request private-content closure.

## Actual validation

- New regression against unchanged runtime: **0/2**, both fail with append-time `hidden=false`, geometryReads0. Preserved as `before.tap.gz`.
- Complete owning Node file after repair: **29/29**, zero fail/skip.
- Complete unchanged `nib-v4-surface-chrome-e2e.test.mjs`: **25/25**, zero fail/skip; original Source and standard release journeys, including the previously failing reload/space assertion, privacy, insertion, edit/Undo/focus/geometry and no-provider/network checks. No case or native assertion was removed. Source/release receipts are retained.
- Package static check: **21218 guardrails /607 runtime resources**, PASS. Release was built by the original builder inside the native file. `git diff --check` passes.

Actual local environment remains Node22.23.4, Python3.12.14, Playwright1.63.0 and local Chrome155.0.8059.85 on macOS. Fresh isolated headless profiles and existing offline harness/security flags; no real model, account, credentials or production activation. These are component checks, not PR312/313 Full, installed acceptance or proof of the historical cloud occurrence's unique cause.

Commands, from `extension/` with the already prepared exact runtimes/dependencies:

```sh
node --test --test-name-pattern='initial host mount stays hidden' tests/cpv1-09-prompt-surface.test.mjs
node --test tests/cpv1-09-prompt-surface.test.mjs
node --test tests/nib-v4-surface-chrome-e2e.test.mjs
python3 scripts/check_package.py
```

[Receipt and retained logs](evidence/prompt-mount-20261022/receipt.json) identify original/public hashes and exact tested files. The first command is deliberately the pre-fix red control; the remaining commands are the repaired state. Local checkout/temp paths in published local logs are replaced, with raw hashes recorded. No screenshots or user data are uploaded. Independent review and any updated-candidate Full remain dot's responsibility. The separate Browser8 seed/publication task is not fixed or certified by this change.
