# ANS-07 seed admission follow-up — 2026-10-22

## Identity and scope

Requested in PR313 comments 6335723662 and 6335823930. Independent branch `codex/ans07-seed-admission-followup-20261022`, base `607f453c8d999fe170d4199f93c6a8cf92071ef7`. Fix commit and exact file hashes are in [receipt.json](evidence/ans07-seed-20261022/receipt.json). This branch starts from the previous Browser10 evidence checkpoint, not the separate Prompt Surface successor; cherry-pick the four-file fix, not the entire branch.

Original [Full39740927351 / Browser8 job119697718295](https://github.com/haohongfei2001-png/paia/actions/runs/39740927351/job/119697718295) FAILED. PR head was `ecf1feeb09673d94d855176639501275cf6e8e38`; the actual checkout tested merge `6598714aedecfce33f5c7e63a8a45ed5cfbcd18a`. ANS-07 failed inside seed page.evaluate with CONTROL_PUBLICATION_CHANGED at indexed-store.js:188. Original cloud log is retained byte-for-byte as gzip. Baseline identity receipt verifies that the failed merge's ANS-07 test, IndexedArchiveStore, OnboardingUI and SettingsLocalState equal this branch's pre-fix files.

No production/runtime, workflow, version, Settings/Context keyboard, PR312 or PR313 acceptance-head changes. No Full, deployment, paid model, credential configuration, automatic review or merge. Dot owns independent review, exact integration and complete qualification.

## What is proven

Onboarding click invokes async accept without awaiting it in the event listener. The old fixture awaited the click, then created a separate LibraryDocumentsStore and began compound writes. A click completion is not the original CONSENT ACK. IndexedArchiveStore's two native control-fence acquisitions correctly reject a concurrent control publication before entering that run's callback.

The new controlled native cases use the unchanged FakeChatGPT headless harness and original worker CONSENT command. A debugger-side gate holds dispatch of the one trusted UI request. In the old-admission case, the first original seed fence read completes, then the gate releases CONSENT and waits for its actual ACK before returning that first read. The second acquisition observes revision 1 instead of absent. Evidence records exactly one request, one seed attempt, one unentered run, CONTROL_PUBLICATION_CHANGED, zero seed committed write transactions, zero persisted Topics/Entries, and an external-to-fixture publication changing settings/diagnostics. No control record or database is forged.

In the corrected admission case, a second debugger task verifies zero seed attempts and no first fence read while the original request is held. Releasing that same request allows its ACK, then one createTopic succeeds, leaving exactly one Topic and zero Entries. It is not a retry. The original production fence remains active in both cases.

**Historical limit:** this proves an actual fixture admission race, not the unique publisher, phase or partial state of the earlier cloud failure. Original cloud lacks those diagnostics. A single unchanged local original-file run passed; that does not replace or close cloud RED. The old STALE_BASE investigation remains UNKNOWN and separate.

## Four-file change

- `tests/ans-07-library-root-chrome-e2e.test.mjs`: capture completion of the original UI CONSENT, require its successful enabled ACK before constructing the seed store, add body-free phase/counters and failure metadata. Existing 300 Topics, 130 Entries, 45 placements, all original reading/projection/privacy/focus/restoration/performance assertions and 150-second timeout remain. The two controlled cases are registered in this existing Browser8 owner, without changing shard allocation or workflow.
- `tests/harness/ans07-seed-evidence.mjs`: observe original request/run/transaction promises. Last 32 run rows record callback entry and exact bounded error codes; committedWrites counts successful write transactions, **not Topic identities**. Successful operation counters are separate. Failed seeding additionally obtains only native table counts, with no body/identity reads, and always rethrows the original failure even if diagnostics fail. Missing, duplicate, rejected or unconfirmed CONSENT does not admit a seed. Observers restore original methods.
- `tests/harness/ans07-seed-admission-native.mjs`: two controlled original-worker/native-IDB admission cases, each with a 30-second test budget and explicit zero external/provider requests. Uses the existing publication observer; no retry helper.
- `tests/ans07-seed-evidence.test.mjs`: four regression cases for earlier committed progress plus later pre-dispatch refusal, entered/aborted failure, held original ACK, and missing/duplicate/unconfirmed/rejected completion. No replay, exact original error identity and cleanup are checked.

Publication metadata reuses `historical-publication-evidence.mjs` unchanged. It identifies publication revision/changed field categories and whether this fixture was publishing; it does not identify every possible external command owner. A future failure must be interpreted accordingly. Body-free diagnostic wrappers are test-only, not an uninstrumented installed-user qualification. The controlled request gate exists only in the two controls.

## Executed evidence

Local Node22.23.4, Python3.12.14, Playwright1.63.0, Chrome155.0.8059.85/macOS; original local dependencies remain exact. Cloud used Ubuntu24.04.5/Node22.23.3/Python3.12.15 and hosted Chrome155.0.8059.84. Platform/patch differences remain.

| Evidence | Actual result |
| --- | --- |
| Original unchanged ANS-07 native file | 1/1 PASS; no cloud-cause claim |
| Phase/counter diagnostics before admission correction | 1/1 PASS; no uncontrolled race reproduced |
| First controlled diagnostic attempt | 0/2: post-outcome count probe used nonexistent `entries` table; retained as `controlled-native.tap.gz` |
| Corrected native metadata probe (`thoughts` is the canonical Entry table) | 2/2 PASS, including the expected old-admission CONTROL_PUBLICATION_CHANGED refusal |
| Final complete ANS-07 owner with original journey and both controls | 3/3 PASS, 0 skipped/failed, 13975.887167ms |
| Node evidence/admission regression file | 4/4 PASS, 0 skipped/failed |
| Package static audit | 21218 guardrails / 607 resources PASS |
| Whitespace/diff check | PASS |

Commands used exact Node22 via the isolated runtime, `PAIA_HEADLESS=1`, exact installed `PLAYWRIGHT_MODULE`, local `CHROME_PATH`, and the repository's original harness. Final commands: `node --test tests/ans07-seed-evidence.test.mjs`; `node --test tests/ans-07-library-root-chrome-e2e.test.mjs`; Python3.12 `scripts/check_package.py`. No Full or complete Browser8 repetition. Original native cases retain all assertion lines; extra cases add checks. Full acceptance of the integrated candidate remains for dot.

Logs have raw and public SHA256 receipts. Local root/temp paths are redacted; original cloud bytes are unmodified. No profiles, databases, screenshots, credentials or private content are uploaded.

## Read-only CI preparation observation

The current Full Browser matrix in `.github/workflows/paia-certification.yml` uses hosted Chrome directly and one font-install step per job: signed apt update/install of `fonts-wqy-zenhei` and `fonts-noto-cjk`, followed by Chinese coverage and three font-match receipts. It does **not** currently contain a duplicate Playwright browser download to remove. Across ten independent runners, the same font acquisition is repeated. Dot reports Browser10's installation took 10m17 of an 18-minute budget; official canceled status alone does not establish cancellation cause.

Reviewable next option, not implemented: first verify package status and the exact font files/versions on the runner; only if the required existing font environment is already identical, avoid redundant apt acquisition. Otherwise use the same signed sources/packages and retain every font check. A shared package/font cache would need explicit version/hash, Ubuntu-image and signing validation before use. Do not skip fonts, raise budgets, shrink cases, replace families or alter assertions. There is no measured optimization claim or workflow change in this patch.

## Remaining dependencies

Dot review and exact integrated Full/Browser8/Browser10 qualification remain. The cloud event's unique publisher/stage/partial commits, original STALE_BASE, real-provider qualification and previously recorded product decisions are not resolved by this test-fixture fix. No new runtime change is justified by the available evidence.
