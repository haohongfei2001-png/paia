# PAIA takeover acceptance matrix — 2026-10-23

This is the verification queue for the current Consumer Product programme. The
current chat owns implementation and integration; former dot coordination is no
longer a prerequisite. The owner has authorized ordinary local development and
its scoped checks, while exhausted cloud runs, paid calls, credentials, actual
account data, deployment and irreversible operations keep their existing limits.
This document is a plan and coverage inventory, not a completion certificate.
The [takeover queue](PAIA-TAKEOVER-QUEUE-20261023.md) owns programme sequencing.

## Baseline and evidence rules

- Refreshed main: `73fa457a1c9b5b060ff362e15777354aa37d49cc`.
- PR313 acceptance head: `02144bccf5e0e0b6842aaa4e7c6958cedecdfde1`;
  Full `39860568299` failed. Its first permitted opportunity is consumed.
- Follow-up implementation commits `712a5d1a503d260f4318d755518927acd04d8066`
  and `1a16d25e313457e5c1f86189b3b493f7efde3753` repair owning tests;
  original failures remain evidence. Integrate their exact changes, not whole
  branches containing diagnostics and historical receipts.
- Semantic read-pair implementation `f745013c121391488002116e28b061dd796c94ef`
  has 48 local correctness cases recorded by `b0a10565`. That evidence uses
  the production repository with fake IndexedDB. Native performance benefit and
  Linux capacity remain unproved.
- Record the final integration commit/tree, runtime versions, exact files,
  command, exit code and complete summaries for every new batch. Evidence from
  a component or older tree cannot certify a new combined tree.
- PRD, Project Recognition and Archive Navigation historical queues are absorbed
  by Consumer Product v1. Reuse their evidence; do not restart obsolete rounds.

## Verification batches

| Batch | Complete scope | When and acceptance boundary |
| --- | --- | --- |
| Source and packaging | `git diff --check`; changed JS syntax; `scripts/check_package.py`; `scripts/check_development.mjs`; gateway deployment-source check; one standard release build and release/privacy checks | Once a coherent integration candidate is frozen. Preserve permissions, source/release transform, all assets and existing website history. A package is not an installed runtime. |
| CI contracts | `sync-node-preflight-ci.test.mjs`, `d5-full-browser-partition.test.mjs`, `cpv1-02-hosted-browser-setup.test.mjs`; add current-browser partition/admission owners when workflow/routing changes | One Node22 batch for the actual changed integration. Historical 144/144 on Node22/macOS does not prove Linux. No real APT is required for the helper's synthetic tests. |
| Semantic read pair | `ai-usage-semantic-receipt.test.mjs`, `ai-cost-semantic-invalidation.test.mjs`, `mixed-current-fixed-plan.test.mjs` | One combined owning batch when integrated owners change. Retain error identity, both-read observation, whole-transaction rollback, no partial receipt and same-key sequencing. Do not run another large seed as a routine check. |
| Organize protocols | Changed Organize owner/session/protection/budget/configuration tests and service client/recovery tests | Select by actual integration diff. Test current ownership, source/processing fences, exact Current and human fields, ACK/CAS, rollback and unknown outcomes; avoid adding unrelated full suites to each small change. |
| Browser3 and Entry | Complete `cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` and `topic-entry-section-move-chrome-e2e.test.mjs`, Source and release | Consolidate once at the integration milestone if their effective source dependencies changed. Prior B3 4/4 and final Entry four leaves remain component evidence; the old mixed invocation remains 6/8, not a green aggregate. |
| Organize service-native | All four original files through `test:organize:native`, below | New explicit coverage entry; actual native execution pending root scheduling. All 30 explicit leaves, no case filters. This is synthetic client/service integration, not real PostgreSQL or model qualification. |
| Other affected browser owners | PR312 Settings restore-intent owners; affected Maintenance, Topic lifecycle, Context and source/working/Sync owners | Derive from exact final integrated diff, preserve whole owning files and Source/release variants. The user resumed local Sync implementation and synthetic verification; real-provider access remains separate. |
| Full/platform gates | Original unit, adapter/privacy, ten current browser shards, macOS secure-store/discard, Sync native, release, certification and supplementary gates | Deferred to a meaningful frozen milestone. A new cloud execution requires a separately approved bounded allocation. No failed/cancelled/skipped gate may be relabelled by local results. |
| Visual and interaction | Current R3 floating UI, YEAR-HARMONY application surfaces, latest Context/Settings/Thought/Archive/Reader designs; source/release, supported sizes/themes, keyboard/accessibility and animations | Existing screenshots and structural checks do not constitute full design fidelity or final human visual acceptance. Capture synthetic headless evidence together; do not steal the user's visible browser focus. |
| Real environment | Supported live-source behavior, installed-runtime parity, daily lifecycle/durability, physical display/performance, provider quality/accounting and external Context client/transport | Use current plan's exact contracts. Real account/device/provider resources and any missing authority or transport choice remain explicit external prerequisites, not inferred permission. No real-data reads or installation from this matrix alone. |

