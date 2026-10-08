# CTX4-07 local usability states — 2026-10-09

Base: `3e4b6aaa300955d5977e2e0f4db073b391a8f5f6`. Test-only candidate. No runtime, worker, Settings, Topic, provider, CI or version changes. This adds evidence for existing CTX4-02 behavior within CTX4-07; it does not complete either external-client acceptance or the full 22-reference matrix.

## Actual additional states

The existing `context-cards-chrome-e2e.test.mjs` retains all six complete source/release cases and original 180000 ms case budgets. Three additions live inside its existing CTX4-02 journey:

1. **Compact saving with a real committed but undelivered acknowledgement.** The wrapper calls the original extension runtime transport first, then holds only the actual Info put response. A separate production snapshot proves exact stable Item ID, new text and revision +1 already committed. At 320 CSS pixels the existing editor node and Unicode draft remain unchanged, and the real UI says saving. Back cannot change the route before delivery; releasing that same response lets the existing leave complete. Reopening proves one revision and one put, not an artificial success result or a second save. The wrapper is restored and its own held response released in finally.
2. **Populated cards off.** With global desired access on, all four real capsule controls are turned off. Item bodies and counts remain identical. This differs from empty Home and global pause; no connection exists and no effective external grant is claimed.
3. **Responsive Home.** Actual 1440/768/320 CSS-pixel states retain four cards, visible enabled capsules, no horizontal overflow and no detailed Item bodies in Home. At compact width the Info capsule changes access without navigating; the separate actual card link opens the two saved Items. Original desired settings and viewport are restored for the remaining journey.

The existing transaction-failure, retry, IME, locale selection, recovery, Topic directory and protected Source/Input/Thought assertions remain. The earlier 38-case maintenance/deep-read file is unchanged and was not rerun or claimed as new proof.

## Verification

- Pre-final complete original browser file: **6/6 PASS, 70.357677167 s**, `/tmp/context-usability-native-final.log`; zero skipped/cancelled. No runtime defect or weakened assertion was required.
- Earlier 6/6 PASS, 73.663669 s remains at `/tmp/context-usability-native-first.log`. Independent review found its counter incremented only inside the first-response hold branch, so it did not prove the stated one-request claim. The intermediate counter incremented for every matching Info put response, while only the first was held. That complete run validates the returned-response counter; the earlier record is retained rather than reused as that proof.
- Final review moved matching put counting before `await send(...)`, so pending duplicate dispatches are also counted. Parse/diff checks passed. The 70.357677167 s run predates this final test-only move and is not claimed as final-byte native acceptance; Root will run the exact final file with the 0.28 combination.
- Headless only; source and isolated `mkdtemp` release/profile. Existing release builder guard remains active, and cleanup removes only each test's own output. Playwright reused from the existing workspace dependency.
- Parse and diff whitespace checks passed.
- Release images actually inspected: `work/ctx4-01/release/ctx4-02/07-populated-cards-off-768.png` and `07-compact-saving-real-ack-held.png`. The tablet Home retains its 2×2 layout/rail; compact editor and saving status are visible. Screenshots remain local synthetic artifacts, not committed assets.
- The old whole-file zero extension-network/model-request and protected canonical snapshot assertions passed for both variants.

Test SHA-256: `fa6d4d7fc0822cac4d9a28e835266d8125d217f41a0bc6bc92df4e35a2feb20a`.

## Remaining boundaries

No exact private reference-image comparison, real tablet hardware, physical OS IME, real AI connection, processing authorization, model quality, installed version or deployment was verified. Saving evidence intentionally separates committed storage from acknowledgement delivery; it does not claim the transaction itself remained pending. Existing browser-controlled composition evidence remains synthetic. No new UI state was fabricated to fill unavailable connection screens. Independent review identified both counter limitations, now corrected. Root approved the final one-line dispatch-counter change; its exact combined native execution remains pending in the 0.28 integration batch.
