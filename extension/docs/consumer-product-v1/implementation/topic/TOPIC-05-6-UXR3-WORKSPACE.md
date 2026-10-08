# UX-R3 writing workspace fixture adoption

Base: `1e607db9a4798781e4153cb690a4d1027163f6c2`. Branch `codex/topic-writing-uxr3-20261008`. Runtime, harness, CI, version and time budgets are unchanged.

## Existing approved owner

The 0.25 continued-prose writer is `#thought-writing-workspace`; Add/compare remain `#topic-action-dialog`. This migrates only composition locators, the actual `Write a thought` heading and the outer More disclosure before the existing Topic picker. A delayed Add acknowledgement must leave its old dialog hidden and the newer workspace/editor/body/focus intact.

`TOPIC-05-6-WRITING-WORKSPACE.md` and `TopicActions.close` refuse pending/composing navigation. The retained `reopened-draft` case therefore verifies pending cancellation refusal with identical editor/text, real acknowledgement settlement with newer text preserved, and only then confirmed close/reopen with a distinct new editor. The new session remains independently editable after settlement. No second unresolved request is claimed to cross sessions: public pending guards prohibit that transition. Genuine delayed acknowledgements against newer text and the independent earlier Add owner remain covered separately. All canonical Entry/provenance/creation-history/exact retry and Source/Input privacy checks remain.

## Verification

The first local attempt used the harness fallback Playwright 1.62.1 and failed the synthetic capture prerequisite before reaching the old-dialog selector; `/tmp/uxr3-writing-old-owner.log` is retained and is not a claimed selector negative. The complete file uses the existing workspace Playwright 1.63.0 module (`work/iah-minimal-results/extension/node_modules/playwright`), the unchanged pipe harness and private release directories. No dependency installation or harness workaround was introduced.

- Full existing native file: **26/26 PASS**, 350.739274917 seconds (`/tmp/uxr3-writing-whole-first.log`), including the unchanged 100k Inputs / 1000 documents / 300 Topics / 5000 Thoughts case (199.424421167 seconds). No skipped/cancelled; every original case identifier and timeout is unchanged.
- Independent reviewer `root_finish` approved the fixture migration and requested precise wording for the reopened session. After the successful run, the final test only removes a redundant second resolve of an already-settled Promise and changes its assertion message; all assertions and frame synchronization remain. Syntax/diff checks were repeated, not the unchanged browser behavior. The earlier tested SHA below and final SHA are both retained.
- Static package: **12346 guardrails / 373 runtime resources PASS**, `/tmp/uxr3-writing-package.log`.
- Syntax and diff whitespace checks pass.

## Frozen bytes

- `tests/ux-r3-thought-chrome-e2e.test.mjs`: `12ce8e884fd706b2331abb0c29017ff88aa65b74df02ea98eeefa7208944742f`
- `ui/topic-actions.js`: `fa2d16b16effbb1a8719683af5651e1cf9fcbb6171cb6c542d4c7a0bfce8ff3b`
- `ui/thought-compose-presentation.js`: `2babd752e57d473922b6b32dcc6f0918e7a4ec142a2a889768e9b913da64b9d4`
- `ui/topic-workspace.js`: `2c7ce7bcd2211b6ef2d4152bb211945c6ace756dcb9c4ed4cc5793e037824145`
- `ui/archive.js`: `84755dba756a690cf1f675a2d9e35c34ad5dae64507619c764c9018815211dc0`
- `ui/reader-navigation.js`: `4fbc4a066474107a7d3d315336d1f06b9c838a0cf43b058c3db8754b24e37a75`
- `ui/app-shell-state.js`: `10cffbcff9fefafd08ff2da9c4c1bc06172057887281691222116084f6bb0543`
- `ui/thought-compose-workspace.css`: `af733ca00e590ab25aa38af42cf121d8007cd90f1d71970d9d0cc05634968218`

Final test SHA after this non-operative cleanup: `8167caf2d4908fb06d859941f4ce197eb5e4a4bdea1f6b7ccf7f0c879aaabc03`.