Build/package and necessary data-integrity checks remain during development.
Broader visual/platform/Full acceptance is postponed, never removed. When a
specific dependency is blocked, continue unrelated engineering.

## Explicit Organize service-native entry

The default extension runner enumerates only top-level `extension/tests/*.test.mjs`.
None of these four service files was named in an existing workflow or package
script at audit time. A passing default Full therefore cannot imply their
execution. The additive gateway script runs the original complete files with
concurrency one and TAP, retaining every existing per-case timeout:

| File under `services/ai-gateway/tests/` | Explicit leaves | Principal coverage |
| --- | ---: | --- |
| `organize-source-native.test.mjs` | 18 | Original sender, signed source/service path, final-fence invalidation, held response rejection, real 30-second selection expiry, separate HTTP abort and fresh-action retained CAS |
| `organize-worker-ui-native.test.mjs` | 4 | Original UI action and stop, worker ownership and saved Current |
| `organize-fresh-current-native.test.mjs` | 4 | Native incremental publication, protected human field, real no-delta versus all-protected pending result |
| `organize-source-native-budget.test.mjs` | 4 | Actual cumulative metadata read bound and 2 MiB material bound |

The service fixture uses actual signed issuers/HTTP parsers/original ledger
owners with a deterministic SQL protocol simulator. The external HTTPS response
is intercepted; it does not dispatch to a real model. Native browser state uses
the original temporary-profile harness. The original release variants build
temporary releases and clean their own profiles/staging. Gateway dependencies,
including the existing `pg` import, must resolve even though no database server
is used. Do not add these imports to the default extension browser group merely
to make them discoverable.

On this recorded Mac worktree, the following explicit environment avoids the
previous bundled-Playwright/Python mismatch. Check the files and versions before
execution; missing dependencies are a setup failure, not permission to download
or substitute a runtime. This is a proposed invocation, not an execution record:

```sh
cd /Users/hhf/.codex/worktrees/organize-handoff-validation/paia/services/ai-gateway
PAIA_NODE_BIN=/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin
PATH="$PAIA_NODE_BIN:/opt/homebrew/opt/python@3.12/libexec/bin:$PATH" \
PYTHON=/opt/homebrew/opt/python@3.12/bin/python3.12 \
PLAYWRIGHT_MODULE=/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/extension/node_modules/playwright \
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
PAIA_HEADLESS=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
"$PAIA_NODE_BIN/node" "$PAIA_NODE_BIN/../lib/node_modules/npm/bin/npm-cli.js" run test:organize:native
```

The expected recorded toolchain is Node22.23.3/npm10.9.9, Python3.12.14 and
Playwright1.63.0. Read the actual installed Chrome version each invocation;
Chrome156.0.8078.47 was observed during the latest seed run, whereas old closure
evidence used155.0.8059.85. No new launcher, browser security argument, real
profile, network permission or global environment change is introduced.

## Capacity and cloud allocation proposal — not activated

The unique Browser2 diagnostic `39878678889` is consumed and cancelled. It
reported 82/82 and both audits passed; 14 child processes and their controller
exited normally. Its approximately1087-second job and1020-second test step
provide no evidence of a final child-process hang. The platform cancellation
trigger and the old six cancelled shards/Unit1 shutdown remain UNKNOWN.

