# TOPIC-05.5 — contextual Section actions, local checkpoint

Base: `292cf4642435b281335ae6df45d086054ac434a7`, the Settings/Section
combination candidate. This is a bounded local UI batch, not whole TOPIC-05.5
completion, full certification, integration, an installed release or deployment.

Named and empty named Sections now expose a nearby native keyboard-accessible
menu for rename, move up and move down. The renderer retains heading/menu nodes
and updates the current Section identity. Actions retain composing/unsaved
edit protection, reject changed route intent and revalidate qualified Section
revision/layout before existing trusted rename/layout commands. The untitled
default Section acquires no invented heading. Existing structure-dialog and
domain owners remain; promotion, writing, AI, schema, worker, CI and version
changes are outside this batch.

## Bounded evidence

Tests ran against the base plus these uncommitted source/test bytes, committed
unchanged with this receipt. Seven complete owner/domain files passed196/196:
`cpv1-topic-05-5-section-actions`, `cpv1-topic-05-4-section-reader`,
`topic-workspace-presentation`, `cpv1-topic-03-organization`,
`cpv1-topic-01-identity`, `cpv1-topic-01-restore`, and `ux-r3-topic-actions`.
The complete new `cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs` passed
source/release2/2 in headless isolated Chrome with synthetic data. Native checks
cover keyboard menus, empty-Section rename/order, exact heading focus return,
concurrent rename refusal, IME node/draft retention, reload and unchanged Entry
body. Both runs report zero failures, skips and cancellations. Package guards
passed11,400 checks across339 runtime resources; `git diff --check` passed.

Runtime SHA-256:

- `ui/topic-section-prose.js`: `de7e72757c49025242299ca62a2490690238c95aabb98badd81bd95c2b4a58d9`
- `ui/topic-workspace.js`: `ebcdd01bbbe148ce548df67df737997f70bc7d76a1b491952515649e92c26c4c`

Native test SHA-256:
`a548f631376008255125b6efeb1467c46021883d52ed80eda66d580849ade10c`.
Local logs remain under `extension/work/section-actions-evidence/`; synthetic
screenshots under `extension/work/qa-topic05-section-actions/{source,release}/`.
These ignored work artifacts are not included in this commit.

## Preserved failures and review

The first unit run exposed the older Section-reader fake DOM's missing
`createElementNS` used by existing menu icons. The fixture now implements that
interface; all original assertions remain. The first native run failed both
variants because the fixture started another menu action after the storage
commit but before rendering/focus completion. The second reached the IME body
assertion while prior conflict recovery was still completing. The third
attempted to locate a hidden button by visible role inside closed `details`.
The final fixture awaits actual heading focus and enabled controls and uses an
exact DOM button locator for that hidden-state readiness check. No production
editor fix, removed assertion or timeout increase was used. Earlier failed
logs are retained and do not count as passes.

The coordinator independently reviewed the production diff, existing exception
handling, qualified projection and revision/CAS command connections and found
no blocking issue. The coordinator also inspected the release screenshot at
1280×900: no overlapping named/empty Section menu layout was observed. This is
a local screenshot inspection, not private-design comparison or whole-stage
visual acceptance.

Whole05.5 acceptance, hosted CI, combined/full certification and integration
remain pending. The new native file is not yet admitted to the full browser
routing corpus; the coordinator owns its later unified admission. Remaining
05.5 operations and promotion readiness are not implied by this checkpoint.
