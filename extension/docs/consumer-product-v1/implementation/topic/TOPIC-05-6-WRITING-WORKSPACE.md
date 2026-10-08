# TOPIC-05.6 real writing workspace — local candidate

## Scope and ownership

This increment connects the existing TopicActions draft, Section destination and acknowledgement owner to the ordinary T05 writing workspace. AppShell is the sole visibility owner. It does not add a router, draft store, schema, write RPC or permission. Preview-only presentation still cannot write. The current Topic heading comes from the actual existing picker rows; no invented date range or Source statistics are shown. The footer states that creation time is the time of saving.

Base is Section-aware writing 68bef8f7 plus IAH 4a248d86 (merge 3f6e909f), with independently reviewed EntryMove storage-error fix 6ff1bed6 cherry-picked as 47801fbf. No CI/version changes in this increment; app-shell.js is unchanged. This is a local candidate, not a merged/installed release or completion of all TOPIC stages.

## Safety and return behavior

- The same literal textarea/session and exact unknown-ACK operation remain authoritative. Pending or composing sessions refuse navigation; dirty cancellation retains the same editor. Real save still reaches the existing worker and transactional Section/CAS checks.
- Writing entry asks the existing history owner to checkpoint current state only after same-owner validation. This explicit checkpoint observes legitimate Root-slot metadata written after the preceding route commit. Refused browser Back restores the full committed history JSON, including Search marker when applicable, Root slots, shell and exact opaque session/origin. It never copies an unvalidated pop target. The old modal pop branch is unchanged.
- During writing, Archive queues ordinary refresh notifications. Existing Root/Topic paint qualification points defer late hydration/refresh replies; stale Root replies cannot clear the retained tree before the final guard. An outstanding Root anchor RAF cannot steal draft focus. Source protection, permission events and worker writes are not suppressed. On exit, the existing refresh path re-reads the current owner.
- Reading return keeps only transient original owner/intent/anchor information. It waits for that refresh, checks the compose generation, route/Topic identities and intervening scroll, then uses the existing exact anchor restorer. Missing Entry anchors do not fall back to unrelated content. A newer writing session revokes an older pending return.

## Current evidence

- Ten complete related unit files: **114/114 PASS**, `/tmp/writing-workspace-owner-final.log`. Includes production TopicActions/controller, actual history owner, production Archive return callback, prior Section-writing and EntryMove regression files.
- Original complete native source/release file: **2/2 PASS**, 12.254 seconds, `/tmp/writing-workspace-visual-complete.log`. Both isolated headless variants keep the original 90-second case budget.
- Native cases cover actual Root and qualified Section/header entry, held real Root response, actual background Topic creation notification, unchanged underlying tree/draft, refresh after exit, browser Back exact history JSON and unchanged history length, native keyboard entry from a long reading position and same Entry DOM/position within two pixels, dirty/pending Settings refusal, real committed-but-held ACK and exact retry/single Entry, Section rename, Source immutability, and default versus strict Section-fragment reload. Network assertions remain zero external extension requests/zero model requests/no harness errors.
- Package audit: **11880 guardrails / 356 resources PASS**, `/tmp/writing-workspace-package-final.log`; this is static evidence.
- `/tmp/writing-workspace-final-bytes.txt` was recorded before the final native run and every listed byte digest matched afterward. No production/test edits followed that run.

## Visual inspection

The original visual archive and correction archive were checked against their checked-in SHA-256 values before extraction. T05-1440-light.svg SHA-256: `736d716883baab7a9ad648a24d65f55736bc0015a333eac82e04578937ded7e1`. Reference rendering: `/tmp/writing-t05-authority.png`.

All six current source/release screenshots were opened and inspected: `extension/work/qa-topic-writing/{source,release}/workspace-1440-light.png`, `workspace-320-dark.png`, and `workspace-320-dark-text200.png`. The workspace keeps T05's open prose, Topic/title hierarchy and factual footer. The existing functional Back, Topic picker and More controls remain necessary behavior differences; it is not claimed pixel-identical to the historical static artboard. No underlying interactive Reader search is exposed around the draft.

The 200% test uses CSSOM on the same actual nodes, asserts every measured font is exactly twice its initial computed size, uses 1.5 line-height, and restores original inline style afterward. It does not disable CSP and is explicitly text magnification, not Chrome/device zoom. At 320px, long headings wrap, the native Topic picker remains bounded, actions and footer are readable, vertical scrolling is permitted and horizontal overflow is rejected. The exact editor and Unicode/paragraph text remain unchanged. This bounded inspection is not certification of the unrelated full desktop appearance matrix.