The original UX-R4 file consumed303.337 seconds in that diagnostic. Moving it
requires actual complete target-shard setup/test/tail evidence and extra margin;
four files in shard7 do not prove sufficient capacity. No destination is approved
by this document. Mac seed84.7seconds versus cloud seed228.1seconds is a different
environment observation, not an optimization gain or Linux forecast.

A bounded alternative for approval is to change only the current-browser job
limit from18 to24minutes while retaining ten jobs, concurrency1, all original
test/data sizes, cold signed-font preparation, tail audits, artifacts and gates.
For the observed1087seconds this gives353seconds arithmetic margin, not a promise
or diagnosis. Browser upper allocation becomes240 rather than180 runner-minutes
(+60); actual use and monetary billing remain unknown. Other jobs stay unchanged.

The necessary implementation scope is the workflow and four existing contracts:
`d5-full-browser-partition`, `current-browser-nine-partition`,
`approved-ui-current-browser-admission`, and `sync-node-preflight-ci`. Preserve
the original Sync166f normalization baseline and command hashes by reversing
only the uniquely matched approved timeout delta, just as for the approved font
block; retain an unapproved-timeout negative control. Do not replace the stored
hash wholesale or strip whole jobs. No router or production change is needed.

Request any eventual cloud allocation once for the frozen milestone, with exact
candidate SHA, selected workflows and summed job caps. Suggested stop conditions:
one authorized attempt per named workflow, no automatic retry, no second large
seed/standalone capacity run, no delete/recreate trigger branch, no candidate
change during execution, and preserve all failed/cancelled outputs. A candidate
Full and a later required exact-main Full are distinct allocations; successful
candidate evidence does not automatically authorize or certify the latter.
Additional service-native/visual/PostgreSQL jobs must be named and capped rather
than silently bundled. All such remote execution remains pending authorization.

## This change's validation

An explicit package script and this matrix are added. The original shared
harness now resolves `playwright` from the repository by default, retaining
the explicit `PLAYWRIGHT_MODULE` override. Its previous developer-specific
absolute fallback could select a different bundled version or fail on another
machine, contrary to `DEVELOPMENT_WORKFLOW.md`. A small regression imports a
temporary copy of the real harness with distinct repository/override stub
packages, verifies each resolution and requires a missing explicit override to
fail. It imports only, without a browser launcher.

Default `test`, all four native files, browser launch arguments, workflow,
timeouts, production runtime, credentials and deployment configuration remain
unchanged. The new regression is an ordinary discovered unit test. The script can
be statically checked against the exact four filenames and Node arguments
without importing or executing any native fixture. Actual integrated native
results must be appended with their identity after the coordinator's single
scheduled batch; at creation they are NOT_RUN.

Entry validation on the existing isolated Node22.23.3 passed: one module-resolution
regression (117.044958ms TAP total, exit0, zero failed/cancelled/skipped/todo),
plus static equality of the script's four filenames and arguments and existence
of every file. Scoped diff whitespace checks passed. No native test was executed
by this preparation. Static search found no fixed harness SHA256 assertion in
the current tests/scripts/service/workflows; existing generated native proof
vectors continue to bind their actual source hash without rewriting old evidence.

## Current UI reachability and owning coverage — static audit

Audited against integrated `0897127e` and the pending harness/entry changes.
This section records source reachability and existing test assertions, not a new
browser execution or a statement that all listed tests passed on that tree.
Authority is [R3](../AUTHORITY.md), [YEAR-HARMONY](../YEAR_HARMONY_REFERENCES_2026-10-16.md)
and [SET2-UI-1.4](../SETTINGS_CONSUMER_V2_PLAN.md). Earlier all-years-at-once,
Context search, New Topic and floating B/R1/R2 references are superseded.
Reference hashes do not substitute for access to the actual approved images.

All implementation paths below are relative to `extension/`; test filenames are
under `tests/`. `scripts/test-groups.mjs` was checked to distinguish current from
historical/experimental browser owners. A helper's existence alone is not counted
as an executed or default-gate assertion.

### Five main surfaces

