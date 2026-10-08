# TOPIC-05.7 — protected local saved-reading refresh

Local candidate based on `2646028c`. This batch protects an existing saved AI presentation; it does not complete TOPIC-05.7/05.8, enable generation, or certify semantic quality, a cloud provider, installation, or main delivery. CI routing and product version are unchanged by this batch.

## Actual defect and bounded implementation

The actual TopicController owner unit first failed when a higher saved presentation revision arrived while a Unicode selection remained in the current editor: the old branch disposed that editor. The composition control already passed: AIReadingEditor.dirty() includes composing. We preserved that existing protection rather than claiming a new IME defect.

After existing evidence eligibility reads, a still-present saved projection defers presentation reflow while its editor has a noncollapsed selection or composition. A selectionchange or compositionend resumes through a fresh existing Topic refresh, subject to exact editor/topic/view/openIntent ownership. The callback never paints its earlier saved row. Disposal clears the callback and aborts its listeners. Missing saved presentation still takes the existing disposal path; source eligibility reads remain active. Existing draft/save failure handling and canonical Entry, Section, permission and recovery owners are unchanged.

The native helper accepts an optional releasePath. Only this complete native file supplies its own temporary build; the default behavior of other consumers is unchanged. Each owned temporary directory is cleaned in finally; no shared current-release artifact is removed.

## Evidence

- Negative-first actual owner: `/tmp/topic-ai-reflow-before.log`, selection failure and existing composition PASS. No assertions/timeouts were weakened.
- Five complete related unit files: **105/105 PASS**, `/tmp/topic-ai-reading-related-whole.log`: topic-ai-reading-reflow, ai-presentation-v072c, topic-workspace-presentation, dvn-root-window, dvn-topic-years. New owner file contains 11 cases.
- Existing complete `uir-03-ai-presentation-chrome-e2e.test.mjs`: **6/6 top-level cases PASS**, 22.384612917 seconds, `/tmp/topic-ai-reading-native-first.log`. The first two cases each run source and release; the existing worker-restart cases and two new interaction cases run one variant each. All old cases and original budgets remain. No skip/cancel.
- New interaction cases perform real saved-presentation edits, hold only the resulting status response, start a DOM Unicode Range or synthetic CompositionEvent, then release the real response. Eligibility reads still occur; the same node and text/selection survive; ending the interaction rereads the new revision with no extra saved revision. CompositionEvent is not an OS IME claim. The held-response boundary is a controlled delivery race, not a claim about naturally observed timing.
- Existing native source/release saved-state light/dark 1440/320 matrix, unavailable-provider refusal, local edit/undo/redo, reduced-motion navigation and zero external requests all remain passing. This is not all-state TOPIC-05.8 or 200% text certification.
- **12220 package guardrails / 369 runtime resources PASS**, `/tmp/topic-ai-reading-package.log` (static).
- Independent reviewer `settings_finish` read all code/test/helper changes and independently ran 34/34 actual owner/domain units: `/tmp/topic-ai-reflow-independent.log`; no blocking issue. No duplicate browser run.

## Exact tested code/test bytes

Recorded for the frozen native run and checked unchanged afterward; HEAD was the above base with these changes dirty during verification. This is not a clean-main evidence claim.

```text
be6d4539538eb38b9561cd5056c2b85410a877189ca6548fdc3e3002c2d46b89  ui/ai-presentation.js
b27adf41ef18d84e278bed8d9a3a6393356bc08c08e7db85560291961e28a09b  ui/topic-workspace.js
24f04658faaa1a24ac2e564c40c668e51c2c764ca91c7bb1d76c55e505d49a0a  tests/topic-ai-reading-reflow.test.mjs
f6745209417e25acef5ab9852d1b264cdd6726d048f27096150c7687750dc6d7  tests/uir-03-ai-presentation-chrome-e2e.test.mjs
880177e8ef260cd326d384c4678fc7c8a685333a8718445d5dbeec2586769c8e  tests/harness/consumer-ai-browser.mjs
```

Remaining: the broader Section-aware saved-AI reading composition, visible new/unprocessed material and full visual convergence remain separate approved work. Legacy saved fields/recovery/history remain intact. Real provider/budget/processing authorization and semantic-fidelity evidence remain gated.
