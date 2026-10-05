# D7 Reader Original / History — adopted baseline capture

Scope: the existing Input Reader's A07 Original and A08 History dialogs only.
This first patch changes tests and CI, not production. It does not reopen
Thought, Context, Prompt Reuse, Source policy or any new feature.

## Identity and current result

- Baseline production: `e2f90cd8e81af5ba8bc3c840366d9e4f3e68f415`.
- The candidate test head is separate and is recorded as `head` in each receipt.
  The baseline production SHA is recorded as `baselineHead`; they are not claimed
  to be the same Git tree.
- Hosted native evidence: **PENDING**. Local browser launch and its one approved
  escalated attempt both stopped at Chromium's process-singleton socket denial.
  No screenshot or browser PASS is claimed from those attempts.
- Local syntax, six owning CI contracts, release/package build and whitespace
  checks pass. Native source/release execution remains a separate gate.
- The broader `check-ui-refresh-ci.mjs` audit fails at
  `Q4_SHIFTED_PREVIOUS_BROWSER_ROUTING:cpv1-09-prompt-compatibility-chrome-e2e.test.mjs`.
  The exact unmodified e2f90cd8 scripts/tests/workflows were separately extracted
  and reproduce the identical failure. This slice does not alter that partition
  or relabel its existing failure as PASS.

`verify-d7-reader-dialogs.mjs` uses a synthetic sent Input through FakeChatGPT,
then the existing Archive window, Reader menu, native OriginalSurface and
working-revision owner. It does not inject a dialog or production CSS. Source and
built release each open both real dialogs at 1440 light/dark and 320 dark, retain
whole-window images and scroll to their long content/actions. It checks complete
original copy, an actual acknowledged native edit, explicit restore cancellation,
Escape focus return, transient-content clearing and unchanged original Source.

The baseline intentionally records the existing 720/960px caps, 18px/600 heading,
28px desktop padding, 20px/16px compact padding and whole-dialog History scroll.
Recording this behavior is not accepting it as the D6.2 target. Source and built
runtime hashes are stored separately because release compilation intentionally
prunes development content from archive.js and archive.html.

## Existing hosted owner and bounded budget

The existing `PAIA D7 Archive Reader Appearance` workflow retains its complete
appearance and compatibility suites, exact-head receipts and required aggregate.
Only the appearance job gets an additional conditional whole-file command when
the PR carries both `PAIA_D7_ARCHIVE_READER` and `PAIA_D7_READER_DIALOGS`:

`xvfb-run -a node --test --test-concurrency=1 scripts/verify-d7-reader-dialogs.mjs`

It reuses the already installed hosted Chrome, CJK fonts and Node. There is one
fresh synthetic browser profile per source/release variant, with no extra login,
new service, paid resource or whole-67-frame capture. The original 12-minute job
budget and original suites are unchanged. Each of the two added cases is bounded
at 90 seconds; no test-name filtering or skipped original coverage is introduced.

Budget basis: previous complete appearance job
[111550504380](https://github.com/haohongfei2001-png/paia/actions/runs/37241338178/job/111550504380)
ran from 22:47:22 to 22:54:34 UTC on October 4 (about 7m12s). Its source/release
journeys took 195.45s and 197.67s. Adding at most 3m of bounded dialog cases leaves
about 1m48s of that observed 12m budget for normal variation. This is a feasibility
estimate, not an already observed new-job duration.

Artifacts under `work/d7-reader-dialogs/` are retained by the same existing job,
including failure receipts and last visible screenshots. The initial baseline
artifact must be downloaded and visually inspected before production CSS changes.

## Next bounded visual change, after baseline review

D6.2 `OWNER_APPROVAL.md`, `RESPONSIVE.md` and unchanged A07/A08 SVGs supersede the
old D5 modal geometry: caps 700/860px, 23px weight-500 serif heading, 32px desktop
insets and 10px radius. Keep heading and Close reachable while only the body
scrolls; retain 16px viewport margins at 320px and stack comparison below 1024px.

The future Original styles must require its `data-reading-surface="original"`
marker, so the shared information/maintenance dialog is not restyled accidentally.
History must reuse its existing revision-list body, before/after preparation,
explicit cancellation/confirmation, failure draft retention and version write owner.
No illustrative master tabs, example dates or invented functionality will be added.
Source/release after evidence must include 1440 light/dark, 320 dark, 1024/1023
comparison layout, 200% text, complete long tails and reachable controls. The
baseline artifact remains identified by its original test head rather than being
relabelled as final evidence. No broader D7 or final owner visual acceptance is
claimed by this slice.

## First hosted baseline attempt retained

Test head `4f196f151fb05fe33b71dd656f55878e65a132e6`, production baseline
unchanged e2f90cd8: [D7 run 37254949086](https://github.com/haohongfei2001-png/paia/actions/runs/37254949086)
passed the full existing appearance and compatibility journeys. Candidate gate
37254949037 also passed. The new baseline cases failed after 6.92s/8.83s because
the test read the clipboard observation immediately after click, before the
existing asynchronous complete-original read/copy returned. Each variant retained
all three A07 frames and its long-tail frame; A08 was not reached.

Artifact 11321913772 has SHA256
`ee83325ade5c2d34c2530249deab5678cb728429a0a4a84f124d84b31c907c0c`.
Both final failure images subsequently show the original-copy success status.
The correction waits for the actual clipboard observation before the unchanged
full-string equality assertion. Production, fixtures, full text, original limits,
case/job timeouts and prior suites are unchanged. Corrected-head baseline and its
A08 images remain PENDING; this failure is not relabelled PASS.