| Surface and current entry | Existing implementation and behavior | Existing owning native coverage and remaining limits |
| --- | --- | --- |
| Prompt: supported ChatGPT composer, fixed three forms, toolbar/settings entry | `content/prompt-surface.js`, `background/prompt-surface.js`, `ui/prompt-surface.js`; original private frame, exact sender/document qualification, retained local search, selected-text insertion with no send | `nib-approved-fixed-chrome-e2e`, all six `nib-v4-*-chrome-e2e` files, `cpv1-09-prompt-surface-chrome-e2e`, `cpv1-09-prompt-insertion-chrome-e2e`, `cpv1-09-prompt-compatibility-chrome-e2e`, `cpv1-12-next-prompt-chrome-e2e`. Current-group membership exists. Synthetic old/current composer signatures and native CDP composition do not certify today's logged-in ChatGPT or physical IME. |
| Settings: sidebar or compact navigation; Prompt entry returns to original app route | `ui/app-shell.js`, `ui/settings-preferences.js`, `ui/settings-details.js`, `ui/reader-navigation.js`; six groups, actual preference owners, compact directory/Back, local intent rejects stale restoration | `uir-04-settings-chrome-e2e`, `settings-next-chrome-e2e`, `settings-data-destinations-chrome-e2e`, `settings-preference-publication-chrome-e2e`, `nib-v4-settings-entry-chrome-e2e`. The Sync destination is now mounted and its read-only unavailable state has two targeted native passes below; provider-backed Sync remains separate, so six groups alone do not prove 22 working operations. |
| Context: sidebar `memory` / For AI and Settings AI Context destination | `ui/context-cards.js`, `ui/context-topics.js`, `ui/context-connections-view.js`; four metadata-only cards, Info/Rules/Now owned editors, Topic choices, separate connection authority; no Context search | `context-cards-chrome-e2e` includes both variants, durable edits/delete/undo, failures, composition, peer races, Topic choices, keyboard/history and approved final local reference states. `cpv1-ctx4-05-maintenance-chrome-e2e` and `desktop-vnext-context-chrome-e2e` cover their narrower owners. External AI client/transport interoperability and real grants remain separate; the local connected-state UI is not proof of an available external integration. |
| Thought: sidebar `thoughts`, existing Topic and selected Section | `ui/topic-workspace.js`, `ui/topic-workspace-presentation.js`, `ui/topic-section-prose.js`; metadata Home, explicit selected Section, own inline writer, year progression, human content and Current publication guards | `topic-year-chrome-e2e`, `topic-selected-section-chrome-e2e`, `topic-section-writing-chrome-e2e`, `topic-section-return-position-chrome-e2e`, `topic-entry-section-move-chrome-e2e`, `topic-section-promotion-chrome-e2e`, `cpv1-topic-02-lifecycle-chrome-e2e`, `cpv1-02-dvn-topic-{root,years,content}-chrome-e2e`, `ans-07-library-root-chrome-e2e`, `ans-08-topic-continuous-chrome-e2e`. Current browser coverage exists; these are not real-provider semantic quality or long-term user-use evidence. |
| Archive: sidebar `library`, root search/discovery, original Reader and explicit original-source destination | `ui/archive.js`, `ui/app-shell.js`, `ui/archive-year-requalification.js` and original search/editor/navigation owners; newest populated year, deliberate older-year append, no invented date for undated input, exact retained editor | `archive-year-chrome-e2e`, `cpv1-02-4-reader-chrome-e2e`, `uir-02-archive-search-reader-chrome-e2e`, `uis-01-archive-actions-chrome-e2e`, `uis-02-page-scoped-search-chrome-e2e`, `ans-01-reader-surfaces-chrome-e2e`, `ans-04-navigation-release-chrome-e2e`, capture/save/reconnect/backup owners. Root search remains; substantive Reader/Thought/Context search retirement is intentional. Current real source account, installation and sustained durability are separate. |

### SET2 six-group / 22-operation inventory

The six groups are generated from `SETTINGS_GROUPS` and mounted by the existing
AppShell. The following table maps the authoritative 22 primary operations;
later separately authorized Assist/Maintenance permission controls do not silently
replace a missing row or count as completion of this inventory.

