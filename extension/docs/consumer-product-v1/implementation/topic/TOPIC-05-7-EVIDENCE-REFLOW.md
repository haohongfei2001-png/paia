# TOPIC-05.7 evidence excerpt reflow correction

Base: `08a2a64b`; isolated branch `codex/topic-ai-evidence-safety-20261008`. Local candidate only; no CI/version, provider, permission or schema changes.

## Actual defect and fix

The real `LibraryEntryEditor.receive` overwrote a selected evidence body with a higher Entry revision before the outer presentation reflow guard. The negative owner test fails at the unchanged Unicode body assertion (`/tmp/ai-evidence-before.log`). Normal body replacement now waits for selection/composition to end and rereads current evidence. Removal/purge qualification runs before deferral; failed reads disable excerpts immediately. Evidence and workspace callbacks have independent slots, so either registration order retains both responsibilities. Dispose clears both; evidence callbacks also bind the evidence epoch.

This fixes the legacy excerpt path in 0.25. The 0.26 `fieldsOnly` presentation does not instantiate excerpt editors; this guard is compatible but does not claim that 0.26 displays legacy excerpts. Integration must retain actual legacy-owner coverage rather than relabel the old visible-excerpt native assertion as a fieldsOnly UI fact.

## Verification

- Three complete owner files: **40/40 PASS**, `/tmp/ai-evidence-unit-final.log`. Actual receive, selected Unicode body, composing excerpt, latest reread, removal, failed qualification and both callback registration orders are covered.
- Existing complete `uir-03-ai-presentation-chrome-e2e.test.mjs`: **6/6 PASS**, 21.725648 seconds, `/tmp/ai-evidence-native-final.log`. All old cases and budgets retained, no skipped/cancelled. New evidence scenario uses real `EDIT_LIBRARY_BATCH`, actual higher-revision reads, native DOM Range and exact firstChild/body/selection retention, then current body after selection clears. The earlier presentation cases retain actual emoji/combining selection and synthetic CompositionEvent protection; no OS IME claim.
- First native invocation used wrong repository-root cwd and failed manifest/builder lookup before testing: `/tmp/ai-evidence-native-first.log`. Preserved and not counted as passing. Correct execution uses extension cwd and existing isolated release/profile fixture.
- Static package: **12346 guardrails / 373 runtime resources PASS**, `/tmp/ai-evidence-package.log`.
- Independent reviewer `root_finish` approved the complete runtime/test delta and independently ran two complete owner files: **17/17 PASS**, 74.8 ms, `/tmp/ai-evidence-independent.log`. No duplicate browser run. The 0.26 integrator will preserve a real legacy-editor browser fixture for this path.

## Exact frozen runtime/test bytes

- `ui/ai-presentation.js`: `068a2363a16c9f09237c64ff2a72a62a5def0c38a5468b8d0e7dd59dc05a452f`
- `tests/topic-ai-evidence-reflow.test.mjs`: `24b24c1391b7c8f33e52798b11afa2cf79ff2010a275457f512fa174586de551`
- `tests/uir-03-ai-presentation-chrome-e2e.test.mjs`: `73cd962510bb1d9660f6e558fffd5998b867b39517f84982ff40ef1272753cd3`
