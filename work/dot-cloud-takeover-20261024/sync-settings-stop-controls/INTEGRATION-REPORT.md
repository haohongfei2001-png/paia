# Settings Sync stop-control scoped integration

## Exact source and result

Published base: `06910cd81d6a6176a10d1b78d759aa8802027554`, tree `d741676ec945be5aad7c383af5140e467ca7fdc6`.
Frozen author: `8e91200f90e24889932020d3de770484de93cc9d`, tree `bd939ce6328681f5c7ab1267603fb5e1b820db65`; source parent `995c577f217a6ad9a2480ef980089aa7a19f4245` is based on accepted Context completion `08d06a3c3a143bb8db42dfb3ff4f152a05b9722b`.
Integrated source: `47037f2928126a29b2ec63adaa8b934b7f984ce8`, tree `143d0bd1aa22aa64c2052a7685830aee2a14100c`.
Exactly 12 author-owned paths were imported: one runtime file, two complete owning tests, and nine report/log/hash evidence paths. The source parents preserve the published base and final author lineage. Core, background and services trees remain exact; Context completion and all prior accepted source/evidence remain untouched.

One authorized unfiltered run of the two complete owning files passed **89/89**, with zero failure, cancellation, skip or todo, exit 0. TAP duration `30251.51976` ms; wall `30.321817765012383` seconds. Original outer ceiling 240 seconds. Start `2026-10-24T20:57:06.164100+00:00`; end `2026-10-24T20:57:36.485316+00:00`.

- `extension/tests/settings-sync.test.mjs`
- `extension/tests/sync-local-lifecycle.test.mjs`

Command: `env -u PAIA_INSERTION_RECEIPT_MODULE node --test --test-reporter=tap extension/tests/settings-sync.test.mjs extension/tests/sync-local-lifecycle.test.mjs`.

Log SHA256: `210c498a0d3b5b17f3beecc4e2ce33a78c1131ba0d4be71eb8d8fd940d72adef`. Fixed test-list SHA256: `c28b651c02ba2c92db64c5c00003786a14f3984d711e0c473fc7f9a5d11e1fe1`. Source bytes and list were frozen before execution and verified unchanged afterward. No dependencies installed or added, and no temporary external-module symlink was needed. No integration test failure or rerun occurred.

## Behavior and bounded qualification

Only `extension/ui/settings-sync.js` changes production behavior. Original PAUSE/DISCONNECT controls remain reachable while ordinary work is pending, preserving active-only Pause, consent, task identity, generation selection holds, and worker busy restrictions. Request serials fence stale ordinary ACK/error/invalid/finally presentation. Stop replies do not pretend the old worker is idle; no automatic retry, transfer, Resume or polling is introduced. Backend cancellation, budgets, permissions, transport and package versions are unchanged.

Tests use mounted synthetic DOM, fake IndexedDB, original production owner and worker code with disposable injected synthetic configuration, fake chrome/storage and in-memory provider protocol. They do not launch a browser or contact a provider. No native, build, Full, automatic C, protected 129-group, 100k, account/network/paid/installation/deployment action was performed. Physical cancellation of already dispatched external I/O is not claimed.

This is only an exact two-file UI qualification. The previous 151-file/3234 result remains historical evidence for published `548983c0323c173575c9a817c02c34121136768a`; the later scoped Context completion 16-file/426 result remains bound to `08d06a3c3a143bb8db42dfb3ff4f152a05b9722b` and published `06910cd81d6a6176a10d1b78d759aa8802027554`. Neither is relabeled a new full pass here. No Source continuation `7ceb73c31b749c7e72cb4e3f32416c4437d9d222` or new backend repair was integrated.

## Open adjacent failures, not waived

The author's six complete adjacent files remain **29/32 FAIL**, with three failures in unchanged `sync-worker-checkpoint-prompt.test.mjs`; accepted-UI comparison remains **1/4 FAIL** in that complete Prompt file. Those same three test names do not prove identical failure signatures: candidate Google and OneDrive fail B RESUME without recorded error payload; accepted Google reaches B RESTORE and reports BNS_GROUP_RESOURCE_LIMIT, while accepted OneDrive fails B RESUME. Both cold cases report CONTROL_PUBLICATION_CHANGED. The Prompt file is outside the prior151 allowlist. Five other adjacent files'28 passes are not added to any new combined result.