| # / group | Operation and actual source entry | Existing verification owner / qualification |
| --- | --- | --- |
| 1 Input Archive | Save my AI inputs: `#toggle-capture`, `settings-preferences.js` and `settings-capture-consent.js` | `settings-data-destinations-chrome-e2e` real first-use confirmation, lost/unread ACK, peer pause and navigation; `settings-next-chrome-e2e` persistence independence; no automatic remote authority. |
| 2 Input Archive | Smart filter: `#smart-filter-toggle`, `ui/smart-filter.js` | Current `uir-04-settings-chrome-e2e` calls `compareD5Settings`, re-exported to `compareConsumerSettings`; its trusted interaction helper toggles the original FILTER owner. AI filtering is a separate opt-in/remote gate inside the existing filtered-content surface. |
| 3 Reading | Appearance: `#ux-appearance` | `settings-preferences.js` projects into real root theme; `uir-04-settings-chrome-e2e` and `settings-preference-publication-chrome-e2e` cover persistence/publication. |
| 4 Reading | Language: `#ux-language` | Same owners; current Settings tests check Chinese/English labels and reflow; system-language selection uses the existing resolver. |
| 5 Reading | Body text size: `#ux-font-size`, 16/17/19/21 px | Same owners plus `settingsReadingRhythm` / `settingsReadingSafety` in current UIR-04; affects actual readers, no sample panel. |
| 6 Reading | Reading width: `#ux-reading-width`, 640/680/720 px | Same owners; UIR-04 injects failed save and verifies the last confirmed value; `settings-next-chrome-e2e` has held-read return-intent coverage. |
| 7 Reading | Time display: `#time-display` | Same preference/publication and reader helpers; actual date/time formatting, not fabricated unknown timestamps. |
| 8 AI & prompts | AI Context: `#settings-ai-context` existing `data-view="memory"` destination | Shell route listeners plus `context-cards-chrome-e2e` / `uir-04-context-chrome-e2e`; opening the destination is not a grant. |
| 9 AI & prompts | Next-input suggestions: `#settings-next-enabled`, `settings-next.js` | `settings-next-chrome-e2e` and `cpv1-12-next-prompt-chrome-e2e`; separate default-off explicit confirmation, durable preference and original current-reply restrictions. |
| 10 AI & prompts | AI organize style: `#settings-ai-style-open`, `settings-ai-style.js` | `settings-ai-style-browser.mjs` is actually called by the current UIR-04 comparison helper, plus style owner/state/recovery/content-preservation Node tests. Saving style does not generate or adopt content. |
| 11 Privacy | Hide content previews: `#r6-hide-content-previews`, `r6-settings.js` | Current Settings interaction helper and `uir-03-preview-mask-chrome-e2e`; masking does not erase explicitly opened originals or grant access. |
| 12 Privacy | Supported websites: `#settings-supported-sites-open`, `settings-supported-sites.js` | UIR-04 native opens the real dialog at 320 px, two languages and doubled text, then verifies Escape/focus; package/supported-sites unit owner checks. |
| 13 Data | Sync: `#settings-sync`, mounted by `settings-details.js` and `settings-sync.js` | Integrated local package adds the truthful read-only unavailable destination. Two new Source/release `settings-next-chrome-e2e` cases prove exact Data order, both languages at 320 px, modal/keyboard/focus, unchanged storage and zero external requests. No enable/login/recovery control is exposed. Local coordinator correctness is separately tested; provider-backed Sync and real-account qualification remain unfinished. |
| 14 Data | Import earlier inputs: `#settings-history`, `history-completion.js` | `settings-data-destinations-chrome-e2e` keyboard entry, consent-gated chooser and original dialog; original import/capture recovery owners cover their data boundaries. |
| 15 Data | Storage space: `#settings-storage`, `settings-details.js` / `r6-settings.js` | `uir-04-data-chrome-e2e` checks estimates and missing quota truthfully; conditional repair remains a distinct confirmed-owner action. |
| 16 Data | Restore existing PAIA backup: `#settings-backup`, `ui/backup.js` | `settings-data-destinations-chrome-e2e`, `uir-04-data-chrome-e2e`, `cpv1-01-5-backup-chrome-e2e`, `cpv1-03-backup-segments-chrome-e2e`; file preflight/preview/explicit confirmation, conflicts and cancel remain original owners. No backup generation is restored. |
| 17 Data | Removed content: `#settings-removed`, `settings-details.js` / `settings-removed-composite.js` | `uir-04-data-chrome-e2e` and `settings-removed-placement-chrome-e2e`; typed recovery preserves Input/Topic/Entry/relationship distinctions, no blanket purge or hidden regrant. |
| 18 Data | Original source records: `#settings-source-records`, original `data-view="archive"` listener | `settings-data-destinations-chrome-e2e`, `uir-04-data-chrome-e2e` and original DVN Source owners; separate immutable source route, not the editable archive alias. |
| 19 About | Privacy: `#settings-about-privacy` | `settings-about.js` actual locale-specific product URL; `settings-about.test` / package guard check bytes/destinations, `ux-r1-shell-chrome-e2e` checks the four-link owner. Successful live external navigation is not inferred. |
| 20 About | Terms: `#settings-about-terms` | Same exact destination/package owners; no private text in the link, `noopener noreferrer`. Live availability is separate. |
| 21 About | Help: `#settings-about-help` | Same exact destination/package owners; current local source exists, live availability is separate. |
| 22 About | Feedback: `#settings-about-feedback` opens `#settings-feedback-dialog` | Original recovery-draft owner in `settings-feedback.js`; `settings-feedback.test` covers failed-save/IME/leave/peer/copy races using a DOM fixture. The two added Source/release native cases now exercise the complete real-worker draft lifecycle; see the targeted receipt below. Physical IME remains separately unqualified. Mail is an explicit user action; no automatic body/diagnostic attachment. |

