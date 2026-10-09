# Reader Back membership restore — first-paint repair

## Identity and scope

Base `9c399c5ddf342bb7ad0baca3b7518e61a7531168`; code `530934aec6b2aa859520e40621d62edcff0fbd4f`. Exactly one UI runtime file and one additive owning test file change. No shared data, Source truth, undo/save/version/CAS, worker, CI, version, provider, cache or frozen AI experimental owner changes.

| File | Final SHA-256 |
| --- | --- |
| ui/archive-navigator.js | `0041bb81643e1105c2ae477b19d36b703d3ec295c08b5b676bfe9e7294e820d3` |
| tests/d7-navigator-context.test.mjs | `5226a09284110facd139c7de5f84ef409967e641e0509b36329ae92d08460af6` |
| Original tests/cpv1-02-4-reader-chrome-e2e.test.mjs, unchanged | `88212e8761865a40c592024d6e002c0c3854e3922f95a331558afd245966d9b5` |

This fixes a demonstrated UI first-paint gap and has local native/regression evidence. Independent review, stable candidate/main gates and user-visible delivery are still coordinator-owned. No installed or full-programme completion claim.

## Original cloud failures, preserved

The first PR225 head `2cec9fea` Full `37878399910` reported only a generic expected-state failure. That original failure and the subsequent diagnostic-only checkpoint remain in their original receipt. They are not retrospectively counted as passing.

The diagnostic candidate `9c399c5d`, Full `37880915206`, again failed Current Browser1. This time `/tmp/037-browser-1-diagnostic-failure.log` lines672–674 identifies **returned-window**, before the undo action: English, focused, one visible unassigned group with `aria-expanded:false`, zero windows, zero prose, active BUTTON. SHA-256 `7ff0d3919768e18727ed9983807aadc3fd40d958b4f54e52be11fda6737a0ab7`. This batch neither reruns nor cancels that Full workflow; its other jobs are allowed to finish before the coordinator pushes a stable correction.

## Actual cause and first-paint oracle

An isolated actual native Reader journey at the original UI bytes (SHA-256 `018de6334c217b93f382096b31bab51bedd30f466b9624e3112ea07fc889ea30`) recorded bounded body-free calls to the original Navigator methods. It first opened the actual **unknown** group. The same captured Conversation later became verified **unassigned**, and its Reader group stayed open. Back's real retained origin snapshot still carried the prior unknown expansion.

Original `restoreNavigation` installs that snapshot and synchronously paints the currently known unassigned group **closed**. The existing asynchronous refresh/selected-path work then restores it to open. Between those states the original test can read the collapsed attribute and click the disclosure after it has reopened, closing it and leaving no window. This is the observed race window; no locale, undo revision, Source data or title-based membership inference is needed.

Observation log `/tmp/reader-undo-race-observe.log` SHA-256 `c4582bf71fb08c16e046485baf4c5ce5586424749c9e81d0937ae38220651001` preserves the actual transition. The original undo journey itself passed; that run alone did not reproduce the cloud timeout.

A stricter separate native probe reused the **actual snapshot captured by Back**, the actual complete cached provider/group/window scopes, and the original synchronous restore owner. It required that the previously open group remain open in the first real paint after verified migration. Original bytes failed `false !== true` with `savedUnknown:true`, `actualUnknown:false`, `actualUnassigned:true`, `restoredExpanded:false`: `/tmp/reader-undo-race-immediate-before.log`, SHA-256 `66bfb37f0f1918c257cfe55d360fe8a4df050983085882986b615e8f136e7b55`. This additional assertion ran after the original undo-save journey; its inherited last-stage label `undo-save` is not a new undo failure. Both the original sequence and stricter probe use real headless Chrome/FakeChatGPT offline synthetic fixtures, not a fabricated membership DTO.

After the repair, the same probe and snapshot produced `restoredExpanded:true`, **1/1 PASS**, 11935.493584 ms: `/tmp/reader-undo-race-immediate-after.log`, SHA-256 `9a6c9ae16700fa699794f1ef9c6b261a6c74406f3a7e32f9e044f2074627a2ff`. It also passed in Chinese locale, while the cloud failure was English; no locale preference override or sleep was added to hide the race.

