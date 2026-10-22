# Detached promotion STALE_BASE: bounded diagnostic follow-up

Base: `22bd30f19b3d5ecb8074b334d7e3ae019f6bbb7e` (PR313). Successor: `codex/organize-stale-base-followup-20261022`. PR313's head, runtime, original test, Draft state, workflows and versions are untouched. Dot owns its independent review and Full CI. This successor contains only an opt-in diagnostic, evidence and decision proposals; it is not a production fix or acceptance of PR313.

## What the original failure proves

The [original failed full-run excerpt](evidence/organize-20261022/expiry-full-unit-failure.txt) remains unchanged. The case `stage rollback preserves the exact original signed work for a fresh independently granted retry` failed with `STALE_BASE`; `synchronousTrue` caught an exception thrown by a registered `isCurrent` callback, through `currentFinalAuthorities`, after a terminal IDB read (`runFinalReadFences:180`). The wrapper discards that exception's inner cause. It does not establish which callback, service phase or fact failed.

The original case performs initial prepare/confirm, an intentionally aborted stage after Source mutation, then independently authorized stage/activate. Its expected rejection is caught by the original assertion. The uncaught historical failure cannot be identified as the intentionally injected Source refusal. The Source row comparison belongs to a terminal plan, whereas the observed stack is an `isCurrent` exception. Neither later 89/89, ten bounded retries, nor 11670/11670 explains that exception.

The fixture grants fields and identity for 600000 ms. This is the existing Section-promotion path, not the Organize 30-second selection/35-second HTTP path, and it does not construct the changed LocalMaintenanceSession. Its own scope budget has 131072 reads/8 MiB hash work; these are separate existing limits, not changes to Organize's 4096/2 MiB bounds. The repository runner isolates files in Node test child processes with concurrency four; another file's Date.now monkeypatch does not share this process. Within this file, the preceding explicit clock tests restore Date.now in finally. Host clock changes, scheduling and inner owner failures remain unrecorded historical possibilities, not diagnosed causes.

## Targeted diagnostic and results

[Script](../../../scripts/diagnose-section-promotion-stale-base.mjs) is opt-in and outside automatic test discovery. It extracts the exact original fixture and target case, preserves every assertion, rewrites only generated import paths and the fixture seam, and wraps original service/guard calls. It records phase, original exception stacks, primitive budget counters, remaining grant time, signal states and clock backsteps. It never logs material, identifiers, receipts or credentials. Generated probes stay in ignored work/. Runtime and original test bytes are unchanged.

Run from extension with the previously prepared **Node22.23.4**:

```sh
node scripts/diagnose-section-promotion-stale-base.mjs observe
node scripts/diagnose-section-promotion-stale-base.mjs clock-rollback
```

The second command deliberately leaves the original test failing and exits **1**. It is a fault probe, not a green regression suite. A missed injection exits 2 in the final script. Do not add this command to automatic Full CI or repeat either mode merely to collect green runs.

- **Observation, one case PASS:** initial stage correctly rejected the injected Source change with `INVALID_REQUEST`; fresh stage and activation succeeded. Fresh stage used 740 reads/17786 hash bytes; activation ended at 1693 reads/35983 hash bytes. Initial owner peaked at 2037 reads/41059 bytes. Grants still had at least 599676 ms, all sampled signals were live, and no clock backstep was observed. This run does not rule out any historical cause.
- **First negative-control attempt invalid:** the field-issuer callback's default stack was too short to expose the terminal marker; injection never happened and the original case passed. Both logs remain. No fault claim is based on that run.
- **Corrected controlled probe, original case FAIL:** a one-shot 1000 ms rollback at the original guard's fresh stage terminal check caused `topic-processing-authority.current:48` to reject. Captured inner stack reaches `assertProcessingCurrent`; the outer stack is the same STALE_BASE wrapper family. The grant still had 599956 ms, no signals were aborted, and work was only 699 reads/17786 bytes. This confirms the guard works and the diagnostic distinguishes that cause. Injection occurs at terminal entry line169; the historical failure was after a read at line180. It is **not an exact reproduction or evidence that the host clock actually rolled back**.

The observation used the first observer revision; the final script only relocates the explicit fault trigger and adds missed-injection refusal. Generated-probe hashes preserve that distinction. [Machine receipt and all logs](evidence/stale-base-20261022/receipt.json) bind exact case/source/script hashes and each outcome. Syntax check passed. No unchanged full test, native Chrome run, workflow dispatch, deployment or independent review is claimed for this successor.

## Disposition and next evidence

**Historical root cause remains UNKNOWN; no production repair is justified.** Keep the original clock, authorization and transaction rejection. Do not remove the final check, relax time or read bounds, retry a rejected write automatically, or label the old failure fixed. This opt-in script is diagnostic tooling, not an automatic change to PR313's tests.

If dot's already-running acceptance emits another failure, retain its exact SHA/run/job and first failing log before any retry. Compare the terminal location and obtain service phase plus the inner refusal and clock/budget/signal observations on a separately isolated reproduction. An observation PASS is not closure; a changed runtime requires its own targeted regression and independent review. Do not start additional load runs or add production telemetry without a concrete next hypothesis. No other unblocked runtime gap was established by this audit.

The three product decisions are separately documented in [the bounded proposal](CONTEXT-TOPIC-ORGANIZE-DECISIONS-20261022.md). They remain proposals for dot, not authority to implement broader reads, new UI or a lifecycle scheduler.