The secondary position-only reset is reachable through
`settings-prompt-position.js`; `cpv1-09-prompt-surface-chrome-e2e` imports and
runs its existing native helper. It does not reset permissions or content.
Version/update status is real manifest/installation-source state, with unknown
and failed reads retained; current UIR-04 calls the About status helper. Actual
store delivery/update installation is not certified by a synthetic status.

Additional implementation beyond the 22-row inventory is independently owned:
`settings-assist.js` and `settings-maintenance.js` mount permission controls,
and legacy revocation remains available without reopening retired external
connections. `settings-maintenance-chrome-e2e.test.mjs` has eight explicit
Source/release native leaves, but its filename is not in the current browser
set/patterns: it is classified historical and is only explicitly named by
`paia-maintenance-promotion-evidence.yml`. Neither default Full nor the current
nine-file local batch proves these eight leaves ran. Reuse the dedicated owner
at a later consolidated acceptance point; do not expand Full implicitly.

### Remaining verification, separated from implementation gaps

- **Local and executable without external accounts:** the dedicated eight-leaf
  Maintenance settings owner when warranted by
  the frozen integration; exact R3/YEAR-HARMONY screenshot comparison when the
  already authorized reference bytes are available. These are not reasons to
  freeze independent implementation or repeatedly rerun the current native batch.
- **Human/device:** perceived hierarchy and design fidelity, actual OS IME,
  physical touch/coarse-pointer behavior, screen-reader output, reduced-motion
  comfort and long daily-use durability. Headless geometry/CDP/touch emulation
  is useful evidence but cannot fully substitute for these qualifications.
- **Live external / separately bounded:** current supported-site account and
  composer behavior, installed extension/version parity, update channel, real
  PostgreSQL concurrency/migrations, declared provider/model quality/accounting,
  real identity/entitlement and external Context client/transport. Current local
  guards correctly making a capability unavailable are not a completed live
  service. Do not enable credentials, read real account data, spend paid quota or
  deploy merely to remove an unavailable label.
- **Newly authorized independent work:** the user lifted the Sync feature pause
  during takeover. Its first local coordinator and read-only Settings destination
  are now integrated and independently checked. Provider implementation and
  qualification continue separately; this does not activate any account or secret.

No further definite runtime defect was established by this reachability audit.
The unfinished provider-backed Sync and the remaining verification gaps prevent an unconditional
whole-UI/whole-product acceptance claim; they do not invalidate the independently
completed local owner implementations.

## Integrated native receipt boundary

