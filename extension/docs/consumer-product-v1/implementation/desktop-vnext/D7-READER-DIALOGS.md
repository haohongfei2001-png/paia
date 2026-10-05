# D7 Reader Original / History — bounded visual candidate

The adopted-before capture below is complete. Production changes are limited to
12 scoped lines in `ui/reader.css`; all JS/HTML, read/copy/page and revision write
owners are unchanged from e2f90cd8. The new visual and exact-head owner evidence
is **PENDING** until this reviewed CSS candidate is run on hosted Chrome.

## Completed native baseline

Test head `75a68058cb172eb08f7423bd6f4ddde1d921ebe6` (production e2f90cd8)
passed [D7 37255812722](https://github.com/haohongfei2001-png/paia/actions/runs/37255812722)
and Candidate 37255812702. Both actual source/release baseline cases pass, taking
8.31s and 9.77s. Each retains six whole-window frames plus two actual long-tail
frames. All original complete D7 appearance/compatibility gates also pass.
Artifact 11323020941 SHA256 is
`2eddef43e9b9924e7a2a4ed70c0e890b35b9f73f36e61df1aaa7644ee40dddab`.
Independent inspection confirms the baseline History scroll defect: at320 dark,
its dialog scrollTop reaches13291, heading y=-13246 and Close y=-13200. Original
already scrolls its body and keeps Close visible. The baseline remains immutable;
its production SHA and test SHA are not relabelled as current after evidence.

## CSS and after-proof scope

Only real Reader Original (`data-reading-surface="original"`) and History gain
700/860px caps, 32px desktop insets, weight500 23px/32px serif headings and wrapping
controls. Existing10px radius, viewport-minus32px widths, viewport-minus48px height
reserve and compact20px/16px insets remain. History becomes a flex column with its
existing revision-list as the body scroller. No native modal owner, DOM, button,
revision operation, restoration guard, Source identity or permission is replaced.

The same bounded90-second source/release runner requires fourteen after frames
per variant: each A07/A08 at1440 light/dark,1024 light,1023 light,320 dark,768 light
text200 and320 dark text200. Every frame also reaches and retains the actual
Unicode tail, validates heading/Close and action glyph bounds, no horizontal
clipping and only-body scrolling. Text200 doubles actual font/line-height values,
not the viewport; original inline values and priorities are restored afterward.
Actual CJK title fonts are measured with Chrome's platform-font API. Four
unchanged1440px master references per variant are retained; compact derivatives
are explicitly based on RESPONSIVE rather than fabricated compact drawings.

The real Source detail dialog is opened afterward to verify its original
720px/28px/18px-sans presentation survives shared-dialog reuse. Copy still checks
every original character; both real revision comparison sides and cancellation
keep the same current revision. Reader standard prose remains17px; existing
caption and comparison gaps are retained and reported as owner differences.
The master's illustrative tabs/dates/footer arrangement and fixed650px height
are not fabricated as new application behavior.

The existing D5 helper changes only affected A07/A08 visual references/assertions
to the approved D6.2 SVG-derived target. Its Selection, Reader shell, body/save,
Source, cancellation and focus assertions remain. This patch does not claim a
new pass for its entire legacy D5 journey or repair unrelated older shell assertions.

## Complete owner regressions and budget

The existing Candidate affected-browser job receives one conditional whole-file
step for `PAIA_D7_READER_DIALOGS`: the unchanged four Original and eight Working
Revision cases. All twelve registrations must pass with zero failed/skipped;
the exact-head receipt is mandatory in Candidate's existing required aggregate.
No original job, case, fixture, assertion or limit is removed. This separate
existing12-minute job avoids adding long safety regressions to the D7 visual job.

Budget evidence comes from the actual logs of
[36767002782](https://github.com/haohongfei2001-png/paia/actions/runs/36767002782):
job110063604772 completed all four Original cases in about2m12s after the preceding
file; job110063605087 completed all eight Working History cases in about3m33s.
The combined observed owner work is about5m45s plus normal setup, inside the
unchanged12-minute targeted budget. That historical overall run later failed;
only these completed cases supply the timing estimate, not a current PASS claim.
With only this marker, all other existing targeted steps remain unselected by
their own unchanged conditions. Their routes are preserved, not repurposed.

## Independent static correction

Before publication, independent review identified a selector-specificity conflict:
the shared Original-marker/History `:is()` rule would have made700px override the
History860px declaration. The unpublished candidate was corrected by putting700px
only on the explicit Original selector and leaving only padding/overflow shared.
A static regression rejects a shared-width declaration; no `!important`, target
change or relaxed visual assertion is used. Current native after evidence remains
pending until the corrected candidate runs.

The same review identified that History appends an availability line after its
original body. The Unicode-tail Range now measures exactly the complete tail
marker shared with Original, rather than accidentally including later status
blank lines. It still requires every measured glyph to be visible; full original,
clipboard and comparison-text assertions and the heading glyph gate are unchanged.

## Current local checks

Syntax, YAML parsing, 37 focused owning/CI cases, package11,484 guardrails and
release11,049 guardrails/311-file product guard pass. Full local unit execution
finishes1835 PASS/1 FAIL/0 skipped. The only failure is the unchanged10k fake-IDB
controlled-machine120-second benchmark: commit147.512s; reading29.3ms;
maximum batch1.810s. Complete10,000-Input, bounded batch/bytes, idempotent repeat,
source/read/search and zero-provider checks before that threshold pass. It is not
relabelled PASS and is not retried or bypassed by setting CI locally. No data,
performance implementation, fixture or threshold changes in this CSS-only slice.
Hosted current-head after images, twelve browser owners and required aggregates
remain pending; baseline PASS does not imply current CSS acceptance.

## Historical baseline preparation

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