## Minimal runtime repair

The original refresh migration condition is extracted once into `reconcileUnknownExpansion`: the provider root and provider's groups must be complete, the previously expanded unknown group must have disappeared, and verified unassigned must exist. The original delete-unknown/add-unassigned/onRouteChange behavior is retained.

Refresh reuses that method. Paint also applies it **before calculating the signature or creating DOM**, so Back's existing synchronous layout/paint restores the open state immediately, and completion of a groups read cannot expose the closed intermediate frame. It uses existing cached metadata; no new read/write, wait, delay, retry, reveal, route, source inference or durable state is introduced.

True unknown/unassigned coexistence stays distinct. Incomplete root/group evidence cannot migrate. A manually closed known group stays closed, and an explicit close after migration remains closed through later paints. Existing group order, cursor/cache identity, Source query owner, route snapshots and deep loaded-depth behavior remain unchanged; this patch does not claim a new deep-depth migration feature.

## Verification on frozen final bytes

One necessary stable batch of complete native files, all isolated headless with owned temporary profiles:

- Original `cpv1-02-3-navigator-chrome-e2e.test.mjs`: **2/2 PASS**, including Project move/rename/source deletion and bounded tree/Reader identity.
- Original `cpv1-02-4-reader-chrome-e2e.test.mjs`: **8/8 PASS**, including contextual reversible removal, long-window paging/edited retention, unmounted search/anchor restoration, lexical positioning, immutable Source/history restore, live-edit search, return-and-undo, and unfinished IME refusal.
- Combined **10/10 PASS, zero failures/skips/cancellations**, 77204.220917 ms; `/tmp/reader-undo-race-native-related-final.log` SHA-256 `5996b4856e300ab61fd537d833f15aeeb2870b78aa5d6e4db2b24892c4913256`. All original actions, selectors, expected values and time budgets remain byte-for-byte unchanged.

Four complete unit files (`d7-navigator-context`, `ans-05-navigator-state`, `iah11-fresh-entry`, `iah11-find-return`) passed **39/39**, zero skipped/cancelled, 58.561917 ms; `/tmp/reader-undo-race-navigation-related.log` SHA-256 `6f7b5ea49de264e8449a1fdee59f9b3cf072ddcfd51a1fd5dc6e94da68e9b06a`. The three added cases invoke the actual original UI restore/paint/toggle owners: immediate migration with cached-scope byte preservation and exactly one route update; genuine coexistence/manual closure; incomplete root/group refusal followed by one completed-cache migration. Existing late-selected-path, selected-Conversation migration, equal-tree identity, Source/Reader layout/focus/scroll and rejected/superseded Back/leave oracles remain.

Static package check: **13569 guardrails / 407 runtime resources PASS**, `/tmp/reader-undo-race-package.log` SHA-256 `9de7f256247d18199c36d7d7a4be1e2603bc5c61ae99f4e730c161c3f06bd2df`; `git diff --check` passed. No additional native/full-suite rerun, model, remote CI or deployment was initiated by this batch. Documentation commits do not retag these exact code/test bytes.

## Independent review

Root independently read the original complete runtime diff, three additive owner cases, exact final hashes, the actual held-snapshot before-failure/after-pass and the original whole10 native/39 related logs: **APPROVED**, limited to this demonstrated first-paint repair. The historical cloud failure's unique cause is not separately proved.

Independent reviewer human_group_review read the runtime and actual first-paint evidence and ran the complete d7 owner file: **14/14 PASS**, 54.984458 ms, `/tmp/reader-undo-race-navigator-independent.log`; **APPROVED**, limited to this repair. The unchanged Reader SHA/actions/oracles/budgets were independently checked; no repeat native run was performed by that reviewer.

Full `37880915206` has now completed **FAIL**, with Browser1 the only primary failure and the other eight browser jobs SUCCESS; no cancellation is treated as passing. Preserve both prior cloud failures and the diagnostic expected-failure reporter proof as failures, and run at most the coordinator's one stable corrected-head Full. Local passes/reviews do not certify the remote candidate/main or user's installed version.