The coordinator reports the nine-file integration batch completed with **100/102
passing**. The two failures are the NIB release subcase and its parent aggregate;
they are not two independent product failures. Its raw recorded `sourceStable:false` remains unchanged. The coordinator's
`native-source-difference.json` audit identifies only the shared harness final
newline: appending a newline to the after bytes exactly reconstructs the before
SHA beginning `856e144a`; product runtime bytes are unchanged. This explains the
identity difference without rewriting the raw flag or making the failed
invocation a green native suite.
The other local failures and original cloud failures remain in their own logs.

The Feedback native coverage gap above is being closed in the existing
`ux-r1-shell-chrome-e2e.test.mjs` owner, without adding a browser root. Two added
Source/release cases use the actual Settings dialog, worker recovery RPC and
Chrome local storage, reload the exact Unicode draft, generate a trusted CDP composition-start and record the actual commit-end
event identity, and fail only the original worker's feedback-key storage write to check
failed-save leave protection and explicit retry. No mail action is clicked.
The native modal cancel event during an active composition is deliberately
dispatched to exercise its original leave owner without ending composition by
shifting OS focus; it is not represented as a physical Escape/IME test.
Execution results are recorded separately after the single targeted invocation.

Feedback targeted native closure: both added cases pass, Source 2943.795542ms
and release 4490.186583ms; TAP 7602.624292ms, exit0, 2/2, no failures,
cancellations, skips or todo. Execution used the existing isolated Node22.23.3,
Python3.12.14 and repository Playwright1.63.0 with the original headless harness.
Start/post-run HEAD was `0897127e67902141a43b94ea18f44998235a2fc5` with the
listed working-tree test additions. The untouched original owning-file bytes
remain its exact prefix. This is the two new cases, not a full-file rerun.

The first invocation was 0/2 solely at an incorrect expectation that CDP
composition-end would be trusted; both variants observed trusted start and
untrusted end, after successful original persistence/failure/retry assertions.
That initial TAP is retained. The corrected check records the actual end identity
and asserts the composition sequence plus trusted native start, without claiming
physical IME qualification. Final execution also passed the second reload and
network/source-isolation assertions. Evidence is under
`work/paia-takeover-20261023/feedback-native/`: retained initial TAP, final TAP and
`receipt.json` with exact post-run source/test/log SHA256 values. No mail was
opened/sent, no external account/model was called and no production file changed.

The coordinator separately reports the repaired NIB whole owning file passed
34/34; that does not rewrite the original 100/102 integrated invocation. Static
independent review of its delta found the original late-layout-ACK focus-race
assertions retained: a synthetic one-pixel real header height change at the
original history-read reply guarantees the actual measure path, its response is
held, native trusted Tab chooses the original row action, and release cannot
restore older focus. Original RPCs remain in use and exact prior header style
is restored in `finally`. No runtime/guard/timeout/keyboard assertion is relaxed.


## Restored structural Context native qualification

On integrated runtime `19d97e316e73a5b6213f0bbbd2ed19c93d227aa3`, one targeted
Source/release invocation of the two newly added CTX4-05 parent cases passed
**8 native leaves + 2 parents = 10/10 TAP tests**, exit 0, with no failures,
cancellations, skipped tests or TODO. TAP 10624.695125 ms; wall 10.682498209 s.
Node 22.23.3, Python 3.12.14, Playwright 1.63.0 and Chrome 156.0.8078.47 ran
on macOS arm64 using the original headless offline harness. Both HEAD and the
eight recorded test/runtime hashes were identical before and after execution.

The real original Section/Topic owner first renames and restores its field;
the original LocalMaintenanceSession then commits exact Context coverage while
the separate Topic obligation stays DEFERRED, even with both existing Topic
reconciliation options enabled. The ACK negative controls abort the original
native IndexedDB transaction, observe abort without complete, preserve all
original table rows, and replay the recorded response without another provider
call. Source/Input/human organization and revision history remain unchanged;
actual app settings and network guards pass. All old owning-file cases remain
byte-identical after removing only the new function and parent-case blocks.