## Preserved failures and limits

- `/tmp/writing-workspace-before.log`: original owner ignored the real workspace destination and opened its modal. `/tmp/writing-workspace-first.log`: cancelled incomplete Topic-query fixture, not a pass.
- `/tmp/writing-workspace-native-final.log` and `/tmp/writing-workspace-history-diagnostic.log`: exact history equality exposed loss of Root slots/shell on refused pop. A proposed weaker assertion was rejected and never applied. The actual history owner was repaired and the full JSON assertion retained. `/tmp/writing-history-owner-before.log` holds the unit negative.
- `/tmp/writing-workspace-held-root-before.log`: command-path/old Root-button-location fixture failure; not evidence of the response race. `/tmp/writing-workspace-held-root-negative.log` proves the real late Root reply painted a new node under writing (1 instead of 0).
- `/tmp/writing-return-intent-before.log`: old asynchronous return incorrectly restored first after second; the existing compose intent fence fixes this.
- `/tmp/writing-workspace-combined-final.log` and `/tmp/writing-workspace-position-diagnostic.log`: the first long-position fixture used a pointer click on an offscreen header; Playwright scrolled from 600 to 0 before pointerdown, and production correctly restored 0. The corrected native focus→wheel→Enter entry tests the intended long-position boundary; all original pointer journeys and exact position assertions remain.
- Earlier `/tmp/writing-workspace-complete-final.log` 2/2 is historical behavioral evidence only. Visual inspection showed its style-tag magnification had not taken effect and its context heading inherited flex growth. The final local flex fix plus measured CSSOM 2x evidence supersede those visual claims.
- No paid model/cloud connection, actual user data upload, deployment or new external authorization. Generic modal metadata/history redesign, reload-persistent drafts and broader TOPIC-05.6 completion are not claimed. Formal version/CI admission and integration remain coordinator work.

## Tested SHA-256

- `ui/topic-actions.js`: `fa2d16b16effbb1a8719683af5651e1cf9fcbb6171cb6c542d4c7a0bfce8ff3b`
- `ui/thought-compose-presentation.js`: `2babd752e57d473922b6b32dcc6f0918e7a4ec142a2a889768e9b913da64b9d4`
- `ui/thought-compose-workspace.css`: `af733ca00e590ab25aa38af42cf121d8007cd90f1d71970d9d0cc05634968218`
- `ui/app-shell-state.js`: `10cffbcff9fefafd08ff2da9c4c1bc06172057887281691222116084f6bb0543`
- `ui/archive.js`: `84755dba756a690cf1f675a2d9e35c34ad5dae64507619c764c9018815211dc0`
- `ui/reader-navigation.js`: `4fbc4a066474107a7d3d315336d1f06b9c838a0cf43b058c3db8754b24e37a75`
- `ui/topic-workspace.js`: `1c174f786780051bad2d94c887980223d030a2813f4af0b2d9c73ed8de47b1ed`
- `tests/thought-writing-workspace.test.mjs`: `cf40a1aab3c86df0a94987e4f05dcf337e4e6a85af0fec3234bd7f6b4923330b`
- `tests/writing-history-refusal.test.mjs`: `95381d3755f06e5a3c6dc7a6052e5b9270d703fd9a2cbb73dd780deb50d10dec`
- `tests/topic-section-writing-chrome-e2e.test.mjs`: `dbbc3d15836e3ee1161daf1f538e40e1bf6d1a9a1cd829c15164c37cde700e35`

### Root coherent integration and CI admission

The reviewed writing implementation `8f67f56c` was merged with Prompt/Settings `8a38c864` and optimized AI `f45df111` without changing Writing-owned runtime. The planned delivery identity is 0.25.0; strict existing-file admission adds only minor 25 and rejects future minor 26, preserving schema and prior supported versions.

The current browser corpus adds the entire writing native file on shard 2, retaining all 332 routes generated independently from the exact 83-file `8a38c8644605be6919c114f0b6866ada36a2552d` parent at shard counts 4/5/6/7. No old test, assertion or budget is removed. Independent CI/version review passed 23 complete cases; root passed 63 affected runtime/backup cases, package audit 12220/369 and the complete original source/release native file 2/2 in 13.254953958s. Logs are local `work/topic-writing-combined-units.log` and `work/topic-writing-combined-native.log`. Root inspected the release 1440px light and 320px dark actual-200%-text screenshots; original visual assertions passed for both variants. These are pre-final-checkpoint local evidence, not a later exact-head full CI or installed-release claim. Pending Sync conflict changes require final coherent validation.