Parent-owned read-only diagnosis identifies a separate actionable cold control-snapshot composition defect after legitimate consumer-preference recovery; the original fence correctly refuses stale qualification. Exact provider RESUME and resource-refusal causes remain unresolved. No Prompt assertion or backend is changed here, no refusal is waived, and the broader product gap stays open for separately owned work.

## Preserved first failures and preparation warning

All author and independent first/intermediate/final logs and scripts are retained. Author mounted baseline15/28, original owner0/2, candidate80/81 with invalid consent-fixture assumption, targeted5/5 and final89/89 remain distinct. Independent coherent accepted baseline4/30 and final30/30 controls remain distinct from its89/89 full owning rerun. Exploratory broader Pause/generation expectations, older/mixed-owner fixture failures and corrected legacy restore-phase assertions remain preserved, not reclassified as production fixes. Author and reviewer repeated scopes are not summed.

The first integration preparation stopped at full `git diff --cached --check`, exit2, solely for eight trailing-whitespace lines in the two preserved adjacent FAIL TAP logs. `preparation-diff-check-first.log` retains that output. Source/test diff check passes. The raw failure logs were deliberately not rewritten; this warning is not an executable source failure or an omitted test. The original partial preparation state was continued without reset or cleanup.

## Preservation and delivery

`frozen-integration-manifest.json` records all 12 path/blob/byte/SHA256 identities and unchanged backend tree IDs. `published-artifact-preservation.json` verifies all29 previously tracked report/ZIP paths exact against published base. `history-copy-manifest.json` binds current author/reviewer history copies to their sources; extra accepted-base reviewer materialization is retained only locally, not a new qualification or publication payload.

`post-test-verification.json` and root before/after snapshots prove a clean isolated worktree and byte-identical root HEAD, full status and staged diff. No root files, staging, remote branch, main, PR or CI state changed. Independent post-run read-only clearance at 20:58:59 UTC verified the exact source, 89/89 result, all12 author blobs, all29 prior artifacts, all32 copied current history files and root preservation; see `independent-final-clearance.json`. Publication remains the parent's responsibility.

## Later failure-only provider diagnostic and publication preparation

A separately authorized single targeted diagnostic on published06910cd returned `CONTROL_PUBLICATION_CHANGED` from B RESUME for both unchanged Google/OneDrive scenario definitions: **0/2 PASS, two FAIL**, exit1,2001.140104ms TAP duration,2.070945 seconds wall,240-second outer ceiling. Complete failing TAP SHA256 `4d3f135390273f75efb20ba1451f53ad58f44de75acf7fb765fc412a4d45d713`. This establishes response codes missing from the historical author log, not a unique internal throw site, schedule or provider root cause. Neither scenario reached B RESTORE; the earlier accepted-baseline BNS_GROUP_RESOURCE_LIMIT branch remains unresolved. The cold case and unsupported-preference case were not selected. This diagnostic is failure evidence only, not a complete-file pass or an addition to89/426/3234.

`provider-diagnostic/` contains the original report, complete TAP, exact baseline and diagnostic test bytes, test-only patch, command, preflight/import and preservation manifests, and preparation failure record. Original diagnostic ZIP and repeated published-base source TARs remain locally preserved and hash-referenced instead of duplicating an earlier source tree in this new bundle. Raw root binary staged-diff copies and local coordination notes are likewise referenced by hash, not publicly duplicated; root-preservation equality receipts and actual current test failures are fully included. No cold-backend draft code is included.

The publication candidate adds only the append-only QUEUE checkpoint, this `INTEGRATION-REPORT.md`, and `evidence.zip` after tested47037f. Frozen author REPORT remains unchanged. The complete current UI author/reviewer evidence, raw failures, source/test snapshots, patch, exact89 command/list/log and final source clearance are bundled. Prior29 report/ZIP paths are independently hash-referenced, not embedded again. Source/tests/backend are unchanged. Metadata preparation runs no tests or native/build operation and performs no remote writes. An independent archive/source audit is required before root publication.