Evidence: `work/paia-takeover-20261023/structural-restore-native/REPORT.md`,
`execution.json`, the original TAP, eight body-free leaf receipts and SHA256SUMS.
This is native domain/transaction qualification, not a whole-owning-file pass,
physical UI restore journey, live processing authorization, Linux capacity proof
or replacement for final integrated gates. No cloud run or real model was used.


## Settings Sync destination native qualification

At integrated HEAD `68bff5cd8e9d2ec02c2ed20c5e6b2026b940b750`, the two appended
Source/release cases passed **2/2**, exit 0, no fail/cancel/skip/todo; TAP
5445.801084 ms and wall 5.501248458996997 s. Node 22.23.3, Python 3.12.14,
Playwright 1.63.0 and Chrome 156.0.8078.47 used the original headless offline
harness on macOS arm64. HEAD and seven source/test hashes remained identical.
The real Data destination order, bilingual 320 px dialog, native keyboard/focus,
only-Close controls, complete unchanged local-storage snapshots and zero
external/provider requests passed. This is the truthful unavailable destination,
not provider authentication, native recovery or completed production Sync.

Independent review of exact package `d2b26b3891985f8c392ccdf64d8364bca6a30104`
confirmed both reported risks addressed: every discovered cut uses the original
graph compiler and the selected DAG end must exactly contain all historical
revision items; bounded discovery waits fence late listing/get results. Missing
or compacted history stays fail-closed. The discovery deadline does not cover
stage/get or activation, and it does not cancel underlying transport IO. Actual
activation still awaits its original owner; uncertain commit remains unknown.
No remaining blocker was found within that first local package scope. Its
separate 94/94 Node receipt was inspected, not rerun.

Evidence: `work/paia-takeover-20261023/settings-sync-native/REPORT.md`,
`execution.json`, original TAP, two body-free receipts and SHA256SUMS.


## Authored and Placement native dual-facet qualification

At frozen integrated runtime `a9fb362b39cad49ff271c7bcaa0c4c295def88fc`, the
appended CTX4-05 finite batch passed **20 native leaves + 2 parents = 22/22**,
exit 0, no fail/cancel/skip/todo. TAP 11730.940917 ms; wall 11.778604416991584 s.
Node 22.23.3, Python 3.12.14, Playwright 1.63.0, Chrome 156.0.8078.47, macOS
arm64 and the original headless offline harness were used. HEAD and the complete
recorded runtime/UI/background/harness/scripts/owning-test SHA256 vectors were
identical before/after. The original 146485-byte owning-file prefix is unchanged.

Both Source and release qualify Authored and Placement through the original
source-owned response adapter and genuine independent TopicProcessingAuthority:
complete dual publication, missing Topic payload permission, final Topic grant
revocation, native Topic ACK abort, native Context ACK abort, response replay
without an additional provider call, and completed replay with no durable write.
Human body, Source, membership, Section, provenance and revision rows remain exact.
Each failure checks all native stores against its original transaction's prestate.
Context failure preserves the earlier independent committed Topic ACK/receipt;
this is **per-facet transaction atomicity**, not cross-facet atomicity.

The first invocation remains 5/12 with seven failed TAP tests. It exposed a real
session-to-Topic-issuer qualification-budget wiring gap and release package URL
admission gap, plus a Context rollback test oracle that wrongly assumed both
facets share a transaction. Two minimal Authored diagnostic runs remain 0/2 each.
Root fixed the trusted resolver's bodyfree budget argument without weakening
original budget identity or independent processing guards. The fixture caches
issuers by budget identity with a fixed epoch/expiry; the wrong-budget and revoked
authority Node controls remain separate evidence. Exact package module/literal
admission grants no network or OAuth capability. All failures, source snapshots,
final raw TAP and 25 initial/final case records are retained under
`work/paia-takeover-20261023/human-reconciliation-native/` with a manifest.

Remaining acceptance is unchanged: this is finite native domain/transaction
coverage, not whole owning-file regression, visual/device acceptance, Linux
capacity, real provider/authorization qualification, or a complete product pass.
Source-linked Sync grouped cold recovery, Context correction reconciliation and
other current implementation gaps stay on the takeover queue until separately
implemented and qualified. Production activation and cloud execution still need
their existing authorization and budget boundaries respected.
